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

export function usePublicProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['public', 'products', 'detail', id],
    queryFn: () => api.get<PublicProduct>(`/products/catalog/${id}`, { skipAuth: true }),
    enabled: !!id,
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
  product: { nom: string; description: string | null; images: string[]; gamme: string | null; categorie: string };
  producer: { name: string; farmName: string; location: string } | null;
  batch: { batchCode: string; honeyType: string; productionDate: string } | null;
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
