import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Batch, Packaging } from '../../../lib/api-types';

export function useBatches() {
  return useQuery({
    queryKey: ['admin', 'batches'],
    queryFn: () => api.get<Batch[]>('/batches'),
  });
}

export interface CreateBatchInput {
  verificationId: string;
  quantityKg: number;
  productionDate: string;
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBatchInput) => api.post<Batch>('/batches', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'batches'] }),
  });
}

export function usePackagings() {
  return useQuery({
    queryKey: ['admin', 'packagings'],
    queryFn: () => api.get<Packaging[]>('/packagings'),
  });
}

export interface CreatePackagingInput {
  batchId: string;
  packageType: string;
  size: string;
  labelDesign?: string;
  productionDate: string;
}

export function useCreatePackaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePackagingInput) => api.post<Packaging>('/packagings', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'packagings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'batches'] });
    },
  });
}

export function useCompletePackaging() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Packaging>(`/packagings/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'packagings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'batches'] });
    },
  });
}
