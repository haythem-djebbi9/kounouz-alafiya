import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './api';
import { buildScanParams, getVisitorId } from './scan-context';
import type { Categorie } from './api-types';

export interface PublicProduct {
  id: string;
  nom: string;
  description: string | null;
  prix: string;
  stock: number;
  images: string[];
  gamme: string | null;
  categorie: Categorie;
  qrCode: { qrId: string; qrCode: string } | null;
  packaging: { size: string } | null;
  variants?: {
    id: string;
    sku: string;
    packageSize: string;
    netWeightG: number | null;
    price: string;
    stock: number;
    isDefault: boolean;
  }[];
  batch: {
    batchCode: string;
    honeyType: string;
    verification: { request: { producer: { name: string; farmName: string; location: string } } } | null;
  } | null;
}

export function usePublicCategories() {
  return useQuery({
    queryKey: ['public', 'categories'],
    queryFn: () => api.get<Categorie[]>('/categories', { skipAuth: true }),
    staleTime: 5 * 60_000,
  });
}

export function usePublicProducts(categorieSlug?: string) {
  return useQuery({
    queryKey: ['public', 'products', categorieSlug ?? 'all'],
    queryFn: () =>
      api.get<PublicProduct[]>(`/products/catalog${categorieSlug ? `?categorie=${categorieSlug}` : ''}`, {
        skipAuth: true,
      }),
    staleTime: 60_000,
  });
}

/**
 * Codes QR proposés en essai sur la vitrine, pris parmi les produits
 * réellement en vente. Écrits en dur, ils divergeaient d'un environnement à
 * l'autre : ceux du jeu de démonstration (…000001) n'existent pas en
 * production, et le visiteur qui les essayait tombait sur « introuvable ».
 */
export function useSampleQrCodes(limit = 2): string[] {
  const { data } = usePublicProducts();
  return (data ?? [])
    .map((product) => product.qrCode?.qrCode)
    .filter((code): code is string => !!code)
    .slice(0, limit);
}

/** Provenance du lot et analyse publiée, jointes à la fiche produit. */
export interface PublicLabReport {
  batchCode: string;
  honeyType: string;
  origin: string | null;
  harvestSeason: string | null;
  /** Conditionnement : après la vérification, jamais avant. */
  packagingDate: string;
  bestBefore: string | null;
  verifiedAt: string | null;
  producer: { name: string; farmName: string; location: string } | null;
  analysis: {
    analysisDate: string;
    status: string;
    laboratory: { name: string; accreditationNo: string; country: string };
    parameters: PublicLabParameter[];
  } | null;
}

export function usePublicProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['public', 'products', 'detail', id],
    queryFn: () =>
      api.get<PublicProduct & { labReport?: PublicLabReport | null }>(`/products/catalog/${id}`, { skipAuth: true }),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export interface PublicLabParameter {
  parameterKey: string;
  value: string | null;
  unit: string | null;
  status: 'WITHIN_RANGE' | 'OUT_OF_RANGE' | 'NOT_DETECTED' | 'DETECTED' | 'NOT_APPLICABLE';
  reference: string | null;
}

export interface VerifyResult {
  qrId: string;
  qrCode: string;
  // RECALLED : lot rappelé — affiché distinctement d'une suspension (§17).
  displayStatus: 'VERIFIED' | 'SUSPENDED' | 'RECALLED';
  product: {
    id: string;
    /** En vente : le lien « Acheter » n'apparaît que dans ce cas. */
    purchasable: boolean;
    nom: string;
    description: string | null;
    images: string[];
    gamme: string | null;
    categorie: string;
  };
  producer: { name: string; farmName: string; location: string } | null;
  // packagingDate : le lot est conditionné après la décision de vérification,
  // jamais avant. La récolte (harvestSeason) précède l'analyse.
  batch: {
    batchCode: string;
    honeyType: string;
    packagingDate: string;
    harvestSeason: string | null;
    bestBefore: string | null;
    origin: string | null;
  } | null;
  /** Historique public du code : nombre de vérifications et première date. */
  scans: { count: number; firstScannedAt: string | null; suspicious: boolean };
  // Pas de `notes` : les commentaires de décision restent internes (§10).
  verification: { status: string; verifiedAt: string | null } | null;
  analysis: {
    analysisDate: string;
    status: string;
    laboratory: string;
    // Représentation publique approuvée du bulletin (paramètres normés).
    parameters: PublicLabParameter[];
  } | null;
}

export function useVerify(identifier: string | undefined) {
  return useQuery({
    queryKey: ['public', 'verify', identifier],
    queryFn: async () => {
      const params = new URLSearchParams(await buildScanParams()).toString();
      return api.get<VerifyResult>(`/verify/${encodeURIComponent(identifier ?? '')}${params ? `?${params}` : ''}`, { skipAuth: true });
    },
    enabled: !!identifier,
    retry: false,
  });
}

export type LabelReportReason = 'DAMAGED_SEAL' | 'LABEL_MISMATCH' | 'SUSPICIOUS_PRODUCT' | 'OTHER';

/** Signalement d'une étiquette abîmée ou suspecte : ouvre une alerte anti-contrefaçon. */
export function useReportLabel(identifier: string | undefined) {
  return useMutation({
    mutationFn: (input: { reason: LabelReportReason; comment?: string }) =>
      api.post<void>(`/verify/${encodeURIComponent(identifier ?? '')}/report`, { ...input, visitorId: getVisitorId() }, { skipAuth: true }),
  });
}
