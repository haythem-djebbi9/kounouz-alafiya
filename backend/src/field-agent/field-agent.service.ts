import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CollectionAssignmentStatus,
  CollectionMethod,
  NotificationType,
  Prisma,
  Role,
  SampleEventType,
  SampleStatus,
  VerificationRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { allocateYearCode, padSequence } from '../common/sequential-code.js';
import { SampleEventsService } from '../verification-portal/sample-events.service.js';
import {
  AddCustodyEventDto,
  AssignmentScope,
  ClaimAssignmentDto,
  CollectSampleDto,
  CompleteAssignmentDto,
  CreateAssignmentDto,
  DayRangeQueryDto,
  ListAssignmentsQueryDto,
  RegisterSealDto,
  RescheduleAssignmentDto,
} from './dto/field-agent.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

// Centre de vérification Kounouz (Tunis) : destination de tout échantillon.
export const KOUNOUZ_CENTER = { name: 'Kounouz Alafiya — Tunis', latitude: 36.8065, longitude: 10.1815 };

// Étapes de la chaîne de possession vues par l'agent, dans l'ordre. Les trois
// dernières appartiennent à l'équipe de vérification : elles restent affichées
// « en attente » tant qu'elles ne sont pas réalisées.
export const AGENT_CUSTODY_STEPS = [
  'COLLECTED',
  'SEALED',
  'RELEASED_FOR_TRANSPORT',
  'IN_TRANSIT',
  'RECEIVED',
  'SENT_TO_LAB',
  'IN_LABORATORY',
] as const;

const ACTIVE_STATUSES: CollectionAssignmentStatus[] = [
  CollectionAssignmentStatus.PENDING,
  CollectionAssignmentStatus.IN_PROGRESS,
];

const SCHEDULABLE_REQUEST_STATUSES: VerificationRequestStatus[] = [
  VerificationRequestStatus.ACCEPTED,
  VerificationRequestStatus.COLLECTION_SCHEDULED,
];

const PRODUCER_SELECT = {
  id: true,
  userId: true,
  name: true,
  farmName: true,
  location: true,
  description: true,
  phone: true,
  avatarUrl: true,
  governorate: true,
  farmGovernorate: true,
  farmDelegation: true,
  farmAddress: true,
  latitude: true,
  longitude: true,
  hivesCount: true,
  farmPhotos: true,
  mainFlora: true,
  activityType: true,
  isVerified: true,
  user: { select: { email: true } },
} as const;

const REQUEST_SELECT = {
  id: true,
  requestCode: true,
  honeyType: true,
  description: true,
  collectionLocation: true,
  quantity: true,
  status: true,
  governorate: true,
  delegation: true,
  latitude: true,
  longitude: true,
  hivesCount: true,
  beekeepingMethod: true,
  hiveType: true,
  floralOrigin: true,
  productionSeason: true,
  batchNumber: true,
  preferredCollectionMethod: true,
  producer: { select: PRODUCER_SELECT },
} as const;

const SAMPLE_SUMMARY_SELECT = {
  id: true,
  sampleCode: true,
  status: true,
  collectionDate: true,
  quantity: true,
  honeyType: true,
  numberOfSamples: true,
  photos: true,
  seal: { select: { id: true, sealCode: true, sealedAt: true, status: true, photoUrl: true } },
} as const;

