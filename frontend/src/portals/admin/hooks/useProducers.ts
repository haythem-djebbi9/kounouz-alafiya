import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Producer } from '../../../lib/api-types';

export function useProducers() {
  return useQuery({
    queryKey: ['admin', 'producers'],
    queryFn: () => api.get<Producer[]>('/producers'),
  });
}

export function useProducer(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'producers', id],
    queryFn: () => api.get<Producer>(`/producers/${id}`),
    enabled: !!id,
  });
}
