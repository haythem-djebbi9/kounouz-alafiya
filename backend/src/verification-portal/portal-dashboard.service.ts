import { Injectable } from '@nestjs/common';
import { VerificationRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { TAB_STATUSES } from './portal-requests.service.js';

// Les cinq cartouches du Centre de vérification.
const KPI_GROUPS = {
  TOTAL: null,
  UNDER_REVIEW: TAB_STATUSES.UNDER_REVIEW,
  IN_LABORATORY: TAB_STATUSES.IN_LABORATORY,
  VERIFIED: TAB_STATUSES.VERIFIED,
  REJECTED: TAB_STATUSES.REJECTED,
} as const;

export type KpiKey = keyof typeof KPI_GROUPS;

@Injectable()
export class PortalDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(months = 6) {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const [kpis, trend, byStatus, byRegion, recent] = await Promise.all([
      this.kpis(startOfThisMonth, startOfLastMonth),
      this.trend(trendStart, months),
      this.byStatus(),
      this.byRegion(),
      this.recentRequests(),
    ]);

    return { kpis, trend, byStatus, byRegion, recent };
  }

  /**
   * Compteurs courants et variation par rapport au mois précédent.
   *
   * La comparaison porte sur les dossiers *entrés* dans chaque état pendant le
   * mois, pas sur le stock : c'est l'activité de l'équipe qui est mesurée.
   */
  private async kpis(startOfThisMonth: Date, startOfLastMonth: Date) {
    const notDraft = { status: { not: VerificationRequestStatus.DRAFT } } as const;

    const entries = await Promise.all(
      (Object.keys(KPI_GROUPS) as KpiKey[]).map(async (key) => {
        const statuses = KPI_GROUPS[key];
        const scope = statuses ? { status: { in: [...statuses] } } : notDraft;

        const [total, thisMonth, lastMonth] = await Promise.all([
          this.prisma.verificationRequest.count({ where: scope }),
          this.prisma.verificationRequest.count({
            where: { ...scope, updatedAt: { gte: startOfThisMonth } },
          }),
          this.prisma.verificationRequest.count({
            where: { ...scope, updatedAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
          }),
        ]);

        return [key, { total, thisMonth, lastMonth, delta: percentDelta(thisMonth, lastMonth) }] as const;
      }),
    );

    return Object.fromEntries(entries) as Record<
      KpiKey,
      { total: number; thisMonth: number; lastMonth: number; delta: number | null }
    >;
  }

  /** Série mensuelle par famille de statut, pour la courbe de tendance. */
  private async trend(start: Date, months: number) {
    const requests = await this.prisma.verificationRequest.findMany({
      where: { status: { not: VerificationRequestStatus.DRAFT }, createdAt: { gte: start } },
      select: { status: true, createdAt: true },
    });

    const buckets = Array.from({ length: months }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return {
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        UNDER_REVIEW: 0,
        IN_LABORATORY: 0,
        VERIFIED: 0,
        REJECTED: 0,
      };
    });
    const indexOf = new Map(buckets.map((b, i) => [b.month, i]));

    for (const request of requests) {
      const key = `${request.createdAt.getFullYear()}-${String(request.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const index = indexOf.get(key);
      if (index === undefined) continue;
      const family = familyOf(request.status);
      if (family) buckets[index][family] += 1;
    }

    return buckets;
  }

  /** Répartition par famille de statut, avec la part en pourcentage. */
  private async byStatus() {
    const grouped = await this.prisma.verificationRequest.groupBy({
      by: ['status'],
      where: { status: { not: VerificationRequestStatus.DRAFT } },
      _count: { _all: true },
    });

    const families = { UNDER_REVIEW: 0, IN_LABORATORY: 0, VERIFIED: 0, REJECTED: 0 };
    let total = 0;
    for (const row of grouped) {
      total += row._count._all;
      const family = familyOf(row.status);
      if (family) families[family] += row._count._all;
    }

    return {
      total,
      items: (Object.keys(families) as (keyof typeof families)[]).map((key) => ({
        key,
        count: families[key],
        percent: total === 0 ? 0 : Math.round((families[key] / total) * 100),
      })),
    };
  }

  /** Volume par gouvernorat, pour la carte de Tunisie. */
  private async byRegion() {
    const grouped = await this.prisma.verificationRequest.groupBy({
      by: ['governorate'],
      where: { status: { not: VerificationRequestStatus.DRAFT }, governorate: { not: null } },
      _count: { _all: true },
    });

    return grouped
      .map((row) => ({ governorate: row.governorate as string, count: row._count._all }))
      .sort((a, b) => b.count - a.count);
  }

  private recentRequests() {
    return this.prisma.verificationRequest.findMany({
      where: { status: { not: VerificationRequestStatus.DRAFT } },
      select: {
        id: true,
        requestCode: true,
        honeyType: true,
        batchNumber: true,
        status: true,
        collectionLocation: true,
        governorate: true,
        submittedAt: true,
        createdAt: true,
        producer: { select: { id: true, name: true } },
        samples: { select: { id: true, status: true } },
        verifications: { select: { id: true, status: true, isDraft: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 8,
    });
  }
}

type StatusFamily = 'UNDER_REVIEW' | 'IN_LABORATORY' | 'VERIFIED' | 'REJECTED';

function familyOf(status: VerificationRequestStatus): StatusFamily | null {
  for (const [family, statuses] of Object.entries(TAB_STATUSES)) {
    if ((statuses as VerificationRequestStatus[]).includes(status)) {
      return family as StatusFamily;
    }
  }
  return null;
}

/**
 * Variation en pourcentage d'un mois sur l'autre. Renvoie `null` quand le mois
 * de référence est vide : afficher « +100 % » à partir de zéro donnerait une
 * fausse impression de progression mesurée.
 */
function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
