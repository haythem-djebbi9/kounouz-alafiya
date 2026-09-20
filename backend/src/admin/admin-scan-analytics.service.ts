import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { toCsv } from '../common/csv.js';
import { countryByCode } from '../common/geo.js';
import {
  Period,
  PeriodQueryDto,
  bucketKeys,
  fillSeries,
  granularityFor,
  parsePeriod,
  percentDelta,
  share,
  toNumber,
} from './admin-common.js';

// Clé d'un « scanneur » : identifiant anonyme du navigateur, à défaut l'adresse
// IP, à défaut le scan lui-même (compté comme un scanneur distinct).
const SCANNER_KEY = Prisma.sql`COALESCE(s.visitor_id, s.ip_address, s.id)`;

@Injectable()
export class AdminScanAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: PeriodQueryDto) {
    const period = parsePeriod(query.from, query.to, 30);
    const [current, previous, overTime, devices, countries, regions, topProducts, topBatches, recentScans, flow, journey] =
      await Promise.all([
        this.totals(period.from, period.to),
        this.totals(period.prevFrom, period.prevTo),
        this.overTime(period),
        this.devices(period),
        this.countries(period),
        this.regions(period),
        this.topProducts(period),
        this.topBatches(period),
        this.recentScans(period),
        this.flow(period),
        this.journey(period),
      ]);

    const kpi = (key: keyof typeof current) => ({ total: current[key], delta: percentDelta(current[key], previous[key]) });

