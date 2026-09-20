import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProducerStatus, Role, VerificationRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toCsv } from '../common/csv.js';
import { normalizeGovernorate } from '../common/geo.js';
import { paginate, percentDelta, share, startOfUtcMonth, toNumber } from './admin-common.js';
import { CreateProducerDto, ListProducersQueryDto, SetProducerStatusDto } from './dto/admin-producers.dto.js';

const DAY = 86400000;

const IN_PROGRESS_STATUSES: VerificationRequestStatus[] = [
  VerificationRequestStatus.NEW,
  VerificationRequestStatus.IN_REVIEW,
  VerificationRequestStatus.INFO_REQUESTED,
  VerificationRequestStatus.ACCEPTED,
  VerificationRequestStatus.COLLECTION_SCHEDULED,
  VerificationRequestStatus.SAMPLE_COLLECTED,
  VerificationRequestStatus.UNDER_ANALYSIS,
  VerificationRequestStatus.VERIFICATION_PENDING,
];
const ISSUE_STATUSES: VerificationRequestStatus[] = [
  VerificationRequestStatus.NOT_VERIFIED,
  VerificationRequestStatus.REJECTED,
];

@Injectable()
export class AdminProducersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async overview() {
    const now = Date.now();
    const monthStart = startOfUtcMonth(new Date());
    const last30 = new Date(now - 30 * DAY);
    const prev30 = new Date(now - 60 * DAY);

    const [byStatus, totalBefore, regionRows, newRecent, newPrevious, avg, avgPrevious] = await Promise.all([
      this.prisma.producer.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.producer.count({ where: { createdAt: { lt: monthStart } } }),
      this.prisma.$queryRaw<{ region: string | null; count: bigint }[]>`
        SELECT COALESCE(farm_governorate, governorate) AS region, count(*) AS count
        FROM producers
        GROUP BY region
        ORDER BY count DESC`,
      this.prisma.producer.findMany({ where: { createdAt: { gte: last30 } }, select: { createdAt: true } }),
      this.prisma.producer.count({ where: { createdAt: { gte: prev30, lt: last30 } } }),
      this.averageVerificationDays(new Date(now - 90 * DAY), new Date(now)),
      this.averageVerificationDays(new Date(now - 180 * DAY), new Date(now - 90 * DAY)),
    ]);

    const statusCount = (status: ProducerStatus) => byStatus.find((r) => r.status === status)?._count._all ?? 0;
    const total = byStatus.reduce((sum, r) => sum + r._count._all, 0);

