import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role, VerificationRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto.js';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

const ALLOWED_TRANSITIONS: Record<VerificationRequestStatus, VerificationRequestStatus[]> = {
  NEW: ['IN_REVIEW', 'ACCEPTED', 'REJECTED'],
  IN_REVIEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
};

const REQUEST_INCLUDE = {
  producer: true,
  samples: true,
  verifications: true,
} as const;

@Injectable()
export class VerificationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateVerificationRequestDto) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }

    const request = await this.prisma.verificationRequest.create({
      data: {
        producerId: producer.id,
        honeyType: dto.honeyType,
        description: dto.description,
        collectionLocation: dto.collectionLocation,
        quantity: dto.quantity,
        status: VerificationRequestStatus.NEW,
      },
    });

    await this.audit.log(userId, 'CREATE_VERIFICATION_REQUEST', 'VerificationRequest', request.id);
    return request;
  }

  findAll(status?: VerificationRequestStatus) {
    return this.prisma.verificationRequest.findMany({
      where: status ? { status } : undefined,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Portail Agent Terrain : demandes acceptées mais dont l'échantillon n'a pas
  // encore été collecté — le cahier des charges parle de "collectes assignées"
  // mais le schéma ne modélise pas d'affectation nominative ; ce pool partagé
  // est donc visible par tous les agents terrain.
  findPendingCollection() {
    return this.prisma.verificationRequest.findMany({
      where: { status: VerificationRequestStatus.ACCEPTED, samples: { none: {} } },
      include: { producer: true },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async findMine(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }
    return this.prisma.verificationRequest.findMany({
      where: { producerId: producer.id },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(id: string, user: JwtPayload) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }

    if (user.role === Role.PRODUCER && request.producer.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    }

    return request;
  }

  async updateStatus(id: string, userId: string, dto: UpdateRequestStatusDto) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { producer: true },
    });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }

    const allowed = ALLOWED_TRANSITIONS[request.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Impossible de passer une demande "${request.status}" à "${dto.status}".`,
      );
    }

    const updated = await this.prisma.verificationRequest.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.audit.log(userId, `REQUEST_${dto.status}`, 'VerificationRequest', id);

    if (dto.status === VerificationRequestStatus.ACCEPTED) {
      await this.notifications.notify(
        request.producer.userId,
        NotificationType.REQUEST_ACCEPTED,
        'Demande acceptée',
        `Votre demande de vérification pour "${request.honeyType}" a été acceptée.`,
        'VerificationRequest',
        request.id,
      );
      await this.notifications.notifyRole(
        Role.FIELD_AGENT,
        NotificationType.COLLECTION_AVAILABLE,
        'Nouvelle collecte disponible',
        `Une collecte est disponible pour "${request.honeyType}" (${request.collectionLocation}).`,
        'VerificationRequest',
        request.id,
      );
    }

    return updated;
  }
}
