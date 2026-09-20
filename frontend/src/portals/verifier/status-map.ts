import type {
  LabAnalysisStatus,
  SampleStatus,
  VerificationRequestStatus,
  VerificationStatus,
} from '../../lib/api-types';
import type {
  BatchStatus,
  LabTestStatus,
  LabWorkflowStatus,
  PackagingStatus,
  ProductStatut,
  QrCodeStatus,
} from './types';
import type { Tone } from './ui';

// Couleur métier de chaque statut, partagée par toutes les vues du portail :
// un dossier « en laboratoire » porte le même bleu dans le tableau de bord, la
// revue des demandes et la file du laboratoire.

type AnyTone = Tone;

export const REQUEST_STATUS_TONE: Record<VerificationRequestStatus, AnyTone> = {
  DRAFT: 'neutral',
  NEW: 'amber',
  IN_REVIEW: 'amber',
  INFO_REQUESTED: 'violet',
  ACCEPTED: 'blue',
  COLLECTION_SCHEDULED: 'blue',
  SAMPLE_COLLECTED: 'blue',
  UNDER_ANALYSIS: 'blue',
  VERIFICATION_PENDING: 'violet',
  VERIFIED: 'green',
  NOT_VERIFIED: 'red',
  REJECTED: 'red',
};

export const SAMPLE_STATUS_TONE: Record<SampleStatus, AnyTone> = {
  COLLECTED: 'amber',
  SEALED: 'amber',
  IN_TRANSIT: 'amber',
  RECEIVED: 'blue',
  RECEIVED_AT_LAB: 'violet',
  ANALYZED: 'green',
  ISSUE: 'red',
};

export const LAB_ANALYSIS_TONE: Record<LabAnalysisStatus, AnyTone> = {
  PENDING: 'amber',
  COMPLIANT: 'green',
  NON_COMPLIANT: 'red',
};

export const LAB_WORKFLOW_TONE: Record<LabWorkflowStatus, AnyTone> = {
  ASSIGNED: 'neutral',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
  REVIEWED: 'blue',
};

export const LAB_TEST_TONE: Record<LabTestStatus, AnyTone> = {
  WITHIN_RANGE: 'green',
  OUT_OF_RANGE: 'red',
  NOT_DETECTED: 'green',
  DETECTED: 'red',
  NOT_APPLICABLE: 'neutral',
};

export const VERIFICATION_TONE: Record<VerificationStatus, AnyTone> = {
  PENDING: 'amber',
  VERIFIED: 'green',
  NOT_VERIFIED: 'red',
  ADDITIONAL_ANALYSIS: 'violet',
};

// Couleurs des séries du graphique de tendance et du camembert, alignées sur
// les tons ci-dessus pour que légende et pastilles concordent.
export const FAMILY_COLORS: Record<'UNDER_REVIEW' | 'IN_LABORATORY' | 'VERIFIED' | 'REJECTED', string> = {
  UNDER_REVIEW: '#D49B37',
  IN_LABORATORY: '#3B7DD8',
  VERIFIED: '#17693F',
  REJECTED: '#C7452F',
};

/**
 * Prochaine action attendue sur un dossier — colonne « Next Step » du tableau
 * de bord. Elle se déduit du statut : c'est ce que l'équipe doit faire, pas ce
 * qui s'est passé.
 */
export const NEXT_STEP_KEY: Record<VerificationRequestStatus, string> = {
  DRAFT: 'none',
  NEW: 'checkDocuments',
  IN_REVIEW: 'checkDocuments',
  INFO_REQUESTED: 'awaitingProducer',
  ACCEPTED: 'scheduleCollection',
  COLLECTION_SCHEDULED: 'collectSample',
  SAMPLE_COLLECTED: 'sendToLab',
  UNDER_ANALYSIS: 'labAnalysis',
  VERIFICATION_PENDING: 'takeDecision',
  VERIFIED: 'prepareBatch',
  NOT_VERIFIED: 'none',
  REJECTED: 'none',
};

// --- Chaine commerciale --------------------------------------------------

export const BATCH_STATUS_TONE: Record<BatchStatus, AnyTone> = {
  // CREATED et READY sont les valeurs heritees : meme couleur que leur
  // equivalent courant, pour que les lots anciens se lisent comme les neufs.
  CREATED: 'green',
  VERIFIED: 'green',
  READY_FOR_PACKAGING: 'green',
  IN_PACKAGING: 'amber',
  PACKAGED: 'amber',
  READY: 'amber',
  CONVERTED_TO_PRODUCT: 'blue',
  PUBLISHED: 'violet',
  SUSPENDED: 'amber',
  RECALLED: 'red',
};

export const PACKAGING_STATUS_TONE: Record<PackagingStatus, AnyTone> = {
  PLANNED: 'neutral',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
};

export const PRODUCT_STATUS_TONE: Record<ProductStatut, AnyTone> = {
  BROUILLON: 'neutral',
  PUBLIE: 'green',
  RUPTURE: 'amber',
  SUSPENDU: 'red',
  ARCHIVE: 'neutral',
};

export const QR_STATUS_TONE: Record<QrCodeStatus, AnyTone> = {
  ACTIVE: 'green',
  DEACTIVATED: 'red',
};

// Etape suivante proposee pour un lot, selon son etat courant. `null` = aucune
// action automatique : le lot attend une decision humaine (suspension, rappel).
export const NEXT_BATCH_STATUS: Partial<Record<BatchStatus, BatchStatus>> = {
  CREATED: 'READY_FOR_PACKAGING',
  VERIFIED: 'READY_FOR_PACKAGING',
  READY_FOR_PACKAGING: 'IN_PACKAGING',
  IN_PACKAGING: 'PACKAGED',
  PACKAGED: 'CONVERTED_TO_PRODUCT',
  READY: 'CONVERTED_TO_PRODUCT',
  CONVERTED_TO_PRODUCT: 'PUBLISHED',
};
