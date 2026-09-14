import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role, SampleStatus, VerificationRequestStatus } from '@prisma/client';
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
  ) {}

  async create(userId: string, dto: CreateSampleDto) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: dto.requestId } });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (request.status !== VerificationRequestStatus.ACCEPTED) {
      throw new BadRequestException(
        "La collecte ne peut être enregistrée que pour une demande acceptée.",
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

    await this.audit.log(userId, 'CREATE_SAMPLE', 'Sample', sample.id);
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

  async findOneForUser(id: string, user: JwtPayload) {
    const sample = await this.prisma.sample.findUnique({ where: { id }, include: SAMPLE_INCLUDE });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
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

    const updated = await this.prisma.sample.update({
      where: { id },
      data: { status: SampleStatus.IN_TRANSIT },
      include: SAMPLE_INCLUDE,
    });
    await this.audit.log(userId, 'SAMPLE_IN_TRANSIT', 'Sample', id);
    return updated;
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

    const updated = await this.prisma.sample.update({
      where: { id },
      data: { status: SampleStatus.RECEIVED_AT_LAB },
      include: SAMPLE_INCLUDE,
    });
    await this.audit.log(userId, 'SAMPLE_RECEIVED_AT_LAB', 'Sample', id);

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
