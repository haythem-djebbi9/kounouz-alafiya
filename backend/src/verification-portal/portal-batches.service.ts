import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BatchStatus,
  NotificationType,
  PackagingStatus,
  Prisma,
  ProductStatus,
  Role,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { CreateVerifiedBatchDto } from './dto/create-verified-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { ListBatchesQueryDto } from './dto/list-batches-query.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

// Statuts qui alimentent les cartouches de l'écran « Verified Batches ».
// Les valeurs héritées (CREATED, READY) sont rattachées à leur équivalent
// courant pour que les lots antérieurs restent comptés au bon endroit.
export const BATCH_BUCKETS = {
  READY_FOR_PACKAGING: [BatchStatus.VERIFIED, BatchStatus.CREATED, BatchStatus.READY_FOR_PACKAGING],
  IN_PACKAGING: [BatchStatus.IN_PACKAGING, BatchStatus.PACKAGED, BatchStatus.READY],
  CONVERTED: [BatchStatus.CONVERTED_TO_PRODUCT, BatchStatus.PUBLISHED],
  ON_HOLD: [BatchStatus.SUSPENDED, BatchStatus.RECALLED],
} as const;

// Un lot ne recule jamais dans son cycle de vie : seules les transitions
// listées ici sont possibles. Suspension et rappel restent atteignables
// depuis n'importe quel état actif, via leurs propres actions.
const ALLOWED_TRANSITIONS: Partial<Record<BatchStatus, BatchStatus[]>> = {
  CREATED: [BatchStatus.READY_FOR_PACKAGING],
  VERIFIED: [BatchStatus.READY_FOR_PACKAGING],
  READY_FOR_PACKAGING: [BatchStatus.IN_PACKAGING],
  IN_PACKAGING: [BatchStatus.PACKAGED],
  PACKAGED: [BatchStatus.CONVERTED_TO_PRODUCT],
  READY: [BatchStatus.CONVERTED_TO_PRODUCT],
  CONVERTED_TO_PRODUCT: [BatchStatus.PUBLISHED],
};

const LIST_SELECT = {
  id: true,
  batchCode: true,
  honeyType: true,
  quantityKg: true,
  productionDate: true,
  expiryDate: true,
  bestBefore: true,
  origin: true,
  harvestSeason: true,
  status: true,
  holdReason: true,
  createdAt: true,
  verification: {
    select: {
      id: true,
      verificationCode: true,
      status: true,
      verifiedAt: true,
      request: {
        select: {
          id: true,
          requestCode: true,
          governorate: true,
          producer: { select: { id: true, name: true, farmName: true } },
        },
      },
    },
  },
  packaging: { select: { id: true, status: true, packageType: true, size: true } },
  products: { select: { id: true, nom: true, statut: true } },
  _count: { select: { qrCodes: true } },
} as const;

const DETAIL_INCLUDE = {
  verification: {
    include: {
      decidedBy: { select: { id: true, name: true } },
      request: { include: { producer: true } },
      sample: {
        include: {
          seal: true,
          collectedBy: { select: { id: true, name: true } },
          events: { orderBy: { occurredAt: 'asc' } },
        },
      },
      analysis: {
        include: {
          laboratory: true,
          assignedTo: { select: { id: true, name: true } },
          testResults: { orderBy: { position: 'asc' } },
          files: true,
        },
      },
    },
  },
  packaging: { include: { units: { orderBy: { createdAt: 'asc' } } } },
  products: { include: { categorie: true, documents: true } },
  qrGenerations: { orderBy: { createdAt: 'desc' } },
  _count: { select: { qrCodes: true } },
} as const;

