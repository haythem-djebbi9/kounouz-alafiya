import { useQuery } from '@tanstack/react-query';
import { api } from './api';
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

export interface VerifyResult {
  qrId: string;
  qrCode: string;
  displayStatus: 'VERIFIED' | 'SUSPENDED';
  product: { nom: string; description: string | null; images: string[]; gamme: string | null; categorie: string };
  producer: { name: string; farmName: string; location: string } | null;
  batch: { batchCode: string; honeyType: string; productionDate: string } | null;
  verification: { status: string; verifiedAt: string | null; notes: string | null } | null;
  analysis: { analysisDate: string; status: string; results: Record<string, unknown>; laboratory: string } | null;
}

export function useVerify(identifier: string | undefined) {
  return useQuery({
    queryKey: ['public', 'verify', identifier],
    queryFn: () => api.get<VerifyResult>(`/verify/${identifier}`, { skipAuth: true }),
    enabled: !!identifier,
    retry: false,
  });
}