    return {
      period: { from: period.from, to: period.to, granularity: granularityFor(period) },
      kpis: {
        totalScans: kpi('total'),
        uniqueScanners: kpi('scanners'),
        validScans: { ...kpi('valid'), share: share(current.valid, current.total) },
        suspiciousScans: { ...kpi('notValid'), share: share(current.notValid, current.total) },
        countries: kpi('countries'),
      },
      resultBreakdown: {
        total: current.total,
        valid: current.valid,
        suspicious: current.suspicious,
        invalid: current.invalid,
      },
      overTime,
      devices,
      countries,
      regions,
      topProducts,
      topBatches,
      recentScans,
      flow,
      journey,
      insights: {
        newScannerShare: share(journey.newScanners, current.scanners),
        avgScansPerScanner: current.scanners ? Math.round((current.total / current.scanners) * 10) / 10 : 0,
        scanGrowth: percentDelta(current.total, previous.total),
        trustedShare: share(current.valid, current.total),
      },
    };
  }

  private async totals(from: Date, to: Date) {
    const [row] = await this.prisma.$queryRaw<
      { total: bigint; scanners: bigint; valid: bigint; suspicious: bigint; invalid: bigint; countries: bigint }[]
    >`
      SELECT count(*) AS total,
             count(DISTINCT ${SCANNER_KEY}) AS scanners,
             count(*) FILTER (WHERE s.result = 'VALID') AS valid,
             count(*) FILTER (WHERE s.result = 'SUSPICIOUS') AS suspicious,
             count(*) FILTER (WHERE s.result = 'INVALID') AS invalid,
             count(DISTINCT s.country_code) AS countries
      FROM qr_scans s
      WHERE s.scanned_at >= ${from} AND s.scanned_at < ${to}`;
    const suspicious = toNumber(row?.suspicious);
    const invalid = toNumber(row?.invalid);
    return {
      total: toNumber(row?.total),
      scanners: toNumber(row?.scanners),
      valid: toNumber(row?.valid),
      suspicious,
      invalid,
      notValid: suspicious + invalid,
      countries: toNumber(row?.countries),
    };
  }

  private async overTime(period: Period) {
    const granularity = granularityFor(period);
    const rows = await this.prisma.$queryRaw<{ bucket: Date; total: bigint; valid: bigint }[]>`
      SELECT date_trunc(${granularity}, s.scanned_at) AS bucket,
             count(*) AS total,
             count(*) FILTER (WHERE s.result = 'VALID') AS valid
      FROM qr_scans s
      WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
      GROUP BY bucket`;
    return fillSeries(
      bucketKeys(period, granularity),
      rows.map((r) => {
        const total = toNumber(r.total);
        const valid = toNumber(r.valid);
        return { bucket: r.bucket, values: { total, valid, notValid: total - valid } };
      }),
      { total: 0, valid: 0, notValid: 0 },
    );
  }

  private async devices(period: Period) {
    const rows = await this.prisma.$queryRaw<{ device: string | null; count: bigint }[]>`
      SELECT s.device_type AS device, count(*) AS count
      FROM qr_scans s
      WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
      GROUP BY s.device_type`;
    const total = rows.reduce((sum, r) => sum + toNumber(r.count), 0);
    return ['MOBILE', 'DESKTOP', 'TABLET', 'OTHER'].map((key) => {
      const count = rows
        .filter((r) => (r.device ?? 'OTHER') === key)
        .reduce((sum, r) => sum + toNumber(r.count), 0);
      return { key, count, share: share(count, total) };
    });
  }

  async countries(period: Period) {
    const rows = await this.prisma.$queryRaw<{ code: string | null; count: bigint; not_valid: bigint }[]>`
      SELECT s.country_code AS code, count(*) AS count, count(*) FILTER (WHERE s.result <> 'VALID') AS not_valid
      FROM qr_scans s
      WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
      GROUP BY s.country_code
      ORDER BY count DESC`;
    const total = rows.reduce((sum, r) => sum + toNumber(r.count), 0);
    return rows.map((r) => {
      const info = countryByCode(r.code);
      return {
        code: r.code,
        name: info?.name ?? null,
        lat: info?.lat ?? null,
        lng: info?.lng ?? null,
        count: toNumber(r.count),
        notValid: toNumber(r.not_valid),
        share: share(toNumber(r.count), total),
      };
    });
  }

  async regions(period: Period) {
    const rows = await this.prisma.$queryRaw<{ governorate: string; count: bigint }[]>`
      SELECT s.governorate, count(*) AS count
      FROM qr_scans s
      WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to} AND s.governorate IS NOT NULL
      GROUP BY s.governorate
      ORDER BY count DESC`;
    const total = rows.reduce((sum, r) => sum + toNumber(r.count), 0);
    return rows.map((r) => ({ governorate: r.governorate, count: toNumber(r.count), share: share(toNumber(r.count), total) }));
  }

  private async topProducts(period: Period, limit = 10) {
    const rows = await this.prisma.$queryRaw<
      { id: string; nom: string; images: string[]; count: bigint; not_valid: bigint; scanners: bigint }[]
    >`
      SELECT p.id, p.nom, p.images, count(s.id) AS count,
             count(*) FILTER (WHERE s.result <> 'VALID') AS not_valid,
             count(DISTINCT ${SCANNER_KEY}) AS scanners
      FROM qr_scans s
      JOIN qr_codes q ON q.id = s.qr_code_id
      JOIN products p ON p.id = q.product_id
      WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
      GROUP BY p.id
      ORDER BY count DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      id: r.id,
      nom: r.nom,
      image: r.images?.[0] ?? null,
      count: toNumber(r.count),
      notValid: toNumber(r.not_valid),
      scanners: toNumber(r.scanners),
    }));
  }

  private async topBatches(period: Period, limit = 10) {
    const rows = await this.prisma.$queryRaw<
      { id: string; batch_code: string; honey_type: string; status: string; count: bigint; not_valid: bigint; codes: bigint }[]
    >`
      SELECT b.id, b.batch_code, b.honey_type, b.status::text AS status, count(s.id) AS count,
             count(*) FILTER (WHERE s.result <> 'VALID') AS not_valid,
             count(DISTINCT q.id) AS codes
      FROM qr_scans s
      JOIN qr_codes q ON q.id = s.qr_code_id
      JOIN batches b ON b.id = q.batch_id
      WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
      GROUP BY b.id
      ORDER BY count DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      id: r.id,
      batchCode: r.batch_code,
      honeyType: r.honey_type,
      status: r.status,
      count: toNumber(r.count),
      notValid: toNumber(r.not_valid),
      scannedCodes: toNumber(r.codes),
    }));
  }

  private async recentScans(period: Period) {
    const scans = await this.prisma.qRScan.findMany({
      where: { scannedAt: { gte: period.from, lt: period.to } },
      orderBy: { scannedAt: 'desc' },
      take: 10,
      include: { qrCode: { select: { qrCode: true, product: { select: { id: true, nom: true } } } } },
    });
    // Nouveau scanneur : aucun scan antérieur pour ce navigateur (ou cette IP).
    return Promise.all(
      scans.map(async (scan) => {
        const key = scan.visitorId ? { visitorId: scan.visitorId } : scan.ipAddress ? { ipAddress: scan.ipAddress } : null;
        const earlier = key
          ? await this.prisma.qRScan.count({ where: { ...key, scannedAt: { lt: scan.scannedAt } } })
          : 0;
        return {
          id: scan.id,
          scannedAt: scan.scannedAt,
          location: scan.location,
          countryCode: scan.countryCode,
          governorate: scan.governorate,
          deviceType: scan.deviceType,
          result: scan.result,
          product: scan.qrCode?.product ?? null,
          qrCode: scan.qrCode?.qrCode ?? scan.scannedIdentifier,
          scannerType: earlier > 0 ? ('RETURNING' as const) : ('NEW' as const),
        };
      }),
    );
  }

  /** Heure et jour de la semaine des scans (heure UTC du serveur). */
  private async flow(period: Period) {
    const [hours, weekdays] = await Promise.all([
      this.prisma.$queryRaw<{ hour: number; count: bigint }[]>`
        SELECT EXTRACT(HOUR FROM s.scanned_at)::int AS hour, count(*) AS count
        FROM qr_scans s
        WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
        GROUP BY hour`,
      this.prisma.$queryRaw<{ dow: number; count: bigint }[]>`
        SELECT EXTRACT(ISODOW FROM s.scanned_at)::int AS dow, count(*) AS count
        FROM qr_scans s
        WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
        GROUP BY dow`,
    ]);
    return {
      byHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: toNumber(hours.find((h) => Number(h.hour) === hour)?.count),
      })),
      byWeekday: Array.from({ length: 7 }, (_, i) => ({
        weekday: i + 1,
        count: toNumber(weekdays.find((d) => Number(d.dow) === i + 1)?.count),
      })),
    };
  }

  /** Parcours des scanneurs : fréquence de scan et part de nouveaux venus. */
  private async journey(period: Period) {
    const [distribution, newcomers] = await Promise.all([
      this.prisma.$queryRaw<{ bucket: string; scanners: bigint }[]>`
        WITH per_scanner AS (
          SELECT ${SCANNER_KEY} AS scanner, count(*) AS scans
          FROM qr_scans s
          WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
          GROUP BY scanner
        )
        SELECT CASE WHEN scans = 1 THEN '1' WHEN scans = 2 THEN '2' WHEN scans <= 5 THEN '3-5' ELSE '6+' END AS bucket,
               count(*) AS scanners
        FROM per_scanner
        GROUP BY bucket`,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(DISTINCT ${SCANNER_KEY}) AS count
        FROM qr_scans s
        WHERE s.scanned_at >= ${period.from} AND s.scanned_at < ${period.to}
          AND NOT EXISTS (
            SELECT 1 FROM qr_scans e
            WHERE e.scanned_at < ${period.from}
              AND COALESCE(e.visitor_id, e.ip_address, e.id) = ${SCANNER_KEY}
          )`,
    ]);
    const buckets = ['1', '2', '3-5', '6+'].map((key) => ({
      key,
      scanners: toNumber(distribution.find((d) => d.bucket === key)?.scanners),
    }));
    const scanners = buckets.reduce((sum, b) => sum + b.scanners, 0);
    const repeat = scanners - buckets[0].scanners;
    return {
      buckets,
      scanners,
      newScanners: toNumber(newcomers[0]?.count),
      repeatShare: share(repeat, scanners),
    };
  }

  async exportCsv(query: PeriodQueryDto) {
    const period = parsePeriod(query.from, query.to, 30);
    const scans = await this.prisma.qRScan.findMany({
      where: { scannedAt: { gte: period.from, lt: period.to } },
      orderBy: { scannedAt: 'desc' },
      take: 50000,
      include: { qrCode: { select: { qrCode: true, product: { select: { nom: true } }, batch: { select: { batchCode: true } } } } },
    });
    return toCsv(
      scans.map((s) => ({
        scannedAt: s.scannedAt.toISOString(),
        qrCode: s.qrCode?.qrCode ?? s.scannedIdentifier ?? '',
        product: s.qrCode?.product.nom ?? '',
        batch: s.qrCode?.batch?.batchCode ?? '',
        result: s.result,
        country: s.countryCode ?? s.country ?? '',
        governorate: s.governorate ?? '',
        location: s.location ?? '',
        deviceType: s.deviceType ?? '',
        device: s.deviceInfo ?? '',
        riskScore: s.riskScore,
      })),
      [
        { key: 'scannedAt', header: 'Date' },
        { key: 'qrCode', header: 'QR code' },
        { key: 'product', header: 'Produit' },
        { key: 'batch', header: 'Lot' },
        { key: 'result', header: 'Résultat' },
        { key: 'country', header: 'Pays' },
        { key: 'governorate', header: 'Gouvernorat' },
        { key: 'location', header: 'Localisation' },
        { key: 'deviceType', header: 'Appareil' },
        { key: 'device', header: 'Détail appareil' },
        { key: 'riskScore', header: 'Score de risque' },
      ],
    );
  }
}
