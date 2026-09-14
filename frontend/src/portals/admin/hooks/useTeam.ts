import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { AuthUser } from '../../../lib/api-types';

export function useTeamUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<AuthUser[]>('/auth/users'),
  });
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'VERIFICATION_TEAM' | 'FIELD_AGENT';
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => api.post<AuthUser>('/auth/register-staff', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<AuthUser>(`/auth/users/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
