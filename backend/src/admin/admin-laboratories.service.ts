import { Injectable, NotFoundException } from '@nestjs/common';
import { LabAnalysisStatus, LaboratoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toCsv } from '../common/csv.js';
import { countryByCode, normalizeCountry } from '../common/geo.js';
import { paginate, percentDelta, share, toNumber } from './admin-common.js';
import { actionTypeOf } from './admin-audit.service.js';
import {
  CreateAccreditationDto,
  CreateLaboratoryAdminDto,
  ListLaboratoriesQueryDto,
  SetLaboratoryStatusDto,
  UpdateLaboratoryAdminDto,
} from './dto/admin-laboratories.dto.js';

const EDITABLE_FIELDS = [
  'name',
  'country',
  'city',
  'address',
  'email',
  'phone',
  'website',
  'tagline',
  'contactName',
  'accreditationNo',
  'notes',
] as const;

@Injectable()
export class AdminLaboratoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListLaboratoriesQueryDto) {
    const where = this.buildWhere(query);
    const { skip, take, page, pageSize } = paginate(query.page, query.pageSize);
    const yearAgo = new Date(Date.now() - 365 * 86400000);

    const [labs, total, byStatus, totalBeforeYear, countries, accreditations] = await Promise.all([
      this.prisma.laboratory.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        include: {
          accreditations: { orderBy: { name: 'asc' } },
          _count: { select: { analyses: true } },
        },
      }),
      this.prisma.laboratory.count({ where }),
      this.prisma.laboratory.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.laboratory.count({ where: { createdAt: { lt: yearAgo } } }),
      this.prisma.laboratory.findMany({ distinct: ['country'], select: { country: true } }),
      this.prisma.laboratoryAccreditation.findMany({ distinct: ['name'], select: { name: true }, orderBy: { name: 'asc' } }),
    ]);

    const count = (status: LaboratoryStatus) => byStatus.find((r) => r.status === status)?._count._all ?? 0;
    const all = byStatus.reduce((sum, r) => sum + r._count._all, 0);
    const countryNames = [...new Set(countries.map((c) => countryByCode(normalizeCountry(c.country))?.name ?? c.country))];

    return {
      items: labs.map((lab) => ({
        ...presentLab(lab),
        accreditations: lab.accreditations.map(presentAccreditation),
        samplesAnalyzed: lab._count.analyses,
      })),
      total,
      page,
      pageSize,
      kpis: {
        total: { total: all, delta: percentDelta(all, totalBeforeYear) },
        active: { total: count(LaboratoryStatus.ACTIVE), share: share(count(LaboratoryStatus.ACTIVE), all) },
        pending: { total: count(LaboratoryStatus.PENDING), share: share(count(LaboratoryStatus.PENDING), all) },
        suspended: { total: count(LaboratoryStatus.SUSPENDED), share: share(count(LaboratoryStatus.SUSPENDED), all) },
        countries: countryNames,
      },
      filters: {
        countries: countries.map((c) => c.country).sort(),
        accreditations: accreditations.map((a) => a.name),
      },
    };
  }

  private buildWhere(query: ListLaboratoriesQueryDto): Prisma.LaboratoryWhereInput {
    const and: Prisma.LaboratoryWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.country) and.push({ country: query.country });
    if (query.accreditation) and.push({ accreditations: { some: { name: query.accreditation } } });
    if (query.search) {
      const contains = { contains: query.search.trim(), mode: 'insensitive' as const };
      and.push({ OR: [{ name: contains }, { email: contains }, { city: contains }, { country: contains }] });
    }
    return and.length ? { AND: and } : {};
  }

  async detail(id: string, months = 12) {
    const lab = await this.prisma.laboratory.findUnique({
      where: { id },
      include: { accreditations: { orderBy: [{ validUntil: 'desc' }, { name: 'asc' }] } },
    });
    if (!lab) throw new NotFoundException('Laboratoire introuvable.');

    const now = Date.now();
    const span = months * 30.4375 * 86400000;
    const from = months > 0 ? new Date(now - span) : new Date(0);
    const prevFrom = months > 0 ? new Date(now - 2 * span) : null;

    const [current, previous, analysisIds] = await Promise.all([
      this.stats(id, from, new Date(now)),
      prevFrom ? this.stats(id, prevFrom, from) : null,
      this.prisma.laboratoryAnalysis.findMany({
        where: { labId: id },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true },
      }),
    ]);

    const recentActivity = await this.prisma.auditLog.findMany({
      where: { entiteId: { in: [id, ...analysisIds.map((a) => a.id)] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    const delta = (key: 'samples' | 'batches' | 'verified' | 'avgTurnaroundDays') =>
      previous && current[key] !== null && previous[key] !== null ? percentDelta(current[key]!, previous[key]!) : null;

    return {
      ...presentLab(lab),
      accreditations: lab.accreditations.map(presentAccreditation),
      stats: {
        months,
        samples: { value: current.samples, delta: delta('samples') },
        batches: { value: current.batches, delta: delta('batches') },
        verified: { value: current.verified, rate: current.verifiedRate, delta: delta('verified') },
        avgTurnaroundDays: { value: current.avgTurnaroundDays, delta: delta('avgTurnaroundDays') },
      },
      recentActivity: recentActivity.map((log) => ({ ...log, actionType: actionTypeOf(log) })),
    };
  }

  private async stats(labId: string, from: Date, to: Date) {
    const inWindow = { labId, createdAt: { gte: from, lt: to } };
    const [samples, compliant, nonCompliant, batches, turnaround] = await Promise.all([
      this.prisma.laboratoryAnalysis.count({ where: inWindow }),
      this.prisma.laboratoryAnalysis.count({ where: { ...inWindow, status: LabAnalysisStatus.COMPLIANT } }),
      this.prisma.laboratoryAnalysis.count({ where: { ...inWindow, status: LabAnalysisStatus.NON_COMPLIANT } }),
      this.prisma.batch.count({ where: { createdAt: { gte: from, lt: to }, verification: { analysis: { labId } } } }),
      this.prisma.$queryRaw<{ avg_days: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - COALESCE(assignment_date, created_at))) / 86400) AS avg_days
        FROM laboratory_analyses
        WHERE lab_id = ${labId} AND completed_at IS NOT NULL
          AND completed_at >= ${from} AND completed_at < ${to}`,
    ]);
    const avg = turnaround[0]?.avg_days;
    return {
      samples,
      batches,
      verified: compliant,
      verifiedRate: share(compliant, compliant + nonCompliant),
      avgTurnaroundDays: avg === null || avg === undefined ? null : Math.round(toNumber(avg) * 10) / 10,
    };
  }

  async create(actorId: string, dto: CreateLaboratoryAdminDto) {
    const lab = await this.prisma.laboratory.create({
      data: {
        ...clean(dto),
        name: dto.name.trim(),
        country: dto.country.trim(),
        accreditationNo: dto.accreditationNo?.trim() || '—',
        contactInfo: [dto.email, dto.phone].filter(Boolean).join(' / ') || '—',
        status: dto.status ?? LaboratoryStatus.PENDING,
      },
    });
    await this.audit.log(actorId, 'CREATE_LABORATORY', 'Laboratory', lab.id, { details: lab.name });
    return presentLab(lab);
  }

  async update(actorId: string, id: string, dto: UpdateLaboratoryAdminDto) {
    const lab = await this.prisma.laboratory.findUnique({ where: { id } });
    if (!lab) throw new NotFoundException('Laboratoire introuvable.');

    const data: Record<string, string | null> = {};
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = dto[field];
      if (value === undefined) continue;
      const next = value.trim() || (field === 'name' || field === 'country' ? lab[field] : null);
      if (next === lab[field]) continue;
      data[field] = next;
      oldValue[field] = lab[field];
      newValue[field] = next;
    }
    if (Object.keys(data).length === 0) return presentLab(lab);

    const email = 'email' in data ? data.email : lab.email;
    const phone = 'phone' in data ? data.phone : lab.phone;
    const updated = await this.prisma.laboratory.update({
      where: { id },
      data: { ...data, contactInfo: [email, phone].filter(Boolean).join(' / ') || lab.contactInfo },
    });
    await this.audit.log(actorId, 'UPDATE_LABORATORY', 'Laboratory', id, {
      details: updated.name,
      metadata: { field: Object.keys(newValue).join(', '), oldValue, newValue },
    });
    return presentLab(updated);
  }

  async setStatus(actorId: string, id: string, dto: SetLaboratoryStatusDto) {
    const lab = await this.prisma.laboratory.findUnique({ where: { id } });
    if (!lab) throw new NotFoundException('Laboratoire introuvable.');
    const updated = await this.prisma.laboratory.update({ where: { id }, data: { status: dto.status } });
    const action =
      dto.status === LaboratoryStatus.ACTIVE
        ? lab.status === LaboratoryStatus.PENDING
          ? 'APPROVE_LABORATORY'
          : 'REACTIVATE_LABORATORY'
        : dto.status === LaboratoryStatus.SUSPENDED
          ? 'SUSPEND_LABORATORY'
          : 'UPDATE_LABORATORY';
    await this.audit.log(actorId, action, 'Laboratory', id, {
      details: lab.name,
      metadata: { field: 'status', oldValue: lab.status, newValue: dto.status, notes: dto.note },
    });
    return presentLab(updated);
  }

  async addAccreditation(actorId: string, labId: string, dto: CreateAccreditationDto) {
    const lab = await this.prisma.laboratory.findUnique({ where: { id: labId } });
    if (!lab) throw new NotFoundException('Laboratoire introuvable.');
    const accreditation = await this.prisma.laboratoryAccreditation.create({
      data: {
        labId,
        name: dto.name.trim(),
        issuingBody: dto.issuingBody?.trim() || null,
        certificateNumber: dto.certificateNumber?.trim() || null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
    await this.audit.log(actorId, 'ADD_LAB_ACCREDITATION', 'Laboratory', labId, {
      details: `${lab.name} — ${accreditation.name}`,
      metadata: { field: 'accreditation', newValue: accreditation.name },
    });
    return presentAccreditation(accreditation);
  }

  async removeAccreditation(actorId: string, labId: string, accreditationId: string) {
    const accreditation = await this.prisma.laboratoryAccreditation.findFirst({
      where: { id: accreditationId, labId },
      include: { laboratory: { select: { name: true } } },
    });
    if (!accreditation) throw new NotFoundException('Accréditation introuvable.');
    await this.prisma.laboratoryAccreditation.delete({ where: { id: accreditationId } });
    await this.audit.log(actorId, 'DELETE_LAB_ACCREDITATION', 'Laboratory', labId, {
      details: `${accreditation.laboratory.name} — ${accreditation.name}`,
      metadata: { field: 'accreditation', oldValue: accreditation.name },
    });
  }

  async exportCsv(query: ListLaboratoriesQueryDto) {
    const total = await this.prisma.laboratory.count({ where: this.buildWhere(query) });
    const { items } = await this.list({ ...query, page: 1, pageSize: Math.max(total, 1) });
    return toCsv(
      items.map((lab) => ({
        ...lab,
        accreditations: lab.accreditations.map((a) => a.name).join(' | '),
        createdAt: lab.createdAt.toISOString().slice(0, 10),
      })),
      [
        { key: 'name', header: 'Laboratoire' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Téléphone' },
        { key: 'city', header: 'Ville' },
        { key: 'country', header: 'Pays' },
        { key: 'accreditations', header: 'Accréditations' },
        { key: 'status', header: 'Statut' },
        { key: 'samplesAnalyzed', header: 'Échantillons analysés' },
        { key: 'createdAt', header: 'Partenaire depuis' },
      ],
    );
  }
}

function clean(dto: Partial<CreateLaboratoryAdminDto>) {
  const out: Record<string, string | null> = {};
  for (const field of EDITABLE_FIELDS) {
    if (dto[field] !== undefined) out[field] = dto[field]!.trim() || null;
  }
  return out;
}

function presentLab<T extends { country: string }>(lab: T) {
  return { ...lab, countryCode: normalizeCountry(lab.country) };
}

function presentAccreditation<T extends { validUntil: Date | null }>(accreditation: T) {
  const expired = accreditation.validUntil ? accreditation.validUntil.getTime() < Date.now() : false;
  return { ...accreditation, state: expired ? ('EXPIRED' as const) : ('VALID' as const) };
}
