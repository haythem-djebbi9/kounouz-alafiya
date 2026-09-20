import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LabAnalysisStatus,
  NotificationType,
  Role,
  VerificationRequestStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateVerificationDto } from './dto/create-verification.dto.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';
import { evidenceChecklist, missingEvidenceFor } from '../verification-portal/evidence.js';

const VERIFICATION_INCLUDE = {
  request: { include: { producer: true } },
  sample: true,
  analysis: true,
  decidedBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /**
   * Décision de vérification (ancienne route, conservée pour la console
   * admin). Elle applique exactement les mêmes garde-fous que le portail
   * vérificateur : aucun chemin d'API ne permet de contourner VER-02.
   */
  async create(userId: string, dto: CreateVerificationDto) {
    const [request, sample, analysis] = await Promise.all([
      this.prisma.verificationRequest.findUnique({ where: { id: dto.requestId }, include: { producer: true } }),
      this.prisma.sample.findUnique({ where: { id: dto.sampleId }, include: { seal: true, referenceSample: true } }),
      this.prisma.laboratoryAnalysis.findUnique({ where: { id: dto.analysisId } }),
    ]);

    if (!request) throw new NotFoundException('Demande de vérification introuvable.');
    if (!sample) throw new NotFoundException('Échantillon introuvable.');
    if (!analysis) throw new NotFoundException('Analyse de laboratoire introuvable.');

    if (sample.requestId !== request.id) {
      throw new BadRequestException("Cet échantillon n'appartient pas à cette demande.");
    }
    if (analysis.sampleId !== sample.id) {
      throw new BadRequestException("Cette analyse ne correspond pas à cet échantillon.");
    }
    if (dto.status === VerificationStatus.VERIFIED && analysis.status !== LabAnalysisStatus.COMPLIANT) {
      throw new BadRequestException(
        "Impossible de vérifier un lot dont l'analyse de laboratoire n'est pas conforme.",
      );
    }
    if (dto.status !== VerificationStatus.VERIFIED && !dto.notes?.trim()) {
      throw new BadRequestException('Un commentaire est obligatoire pour un refus ou une contre-analyse.');
    }

    const missing = missingEvidenceFor(dto.status, evidenceChecklist({ sample, analysis }));
    if (missing.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'MISSING_EVIDENCE',
        message: `Décision impossible, pièces manquantes : ${missing.map((m) => m.detail).join(' ')}`,
        missing: missing.map((m) => m.key),
      });
    }

    // VER-07 : une décision prononcée n'est jamais remplacée silencieusement.
    // Une réévaluation passe par une analyse complémentaire (nouveau bulletin).
    const alreadyDecided = await this.prisma.verification.findFirst({
      where: {
        analysisId: dto.analysisId,
        isDraft: false,
        status: { in: [VerificationStatus.VERIFIED, VerificationStatus.NOT_VERIFIED] },
      },
      select: { verificationCode: true, status: true },
    });
    if (alreadyDecided) {
      throw new BadRequestException(
        `Ce bulletin a déjà fait l'objet d'une décision (${alreadyDecided.verificationCode ?? alreadyDecided.status}).`,
      );
    }

    const verification = await allocateYearCode(
      'VT',
      (prefix) => this.prisma.verification.count({ where: { verificationCode: { startsWith: prefix } } }),
      (verificationCode) =>
        this.prisma.verification.create({
          data: {
            verificationCode,
            requestId: dto.requestId,
            sampleId: dto.sampleId,
            analysisId: dto.analysisId,
            status: dto.status,
            notes: dto.notes,
            verifiedAt: new Date(),
            decidedById: userId,
          },
          include: VERIFICATION_INCLUDE,
        }),
    );

    await this.prisma.verificationRequest.update({
      where: { id: request.id },
      data: { status: REQUEST_STATUS_AFTER[dto.status] },
    });

    await this.audit.log(userId, `VERIFICATION_${dto.status}`, 'Verification', verification.id, {
      previousStatus: VerificationStatus.PENDING,
      newStatus: dto.status,
      reason: dto.notes?.trim() || null,
      metadata: {
        verificationCode: verification.verificationCode,
        analysisId: dto.analysisId,
        sampleId: dto.sampleId,
        sealCode: sample.seal?.sealCode ?? null,
        referenceCode: sample.referenceSample?.referenceCode ?? null,
      },
    });
    await this.domainEvents.publish(EventType.VERIFICATION_COMPLETED, 'Verification', verification.id, {
      status: dto.status,
      verificationCode: verification.verificationCode,
      requestId: dto.requestId,
      sampleId: dto.sampleId,
    });

    const isVerified = dto.status === VerificationStatus.VERIFIED;
    await this.notifications.notify(
      request.producer.userId,
      NotificationType.VERIFICATION_RESULT,
      isVerified ? 'Vérification réussie' : 'Vérification non concluante',
      isVerified
        ? `Votre demande "${request.honeyType}" a été vérifiée avec succès.`
        : `Votre demande "${request.honeyType}" n'a pas été vérifiée.`,
      'Verification',
      verification.id,
    );

    return verification;
  }

  findAll() {
    return this.prisma.verification.findMany({
      include: VERIFICATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(id: string, user: JwtPayload) {
    const verification = await this.prisma.verification.findUnique({
      where: { id },
      include: VERIFICATION_INCLUDE,
    });
    if (!verification) {
      throw new NotFoundException('Vérification introuvable.');
    }

    // Défense en profondeur : le garde de route exclut déjà CONSUMER, on le
    // revérifie ici car le service est aussi appelé par d'autres chemins.
    if (user.role === Role.CONSUMER) {
      throw new ForbiddenException('Accès réservé aux comptes Kounouz et au producteur concerné.');
    }
    if (user.role === Role.PRODUCER && verification.request.producer.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à cette vérification.");
    }
    return verification;
  }
}

const REQUEST_STATUS_AFTER: Record<VerificationStatus, VerificationRequestStatus> = {
  [VerificationStatus.VERIFIED]: VerificationRequestStatus.VERIFIED,
  [VerificationStatus.NOT_VERIFIED]: VerificationRequestStatus.NOT_VERIFIED,
  [VerificationStatus.ADDITIONAL_ANALYSIS]: VerificationRequestStatus.UNDER_ANALYSIS,
  [VerificationStatus.PENDING]: VerificationRequestStatus.VERIFICATION_PENDING,
};
