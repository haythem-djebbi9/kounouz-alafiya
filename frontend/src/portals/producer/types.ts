// Types du portail producteur — calqués sur les réponses des endpoints
// dédiés (voir backend : producers, producer-documents, samples/producer,
// batches/mine, products/mine, orders/producer/sales, settlements/mine).

import type {
  BatchStatus,
  LabAnalysisStatus,
  ProductStatut,
  SampleStatus,
  SealStatus,
  VerificationStatus,
} from '../../lib/api-types';

export type ProducerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type CollectionMethod = 'KOUNOUZ_VISIT' | 'PRODUCER_DELIVERY';
export type FloralCategory = 'MONOFLORAL' | 'MULTIFLORAL';

export interface ProducerProfile {
  id: string;
  userId: string;
  name: string;
  farmName: string;
  location: string;
  description: string | null;
  isVerified: boolean;
  status: ProducerStatus;
  phone: string | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  address: string | null;
  governorate: string | null;
  postalCode: string | null;
  avatarUrl: string | null;
  activityType: string | null;
  registrationStatus: string | null;
  registrationNumber: string | null;
  farmGovernorate: string | null;
  farmDelegation: string | null;
  farmAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  farmPhotos: string[];
  hivesCount: number | null;
  productionStartMonth: number | null;
  productionEndMonth: number | null;
  mainFlora: string[];
  annualProductionKg: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  iban: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProducerProfileInput = Partial<
  Omit<ProducerProfile, 'id' | 'userId' | 'isVerified' | 'status' | 'createdAt' | 'updatedAt' | 'annualProductionKg'>
> & { annualProductionKg?: number | null };

export type DocumentType =
  | 'NATIONAL_ID'
  | 'FARM_REGISTRATION'
  | 'BEEKEEPING_LICENSE'
  | 'TAX_ID'
  | 'PROOF_OF_ADDRESS'
  | 'OTHER';
export type DocumentStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface ProducerDocument {
  id: string;
  producerId: string;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// Statuts réels renvoyés par l'API (voir VerificationRequestStatus côté serveur).
export type RequestStatus =
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

export interface ProducerRequest {
  id: string;
  producerId: string;
  honeyType: string;
  description: string | null;
  collectionLocation: string;
  quantity: string;
  status: RequestStatus;
  requestCode: string | null;
  submittedAt: string | null;
  farmSize: string | null;
  floralOrigin: string | null;
  floralCategory: FloralCategory | null;
  productionSeason: string | null;
  harvestStartDate: string | null;
  harvestEndDate: string | null;
  governorate: string | null;
  delegation: string | null;
  latitude: number | null;
  longitude: number | null;
  hivesCount: number | null;
  beekeepingMethod: string | null;
  hiveType: string | null;
  preferredCollectionMethod: CollectionMethod | null;
  // Question posée par Kounouz quand la demande est en attente d'information.
  infoRequested?: string | null;
  farmId?: string | null;
  farm?: { id: string; farmCode: string; name: string; governorate: string | null; delegation: string | null } | null;
  createdAt: string;
  updatedAt: string;
  samples?: {
    id: string;
    status: SampleStatus;
    collectionDate: string;
    seal: { sealCode: string; status: SealStatus; sealedAt: string } | null;
    labAnalyses: { id: string; status: LabAnalysisStatus; analysisDate: string }[];
  }[];
  verifications?: { id: string; status: VerificationStatus; verifiedAt: string | null; notes: string | null; createdAt: string }[];
}

export interface RequestInput {
  honeyType?: string;
  description?: string;
  quantity?: number;
  farmSize?: string;
  floralOrigin?: string;
  floralCategory?: FloralCategory;
  productionSeason?: string;
  harvestStartDate?: string;
  harvestEndDate?: string;
  governorate?: string;
  delegation?: string;
  latitude?: number;
  longitude?: number;
  hivesCount?: number;
  beekeepingMethod?: string;
  hiveType?: string;
  preferredCollectionMethod?: CollectionMethod;
  farmId?: string;
  submit?: boolean;
}

/** Rucher du producteur (un producteur peut en exploiter plusieurs). */
export interface Farm {
  id: string;
  farmCode: string;
  name: string;
  governorate: string | null;
  delegation: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hivesCount: number | null;
  mainFlora: string[];
  beekeepingMethod: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { verificationRequests: number };
}

export interface FarmInput {
  name: string;
  governorate?: string;
  delegation?: string;
  address?: string;
  hivesCount?: number;
  mainFlora?: string[];
  beekeepingMethod?: string;
}

/** Réponse à une demande d'informations complémentaires (champs du producteur). */
export interface InfoResponseInput {
  message: string;
  description?: string;
  quantity?: number;
  hivesCount?: number;
  farmId?: string;
}

export interface ProducerSample {
  id: string;
  requestId: string;
  collectionDate: string;
  location: string;
  quantity: string;
  status: SampleStatus;
  createdAt: string;
  updatedAt: string;
  request: { id: string; requestCode: string | null; honeyType: string; preferredCollectionMethod: CollectionMethod | null };
  collectedBy: { name: string };
  seal: { id: string; sealCode: string; status: SealStatus; sealedAt: string } | null;
  labAnalyses: { id: string; status: LabAnalysisStatus; analysisDate: string; laboratory: { name: string } }[];
  verifications: { status: VerificationStatus; verifiedAt: string | null }[];
  custodyEvents: { action: string; createdAt: string }[];
}

export interface ProducerBatch {
  id: string;
  batchCode: string;
  honeyType: string;
  quantityKg: string;
  productionDate: string;
  status: BatchStatus;
  createdAt: string;
  verification: {
    id: string;
    status: VerificationStatus;
    verifiedAt: string | null;
    request: { id: string; requestCode: string | null; collectionLocation: string; floralCategory: FloralCategory | null };
    sample: { id: string; seal: { sealCode: string } | null };
    analysis: { status: LabAnalysisStatus; analysisDate: string };
  };
  packaging: { packageType: string; size: string; productionDate: string; status: 'IN_PROGRESS' | 'COMPLETED' } | null;
  products: { id: string; nom: string; statut: ProductStatut; stock: number; qrCode: { qrId: string; qrCode: string } | null }[];
}

export interface ProducerProduct {
  id: string;
  nom: string;
  description: string | null;
  prix: string;
  stock: number;
  images: string[];
  gamme: string | null;
  statut: ProductStatut;
  createdAt: string;
  categorie: { id: string; nom: string };
  packaging: { size: string; packageType: string } | null;
  qrCode: { qrId: string; qrCode: string } | null;
  batch: {
    id: string;
    batchCode: string;
    status: BatchStatus;
    honeyType: string;
    verification: {
      status: VerificationStatus;
      verifiedAt: string | null;
      request: { floralCategory: FloralCategory | null; collectionLocation: string };
    };
  } | null;
  unitsSold: number;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type SalesChannel = 'ONLINE_STORE' | 'MARKETPLACE' | 'RETAIL_PARTNER';

export interface SaleItem {
  id: string;
  productId: string;
  // Format vendu (SKU) — absent sur les ventes antérieures aux SKU.
  variantId?: string | null;
  sku?: string | null;
  productName: string;
  packageSize: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  commissionRate: string;
  commissionAmount: string;
  netAmount: string;
  product: { images: string[]; batch: { batchCode: string } | null };
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    channel: SalesChannel;
    city: string;
    createdAt: string;
    deliveredAt: string | null;
  };
}

export interface SalesResponse {
  commissionRate: number;
  items: SaleItem[];
}

export type SettlementStatus = 'OPEN' | 'PROCESSING' | 'PAID';

export interface PaymentInfo {
  paymentMethod: string | null;
  bankName: string | null;
  iban: string | null;
}

export interface Settlement {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  expectedPayoutDate: string;
  status: SettlementStatus;
  orderCount: number;
  itemsSold: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  commissionRate: number;
  paidAt: string | null;
  reference: string | null;
}

export interface SettlementsResponse {
  commissionRate: number;
  payment: PaymentInfo;
  settlements: Settlement[];
}

export interface SettlementDetail extends Settlement {
  producer: { name: string; farmName: string };
  payment: PaymentInfo;
  items: SaleItem[];
}
