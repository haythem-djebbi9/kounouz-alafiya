import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Sample, VerificationRequest } from '../../lib/api-types';

export function usePendingCollections() {
  return useQuery({
    queryKey: ['verification-requests', 'pending-collection'],
    queryFn: () => api.get<VerificationRequest[]>('/verification-requests/pending-collection'),
  });
}

export function useMySamples() {
  return useQuery({
    queryKey: ['samples', 'mine'],
    queryFn: () => api.get<Sample[]>('/samples/mine'),
  });
}

export function useSampleDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['samples', id],
    queryFn: () => api.get<Sample>(`/samples/${id}`),
    enabled: !!id,
  });
}

export function useRequestDetailForAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['verification-requests', id],
    queryFn: () => api.get<VerificationRequest>(`/verification-requests/${id}`),
    enabled: !!id,
  });
}

export interface CreateSampleInput {
  requestId: string;
  collectionDate: string;
  location: string;
  quantity: number;
  photos: string[];
}

function invalidateSampleQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['samples'] });
  queryClient.invalidateQueries({ queryKey: ['verification-requests', 'pending-collection'] });
}

export function useCreateSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSampleInput) => api.post<Sample>('/samples', input),
    onSuccess: () => invalidateSampleQueries(queryClient),
  });
}

export function useApplySeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sampleId: string) => api.post('/seals', { sampleId }),
    onSuccess: () => invalidateSampleQueries(queryClient),
  });
}

export function useMarkInTransit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sampleId: string) => api.patch<Sample>(`/samples/${sampleId}/in-transit`),
    onSuccess: () => invalidateSampleQueries(queryClient),
  });
}

export interface UploadedPhoto {
  url: string;
}

export function useUploadSamplePhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post<UploadedPhoto>('/uploads/sample-photo', formData);
    },
  });
}
