import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CounterfeitAlertStatus,
  CounterfeitAlertType,
  LabTestStatus,
  Role,
  ScanResult,
  VerificationRequestStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OperationsService } from '../operations/operations.service.js';
import { evidenceChecklist, missingEvidenceFor } from '../verification-portal/evidence.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { type AssistantFact, type AssistantResponse, response } from './assistant.types.js';

// Explication, en langage clair, de l'état d'une demande pour le producteur.
const PRODUCER_STATUS_TEXT: Record<VerificationRequestStatus, { now: string; next: string }> = {
  DRAFT: { now: "Votre demande est un brouillon : Kounouz ne l'a pas encore reçue.", next: 'Complétez-la puis soumettez-la.' },
  NEW: { now: 'Votre demande a bien été reçue par Kounouz.', next: "L'Équipe de Vérification va l'examiner." },
  IN_REVIEW: { now: "L'Équipe de Vérification examine votre demande.", next: 'Vous serez notifié de sa décision.' },
  INFO_REQUESTED: {
    now: 'Kounouz a besoin d\'une précision pour poursuivre.',
    next: 'Répondez à la question posée depuis le détail de la demande.',
  },
  ACCEPTED: { now: 'Votre demande est acceptée.', next: "Kounouz organise la collecte d'un échantillon." },
  COLLECTION_SCHEDULED: {
    now: 'La collecte de votre échantillon est planifiée.',
    next: 'Un agent Kounouz viendra prélever l\'échantillon (ou vous l\'apporterez au centre).',
  },
  SAMPLE_COLLECTED: {
    now: 'Votre échantillon a été prélevé et scellé par Kounouz.',
    next: 'Il est acheminé vers le laboratoire.',
  },
  UNDER_ANALYSIS: { now: 'Votre échantillon est en cours d\'analyse au laboratoire.', next: 'Les résultats seront examinés par Kounouz.' },
  VERIFICATION_PENDING: {
    now: "L'analyse est terminée : l'Équipe de Vérification examine le dossier.",
    next: 'Vous serez notifié de la décision.',
  },
  VERIFIED: { now: 'Votre miel est VÉRIFIÉ par Kounouz.', next: 'Kounouz prépare le lot, son emballage et sa mise en vente.' },
  NOT_VERIFIED: {
    now: "Votre miel n'a pas passé la vérification Kounouz.",
    next: 'Consultez le motif indiqué et contactez le support si besoin.',
  },
  REJECTED: { now: 'Votre demande a été refusée.', next: 'Consultez le motif indiqué ; une nouvelle demande reste possible.' },
};

