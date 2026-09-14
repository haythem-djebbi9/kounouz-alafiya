import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Product, ProductStatut } from '../../../lib/api-types';

export function useAdminProducts(statut?: ProductStatut) {
  return useQuery({
    queryKey: ['admin', 'products', statut ?? 'all'],
    queryFn: () => api.get<Product[]>(`/products${statut ? `?statut=${statut}` : ''}`),
  });
}

export function useAdminProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'products', 'detail', id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export interface ProductFormInput {
  categorieId: string;
  nom: string;
  description?: string;
  prix: number;
  stock?: number;
  images?: string[];
  gamme?: string;
  batchId?: string;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductFormInput) => api.post<Product>('/products', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ProductFormInput & { id: string }) =>
      api.patch<Product>(`/products/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}

export function useUpdateProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: 'PUBLIE' | 'RUPTURE' | 'SUSPENDU' }) =>
      api.patch<Product>(`/products/${id}/status`, { statut }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}
