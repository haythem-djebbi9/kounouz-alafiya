import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LabAnalysisStatus,
  LabWorkflowStatus,
  NotificationType,
  Prisma,
  VerificationRequestStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { DecisionDto, DecisionOutcome } from './dto/decision.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';
import { evidenceChecklist, missingEvidenceFor } from './evidence.js';

// Étapes du bandeau de la page Décision. Elles couvrent la vie du dossier
// depuis l'arrivée de l'échantillon jusqu'au verdict.
export type DecisionStep =
  | 'SAMPLE_RECEIVED'
  | 'IN_LABORATORY'
  | 'ANALYSIS_COMPLETED'
  | 'RESULTS_REVIEWED'
  | 'FINAL_DECISION';

const DECISION_INCLUDE = {
  request: { include: { producer: true } },
  // La demande et son producteur sont embarqués dans l'échantillon : le
  // bandeau de décision les affiche sans second aller-retour.
  sample: {
    include: {
      seal: true,
      referenceSample: true,
      collectedBy: { select: { id: true, name: true } },
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
    },
  },
  analysis: {
    include: {
      laboratory: true,
      assignedTo: { select: { id: true, name: true } },
      testResults: { orderBy: { position: 'asc' } },
      files: true,
    },
  },
  decidedBy: { select: { id: true, name: true, email: true } },
  batch: true,
} as const;

const OUTCOME_STATUS: Record<DecisionOutcome, VerificationStatus> = {
  [DecisionOutcome.APPROVE]: VerificationStatus.VERIFIED,
  [DecisionOutcome.REJECT]: VerificationStatus.NOT_VERIFIED,
  [DecisionOutcome.REQUEST_ADDITIONAL_ANALYSIS]: VerificationStatus.ADDITIONAL_ANALYSIS,
};

