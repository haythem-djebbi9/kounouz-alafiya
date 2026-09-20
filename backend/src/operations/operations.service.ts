import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BatchStatus,
  CollectionAssignmentStatus,
  DomainEventStatus,
  LabWorkflowStatus,
  OrderStatus,
  Prisma,
  SampleStatus,
  VerificationRequestStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { EventHandlersRegistry } from '../events/event-handlers.registry.js';
import { DEFAULT_SLA, type SlaThresholds, mergeSla, overdueBefore } from './sla.js';

const SLA_KEY = 'sla.thresholds';

export interface AgingStage {
  key: string;
  threshold: number;
  unit: 'hours' | 'days';
  overdue: number;
  items: { id: string; code: string | null; since: Date | null; link: string }[];
}

/**
 * Supervision de la plateforme (§3-§5 et §14 Monitoring) :
 *  - santé technique : base, file d'événements, reprises, dead-letter ;
 *  - parcours de vérification : dossiers en retard par étape, selon des
 *    seuils SLA configurables sans redéploiement.
 */
@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly registry: EventHandlersRegistry,
  ) {}

  // --- Paramètres SLA ---------------------------------------------------------

  async getSla(): Promise<SlaThresholds> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: SLA_KEY } });
    return { ...DEFAULT_SLA, ...((row?.value as Partial<SlaThresholds> | undefined) ?? {}) };
  }

  async updateSla(userId: string, input: Record<string, unknown>) {
    const current = await this.getSla();
    let next: SlaThresholds;
    try {
      next = mergeSla(current, input);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.prisma.platformSetting.upsert({
      where: { key: SLA_KEY },
      create: {
        key: SLA_KEY,
        value: next as unknown as Prisma.InputJsonValue,
        description: 'Seuils SLA du parcours de vérification',
        updatedById: userId,
      },
      update: { value: next as unknown as Prisma.InputJsonValue, updatedById: userId },
    });
    await this.audit.log(userId, 'UPDATE_SLA_SETTINGS', 'Settings', SLA_KEY, {
      metadata: { oldValue: current, newValue: next },
    });
    return next;
  }

  // --- File d'événements ----------------------------------------------------

  async eventsOverview() {
    const now = Date.now();
    const [byStatus, oldestPending, lastHour, deadLetters, retrying] = await Promise.all([
      this.prisma.domainEvent.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.domainEvent.findFirst({
        where: { status: DomainEventStatus.PENDING },
        orderBy: { occurredAt: 'asc' },
        select: { occurredAt: true },
      }),
      this.prisma.domainEvent.count({
        where: { status: DomainEventStatus.PROCESSED, processedAt: { gte: new Date(now - 3_600_000) } },
      }),
      this.prisma.domainEvent.findMany({
        where: { status: DomainEventStatus.DEAD_LETTER },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      this.prisma.domainEvent.count({ where: { status: DomainEventStatus.PENDING, attempts: { gt: 0 } } }),
    ]);

    const counts = Object.fromEntries(Object.values(DomainEventStatus).map((s) => [s, 0])) as Record<
      DomainEventStatus,
      number
    >;
    for (const row of byStatus) counts[row.status] = row._count._all;

    return {
      counts,
      queueDepth: counts.PENDING + counts.PROCESSING,
      oldestPendingSeconds: oldestPending ? Math.round((now - oldestPending.occurredAt.getTime()) / 1000) : 0,
      processedLastHour: lastHour,
      retrying,
      deadLetters,
      subscriptions: this.registry.describe(),
    };
  }

  listEvents(status?: DomainEventStatus, eventType?: string, correlationId?: string) {
    return this.prisma.domainEvent.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(eventType ? { eventType } : {}),
        ...(correlationId ? { correlationId } : {}),
      },
      include: { handlings: { select: { handler: true, processedAt: true } } },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  /** Remet en file un événement en dead-letter, après correction de la cause. */
  async requeue(id: string, userId: string) {
    const event = await this.prisma.domainEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Événement introuvable.');
    if (event.status !== DomainEventStatus.DEAD_LETTER) {
      throw new BadRequestException('Seul un événement en dead-letter peut être remis en file.');
    }
    const updated = await this.prisma.domainEvent.update({
      where: { id },
      data: { status: DomainEventStatus.PENDING, attempts: 0, nextAttemptAt: new Date(), lastError: null },
    });
    await this.audit.log(userId, 'REQUEUE_EVENT', 'DomainEvent', id, {
      previousStatus: DomainEventStatus.DEAD_LETTER,
      newStatus: DomainEventStatus.PENDING,
      details: event.eventType,
    });
    return updated;
  }

  // --- Retards du parcours --------------------------------------------------

  async workflowAging(): Promise<{ sla: SlaThresholds; stages: AgingStage[]; totalOverdue: number }> {
    const sla = await this.getSla();
    const now = new Date();
    const take = 10;

    const [requests, collections, samples, analyses, toPackage, toPublish] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where: {
          status: {
            in: [
              VerificationRequestStatus.NEW,
              VerificationRequestStatus.IN_REVIEW,
              VerificationRequestStatus.INFO_REQUESTED,
            ],
          },
          submittedAt: { lt: overdueBefore(now, sla.requestReviewHours, 'hours') },
        },
        select: { id: true, requestCode: true, submittedAt: true },
        orderBy: { submittedAt: 'asc' },
      }),
      this.prisma.collectionAssignment.findMany({
        where: {
          status: { in: [CollectionAssignmentStatus.PENDING, CollectionAssignmentStatus.IN_PROGRESS] },
          scheduledDate: { lt: overdueBefore(now, sla.collectionOverdueDays, 'days') },
        },
        select: { id: true, assignmentCode: true, scheduledDate: true },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.sample.findMany({
        where: { status: SampleStatus.RECEIVED, updatedAt: { lt: overdueBefore(now, sla.sampleToLabDays, 'days') } },
        select: { id: true, sampleCode: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.laboratoryAnalysis.findMany({
        where: {
          workflowStatus: { in: [LabWorkflowStatus.COMPLETED, LabWorkflowStatus.REVIEWED] },
          completedAt: { lt: overdueBefore(now, sla.analysisToDecisionDays, 'days') },
          verifications: { none: { isDraft: false, status: { not: VerificationStatus.PENDING } } },
        },
        select: { id: true, analysisCode: true, completedAt: true },
        orderBy: { completedAt: 'asc' },
      }),
      this.prisma.batch.findMany({
        where: {
          status: { in: [BatchStatus.VERIFIED, BatchStatus.READY_FOR_PACKAGING, BatchStatus.IN_PACKAGING, BatchStatus.CREATED] },
          createdAt: { lt: overdueBefore(now, sla.verificationToPackagingDays, 'days') },
        },
        select: { id: true, batchCode: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.batch.findMany({
        where: {
          status: { in: [BatchStatus.PACKAGED, BatchStatus.READY, BatchStatus.CONVERTED_TO_PRODUCT] },
          updatedAt: { lt: overdueBefore(now, sla.packagingToPublicationDays, 'days') },
        },
        select: { id: true, batchCode: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    const settlements = await this.overdueSettlements(sla.settlementDays, now);

    const stages: AgingStage[] = [
      {
        key: 'REQUEST_REVIEW',
        threshold: sla.requestReviewHours,
        unit: 'hours',
        overdue: requests.length,
        items: requests.slice(0, take).map((r) => ({
          id: r.id,
          code: r.requestCode,
          since: r.submittedAt,
          link: `/verificateur/demandes?id=${r.id}`,
        })),
      },
      {
        key: 'COLLECTION',
        threshold: sla.collectionOverdueDays,
        unit: 'days',
        overdue: collections.length,
        items: collections.slice(0, take).map((c) => ({
          id: c.id,
          code: c.assignmentCode,
          since: c.scheduledDate,
          link: '/verificateur/echantillons',
        })),
      },
      {
        key: 'SAMPLE_TO_LAB',
        threshold: sla.sampleToLabDays,
        unit: 'days',
        overdue: samples.length,
        items: samples.slice(0, take).map((s) => ({
          id: s.id,
          code: s.sampleCode,
          since: s.updatedAt,
          link: `/verificateur/echantillons?id=${s.id}`,
        })),
      },
      {
        key: 'ANALYSIS_TO_DECISION',
        threshold: sla.analysisToDecisionDays,
        unit: 'days',
        overdue: analyses.length,
        items: analyses.slice(0, take).map((a) => ({
          id: a.id,
          code: a.analysisCode,
          since: a.completedAt,
          link: '/verificateur/decisions',
        })),
      },
      {
        key: 'VERIFICATION_TO_PACKAGING',
        threshold: sla.verificationToPackagingDays,
        unit: 'days',
        overdue: toPackage.length,
        items: toPackage.slice(0, take).map((b) => ({
          id: b.id,
          code: b.batchCode,
          since: b.createdAt,
          link: `/verificateur/lots/${b.id}`,
        })),
      },
      {
        key: 'PACKAGING_TO_PUBLICATION',
        threshold: sla.packagingToPublicationDays,
        unit: 'days',
        overdue: toPublish.length,
        items: toPublish.slice(0, take).map((b) => ({
          id: b.id,
          code: b.batchCode,
          since: b.updatedAt,
          link: `/verificateur/lots/${b.id}`,
        })),
      },
      {
        key: 'SETTLEMENT',
        threshold: sla.settlementDays,
        unit: 'days',
        overdue: settlements.length,
        items: settlements.slice(0, take),
      },
    ];

    return { sla, stages, totalOverdue: stages.reduce((sum, s) => sum + s.overdue, 0) };
  }

  /** Périodes de ventes livrées, closes depuis plus de N jours et non réglées. */
  private async overdueSettlements(days: number, now: Date) {
    const [delivered, payouts] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: { order: { status: OrderStatus.DELIVERED, deliveredAt: { not: null } } },
        select: { producerId: true, producer: { select: { name: true } }, order: { select: { deliveredAt: true } } },
      }),
      this.prisma.payout.findMany({ select: { producerId: true, period: true } }),
    ]);
    const paid = new Set(payouts.map((p) => `${p.producerId}:${p.period}`));
    const seen = new Map<string, { id: string; code: string | null; since: Date | null; link: string }>();
    for (const item of delivered) {
      const d = item.order.deliveredAt!;
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const key = `${item.producerId}:${period}`;
      if (paid.has(key) || seen.has(key)) continue;
      if (periodEnd.getTime() + days * 86_400_000 > now.getTime()) continue;
      seen.set(key, {
        id: key,
        code: `${item.producer.name} — ${period}`,
        since: periodEnd,
        link: '/admin/reglements',
      });
    }
    return [...seen.values()];
  }
}
