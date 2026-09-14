import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { VerificationRequest, VerificationRequestStatus } from '../../../lib/api-types';

export function useAdminRequests(status?: VerificationRequestStatus) {
  return useQuery({
    queryKey: ['admin', 'requests', status ?? 'all'],
    queryFn: () =>
      api.get<VerificationRequest[]>(`/verification-requests${status ? `?status=${status}` : ''}`),
  });
}

export function useAdminRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'requests', 'detail', id],
    queryFn: () => api.get<VerificationRequest>(`/verification-requests/${id}`),
    enabled: !!id,
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED' }) =>
      api.patch<VerificationRequest>(`/verification-requests/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] });
    },
  });
}
