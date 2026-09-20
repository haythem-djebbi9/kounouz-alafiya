// Types du portail Équipe de Vérification (backend : /api/verification-portal).
// Les entités partagées avec le reste de l'application restent dans
// lib/api-types.ts ; on ne décrit ici que la surface propre au portail.

import type {
  LabAnalysisStatus,
  Laboratory,
  Producer,
  ReferenceSample,
  ProductVariant,
  Role,
  SampleStatus,
  Seal,
  Verification,
  VerificationRequest,
  VerificationRequestStatus,
  VerificationStatus,
} from '../../lib/api-types';

export type SampleEventType =
  | 'REGISTERED'
  | 'COLLECTED'
  | 'SEALED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'SENT_TO_LAB'
  | 'IN_LABORATORY'
  | 'ANALYSIS_COMPLETED'
  | 'RESULT_ADDED'
  | 'ISSUE'
  | 'RELEASED_FOR_TRANSPORT'
  | 'LOCATION_UPDATE';

export type LabWorkflowStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED';

export type LabTestStatus =
  | 'WITHIN_RANGE'
  | 'OUT_OF_RANGE'
  | 'NOT_DETECTED'
  | 'DETECTED'
  | 'NOT_APPLICABLE';

export type StepState = 'DONE' | 'CURRENT' | 'TODO';

export type RequestTab = 'ALL' | 'UNDER_REVIEW' | 'IN_LABORATORY' | 'VERIFIED' | 'REJECTED';
export type SampleTab = 'ALL' | 'COLLECTED' | 'RECEIVED' | 'IN_LABORATORY' | 'COMPLETED' | 'ISSUES';

