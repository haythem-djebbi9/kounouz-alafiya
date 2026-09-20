import { ApiProperty } from '@nestjs/swagger';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AlertSeverity,
  CounterfeitAlertStatus,
  CounterfeitAlertType,
  Prisma,
} from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toCsv } from '../common/csv.js';
import { countryByCode } from '../common/geo.js';
import {
  PageQueryDto,
  PeriodQueryDto,
  bucketKeys,
  fillSeries,
  granularityFor,
  paginate,
  parsePeriod,
  percentDelta,
  share,
  toNumber,
} from './admin-common.js';

export class ListAlertsQueryDto extends PageQueryDto {
  @ApiProperty({ required: false, enum: CounterfeitAlertType })
  @IsOptional()
  @IsEnum(CounterfeitAlertType)
  type?: CounterfeitAlertType;

  @ApiProperty({ required: false, enum: CounterfeitAlertStatus })
  @IsOptional()
  @IsEnum(CounterfeitAlertStatus)
  status?: CounterfeitAlertStatus;

  @ApiProperty({ required: false, enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class UpdateAlertDto {
  @ApiProperty({ enum: CounterfeitAlertStatus })
  @IsIn(Object.values(CounterfeitAlertStatus))
  status!: CounterfeitAlertStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

const ALERT_INCLUDE = {
  qrCode: { select: { id: true, qrId: true, qrCode: true, serialNumber: true, status: true } },
  product: { select: { id: true, nom: true, images: true } },
  batch: { select: { id: true, batchCode: true, status: true, honeyType: true } },
  resolvedBy: { select: { id: true, name: true } },
} satisfies Prisma.CounterfeitAlertInclude;

const CLOSED: CounterfeitAlertStatus[] = [CounterfeitAlertStatus.RESOLVED, CounterfeitAlertStatus.DISMISSED];

/**
 * Cycle de revue humaine d'une alerte (§11 Monitoring, AC-04) :
 * OUVERTE -> EN REVUE -> CONFIRMÉE / ÉCARTÉE -> RÉSOLUE.
 *
 * Un incident n'est « confirmé » que par un humain, avec une conclusion
 * écrite ; seul un incident confirmé peut être déclaré résolu. Une alerte
 * écartée ou résolue peut être rouverte si de nouveaux éléments apparaissent.
 */
export const ALERT_TRANSITIONS: Record<CounterfeitAlertStatus, CounterfeitAlertStatus[]> = {
  [CounterfeitAlertStatus.OPEN]: [
    CounterfeitAlertStatus.INVESTIGATING,
    CounterfeitAlertStatus.CONFIRMED,
    CounterfeitAlertStatus.DISMISSED,
  ],
  [CounterfeitAlertStatus.INVESTIGATING]: [
    CounterfeitAlertStatus.OPEN,
    CounterfeitAlertStatus.CONFIRMED,
    CounterfeitAlertStatus.DISMISSED,
  ],
  [CounterfeitAlertStatus.CONFIRMED]: [CounterfeitAlertStatus.RESOLVED, CounterfeitAlertStatus.INVESTIGATING],
  [CounterfeitAlertStatus.RESOLVED]: [CounterfeitAlertStatus.OPEN],
  [CounterfeitAlertStatus.DISMISSED]: [CounterfeitAlertStatus.OPEN],
};

// Une conclusion humaine est exigée pour ces décisions de revue.
const NEEDS_CONCLUSION: CounterfeitAlertStatus[] = [
  CounterfeitAlertStatus.CONFIRMED,
  CounterfeitAlertStatus.DISMISSED,
  CounterfeitAlertStatus.RESOLVED,
];

@Injectable()
export class AdminAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private buildWhere(query: ListAlertsQueryDto): Prisma.CounterfeitAlertWhereInput {
    const period = parsePeriod(query.from, query.to, 30);
    const and: Prisma.CounterfeitAlertWhereInput[] = [{ createdAt: { gte: period.from, lt: period.to } }];
    if (query.type) and.push({ type: query.type });
    if (query.status) and.push({ status: query.status });
    if (query.severity) and.push({ severity: query.severity });
    if (query.countryCode) and.push({ countryCode: query.countryCode.toUpperCase() });
    if (query.productId) and.push({ productId: query.productId });
    if (query.search) {
      const contains = { contains: query.search.trim(), mode: 'insensitive' as const };
      and.push({
        OR: [
          { alertCode: contains },
          { scannedIdentifier: contains },
          { location: contains },
          { details: contains },
          { ipAddress: contains },
          { qrCode: { qrCode: contains } },
          { product: { nom: contains } },
          { batch: { batchCode: contains } },
        ],
      });
    }
    return { AND: and };
  }

  async list(query: ListAlertsQueryDto) {
    const where = this.buildWhere(query);
    const { skip, take, page, pageSize } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.counterfeitAlert.findMany({ where, include: ALERT_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.counterfeitAlert.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async stats(query: PeriodQueryDto) {
    const period = parsePeriod(query.from, query.to, 30);
    const granularity = granularityFor(period);
    const inPeriod = (from: Date, to: Date) => ({ createdAt: { gte: from, lt: to } });

    const [byType, prevByType, resolved, prevResolved, open, series, resolvedSeries, countries, products] =
      await Promise.all([
        this.prisma.counterfeitAlert.groupBy({ by: ['type'], where: inPeriod(period.from, period.to), _count: { _all: true } }),
        this.prisma.counterfeitAlert.groupBy({
          by: ['type'],
          where: inPeriod(period.prevFrom, period.prevTo),
          _count: { _all: true },
        }),
        this.prisma.counterfeitAlert.count({ where: { status: { in: CLOSED }, resolvedAt: { gte: period.from, lt: period.to } } }),
        this.prisma.counterfeitAlert.count({
          where: { status: { in: CLOSED }, resolvedAt: { gte: period.prevFrom, lt: period.prevTo } },
        }),
        this.prisma.counterfeitAlert.count({ where: { status: { notIn: CLOSED } } }),
        this.prisma.$queryRaw<{ bucket: Date; total: bigint; duplicates: bigint }[]>`
          SELECT date_trunc(${granularity}, created_at) AS bucket,
                 count(*) AS total,
                 count(*) FILTER (WHERE type = 'SUSPECTED_DUPLICATE') AS duplicates
          FROM counterfeit_alerts
          WHERE created_at >= ${period.from} AND created_at < ${period.to}
          GROUP BY bucket`,
        this.prisma.$queryRaw<{ bucket: Date; resolved: bigint }[]>`
          SELECT date_trunc(${granularity}, resolved_at) AS bucket, count(*) AS resolved
          FROM counterfeit_alerts
          WHERE resolved_at >= ${period.from} AND resolved_at < ${period.to}
          GROUP BY bucket`,
        this.prisma.$queryRaw<{ code: string | null; count: bigint; high: bigint; open: bigint }[]>`
          SELECT country_code AS code, count(*) AS count,
                 count(*) FILTER (WHERE severity = 'HIGH') AS high,
                 count(*) FILTER (WHERE status IN ('OPEN', 'INVESTIGATING')) AS open
          FROM counterfeit_alerts
          WHERE created_at >= ${period.from} AND created_at < ${period.to}
          GROUP BY country_code
          ORDER BY count DESC`,
        this.prisma.product.findMany({
          where: { alerts: { some: {} } },
          select: { id: true, nom: true },
          orderBy: { nom: 'asc' },
        }),
      ]);

    const typeCount = (rows: typeof byType, ...types: CounterfeitAlertType[]) =>
      rows.filter((r) => types.includes(r.type)).reduce((sum, r) => sum + r._count._all, 0);
    const total = typeCount(byType, ...Object.values(CounterfeitAlertType));
    const prevTotal = typeCount(prevByType, ...Object.values(CounterfeitAlertType));
    const kpi = (...types: CounterfeitAlertType[]) => ({
      total: typeCount(byType, ...types),
      delta: percentDelta(typeCount(byType, ...types), typeCount(prevByType, ...types)),
    });

    const resolvedByKey = new Map(resolvedSeries.map((r) => [r.bucket.toISOString().slice(0, 10), toNumber(r.resolved)]));
    const overTime = fillSeries(
      bucketKeys(period, granularity),
      series.map((r) => ({ bucket: r.bucket, values: { total: toNumber(r.total), duplicates: toNumber(r.duplicates), resolved: 0 } })),
      { total: 0, duplicates: 0, resolved: 0 },
    ).map((point) => ({ ...point, resolved: resolvedByKey.get(point.date) ?? 0 }));

    return {
      period: { from: period.from, to: period.to, granularity },
      kpis: {
        total: { total, delta: percentDelta(total, prevTotal) },
        duplicates: kpi(CounterfeitAlertType.SUSPECTED_DUPLICATE),
        unusualLocations: kpi(CounterfeitAlertType.UNUSUAL_LOCATION),
        invalidOrTampered: kpi(CounterfeitAlertType.INVALID_QR, CounterfeitAlertType.TAMPERED_LABEL),
        resolved: { total: resolved, delta: percentDelta(resolved, prevResolved) },
        open,
      },
      overTime,
      byType: Object.values(CounterfeitAlertType).map((type) => ({
        type,
        count: typeCount(byType, type),
        share: share(typeCount(byType, type), total),
      })),
      byCountry: countries.map((row) => {
        const info = countryByCode(row.code);
        const count = toNumber(row.count);
        const high = toNumber(row.high);
        // Niveau de risque d'un pays : sévérité élevée ou volume important.
        const risk = high >= 3 || count >= 10 ? 'HIGH' : high >= 1 || count >= 3 ? 'MEDIUM' : 'LOW';
        return { code: row.code, name: info?.name ?? null, lat: info?.lat ?? null, lng: info?.lng ?? null, count, open: toNumber(row.open), risk };
      }),
      filters: { products },
    };
  }

  async findOne(id: string) {
    const alert = await this.prisma.counterfeitAlert.findUnique({ where: { id }, include: ALERT_INCLUDE });
    if (!alert) throw new NotFoundException('Alerte introuvable.');

    const [relatedScans, relatedAlerts, trail] = await Promise.all([
      alert.qrCodeId || alert.scannedIdentifier
        ? this.prisma.qRScan.findMany({
            where: alert.qrCodeId ? { qrCodeId: alert.qrCodeId } : { scannedIdentifier: alert.scannedIdentifier },
            orderBy: { scannedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              scannedAt: true,
              location: true,
              countryCode: true,
              deviceInfo: true,
              deviceType: true,
              ipAddress: true,
              result: true,
            },
          })
        : [],
      alert.qrCodeId
        ? this.prisma.counterfeitAlert.findMany({
            where: { qrCodeId: alert.qrCodeId, id: { not: alert.id } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, alertCode: true, type: true, status: true, createdAt: true },
          })
        : [],
      this.prisma.auditLog.findMany({
        where: { entite: 'CounterfeitAlert', entiteId: alert.id },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);
    return { ...alert, relatedScans, relatedAlerts, trail };
  }

  async update(actorId: string, id: string, dto: UpdateAlertDto) {
    const alert = await this.prisma.counterfeitAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alerte introuvable.');
    if (dto.status !== alert.status && !ALERT_TRANSITIONS[alert.status].includes(dto.status)) {
      throw new BadRequestException(`Transition impossible : ${alert.status} -> ${dto.status}.`);
    }
    if (NEEDS_CONCLUSION.includes(dto.status) && !(dto.note ?? alert.resolutionNote ?? '').trim()) {
      throw new BadRequestException('Une conclusion écrite est obligatoire pour cette décision de revue.');
    }
    const closing = CLOSED.includes(dto.status);

    const updated = await this.prisma.counterfeitAlert.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.note !== undefined ? { resolutionNote: dto.note.trim() || null } : {}),
        resolvedById: closing ? actorId : null,
        resolvedAt: closing ? (CLOSED.includes(alert.status) ? alert.resolvedAt : new Date()) : null,
      },
      include: ALERT_INCLUDE,
    });

    const action =
      dto.status === CounterfeitAlertStatus.RESOLVED
        ? 'RESOLVE_ALERT'
        : dto.status === CounterfeitAlertStatus.CONFIRMED
          ? 'CONFIRM_ALERT'
          : dto.status === CounterfeitAlertStatus.DISMISSED
            ? 'DISMISS_ALERT'
            : dto.status === CounterfeitAlertStatus.INVESTIGATING
              ? 'INVESTIGATE_ALERT'
              : 'REOPEN_ALERT';
    await this.audit.log(actorId, action, 'CounterfeitAlert', id, {
      details: alert.alertCode,
      previousStatus: alert.status,
      newStatus: dto.status,
      reason: dto.note?.trim() || null,
      metadata: { field: 'status', oldValue: alert.status, newValue: dto.status, notes: dto.note },
    });
    return updated;
  }

  async exportCsv(query: ListAlertsQueryDto) {
    const alerts = await this.prisma.counterfeitAlert.findMany({
      where: this.buildWhere(query),
      include: ALERT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 20000,
    });
    return toCsv(
      alerts.map((a) => ({
        alertCode: a.alertCode,
        createdAt: a.createdAt.toISOString(),
        type: a.type,
        severity: a.severity,
        status: a.status,
        qrCode: a.qrCode?.qrCode ?? a.scannedIdentifier ?? '',
        product: a.product?.nom ?? '',
        batch: a.batch?.batchCode ?? '',
        location: a.location ?? '',
        country: a.countryCode ?? a.country ?? '',
        device: a.deviceInfo ?? '',
        ipAddress: a.ipAddress ?? '',
        scanCount: a.scanCount,
        details: a.details ?? '',
      })),
      [
        { key: 'alertCode', header: 'Alerte' },
        { key: 'createdAt', header: 'Date' },
        { key: 'type', header: 'Type' },
        { key: 'severity', header: 'Sévérité' },
        { key: 'status', header: 'Statut' },
        { key: 'qrCode', header: 'QR code' },
        { key: 'product', header: 'Produit' },
        { key: 'batch', header: 'Lot' },
        { key: 'location', header: 'Localisation' },
        { key: 'country', header: 'Pays' },
        { key: 'device', header: 'Appareil' },
        { key: 'ipAddress', header: 'Adresse IP' },
        { key: 'scanCount', header: 'Scans' },
        { key: 'details', header: 'Détails' },
      ],
    );
  }
}