const ASSIGNMENT_INCLUDE = {
  request: { select: REQUEST_SELECT },
  sample: { select: SAMPLE_SUMMARY_SELECT },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CollectionAssignmentInclude;

const CUSTODY_SAMPLE_INCLUDE = {
  request: { select: REQUEST_SELECT },
  collectedBy: { select: { id: true, name: true } },
  seal: true,
  assignment: { select: { id: true, assignmentCode: true, scheduledDate: true, status: true } },
  events: {
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { occurredAt: 'asc' },
  },
} satisfies Prisma.SampleInclude;

type AssignmentWithRelations = Prisma.CollectionAssignmentGetPayload<{ include: typeof ASSIGNMENT_INCLUDE }>;

@Injectable()
export class FieldAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly events: SampleEventsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  // --- Tableau de bord ---------------------------------------------------

  async dashboard(agentId: string, range: DayRangeQueryDto) {
    const { from, to } = dayRange(range);

    const [today, inProgress, upcoming, overdue, recentSamples] = await Promise.all([
      this.prisma.collectionAssignment.findMany({
        where: {
          agentId,
          scheduledDate: { gte: from, lt: to },
          status: { not: CollectionAssignmentStatus.CANCELLED },
        },
        include: ASSIGNMENT_INCLUDE,
        orderBy: [{ scheduledDate: 'asc' }, { timeWindowStart: 'asc' }],
      }),
      this.prisma.collectionAssignment.count({
        where: { agentId, status: CollectionAssignmentStatus.IN_PROGRESS },
      }),
      this.prisma.collectionAssignment.count({
        where: { agentId, status: CollectionAssignmentStatus.PENDING, scheduledDate: { gte: to } },
      }),
      this.prisma.collectionAssignment.count({
        where: { agentId, status: CollectionAssignmentStatus.PENDING, scheduledDate: { lt: from } },
      }),
      this.prisma.sample.findMany({
        where: { collectedById: agentId, status: { in: [SampleStatus.COLLECTED, SampleStatus.SEALED, SampleStatus.IN_TRANSIT] } },
        select: { ...SAMPLE_SUMMARY_SELECT, request: { select: { honeyType: true, producer: { select: { name: true } } } } },
        orderBy: { collectionDate: 'desc' },
        take: 10,
      }),
    ]);

    return {
      range: { from, to },
      stats: {
        today: today.length,
        completed: today.filter((a) => a.status === CollectionAssignmentStatus.COMPLETED).length,
        inProgress,
        upcoming,
        overdue,
      },
      assignments: today.map((a) => this.present(a, from)),
      samplesInCustody: recentSamples,
    };
  }

  // --- Missions ----------------------------------------------------------

  async listAssignments(agentId: string, query: ListAssignmentsQueryDto) {
    const { from, to } = dayRange(query);
    const scope: AssignmentScope = query.scope ?? 'ALL';
    const where: Prisma.CollectionAssignmentWhereInput = { agentId };

    switch (scope) {
      case 'TODAY':
        where.scheduledDate = { gte: from, lt: to };
        where.status = { not: CollectionAssignmentStatus.CANCELLED };
        break;
      case 'UPCOMING':
        where.scheduledDate = { gte: to };
        where.status = CollectionAssignmentStatus.PENDING;
        break;
      case 'ACTIVE':
        where.status = { in: ACTIVE_STATUSES };
        break;
      case 'COMPLETED':
        where.status = { in: [CollectionAssignmentStatus.COMPLETED, CollectionAssignmentStatus.CANCELLED] };
        break;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { assignmentCode: { contains: search, mode: 'insensitive' } },
        { request: { honeyType: { contains: search, mode: 'insensitive' } } },
        { request: { collectionLocation: { contains: search, mode: 'insensitive' } } },
        { request: { requestCode: { contains: search, mode: 'insensitive' } } },
        { request: { producer: { name: { contains: search, mode: 'insensitive' } } } },
        { request: { producer: { farmName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const items = await this.prisma.collectionAssignment.findMany({
      where,
      include: ASSIGNMENT_INCLUDE,
      orderBy:
        scope === 'COMPLETED'
          ? [{ completedAt: 'desc' }, { scheduledDate: 'desc' }]
          : [{ scheduledDate: 'asc' }, { timeWindowStart: 'asc' }],
    });
    return items.map((a) => this.present(a, from));
  }

  /**
   * Demandes acceptées sans mission ni échantillon : le pool partagé dans
   * lequel un agent peut se positionner lui-même. Les dossiers où le
   * producteur apporte l'échantillon ne nécessitent pas de déplacement.
   */
  findAvailable() {
    return this.prisma.verificationRequest.findMany({
      where: {
        status: VerificationRequestStatus.ACCEPTED,
        samples: { none: {} },
        assignments: { none: { status: { not: CollectionAssignmentStatus.CANCELLED } } },
        OR: [
          { preferredCollectionMethod: null },
          { preferredCollectionMethod: CollectionMethod.KOUNOUZ_VISIT },
        ],
      },
      select: { ...REQUEST_SELECT, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async claim(agentId: string, dto: ClaimAssignmentDto) {
    const assignment = await this.createAssignmentRecord(agentId, null, dto);
    await this.audit.log(agentId, 'CLAIM_COLLECTION_ASSIGNMENT', 'CollectionAssignment', assignment.id);
    return this.present(assignment);
  }

  async findOne(agentId: string, id: string, range: DayRangeQueryDto) {
    const assignment = await this.requireAssignment(agentId, id);

    // Navigation « Précédent / Suivant » parmi les missions actives de
    // l'agent, dans l'ordre de passage.
    const active = await this.prisma.collectionAssignment.findMany({
      where: { agentId, status: { in: ACTIVE_STATUSES } },
      select: { id: true },
      orderBy: [{ scheduledDate: 'asc' }, { timeWindowStart: 'asc' }],
    });
    const index = active.findIndex((a) => a.id === id);

    const { from } = dayRange(range);
    return {
      ...this.present(assignment, from),
      navigation: {
        index: index === -1 ? null : index + 1,
        total: active.length,
        previousId: index > 0 ? active[index - 1].id : null,
        nextId: index !== -1 && index < active.length - 1 ? active[index + 1].id : null,
      },
    };
  }

  async start(agentId: string, id: string) {
    const assignment = await this.requireAssignment(agentId, id);
    if (assignment.status === CollectionAssignmentStatus.IN_PROGRESS) {
      return this.present(assignment);
    }
    if (assignment.status !== CollectionAssignmentStatus.PENDING) {
      throw new BadRequestException('Seule une mission en attente peut être démarrée.');
    }

    const updated = await this.prisma.collectionAssignment.update({
      where: { id },
      data: { status: CollectionAssignmentStatus.IN_PROGRESS, startedAt: new Date() },
      include: ASSIGNMENT_INCLUDE,
    });
    await this.audit.log(agentId, 'START_COLLECTION_ASSIGNMENT', 'CollectionAssignment', id);
    return this.present(updated);
  }

  async reschedule(agentId: string, id: string, dto: RescheduleAssignmentDto) {
    const assignment = await this.requireAssignment(agentId, id);
    if (!ACTIVE_STATUSES.includes(assignment.status) || assignment.sampleId) {
      throw new BadRequestException("Une mission terminée ou déjà prélevée ne peut plus être reprogrammée.");
    }
    assertWindow(dto.timeWindowStart, dto.timeWindowEnd);

    const updated = await this.prisma.collectionAssignment.update({
      where: { id },
      data: {
        scheduledDate: new Date(dto.scheduledDate),
        timeWindowStart: dto.timeWindowStart ?? null,
        timeWindowEnd: dto.timeWindowEnd ?? null,
        rescheduleReason: dto.reason,
        rescheduleCount: { increment: 1 },
        status: CollectionAssignmentStatus.PENDING,
        startedAt: null,
      },
      include: ASSIGNMENT_INCLUDE,
    });
    await this.audit.log(agentId, 'RESCHEDULE_COLLECTION_ASSIGNMENT', 'CollectionAssignment', id);

    await this.notifications.notify(
      updated.request.producer.userId,
      NotificationType.COLLECTION_ASSIGNED,
      'Visite de collecte reprogrammée',
      `La visite pour « ${updated.request.honeyType} » est reprogrammée au ${formatDay(updated.scheduledDate)}${windowLabel(updated)}. Motif : ${dto.reason}`,
      'VerificationRequest',
      updated.requestId,
    );

    return this.present(updated);
  }

  async updateEquipment(agentId: string, id: string, checkedEquipment: string[]) {
    const assignment = await this.requireAssignment(agentId, id);
    const allowed = new Set(assignment.requiredEquipment);
    const updated = await this.prisma.collectionAssignment.update({
      where: { id },
      data: { checkedEquipment: Array.from(new Set(checkedEquipment.filter((e) => allowed.has(e)))) },
      include: ASSIGNMENT_INCLUDE,
    });
    return this.present(updated);
  }

  // --- Collecte ----------------------------------------------------------

  /** Aperçu du prochain identifiant d'échantillon (attribué définitivement à l'enregistrement). */
  async nextSampleCode() {
    const prefix = `SM-${new Date().getFullYear()}-`;
    const count = await this.prisma.sample.count({ where: { sampleCode: { startsWith: prefix } } });
    return { sampleCode: `${prefix}${padSequence(count + 1, 3)}` };
  }

  async collectSample(agentId: string, id: string, dto: CollectSampleDto) {
    const assignment = await this.requireAssignment(agentId, id);
    if (assignment.sampleId) {
      throw new BadRequestException('Un échantillon est déjà enregistré pour cette mission.');
    }
    if (!ACTIVE_STATUSES.includes(assignment.status)) {
      throw new BadRequestException("Cette mission n'est plus active.");
    }
    if (!SCHEDULABLE_REQUEST_STATUSES.includes(assignment.request.status)) {
      throw new BadRequestException("La demande liée n'accepte plus de prélèvement.");
    }

    const quantityKg = dto.unit === 'g' ? dto.quantity / 1000 : dto.quantity;
    const collectionDate = new Date(dto.collectionDate);
    const location = dto.location?.trim() || assignment.request.collectionLocation;

    const sample = await allocateYearCode(
      'SM',
      (prefix) => this.prisma.sample.count({ where: { sampleCode: { startsWith: prefix } } }),
      (sampleCode) =>
        this.prisma.sample.create({
          data: {
            sampleCode,
            requestId: assignment.requestId,
            collectedById: agentId,
            collectionDate,
            collectionMethod: CollectionMethod.KOUNOUZ_VISIT,
            location,
            quantity: quantityKg,
            photos: dto.photos ?? [],
            status: SampleStatus.COLLECTED,
            honeyType: dto.honeyType,
            numberOfSamples: dto.numberOfSamples,
            harvestSource: dto.harvestSource,
            latitude: dto.latitude,
            longitude: dto.longitude,
            gpsAccuracy: dto.gpsAccuracy,
            notes: dto.notes,
            weather: dto.weather ?? undefined,
          },
        }),
    );

    const geo = { location, latitude: dto.latitude, longitude: dto.longitude };
    await this.events.record(sample.id, SampleEventType.REGISTERED, agentId, { ...geo, occurredAt: sample.createdAt });
    await this.events.record(sample.id, SampleEventType.COLLECTED, agentId, {
      ...geo,
      note: dto.notes,
      evidenceUrl: dto.photos?.[0],
      occurredAt: collectionDate,
    });

    await this.prisma.$transaction([
      this.prisma.collectionAssignment.update({
        where: { id },
        data: {
          sampleId: sample.id,
          status: CollectionAssignmentStatus.IN_PROGRESS,
          startedAt: assignment.startedAt ?? new Date(),
        },
      }),
      this.prisma.verificationRequest.update({
        where: { id: assignment.requestId },
        data: { status: VerificationRequestStatus.SAMPLE_COLLECTED },
      }),
    ]);

    await this.audit.log(agentId, 'CREATE_SAMPLE', 'Sample', sample.id);
    return this.findAssignmentPresented(id);
  }

  async registerSeal(agentId: string, sampleId: string, dto: RegisterSealDto) {
    const sample = await this.requireOwnSample(agentId, sampleId);
    if (sample.seal) {
      throw new BadRequestException('Un scellé existe déjà pour cet échantillon.');
    }
    if (sample.status !== SampleStatus.COLLECTED) {
      throw new BadRequestException("L'échantillon doit être au statut « collecté » pour être scellé.");
    }

    const data = {
      sampleId,
      photoUrl: dto.photoUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
      notes: dto.notes,
    };

    let seal;
    if (dto.sealCode) {
      const sealCode = dto.sealCode.toUpperCase();
      if (await this.prisma.seal.findUnique({ where: { sealCode } })) {
        throw new BadRequestException('Ce numéro de scellé est déjà enregistré sur un autre échantillon.');
      }
      seal = await this.prisma.seal.create({ data: { ...data, sealCode } });
    } else {
      seal = await allocateYearCode(
        'KS',
        (prefix) => this.prisma.seal.count({ where: { sealCode: { startsWith: prefix } } }),
        (sealCode) => this.prisma.seal.create({ data: { ...data, sealCode } }),
        { width: 6 },
      );
    }

    await this.events.record(sampleId, SampleEventType.SEALED, agentId, {
      note: dto.notes ? `${seal.sealCode} — ${dto.notes}` : seal.sealCode,
      evidenceUrl: dto.photoUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
      location: sample.location,
      occurredAt: seal.sealedAt,
    });
    await this.audit.log(agentId, 'APPLY_SEAL', 'Seal', seal.id);

    return this.custody(agentId, sampleId);
  }

  async complete(agentId: string, id: string, dto: CompleteAssignmentDto) {
    const assignment = await this.requireAssignment(agentId, id);
    if (assignment.status === CollectionAssignmentStatus.COMPLETED) {
      return this.present(assignment);
    }
    if (assignment.status !== CollectionAssignmentStatus.IN_PROGRESS) {
      throw new BadRequestException("Seule une mission en cours peut être clôturée.");
    }
    if (!assignment.sample) {
      throw new BadRequestException("Enregistrez d'abord l'échantillon prélevé.");
    }
    if (!assignment.sample.seal) {
      throw new BadRequestException('Le scellé doit être enregistré avant de clôturer la mission.');
    }

    const updated = await this.prisma.collectionAssignment.update({
      where: { id },
      data: {
        status: CollectionAssignmentStatus.COMPLETED,
        completedAt: new Date(),
        producerConfirmed: dto.producerConfirmed,
        notes: dto.notes ? [assignment.notes, dto.notes].filter(Boolean).join('\n') : assignment.notes,
      },
      include: ASSIGNMENT_INCLUDE,
    });
    await this.audit.log(agentId, 'COMPLETE_COLLECTION_ASSIGNMENT', 'CollectionAssignment', id);
    return this.present(updated);
  }

  // --- Chaîne de possession ----------------------------------------------

  async listSamples(agentId: string) {
    const samples = await this.prisma.sample.findMany({
      where: { collectedById: agentId },
      include: {
        request: { select: { id: true, requestCode: true, honeyType: true, producer: { select: { name: true, farmName: true } } } },
        seal: { select: { sealCode: true, status: true } },
        assignment: { select: { id: true, assignmentCode: true } },
        events: { orderBy: { occurredAt: 'desc' }, take: 1, select: { type: true, occurredAt: true, location: true } },
      },
      orderBy: { collectionDate: 'desc' },
    });
    return samples.map(({ events, ...sample }) => ({ ...sample, lastEvent: events[0] ?? null }));
  }

  async custody(agentId: string, sampleId: string) {
    await this.requireOwnSample(agentId, sampleId);
    const sample = await this.prisma.sample.findUniqueOrThrow({
      where: { id: sampleId },
      include: CUSTODY_SAMPLE_INCLUDE,
    });

    const { events, ...rest } = sample;
    const find = (type: SampleEventType) => events.find((e) => e.type === type) ?? null;

    const steps = AGENT_CUSTODY_STEPS.map((type) => ({
      type,
      // L'équipe de vérification enregistre souvent l'entrée au laboratoire
      // d'un seul geste : elle vaut alors aussi pour « envoyé au laboratoire ».
      event: type === 'SENT_TO_LAB' ? find('SENT_TO_LAB') ?? find('IN_LABORATORY') : find(type),
    }));

    const located = events.filter((e) => e.latitude !== null && e.longitude !== null);
    const lastLocated = located[located.length - 1];
    const currentLocation = lastLocated
      ? {
          latitude: lastLocated.latitude!,
          longitude: lastLocated.longitude!,
          location: lastLocated.location,
          at: lastLocated.occurredAt,
        }
      : sample.latitude !== null && sample.longitude !== null
        ? { latitude: sample.latitude, longitude: sample.longitude, location: sample.location, at: sample.collectionDate }
        : null;

    return {
      ...rest,
      steps,
      events,
      issues: events.filter((e) => e.type === SampleEventType.ISSUE),
      currentLocation,
      route: located.map((e) => ({ latitude: e.latitude!, longitude: e.longitude!, type: e.type, at: e.occurredAt })),
      destination: KOUNOUZ_CENTER,
      allowedEvents: allowedAgentEvents(sample.status, events.map((e) => e.type)),
    };
  }

  async addEvent(agentId: string, sampleId: string, dto: AddCustodyEventDto) {
    const sample = await this.requireOwnSample(agentId, sampleId);
    const history = await this.prisma.sampleEvent.findMany({ where: { sampleId }, select: { type: true } });
    const allowed = allowedAgentEvents(sample.status, history.map((e) => e.type));

    if (!allowed.includes(dto.type)) {
      throw new BadRequestException(
        `L'événement « ${dto.type} » n'est pas possible sur un échantillon au statut « ${sample.status} ».`,
      );
    }
    if (dto.type === 'LOCATION_UPDATE' && dto.latitude === undefined && !dto.location) {
      throw new BadRequestException('Indiquez la position actuelle (GPS ou lieu).');
    }
    if (dto.type === 'ISSUE' && (!dto.note || dto.note.trim().length < 5)) {
      throw new BadRequestException("Décrivez l'anomalie constatée (5 caractères minimum).");
    }
    if (dto.latitude !== undefined && dto.longitude === undefined) {
      throw new BadRequestException('Latitude et longitude vont ensemble.');
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (occurredAt.getTime() > Date.now() + 5 * 60_000) {
      throw new BadRequestException("La date de l'événement ne peut pas être dans le futur.");
    }

    if (dto.type === 'ISSUE') {
      await this.prisma.sample.update({ where: { id: sampleId }, data: { issueReason: dto.note } });
    }

    await this.events.record(sampleId, SampleEventType[dto.type], agentId, {
      note: dto.note,
      evidenceUrl: dto.evidenceUrl,
      location: dto.location,
      latitude: dto.latitude,
      longitude: dto.longitude,
      handlerName: dto.handlerName,
      occurredAt,
    });
    await this.audit.log(agentId, `SAMPLE_EVENT_${dto.type}`, 'Sample', sampleId);

    return this.custody(agentId, sampleId);
  }

  // --- Rapports & recherche ----------------------------------------------

  async reports(agentId: string, months = 6) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const [assignments, samples] = await Promise.all([
      this.prisma.collectionAssignment.findMany({
        where: { agentId, scheduledDate: { gte: start } },
        select: {
          status: true,
          scheduledDate: true,
          startedAt: true,
          completedAt: true,
          rescheduleCount: true,
          request: { select: { governorate: true, collectionLocation: true } },
        },
      }),
      this.prisma.sample.findMany({
        where: { collectedById: agentId, collectionDate: { gte: start } },
        select: {
          status: true,
          collectionDate: true,
          quantity: true,
          honeyType: true,
          request: { select: { honeyType: true } },
          seal: { select: { id: true } },
        },
      }),
    ]);

    const monthKeys = Array.from({ length: months }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const completed = assignments.filter((a) => a.status === CollectionAssignmentStatus.COMPLETED);
    const durations = completed
      .filter((a) => a.startedAt && a.completedAt)
      .map((a) => (a.completedAt!.getTime() - a.startedAt!.getTime()) / 60_000);
    const onTime = completed.filter((a) => {
      const endOfDay = new Date(a.scheduledDate);
      endOfDay.setHours(23, 59, 59, 999);
      return a.completedAt! <= endOfDay && a.rescheduleCount === 0;
    });

    const countBy = <T>(items: T[], key: (item: T) => string | null | undefined) => {
      const map = new Map<string, number>();
      for (const item of items) {
        const k = key(item) || '—';
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return Array.from(map, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    return {
      period: { from: start, to: now, months },
      totals: {
        assignments: assignments.length,
        completed: completed.length,
        cancelled: assignments.filter((a) => a.status === CollectionAssignmentStatus.CANCELLED).length,
        rescheduled: assignments.filter((a) => a.rescheduleCount > 0).length,
        samples: samples.length,
        sealed: samples.filter((s) => s.seal).length,
        issues: samples.filter((s) => s.status === SampleStatus.ISSUE).length,
        quantityKg: Number(samples.reduce((acc, s) => acc + Number(s.quantity), 0).toFixed(3)),
        averageDurationMinutes: durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
        onTimeRate: completed.length ? Math.round((onTime.length / completed.length) * 100) : null,
      },
      monthly: monthKeys.map((month) => ({
        month,
        assignments: assignments.filter((a) => keyOf(a.scheduledDate) === month).length,
        completed: completed.filter((a) => keyOf(a.completedAt ?? a.scheduledDate) === month).length,
        samples: samples.filter((s) => keyOf(s.collectionDate) === month).length,
      })),
      byHoneyType: countBy(samples, (s) => s.honeyType ?? s.request.honeyType),
      bySampleStatus: countBy(samples, (s) => s.status),
      byRegion: countBy(assignments, (a) => a.request.governorate ?? a.request.collectionLocation),
    };
  }

  async search(agentId: string, q: string) {
    const search = q.trim();
    const contains = { contains: search, mode: 'insensitive' as const };
    const [assignments, samples] = await Promise.all([
      this.prisma.collectionAssignment.findMany({
        where: {
          agentId,
          OR: [
            { assignmentCode: contains },
            { request: { honeyType: contains } },
            { request: { collectionLocation: contains } },
            { request: { producer: { name: contains } } },
            { request: { producer: { farmName: contains } } },
          ],
        },
        select: {
          id: true,
          assignmentCode: true,
          status: true,
          scheduledDate: true,
          request: { select: { honeyType: true, collectionLocation: true, producer: { select: { name: true } } } },
        },
        orderBy: { scheduledDate: 'desc' },
        take: 6,
      }),
      this.prisma.sample.findMany({
        where: {
          collectedById: agentId,
          OR: [
            { sampleCode: contains },
            { seal: { sealCode: contains } },
            { honeyType: contains },
            { request: { producer: { name: contains } } },
          ],
        },
        select: {
          id: true,
          sampleCode: true,
          status: true,
          seal: { select: { sealCode: true } },
          request: { select: { honeyType: true, producer: { select: { name: true } } } },
        },
        orderBy: { collectionDate: 'desc' },
        take: 6,
      }),
    ]);
    return { assignments, samples };
  }

  // --- Côté équipe de vérification ---------------------------------------

  listAgents() {
    return this.prisma.user.findMany({
      where: { role: Role.FIELD_AGENT, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { collectionAssignments: { where: { status: { in: ACTIVE_STATUSES } } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  listForRequest(requestId: string) {
    return this.prisma.collectionAssignment.findMany({
      where: { requestId },
      include: { agent: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createByStaff(staffId: string, dto: CreateAssignmentDto) {
    const agent = await this.prisma.user.findUnique({ where: { id: dto.agentId } });
    if (!agent || agent.role !== Role.FIELD_AGENT || !agent.isActive) {
      throw new BadRequestException("L'utilisateur choisi n'est pas un agent terrain actif.");
    }
    const assignment = await this.createAssignmentRecord(dto.agentId, staffId, dto);
    await this.audit.log(staffId, 'CREATE_COLLECTION_ASSIGNMENT', 'CollectionAssignment', assignment.id);

    await this.notifications.notify(
      dto.agentId,
      NotificationType.COLLECTION_ASSIGNED,
      'Nouvelle mission de collecte',
      `${assignment.assignmentCode} — ${assignment.request.honeyType} chez ${assignment.request.producer.name}, le ${formatDay(assignment.scheduledDate)}${windowLabel(assignment)}.`,
      'CollectionAssignment',
      assignment.id,
    );
    return this.present(assignment);
  }

  async cancelByStaff(staffId: string, id: string) {
    const assignment = await this.prisma.collectionAssignment.findUnique({ where: { id } });
    if (!assignment) {
      throw new NotFoundException('Mission introuvable.');
    }
    if (!ACTIVE_STATUSES.includes(assignment.status) || assignment.sampleId) {
      throw new BadRequestException("Seule une mission active sans prélèvement peut être annulée.");
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.collectionAssignment.update({
        where: { id },
        data: { status: CollectionAssignmentStatus.CANCELLED },
        include: ASSIGNMENT_INCLUDE,
      }),
      this.prisma.verificationRequest.updateMany({
        where: { id: assignment.requestId, status: VerificationRequestStatus.COLLECTION_SCHEDULED },
        data: { status: VerificationRequestStatus.ACCEPTED },
      }),
    ]);
    await this.audit.log(staffId, 'CANCEL_COLLECTION_ASSIGNMENT', 'CollectionAssignment', id);
    return this.present(updated);
  }

  // --- Interne -----------------------------------------------------------

  private async createAssignmentRecord(
    agentId: string,
    createdById: string | null,
    dto: ClaimAssignmentDto & Partial<CreateAssignmentDto>,
  ) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: dto.requestId },
      include: {
        producer: true,
        samples: { select: { id: true } },
        assignments: { where: { status: { not: CollectionAssignmentStatus.CANCELLED } }, select: { id: true } },
      },
    });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (!SCHEDULABLE_REQUEST_STATUSES.includes(request.status)) {
      throw new BadRequestException('Seule une demande acceptée peut être planifiée pour une collecte.');
    }
    if (request.samples.length > 0 || request.assignments.length > 0) {
      throw new BadRequestException('Cette demande a déjà une mission de collecte ou un échantillon.');
    }
    assertWindow(dto.timeWindowStart, dto.timeWindowEnd);

    const assignment = await allocateYearCode(
      'CO',
      (prefix) => this.prisma.collectionAssignment.count({ where: { assignmentCode: { startsWith: prefix } } }),
      (assignmentCode) =>
        this.prisma.collectionAssignment.create({
          data: {
            assignmentCode,
            requestId: request.id,
            agentId,
            createdById,
            scheduledDate: new Date(dto.scheduledDate),
            timeWindowStart: dto.timeWindowStart,
            timeWindowEnd: dto.timeWindowEnd,
            priority: dto.priority,
            expectedQuantityGrams: dto.expectedQuantityGrams,
            numberOfSamples: dto.numberOfSamples,
            harvestSource: dto.harvestSource ?? 'PRODUCTION_HIVES',
            specialInstructions: dto.specialInstructions,
            notes: dto.notes,
          },
          include: ASSIGNMENT_INCLUDE,
        }),
    );

    await this.prisma.verificationRequest.update({
      where: { id: request.id },
      data: { status: VerificationRequestStatus.COLLECTION_SCHEDULED },
    });
    await this.audit.log(createdById ?? agentId, 'SCHEDULE_COLLECTION', 'CollectionAssignment', assignment.id, {
      previousStatus: request.status,
      newStatus: VerificationRequestStatus.COLLECTION_SCHEDULED,
    });
    await this.domainEvents.publish(EventType.COLLECTION_SCHEDULED, 'CollectionAssignment', assignment.id, {
      collectionMethod: 'KOUNOUZ_VISIT',
      assignmentCode: assignment.assignmentCode,
      requestId: request.id,
      requestCode: request.requestCode,
      agentId,
      scheduledDate: assignment.scheduledDate.toISOString(),
    });

    await this.notifications.notify(
      request.producer.userId,
      NotificationType.COLLECTION_ASSIGNED,
      'Visite de collecte programmée',
      `Un agent Kounouz passera prélever « ${request.honeyType} » le ${formatDay(assignment.scheduledDate)}${windowLabel(assignment)}.`,
      'VerificationRequest',
      request.id,
    );

    return assignment;
  }

  private async findAssignmentPresented(id: string) {
    const assignment = await this.prisma.collectionAssignment.findUniqueOrThrow({
      where: { id },
      include: ASSIGNMENT_INCLUDE,
    });
    return this.present(assignment);
  }

  private async requireAssignment(agentId: string, id: string) {
    const assignment = await this.prisma.collectionAssignment.findUnique({
      where: { id },
      include: ASSIGNMENT_INCLUDE,
    });
    if (!assignment) {
      throw new NotFoundException('Mission introuvable.');
    }
    if (assignment.agentId !== agentId) {
      throw new ForbiddenException("Cette mission est confiée à un autre agent.");
    }
    return assignment;
  }

  private async requireOwnSample(agentId: string, sampleId: string) {
    const sample = await this.prisma.sample.findUnique({ where: { id: sampleId }, include: { seal: true } });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.collectedById !== agentId) {
      throw new ForbiddenException("Vous n'avez pas accès à cet échantillon.");
    }
    return sample;
  }

  /** Ajoute les champs dérivés utiles à l'affichage (retard, coordonnées). */
  private present(assignment: AssignmentWithRelations, todayStart: Date = startOfToday()) {
    const { request } = assignment;
    const latitude = request.latitude ?? request.producer.latitude;
    const longitude = request.longitude ?? request.producer.longitude;
    return {
      ...assignment,
      coordinates: latitude !== null && longitude !== null ? { latitude, longitude } : null,
      isOverdue: assignment.status === CollectionAssignmentStatus.PENDING && assignment.scheduledDate < todayStart,
    };
  }
}

/** Transitions ouvertes à l'agent selon l'état de l'échantillon et son historique. */
export function allowedAgentEvents(status: SampleStatus, history: SampleEventType[]): string[] {
  const allowed: string[] = [];
  if (status === SampleStatus.SEALED) {
    if (!history.includes(SampleEventType.RELEASED_FOR_TRANSPORT)) allowed.push('RELEASED_FOR_TRANSPORT');
    allowed.push('IN_TRANSIT');
  }
  if (status === SampleStatus.IN_TRANSIT) allowed.push('LOCATION_UPDATE');
  if (([SampleStatus.COLLECTED, SampleStatus.SEALED, SampleStatus.IN_TRANSIT] as SampleStatus[]).includes(status)) {
    allowed.push('ISSUE');
  }
  return allowed;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayRange(range: DayRangeQueryDto) {
  const from = range.from ? new Date(range.from) : startOfToday();
  const to = range.to ? new Date(range.to) : new Date(from.getTime() + 24 * 60 * 60 * 1000);
  if (to <= from) {
    throw new BadRequestException('Période invalide.');
  }
  return { from, to };
}

function assertWindow(start?: string, end?: string) {
  if (start && end && start >= end) {
    throw new BadRequestException("L'heure de fin du créneau doit suivre l'heure de début.");
  }
}

function formatDay(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Africa/Tunis' });
}

function windowLabel(a: { timeWindowStart: string | null; timeWindowEnd: string | null }) {
  if (a.timeWindowStart && a.timeWindowEnd) return ` (${a.timeWindowStart}–${a.timeWindowEnd})`;
  if (a.timeWindowStart) return ` à partir de ${a.timeWindowStart}`;
  return '';
}
