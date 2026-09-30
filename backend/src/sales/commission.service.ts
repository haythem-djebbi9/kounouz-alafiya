import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

const COMMISSION_KEY = 'sales.commissionRate';
const DEFAULT_RATE = 0.2;
export const MAX_COMMISSION_RATE = 0.5;
// Plusieurs commandes par seconde au pire : inutile de relire le réglage à
// chacune. Une modification faite ici est prise en compte immédiatement.
const CACHE_MS = 30_000;

const isValidRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_COMMISSION_RATE;

/**
 * Taux de commission Kounouz prélevé sur chaque vente.
 *
 * Réglé par l'administrateur depuis la console (Ventes → Commission), sans
 * redéploiement. Sans réglage enregistré, on retombe sur
 * KOUNOUZ_COMMISSION_RATE, puis sur 20 %. Chaque ligne de commande fige le
 * taux en vigueur au moment de la vente : un changement ne s'applique qu'aux
 * ventes suivantes et ne réécrit jamais les montants déjà calculés.
 */
@Injectable()
export class CommissionService {
  private cache: { rate: number; at: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  defaultRate(): number {
    const raw = Number(this.config.get<string>('KOUNOUZ_COMMISSION_RATE', String(DEFAULT_RATE)));
    return isValidRate(raw) ? raw : DEFAULT_RATE;
  }

  async currentRate(): Promise<number> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.rate;
    const row = await this.prisma.platformSetting.findUnique({ where: { key: COMMISSION_KEY } });
    const stored = (row?.value as { rate?: unknown } | undefined)?.rate;
    const rate = isValidRate(stored) ? stored : this.defaultRate();
    this.cache = { rate, at: Date.now() };
    return rate;
  }

  async describe() {
    const [rate, row, history] = await Promise.all([
      this.currentRate(),
      this.prisma.platformSetting.findUnique({ where: { key: COMMISSION_KEY } }),
      this.prisma.auditLog.findMany({
        where: { action: 'UPDATE_COMMISSION_RATE' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, createdAt: true, metadata: true, reason: true, user: { select: { name: true } } },
      }),
    ]);
    const updatedBy = row?.updatedById
      ? await this.prisma.user.findUnique({ where: { id: row.updatedById }, select: { name: true } })
      : null;
    return {
      rate,
      defaultRate: this.defaultRate(),
      maxRate: MAX_COMMISSION_RATE,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: updatedBy?.name ?? null,
      history: history.map((h) => {
        const meta = (h.metadata ?? {}) as { oldValue?: number; newValue?: number };
        return {
          id: h.id,
          at: h.createdAt,
          by: h.user?.name ?? null,
          from: meta.oldValue ?? null,
          to: meta.newValue ?? null,
          reason: h.reason,
        };
      }),
    };
  }

  async update(userId: string, rate: number, reason?: string) {
    if (!isValidRate(rate)) {
      throw new BadRequestException(`Le taux doit être compris entre 0 et ${MAX_COMMISSION_RATE * 100} %.`);
    }
    // Même précision que la colonne commission_rate des lignes de commande.
    const next = Math.round(rate * 10_000) / 10_000;
    const previous = await this.currentRate();
    if (next === previous) return this.describe();
    await this.prisma.platformSetting.upsert({
      where: { key: COMMISSION_KEY },
      create: {
        key: COMMISSION_KEY,
        value: { rate: next } as Prisma.InputJsonValue,
        description: 'Taux de commission Kounouz prélevé sur chaque vente',
        updatedById: userId,
      },
      update: { value: { rate: next } as Prisma.InputJsonValue, updatedById: userId },
    });
    this.cache = { rate: next, at: Date.now() };
    await this.audit.log(userId, 'UPDATE_COMMISSION_RATE', 'Settings', COMMISSION_KEY, {
      module: 'SALES',
      details: `Commission : ${formatPct(previous)} → ${formatPct(next)}`,
      metadata: { field: 'commissionRate', oldValue: previous, newValue: next },
      reason: reason?.trim() || null,
    });
    return this.describe();
  }
}

function formatPct(rate: number) {
  return `${Math.round(rate * 10_000) / 100} %`;
}
