import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ProducerStatus,
  Role,
  VerificationRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ProducerDocumentsService } from '../producer-documents/producer-documents.service.js';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto.js';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto.js';
import { RespondInfoRequestDto } from './dto/respond-info-request.dto.js';
import { FarmsService } from '../producers/farms.service.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

// Transitions ouvertes à l'endpoint générique de changement de statut.
// Au-delà de l'acceptation, l'avancement d'un dossier n'est plus piloté à la
// main : il découle des faits enregistrés (collecte, analyse, décision) par le
// portail de vérification. Ces statuts sont donc volontairement terminaux ici.
const ALLOWED_TRANSITIONS: Record<VerificationRequestStatus, VerificationRequestStatus[]> = {
  DRAFT: [],
  NEW: ['IN_REVIEW', 'INFO_REQUESTED', 'ACCEPTED', 'REJECTED'],
  IN_REVIEW: ['INFO_REQUESTED', 'ACCEPTED', 'REJECTED'],
  INFO_REQUESTED: ['IN_REVIEW', 'ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  COLLECTION_SCHEDULED: [],
  SAMPLE_COLLECTED: [],
  UNDER_ANALYSIS: [],
  VERIFICATION_PENDING: [],
  VERIFIED: [],
  NOT_VERIFIED: [],
  REJECTED: [],
};

const REQUEST_INCLUDE = {
  producer: true,
  farm: { select: { id: true, farmCode: true, name: true, governorate: true, delegation: true } },
  samples: { include: { seal: true, labAnalyses: { select: { id: true, status: true, analysisDate: true } } } },
  verifications: true,
} as const;

@Injectable()
export class VerificationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly documents: ProducerDocumentsService,
    private readonly farms: FarmsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /**
   * Rattache la demande à un rucher du producteur et complète, à partir de
   * lui, la localisation que le producteur n'a pas ressaisie.
   */
  private async withFarm(producerId: string, farmId: string | undefined, data: ReturnType<typeof this.toData>) {
    if (!farmId) return { ...data, farmId: undefined as string | undefined };
    const farm = await this.farms.requireUsableFarm(producerId, farmId);
    return {
      ...data,
      farmId: farm.id,
      governorate: data.governorate ?? farm.governorate ?? undefined,
      delegation: data.delegation ?? farm.delegation ?? undefined,
      latitude: data.latitude ?? farm.latitude ?? undefined,
      longitude: data.longitude ?? farm.longitude ?? undefined,
      hivesCount: data.hivesCount ?? farm.hivesCount ?? undefined,
      beekeepingMethod: data.beekeepingMethod ?? farm.beekeepingMethod ?? undefined,
      collectionLocation:
        data.collectionLocation ??
        ([farm.delegation, farm.governorate].filter(Boolean).join(', ') || farm.address || undefined),
    };
  }

  private async producerForUser(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }
    return producer;
  }

  private toData(dto: CreateVerificationRequestDto) {
    const location =
      dto.collectionLocation ??
      ([dto.delegation, dto.governorate].filter(Boolean).join(', ') || undefined);
    return {
      honeyType: dto.honeyType,
      description: dto.description,
      collectionLocation: location,
      quantity: dto.quantity,
      farmSize: dto.farmSize,
      floralOrigin: dto.floralOrigin,
      floralCategory: dto.floralCategory,
      productionSeason: dto.productionSeason,
      harvestStartDate: dto.harvestStartDate ? new Date(dto.harvestStartDate) : dto.harvestStartDate,
      harvestEndDate: dto.harvestEndDate ? new Date(dto.harvestEndDate) : dto.harvestEndDate,
      governorate: dto.governorate,
      delegation: dto.delegation,
      latitude: dto.latitude,
      longitude: dto.longitude,
      hivesCount: dto.hivesCount,
      beekeepingMethod: dto.beekeepingMethod,
      hiveType: dto.hiveType,
      preferredCollectionMethod: dto.preferredCollectionMethod,
    };
  }

  async create(userId: string, dto: CreateVerificationRequestDto) {
    const producer = await this.producerForUser(userId);
    const data = await this.withFarm(producer.id, dto.farmId, this.toData(dto));

    const request = await this.prisma.verificationRequest.create({
      data: {
        ...data,
        producerId: producer.id,
        honeyType: data.honeyType ?? '',
        collectionLocation: data.collectionLocation ?? '',
        quantity: data.quantity ?? 0,
        status: VerificationRequestStatus.DRAFT,
      },
    });

    await this.audit.log(userId, 'CREATE_VERIFICATION_REQUEST', 'VerificationRequest', request.id);

    if (dto.submit === false) {
      return request;
    }
    // Soumission directe : en cas de refus (champ ou document manquant), on ne
    // laisse pas de brouillon orphelin derrière la tentative.
    try {
      return await this.submitRequest(request.id, userId, producer.id, producer.status);
    } catch (err) {
      await this.prisma.verificationRequest.delete({ where: { id: request.id } });
      throw err;
    }
  }

  async updateDraft(id: string, userId: string, dto: CreateVerificationRequestDto) {
    const producer = await this.producerForUser(userId);
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request || request.producerId !== producer.id) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (request.status !== VerificationRequestStatus.DRAFT) {
      throw new BadRequestException('Seul un brouillon peut être modifié ; une demande soumise est gérée par Kounouz.');
    }

    const data = await this.withFarm(producer.id, dto.farmId, this.toData(dto));
    await this.prisma.verificationRequest.update({
      where: { id },
      data: Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined),
      ) as Prisma.VerificationRequestUpdateInput,
    });

    if (dto.submit) {
      return this.submitRequest(id, userId, producer.id, producer.status);
    }
    return this.prisma.verificationRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE });
  }

  async submitDraft(id: string, userId: string) {
    const producer = await this.producerForUser(userId);
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request || request.producerId !== producer.id) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    return this.submitRequest(id, userId, producer.id, producer.status);
  }

  async deleteDraft(id: string, userId: string) {
    const producer = await this.producerForUser(userId);
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request || request.producerId !== producer.id) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (request.status !== VerificationRequestStatus.DRAFT) {
      throw new BadRequestException('Une demande déjà soumise ne peut pas être supprimée.');
    }
    await this.prisma.verificationRequest.delete({ where: { id } });
    await this.audit.log(userId, 'DELETE_REQUEST_DRAFT', 'VerificationRequest', id);
  }

  private async submitRequest(id: string, userId: string, producerId: string, producerStatus: ProducerStatus) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (request.status !== VerificationRequestStatus.DRAFT) {
      throw new BadRequestException('Cette demande a déjà été soumise.');
    }
    if (producerStatus === ProducerStatus.SUSPENDED || producerStatus === ProducerStatus.REJECTED) {
      throw new ForbiddenException("Votre compte producteur ne permet pas de soumettre de demande. Contactez Kounouz.");
    }

    const missingFields: string[] = [];
    if (!request.honeyType.trim()) missingFields.push('honeyType');
    if (Number(request.quantity) <= 0) missingFields.push('quantity');
    if (!request.collectionLocation.trim()) missingFields.push('collectionLocation');
    if (!request.preferredCollectionMethod) missingFields.push('preferredCollectionMethod');
    if (missingFields.length > 0) {
      throw new BadRequestException(`Champs obligatoires manquants : ${missingFields.join(', ')}.`);
    }
    if (request.harvestStartDate && request.harvestEndDate && request.harvestEndDate < request.harvestStartDate) {
      throw new BadRequestException('La fin de récolte doit être postérieure au début de récolte.');
    }

    const missingDocuments = await this.documents.missingRequiredDocuments(producerId);
    if (missingDocuments.length > 0) {
      throw new BadRequestException(
        `Documents obligatoires manquants : ${missingDocuments.join(', ')}. Déposez-les dans "Mon profil > Documents".`,
      );
    }

    // ERD : toute demande soumise est rattachée à un rucher.
    if (!request.farmId) {
      const primary = await this.farms.primaryFarm(producerId);
      if (primary) {
        await this.prisma.verificationRequest.update({ where: { id }, data: { farmId: primary.id } });
      }
    }

    const now = new Date();
    const prefix = `VR-${now.getFullYear()}-`;
    // L'unicité en base protège contre une soumission concurrente : on retente
    // avec le numéro suivant en cas de collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.verificationRequest.count({ where: { requestCode: { startsWith: prefix } } });
      const requestCode = `${prefix}${String(count + 1 + attempt).padStart(3, '0')}`;
      try {
        const submitted = await this.prisma.verificationRequest.update({
          where: { id },
          data: { status: VerificationRequestStatus.NEW, requestCode, submittedAt: now },
          include: REQUEST_INCLUDE,
        });
        await this.audit.log(userId, 'SUBMIT_VERIFICATION_REQUEST', 'VerificationRequest', id, {
          previousStatus: VerificationRequestStatus.DRAFT,
          newStatus: VerificationRequestStatus.NEW,
        });
        // VR-A01 : la soumission crée le travail de revue (jamais d'échantillon).
        await this.domainEvents.publish(EventType.VERIFICATION_REQUEST_SUBMITTED, 'VerificationRequest', id, {
          requestCode,
          honeyType: submitted.honeyType,
          producerId,
        });
        return submitted;
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
          throw err;
        }
      }
    }
    throw new BadRequestException("Impossible d'attribuer un identifiant à la demande, veuillez réessayer.");
  }

  // Les brouillons restent privés au producteur.
  findAll(status?: VerificationRequestStatus) {
    return this.prisma.verificationRequest.findMany({
      where:
        status && status !== VerificationRequestStatus.DRAFT
          ? { status }
          : { status: { not: VerificationRequestStatus.DRAFT } },
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
    const producer = await this.producerForUser(userId);
    const requests = await this.prisma.verificationRequest.findMany({
      where: { producerId: producer.id },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return requests.map(forProducer);
  }

  /**
   * Réponse du producteur à une demande d'informations (MORE_INFO -> revue).
   *
   * VR-06 : seuls des champs appartenant au producteur sont modifiables ; la
   * réponse est versée au fil de la demande et le dossier repart en revue.
   */
  async respondToInfoRequest(id: string, userId: string, dto: RespondInfoRequestDto) {
    const producer = await this.producerForUser(userId);
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request || request.producerId !== producer.id) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (request.status !== VerificationRequestStatus.INFO_REQUESTED) {
      throw new BadRequestException("Kounouz n'attend pas d'information complémentaire sur cette demande.");
    }
    if (dto.farmId) {
      await this.farms.requireUsableFarm(producer.id, dto.farmId);
    }
    const harvestStart = dto.harvestStartDate ? new Date(dto.harvestStartDate) : request.harvestStartDate;
    const harvestEnd = dto.harvestEndDate ? new Date(dto.harvestEndDate) : request.harvestEndDate;
    if (harvestStart && harvestEnd && harvestEnd < harvestStart) {
      throw new BadRequestException('La fin de récolte doit être postérieure au début de récolte.');
    }

    const { message, photos, ...fields } = dto;
    await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id },
        data: {
          ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
          harvestStartDate: harvestStart,
          harvestEndDate: harvestEnd,
          ...(photos?.length ? { photos: [...request.photos, ...photos] } : {}),
          status: VerificationRequestStatus.IN_REVIEW,
        },
      }),
      this.prisma.requestComment.create({
        data: { requestId: id, authorId: userId, body: `Réponse du producteur : ${message.trim()}` },
      }),
    ]);

    await this.audit.log(userId, 'RESPOND_INFO_REQUEST', 'VerificationRequest', id, {
      previousStatus: VerificationRequestStatus.INFO_REQUESTED,
      newStatus: VerificationRequestStatus.IN_REVIEW,
    });
    await this.domainEvents.publish(EventType.VERIFICATION_REQUEST_INFO_PROVIDED, 'VerificationRequest', id, {
      requestCode: request.requestCode,
    });
    return this.findOneForUser(id, { sub: userId, role: Role.PRODUCER } as JwtPayload);
  }

  async findOneForUser(id: string, user: JwtPayload) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }

    // Défense en profondeur : le garde de route exclut déjà CONSUMER, on le
    // revérifie ici car le service est aussi appelé par d'autres chemins.
    if (user.role === Role.CONSUMER) {
      throw new ForbiddenException('Accès réservé aux comptes Kounouz et au producteur concerné.');
    }

    if (user.role === Role.PRODUCER && request.producer.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à cette demande.");
    }
    if (user.role !== Role.PRODUCER && request.status === VerificationRequestStatus.DRAFT) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }

    // Notes internes Kounouz : jamais transmises au producteur.
    return user.role === Role.PRODUCER ? forProducer(request) : request;
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

/** Vue producteur d'une demande : sans les notes internes de Kounouz. */
function forProducer<T extends { internalNotes: string | null }>(request: T): Omit<T, 'internalNotes'> {
  const { internalNotes: _internal, ...visible } = request;
  return visible;
}
