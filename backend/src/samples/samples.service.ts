import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CollectionAssignmentStatus,
  NotificationType,
  Role,
  SampleEventType,
  SampleStatus,
  VerificationRequestStatus,
} from '@prisma/client';
import { SampleEventsService } from '../verification-portal/sample-events.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateSampleDto } from './dto/create-sample.dto.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

const SAMPLE_INCLUDE = {
  request: { include: { producer: true } },
  collectedBy: { select: { id: true, name: true, email: true } },
  seal: true,
  labAnalyses: true,
  referenceSample: true,
} as const;

@Injectable()
export class SamplesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly custody: SampleEventsService,
  ) {}

  async create(userId: string, dto: CreateSampleDto) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: dto.requestId } });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (
      request.status !== VerificationRequestStatus.ACCEPTED &&
      request.status !== VerificationRequestStatus.COLLECTION_SCHEDULED
    ) {
      throw new BadRequestException(
        "La collecte ne peut être enregistrée que pour une demande acceptée.",
      );
    }
    // SM-03 : seul l'agent à qui la mission est confiée peut collecter.
    const assignment = await this.prisma.collectionAssignment.findFirst({
      where: {
        requestId: request.id,
        agentId: userId,
        sampleId: null,
        status: { in: [CollectionAssignmentStatus.PENDING, CollectionAssignmentStatus.IN_PROGRESS] },
      },
    });
    if (!assignment) {
      throw new ForbiddenException(
        "Aucune mission de collecte ne vous est assignée pour cette demande.",
      );
    }

    const sample = await this.prisma.sample.create({
      data: {
        requestId: dto.requestId,
        collectedById: userId,
        collectionDate: new Date(dto.collectionDate),
        location: dto.location,
        quantity: dto.quantity,
        photos: dto.photos ?? [],
        status: SampleStatus.COLLECTED,
      },
      include: SAMPLE_INCLUDE,
    });

    await this.prisma.collectionAssignment.update({
      where: { id: assignment.id },
      data: { sampleId: sample.id, status: CollectionAssignmentStatus.IN_PROGRESS, startedAt: assignment.startedAt ?? new Date() },
    });
    // COC-02 : la création est la première trace de la chaîne de possession.
    await this.custody.record(sample.id, SampleEventType.REGISTERED, userId, { location: dto.location });
    await this.custody.record(sample.id, SampleEventType.COLLECTED, userId, { location: dto.location });
    await this.audit.log(userId, 'CREATE_SAMPLE', 'Sample', sample.id, { newStatus: SampleStatus.COLLECTED });
    return sample;
  }

  findAll() {
    return this.prisma.sample.findMany({ include: SAMPLE_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  findMine(userId: string) {
    return this.prisma.sample.findMany({
      where: { collectedById: userId },
      include: SAMPLE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Le producteur suit la collecte et la chaîne de possession de ses
  // échantillons, sans voir l'échantillon de référence ni les résultats
  // détaillés (données internes Kounouz).
  async findForProducer(userId: string) {
    const samples = await this.prisma.sample.findMany({
      where: { request: { producer: { userId } } },
      select: {
        id: true,
        requestId: true,
        collectionDate: true,
        location: true,
        quantity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        request: { select: { id: true, requestCode: true, honeyType: true, preferredCollectionMethod: true } },
        collectedBy: { select: { name: true } },
        seal: { select: { id: true, sealCode: true, status: true, sealedAt: true } },
        labAnalyses: {
          select: { id: true, status: true, analysisDate: true, laboratory: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        verifications: { select: { status: true, verifiedAt: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const entityIds = samples.flatMap((s) => [s.id, ...(s.seal ? [s.seal.id] : [])]);
    const events = entityIds.length
      ? await this.prisma.auditLog.findMany({
          where: { entiteId: { in: entityIds } },
          select: { action: true, entiteId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    return samples.map((sample) => ({
      ...sample,
      custodyEvents: events
        .filter((e) => e.entiteId === sample.id || e.entiteId === sample.seal?.id)
        .map((e) => ({ action: e.action, createdAt: e.createdAt })),
    }));
  }

  async findOneForUser(id: string, user: JwtPayload) {
    const sample = await this.prisma.sample.findUnique({ where: { id }, include: SAMPLE_INCLUDE });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }

    // Défense en profondeur : le garde de route exclut déjà CONSUMER, on le
    // revérifie ici car le service est aussi appelé par d'autres chemins.
    if (user.role === Role.CONSUMER) {
      throw new ForbiddenException('Accès réservé aux comptes Kounouz et au producteur concerné.');
    }

    if (user.role === Role.FIELD_AGENT && sample.collectedById !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à cet échantillon.");
    }
    if (user.role === Role.PRODUCER && sample.request.producer.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à cet échantillon.");
    }

    return sample;
  }

  async markInTransit(id: string, userId: string) {
    const sample = await this.prisma.sample.findUnique({ where: { id }, include: { seal: true } });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.collectedById !== userId) {
      throw new ForbiddenException("Seul l'agent ayant collecté cet échantillon peut le transporter.");
    }
    if (sample.status !== SampleStatus.SEALED || !sample.seal) {
      throw new BadRequestException("L'échantillon doit être scellé avant le transport.");
    }

    await this.custody.record(id, SampleEventType.IN_TRANSIT, userId);
    await this.audit.log(userId, 'SAMPLE_IN_TRANSIT', 'Sample', id, {
      previousStatus: SampleStatus.SEALED,
      newStatus: SampleStatus.IN_TRANSIT,
    });
    return this.prisma.sample.findUniqueOrThrow({ where: { id }, include: SAMPLE_INCLUDE });
  }

  async markReceived(id: string, userId: string) {
    const sample = await this.prisma.sample.findUnique({
      where: { id },
      include: { request: { include: { producer: true } } },
    });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.status !== SampleStatus.IN_TRANSIT) {
      throw new BadRequestException("L'échantillon doit être en transit avant réception au laboratoire.");
    }

    await this.custody.record(id, SampleEventType.RECEIVED, userId);
    await this.custody.record(id, SampleEventType.SENT_TO_LAB, userId);
    const updated = await this.prisma.sample.findUniqueOrThrow({ where: { id }, include: SAMPLE_INCLUDE });
    await this.audit.log(userId, 'SAMPLE_RECEIVED_AT_LAB', 'Sample', id, {
      previousStatus: SampleStatus.IN_TRANSIT,
      newStatus: SampleStatus.RECEIVED_AT_LAB,
    });

    const recipientIds = new Set([sample.request.producer.userId, sample.collectedById]);
    await this.notifications.notifyMany(
      Array.from(recipientIds),
      NotificationType.SAMPLE_RECEIVED,
      'Échantillon reçu au laboratoire',
      `L'échantillon de "${sample.request.honeyType}" est arrivé au laboratoire.`,
      'Sample',
      sample.id,
    );

    return updated;
  }
}
