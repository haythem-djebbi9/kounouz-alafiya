import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toCsv } from '../common/csv.js';
import { paginate, percentDelta, startOfUtcMonth } from './admin-common.js';
import { actionTypeOf } from './admin-audit.service.js';
import {
  CreateUserDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  STAFF_ROLES,
  StaffRole,
  UpdateUserDto,
} from './dto/admin-users.dto.js';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  phone: true,
  location: true,
  lastLoginAt: true,
  twoFactorEnabled: true,
  createdAt: true,
  producer: { select: { id: true, farmName: true, governorate: true, location: true, avatarUrl: true, status: true } },
  consumer: { select: { id: true, country: true } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

const KOUNOUZ_ORGANIZATION = 'Kounouz Alafiya';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListUsersQueryDto) {
    const where = this.buildWhere(query);
    const { skip, take, page, pageSize } = paginate(query.page, query.pageSize);
    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      query.sort === 'NAME'
        ? [{ name: 'asc' }]
        : query.sort === 'LAST_LOGIN'
          ? [{ lastLoginAt: { sort: 'desc', nulls: 'last' } }]
          : [{ createdAt: 'desc' }];

    const [items, total, roleCounts] = await Promise.all([
      this.prisma.user.findMany({ where, select: USER_SELECT, orderBy, skip, take }),
      this.prisma.user.count({ where }),
      this.roleCounts(),
    ]);

    return { items: items.map(present), total, page, pageSize, stats: roleCounts };
  }

  /** Effectif par rôle, et croissance depuis la fin du mois précédent. */
  private async roleCounts() {
    const monthStart = startOfUtcMonth(new Date());
    const [now, before] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['role'], where: { createdAt: { lt: monthStart } }, _count: { _all: true } }),
    ]);
    const count = (rows: typeof now, role?: Role) =>
      rows.filter((r) => !role || r.role === role).reduce((sum, r) => sum + r._count._all, 0);
    const entry = (role?: Role) => ({ total: count(now, role), delta: percentDelta(count(now, role), count(before, role)) });
    return {
      ALL: entry(),
      ADMIN: entry(Role.ADMIN),
      VERIFICATION_TEAM: entry(Role.VERIFICATION_TEAM),
      FIELD_AGENT: entry(Role.FIELD_AGENT),
      PRODUCER: entry(Role.PRODUCER),
      CONSUMER: entry(Role.CONSUMER),
    };
  }

  private buildWhere(query: ListUsersQueryDto): Prisma.UserWhereInput {
    const and: Prisma.UserWhereInput[] = [];
    if (query.role) and.push({ role: query.role });
    if (query.status) and.push({ isActive: query.status === 'ACTIVE' });
    if (query.search) {
      const contains = { contains: query.search.trim(), mode: 'insensitive' as const };
      and.push({
        OR: [{ name: contains }, { email: contains }, { location: contains }, { producer: { farmName: contains } }],
      });
    }
    if (query.lastLogin) {
      const days = (n: number) => new Date(Date.now() - n * 86400000);
      and.push(
        query.lastLogin === 'NEVER'
          ? { lastLoginAt: null }
          : query.lastLogin === 'OVER_30_DAYS'
            ? { lastLoginAt: { lt: days(30) } }
            : { lastLoginAt: { gte: days(query.lastLogin === 'LAST_7_DAYS' ? 7 : 30) } },
      );
    }
    return and.length ? { AND: and } : {};
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    const [recentActivity, activityCount] = await Promise.all([
      this.prisma.auditLog.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 8 }),
      this.prisma.auditLog.count({ where: { userId: id } }),
    ]);
    return {
      ...present(user),
      recentActivity: recentActivity.map((log) => ({ ...log, actionType: actionTypeOf(log) })),
      activityCount,
    };
  }

  async create(actorId: string, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
        phone: dto.phone?.trim() || null,
        location: dto.location?.trim() || null,
      },
      select: USER_SELECT,
    });
    await this.audit.log(actorId, 'CREATE_USER', 'User', user.id, {
      details: `${user.name} (${user.role})`,
      metadata: { field: 'role', newValue: user.role },
    });
    return present(user);
  }

  async update(actorId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    if (dto.role && dto.role !== user.role) {
      if (!STAFF_ROLES.includes(user.role as StaffRole)) {
        throw new BadRequestException("Le rôle d'un producteur ou d'un client ne peut pas être modifié.");
      }
      if (id === actorId) {
        throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle.');
      }
      await this.assertNotLastAdmin(user.role, id);
    }

    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    const data: Prisma.UserUpdateInput = {};
    const track = <K extends 'name' | 'role' | 'phone' | 'location'>(field: K, value: string | undefined) => {
      if (value === undefined) return;
      const next = field === 'role' ? value : value.trim() || (field === 'name' ? user.name : null);
      if (next === user[field]) return;
      changes.push({ field, oldValue: user[field], newValue: next });
      (data as Record<string, unknown>)[field] = next;
    };
    track('name', dto.name);
    track('role', dto.role);
    track('phone', dto.phone);
    track('location', dto.location);

    const updated = await this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
    if (changes.length > 0) {
      await this.audit.log(actorId, changes.some((c) => c.field === 'role') ? 'CHANGE_USER_ROLE' : 'UPDATE_USER', 'User', id, {
        details: updated.name,
        metadata: {
          field: changes.map((c) => c.field).join(', '),
          oldValue: Object.fromEntries(changes.map((c) => [c.field, c.oldValue])),
          newValue: Object.fromEntries(changes.map((c) => [c.field, c.newValue])),
        },
      });
    }
    return present(updated);
  }

  async setStatus(actorId: string, id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (id === actorId && !isActive) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
    }
    if (!isActive) await this.assertNotLastAdmin(user.role, id);

    const updated = await this.prisma.user.update({
      where: { id },
      // Désactiver révoque aussi les sessions en cours.
      data: { isActive, ...(isActive ? {} : { refreshTokenHash: null }) },
      select: USER_SELECT,
    });
    await this.audit.log(actorId, isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'User', id, {
      details: updated.name,
      metadata: { field: 'isActive', oldValue: user.isActive, newValue: isActive },
    });
    return present(updated);
  }

  async resetPassword(actorId: string, id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, 10),
        passwordChangedAt: new Date(),
        refreshTokenHash: null,
      },
    });
    await this.audit.log(actorId, 'RESET_USER_PASSWORD', 'User', id, { details: user.name });
  }

  async exportCsv(query: ListUsersQueryDto) {
    const users = await this.prisma.user.findMany({
      where: this.buildWhere(query),
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return toCsv(
      users.map(present).map((u) => ({
        ...u,
        isActive: u.isActive ? 'Actif' : 'Inactif',
        lastLoginAt: u.lastLoginAt?.toISOString() ?? '',
        createdAt: u.createdAt.toISOString(),
      })),
      [
        { key: 'name', header: 'Nom' },
        { key: 'email', header: 'Email' },
        { key: 'role', header: 'Rôle' },
        { key: 'organization', header: 'Organisation' },
        { key: 'displayLocation', header: 'Localisation' },
        { key: 'phone', header: 'Téléphone' },
        { key: 'isActive', header: 'Statut' },
        { key: 'lastLoginAt', header: 'Dernière connexion' },
        { key: 'createdAt', header: 'Créé le' },
      ],
    );
  }

  private async assertNotLastAdmin(role: Role, id: string) {
    if (role !== Role.ADMIN) return;
    const others = await this.prisma.user.count({ where: { role: Role.ADMIN, isActive: true, id: { not: id } } });
    if (others === 0) {
      throw new BadRequestException('Au moins un administrateur actif doit rester sur la plateforme.');
    }
  }
}

function present(user: UserRow) {
  const organization =
    user.role === Role.PRODUCER ? (user.producer?.farmName ?? null) : user.role === Role.CONSUMER ? null : KOUNOUZ_ORGANIZATION;
  const displayLocation =
    user.location ?? user.producer?.governorate ?? user.producer?.location ?? user.consumer?.country ?? null;
  return { ...user, organization, displayLocation, avatarUrl: user.producer?.avatarUrl ?? null };
}
