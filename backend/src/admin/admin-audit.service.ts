import { ApiProperty } from '@nestjs/swagger';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { toCsv } from '../common/csv.js';
import { PageQueryDto, PeriodQueryDto, paginate, parsePeriod, percentDelta } from './admin-common.js';

// Famille d'action affichée (pastille « Login », « Update », « Verify »...).
// Déduite du code d'action : les règles sont évaluées dans l'ordre, la
// première qui correspond l'emporte, UPDATE couvrant tout le reste.
export const ACTION_TYPES = [
  'SYSTEM',
  'LOGIN',
  'LOGOUT',
  'FAILED_LOGIN',
  'GENERATE',
  'REJECT',
  'VERIFY',
  'DELETE',
  'CREATE',
  'UPDATE',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

const RULES: { type: Exclude<ActionType, 'UPDATE'>; where: Prisma.AuditLogWhereInput }[] = [
  { type: 'SYSTEM', where: { entite: 'System' } },
  { type: 'FAILED_LOGIN', where: { action: { in: ['LOGIN_FAILED', 'LOGIN_BLOCKED'] } } },
  { type: 'LOGIN', where: { action: 'LOGIN' } },
  { type: 'LOGOUT', where: { action: 'LOGOUT' } },
  { type: 'GENERATE', where: { action: { contains: 'GENERATE' } } },
  {
    type: 'REJECT',
    where: {
      OR: ['REJECT', 'NOT_VERIFIED', 'SUSPEND', 'RECALL', 'DEACTIVATE', 'CANCEL', 'WITHDRAWN', 'ISSUE', 'DISMISS'].map(
        (word) => ({ action: { contains: word } }),
      ),
    },
  },
  {
    type: 'VERIFY',
    where: {
      OR: ['VERIFIED', 'APPROVE', 'PRODUCER_ACTIVE', 'ACTIVATE', 'RESOLVE', 'RELEASED'].map((word) => ({
        action: { contains: word },
      })),
    },
  },
  { type: 'DELETE', where: { OR: [{ action: { startsWith: 'DELETE' } }, { action: { contains: 'REMOVE' } }] } },
  {
    type: 'CREATE',
    where: {
      OR: ['CREATE', 'REGISTER', 'RECORD', 'ADD_', 'UPLOAD', 'APPLY', 'STORE', 'SUBMIT', 'OPEN_'].map((prefix) => ({
        action: { startsWith: prefix },
      })),
    },
  },
];

function whereForActionType(type: ActionType): Prisma.AuditLogWhereInput {
  const index = RULES.findIndex((r) => r.type === type);
  const earlier = (index === -1 ? RULES : RULES.slice(0, index)).map((r) => ({ NOT: r.where }));
  return index === -1 ? { AND: earlier } : { AND: [...earlier, RULES[index].where] };
}

function matches(log: { action: string; entite: string }, where: Prisma.AuditLogWhereInput): boolean {
  const { action } = log;
  const test = (w: Prisma.AuditLogWhereInput): boolean => {
    if (w.OR) return (w.OR as Prisma.AuditLogWhereInput[]).some(test);
    if (typeof w.entite === 'string') return log.entite === w.entite;
    const cond = w.action;
    if (typeof cond === 'string') return action === cond;
    if (cond && typeof cond === 'object') {
      const c = cond as Prisma.StringFilter;
      if (c.in) return (c.in as string[]).includes(action);
      if (c.contains) return action.includes(c.contains);
      if (c.startsWith) return action.startsWith(c.startsWith);
    }
    return false;
  };
  return test(where);
}

export function actionTypeOf(log: { action: string; entite: string }): ActionType {
  return RULES.find((rule) => matches(log, rule.where))?.type ?? 'UPDATE';
}

export class ListAuditQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  module?: string;

  @ApiProperty({ required: false, enum: ACTION_TYPES })
  @IsOptional()
  @IsIn(ACTION_TYPES)
  actionType?: ActionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ required: false, enum: AuditStatus })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityId?: string;
}

