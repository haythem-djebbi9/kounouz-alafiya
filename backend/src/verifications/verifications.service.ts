import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LabAnalysisStatus, NotificationType, Role, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateVerificationDto } from './dto/create-verification.dto.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

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
  ) {}

  async create(userId: string, dto: CreateVerificationDto) {
    const [request, sample, analysis] = await Promise.all([
      this.prisma.verificationRequest.findUnique({ where: { id: dto.requestId }, include: { producer: true } }),
      this.prisma.sample.findUnique({ where: { id: dto.sampleId } }),
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

    const verification = await this.prisma.verification.create({
      data: {
        requestId: dto.requestId,
        sampleId: dto.sampleId,
        analysisId: dto.analysisId,
        status: dto.status,
        notes: dto.notes,
        verifiedAt: new Date(),
        decidedById: userId,
      },
      include: VERIFICATION_INCLUDE,
    });

    await this.audit.log(userId, `VERIFICATION_${dto.status}`, 'Verification', verification.id);

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
    if (user.role === Role.PRODUCER && verification.request.producer.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à cette vérification.");
    }
    return verification;
  }
}
