// Types calqués sur les modèles Prisma du backend (voir backend/prisma/schema.prisma).

export type Role = 'ADMIN' | 'VERIFICATION_TEAM' | 'FIELD_AGENT' | 'PRODUCER' | 'CONSUMER';

export interface Producer {
  id: string;
  userId: string;
  name: string;
  farmName: string;
  location: string;
  description: string | null;
  isVerified: boolean;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  phone?: string | null;
  governorate?: string | null;
  farmGovernorate?: string | null;
  farmDelegation?: string | null;
  hivesCount?: number | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { email: string; isActive: boolean; createdAt: string };
}

export interface Consumer {
  id: string;
  userId: string;
  name: string;
  country: string | null;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  language: string;
  mutedNotificationTypes: string[];
  passwordChangedAt: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  producer: Producer | null;
  consumer: Consumer | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// Le producteur ne pilote que DRAFT -> NEW ; les statuts suivants reflètent
// l'avancement réel du dossier côté Kounouz (collecte, analyse, décision).
export type VerificationRequestStatus =
  | 'DRAFT'
  | 'NEW'
  | 'IN_REVIEW'
  | 'INFO_REQUESTED'
  | 'ACCEPTED'
  | 'COLLECTION_SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'UNDER_ANALYSIS'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'REJECTED';
// RECEIVED = réceptionné chez Kounouz ; RECEIVED_AT_LAB = confié au laboratoire.
export type SampleStatus =
  | 'COLLECTED'
  | 'SEALED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'RECEIVED_AT_LAB'
  | 'ANALYZED'
  | 'ISSUE';
export type SealStatus = 'INTACT' | 'BROKEN';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'NOT_VERIFIED' | 'ADDITIONAL_ANALYSIS';
export type LabAnalysisStatus = 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT';
export type BatchStatus = 'CREATED' | 'PACKAGED' | 'READY';
export type PackagingStatus = 'IN_PROGRESS' | 'COMPLETED';
export type ProductStatut = 'BROUILLON' | 'PUBLIE' | 'RUPTURE' | 'SUSPENDU' | 'ARCHIVE';

export interface Seal {
  id: string;
  sampleId: string;
  sealCode: string;
  isSealed: boolean;
  sealedAt: string;
  status: SealStatus;
  createdAt: string;
}

export interface Laboratory {
  id: string;
  name: string;
  accreditationNo: string;
  country: string;
  contactInfo: string;
}

export interface LabAnalysis {
  id: string;
  sampleId: string;
  labId: string;
  analysisDate: string;
  reportFileUrl: string | null;
  status: LabAnalysisStatus;
  results: Record<string, unknown>;
  createdAt: string;
  sample?: Sample;
  laboratory?: Laboratory;
}

/** Déclinaison commerciale (SKU) : un format de pot, son prix et son stock. */
export interface ProductVariant {
  id: string;
  productId?: string;
  sku: string;
  packageSize: string;
  netWeightG: number | null;
  unit?: string;
  price: string | number;
  stock: number;
  status?: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
}

export type ReferenceSampleStatus = 'STORED' | 'USED_FOR_RETEST' | 'DISPOSED';

export interface ReferenceSample {
  id: string;
  sampleId: string;
  referenceCode: string;
  storageLocation: string;
  storedAt: string;
  storageConditions: string;
  retentionPeriod: string;
  status?: ReferenceSampleStatus;
  condition?: string | null;
  storedById?: string | null;
  sample?: Sample;
}

export interface Verification {
  id: string;
  requestId: string;
  sampleId: string;
  analysisId: string;
  status: VerificationStatus;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  request?: VerificationRequest;
  sample?: Sample;
  analysis?: LabAnalysis;
  decidedBy?: { id: string; name: string; email: string };
  batch?: Batch | null;
}

export interface Batch {
  id: string;
  verificationId: string;
  batchCode: string;
  honeyType: string;
  quantityKg: string;
  productionDate: string;
  status: BatchStatus;
  createdAt: string;
  verification?: Verification;
  packaging?: Packaging | null;
  products?: Product[];
}

export interface Packaging {
  id: string;
  batchId: string;
  packageType: string;
  size: string;
  labelDesign: string | null;
  productionDate: string;
  status: PackagingStatus;
  createdAt: string;
  batch?: Batch;
}

export interface Sample {
  id: string;
  requestId: string;
  collectedById: string;
  collectionDate: string;
  location: string;
  quantity: string;
  photos: string[];
  status: SampleStatus;
  createdAt: string;
  request?: VerificationRequest;
  collectedBy?: { id: string; name: string; email: string };
  seal?: Seal | null;
  labAnalyses?: LabAnalysis[];
  referenceSample?: ReferenceSample | null;
}

export interface VerificationRequest {
  id: string;
  producerId: string;
  honeyType: string;
  description: string | null;
  collectionLocation: string;
  quantity: string;
  status: VerificationRequestStatus;
  requestCode?: string | null;
  submittedAt?: string | null;
  preferredCollectionMethod?: 'KOUNOUZ_VISIT' | 'PRODUCER_DELIVERY' | null;
  floralOrigin?: string | null;
  floralCategory?: 'MONOFLORAL' | 'MULTIFLORAL' | null;
  productionSeason?: string | null;
  harvestStartDate?: string | null;
  harvestEndDate?: string | null;
  governorate?: string | null;
  delegation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hivesCount?: number | null;
  beekeepingMethod?: string | null;
  hiveType?: string | null;
  farmSize?: string | null;
  createdAt: string;
  updatedAt: string;
  producer?: Producer;
  samples?: Sample[];
  verifications?: Verification[];
}

export interface Categorie {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  ordre: number;
  parentId: string | null;
  actif: boolean;
  children?: Categorie[];
}

export interface QrCode {
  id: string;
  productId: string;
  qrCode: string;
  qrId: string;
  isActive: boolean;
  createdAt: string;
  product?: Product;
  _count?: { scans: number };
}

export interface QrScan {
  id: string;
  qrCodeId: string;
  scannedAt: string;
  location: string | null;
  deviceInfo: string | null;
  country: string | null;
  riskScore: number;
  flagged: boolean;
  qrCode?: QrCode;
}

export interface Product {
  id: string;
  packagingId: string | null;
  categorieId: string;
  batchId: string | null;
  nom: string;
  description: string | null;
  prix: string;
  stock: number;
  images: string[];
  gamme: string | null;
  statut: ProductStatut;
  createdAt: string;
  updatedAt: string;
  categorie: Categorie;
  batch?: Batch | null;
  packaging?: Packaging | null;
  qrCode?: { qrId: string; qrCode: string } | null;
}

// Alias : fiche produit du catalogue public (mêmes champs, usage marketplace).
export type ProduitPublic = Product;

export interface OperationsSummary {
  requestsByStatus: Record<VerificationRequestStatus, number>;
  samplesByStatus: Record<SampleStatus, number>;
  verificationsByStatus: Record<VerificationStatus, number>;
  verificationRate: number;
  batchesByStatus: Record<BatchStatus, number>;
  productsByStatut: Record<ProductStatut, number>;
  totals: { producers: number; verifiedProducers: number; publishedProducts: number };
}

export interface ByProducerRow {
  producerId: string;
  name: string;
  farmName: string;
  location: string;
  totalRequests: number;
  accepted: number;
  rejected: number;
  pending: number;
  verifiedCount: number;
  notVerifiedCount: number;
  totalBatchedKg: number;
}

export interface AntiFraudStats {
  totalScans: number;
  flaggedScans: number;
  flaggedRate: number;
  scansByCountry: { country: string; count: number }[];
  topFlaggedProducts: { productId: string; nom: string; count: number }[];
}
