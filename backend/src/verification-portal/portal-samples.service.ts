import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReferenceSampleStatus,
  SampleEventType,
  SampleStatus,
  VerificationRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { SampleEventsService } from './sample-events.service.js';
import { ListSamplesQueryDto, SampleTab } from './dto/list-samples-query.dto.js';
import { RegisterSampleDto } from './dto/register-sample.dto.js';
import { FlagSampleIssueDto } from './dto/flag-sample-issue.dto.js';
import { RegisterReferenceSampleDto, UpdateReferenceSampleStatusDto } from './dto/reference-sample.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

// Les six compteurs du tableau de bord échantillons. « Collected » agrège tout
// ce qui est parti du rucher sans être encore arrivé chez Kounouz : pour le
// vérificateur, scellé et en transit sont des sous-étapes de la collecte.
export const SAMPLE_TAB_STATUSES: Record<Exclude<SampleTab, 'ALL'>, SampleStatus[]> = {
  COLLECTED: [SampleStatus.COLLECTED, SampleStatus.SEALED, SampleStatus.IN_TRANSIT],
  RECEIVED: [SampleStatus.RECEIVED],
  IN_LABORATORY: [SampleStatus.RECEIVED_AT_LAB],
  COMPLETED: [SampleStatus.ANALYZED],
  ISSUES: [SampleStatus.ISSUE],
};

const LIST_SELECT = {
  id: true,
  sampleCode: true,
  status: true,
  collectionDate: true,
  collectionMethod: true,
  location: true,
  quantity: true,
  photos: true,
  issueReason: true,
  createdAt: true,
  request: {
    select: {
      id: true,
      requestCode: true,
      honeyType: true,
      batchNumber: true,
      governorate: true,
      producer: { select: { id: true, name: true, farmName: true } },
    },
  },
  collectedBy: { select: { id: true, name: true } },
  seal: { select: { id: true, sealCode: true, status: true, sealedAt: true } },
  labAnalyses: { select: { id: true, status: true, workflowStatus: true } },
} as const;

