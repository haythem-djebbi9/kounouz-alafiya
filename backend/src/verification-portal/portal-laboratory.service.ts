import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LabAnalysisStatus,
  LabWorkflowStatus,
  NotificationType,
  Prisma,
  Role,
  SampleEventType,
  SampleStatus,
  SealStatus,
  VerificationRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { SampleEventsService } from './sample-events.service.js';
import {
  LAB_PARAMETERS,
  LAB_PARAMETER_BY_KEY,
  evaluateParameter,
  isAnalysisCompliant,
} from './lab-parameters.js';
import { OpenAnalysisDto } from './dto/open-analysis.dto.js';
import { SaveAnalysisResultsDto } from './dto/save-analysis-results.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

const ANALYSIS_INCLUDE = {
  laboratory: true,
  assignedTo: { select: { id: true, name: true, email: true } },
  testResults: { orderBy: { position: 'asc' } },
  files: {
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  },
  sample: {
    include: {
      seal: true,
      collectedBy: { select: { id: true, name: true } },
      request: { include: { producer: true } },
    },
  },
} as const;

@Injectable()
export class PortalLaboratoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly events: SampleEventsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /** Bulletin vierge : le référentiel des paramètres et leurs plages. */
  parameters() {
    return LAB_PARAMETERS;
  }

  /** File d'attente du laboratoire : échantillons reçus ou en cours d'analyse. */
  queue() {
    return this.prisma.sample.findMany({
      where: { status: { in: [SampleStatus.RECEIVED, SampleStatus.RECEIVED_AT_LAB, SampleStatus.ANALYZED] } },
      select: {
        id: true,
        sampleCode: true,
        status: true,
        collectionDate: true,
        request: {
          select: {
            id: true,
            requestCode: true,
            honeyType: true,
            batchNumber: true,
            producer: { select: { id: true, name: true } },
          },
        },
        labAnalyses: {
          select: { id: true, analysisCode: true, status: true, workflowStatus: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findAnalysis(id: string) {
    const analysis = await this.prisma.laboratoryAnalysis.findUnique({
      where: { id },
      include: ANALYSIS_INCLUDE,
    });
    if (!analysis) {
      throw new NotFoundException('Analyse introuvable.');
    }
    return this.withHistory(analysis);
  }

  /** Analyse courante d'un échantillon — point d'entrée de la page Laboratoire. */
  async findBySample(sampleId: string) {
    const analysis = await this.prisma.laboratoryAnalysis.findFirst({
      where: { sampleId },
      include: ANALYSIS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) {
      throw new NotFoundException("Aucune analyse n'a encore été ouverte pour cet échantillon.");
    }
    return this.withHistory(analysis);
  }

  /**
   * Analyses antérieures du même producteur sur le même type de miel.
   * Elles servent de point de comparaison à l'analyste (bloc « Previous
   * Analyses ») : une dérive d'un bulletin à l'autre est un signal.
   */
  private async withHistory(analysis: Prisma.LaboratoryAnalysisGetPayload<{ include: typeof ANALYSIS_INCLUDE }>) {
    const previous = await this.prisma.labTestResult.findMany({
      where: {
        analysis: {
          id: { not: analysis.id },
          workflowStatus: { in: [LabWorkflowStatus.COMPLETED, LabWorkflowStatus.REVIEWED] },
          sample: {
            request: {
              producerId: analysis.sample.request.producerId,
              honeyType: analysis.sample.request.honeyType,
            },
          },
        },
      },
      include: {
        analysis: { select: { id: true, analysisCode: true, analysisDate: true, assignedTo: { select: { name: true } } } },
      },
      orderBy: { analysis: { analysisDate: 'desc' } },
      take: 20,
    });

    return { ...analysis, previousResults: previous };
  }

  /**
   * Ouvre le dossier d'analyse d'un échantillon : choix du laboratoire,
   * affectation de l'analyste et création du bulletin vierge.
   */
  async openAnalysis(userId: string, dto: OpenAnalysisDto) {
    const sample = await this.prisma.sample.findUnique({
      where: { id: dto.sampleId },
      include: { seal: true, request: true },
    });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.status !== SampleStatus.RECEIVED_AT_LAB) {
      throw new BadRequestException(
        "L'échantillon doit avoir été confié au laboratoire avant l'ouverture d'une analyse.",
      );
    }
    // Un scellé rompu invalide la chaîne de possession : analyser malgré tout
    // produirait un résultat inopposable (§9).
    if (!sample.seal || sample.seal.status !== SealStatus.INTACT) {
      throw new BadRequestException(
        'Le scellé doit être intact. Signalez une anomalie sur l’échantillon avant toute analyse.',
      );
    }

    const lab = await this.prisma.laboratory.findUnique({ where: { id: dto.labId } });
    if (!lab) {
      throw new NotFoundException('Laboratoire introuvable.');
    }
    // Un laboratoire en attente d'approbation ou suspendu ne reçoit aucune analyse.
    if (lab.status !== 'ACTIVE') {
      throw new BadRequestException("Ce laboratoire n'est pas actif : il ne peut pas recevoir d'analyse.");
    }

    const existing = await this.prisma.laboratoryAnalysis.findFirst({
      where: { sampleId: dto.sampleId, workflowStatus: { not: LabWorkflowStatus.REVIEWED } },
    });
    if (existing) {
      throw new BadRequestException('Une analyse est déjà ouverte pour cet échantillon.');
    }

    const analysis = await allocateYearCode(
      'LAB',
      (prefix) => this.prisma.laboratoryAnalysis.count({ where: { analysisCode: { startsWith: prefix } } }),
      (analysisCode) =>
        this.prisma.laboratoryAnalysis.create({
          data: {
            analysisCode,
            reportNumber: analysisCode,
            sampleId: dto.sampleId,
            labId: dto.labId,
            assignedToId: dto.assignedToId,
            assignmentDate: new Date(),
            expectedCompletion: dto.expectedCompletion ? new Date(dto.expectedCompletion) : null,
            analysisDate: new Date(),
            status: LabAnalysisStatus.PENDING,
            workflowStatus: LabWorkflowStatus.ASSIGNED,
            results: {},
            // Le bulletin naît complet : chaque paramètre du référentiel est
            // matérialisé, vide, avec la plage en vigueur ce jour-là.
            testResults: {
              create: LAB_PARAMETERS.map((p) => ({
                parameterKey: p.key,
                unit: p.unit,
                referenceMin: p.min,
                referenceMax: p.max,
                referenceText: p.referenceText,
                position: p.position,
              })),
            },
          },
        }),
    );

    await this.audit.log(userId, 'OPEN_LAB_ANALYSIS', 'LaboratoryAnalysis', analysis.id);
    return this.findAnalysis(analysis.id);
  }

  /**
   * Enregistre les valeurs saisies. Chaque paramètre est repositionné vis-à-vis
   * de sa plage : le statut « Within Range » n'est jamais saisi à la main.
   */
  async saveResults(id: string, userId: string, dto: SaveAnalysisResultsDto) {
    const analysis = await this.prisma.laboratoryAnalysis.findUnique({
      where: { id },
      include: { testResults: true },
    });
    if (!analysis) {
      throw new NotFoundException('Analyse introuvable.');
    }
    this.assertEditable(analysis.workflowStatus);

    const updates = dto.results.map((entry) => {
      const parameter = LAB_PARAMETER_BY_KEY.get(entry.parameterKey);
      if (!parameter) {
        throw new BadRequestException(`Paramètre inconnu : ${entry.parameterKey}.`);
      }
      return this.prisma.labTestResult.update({
        where: { analysisId_parameterKey: { analysisId: id, parameterKey: entry.parameterKey } },
        data: {
          value: entry.value ?? null,
          details: (entry.details ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          status: evaluateParameter(parameter, entry.value),
        },
      });
    });

    await this.prisma.$transaction([
      ...updates,
      this.prisma.laboratoryAnalysis.update({
        where: { id },
        data: {
          workflowStatus: LabWorkflowStatus.IN_PROGRESS,
          analysisDate: dto.analysisDate ? new Date(dto.analysisDate) : analysis.analysisDate,
          internalNotes: dto.internalNotes ?? analysis.internalNotes,
          conclusion: dto.conclusion ?? analysis.conclusion,
        },
      }),
    ]);

    await this.audit.log(userId, 'SAVE_LAB_RESULTS', 'LaboratoryAnalysis', id);
    return this.findAnalysis(id);
  }

  /**
   * Clôture le bulletin. La conformité est déduite des paramètres mesurés, pas
   * déclarée : l'analyste ne peut pas valider un miel hors plage.
   */
  async markCompleted(id: string, userId: string) {
    const analysis = await this.prisma.laboratoryAnalysis.findUnique({
      where: { id },
      include: { testResults: true, sample: { include: { request: { include: { producer: true } } } } },
    });
    if (!analysis) {
      throw new NotFoundException('Analyse introuvable.');
    }
    this.assertEditable(analysis.workflowStatus);

    const measured = analysis.testResults.filter((r) => (r.value ?? '').trim().length > 0);
    const requiredKeys = LAB_PARAMETERS.filter((p) => p.kind !== 'QUALITATIVE').map((p) => p.key);
    const missing = requiredKeys.filter(
      (key) => !measured.some((r) => r.parameterKey === key),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Paramètres non renseignés : ${missing.join(', ')}. Complétez le bulletin avant de le clôturer.`,
      );
    }

    const status = isAnalysisCompliant(analysis.testResults)
      ? LabAnalysisStatus.COMPLIANT
      : LabAnalysisStatus.NON_COMPLIANT;

    await this.prisma.laboratoryAnalysis.update({
      where: { id },
      data: {
        status,
        workflowStatus: LabWorkflowStatus.COMPLETED,
        completedAt: new Date(),
        // Snapshot lisible du bulletin, conservé avec l'analyse.
        results: Object.fromEntries(
          analysis.testResults.map((r) => [r.parameterKey, r.value ?? null]),
        ) as Prisma.InputJsonValue,
      },
    });

    await this.events.record(analysis.sampleId, SampleEventType.ANALYSIS_COMPLETED, userId);
    await this.events.record(analysis.sampleId, SampleEventType.RESULT_ADDED, userId, {
      note: analysis.analysisCode ?? undefined,
    });
    await this.prisma.verificationRequest.update({
      where: { id: analysis.sample.requestId },
      data: { status: VerificationRequestStatus.VERIFICATION_PENDING },
    });
    await this.audit.log(userId, 'COMPLETE_LAB_ANALYSIS', 'LaboratoryAnalysis', id, {
      previousStatus: analysis.workflowStatus,
      newStatus: LabWorkflowStatus.COMPLETED,
      details: status,
    });
    // LAB-A03 : le dossier devient décidable — jamais décidé automatiquement.
    await this.domainEvents.publish(EventType.LABORATORY_ANALYSIS_RECEIVED, 'LaboratoryAnalysis', id, {
      analysisCode: analysis.analysisCode,
      sampleId: analysis.sampleId,
      compliant: status === LabAnalysisStatus.COMPLIANT,
    });

    await this.notifications.notify(
      analysis.sample.request.producer.userId,
      NotificationType.ANALYSIS_COMPLETED,
      'Analyse terminée',
      `L'analyse de votre échantillon « ${analysis.sample.request.honeyType} » est terminée.`,
      'LaboratoryAnalysis',
      id,
    );
    for (const role of [Role.ADMIN, Role.VERIFICATION_TEAM]) {
      await this.notifications.notifyRole(
        role,
        NotificationType.ANALYSIS_COMPLETED,
        'Dossier prêt pour décision',
        `L'analyse ${analysis.analysisCode} attend une décision de vérification.`,
        'LaboratoryAnalysis',
        id,
      );
    }

    return this.findAnalysis(id);
  }

  // --- Pièces jointes ----------------------------------------------------

  async addFile(
    id: string,
    userId: string,
    file: { originalname: string; filename: string; mimetype: string; size: number },
  ) {
    const analysis = await this.prisma.laboratoryAnalysis.findUnique({ where: { id } });
    if (!analysis) {
      throw new NotFoundException('Analyse introuvable.');
    }
    const record = await this.prisma.labAnalysisFile.create({
      data: {
        analysisId: id,
        fileName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    await this.audit.log(userId, 'UPLOAD_ANALYSIS_FILE', 'LabAnalysisFile', record.id);
    return record;
  }

  /**
   * Lien de téléchargement d'une pièce du bulletin (§13 Sécurité).
   *
   * Le fichier n'est jamais servi publiquement : cette route, réservée à
   * l'Équipe de Vérification et à l'Admin, renvoie un chemin que
   * l'intercepteur transforme en URL signée à durée limitée. Chaque accès à
   * un document de laboratoire est journalisé.
   */
  async fileDownload(fileId: string, userId: string) {
    const file = await this.prisma.labAnalysisFile.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('Fichier introuvable.');
    }
    await this.audit.log(userId, 'ACCESS_ANALYSIS_FILE', 'LabAnalysisFile', fileId, { details: file.fileName });
    return { url: `/uploads/analyses/${file.storedName}`, fileName: file.fileName, mimeType: file.mimeType };
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.labAnalysisFile.findUnique({
      where: { id: fileId },
      include: { analysis: { select: { workflowStatus: true } } },
    });
    if (!file) {
      throw new NotFoundException('Fichier introuvable.');
    }
    // Le document source doit être préservé (§10) : une fois le bulletin
    // clôturé, ses pièces ne sont plus retirables.
    if (file.analysis.workflowStatus !== LabWorkflowStatus.ASSIGNED &&
        file.analysis.workflowStatus !== LabWorkflowStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Les pièces d'une analyse clôturée sont conservées et ne peuvent pas être supprimées.",
      );
    }
    await this.prisma.labAnalysisFile.delete({ where: { id: fileId } });
    await this.audit.log(userId, 'DELETE_ANALYSIS_FILE', 'LabAnalysisFile', fileId);
  }

  private assertEditable(workflowStatus: LabWorkflowStatus) {
    if (workflowStatus === LabWorkflowStatus.COMPLETED || workflowStatus === LabWorkflowStatus.REVIEWED) {
      throw new BadRequestException(
        "Cette analyse est clôturée. Ouvrez une nouvelle analyse plutôt que de modifier un bulletin validé.",
      );
    }
  }
}