@Injectable()
export class PortalDecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /**
   * Dossiers en attente de décision : analyse clôturée, pas encore tranchée.
   * Les brouillons y restent — ils représentent un travail commencé, donc à
   * finir, et non une décision prise.
   */
  async queue() {
    const analyses = await this.prisma.laboratoryAnalysis.findMany({
      where: {
        workflowStatus: { in: [LabWorkflowStatus.COMPLETED, LabWorkflowStatus.REVIEWED] },
        verifications: { none: { isDraft: false, status: { not: VerificationStatus.PENDING } } },
      },
      include: {
        laboratory: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        testResults: { select: { parameterKey: true, status: true } },
        sample: {
          include: {
            request: {
              select: {
                id: true,
                requestCode: true,
                honeyType: true,
                governorate: true,
                batchNumber: true,
                producer: { select: { id: true, name: true } },
              },
            },
          },
        },
        verifications: {
          where: { isDraft: true },
          select: { id: true, verificationCode: true, status: true, updatedAt: true },
          take: 1,
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    return analyses.map((analysis) => ({
      ...analysis,
      draft: analysis.verifications[0] ?? null,
    }));
  }

  async findOne(id: string) {
    const verification = await this.prisma.verification.findUnique({
      where: { id },
      include: DECISION_INCLUDE,
    });
    if (!verification) {
      throw new NotFoundException('Dossier de vérification introuvable.');
    }
    return {
      ...verification,
      steps: buildDecisionSteps(verification),
      // Pièces du dossier et ce qui manque encore pour trancher (VER-02).
      evidence: evidenceChecklist({ sample: verification.sample, analysis: verification.analysis }),
    };
  }

  /**
   * Ouvre (ou rouvre) le dossier de décision attaché à une analyse. Un
   * brouillon existant est réutilisé pour ne pas empiler plusieurs dossiers
   * sur le même bulletin.
   */
  async openForAnalysis(analysisId: string, userId: string) {
    const analysis = await this.prisma.laboratoryAnalysis.findUnique({
      where: { id: analysisId },
      include: { sample: true, verifications: true },
    });
    if (!analysis) {
      throw new NotFoundException('Analyse introuvable.');
    }
    if (analysis.workflowStatus === LabWorkflowStatus.ASSIGNED ||
        analysis.workflowStatus === LabWorkflowStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "L'analyse doit être clôturée par le laboratoire avant d'ouvrir une décision.",
      );
    }

    const existing = analysis.verifications.find((v) => v.isDraft || v.status === VerificationStatus.PENDING);
    if (existing) {
      return this.findOne(existing.id);
    }

    const verification = await allocateYearCode(
      'VT',
      (prefix) => this.prisma.verification.count({ where: { verificationCode: { startsWith: prefix } } }),
      (verificationCode) =>
        this.prisma.verification.create({
          data: {
            verificationCode,
            requestId: analysis.sample.requestId,
            sampleId: analysis.sampleId,
            analysisId: analysis.id,
            status: VerificationStatus.PENDING,
            isDraft: true,
            decidedById: userId,
          },
        }),
    );

    await this.audit.log(userId, 'OPEN_VERIFICATION', 'Verification', verification.id);
    return this.findOne(verification.id);
  }

  /** Sauvegarde intermédiaire : n'engage pas Kounouz et ne notifie personne. */
  async saveDraft(id: string, userId: string, dto: DecisionDto) {
    const verification = await this.prisma.verification.findUnique({ where: { id } });
    if (!verification) {
      throw new NotFoundException('Dossier de vérification introuvable.');
    }
    this.assertOpen(verification);

    await this.prisma.verification.update({
      where: { id },
      data: {
        notes: dto.comments,
        evaluation: (dto.evaluation ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        isDraft: true,
        decidedById: userId,
      },
    });
    await this.audit.log(userId, 'SAVE_VERIFICATION_DRAFT', 'Verification', id);
    return this.findOne(id);
  }

  /**
   * Prononce la décision. C'est le seul point où un dossier devient opposable :
   * il déclenche la notification au producteur et débloque (ou non) la suite
   * de la chaîne commerciale.
   */
  async confirm(id: string, userId: string, dto: DecisionDto) {
    const verification = await this.prisma.verification.findUnique({
      where: { id },
      include: {
        analysis: true,
        request: { include: { producer: true } },
        sample: { include: { seal: true, referenceSample: true } },
      },
    });
    if (!verification) {
      throw new NotFoundException('Dossier de vérification introuvable.');
    }
    this.assertOpen(verification);

    if (!dto.outcome) {
      throw new BadRequestException('Sélectionnez une décision.');
    }
    const status = OUTCOME_STATUS[dto.outcome];

    // Garde-fou central du cahier des charges : un miel dont le bulletin est
    // non conforme ne peut pas être déclaré vérifié, quel que soit l'opérateur.
    if (status === VerificationStatus.VERIFIED &&
        verification.analysis.status !== LabAnalysisStatus.COMPLIANT) {
      throw new BadRequestException(
        "Impossible d'approuver un dossier dont l'analyse de laboratoire n'est pas conforme.",
      );
    }

    // VER-02 : aucune décision sans les preuves exigées. Pour VÉRIFIÉ, la
    // chaîne complète — scellé intact, remise au laboratoire tracée, bulletin
    // conforme et échantillon de référence conservé par Kounouz.
    const missing = missingEvidenceFor(
      status,
      evidenceChecklist({ sample: verification.sample, analysis: verification.analysis }),
    );
    if (missing.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'MISSING_EVIDENCE',
        message: `Décision impossible, pièces manquantes : ${missing.map((m) => m.detail).join(' ')}`,
        missing: missing.map((m) => m.key),
      });
    }
    if (status !== VerificationStatus.VERIFIED && !dto.comments?.trim()) {
      throw new BadRequestException('Un commentaire est obligatoire pour un refus ou une contre-analyse.');
    }

    const updated = await this.prisma.verification.update({
      where: { id },
      data: {
        status,
        isDraft: false,
        notes: dto.comments,
        evaluation: (dto.evaluation ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        verifiedAt: new Date(),
        decidedById: userId,
      },
      include: DECISION_INCLUDE,
    });

    await this.prisma.verificationRequest.update({
      where: { id: verification.requestId },
      data: { status: REQUEST_STATUS_AFTER[status] },
    });

    // Une contre-analyse renvoie le dossier au laboratoire : on rouvre le
    // bulletin pour qu'une nouvelle analyse puisse être ouverte.
    if (status === VerificationStatus.ADDITIONAL_ANALYSIS) {
      await this.prisma.laboratoryAnalysis.update({
        where: { id: verification.analysisId },
        data: { workflowStatus: LabWorkflowStatus.REVIEWED },
      });
    }

    // VER-06 : décideur, horodatage, références de preuve et motif.
    await this.audit.log(userId, `VERIFICATION_${status}`, 'Verification', id, {
      previousStatus: verification.status,
      newStatus: status,
      reason: dto.comments?.trim() || null,
      metadata: {
        verificationCode: updated.verificationCode,
        analysisId: verification.analysisId,
        sampleId: verification.sampleId,
        sealCode: verification.sample.seal?.sealCode ?? null,
        referenceCode: verification.sample.referenceSample?.referenceCode ?? null,
      },
    });
    await this.notifyOutcome(status, verification.request.producer.userId, verification.request.honeyType, id);
    await this.domainEvents.publish(EventType.VERIFICATION_COMPLETED, 'Verification', id, {
      status,
      verificationCode: updated.verificationCode,
      requestId: verification.requestId,
      sampleId: verification.sampleId,
    });

    return {
      ...updated,
      steps: buildDecisionSteps(updated),
      evidence: evidenceChecklist({ sample: updated.sample, analysis: updated.analysis }),
    };
  }

  private async notifyOutcome(
    status: VerificationStatus,
    producerUserId: string,
    honeyType: string,
    verificationId: string,
  ) {
    const messages: Partial<Record<VerificationStatus, { title: string; body: string }>> = {
      [VerificationStatus.VERIFIED]: {
        title: 'Vérification réussie',
        body: `Votre miel « ${honeyType} » est vérifié par Kounouz Alafiya.`,
      },
      [VerificationStatus.NOT_VERIFIED]: {
        title: 'Vérification non concluante',
        body: `Votre miel « ${honeyType} » n'a pas passé la vérification Kounouz.`,
      },
      [VerificationStatus.ADDITIONAL_ANALYSIS]: {
        title: 'Analyse complémentaire requise',
        body: `Une analyse complémentaire est nécessaire pour « ${honeyType} ».`,
      },
    };
    const message = messages[status];
    if (!message) return;

    await this.notifications.notify(
      producerUserId,
      NotificationType.VERIFICATION_RESULT,
      message.title,
      message.body,
      'Verification',
      verificationId,
    );
  }

  private assertOpen(verification: { isDraft: boolean; status: VerificationStatus }) {
    if (!verification.isDraft && verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        'Cette décision est déjà prononcée et ne peut plus être modifiée.',
      );
    }
  }
}

const REQUEST_STATUS_AFTER: Record<VerificationStatus, VerificationRequestStatus> = {
  [VerificationStatus.VERIFIED]: VerificationRequestStatus.VERIFIED,
  [VerificationStatus.NOT_VERIFIED]: VerificationRequestStatus.NOT_VERIFIED,
  [VerificationStatus.ADDITIONAL_ANALYSIS]: VerificationRequestStatus.UNDER_ANALYSIS,
  [VerificationStatus.PENDING]: VerificationRequestStatus.VERIFICATION_PENDING,
};

type DecisionStepInput = {
  status: VerificationStatus;
  isDraft: boolean;
  evaluation: Prisma.JsonValue | null;
  sample: { createdAt: Date };
  analysis: { assignmentDate: Date | null; completedAt: Date | null };
};

export function buildDecisionSteps(verification: DecisionStepInput): {
  step: DecisionStep;
  state: 'DONE' | 'CURRENT' | 'TODO';
  at: Date | null;
}[] {
  const decided = !verification.isDraft && verification.status !== VerificationStatus.PENDING;

  const steps: { step: DecisionStep; at: Date | null; done: boolean }[] = [
    { step: 'SAMPLE_RECEIVED', at: verification.sample.createdAt, done: true },
    {
      step: 'IN_LABORATORY',
      at: verification.analysis.assignmentDate,
      done: !!verification.analysis.assignmentDate,
    },
    {
      step: 'ANALYSIS_COMPLETED',
      at: verification.analysis.completedAt,
      done: !!verification.analysis.completedAt,
    },
    // La grille d'évaluation n'est renseignée qu'une fois les résultats
    // réellement passés en revue : sa présence fait foi.
    { step: 'RESULTS_REVIEWED', at: null, done: verification.evaluation !== null },
    { step: 'FINAL_DECISION', at: null, done: decided },
  ];

  const currentIndex = steps.findIndex((s) => !s.done);
  return steps.map((s, index) => ({
    step: s.step,
    at: s.at,
    state: s.done ? 'DONE' : index === currentIndex ? 'CURRENT' : 'TODO',
  }));
}
