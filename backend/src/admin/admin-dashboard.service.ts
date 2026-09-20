import { Injectable } from '@nestjs/common';
import {
  BatchStatus,
  CounterfeitAlertStatus,
  LabWorkflowStatus,
  Prisma,
  ProductStatus,
  QrCodeStatus,
  Role,
  ScanResult,
} from '@prisma/client';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { percentDelta, share, startOfUtcMonth, toNumber } from './admin-common.js';
import { actionTypeOf } from './admin-audit.service.js';

export const HELD_BATCH_STATUSES: BatchStatus[] = [BatchStatus.SUSPENDED, BatchStatus.RECALLED];

export type ScanScope = 'ALL' | 'VALID' | 'SUSPICIOUS';

const STORAGE_CACHE_MS = 5 * 60000;

@Injectable()
export class AdminDashboardService {
  private storageCache: { bytes: number; files: number; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async overview(months = 9, scope: ScanScope = 'ALL') {
    const [kpis, scansOverTime, verificationStatus, scanLocations, topProducts, recentActivities, alerts, system] =
      await Promise.all([
        this.kpis(),
        this.scansOverTime(months),
        this.verificationStatus(),
        this.scanLocations(scope),
        this.topProducts(),
        this.recentActivities(),
        this.alerts(),
        this.systemOverview(),
      ]);
    return { kpis, scansOverTime, verificationStatus, scanLocations, topProducts, recentActivities, alerts, system };
  }

  /**
   * Totaux et croissance depuis le début du mois : on compare le stock actuel à
   * celui du dernier jour du mois précédent.
   */
  private async kpis() {
    const monthStart = startOfUtcMonth(new Date());
    const before = { createdAt: { lt: monthStart } };
    const verifiedWhere: Prisma.BatchWhereInput = { status: { notIn: HELD_BATCH_STATUSES } };

    const [producers, producersBefore, labs, labsBefore, products, productsBefore, batches, batchesBefore, qr, qrBefore, verified, verifiedBefore] =
      await Promise.all([
        this.prisma.producer.count(),
        this.prisma.producer.count({ where: before }),
        this.prisma.laboratory.count(),
        this.prisma.laboratory.count({ where: before }),
        this.prisma.product.count(),
        this.prisma.product.count({ where: before }),
        this.prisma.batch.count(),
        this.prisma.batch.count({ where: before }),
        this.prisma.qRCode.count(),
        this.prisma.qRCode.count({ where: before }),
        this.prisma.batch.count({ where: verifiedWhere }),
        this.prisma.batch.count({ where: { ...verifiedWhere, ...before } }),
      ]);

    const kpi = (total: number, previous: number) => ({ total, delta: percentDelta(total, previous) });
    return {
      producers: kpi(producers, producersBefore),
      laboratories: kpi(labs, labsBefore),
      products: kpi(products, productsBefore),
      batches: kpi(batches, batchesBefore),
      qrCodes: kpi(qr, qrBefore),
      verifiedBatches: { ...kpi(verified, verifiedBefore), share: share(verified, batches) },
    };
  }

  private async scansOverTime(months: number) {
    const start = startOfUtcMonth(new Date(), -(months - 1));
    const rows = await this.prisma.$queryRaw<{ bucket: Date; total: bigint; valid: bigint }[]>`
      SELECT date_trunc('month', scanned_at) AS bucket,
             count(*) AS total,
             count(*) FILTER (WHERE result = 'VALID') AS valid
      FROM qr_scans
      WHERE scanned_at >= ${start}
      GROUP BY bucket`;
    const byKey = new Map(rows.map((r) => [r.bucket.toISOString().slice(0, 7), r]));
    return Array.from({ length: months }, (_, i) => {
      const month = startOfUtcMonth(start, i).toISOString().slice(0, 7);
      const row = byKey.get(month);
      return { month, total: toNumber(row?.total), valid: toNumber(row?.valid) };
    });
  }

  /**
   * Statut affiché aux consommateurs pour chaque QR, selon la même règle que
   * la page de vérification publique : suspendu si le lot est retiré, le
   * produit suspendu ou le code désactivé ; vérifié si le produit est en vente.
   */
  async verificationStatus() {
    const suspendedWhere: Prisma.QRCodeWhereInput = {
      OR: [
        { status: QrCodeStatus.DEACTIVATED },
        { product: { statut: ProductStatus.SUSPENDU } },
        { batch: { status: { in: HELD_BATCH_STATUSES } } },
      ],
    };
    const [total, suspended, verified] = await Promise.all([
      this.prisma.qRCode.count(),
      this.prisma.qRCode.count({ where: suspendedWhere }),
      this.prisma.qRCode.count({
        where: {
          NOT: suspendedWhere,
          product: { statut: { in: [ProductStatus.PUBLIE, ProductStatus.RUPTURE] } },
        },
      }),
    ]);
    const pending = Math.max(0, total - suspended - verified);
    return {
      total,
      items: [
        { key: 'VERIFIED', count: verified, share: share(verified, total) },
        { key: 'PENDING', count: pending, share: share(pending, total) },
        { key: 'SUSPENDED', count: suspended, share: share(suspended, total) },
      ],
    };
  }

  private async scanLocations(scope: ScanScope) {
    const resultFilter =
      scope === 'VALID'
        ? Prisma.sql`AND result = 'VALID'`
        : scope === 'SUSPICIOUS'
          ? Prisma.sql`AND result <> 'VALID'`
          : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ governorate: string; count: bigint }[]>`
      SELECT governorate, count(*) AS count
      FROM qr_scans
      WHERE governorate IS NOT NULL ${resultFilter}
      GROUP BY governorate
      ORDER BY count DESC`;
    const total = rows.reduce((sum, r) => sum + toNumber(r.count), 0);
    return {
      total,
      regions: rows.map((r) => ({
        governorate: r.governorate,
        count: toNumber(r.count),
        share: share(toNumber(r.count), total),
      })),
    };
  }