const LOG_INCLUDE = {
  user: { select: { id: true, name: true, email: true, role: true, producer: { select: { avatarUrl: true } } } },
} satisfies Prisma.AuditLogInclude;

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: ListAuditQueryDto): Prisma.AuditLogWhereInput {
    const and: Prisma.AuditLogWhereInput[] = [];
    // Une trace d'entité se lit sur toute son histoire, sans borne de dates.
    if (!query.entityId || query.from || query.to) {
      const period = parsePeriod(query.from, query.to, 30);
      and.push({ createdAt: { gte: period.from, lt: period.to } });
    }
    if (query.module) and.push({ module: query.module });
    if (query.actionType) and.push(whereForActionType(query.actionType));
    if (query.userId) and.push({ userId: query.userId });
    if (query.status) and.push({ status: query.status });
    if (query.entityId) and.push({ entiteId: query.entityId });
    if (query.search) {
      const contains = { contains: query.search.trim(), mode: 'insensitive' as const };
      and.push({
        OR: [
          { action: contains },
          { details: contains },
          { entite: contains },
          { entiteId: contains },
          { ipAddress: contains },
          { user: { name: contains } },
          { user: { email: contains } },
        ],
      });
    }
    return { AND: and };
  }

  async list(query: ListAuditQueryDto) {
    const where = this.buildWhere(query);
    const { skip, take, page, pageSize } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, include: LOG_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items: items.map(present), total, page, pageSize };
  }

  async stats(query: PeriodQueryDto) {
    const period = parsePeriod(query.from, query.to, 30);
    const current = { createdAt: { gte: period.from, lt: period.to } };
    const previous = { createdAt: { gte: period.prevFrom, lt: period.prevTo } };
    const security = { status: { in: [AuditStatus.FAILED, AuditStatus.WARNING] } };

    const [logs, prevLogs, users, prevUsers, alerts, prevAlerts, modules, actors] = await Promise.all([
      this.prisma.auditLog.count({ where: current }),
      this.prisma.auditLog.count({ where: previous }),
      this.prisma.auditLog.findMany({ where: { ...current, userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.auditLog.findMany({ where: { ...previous, userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.auditLog.count({ where: { ...current, ...security } }),
      this.prisma.auditLog.count({ where: { ...previous, ...security } }),
      this.prisma.auditLog.findMany({ where: { module: { not: null } }, distinct: ['module'], select: { module: true } }),
      this.prisma.user.findMany({
        where: { auditLogs: { some: {} } },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
    ]);

    const uptimeSeconds = Math.round(process.uptime());
    return {
      period: { from: period.from, to: period.to },
      totalLogs: { total: logs, delta: percentDelta(logs, prevLogs) },
      activeUsers: { total: users.length, delta: percentDelta(users.length, prevUsers.length) },
      securityAlerts: { total: alerts, delta: percentDelta(alerts, prevAlerts) },
      // Durée de fonctionnement de l'API depuis son dernier démarrage : aucune
      // sonde externe ne mesure une disponibilité sur 30 jours.
      uptime: { seconds: uptimeSeconds, since: new Date(Date.now() - uptimeSeconds * 1000) },
      filters: {
        modules: modules.map((m) => m.module).filter(Boolean).sort(),
        users: actors,
        actionTypes: ACTION_TYPES,
      },
    };
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id }, include: LOG_INCLUDE });
    if (!log) throw new NotFoundException('Entrée de journal introuvable.');
    const trailCount = log.entiteId && log.entiteId !== '-' ? await this.prisma.auditLog.count({ where: { entiteId: log.entiteId } }) : 0;
    return { ...present(log), trailCount };
  }

  async exportCsv(query: ListAuditQueryDto) {
    const rows = await this.prisma.auditLog.findMany({
      where: this.buildWhere(query),
      include: LOG_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 20000,
    });
    return toCsv(
      rows.map(present).map((log) => ({
        createdAt: log.createdAt.toISOString(),
        user: log.user?.name ?? 'Système',
        role: log.user?.role ?? '',
        actionType: log.actionType,
        action: log.action,
        module: log.module ?? '',
        entite: log.entite,
        entiteId: log.entiteId,
        details: log.details ?? '',
        ipAddress: log.ipAddress ?? '',
        status: log.status,
      })),
      [
        { key: 'createdAt', header: 'Date' },
        { key: 'user', header: 'Utilisateur' },
        { key: 'role', header: 'Rôle' },
        { key: 'actionType', header: 'Type' },
        { key: 'action', header: 'Action' },
        { key: 'module', header: 'Module' },
        { key: 'entite', header: 'Entité' },
        { key: 'entiteId', header: 'Référence' },
        { key: 'details', header: 'Détails' },
        { key: 'ipAddress', header: 'Adresse IP' },
        { key: 'status', header: 'Statut' },
      ],
    );
  }
}

function present<T extends { action: string; entite: string }>(log: T) {
  return { ...log, actionType: actionTypeOf(log) };
}
