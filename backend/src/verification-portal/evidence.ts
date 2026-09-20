import {
  LabAnalysisStatus,
  LabWorkflowStatus,
  ReferenceSampleStatus,
  SampleStatus,
  SealStatus,
  VerificationStatus,
} from '@prisma/client';

/**
 * Preuves exigées avant une décision de vérification (VER-02).
 *
 * Le cahier des charges fixe l'ordre de la chaîne : échantillon contrôlé ->
 * scellé Kounouz -> chaîne de possession -> analyse laboratoire ->
 * échantillon de référence conservé -> décision. Une décision VÉRIFIÉ n'est
 * donc possible que si chacune de ces pièces existe et est intègre.
 *
 * Fonction pure : elle sert à la fois de garde-fou serveur, de liste « pièces
 * manquantes » dans l'écran de décision et de base à l'assistant.
 */

export type EvidenceKey =
  | 'CONTROLLED_SAMPLE'
  | 'SEAL_INTACT'
  | 'CUSTODY_TO_LAB'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_COMPLIANT'
  | 'REFERENCE_SAMPLE_STORED';

export interface EvidenceItem {
  key: EvidenceKey;
  ok: boolean;
  /** Exigée pour prononcer VÉRIFIÉ. */
  requiredForVerified: boolean;
  /** Exigée pour toute décision définitive (VÉRIFIÉ ou NON VÉRIFIÉ). */
  requiredForAnyDecision: boolean;
  detail: string;
}

export interface EvidenceInput {
  sample: {
    status: SampleStatus;
    seal: { sealCode: string; status: SealStatus } | null;
    referenceSample: { referenceCode: string; status: ReferenceSampleStatus } | null;
  };
  analysis: { workflowStatus: LabWorkflowStatus; status: LabAnalysisStatus };
}

// Statuts atteints uniquement après réception chez Kounouz et remise au
// laboratoire : la chaîne de possession jusqu'au labo est donc tracée.
const REACHED_LAB: SampleStatus[] = [SampleStatus.RECEIVED_AT_LAB, SampleStatus.ANALYZED];

export function evidenceChecklist({ sample, analysis }: EvidenceInput): EvidenceItem[] {
  const analysisDone =
    analysis.workflowStatus === LabWorkflowStatus.COMPLETED || analysis.workflowStatus === LabWorkflowStatus.REVIEWED;

  return [
    {
      key: 'CONTROLLED_SAMPLE',
      ok: sample.status !== SampleStatus.ISSUE,
      requiredForVerified: true,
      requiredForAnyDecision: false,
      detail:
        sample.status === SampleStatus.ISSUE
          ? "Échantillon signalé en anomalie : le dossier est gelé jusqu'à arbitrage."
          : 'Échantillon contrôlé sans anomalie signalée.',
    },
    {
      key: 'SEAL_INTACT',
      ok: !!sample.seal && sample.seal.status === SealStatus.INTACT,
      requiredForVerified: true,
      requiredForAnyDecision: false,
      detail: !sample.seal
        ? 'Aucun scellé Kounouz enregistré.'
        : sample.seal.status === SealStatus.INTACT
          ? `Scellé ${sample.seal.sealCode} intact.`
          : `Scellé ${sample.seal.sealCode} déclaré rompu.`,
    },
    {
      key: 'CUSTODY_TO_LAB',
      ok: REACHED_LAB.includes(sample.status),
      requiredForVerified: true,
      requiredForAnyDecision: false,
      detail: REACHED_LAB.includes(sample.status)
        ? 'Réception et remise au laboratoire tracées.'
        : "La remise au laboratoire n'est pas tracée dans la chaîne de possession.",
    },
    {
      key: 'ANALYSIS_COMPLETED',
      ok: analysisDone,
      requiredForVerified: true,
      requiredForAnyDecision: true,
      detail: analysisDone ? 'Bulletin de laboratoire clôturé.' : "Le bulletin n'est pas encore clôturé.",
    },
    {
      key: 'ANALYSIS_COMPLIANT',
      ok: analysis.status === LabAnalysisStatus.COMPLIANT,
      requiredForVerified: true,
      requiredForAnyDecision: false,
      detail:
        analysis.status === LabAnalysisStatus.COMPLIANT
          ? 'Tous les paramètres normés sont conformes.'
          : 'Le bulletin comporte au moins un paramètre non conforme.',
    },
    {
      key: 'REFERENCE_SAMPLE_STORED',
      ok: !!sample.referenceSample && sample.referenceSample.status === ReferenceSampleStatus.STORED,
      requiredForVerified: true,
      requiredForAnyDecision: false,
      detail: !sample.referenceSample
        ? "Aucun échantillon de référence n'est enregistré pour cet échantillon."
        : sample.referenceSample.status === ReferenceSampleStatus.STORED
          ? `Échantillon de référence ${sample.referenceSample.referenceCode} conservé par Kounouz.`
          : `Échantillon de référence ${sample.referenceSample.referenceCode} non disponible (${sample.referenceSample.status}).`,
    },
  ];
}

/** Pièces manquantes pour prononcer la décision demandée. */
export function missingEvidenceFor(status: VerificationStatus, items: EvidenceItem[]): EvidenceItem[] {
  if (status === VerificationStatus.VERIFIED) return items.filter((i) => i.requiredForVerified && !i.ok);
  if (status === VerificationStatus.NOT_VERIFIED) return items.filter((i) => i.requiredForAnyDecision && !i.ok);
  return [];
}
