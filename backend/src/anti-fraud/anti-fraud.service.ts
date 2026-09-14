import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ScanInput {
  location?: string;
  country?: string;
  deviceInfo?: string;
}

const HIGH_FREQUENCY_WINDOW_MIN = 10;
const HIGH_FREQUENCY_THRESHOLD = 5;
const MULTI_COUNTRY_WINDOW_MIN = 60;
const VOLUME_WINDOW_HOURS = 24;
const VOLUME_THRESHOLD = 20;
const FLAG_THRESHOLD = 0.5;

// Règles simples de détection d'anomalie sur les scans QR — cf. cahier des
// charges section 7.6 : trop de scans en peu de temps, plusieurs pays en peu
// de temps, fréquence anormale sur 24h. Un scan suspect est journalisé
// (flagged) et signalé en interne ; le consommateur n'est jamais bloqué.
@Injectable()
export class AntiFraudService {
  constructor(private readonly prisma: PrismaService) {}

  async assessAndRecordScan(qrCodeId: string, input: ScanInput) {
    const since = new Date(Date.now() - VOLUME_WINDOW_HOURS * 60 * 60 * 1000);
    const recentScans = await this.prisma.qRScan.findMany({
      where: { qrCodeId, scannedAt: { gte: since } },
      orderBy: { scannedAt: 'desc' },
    });

    const now = Date.now();
    const scansLastHighFreqWindow = recentScans.filter(
      (s) => now - s.scannedAt.getTime() <= HIGH_FREQUENCY_WINDOW_MIN * 60 * 1000,
    ).length;

    const countriesInWindow = new Set(
      recentScans
        .filter((s) => now - s.scannedAt.getTime() <= MULTI_COUNTRY_WINDOW_MIN * 60 * 1000)
        .map((s) => s.country)
        .filter((c): c is string => !!c),
    );
    if (input.country) {
      countriesInWindow.add(input.country);
    }

    let riskScore = 0;
    if (scansLastHighFreqWindow + 1 >= HIGH_FREQUENCY_THRESHOLD) {
      riskScore += 0.5;
    }
    if (countriesInWindow.size >= 2) {
      riskScore += 0.5;
    }
    if (recentScans.length + 1 >= VOLUME_THRESHOLD) {
      riskScore += 0.3;
    }
    riskScore = Math.min(riskScore, 1);
    const flagged = riskScore >= FLAG_THRESHOLD;

    // Un scan est anonyme (consommateur non connecté) : il n'a pas d'auteur
    // authentifié à journaliser dans AuditLog (réservé aux actions internes).
    // Le champ QRScan.flagged est lui-même le signal d'alerte, exposé à
    // l'équipe via le tableau de bord anti-fraude (findFlaggedScans/getStats).
    return this.prisma.qRScan.create({
      data: {
        qrCodeId,
        location: input.location,
        country: input.country,
        deviceInfo: input.deviceInfo,
        riskScore,
        flagged,
      },
    });
  }

  findFlaggedScans() {
    return this.prisma.qRScan.findMany({
      where: { flagged: true },
      include: { qrCode: { include: { product: true } } },
      orderBy: { scannedAt: 'desc' },
    });
  }

  async getStats() {
    const [totalScans, flaggedScans, byCountry] = await Promise.all([
      this.prisma.qRScan.count(),
      this.prisma.qRScan.count({ where: { flagged: true } }),
      this.prisma.qRScan.groupBy({
        by: ['country'],
        _count: { _all: true },
        where: { country: { not: null } },
        orderBy: { _count: { country: 'desc' } },
      }),
    ]);

    const flaggedByProduct = await this.prisma.qRScan.findMany({
      where: { flagged: true },
      include: { qrCode: { include: { product: { select: { id: true, nom: true } } } } },
    });
    const topFlagged = Object.values(
      flaggedByProduct.reduce<Record<string, { productId: string; nom: string; count: number }>>((acc, s) => {
        const p = s.qrCode.product;
        acc[p.id] = acc[p.id] ?? { productId: p.id, nom: p.nom, count: 0 };
        acc[p.id].count += 1;
        return acc;
      }, {}),
    ).sort((a, b) => b.count - a.count);

    return {
      totalScans,
      flaggedScans,
      flaggedRate: totalScans > 0 ? flaggedScans / totalScans : 0,
      scansByCountry: byCountry.map((c) => ({ country: c.country, count: c._count._all })),
      topFlaggedProducts: topFlagged,
    };
  }
}