    // Six intervalles de cinq jours sur les 30 derniers jours, du plus ancien au plus récent.
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now - (30 - i * 5) * DAY);
      const end = new Date(start.getTime() + 5 * DAY);
      return {
        from: start.toISOString().slice(0, 10),
        count: newRecent.filter((p) => p.createdAt >= start && p.createdAt < end).length,
      };
    });

    const regions = new Map<string, number>();
    let unknownRegion = 0;
    for (const row of regionRows) {
      const name = normalizeGovernorate(row.region) ?? row.region;
      if (!name) {
        unknownRegion += toNumber(row.count);
        continue;
      }
      regions.set(name, (regions.get(name) ?? 0) + toNumber(row.count));
    }

    return {
      kpis: {
        total: { total, delta: percentDelta(total, totalBefore) },
        active: { total: statusCount(ProducerStatus.ACTIVE), share: share(statusCount(ProducerStatus.ACTIVE), total) },
        pending: { total: statusCount(ProducerStatus.PENDING), share: share(statusCount(ProducerStatus.PENDING), total) },
        suspended: {
          total: statusCount(ProducerStatus.SUSPENDED),
          share: share(statusCount(ProducerStatus.SUSPENDED), total),
        },
        rejected: { total: statusCount(ProducerStatus.REJECTED), share: share(statusCount(ProducerStatus.REJECTED), total) },
        regions: regions.size,
      },
      byRegion: [...regions.entries()].map(([governorate, count]) => ({ governorate, count })).sort((a, b) => b.count - a.count),
      unknownRegion,
      byStatus: Object.values(ProducerStatus).map((status) => ({
        key: status,
        count: statusCount(status),
        share: share(statusCount(status), total),
      })),
      newProducers: { count: newRecent.length, delta: percentDelta(newRecent.length, newPrevious), buckets },
      avgVerificationDays: {
        value: avg.value,
        sample: avg.sample,
        delta: avg.value !== null && avgPrevious.value !== null ? percentDelta(avg.value, avgPrevious.value) : null,
      },
    };
  }

  /** Délai moyen entre la soumission d'une demande et la décision de vérification. */
  private async averageVerificationDays(from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<{ avg_days: number | null; sample: bigint }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (v.verified_at - COALESCE(r.submitted_at, r.created_at))) / 86400) AS avg_days,
             count(*) AS sample
      FROM verifications v
      JOIN verification_requests r ON r.id = v.request_id
      WHERE v.is_draft = false
        AND v.verified_at IS NOT NULL
        AND v.status IN ('VERIFIED', 'NOT_VERIFIED')
        AND v.verified_at >= ${from} AND v.verified_at < ${to}`;
    const value = rows[0]?.avg_days;
    return { value: value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10, sample: toNumber(rows[0]?.sample) };
  }

  async list(query: ListProducersQueryDto) {
    const where = this.buildWhere(query);
    const { skip, take, page, pageSize } = paginate(query.page, query.pageSize);

    const [producers, total, honeyTypes] = await Promise.all([
      this.prisma.producer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, isActive: true, lastLoginAt: true } },
          verificationRequests: {
            where: { status: { not: VerificationRequestStatus.DRAFT } },
            orderBy: { createdAt: 'desc' },
            select: {
              honeyType: true,
              status: true,
              updatedAt: true,
              verifications: {
                where: { isDraft: false },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { status: true, verifiedAt: true },
              },
            },
          },
        },
      }),
      this.prisma.producer.count({ where }),
      this.prisma.verificationRequest.findMany({
        where: { status: { not: VerificationRequestStatus.DRAFT } },
        distinct: ['honeyType'],
        select: { honeyType: true },
        orderBy: { honeyType: 'asc' },
      }),
    ]);

    const ids = producers.map((p) => p.id);
    const [batchCounts, productCounts] = ids.length
      ? await Promise.all([
          this.prisma.$queryRaw<{ producer_id: string; count: bigint }[]>`
            SELECT r.producer_id, count(b.id) AS count
            FROM batches b
            JOIN verifications v ON v.id = b.verification_id
            JOIN verification_requests r ON r.id = v.request_id
            WHERE r.producer_id IN (${Prisma.join(ids)})
            GROUP BY r.producer_id`,
          this.prisma.$queryRaw<{ producer_id: string; count: bigint }[]>`
            SELECT r.producer_id, count(p.id) AS count
            FROM products p
            JOIN batches b ON b.id = p.batch_id
            JOIN verifications v ON v.id = b.verification_id
            JOIN verification_requests r ON r.id = v.request_id
            WHERE r.producer_id IN (${Prisma.join(ids)})
            GROUP BY r.producer_id`,
        ])
      : [[], []];
    const countOf = (rows: { producer_id: string; count: bigint }[], id: string) =>
      toNumber(rows.find((r) => r.producer_id === id)?.count);

    return {
      items: producers.map((p) => {
        const latest = p.verificationRequests[0];
        const decision = latest?.verifications[0];
        const verification = !latest
          ? { status: 'NONE' as const, date: null }
          : latest.status === VerificationRequestStatus.VERIFIED
            ? { status: 'VERIFIED' as const, date: decision?.verifiedAt ?? latest.updatedAt }
            : ISSUE_STATUSES.includes(latest.status)
              ? { status: 'ISSUE' as const, date: decision?.verifiedAt ?? latest.updatedAt }
              : { status: 'IN_REVIEW' as const, date: latest.updatedAt };
        return {
          id: p.id,
          userId: p.userId,
          name: p.name,
          farmName: p.farmName,
          email: p.user.email,
          phone: p.phone,
          avatarUrl: p.avatarUrl,
          governorate: normalizeGovernorate(p.farmGovernorate ?? p.governorate) ?? p.farmGovernorate ?? p.governorate,
          location: p.location,
          status: p.status,
          isVerified: p.isVerified,
          accountActive: p.user.isActive,
          lastLoginAt: p.user.lastLoginAt,
          honeyTypes: [...new Set(p.verificationRequests.map((r) => r.honeyType))].slice(0, 4),
          verification,
          batches: countOf(batchCounts, p.id),
          products: countOf(productCounts, p.id),
          createdAt: p.createdAt,
        };
      }),
      total,
      page,
      pageSize,
      honeyTypes: honeyTypes.map((h) => h.honeyType),
    };
  }

  private buildWhere(query: ListProducersQueryDto): Prisma.ProducerWhereInput {
    const and: Prisma.ProducerWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.region) {
      and.push({
        OR: [
          { farmGovernorate: { equals: query.region, mode: 'insensitive' } },
          { AND: [{ farmGovernorate: null }, { governorate: { equals: query.region, mode: 'insensitive' } }] },
        ],
      });
    }
    if (query.honeyType) {
      and.push({ verificationRequests: { some: { honeyType: { equals: query.honeyType, mode: 'insensitive' } } } });
    }
    if (query.verification) {
      const notDraft = { not: VerificationRequestStatus.DRAFT };
      and.push(
        query.verification === 'NONE'
          ? { verificationRequests: { none: { status: notDraft } } }
          : {
              verificationRequests: {
                some: {
                  status: {
                    in:
                      query.verification === 'VERIFIED'
                        ? [VerificationRequestStatus.VERIFIED]
                        : query.verification === 'ISSUE'
                          ? ISSUE_STATUSES
                          : IN_PROGRESS_STATUSES,
                  },
                },
              },
            },
      );
    }
    if (query.search) {
      const contains = { contains: query.search.trim(), mode: 'insensitive' as const };
      and.push({
        OR: [
          { name: contains },
          { farmName: contains },
          { phone: contains },
          { location: contains },
          { user: { email: contains } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  async create(actorId: string, dto: CreateProducerDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
    const governorate = normalizeGovernorate(dto.governorate) ?? dto.governorate.trim();
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: Role.PRODUCER,
        phone: dto.phone?.trim() || null,
        producer: {
          create: {
            name: dto.name.trim(),
            farmName: dto.farmName.trim(),
            location: `${governorate}, Tunisie`,
            governorate,
            farmGovernorate: governorate,
            phone: dto.phone?.trim() || null,
            status: dto.status ?? ProducerStatus.PENDING,
          },
        },
      },
      include: { producer: true },
    });
    await this.audit.log(actorId, 'CREATE_PRODUCER', 'Producer', user.producer!.id, {
      details: `${user.producer!.name} — ${user.producer!.farmName}`,
    });
    return user.producer;
  }

  async setStatus(actorId: string, id: string, dto: SetProducerStatusDto) {
    const producer = await this.prisma.producer.findUnique({ where: { id } });
    if (!producer) throw new NotFoundException('Producteur introuvable.');
    const updated = await this.prisma.producer.update({ where: { id }, data: { status: dto.status } });
    await this.audit.log(actorId, `PRODUCER_${dto.status}`, 'Producer', id, {
      details: producer.name,
      metadata: { field: 'status', oldValue: producer.status, newValue: dto.status, notes: dto.note },
    });
    return updated;
  }

  async exportCsv(query: ListProducersQueryDto) {
    const total = await this.prisma.producer.count({ where: this.buildWhere(query) });
    const { items } = await this.list({ ...query, page: 1, pageSize: Math.max(total, 1) });
    return toCsv(
      items.map((p) => ({
        ...p,
        honeyTypes: p.honeyTypes.join(' | '),
        verification: p.verification.status,
        createdAt: p.createdAt.toISOString().slice(0, 10),
      })),
      [
        { key: 'name', header: 'Producteur' },
        { key: 'farmName', header: 'Exploitation' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Téléphone' },
        { key: 'governorate', header: 'Gouvernorat' },
        { key: 'honeyTypes', header: 'Types de miel' },
        { key: 'status', header: 'Statut' },
        { key: 'verification', header: 'Vérification' },
        { key: 'batches', header: 'Lots' },
        { key: 'products', header: 'Produits' },
        { key: 'createdAt', header: 'Inscrit le' },
      ],
    );
  }
}
