import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AuthUser } from '../../lib/api-types';
import { useAuth } from '../../lib/auth-context';
import type {
  DocumentType,
  Farm,
  FarmInput,
  InfoResponseInput,
  ProducerBatch,
  ProducerDocument,
  ProducerProduct,
  ProducerProfile,
  ProducerProfileInput,
  ProducerRequest,
  ProducerSample,
  RequestInput,
  SalesResponse,
  SettlementDetail,
  SettlementsResponse,
} from './types';

// --- Profil -----------------------------------------------------------------

export function useMyProfile() {
  return useQuery({
    queryKey: ['producers', 'me'],
    queryFn: () => api.get<ProducerProfile>('/producers/me'),
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const { refreshMe } = useAuth();
  return useMutation({
    mutationFn: (input: ProducerProfileInput) => api.patch<ProducerProfile>('/producers/me', input),
    onSuccess: (profile) => {
      queryClient.setQueryData(['producers', 'me'], profile);
      void refreshMe();
    },
  });
}

export function useUploadProducerImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api.post<{ url: string }>('/uploads/producer-image', body);
    },
  });
}

// --- Documents ----------------------------------------------------------------

export function useMyDocuments() {
  return useQuery({
    queryKey: ['producer-documents', 'mine'],
    queryFn: () => api.get<ProducerDocument[]>('/producer-documents/mine'),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, file }: { type: DocumentType; file: File }) => {
      const body = new FormData();
      body.append('type', type);
      body.append('file', file);
      return api.post<ProducerDocument>('/producer-documents', body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['producer-documents', 'mine'] }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/producer-documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['producer-documents', 'mine'] }),
  });
}

// --- Demandes de vérification ----------------------------------------------------

export function useMyRequests() {
  return useQuery({
    queryKey: ['verification-requests', 'mine'],
    queryFn: () => api.get<ProducerRequest[]>('/verification-requests/mine'),
  });
}

export function useRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['verification-requests', id],
    queryFn: () => api.get<ProducerRequest>(`/verification-requests/${id}`),
    enabled: !!id,
  });
}

export function useSaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RequestInput }) =>
      id
        ? api.patch<ProducerRequest>(`/verification-requests/${id}/draft`, input)
        : api.post<ProducerRequest>('/verification-requests', input),
    onSuccess: (request) => {
      queryClient.setQueryData(['verification-requests', request.id], request);
      void queryClient.invalidateQueries({ queryKey: ['verification-requests', 'mine'] });
    },
  });
}

export function useRespondInfoRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InfoResponseInput }) =>
      api.post<ProducerRequest>(`/verification-requests/${id}/respond`, input),
    onSuccess: (request) => {
      queryClient.setQueryData(['verification-requests', request.id], request);
      void queryClient.invalidateQueries({ queryKey: ['verification-requests', 'mine'] });
    },
  });
}

// --- Ruchers ------------------------------------------------------------------

export function useMyFarms() {
  return useQuery({
    queryKey: ['producers', 'me', 'farms'],
    queryFn: () => api.get<Farm[]>('/producers/me/farms'),
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FarmInput) => api.post<Farm>('/producers/me/farms', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['producers', 'me', 'farms'] }),
  });
}

export function useUpdateFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<FarmInput> & { id: string; isPrimary?: boolean; isActive?: boolean }) =>
      api.patch<Farm>(`/producers/me/farms/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['producers', 'me', 'farms'] }),
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/verification-requests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['verification-requests', 'mine'] }),
  });
}

// --- Traçabilité (lecture seule) ---------------------------------------------------

export function useMySamples() {
  return useQuery({
    queryKey: ['samples', 'producer'],
    queryFn: () => api.get<ProducerSample[]>('/samples/producer'),
  });
}

export function useMyBatches() {
  return useQuery({
    queryKey: ['batches', 'mine'],
    queryFn: () => api.get<ProducerBatch[]>('/batches/mine'),
  });
}

export function useMyProducts() {
  return useQuery({
    queryKey: ['products', 'mine'],
    queryFn: () => api.get<ProducerProduct[]>('/products/mine'),
  });
}

// --- Ventes & gains ------------------------------------------------------------------

export function useMySales() {
  return useQuery({
    queryKey: ['sales', 'mine'],
    queryFn: () => api.get<SalesResponse>('/orders/producer/sales'),
  });
}

export function useMySettlements() {
  return useQuery({
    queryKey: ['settlements', 'mine'],
    queryFn: () => api.get<SettlementsResponse>('/settlements/mine'),
  });
}

export function useSettlementDetail(period: string | undefined) {
  return useQuery({
    queryKey: ['settlements', 'mine', period],
    queryFn: () => api.get<SettlementDetail>(`/settlements/mine/${period}`),
    enabled: !!period,
  });
}

// --- Sécurité du compte ------------------------------------------------------------

export function useChangeEmail() {
  const { refreshMe } = useAuth();
  return useMutation({
    mutationFn: (input: { newEmail: string; currentPassword: string }) => api.patch<AuthUser>('/auth/change-email', input),
    onSuccess: () => refreshMe(),
  });
}

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: () => api.post<{ secret: string; otpauthUrl: string; qrDataUrl: string }>('/auth/2fa/setup'),
  });
}

export function useEnableTwoFactor() {
  const { refreshMe } = useAuth();
  return useMutation({
    mutationFn: (code: string) => api.post<AuthUser>('/auth/2fa/enable', { code }),
    onSuccess: () => refreshMe(),
  });
}

export function useDisableTwoFactor() {
  const { refreshMe } = useAuth();
  return useMutation({
    mutationFn: (input: { currentPassword: string; code: string }) => api.post<AuthUser>('/auth/2fa/disable', input),
    onSuccess: () => refreshMe(),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; reason?: string }) =>
      api.post<{ outcome: 'DELETED' | 'DEACTIVATED' }>('/auth/delete-account', input),
  });
}
