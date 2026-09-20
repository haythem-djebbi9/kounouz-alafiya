import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { QrCode, QrScan } from '../../../lib/api-types';

export function useAdminQrCodes() {
  return useQuery({
    queryKey: ['admin', 'qr-codes'],
    queryFn: () => api.get<QrCode[]>('/qr-codes'),
  });
}

export function useQrCodeScans(qrId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'qr-codes', qrId, 'scans'],
    queryFn: () => api.get<QrScan[]>(`/qr-codes/${qrId}/scans`),
    enabled: !!qrId,
  });
}

export function useSetQrCodeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ qrId, isActive }: { qrId: string; isActive: boolean }) =>
      api.patch<QrCode>(`/qr-codes/${qrId}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'qr-codes'] });
    },
  });
}
