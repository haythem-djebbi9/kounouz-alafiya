import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as QRCodeLib from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildCode } from '../common/sequential-code.js';
import { RecordScanDto } from './dto/record-scan.dto.js';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service.js';

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
              analysis: { include: { laboratory: true } },
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
  ) {}

  // Le QR code d'un produit ne change jamais : appelé uniquement lors de la
  // toute première publication (voir ProductsService.updateStatus).
  async generateForProduct(productId: string) {
    const existing = await this.prisma.qRCode.findUnique({ where: { productId } });
    if (existing) {
      return existing;
    }

    const year = new Date().getFullYear();
    const countThisYear = await this.prisma.qRCode.count({
      where: { qrCode: { startsWith: `KZ-QR-${year}-` } },
    });

    return this.prisma.qRCode.create({
      data: {
        productId,
        qrCode: buildCode(`KZ-QR-${year}`, countThisYear),
        qrId: randomUUID(),
      },
    });
  }

  findAllForAdmin() {
    return this.prisma.qRCode.findMany({
      include: { product: true, _count: { select: { scans: true } } },
      orderBy: { createdAt: 'desc' },
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
  async getPublicVerification(identifier: string, scan: RecordScanDto, deviceInfo?: string) {
    // Accepte soit l'identifiant technique (qrId, encodé dans l'image du QR),
    // soit le code lisible (qrCode, ex: KZ-QR-2026-000001) pour une saisie manuelle.
    const qrCode = await this.prisma.qRCode.findFirst({
      where: { OR: [{ qrId: identifier }, { qrCode: identifier }] },
      include: VERIFY_PAYLOAD_INCLUDE,
    });
    if (!qrCode || !qrCode.isActive) {
      throw new NotFoundException('QR code introuvable.');
    }

    await this.antiFraud.assessAndRecordScan(qrCode.id, {
      location: scan.location,
      country: scan.country,
      deviceInfo,
    });

    const { product } = qrCode;
    const batch = product.batch;
    const verification = batch?.verification;
    const analysis = verification?.analysis;
    const producer = verification?.request.producer;

    return {
      qrId: qrCode.qrId,
      qrCode: qrCode.qrCode,
      displayStatus: product.statut === 'PUBLIE' ? 'VERIFIED' : 'SUSPENDED',
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
      },
      verification: verification && {
        status: verification.status,
        verifiedAt: verification.verifiedAt,
        notes: verification.notes,
      },
      analysis: analysis && {
        analysisDate: analysis.analysisDate,
        status: analysis.status,
        results: analysis.results,
        laboratory: analysis.laboratory.name,
      },
    };
  }
}