// Règle de détection à l'origine de chaque type d'alerte (§11 Anti-contrefaçon).
const ALERT_RULE_TEXT: Record<CounterfeitAlertType, string> = {
  SUSPECTED_DUPLICATE: "Le même QR est scanné par plusieurs appareils ou visiteurs distincts dans un délai court : signe possible d'une étiquette copiée.",
  UNUSUAL_LOCATION: 'Le QR est scanné depuis des lieux géographiquement incohérents avec la distribution du lot.',
  INVALID_QR: "Un identifiant inconnu de Kounouz a été scanné : il peut s'agir d'un code inventé ou d'une étiquette contrefaite.",
  TAMPERED_LABEL: "Un consommateur a signalé une étiquette ou un scellé abîmé ou suspect.",
  BULK_SCAN: "Un volume anormal de scans provient d'une même source : possible collecte automatisée.",
};

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly operations: OperationsService,
  ) {}

  /** Synthèse d'un dossier de vérification pour le vérificateur. */
  async caseSummary(verificationId: string, userId: string): Promise<AssistantResponse> {
    const verification = await this.prisma.verification.findUnique({
      where: { id: verificationId },
      include: {
        request: { include: { producer: { select: { name: true, farmName: true } } } },
        sample: { include: { seal: true, referenceSample: true, events: { orderBy: { occurredAt: 'asc' } } } },
        analysis: { include: { laboratory: { select: { name: true } }, testResults: true } },
      },
    });
    if (!verification) throw new NotFoundException('Dossier de vérification introuvable.');
    const { request, sample, analysis } = verification;

    const facts: AssistantFact[] = [
      {
        text: `Demande ${request.requestCode ?? '—'} : ${request.honeyType}, ${Number(request.quantity)} kg, producteur ${request.producer.name} (${request.producer.farmName}).`,
        source: { entity: 'VerificationRequest', id: request.id, code: request.requestCode },
      },
      {
        text: `Échantillon ${sample.sampleCode ?? '—'} au statut ${sample.status}, ${sample.events.length} étape(s) de possession tracée(s).`,
        source: { entity: 'Sample', id: sample.id, code: sample.sampleCode },
      },
      {
        text: `Bulletin ${analysis.analysisCode ?? '—'} (${analysis.laboratory.name}) : ${analysis.status}, ${analysis.testResults.length} paramètre(s) saisi(s).`,
        source: { entity: 'LaboratoryAnalysis', id: analysis.id, code: analysis.analysisCode },
      },
    ];
    if (sample.seal) {
      facts.push({
        text: `Scellé ${sample.seal.sealCode} : ${sample.seal.status}.`,
        source: { entity: 'Seal', id: sample.seal.id, code: sample.seal.sealCode },
      });
    }
    if (sample.referenceSample) {
      facts.push({
        text: `Échantillon de référence ${sample.referenceSample.referenceCode} : ${sample.referenceSample.status}.`,
        source: { entity: 'ReferenceSample', id: sample.referenceSample.id, code: sample.referenceSample.referenceCode },
      });
    }

    const outOfRange = analysis.testResults.filter(
      (t) => t.status === LabTestStatus.OUT_OF_RANGE || t.status === LabTestStatus.DETECTED,
    );
    const suggestions: string[] = [];
    for (const t of outOfRange) {
      suggestions.push(`Examiner le paramètre « ${t.parameterKey} » (${t.value ?? '—'} ${t.unit ?? ''}) : hors référence.`);
    }
    const missing = missingEvidenceFor(VerificationStatus.VERIFIED, evidenceChecklist({ sample, analysis }));
    for (const item of missing) suggestions.push(`Pièce manquante pour VÉRIFIÉ : ${item.detail}`);
    if (missing.length === 0 && outOfRange.length === 0) {
      suggestions.push(
        'Toutes les pièces exigées sont présentes et les paramètres sont conformes : le dossier est prêt pour la décision du vérificateur.',
      );
    }

    const unknowns: string[] = [];
    if (!sample.seal) unknowns.push("Aucun scellé enregistré : l'intégrité de l'échantillon ne peut pas être établie.");
    if (analysis.testResults.length === 0) unknowns.push('Aucun paramètre de laboratoire saisi.');

    await this.log(userId, 'CASE_SUMMARY', 'Verification', verificationId);
    return response('verification.case-summary', { facts, suggestions, unknowns });
  }

  /** Pièces manquantes avant décision, pour un échantillon. */
  async missingEvidence(sampleId: string, userId: string): Promise<AssistantResponse> {
    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      include: { seal: true, referenceSample: true, labAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!sample) throw new NotFoundException('Échantillon introuvable.');
    const analysis = sample.labAnalyses[0];

    await this.log(userId, 'MISSING_EVIDENCE', 'Sample', sampleId);
    if (!analysis) {
      return response('verification.missing-evidence', {
        facts: [{ text: `Échantillon ${sample.sampleCode ?? '—'} au statut ${sample.status}.`, source: { entity: 'Sample', id: sample.id } }],
        suggestions: ["Ouvrir l'analyse de laboratoire : aucune n'est encore rattachée à cet échantillon."],
        unknowns: ['Résultats de laboratoire non disponibles.'],
      });
    }

    const items = evidenceChecklist({ sample, analysis });
    return response('verification.missing-evidence', {
      facts: items.filter((i) => i.ok).map((i) => ({ text: i.detail, source: { entity: 'Sample', id: sample.id } })),
      suggestions: items.filter((i) => !i.ok && i.requiredForVerified).map((i) => i.detail),
      unknowns: [],
    });
  }

  /** Explication de l'avancement d'une demande, pour son producteur uniquement. */
  async producerStatusExplanation(requestId: string, user: JwtPayload): Promise<AssistantResponse> {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { producer: { select: { userId: true } } },
    });
    // Même réponse qu'une demande inexistante : pas d'énumération possible.
    if (!request || (user.role === Role.PRODUCER && request.producer.userId !== user.sub)) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    if (user.role !== Role.PRODUCER && user.role !== Role.ADMIN && user.role !== Role.VERIFICATION_TEAM) {
      throw new ForbiddenException();
    }

    const text = PRODUCER_STATUS_TEXT[request.status];
    const facts: AssistantFact[] = [
      { text: text.now, source: { entity: 'VerificationRequest', id: request.id, code: request.requestCode } },
    ];
    // Seule la question posée au producteur est reprise — jamais les notes internes.
    if (request.status === VerificationRequestStatus.INFO_REQUESTED && request.infoRequested) {
      facts.push({ text: `Question de Kounouz : « ${request.infoRequested} »` });
    }
    await this.log(user.sub, 'STATUS_EXPLANATION', 'VerificationRequest', requestId);
    return response('producer.status-explanation', { facts, suggestions: [text.next], unknowns: [] });
  }

  /** Synthèse d'exploitation pour l'administration. */
  async analyticsSummary(userId: string): Promise<AssistantResponse> {
    const now = Date.now();
    const days = (n: number) => new Date(now - n * 86_400_000);
    const [pendingReview, decided30, verified30, scans7, scansPrev7, invalid7, openAlerts, aging] = await Promise.all([
      this.prisma.verificationRequest.count({
        where: { status: { in: [VerificationRequestStatus.NEW, VerificationRequestStatus.IN_REVIEW] } },
      }),
      this.prisma.verification.count({ where: { isDraft: false, verifiedAt: { gte: days(30) } } }),
      this.prisma.verification.count({
        where: { isDraft: false, status: VerificationStatus.VERIFIED, verifiedAt: { gte: days(30) } },
      }),
      this.prisma.qRScan.count({ where: { scannedAt: { gte: days(7) } } }),
      this.prisma.qRScan.count({ where: { scannedAt: { gte: days(14), lt: days(7) } } }),
      this.prisma.qRScan.count({ where: { scannedAt: { gte: days(7) }, result: ScanResult.INVALID } }),
      this.prisma.counterfeitAlert.groupBy({
        by: ['severity'],
        where: { status: { in: [CounterfeitAlertStatus.OPEN, CounterfeitAlertStatus.INVESTIGATING, CounterfeitAlertStatus.CONFIRMED] } },
        _count: { _all: true },
      }),
      this.operations.workflowAging(),
    ]);

    const trend = scansPrev7 === 0 ? null : Math.round(((scans7 - scansPrev7) / scansPrev7) * 100);
    const facts: AssistantFact[] = [
      { text: `${pendingReview} demande(s) en attente de revue.` },
      { text: `${decided30} décision(s) sur 30 jours, dont ${verified30} VÉRIFIÉ.` },
      {
        text: `${scans7} scan(s) sur 7 jours${trend === null ? '' : ` (${trend >= 0 ? '+' : ''}${trend} % vs semaine précédente)`}, dont ${invalid7} sur QR invalide.`,
      },
      {
        text: `Alertes ouvertes : ${openAlerts.map((a) => `${a._count._all} ${a.severity}`).join(', ') || 'aucune'}.`,
      },
      { text: `${aging.totalOverdue} dossier(s) au-delà des seuils SLA.` },
    ];
    const suggestions = aging.stages
      .filter((s) => s.overdue > 0)
      .map((s) => `Étape ${s.key} : ${s.overdue} élément(s) au-delà de ${s.threshold} ${s.unit === 'hours' ? 'h' : 'j'}.`);
    if (invalid7 > 0 && scans7 > 0 && invalid7 / scans7 > 0.1) {
      suggestions.push('Plus de 10 % de scans sur QR invalide cette semaine : examiner les alertes INVALID_QR.');
    }
    const unknowns = scansPrev7 === 0 ? ["Pas d'historique de scans sur la semaine précédente pour mesurer la tendance."] : [];

    await this.log(userId, 'ANALYTICS_SUMMARY', 'System', '-');
    return response('admin.analytics-summary', { facts, suggestions, unknowns });
  }

  /** Explication d'une alerte anti-contrefaçon (signal interne, jamais une accusation). */
  async explainAlert(alertId: string, userId: string): Promise<AssistantResponse> {
    const alert = await this.prisma.counterfeitAlert.findUnique({
      where: { id: alertId },
      include: {
        product: { select: { nom: true } },
        batch: { select: { batchCode: true } },
        qrCode: { select: { qrCode: true } },
      },
    });
    if (!alert) throw new NotFoundException('Alerte introuvable.');

    const facts: AssistantFact[] = [
      { text: `Règle déclenchée : ${ALERT_RULE_TEXT[alert.type]}`, source: { entity: 'CounterfeitAlert', id: alert.id, code: alert.alertCode } },
      { text: `Gravité ${alert.severity}, ${alert.scanCount} scan(s) rattaché(s), statut ${alert.status}.` },
    ];
    if (alert.qrCode) facts.push({ text: `QR concerné : ${alert.qrCode.qrCode}.` });
    if (alert.product) facts.push({ text: `Produit : ${alert.product.nom}${alert.batch ? ` (lot ${alert.batch.batchCode})` : ''}.` });
    if (alert.location) facts.push({ text: `Dernière localisation : ${alert.location}.` });

    const suggestions = [
      'Comparer les scans rattachés (lieux, appareils, horaires) avec la distribution connue du lot.',
      "Vérifier l'étiquette physique si un pot est récupérable.",
      "Conclure la revue : CONFIRMÉE (incident avéré) ou ÉCARTÉE (fausse alerte), avec une conclusion écrite.",
    ];
    if (alert.status === CounterfeitAlertStatus.CONFIRMED) {
      suggestions.push('Incident confirmé : envisager la suspension du lot par la procédure autorisée, puis clôturer en RÉSOLUE.');
    }
    const unknowns = ["L'intention ou l'auteur d'un éventuel détournement ne peuvent pas être établis à partir des scans."];

    await this.log(userId, 'EXPLAIN_ALERT', 'CounterfeitAlert', alertId);
    return response('anti-counterfeit.explain-alert', { facts, suggestions, unknowns });
  }

  private log(userId: string, kind: string, entity: string, id: string) {
    return this.audit.log(userId, `AI_ASSIST_${kind}`, entity, id, { module: 'AI_ASSISTANT' });
  }
}
