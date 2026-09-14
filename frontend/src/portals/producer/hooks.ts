import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Producer, VerificationRequest, ProduitPublic } from '../../lib/api-types';

export function useMyProfile() {
  return useQuery({
    queryKey: ['producers', 'me'],
    queryFn: () => api.get<Producer>('/producers/me'),
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<Producer, 'farmName' | 'location' | 'description'>>) =>
      api.patch<Producer>('/producers/me', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producers', 'me'] });
    },
  });
}

export function useMyRequests() {
  return useQuery({
    queryKey: ['verification-requests', 'mine'],
    queryFn: () => api.get<VerificationRequest[]>('/verification-requests/mine'),
  });
}

export function useRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['verification-requests', id],
    queryFn: () => api.get<VerificationRequest>(`/verification-requests/${id}`),
    enabled: !!id,
  });
}

export interface CreateRequestInput {
  honeyType: string;
  description?: string;
  collectionLocation: string;
  quantity: number;
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequestInput) => api.post<VerificationRequest>('/verification-requests', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests', 'mine'] });
    },
  });
}

export function useMyProducts() {
  return useQuery({
    queryKey: ['products', 'mine'],
    queryFn: () => api.get<ProduitPublic[]>('/products/mine'),
  });
}
