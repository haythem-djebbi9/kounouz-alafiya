import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as QRCodeLib from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildCode } from '../common/sequential-code.js';
import { RecordScanDto, ReportLabelDto } from './dto/record-scan.dto.js';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

const VERIFY_PAYLOAD_INCLUDE = {
  product: {
    include: {
      categorie: true,
      batch: {
        include: {
          verification: {
            include: {
              request: { include: { producer: true } },
              sample: true,
              analysis: {
                include: {
                  laboratory: true,
                  testResults: { orderBy: { position: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiFraud: AntiFraudService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /**
   * Garantit qu'un produit publié possède au moins un QR — son QR de
   * référence, celui de la fiche produit et du marketplace.
   *
   * Les QR unitaires (un par pot) sont créés séparément, par campagne, depuis
   * le portail vérificateur ; cette méthode ne fait que couvrir le cas d'un
   * produit publié sans aucune campagne de génération.
   */
  async generateForProduct(productId: string) {
    const existing = await this.prisma.qRCode.findFirst({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { batchId: true },
    });

    const year = new Date().getFullYear();
    const countThisYear = await this.prisma.qRCode.count({
      where: { qrCode: { startsWith: `KZ-QR-${year}-` } },
    });
    const qrCode = buildCode(`KZ-QR-${year}`, countThisYear);

    return this.prisma.qRCode.create({
      data: {
        productId,
        batchId: product?.batchId ?? null,
        qrCode,
        qrId: randomUUID(),
        serialNumber: qrCode,
      },
    });
  }

  findAllForAdmin() {
    return this.prisma.qRCode.findMany({
      include: { product: true, _count: { select: { scans: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Ne touche jamais qrCode/qrId (identifiants figés à la génération) : ne fait
  // que suspendre ou réactiver la vérification publique pour ce produit, par
  // exemple en cas de suspicion de fraude signalée par le module anti-fraude.
  async setActive(qrId: string, isActive: boolean) {
    const qrCode = await this.prisma.qRCode.findUnique({ where: { qrId } });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    return this.prisma.qRCode.update({
      where: { qrId },
      data: { isActive },
      include: { product: true, _count: { select: { scans: true } } },
    });
  }

  async findScans(qrId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({ where: { qrId } });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    return this.prisma.qRScan.findMany({
      where: { qrCodeId: qrCode.id },
      orderBy: { scannedAt: 'desc' },
    });
  }

  /** Signalement d'une étiquette abîmée ou suspecte depuis la page publique. */
  async reportLabel(identifier: string, dto: ReportLabelDto, userAgent?: string, ipAddress?: string | null) {
    const qrCode = await this.prisma.qRCode.findFirst({
      where: { OR: [{ qrId: identifier }, { qrCode: identifier }] },
      select: { id: true, status: true, productId: true, batchId: true },
    });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    await this.antiFraud.reportTamperedLabel(qrCode, { ...dto, userAgent, ipAddress });
  }

  async generateImage(qrId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({ where: { qrId } });
    if (!qrCode) {
      throw new NotFoundException('QR code introuvable.');
    }
    const publicAppUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
    const verifyUrl = `${publicAppUrl}/verify/${qrCode.qrId}`;
    return QRCodeLib.toBuffer(verifyUrl, { type: 'png', width: 400, margin: 2 });
  }

  // Page de vérification publique : accessible sans connexion, ne doit jamais
  // révéler d'erreur technique — seul un 404 générique sort d'ici si le QR
  // n'existe pas ; le statut affiché (vérifié / suspendu) vient du produit.
  async getPublicVerification(identifier: string, scan: RecordScanDto, userAgent?: string, ipAddress?: string | null) {
    // Accepte soit l'identifiant technique (qrId, encodé dans l'image du QR),
    // soit le code lisible (qrCode, ex: KZ-QR-2026-000001) pour une saisie manuelle.
    const qrCode = await this.prisma.qRCode.findFirst({
      where: { OR: [{ qrId: identifier }, { qrCode: identifier }] },
      include: VERIFY_PAYLOAD_INCLUDE,
    });
    const scanInput = { ...scan, identifier: identifier.slice(0, 120), userAgent, ipAddress };
    if (!qrCode || !qrCode.isActive) {
      // Tentative sur un code inconnu : journalisée pour la lutte
      // anti-contrefaçon, mais la réponse reste un 404 générique.
      const invalid = await this.antiFraud.assessAndRecordScan(null, scanInput);
      await this.domainEvents.publish(EventType.QR_SCANNED, 'QRScan', invalid.id, { result: invalid.result });
      throw new NotFoundException('QR code introuvable.');
    }

    const scanned = await this.antiFraud.assessAndRecordScan(qrCode, scanInput);
    // AC-A01 : chaque scan alimente l'analytique et la surveillance.
    await this.domainEvents.publish(EventType.QR_SCANNED, 'QRScan', scanned.id, {
      qrId: qrCode.qrId,
      result: scanned.result,
      riskScore: scanned.riskScore,
    });

    const { product } = qrCode;
    const batch = product.batch;
    const verification = batch?.verification;
    const analysis = verification?.analysis;
    const producer = verification?.request.producer;

    // Le statut affiché suit l'état courant de la chaîne (§17) : un lot
    // suspendu ou rappelé doit le dire, même si le QR a été imprimé quand le
    // produit était en vente. Le rappel prime sur toute autre information.
    const displayStatus = publicDisplayStatus(batch?.status ?? null, product.statut);

    return {
      qrId: qrCode.qrId,
      qrCode: qrCode.qrCode,
      serialNumber: qrCode.serialNumber,
      displayStatus,
      product: {
        nom: product.nom,
        description: product.description,
        images: product.images,
        gamme: product.gamme,
        categorie: product.categorie.nom,
      },
      producer: producer && {
        name: producer.name,
        farmName: producer.farmName,
        location: producer.location,
      },
      batch: batch && {
        batchCode: batch.batchCode,
        honeyType: batch.honeyType,
        productionDate: batch.productionDate,
        bestBefore: batch.bestBefore,
        origin: batch.origin,
      },
      verification: verification && {
        status: verification.status,
        verifiedAt: verification.verifiedAt,
        // `notes` reste interne (§10 / CON-03) : les commentaires de décision
        // du vérificateur ne sont jamais publiés côté consommateur.
      },
      analysis: analysis && {
        analysisDate: analysis.analysisDate,
        status: analysis.status,
        laboratory: analysis.laboratory.name,
        // Représentation publique approuvée du bulletin : uniquement les
        // paramètres normés saisis par Kounouz, jamais le JSON libre
        // `analysis.results` ni `conclusion` / `internalNotes`.
        parameters: analysis.testResults.map((test) => ({
          parameterKey: test.parameterKey,
          value: test.value,
          unit: test.unit,
          status: test.status,
          reference:
            test.referenceText ??
            (test.referenceMin !== null && test.referenceMax !== null
              ? `${test.referenceMin} – ${test.referenceMax}`
              : test.referenceMax !== null
                ? `≤ ${test.referenceMax}`
                : test.referenceMin !== null
                  ? `≥ ${test.referenceMin}`
                  : null),
        })),
      },
    };
  }
}

/**
 * Statut affiché au consommateur (§10 / QR-04 / QR-05).
 *
 * Le rappel prime sur tout. Un lot ou un produit suspendu affiche la
 * suspension. En revanche, un produit simplement épuisé (RUPTURE, posé
 * automatiquement quand le stock tombe à zéro) ou retiré de la vente
 * (ARCHIVE) reste un miel vérifié pour les pots déjà vendus : les afficher
 * « suspendus » alarmerait à tort leurs acheteurs. Un produit jamais publié
 * (BROUILLON) n'est pas en circulation : il n'est pas présenté comme vérifié.
 */
export function publicDisplayStatus(
  batchStatus: string | null,
  productStatus: string,
): 'VERIFIED' | 'SUSPENDED' | 'RECALLED' {
  if (batchStatus === 'RECALLED') return 'RECALLED';
  if (batchStatus === 'SUSPENDED') return 'SUSPENDED';
  if (!batchStatus) return 'SUSPENDED';
  return ['PUBLIE', 'RUPTURE', 'ARCHIVE'].includes(productStatus) ? 'VERIFIED' : 'SUSPENDED';
}
