import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Verification, VerificationStatus } from '../../../lib/api-types';

export function useAdminVerifications() {
  return useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: () => api.get<Verification[]>('/verifications'),
  });
}

export interface CreateVerificationInput {
  requestId: string;
  sampleId: string;
  analysisId: string;
  status: VerificationStatus;
  notes?: string;
}

export function useCreateVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVerificationInput) => api.post<Verification>('/verifications', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] });
    },
  });
}
