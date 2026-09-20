import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, Role, SampleStatus, SealStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { buildCode } from '../common/sequential-code.js';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto.js';
import { CreateLabAnalysisDto } from './dto/create-lab-analysis.dto.js';
import { CreateReferenceSampleDto } from './dto/create-reference-sample.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

@Injectable()
export class LaboratoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  // --- Laboratoires --------------------------------------------------

  createLaboratory(dto: CreateLaboratoryDto) {
    return this.prisma.laboratory.create({ data: dto });
  }

  findAllLaboratories() {
    return this.prisma.laboratory.findMany({ orderBy: { name: 'asc' } });
  }

  // --- Analyses de laboratoire ----------------------------------------
  // Réservé à ADMIN / VERIFICATION_TEAM (imposé par le guard sur le contrôleur) :
  // le Producteur et l'Agent Terrain ne peuvent jamais saisir ou modifier un résultat.

  async createAnalysis(userId: string, dto: CreateLabAnalysisDto) {
    const sample = await this.prisma.sample.findUnique({
      where: { id: dto.sampleId },
      include: { seal: true, request: { include: { producer: true } } },
    });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.status !== SampleStatus.RECEIVED_AT_LAB) {
      throw new BadRequestException(
        "L'échantillon doit avoir été reçu au laboratoire avant l'enregistrement d'une analyse.",
      );
    }
    if (!sample.seal || sample.seal.status !== SealStatus.INTACT) {
      throw new BadRequestException('Le scellé doit être intact pour enregistrer une analyse.');
    }

    const lab = await this.prisma.laboratory.findUnique({ where: { id: dto.labId } });
    if (!lab) {
      throw new NotFoundException('Laboratoire introuvable.');
    }
    // Un laboratoire en attente d'approbation ou suspendu ne reçoit aucune analyse.
    if (lab.status !== 'ACTIVE') {
      throw new BadRequestException("Ce laboratoire n'est pas actif : il ne peut pas recevoir d'analyse.");
    }

    const [analysis] = await this.prisma.$transaction([
      this.prisma.laboratoryAnalysis.create({
        data: {
          sampleId: dto.sampleId,
          labId: dto.labId,
          analysisDate: new Date(dto.analysisDate),
          reportFileUrl: dto.reportFileUrl,
          results: dto.results as Prisma.InputJsonValue,
          status: dto.status,
        },
      }),
      this.prisma.sample.update({
        where: { id: dto.sampleId },
        data: { status: SampleStatus.ANALYZED },
      }),
    ]);

    await this.audit.log(userId, 'RECORD_LAB_ANALYSIS', 'LaboratoryAnalysis', analysis.id);

    await this.notifications.notify(
      sample.request.producer.userId,
      NotificationType.ANALYSIS_COMPLETED,
      'Analyse de laboratoire terminée',
      `L'analyse de votre échantillon "${sample.request.honeyType}" est terminée.`,
      'LaboratoryAnalysis',
      analysis.id,
    );
    for (const role of [Role.ADMIN, Role.VERIFICATION_TEAM]) {
      await this.notifications.notifyRole(
        role,
        NotificationType.ANALYSIS_COMPLETED,
        'Analyse de laboratoire terminée',
        `L'analyse de l'échantillon "${sample.request.honeyType}" est prête pour vérification.`,
        'LaboratoryAnalysis',
        analysis.id,
      );
    }

    return analysis;
  }

  findAllAnalyses() {
    return this.prisma.laboratoryAnalysis.findMany({
      include: { sample: true, laboratory: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAnalysis(id: string) {
    const analysis = await this.prisma.laboratoryAnalysis.findUnique({
      where: { id },
      include: { sample: true, laboratory: true },
    });
    if (!analysis) {
      throw new NotFoundException('Analyse introuvable.');
    }
    return analysis;
  }

  // --- Échantillons de référence ---------------------------------------

  async createReferenceSample(userId: string, dto: CreateReferenceSampleDto) {
    const sample = await this.prisma.sample.findUnique({ where: { id: dto.sampleId }, include: { seal: true } });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    // Même règle que le portail : seule une portion d'un échantillon contrôlé
    // (scellé, sans anomalie) peut servir de référence.
    if (!sample.seal || sample.status === SampleStatus.ISSUE) {
      throw new BadRequestException(
        "Seul un échantillon scellé et sans anomalie peut fournir une portion de référence.",
      );
    }

    const existing = await this.prisma.referenceSample.findUnique({ where: { sampleId: dto.sampleId } });
    if (existing) {
      throw new BadRequestException('Un échantillon de référence existe déjà pour cet échantillon.');
    }

    const count = await this.prisma.referenceSample.count();
    const referenceSample = await this.prisma.referenceSample.create({
      data: {
        sampleId: dto.sampleId,
        referenceCode: buildCode('KZ-REF', count),
        storageLocation: dto.storageLocation,
        storageConditions: dto.storageConditions,
        retentionPeriod: dto.retentionPeriod,
        storedById: userId,
      },
    });

    await this.audit.log(userId, 'STORE_REFERENCE_SAMPLE', 'ReferenceSample', referenceSample.id, {
      newStatus: 'STORED',
    });
    await this.domainEvents.publish(EventType.REFERENCE_SAMPLE_REGISTERED, 'ReferenceSample', referenceSample.id, {
      referenceCode: referenceSample.referenceCode,
      sampleId: sample.id,
      sampleCode: sample.sampleCode,
    });
    return referenceSample;
  }

  findAllReferenceSamples() {
    return this.prisma.referenceSample.findMany({
      include: { sample: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