const DETAIL_INCLUDE = {
  request: { include: { producer: true } },
  collectedBy: { select: { id: true, name: true, email: true, role: true } },
  seal: true,
  referenceSample: true,
  labAnalyses: {
    include: {
      laboratory: true,
      assignedTo: { select: { id: true, name: true } },
      testResults: { orderBy: { position: 'asc' } },
      files: { include: { uploadedBy: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  },
  verifications: {
    include: { decidedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  },
} as const;

@Injectable()
export class PortalSamplesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly events: SampleEventsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  // --- Liste & compteurs -------------------------------------------------

  private whereFor(query: ListSamplesQueryDto): Prisma.SampleWhereInput {
    const where: Prisma.SampleWhereInput = {};

    if (query.tab && query.tab !== 'ALL') {
      where.status = { in: SAMPLE_TAB_STATUSES[query.tab] };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.from || query.to) {
      where.collectionDate = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { sampleCode: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { request: { requestCode: { contains: search, mode: 'insensitive' } } },
        { request: { batchNumber: { contains: search, mode: 'insensitive' } } },
        { request: { honeyType: { contains: search, mode: 'insensitive' } } },
        { request: { producer: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    return where;
  }

  async list(query: ListSamplesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const where = this.whereFor(query);

    const [items, total, stats] = await Promise.all([
      this.prisma.sample.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { collectionDate: query.sort === 'OLDEST' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sample.count({ where }),
      this.stats(),
    ]);

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) || 1, stats };
  }

  async stats() {
    const grouped = await this.prisma.sample.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<
      SampleStatus,
      number
    >;
    const total = grouped.reduce((acc, g) => acc + g._count._all, 0);
    const sum = (statuses: SampleStatus[]) => statuses.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0);

    const counts = {
      ALL: total,
      COLLECTED: sum(SAMPLE_TAB_STATUSES.COLLECTED),
      RECEIVED: sum(SAMPLE_TAB_STATUSES.RECEIVED),
      IN_LABORATORY: sum(SAMPLE_TAB_STATUSES.IN_LABORATORY),
      COMPLETED: sum(SAMPLE_TAB_STATUSES.COMPLETED),
      ISSUES: sum(SAMPLE_TAB_STATUSES.ISSUES),
    };

    // Part de chaque étape, arrondie à l'entier — c'est le pourcentage affiché
    // sous chaque compteur. Sur un parc vide, tout est à 0 plutôt que NaN.
    const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

    return {
      counts,
      percentages: {
        COLLECTED: share(counts.COLLECTED),
        RECEIVED: share(counts.RECEIVED),
        IN_LABORATORY: share(counts.IN_LABORATORY),
        COMPLETED: share(counts.COMPLETED),
        ISSUES: share(counts.ISSUES),
      },
      byStatus,
    };
  }

  // --- Détail ------------------------------------------------------------

  async findOne(id: string) {
    const sample = await this.prisma.sample.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    const timeline = await this.events.timeline(id);
    return { ...sample, timeline };
  }

  // --- Enregistrement ----------------------------------------------------

  /**
   * Enregistre un échantillon côté Kounouz (option B du cahier des charges :
   * le producteur apporte lui-même l'échantillon). L'option A passe par le
   * portail Agent Terrain, qui alimente la même table.
   */
  async register(userId: string, dto: RegisterSampleDto) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: dto.requestId },
      include: { producer: true },
    });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (!ACCEPTS_COLLECTION.includes(request.status)) {
      throw new BadRequestException(
        "Seule une demande acceptée peut recevoir un échantillon. Traitez d'abord la revue du dossier.",
      );
    }

    const sample = await allocateYearCode(
      'SM',
      (prefix) => this.prisma.sample.count({ where: { sampleCode: { startsWith: prefix } } }),
      (sampleCode) =>
        this.prisma.sample.create({
          data: {
            sampleCode,
            requestId: dto.requestId,
            collectedById: userId,
            collectionDate: new Date(dto.collectionDate),
            collectionMethod: dto.collectionMethod,
            location: dto.location ?? request.collectionLocation,
            quantity: dto.quantity,
            photos: dto.photos ?? [],
            status: SampleStatus.COLLECTED,
          },
        }),
    );

    await this.events.record(sample.id, SampleEventType.REGISTERED, userId, {
      note: dto.notes,
      occurredAt: sample.createdAt,
    });
    await this.events.record(sample.id, SampleEventType.COLLECTED, userId, {
      occurredAt: new Date(dto.collectionDate),
    });

    await this.prisma.verificationRequest.update({
      where: { id: dto.requestId },
      data: { status: VerificationRequestStatus.SAMPLE_COLLECTED },
    });

    await this.audit.log(userId, 'REGISTER_SAMPLE', 'Sample', sample.id);
    return this.findOne(sample.id);
  }

  // --- Transitions -------------------------------------------------------

  /** Réception physique de l'échantillon dans les locaux Kounouz. */
  async markReceived(id: string, userId: string, note?: string) {
    const sample = await this.requireSample(id, [
      SampleStatus.COLLECTED,
      SampleStatus.SEALED,
      SampleStatus.IN_TRANSIT,
    ]);

    await this.events.record(id, SampleEventType.RECEIVED, userId, { note });
    await this.audit.log(userId, 'SAMPLE_RECEIVED_AT_KOUNOUZ', 'Sample', id);

    await this.notifications.notify(
      sample.request.producer.userId,
      NotificationType.SAMPLE_RECEIVED,
      'Échantillon reçu',
      `Votre échantillon « ${sample.request.honeyType} » a bien été réceptionné par Kounouz.`,
      'Sample',
      id,
    );

    return this.findOne(id);
  }

  /**
   * Appose le scellé Kounouz.
   *
   * Dans le scénario « apport du producteur » (§2, option B), aucun agent
   * terrain n'intervient : c'est l'équipe de vérification qui scelle à la
   * réception. Le scellé reste immuable une fois posé.
   */
  async applySeal(id: string, userId: string) {
    const sample = await this.prisma.sample.findUnique({
      where: { id },
      include: { seal: true },
    });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.seal) {
      throw new BadRequestException('Un scellé existe déjà pour cet échantillon.');
    }
    if (!SEALABLE_STATUSES.includes(sample.status)) {
      throw new BadRequestException(
        `Un échantillon au statut « ${sample.status} » ne peut plus être scellé.`,
      );
    }

    const seal = await allocateYearCode(
      'KZ-SEL',
      (prefix) => this.prisma.seal.count({ where: { sealCode: { startsWith: prefix } } }),
      (sealCode) => this.prisma.seal.create({ data: { sampleId: id, sealCode } }),
      { width: 6 },
    );

    // Le scellé trace la pose sans faire reculer un échantillon déjà
    // réceptionné : l'événement est enregistré, le statut reste le plus avancé.
    const sealEvent = await this.prisma.sampleEvent.create({
      data: { sampleId: id, type: SampleEventType.SEALED, userId, note: seal.sealCode },
    });
    if (sample.status === SampleStatus.COLLECTED) {
      await this.prisma.sample.update({ where: { id }, data: { status: SampleStatus.SEALED } });
    }

    await this.audit.log(userId, 'APPLY_SEAL', 'Seal', seal.id, { newStatus: 'SEALED' });
    await this.events.announce(id, SampleEventType.SEALED, sealEvent.id);
    return this.findOne(id);
  }

  /**
   * Enregistre l'échantillon de référence conservé par Kounouz (REF-01/02).
   *
   * Seul un échantillon contrôlé — scellé et sans anomalie — peut fournir une
   * portion de référence. Cette pièce est exigée avant toute décision VÉRIFIÉ
   * et reste strictement interne (REF-03).
   */
  async registerReferenceSample(id: string, userId: string, dto: RegisterReferenceSampleDto) {
    const sample = await this.prisma.sample.findUnique({
      where: { id },
      include: { seal: true, referenceSample: true },
    });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.status === SampleStatus.ISSUE) {
      throw new BadRequestException('Échantillon en anomalie : aucune portion de référence ne peut être enregistrée.');
    }
    if (!sample.seal) {
      throw new BadRequestException(
        "L'échantillon doit porter un scellé Kounouz avant l'enregistrement de sa portion de référence.",
      );
    }
    if (sample.referenceSample) {
      throw new BadRequestException(
        `Un échantillon de référence (${sample.referenceSample.referenceCode}) est déjà enregistré.`,
      );
    }

    const reference = await allocateYearCode(
      'KZ-REF',
      (prefix) => this.prisma.referenceSample.count({ where: { referenceCode: { startsWith: prefix } } }),
      (referenceCode) =>
        this.prisma.referenceSample.create({
          data: {
            sampleId: id,
            referenceCode,
            storageLocation: dto.storageLocation.trim(),
            storageConditions: dto.storageConditions.trim(),
            retentionPeriod: dto.retentionPeriod.trim(),
            condition: dto.condition?.trim() || null,
            storedById: userId,
            status: ReferenceSampleStatus.STORED,
          },
        }),
      { width: 6 },
    );

    await this.audit.log(userId, 'STORE_REFERENCE_SAMPLE', 'ReferenceSample', reference.id, {
      newStatus: ReferenceSampleStatus.STORED,
      details: `${reference.referenceCode} — ${reference.storageLocation}`,
    });
    await this.domainEvents.publish(EventType.REFERENCE_SAMPLE_REGISTERED, 'ReferenceSample', reference.id, {
      referenceCode: reference.referenceCode,
      sampleId: id,
      sampleCode: sample.sampleCode,
    });
    return this.findOne(id);
  }

  /**
   * Change l'état de la portion conservée (REF-04) : contre-analyse ou
   * destruction en fin de conservation. Toujours motivé et journalisé ; une
   * portion détruite ne revient jamais en conservation.
   */
  async updateReferenceSampleStatus(id: string, userId: string, dto: UpdateReferenceSampleStatusDto) {
    const reference = await this.prisma.referenceSample.findUnique({ where: { sampleId: id } });
    if (!reference) {
      throw new NotFoundException("Aucun échantillon de référence n'est enregistré pour cet échantillon.");
    }
    const allowed = REFERENCE_TRANSITIONS[reference.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition impossible : ${reference.status} -> ${dto.status}.`,
      );
    }

    await this.prisma.referenceSample.update({ where: { id: reference.id }, data: { status: dto.status } });
    await this.audit.log(userId, 'UPDATE_REFERENCE_SAMPLE_STATUS', 'ReferenceSample', reference.id, {
      previousStatus: reference.status,
      newStatus: dto.status,
      reason: dto.reason.trim(),
    });
    return this.findOne(id);
  }

  /** Transmission au laboratoire : ouvre la phase d'analyse. */
  async moveToLaboratory(id: string, userId: string, note?: string) {
    const sample = await this.requireSample(id, [SampleStatus.RECEIVED]);
    if (!sample.seal) {
      throw new BadRequestException(
        "L'échantillon doit porter un scellé Kounouz avant d'être confié au laboratoire.",
      );
    }

    await this.events.record(id, SampleEventType.IN_LABORATORY, userId, { note });
    await this.prisma.verificationRequest.update({
      where: { id: sample.requestId },
      data: { status: VerificationRequestStatus.UNDER_ANALYSIS },
    });
    await this.audit.log(userId, 'SAMPLE_SENT_TO_LAB', 'Sample', id);

    return this.findOne(id);
  }

  /**
   * Signale une anomalie (scellé compromis, volume insuffisant, rupture de
   * chaîne du froid...). Le dossier est gelé : c'est un humain, pas le
   * système, qui décidera de la suite (§9).
   */
  async flagIssue(id: string, userId: string, dto: FlagSampleIssueDto) {
    const sample = await this.prisma.sample.findUnique({ where: { id } });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.status === SampleStatus.ISSUE) {
      throw new BadRequestException('Cet échantillon est déjà signalé en anomalie.');
    }

    await this.prisma.sample.update({ where: { id }, data: { issueReason: dto.reason } });
    await this.events.record(id, SampleEventType.ISSUE, userId, { note: dto.reason });
    await this.audit.log(userId, 'SAMPLE_ISSUE_FLAGGED', 'Sample', id);

    return this.findOne(id);
  }

  private async requireSample(id: string, allowedStatuses: SampleStatus[]) {
    const sample = await this.prisma.sample.findUnique({
      where: { id },
      include: { seal: true, request: { include: { producer: true } } },
    });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (!allowedStatuses.includes(sample.status)) {
      throw new BadRequestException(
        `Cette action n'est pas possible sur un échantillon au statut « ${sample.status} ».`,
      );
    }
    return sample;
  }
}

// Cycle de vie de la portion de référence : une portion détruite est
// définitivement sortie de la conservation.
const REFERENCE_TRANSITIONS: Partial<Record<ReferenceSampleStatus, ReferenceSampleStatus[]>> = {
  [ReferenceSampleStatus.STORED]: [ReferenceSampleStatus.USED_FOR_RETEST, ReferenceSampleStatus.DISPOSED],
  [ReferenceSampleStatus.USED_FOR_RETEST]: [ReferenceSampleStatus.STORED, ReferenceSampleStatus.DISPOSED],
};

// Le scellé se pose à la collecte ou à la réception, jamais après le départ
// vers le laboratoire.
const SEALABLE_STATUSES: SampleStatus[] = [SampleStatus.COLLECTED, SampleStatus.RECEIVED];

const ACCEPTS_COLLECTION: VerificationRequestStatus[] = [
  VerificationRequestStatus.ACCEPTED,
  VerificationRequestStatus.COLLECTION_SCHEDULED,
];