@Injectable()
export class PortalBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  // --- Liste & compteurs -------------------------------------------------

  private whereFor(query: ListBatchesQueryDto): Prisma.BatchWhereInput {
    const where: Prisma.BatchWhereInput = {};

    if (query.bucket && query.bucket !== 'ALL') {
      where.status = { in: [...BATCH_BUCKETS[query.bucket]] };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.honeyType) {
      where.honeyType = { contains: query.honeyType, mode: 'insensitive' };
    }
    if (query.governorate) {
      where.verification = { request: { governorate: query.governorate } };
    }
    if (query.from || query.to) {
      where.productionDate = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { batchCode: { contains: search, mode: 'insensitive' } },
        { honeyType: { contains: search, mode: 'insensitive' } },
        { origin: { contains: search, mode: 'insensitive' } },
        {
          verification: {
            request: { producer: { name: { contains: search, mode: 'insensitive' } } },
          },
        },
      ];
    }
    return where;
  }

  async list(query: ListBatchesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 8));
    const where = this.whereFor(query);

    const [items, total, stats] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: query.sort === 'OLDEST' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.batch.count({ where }),
      this.stats(),
    ]);

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) || 1, stats };
  }

  async stats() {
    const grouped = await this.prisma.batch.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<
      BatchStatus,
      number
    >;
    const sum = (statuses: readonly BatchStatus[]) =>
      statuses.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0);

    return {
      counts: {
        ALL: grouped.reduce((acc, g) => acc + g._count._all, 0),
        READY_FOR_PACKAGING: sum(BATCH_BUCKETS.READY_FOR_PACKAGING),
        IN_PACKAGING: sum(BATCH_BUCKETS.IN_PACKAGING),
        CONVERTED: sum(BATCH_BUCKETS.CONVERTED),
        ON_HOLD: sum(BATCH_BUCKETS.ON_HOLD),
      },
      byStatus,
    };
  }

  /** Vérifications approuvées qui n'ont pas encore donné lieu à un lot. */
  eligibleVerifications() {
    return this.prisma.verification.findMany({
      where: { status: VerificationStatus.VERIFIED, isDraft: false, batch: null },
      select: {
        id: true,
        verificationCode: true,
        verifiedAt: true,
        request: {
          select: {
            id: true,
            requestCode: true,
            honeyType: true,
            quantity: true,
            governorate: true,
            productionSeason: true,
            producer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { verifiedAt: 'desc' },
    });
  }

  // --- Détail ------------------------------------------------------------

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    return batch;
  }

  async timeline(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      select: {
        createdAt: true,
        status: true,
        verification: {
          select: {
            verifiedAt: true,
            decidedBy: { select: { name: true } },
            analysis: { select: { completedAt: true, assignedTo: { select: { name: true } } } },
            sample: {
              select: {
                collectionDate: true,
                collectedBy: { select: { name: true } },
                referenceSample: { select: { storedAt: true } },
              },
            },
          },
        },
        packaging: { select: { createdAt: true, status: true } },
      },
    });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }

    const { verification: v } = batch;
    return [
      { step: 'SAMPLE_COLLECTED', at: v.sample.collectionDate, by: v.sample.collectedBy?.name ?? null },
      { step: 'ANALYSIS_COMPLETED', at: v.analysis.completedAt, by: v.analysis.assignedTo?.name ?? null },
      { step: 'REFERENCE_STORED', at: v.sample.referenceSample?.storedAt ?? null, by: null },
      { step: 'VERIFICATION_DECISION', at: v.verifiedAt, by: v.decidedBy?.name ?? null },
      { step: 'BATCH_VERIFIED', at: batch.createdAt, by: null },
      { step: 'PACKAGING', at: batch.packaging?.createdAt ?? null, by: null },
    ];
  }

  // --- Création & mise à jour ---------------------------------------------

  /**
   * Crée le lot commercial à partir d'une vérification approuvée.
   *
   * Les caractéristiques du miel (type, origine, saison) sont recopiées depuis
   * la demande : le lot doit rester lisible même si la demande évolue ensuite.
   */
  async create(userId: string, dto: CreateVerifiedBatchDto) {
    const verification = await this.prisma.verification.findUnique({
      where: { id: dto.verificationId },
      include: { request: { include: { producer: true } }, batch: true },
    });
    if (!verification) {
      throw new NotFoundException('Vérification introuvable.');
    }
    if (verification.status !== VerificationStatus.VERIFIED || verification.isDraft) {
      throw new BadRequestException(
        "Un lot ne peut être créé que depuis une vérification approuvée et prononcée.",
      );
    }
    if (verification.batch) {
      throw new BadRequestException('Un lot existe déjà pour cette vérification.');
    }

    const productionDate = new Date(dto.productionDate);
    const batch = await allocateYearCode(
      'KZ-BAT',
      (prefix) => this.prisma.batch.count({ where: { batchCode: { startsWith: prefix } } }),
      (batchCode) =>
        this.prisma.batch.create({
          data: {
            batchCode,
            verificationId: dto.verificationId,
            honeyType: verification.request.honeyType,
            quantityKg: dto.quantityKg,
            productionDate,
            origin: dto.origin ?? verification.request.governorate,
            harvestSeason: dto.harvestSeason ?? verification.request.productionSeason,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
            bestBefore: dto.bestBefore ? new Date(dto.bestBefore) : null,
            notes: dto.notes,
            status: BatchStatus.READY_FOR_PACKAGING,
          },
        }),
    );

    await this.audit.log(userId, 'CREATE_BATCH', 'Batch', batch.id, { newStatus: batch.status });
    await this.domainEvents.publish(EventType.BATCH_CREATED, 'Batch', batch.id, {
      batchCode: batch.batchCode,
      verificationId: batch.verificationId,
    });
    await this.notifications.notify(
      verification.request.producer.userId,
      NotificationType.BATCH_CREATED,
      'Lot créé',
      `Le lot « ${batch.batchCode} » a été créé pour votre miel « ${batch.honeyType} ».`,
      'Batch',
      batch.id,
    );
    for (const role of [Role.ADMIN, Role.VERIFICATION_TEAM]) {
      await this.notifications.notifyRole(
        role,
        NotificationType.BATCH_CREATED,
        'Nouveau lot vérifié',
        `Le lot « ${batch.batchCode} » est prêt pour l'emballage.`,
        'Batch',
        batch.id,
      );
    }

    return this.findOne(batch.id);
  }

  async update(id: string, userId: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    // Une fois le lot converti en produit, ses caractéristiques sont imprimées
    // sur des étiquettes : elles ne sont plus modifiables.
    if (LOCKED_STATUSES.includes(batch.status)) {
      throw new BadRequestException(
        'Ce lot est déjà converti en produit : ses caractéristiques ne sont plus modifiables.',
      );
    }

    await this.prisma.batch.update({
      where: { id },
      data: {
        quantityKg: dto.quantityKg,
        productionDate: dto.productionDate ? new Date(dto.productionDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        bestBefore: dto.bestBefore ? new Date(dto.bestBefore) : undefined,
        origin: dto.origin,
        harvestSeason: dto.harvestSeason,
        notes: dto.notes,
      },
    });
    await this.audit.log(userId, 'UPDATE_BATCH', 'Batch', id);
    return this.findOne(id);
  }

  /** Avance le lot d'une étape de son cycle de vie. */
  async advance(id: string, userId: string, next: BatchStatus) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    const allowed = ALLOWED_TRANSITIONS[batch.status] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Un lot au statut « ${batch.status} » ne peut pas passer à « ${next} ».`,
      );
    }

    await this.prisma.batch.update({ where: { id }, data: { status: next, holdReason: null } });
    await this.audit.log(userId, `BATCH_${next}`, 'Batch', id);
    return this.findOne(id);
  }

  /**
   * Suspend ou rappelle un lot. Les QR déjà imprimés continuent de répondre —
   * la page publique affiche simplement le statut réel (§17), ce qui est le
   * comportement attendu d'un rappel produit.
   */
  async hold(id: string, userId: string, status: BatchStatus, reason: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    if (status !== BatchStatus.SUSPENDED && status !== BatchStatus.RECALLED) {
      throw new BadRequestException('Statut de retrait invalide.');
    }
    if (batch.status === BatchStatus.RECALLED) {
      throw new BadRequestException('Ce lot est déjà rappelé.');
    }

    // Un lot retiré ne peut pas rester en vente : ses produits publiés sont
    // suspendus au catalogue dans la même transaction. La levée d'une
    // suspension ne les republie pas — la remise en vente reste une décision
    // explicite, prise produit par produit.
    const [, withdrawn] = await this.prisma.$transaction([
      this.prisma.batch.update({ where: { id }, data: { status, holdReason: reason } }),
      this.prisma.product.updateMany({
        where: { batchId: id, statut: ProductStatus.PUBLIE },
        data: { statut: ProductStatus.SUSPENDU },
      }),
    ]);
    await this.audit.log(userId, `BATCH_${status}`, 'Batch', id, {
      previousStatus: batch.status,
      newStatus: status,
      reason,
    });
    await this.domainEvents.publish(
      status === BatchStatus.RECALLED ? EventType.BATCH_RECALLED : EventType.BATCH_SUSPENDED,
      'Batch',
      id,
      { batchCode: batch.batchCode, productsWithdrawn: withdrawn.count },
    );
    if (withdrawn.count > 0) {
      await this.audit.log(userId, 'PRODUCTS_WITHDRAWN', 'Batch', id);
    }

    for (const role of [Role.ADMIN, Role.VERIFICATION_TEAM]) {
      await this.notifications.notifyRole(
        role,
        NotificationType.BATCH_CREATED,
        status === BatchStatus.RECALLED ? 'Lot rappelé' : 'Lot suspendu',
        `Le lot « ${batch.batchCode} » : ${reason}`,
        'Batch',
        id,
      );
    }
    return this.findOne(id);
  }

  /** Lève une suspension. Un rappel, lui, est définitif. */
  async release(id: string, userId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { packaging: true, _count: { select: { products: true } } },
    });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    if (batch.status !== BatchStatus.SUSPENDED) {
      throw new BadRequestException("Seul un lot suspendu peut être réactivé.");
    }

    // Retour à l'état le plus avancé réellement atteint. Les produits retirés
    // restent suspendus : leur remise en vente est une décision explicite,
    // produit par produit (le lot repasse alors PUBLISHED).
    const restored =
      batch._count.products > 0
        ? BatchStatus.CONVERTED_TO_PRODUCT
        : batch.packaging?.status === PackagingStatus.COMPLETED
          ? BatchStatus.PACKAGED
          : batch.packaging
            ? BatchStatus.IN_PACKAGING
            : BatchStatus.READY_FOR_PACKAGING;
    await this.prisma.batch.update({ where: { id }, data: { status: restored, holdReason: null } });
    await this.audit.log(userId, 'BATCH_RELEASED', 'Batch', id, {
      previousStatus: BatchStatus.SUSPENDED,
      newStatus: restored,
    });
    await this.domainEvents.publish(EventType.BATCH_RESTORED, 'Batch', id, {
      batchCode: batch.batchCode,
      status: restored,
    });
    return this.findOne(id);
  }
}

const LOCKED_STATUSES: BatchStatus[] = [
  BatchStatus.CONVERTED_TO_PRODUCT,
  BatchStatus.PUBLISHED,
  BatchStatus.RECALLED,
];
