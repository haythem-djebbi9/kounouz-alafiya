import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, Prisma, QrCodeStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as QRCodeLib from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { padSequence } from '../common/sequential-code.js';
import { GenerateQrCodesDto } from './dto/generate-qr-codes.dto.js';
import { ListQrCodesQueryDto } from './dto/list-qr-codes-query.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

// Au-delà, la génération devient une opération de fond : on préfère refuser
// que bloquer la requête et laisser l'atelier sans retour.
const MAX_PER_GENERATION = 10_000;

const LIST_SELECT = {
  id: true,
  qrId: true,
  qrCode: true,
  serialNumber: true,
  status: true,
  isActive: true,
  createdAt: true,
  product: { select: { id: true, nom: true, statut: true } },
  batch: { select: { id: true, batchCode: true, honeyType: true, status: true } },
  _count: { select: { scans: true } },
} as const;

@Injectable()
export class PortalQrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  private publicAppUrl() {
    return process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
  }

  /** Produits rattachés à un lot emballé : la file de l'écran Q01. */
  generationQueue() {
    return this.prisma.product.findMany({
      where: { batchId: { not: null } },
      select: {
        id: true,
        nom: true,
        statut: true,
        netWeightG: true,
        batch: {
          select: {
            id: true,
            batchCode: true,
            honeyType: true,
            status: true,
            productionDate: true,
            expiryDate: true,
            packaging: { select: { packageType: true, size: true } },
          },
        },
        _count: { select: { qrCodes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Génération ----------------------------------------------------------

  /**
   * Tire une série de QR uniques pour un produit.
   *
   * Chaque code porte un identifiant technique opaque (`qrId`, encodé dans
   * l'image) et un numéro de série lisible imprimé sous le code. Les deux sont
   * définitifs : un QR posé sur un pot ne peut plus être réattribué.
   */
  async generate(userId: string, dto: GenerateQrCodesDto) {
    if (dto.quantity > MAX_PER_GENERATION) {
      throw new BadRequestException(
        `Maximum ${MAX_PER_GENERATION} codes par génération. Fractionnez le tirage.`,
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { batch: { include: { packaging: { include: { units: true } } } } },
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    if (!product.batch) {
      throw new BadRequestException('Le produit doit être rattaché à un lot vérifié.');
    }
    if (product.batch.status === BatchStatus.RECALLED) {
      throw new BadRequestException("Aucun code ne peut être généré pour un lot rappelé.");
    }

    // Le tirage ne peut pas dépasser le nombre de pots réellement conditionnés :
    // un QR sans support physique serait un code orphelin, exploitable en fraude.
    const unitsAvailable = (product.batch.packaging?.units ?? []).reduce(
      (sum, unit) => sum + unit.quantity,
      0,
    );
    const alreadyGenerated = await this.prisma.qRCode.count({ where: { batchId: product.batch.id } });
    if (unitsAvailable > 0 && alreadyGenerated + dto.quantity > unitsAvailable) {
      throw new BadRequestException(
        `Le lot compte ${unitsAvailable} unité(s) conditionnée(s) et ${alreadyGenerated} code(s) déjà généré(s) : ` +
          `${unitsAvailable - alreadyGenerated} code(s) restant(s) au maximum.`,
      );
    }

    const year = new Date().getFullYear();
    const batchSequence = product.batch.batchCode.slice(-3);
    const startIndex = alreadyGenerated;

    const generation = await this.prisma.qrGeneration.create({
      data: {
        batchId: product.batch.id,
        productId: product.id,
        quantity: dto.quantity,
        qrType: dto.qrType,
        qrFormat: dto.qrFormat,
        destinationUrl: dto.destinationUrl ?? `${this.publicAppUrl()}/verify`,
        language: dto.language,
        template: dto.template,
        options: (dto.options ?? {}) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    // Le numéro de série encode le lot puis le rang de l'unité : il reste
    // lisible à l'œil nu sur l'étiquette et relie le pot à son lot.
    const rows = Array.from({ length: dto.quantity }, (_, i) => {
      const serialNumber = `KZ-QR-${year}-${batchSequence}${padSequence(startIndex + i + 1, 3)}`;
      return {
        productId: product.id,
        batchId: product.batch!.id,
        generationId: generation.id,
        qrCode: serialNumber,
        serialNumber,
        qrId: randomUUID(),
        status: QrCodeStatus.ACTIVE,
      };
    });

    await this.prisma.qRCode.createMany({ data: rows, skipDuplicates: true });
    await this.audit.log(userId, 'GENERATE_QR_CODES', 'QrGeneration', generation.id, {
      details: `${rows.length} QR — produit ${product.id}`,
    });
    await this.domainEvents.publish(EventType.QR_ACTIVATED, 'QrGeneration', generation.id, {
      productId: product.id,
      batchId: product.batch!.id,
      quantity: rows.length,
    });

    return this.findGeneration(generation.id);
  }

  /**
   * Résumé d'une campagne, avec un échantillon des premiers codes.
   *
   * On ne renvoie jamais les milliers de codes d'un coup : la liste complète
   * passe par `list({ generationId })` paginé, ou par l'export CSV.
   */
  async findGeneration(id: string) {
    const generation = await this.prisma.qrGeneration.findUnique({
      where: { id },
      include: {
        batch: { select: { id: true, batchCode: true, honeyType: true, status: true } },
        createdBy: { select: { id: true, name: true } },
        qrCodes: { select: LIST_SELECT, orderBy: { serialNumber: 'asc' }, take: 5 },
        _count: { select: { qrCodes: true } },
      },
    });
    if (!generation) {
      throw new NotFoundException('Génération introuvable.');
    }
    return generation;
  }

  generationsForBatch(batchId: string) {
    return this.prisma.qrGeneration.findMany({
      where: { batchId },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { qrCodes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Gestion --------------------------------------------------------------

  private whereFor(query: ListQrCodesQueryDto): Prisma.QRCodeWhereInput {
    const where: Prisma.QRCodeWhereInput = {};
    if (query.productId) where.productId = query.productId;
    if (query.batchId) where.batchId = query.batchId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.scanned !== undefined) {
      where.scans = query.scanned ? { some: {} } : { none: {} };
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { qrCode: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { product: { nom: { contains: search, mode: 'insensitive' } } },
        { batch: { batchCode: { contains: search, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  async list(query: ListQrCodesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const where = this.whereFor(query);

    const [items, total, stats] = await Promise.all([
      this.prisma.qRCode.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.qRCode.count({ where }),
      this.stats(),
    ]);

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) || 1, stats };
  }

  /** Cartouches de l'écran Q02. */
  async stats() {
    const [total, active, deactivated, scanned, products] = await Promise.all([
      this.prisma.qRCode.count(),
      this.prisma.qRCode.count({ where: { status: QrCodeStatus.ACTIVE } }),
      this.prisma.qRCode.count({ where: { status: QrCodeStatus.DEACTIVATED } }),
      this.prisma.qRCode.count({ where: { scans: { some: {} } } }),
      this.prisma.product.count({ where: { qrCodes: { some: {} } } }),
    ]);

    const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

    return {
      total,
      active,
      deactivated,
      scanned,
      products,
      percentages: {
        active: share(active),
        deactivated: share(deactivated),
        scanned: share(scanned),
      },
    };
  }

  async findOne(qrId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { qrId },
      include: {
        product: { select: { id: true, nom: true, statut: true } },
        batch: { select: { id: true, batchCode: true, honeyType: true, status: true } },
        generation: { select: { id: true, template: true, language: true, createdAt: true } },
        _count: { select: { scans: true } },
        scans: { orderBy: { scannedAt: 'desc' }, take: 20 },
      },
    });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    return { ...qrCode, publicUrl: `${this.publicAppUrl()}/verify/${qrCode.qrId}` };
  }

  /**
   * Désactive un code. Réservé aux codes jamais scannés : un code déjà en
   * circulation a été posé sur un pot vendu, et le désactiver priverait le
   * consommateur de la preuve attachée à son produit. Pour retirer un lot du
   * marché, c'est la suspension ou le rappel du lot qu'il faut utiliser.
   */
  async setStatus(qrId: string, userId: string, status: QrCodeStatus) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: { qrId },
      include: { _count: { select: { scans: true } } },
    });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    if (status === QrCodeStatus.DEACTIVATED && qrCode._count.scans > 0) {
      throw new BadRequestException(
        "Ce code a déjà été scanné : il est en circulation. Suspendez ou rappelez le lot.",
      );
    }

    await this.prisma.qRCode.update({
      where: { qrId },
      data: { status, isActive: status === QrCodeStatus.ACTIVE },
    });
    await this.audit.log(userId, `QR_${status}`, 'QRCode', qrCode.id, {
      previousStatus: qrCode.status,
      newStatus: status,
    });
    await this.domainEvents.publish(
      status === QrCodeStatus.ACTIVE ? EventType.QR_ACTIVATED : EventType.QR_SUSPENDED,
      'QRCode',
      qrCode.id,
      { qrId, status },
    );
    return this.findOne(qrId);
  }

  /** Désactivation en lot, pour une campagne imprimée par erreur. */
  async deactivateMany(qrIds: string[], userId: string) {
    const scanned = await this.prisma.qRCode.count({
      where: { qrId: { in: qrIds }, scans: { some: {} } },
    });
    if (scanned > 0) {
      throw new BadRequestException(
        `${scanned} code(s) de la sélection ont déjà été scannés et ne peuvent pas être désactivés.`,
      );
    }

    const result = await this.prisma.qRCode.updateMany({
      where: { qrId: { in: qrIds } },
      data: { status: QrCodeStatus.DEACTIVATED, isActive: false },
    });
    await this.audit.log(userId, 'QR_BULK_DEACTIVATE', 'QRCode', qrIds[0] ?? '-');
    return { updated: result.count };
  }

  async scans(qrId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({ where: { qrId }, select: { id: true } });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    return this.prisma.qRScan.findMany({
      where: { qrCodeId: qrCode.id },
      orderBy: { scannedAt: 'desc' },
    });
  }

  /** Image PNG du code, encodant l'URL publique de vérification. */
  async image(qrId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({ where: { qrId } });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    return QRCodeLib.toBuffer(`${this.publicAppUrl()}/verify/${qrCode.qrId}`, {
      type: 'png',
      width: 400,
      margin: 2,
    });
  }

  /**
   * Export CSV d'une campagne : numéro de série et URL de vérification, le
   * format attendu par les imprimeurs d'étiquettes.
   */
  async exportGeneration(generationId: string) {
    const codes = await this.prisma.qRCode.findMany({
      where: { generationId },
      select: { serialNumber: true, qrCode: true, qrId: true },
      orderBy: { serialNumber: 'asc' },
    });
    if (codes.length === 0) {
      throw new NotFoundException('Aucun code pour cette génération.');
    }

    const base = this.publicAppUrl();
    const header = 'serial_number,qr_code,qr_id,verify_url';
    const rows = codes.map(
      (c) => `${c.serialNumber ?? ''},${c.qrCode},${c.qrId},${base}/verify/${c.qrId}`,
    );
    return [header, ...rows].join('\n');
  }
}
