import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Sample, Seal } from '../../../lib/api-types';

export function useAdminSamples() {
  return useQuery({
    queryKey: ['admin', 'samples'],
    queryFn: () => api.get<Sample[]>('/samples'),
  });
}

export function useAdminSampleDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'samples', id],
    queryFn: () => api.get<Sample>(`/samples/${id}`),
    enabled: !!id,
  });
}

export function useMarkReceivedAtLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sampleId: string) => api.patch<Sample>(`/samples/${sampleId}/received`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'samples'] });
    },
  });
}

export function useAdminSeals() {
  return useQuery({
    queryKey: ['admin', 'seals'],
    queryFn: () => api.get<Seal[]>('/seals'),
  });
}