  private async topProducts(limit = 5) {
    const rows = await this.prisma.$queryRaw<{ id: string; nom: string; images: string[]; count: bigint }[]>`
      SELECT p.id, p.nom, p.images, count(s.id) AS count
      FROM qr_scans s
      JOIN qr_codes q ON q.id = s.qr_code_id
      JOIN products p ON p.id = q.product_id
      GROUP BY p.id
      ORDER BY count DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({ id: r.id, nom: r.nom, image: r.images?.[0] ?? null, count: toNumber(r.count) }));
  }

  private async recentActivities() {
    const logs = await this.prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    return logs.map((log) => ({ ...log, actionType: actionTypeOf(log) }));
  }

  /**
   * Points d'attention, du plus récent au plus ancien : alertes anti-contrefaçon
   * ouvertes, lots retirés, analyses en attente, scans invalides des dernières 24 h.
   */
  private async alerts() {
    const since24h = new Date(Date.now() - 86400000);
    const [openAlerts, heldBatches, pendingAnalyses, invalidScans, lastInvalid] = await Promise.all([
      this.prisma.counterfeitAlert.findMany({
        where: { status: { in: [CounterfeitAlertStatus.OPEN, CounterfeitAlertStatus.INVESTIGATING] } },
        orderBy: { lastSeenAt: 'desc' },
        take: 3,
        select: { id: true, alertCode: true, type: true, severity: true, location: true, scanCount: true, lastSeenAt: true },
      }),
      this.prisma.batch.findMany({
        where: { status: { in: HELD_BATCH_STATUSES } },
        orderBy: { updatedAt: 'desc' },
        take: 2,
        select: { id: true, batchCode: true, status: true, updatedAt: true },
      }),
      this.prisma.laboratoryAnalysis.findMany({
        where: { workflowStatus: { in: [LabWorkflowStatus.ASSIGNED, LabWorkflowStatus.IN_PROGRESS] } },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { id: true, analysisCode: true, createdAt: true, sample: { select: { sampleCode: true } } },
      }),
      this.prisma.qRScan.count({ where: { result: ScanResult.INVALID, scannedAt: { gte: since24h } } }),
      this.prisma.qRScan.findFirst({
        where: { result: ScanResult.INVALID, scannedAt: { gte: since24h } },
        orderBy: { scannedAt: 'desc' },
        select: { scannedAt: true },
      }),
    ]);

    const items = [
      ...openAlerts.map((a) => ({
        kind: 'COUNTERFEIT' as const,
        id: a.id,
        code: a.alertCode,
        type: a.type,
        severity: a.severity,
        location: a.location,
        count: a.scanCount,
        at: a.lastSeenAt,
      })),
      ...heldBatches.map((b) => ({ kind: 'BATCH_HOLD' as const, id: b.id, code: b.batchCode, status: b.status, at: b.updatedAt })),
      ...pendingAnalyses.map((a) => ({
        kind: 'LAB_PENDING' as const,
        id: a.id,
        code: a.sample.sampleCode ?? a.analysisCode,
        at: a.createdAt,
      })),
      ...(invalidScans > 0 && lastInvalid
        ? [{ kind: 'INVALID_SCANS' as const, id: 'invalid-scans', count: invalidScans, at: lastInvalid.scannedAt }]
        : []),
    ];
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 5);
  }

  private async systemOverview() {
    const [users, activeUsers, producers, verificationTeam, samples, labResults, referenceSamples, storage] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.producer.count(),
        this.prisma.user.count({ where: { role: Role.VERIFICATION_TEAM } }),
        this.prisma.sample.count(),
        this.prisma.laboratoryAnalysis.count({
          where: { workflowStatus: { in: [LabWorkflowStatus.COMPLETED, LabWorkflowStatus.REVIEWED] } },
        }),
        this.prisma.referenceSample.count(),
        this.storageUsage(),
      ]);
    return { users, activeUsers, producers, verificationTeam, samples, labResults, referenceSamples, storage };
  }

  /** Volume des fichiers déposés (photos, bulletins, pièces), mis en cache quelques minutes. */
  private async storageUsage() {
    if (this.storageCache && Date.now() - this.storageCache.at < STORAGE_CACHE_MS) {
      return { bytes: this.storageCache.bytes, files: this.storageCache.files };
    }
    let bytes = 0;
    let files = 0;
    const walk = async (dir: string) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile()) {
          files += 1;
          bytes += (await stat(path)).size;
        }
      }
    };
    await walk(join(process.cwd(), 'uploads'));
    await walk(join(process.cwd(), 'private-uploads'));
    this.storageCache = { bytes, files, at: Date.now() };
    return { bytes, files };
  }
}
