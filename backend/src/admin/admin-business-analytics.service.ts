import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toCsv } from '../common/csv.js';
import { normalizeGovernorate } from '../common/geo.js';
import { AdminScanAnalyticsService } from './admin-scan-analytics.service.js';
import {
  Period,
  PeriodQueryDto,
  bucketKeys,
  fillSeries,
  granularityFor,
  parsePeriod,
  percentDelta,
  share,
  startOfUtcMonth,
  toNumber,
} from './admin-common.js';

const SCANNER_KEY_SQL = 'COALESCE(visitor_id, ip_address, id)';

@Injectable()
export class AdminBusinessAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scans: AdminScanAnalyticsService,
  ) {}

  async overview(query: PeriodQueryDto) {
    const period = parsePeriod(query.from, query.to, 30);
    const [current, previous, series, categories, topHoneyTypes, regions, origins, funnel, recent, channels, producers, trends] =
      await Promise.all([
        this.totals(period.from, period.to),
        this.totals(period.prevFrom, period.prevTo),
        this.series(period),
        this.categories(period),
        this.topHoneyTypes(period),
        this.regions(period),
        this.scans.countries(period),
        this.funnel(period),
        this.recentVerifications(period),
        this.salesByChannel(period),
        this.topProducers(period),
        this.trends(),
      ]);

    const kpi = (key: 'verified' | 'scans' | 'consumers' | 'sales' | 'orders' | 'fraud') => ({
      total: current[key],
      delta: percentDelta(current[key], previous[key]),
    });
    const scanToPurchase = share(current.orders, current.consumers);
    const prevScanToPurchase = share(previous.orders, previous.consumers);

    return {
      period: { from: period.from, to: period.to, granularity: granularityFor(period) },
      kpis: {
        verifiedBatches: kpi('verified'),
        totalScans: kpi('scans'),
        uniqueConsumers: kpi('consumers'),
        totalSales: kpi('sales'),
        orders: kpi('orders'),
        fraudAttempts: kpi('fraud'),
        verificationRate: {
          total: current.verificationRate,
          // Écart en points de pourcentage : un taux ne se compare pas en %.
          deltaPoints:
            current.decided && previous.decided ? Math.round((current.verificationRate - previous.verificationRate) * 10) / 10 : null,
          decided: current.decided,
        },
      },
      series,
      categories,
      topHoneyTypes,
      regions,
      origins,
      funnel,
      recentVerifications: recent,
      salesByChannel: channels,
      topProducers: producers,
      trends,
      insights: {
        scanGrowth: percentDelta(current.scans, previous.scans),
        consumersGrowth: percentDelta(current.consumers, previous.consumers),
        scanToPurchaseRate: scanToPurchase,
        scanToPurchaseDeltaPoints: previous.consumers ? Math.round((scanToPurchase - prevScanToPurchase) * 10) / 10 : null,
        fraudChange: percentDelta(current.fraud, previous.fraud),
        averageOrderValue: current.orders ? Math.round((current.sales / current.orders) * 100) / 100 : 0,
      },
    };
  }

  private async totals(from: Date, to: Date) {
    const [decisions, scanRow, sales, fraud] = await Promise.all([
      this.prisma.verification.groupBy({
        by: ['status'],
        where: { isDraft: false, verifiedAt: { gte: from, lt: to }, status: { in: ['VERIFIED', 'NOT_VERIFIED'] } },
        _count: { _all: true },
      }),
      this.prisma.$queryRawUnsafe<{ scans: bigint; consumers: bigint }[]>(
        `SELECT count(*) AS scans, count(DISTINCT ${SCANNER_KEY_SQL}) AS consumers
         FROM qr_scans WHERE scanned_at >= $1 AND scanned_at < $2`,
        from,
        to,
      ),
      this.prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: from, lt: to } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.counterfeitAlert.count({ where: { createdAt: { gte: from, lt: to } } }),
    ]);
    const verified = decisions.find((d) => d.status === 'VERIFIED')?._count._all ?? 0;
    const decided = decisions.reduce((sum, d) => sum + d._count._all, 0);
    return {
      verified,
      decided,
      verificationRate: share(verified, decided),
      scans: toNumber(scanRow[0]?.scans),
      consumers: toNumber(scanRow[0]?.consumers),
      sales: Math.round(toNumber(sales._sum.total) * 100) / 100,
      orders: sales._count._all,
      fraud,
    };
  }

  private async series(period: Period) {
    const granularity = granularityFor(period);
    const [scans, sales, verifications] = await Promise.all([
      this.prisma.$queryRaw<{ bucket: Date; value: bigint }[]>`
        SELECT date_trunc(${granularity}, scanned_at) AS bucket, count(*) AS value
        FROM qr_scans WHERE scanned_at >= ${period.from} AND scanned_at < ${period.to}
        GROUP BY bucket`,
      this.prisma.$queryRaw<{ bucket: Date; value: unknown }[]>`
        SELECT date_trunc(${granularity}, created_at) AS bucket, COALESCE(sum(total), 0) AS value
        FROM orders WHERE status <> 'CANCELLED' AND created_at >= ${period.from} AND created_at < ${period.to}
        GROUP BY bucket`,
      this.prisma.$queryRaw<{ bucket: Date; value: bigint }[]>`
        SELECT date_trunc(${granularity}, verified_at) AS bucket, count(*) AS value
        FROM verifications
        WHERE is_draft = false AND status = 'VERIFIED' AND verified_at >= ${period.from} AND verified_at < ${period.to}
        GROUP BY bucket`,
    ]);
    const keys = bucketKeys(period, granularity);
    const scanSeries = fillSeries(keys, scans.map((r) => ({ bucket: r.bucket, values: { scans: toNumber(r.value) } })), { scans: 0 });
    const salesByKey = new Map(sales.map((r) => [r.bucket.toISOString().slice(0, 10), Math.round(toNumber(r.value) * 100) / 100]));
    const verifiedByKey = new Map(verifications.map((r) => [r.bucket.toISOString().slice(0, 10), toNumber(r.value)]));
    return scanSeries.map((point) => ({
      ...point,
      sales: salesByKey.get(point.date) ?? 0,
      verifications: verifiedByKey.get(point.date) ?? 0,
    }));
  }

  /** Lots vérifiés sur la période, par type de miel (cinq premiers + « autres »). */
  private async categories(period: Period) {
    const rows = await this.prisma.$queryRaw<{ honey_type: string; count: bigint }[]>`
      SELECT r.honey_type, count(*) AS count
      FROM verifications v
      JOIN verification_requests r ON r.id = v.request_id
      WHERE v.is_draft = false AND v.status = 'VERIFIED' AND v.verified_at >= ${period.from} AND v.verified_at < ${period.to}
      GROUP BY r.honey_type
      ORDER BY count DESC`;
    const total = rows.reduce((sum, r) => sum + toNumber(r.count), 0);
    const top = rows.slice(0, 5).map((r) => ({ key: r.honey_type, count: toNumber(r.count), share: share(toNumber(r.count), total) }));
    const other = rows.slice(5).reduce((sum, r) => sum + toNumber(r.count), 0);
    return { total, items: other > 0 ? [...top, { key: 'OTHER', count: other, share: share(other, total) }] : top };
  }

  private async topHoneyTypes(period: Period) {
    const rows = await this.prisma.$queryRaw<{ honey_type: string; batches: bigint; scans: bigint; revenue: unknown }[]>`
      WITH batch_types AS (
        SELECT honey_type, count(*) AS batches
        FROM batches
        WHERE status NOT IN ('SUSPENDED', 'RECALLED')
        GROUP BY honey_type
      ),
      scan_types AS (
        SELECT b.honey_type, count(s.id) AS scans
        FROM qr_scans s
        JOIN qr_codes q ON q.id = s.qr_code_id
        JOIN batches b ON b.id = q.batch_id
        WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
        GROUP BY b.honey_type
      ),
      revenue_types AS (
        SELECT b.honey_type, sum(oi.line_total) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        JOIN batches b ON b.id = p.batch_id
        WHERE o.status <> 'CANCELLED' AND o.created_at >= ${period.from} AND o.created_at < ${period.to}
        GROUP BY b.honey_type
      )
      SELECT bt.honey_type, bt.batches, COALESCE(st.scans, 0) AS scans, COALESCE(rt.revenue, 0) AS revenue
      FROM batch_types bt
      LEFT JOIN scan_types st ON st.honey_type = bt.honey_type
      LEFT JOIN revenue_types rt ON rt.honey_type = bt.honey_type
      ORDER BY scans DESC, bt.batches DESC
      LIMIT 10`;
    return rows.map((r) => ({
      honeyType: r.honey_type,
      verifiedBatches: toNumber(r.batches),
      scans: toNumber(r.scans),
      revenue: Math.round(toNumber(r.revenue) * 100) / 100,
    }));
  }

  private async regions(period: Period) {
    const rows = await this.prisma.$queryRaw<{ governorate: string | null; count: bigint }[]>`
      SELECT r.governorate, count(*) AS count
      FROM verifications v
      JOIN verification_requests r ON r.id = v.request_id
      WHERE v.is_draft = false AND v.status = 'VERIFIED' AND v.verified_at >= ${period.from} AND v.verified_at < ${period.to}
      GROUP BY r.governorate`;
    const merged = new Map<string, number>();
    for (const row of rows) {
      const name = normalizeGovernorate(row.governorate) ?? row.governorate;
      if (!name) continue;
      merged.set(name, (merged.get(name) ?? 0) + toNumber(row.count));
    }
    const total = [...merged.values()].reduce((a, b) => a + b, 0);
    return [...merged.entries()]
      .map(([governorate, count]) => ({ governorate, count, share: share(count, total) }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Du scan à l'achat. Chaque étape est un sous-ensemble de la précédente,
   * sauf les commandes, rapportées aux scans pour lire la conversion.
   */
  private async funnel(period: Period) {
    const [row] = await this.prisma.$queryRaw<{ total: bigint; valid: bigint; verified_products: bigint }[]>`
      SELECT count(*) AS total,
             count(*) FILTER (WHERE s.result = 'VALID') AS valid,
             count(*) FILTER (
               WHERE s.result = 'VALID'
                 AND p.statut IN ('PUBLIE', 'RUPTURE')
                 AND (b.id IS NULL OR b.status NOT IN ('SUSPENDED', 'RECALLED'))
             ) AS verified_products
      FROM qr_scans s
      LEFT JOIN qr_codes q ON q.id = s.qr_code_id
      LEFT JOIN products p ON p.id = q.product_id
      LEFT JOIN batches b ON b.id = q.batch_id
      WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}`;
    const orders = await this.prisma.order.count({
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: period.from, lt: period.to } },
    });
    const total = toNumber(row?.total);
    const stages = [
      { key: 'TOTAL_SCANS', count: total },
      { key: 'VALID_SCANS', count: toNumber(row?.valid) },
      { key: 'VERIFIED_PRODUCTS', count: toNumber(row?.verified_products) },
      { key: 'ORDERS', count: orders },
    ];
    return stages.map((stage) => ({ ...stage, share: share(stage.count, total) }));
  }

  private async recentVerifications(period: Period) {
    const rows = await this.prisma.verification.findMany({
      where: {
        isDraft: false,
        status: { in: ['VERIFIED', 'NOT_VERIFIED'] },
        verifiedAt: { gte: period.from, lt: period.to },
      },
      orderBy: { verifiedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        verificationCode: true,
        status: true,
        verifiedAt: true,
        batch: { select: { id: true, batchCode: true } },
        request: {
          select: {
            honeyType: true,
            batchNumber: true,
            governorate: true,
            producer: { select: { id: true, name: true, governorate: true } },
          },
        },
      },
    });
    return rows.map((v) => ({
      id: v.id,
      code: v.verificationCode,
      status: v.status,
      verifiedAt: v.verifiedAt,
      honeyType: v.request.honeyType,
      batchCode: v.batch?.batchCode ?? v.request.batchNumber,
      batchId: v.batch?.id ?? null,
      producer: v.request.producer,
      governorate: normalizeGovernorate(v.request.governorate ?? v.request.producer.governorate) ?? v.request.governorate,
    }));
  }

  private async salesByChannel(period: Period) {
    const rows = await this.prisma.order.groupBy({
      by: ['channel'],
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: period.from, lt: period.to } },
      _sum: { total: true },
      _count: { _all: true },
    });
    const total = rows.reduce((sum, r) => sum + toNumber(r._sum.total), 0);
    return rows
      .map((r) => ({
        channel: r.channel,
        orders: r._count._all,
        revenue: Math.round(toNumber(r._sum.total) * 100) / 100,
        share: share(toNumber(r._sum.total), total),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private async topProducers(period: Period) {
    const rows = await this.prisma.$queryRaw<
      { id: string; name: string; farm_name: string; revenue: unknown; units: bigint; batches: bigint }[]
    >`
      SELECT pr.id, pr.name, pr.farm_name,
             COALESCE(sales.revenue, 0) AS revenue,
             COALESCE(sales.units, 0) AS units,
             COALESCE(vb.batches, 0) AS batches
      FROM producers pr
      LEFT JOIN (
        SELECT oi.producer_id, sum(oi.line_total) AS revenue, sum(oi.quantity) AS units
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status <> 'CANCELLED' AND o.created_at >= ${period.from} AND o.created_at < ${period.to}
        GROUP BY oi.producer_id
      ) sales ON sales.producer_id = pr.id
      LEFT JOIN (
        SELECT r.producer_id, count(*) AS batches
        FROM verifications v
        JOIN verification_requests r ON r.id = v.request_id
        WHERE v.is_draft = false AND v.status = 'VERIFIED' AND v.verified_at >= ${period.from} AND v.verified_at < ${period.to}
        GROUP BY r.producer_id
      ) vb ON vb.producer_id = pr.id
      WHERE sales.revenue IS NOT NULL OR vb.batches IS NOT NULL
      ORDER BY revenue DESC, batches DESC
      LIMIT 10`;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      farmName: r.farm_name,
      revenue: Math.round(toNumber(r.revenue) * 100) / 100,
      units: toNumber(r.units),
      verifiedBatches: toNumber(r.batches),
    }));
  }

  /** Douze derniers mois, indépendamment de la période choisie. */
  private async trends() {
    const start = startOfUtcMonth(new Date(), -11);
    const [scans, sales, verifications] = await Promise.all([
      this.prisma.$queryRaw<{ bucket: Date; value: bigint }[]>`
        SELECT date_trunc('month', scanned_at) AS bucket, count(*) AS value
        FROM qr_scans WHERE scanned_at >= ${start} GROUP BY bucket`,
      this.prisma.$queryRaw<{ bucket: Date; value: unknown }[]>`
        SELECT date_trunc('month', created_at) AS bucket, COALESCE(sum(total), 0) AS value
        FROM orders WHERE status <> 'CANCELLED' AND created_at >= ${start} GROUP BY bucket`,
      this.prisma.$queryRaw<{ bucket: Date; value: bigint }[]>`
        SELECT date_trunc('month', verified_at) AS bucket, count(*) AS value
        FROM verifications WHERE is_draft = false AND status = 'VERIFIED' AND verified_at >= ${start} GROUP BY bucket`,
    ]);
    const month = (d: Date) => d.toISOString().slice(0, 7);
    const lookup = (rows: { bucket: Date; value: unknown }[]) => new Map(rows.map((r) => [month(r.bucket), toNumber(r.value)]));
    const [scanMap, salesMap, verifiedMap] = [lookup(scans), lookup(sales), lookup(verifications)];
    return Array.from({ length: 12 }, (_, i) => {
      const key = month(startOfUtcMonth(start, i));
      return {
        month: key,
        scans: scanMap.get(key) ?? 0,
        sales: Math.round((salesMap.get(key) ?? 0) * 100) / 100,
        verifications: verifiedMap.get(key) ?? 0,
      };
    });
  }

  async exportCsv(query: PeriodQueryDto) {
    const data = await this.overview(query);
    const rows = [
      ...Object.entries(data.kpis).map(([key, value]) => ({
        section: 'KPI',
        label: key,
        value: 'total' in value ? value.total : '',
        extra: 'delta' in value ? (value.delta ?? '') : 'deltaPoints' in value ? (value.deltaPoints ?? '') : '',
      })),
      ...data.series.map((p) => ({ section: 'Série', label: p.date, value: p.scans, extra: `${p.sales} TND / ${p.verifications} vérifications` })),
      ...data.topHoneyTypes.map((t) => ({ section: 'Types de miel', label: t.honeyType, value: t.scans, extra: `${t.verifiedBatches} lots / ${t.revenue} TND` })),
      ...data.regions.map((r) => ({ section: 'Régions', label: r.governorate, value: r.count, extra: `${r.share}%` })),
      ...data.origins.map((c) => ({ section: 'Pays', label: c.code ?? '—', value: c.count, extra: `${c.share}%` })),
      ...data.funnel.map((f) => ({ section: 'Entonnoir', label: f.key, value: f.count, extra: `${f.share}%` })),
      ...data.topProducers.map((p) => ({ section: 'Producteurs', label: p.name, value: p.revenue, extra: `${p.verifiedBatches} lots` })),
    ];
    return toCsv(rows, [
      { key: 'section', header: 'Section' },
      { key: 'label', header: 'Libellé' },
      { key: 'value', header: 'Valeur' },
      { key: 'extra', header: 'Complément' },
    ]);
  }
}