export interface TeamMemberRef {
  id: string;
  name: string;
  email?: string;
  role?: Role;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// --- Centre de vérification -------------------------------------------------

export type KpiKey = 'TOTAL' | 'UNDER_REVIEW' | 'IN_LABORATORY' | 'VERIFIED' | 'REJECTED';
export type StatusFamily = Exclude<KpiKey, 'TOTAL'>;

export interface Kpi {
  total: number;
  thisMonth: number;
  lastMonth: number;
  /** null quand le mois de référence est vide : aucune variation calculable. */
  delta: number | null;
}

export interface TrendPoint {
  month: string;
  UNDER_REVIEW: number;
  IN_LABORATORY: number;
  VERIFIED: number;
  REJECTED: number;
}

export interface PortalDashboard {
  kpis: Record<KpiKey, Kpi>;
  trend: TrendPoint[];
  byStatus: { total: number; items: { key: StatusFamily; count: number; percent: number }[] };
  byRegion: { governorate: string; count: number }[];
  recent: PortalRequestListItem[];
}

// --- Revue des demandes ------------------------------------------------------

export interface PortalRequestListItem {
  id: string;
  requestCode: string | null;
  honeyType: string;
  status: VerificationRequestStatus;
  quantity?: string;
  batchNumber?: string | null;
  collectionLocation?: string;
  governorate?: string | null;
  delegation?: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  producer: {
    id: string;
    name: string;
    farmName?: string;
    governorate?: string | null;
    avatarUrl?: string | null;
  };
  assignedTo?: TeamMemberRef | null;
  samples: { id: string; sampleCode?: string | null; status: SampleStatus }[];
  verifications: { id: string; status: VerificationStatus; isDraft: boolean }[];
}

export type RequestProgressStep =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SAMPLE_COLLECTION'
  | 'LABORATORY_ANALYSIS'
  | 'FINAL_DECISION';

export interface RequestComment {
  id: string;
  body: string;
  createdAt: string;
  author: TeamMemberRef;
}

export interface RequestDocumentFile {
  id: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: TeamMemberRef;
}

export interface PortalRequestDetail extends VerificationRequest {
  requestCode: string | null;
  batchNumber: string | null;
  photos: string[];
  internalNotes: string | null;
  infoRequested: string | null;
  reviewedAt: string | null;
  assignedTo: TeamMemberRef | null;
  comments: RequestComment[];
  documents: RequestDocumentFile[];
  progress: { steps: { step: RequestProgressStep; state: StepState }[] };
}

export type ReviewDecision = 'START_REVIEW' | 'APPROVE' | 'REJECT' | 'REQUEST_INFO';

export interface RequestTabCounts {
  ALL: number;
  UNDER_REVIEW: number;
  IN_LABORATORY: number;
  VERIFIED: number;
  REJECTED: number;
  byStatus: Partial<Record<VerificationRequestStatus, number>>;
}

export type PortalRequestsPage = Paginated<PortalRequestListItem> & { counts: RequestTabCounts };

// --- Échantillons -------------------------------------------------------------

export interface SampleEvent {
  id: string;
  type: SampleEventType;
  occurredAt: string;
  note: string | null;
  evidenceUrl: string | null;
  user: TeamMemberRef | null;
}

export interface SampleTimeline {
  steps: { type: SampleEventType; event: SampleEvent | null }[];
  issues: SampleEvent[];
  events: SampleEvent[];
}

export interface PortalSampleListItem {
  id: string;
  sampleCode: string | null;
  status: SampleStatus;
  collectionDate: string;
  collectionMethod: 'KOUNOUZ_VISIT' | 'PRODUCER_DELIVERY' | null;
  location: string;
  quantity: string;
  photos: string[];
  issueReason: string | null;
  createdAt: string;
  request: {
    id: string;
    requestCode: string | null;
    honeyType: string;
    batchNumber: string | null;
    governorate: string | null;
    producer: { id: string; name: string; farmName?: string };
  };
  collectedBy: TeamMemberRef;
  seal: Seal | null;
  labAnalyses: { id: string; status: LabAnalysisStatus; workflowStatus: LabWorkflowStatus }[];
}

export interface SampleStats {
  counts: Record<SampleTab, number>;
  percentages: Record<Exclude<SampleTab, 'ALL'>, number>;
  byStatus: Partial<Record<SampleStatus, number>>;
}

export type PortalSamplesPage = Paginated<PortalSampleListItem> & { stats: SampleStats };

export interface PortalSampleDetail extends Omit<PortalSampleListItem, 'request' | 'labAnalyses'> {
  requestId: string;
  request: VerificationRequest & { producer: Producer };
  referenceSample: ReferenceSample | null;
  labAnalyses: PortalAnalysis[];
  verifications: Verification[];
  timeline: SampleTimeline;
}

// --- Laboratoire ---------------------------------------------------------------

export interface LabParameter {
  key: string;
  kind: 'NUMERIC' | 'QUALITATIVE' | 'ABSENCE';
  unit: string | null;
  min: number | null;
  max: number | null;
  referenceText: string | null;
  position: number;
}

export interface LabTestResult {
  id: string;
  parameterKey: string;
  value: string | null;
  unit: string | null;
  referenceMin: string | null;
  referenceMax: string | null;
  referenceText: string | null;
  status: LabTestStatus;
  details: Record<string, unknown> | null;
  position: number;
}

export interface LabAnalysisFile {
  id: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy?: TeamMemberRef;
}

export interface PortalAnalysis {
  id: string;
  analysisCode: string | null;
  reportNumber: string | null;
  sampleId: string;
  labId: string;
  analysisDate: string;
  assignmentDate: string | null;
  expectedCompletion: string | null;
  completedAt: string | null;
  status: LabAnalysisStatus;
  workflowStatus: LabWorkflowStatus;
  conclusion: string | null;
  internalNotes: string | null;
  laboratory?: Laboratory;
  assignedTo?: TeamMemberRef | null;
  testResults: LabTestResult[];
  files: LabAnalysisFile[];
}

export interface PreviousResult extends LabTestResult {
  analysis: {
    id: string;
    analysisCode: string | null;
    analysisDate: string;
    assignedTo: { name: string } | null;
  };
}

export interface PortalAnalysisDetail extends PortalAnalysis {
  sample: PortalSampleDetail;
  previousResults: PreviousResult[];
}

export interface LabQueueItem {
  id: string;
  sampleCode: string | null;
  status: SampleStatus;
  collectionDate: string;
  request: {
    id: string;
    requestCode: string | null;
    honeyType: string;
    batchNumber: string | null;
    producer: { id: string; name: string };
  };
  labAnalyses: {
    id: string;
    analysisCode: string | null;
    status: LabAnalysisStatus;
    workflowStatus: LabWorkflowStatus;
  }[];
}

// --- Étalons ---------------------------------------------------------------------

export interface ReferenceHoney {
  id: string;
  code: string;
  honeyType: string;
  region: string;
  harvestSeason: string;
  collectionDate: string | null;
  color: string | null;
  texture: string | null;
  floralSource: string | null;
  notes?: string | null;
  photos: string[];
  analysisResults?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: TeamMemberRef | null;
}

export interface ReferenceHoneyStats {
  total: number;
  active: number;
  honeyTypes: number;
  regions: number;
  facets: {
    honeyType: { value: string; count: number }[];
    region: { value: string; count: number }[];
    harvestSeason: { value: string; count: number }[];
  };
}

export type ReferenceHoneysPage = Paginated<ReferenceHoney> & { stats: ReferenceHoneyStats };

// --- Décision ---------------------------------------------------------------------

export type DecisionStep =
  | 'SAMPLE_RECEIVED'
  | 'IN_LABORATORY'
  | 'ANALYSIS_COMPLETED'
  | 'RESULTS_REVIEWED'
  | 'FINAL_DECISION';

export type DecisionOutcome = 'APPROVE' | 'REJECT' | 'REQUEST_ADDITIONAL_ANALYSIS';

export type EvaluationVerdict =
  | 'VALID'
  | 'COMPLIANT'
  | 'CONFIRMED'
  | 'APPROVED'
  | 'FAILED'
  | 'PENDING';

export type EvaluationCriterion =
  | 'authenticity'
  | 'physicochemical'
  | 'pollen'
  | 'antibiotics'
  | 'overall';

export type DecisionEvaluation = Partial<Record<EvaluationCriterion, EvaluationVerdict>>;

export interface DecisionQueueItem extends PortalAnalysis {
  sample: PortalSampleListItem;
  draft: {
    id: string;
    verificationCode: string | null;
    status: VerificationStatus;
    updatedAt: string;
  } | null;
}

// `sample` est repris sous sa forme allégée du portail (code lisible, demande
// et producteur embarqués), d'où le retrait du champ hérité de Verification.
export type EvidenceKey =
  | 'CONTROLLED_SAMPLE'
  | 'SEAL_INTACT'
  | 'CUSTODY_TO_LAB'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_COMPLIANT'
  | 'REFERENCE_SAMPLE_STORED';

/** Pièce du dossier exigée avant décision (VER-02). */
export interface EvidenceItem {
  key: EvidenceKey;
  ok: boolean;
  requiredForVerified: boolean;
  requiredForAnyDecision: boolean;
  detail: string;
}

export interface PortalDecisionDetail extends Omit<Verification, 'sample' | 'analysis'> {
  verificationCode: string | null;
  isDraft: boolean;
  evaluation: DecisionEvaluation | null;
  analysis: PortalAnalysis & { laboratory: Laboratory };
  sample: PortalSampleListItem;
  steps: { step: DecisionStep; state: StepState; at: string | null }[];
  evidence?: EvidenceItem[];
}

// ---------------------------------------------------------------------------
// Chaîne commerciale : lot vérifié -> emballage -> produit -> QR (§13 à §17)
// ---------------------------------------------------------------------------

export type BatchStatus =
  | 'CREATED'
  | 'VERIFIED'
  | 'READY_FOR_PACKAGING'
  | 'IN_PACKAGING'
  | 'PACKAGED'
  | 'READY'
  | 'CONVERTED_TO_PRODUCT'
  | 'PUBLISHED'
  | 'SUSPENDED'
  | 'RECALLED';

export type BatchBucket = 'ALL' | 'READY_FOR_PACKAGING' | 'IN_PACKAGING' | 'CONVERTED' | 'ON_HOLD';

export type PackagingStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

export type QrCodeStatus = 'ACTIVE' | 'DEACTIVATED';

export type ProductStatut = 'BROUILLON' | 'PUBLIE' | 'RUPTURE' | 'SUSPENDU' | 'ARCHIVE';

// --- Lots (B01 / B04) --------------------------------------------------------

export interface BatchListItem {
  id: string;
  batchCode: string;
  honeyType: string;
  quantityKg: string;
  productionDate: string;
  expiryDate: string | null;
  bestBefore: string | null;
  origin: string | null;
  harvestSeason: string | null;
  status: BatchStatus;
  holdReason: string | null;
  createdAt: string;
  verification: {
    id: string;
    verificationCode: string | null;
    status: string;
    verifiedAt: string | null;
    request: {
      id: string;
      requestCode: string | null;
      governorate: string | null;
      producer: { id: string; name: string; farmName?: string };
    };
  };
  packaging: { id: string; status: PackagingStatus; packageType: string; size: string } | null;
  products: { id: string; nom: string; statut: ProductStatut }[];
  _count: { qrCodes: number };
}

export interface BatchStats {
  counts: Record<BatchBucket, number>;
  byStatus: Partial<Record<BatchStatus, number>>;
}

export type BatchesPage = Paginated<BatchListItem> & { stats: BatchStats };

export interface EligibleVerification {
  id: string;
  verificationCode: string | null;
  verifiedAt: string | null;
  request: {
    id: string;
    requestCode: string | null;
    honeyType: string;
    quantity: string;
    governorate: string | null;
    productionSeason: string | null;
    producer: { id: string; name: string };
  };
}

export type BatchTimelineStep =
  | 'SAMPLE_COLLECTED'
  | 'ANALYSIS_COMPLETED'
  | 'REFERENCE_STORED'
  | 'VERIFICATION_DECISION'
  | 'BATCH_VERIFIED'
  | 'PACKAGING';

export interface BatchTimelineEntry {
  step: BatchTimelineStep;
  at: string | null;
  by: string | null;
}

export interface BatchDetail extends Omit<BatchListItem, 'packaging' | 'products' | 'verification'> {
  notes: string | null;
  verification: PortalDecisionDetail & {
    sample: PortalSampleDetail;
    analysis: PortalAnalysis & { laboratory: Laboratory };
  };
  packaging: (PackagingDetail & { units: PackagingUnit[] }) | null;
  products: BatchProduct[];
  qrGenerations: QrGeneration[];
}

// --- Emballage (B02) ----------------------------------------------------------

export interface PackagingUnit {
  id: string;
  unitCode: string;
  unitSize: string;
  quantity: number;
  packagingDate: string | null;
  expiryDate: string | null;
  status: PackagingStatus;
}

export interface PackagingDetail {
  id: string;
  batchId: string;
  packageType: string;
  size: string;
  labelDesign: string | null;
  productionDate: string;
  expiryDate: string | null;
  packagingLine: string | null;
  unitsPlanned: number | null;
  notes: string | null;
  status: PackagingStatus;
  units: PackagingUnit[];
  progress: {
    unitsPlanned: number;
    unitsTotal: number;
    unitsCompleted: number;
    remaining: number;
  };
  batch?: BatchListItem;
}

export interface PackagingQueueItem {
  id: string;
  batchCode: string;
  honeyType: string;
  quantityKg: string;
  status: BatchStatus;
  productionDate: string;
  verification: { request: { producer: { name: string } } };
  packaging: { id: string; status: PackagingStatus; _count: { units: number } } | null;
}

// --- Produits (B03) ------------------------------------------------------------

export interface ProductDocumentFile {
  id: string;
  type: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy?: TeamMemberRef;
}

export interface BatchProduct {
  id: string;
  nom: string;
  description: string | null;
  prix: string;
  stock: number;
  images: string[];
  gamme: string | null;
  statut: ProductStatut;
  netWeightG: number | null;
  ingredients: string | null;
  storageInstructions: string | null;
  shelfLife: string | null;
  tags: string[];
  createdAt: string;
  categorie?: { id: string; nom: string };
  documents?: ProductDocumentFile[];
  qrCodes?: { id: string; qrId: string; qrCode: string }[];
  _count?: { qrCodes: number };
  batch?: BatchListItem;
  productCode?: string | null;
  variants?: ProductVariant[];
}

export interface ProductQueueItem {
  id: string;
  batchCode: string;
  honeyType: string;
  quantityKg: string;
  origin: string | null;
  harvestSeason: string | null;
  status: BatchStatus;
  productionDate: string;
  verification: { request: { producer: { id: string; name: string } } };
  packaging: { packageType: string; size: string; status: PackagingStatus } | null;
  products: { id: string; nom: string; statut: ProductStatut }[];
}

// --- QR (Q01 / Q02) --------------------------------------------------------------

export interface QrOptions {
  includeBatchNumber?: boolean;
  includeSecurityFeatures?: boolean;
  addSerialNumber?: boolean;
  enableTracking?: boolean;
}

export interface QrGeneration {
  id: string;
  batchId: string;
  productId: string | null;
  quantity: number;
  qrType: string;
  qrFormat: string;
  destinationUrl: string;
  language: string;
  template: string;
  options: QrOptions;
  createdAt: string;
  createdBy?: TeamMemberRef;
  batch?: { id: string; batchCode: string; honeyType: string; status: BatchStatus };
  qrCodes?: QrCodeListItem[];
  _count?: { qrCodes: number };
}

export interface QrCodeListItem {
  id: string;
  qrId: string;
  qrCode: string;
  serialNumber: string | null;
  status: QrCodeStatus;
  isActive: boolean;
  createdAt: string;
  product: { id: string; nom: string; statut: ProductStatut } | null;
  batch: { id: string; batchCode: string; honeyType: string; status: BatchStatus } | null;
  _count: { scans: number };
}

export interface QrStats {
  total: number;
  active: number;
  deactivated: number;
  scanned: number;
  products: number;
  percentages: { active: number; deactivated: number; scanned: number };
}

export type QrCodesPage = Paginated<QrCodeListItem> & { stats: QrStats };

export interface QrScan {
  id: string;
  scannedAt: string;
  location: string | null;
  country: string | null;
  deviceInfo: string | null;
  riskScore: number;
  flagged: boolean;
}

export interface QrCodeDetail extends QrCodeListItem {
  generation: { id: string; template: string; language: string; createdAt: string } | null;
  scans: QrScan[];
  publicUrl: string;
}

export interface QrQueueItem {
  id: string;
  nom: string;
  statut: ProductStatut;
  netWeightG: number | null;
  batch: {
    id: string;
    batchCode: string;
    honeyType: string;
    status: BatchStatus;
    productionDate: string;
    expiryDate: string | null;
    packaging: { packageType: string; size: string } | null;
  } | null;
  _count: { qrCodes: number };
}
