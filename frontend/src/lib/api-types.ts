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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  producer: Producer | null;
  consumer: Consumer | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export type VerificationRequestStatus = 'NEW' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
export type SampleStatus = 'COLLECTED' | 'SEALED' | 'IN_TRANSIT' | 'RECEIVED_AT_LAB' | 'ANALYZED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'NOT_VERIFIED';
export type LabAnalysisStatus = 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT';
export type BatchStatus = 'CREATED' | 'PACKAGED' | 'READY';
export type ProductStatut = 'BROUILLON' | 'PUBLIE' | 'RUPTURE' | 'SUSPENDU';

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
  seal?: { id: string; sealCode: string; sealedAt: string } | null;
  labAnalyses?: LabAnalysis[];
  referenceSample?: { referenceCode: string } | null;
}

export interface LabAnalysis {
  id: string;
  sampleId: string;
  labId: string;
  analysisDate: string;
  status: LabAnalysisStatus;
  results: Record<string, unknown>;
}

export interface Verification {
  id: string;
  requestId: string;
  sampleId: string;
  analysisId: string;
  status: VerificationStatus;
  verifiedAt: string | null;
  notes: string | null;
}

export interface Batch {
  id: string;
  batchCode: string;
  honeyType: string;
  quantityKg: string;
  status: BatchStatus;
}

export interface VerificationRequest {
  id: string;
  producerId: string;
  honeyType: string;
  description: string | null;
  collectionLocation: string;
  quantity: string;
  status: VerificationRequestStatus;
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
}

export interface ProduitPublic {
  id: string;
  nom: string;
  description: string | null;
  prix: string;
  stock: number;
  images: string[];
  gamme: string | null;
  statut: ProductStatut;
  categorie: Categorie;
  qrCode: { qrId: string; qrCode: string } | null;
}
