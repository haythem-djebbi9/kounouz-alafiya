import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Producer } from '../../../lib/api-types';
import type {
  DocumentStatus,
  OrderStatus,
  ProducerDocument,
  ProducerStatus,
  SalesChannel,
  Settlement,
} from '../../producer/types';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string;
  city: string;
  channel: SalesChannel;
  status: OrderStatus;
  subtotal: string;
  shippingFee: string;
  total: string;
  deliveredAt: string | null;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    packageSize: string | null;
    quantity: number;
    lineTotal: string;
    commissionAmount: string;
    producer: { id: string; name: string; farmName: string };
  }[];
}

export interface AdminSettlement extends Settlement {
  producer: Pick<Producer, 'id' | 'name' | 'farmName'> & { paymentMethod: string | null; bankName: string | null; iban: string | null };
}

export function useAdminOrders() {
  return useQuery({ queryKey: ['admin', 'orders'], queryFn: () => api.get<AdminOrder[]>('/orders') });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => api.patch<AdminOrder>(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settlements'] });
    },
  });
}

export function useAdminSettlements() {
  return useQuery({ queryKey: ['admin', 'settlements'], queryFn: () => api.get<AdminSettlement[]>('/settlements') });
}

export function usePaySettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { producerId: string; period: string; reference?: string }) => api.post('/settlements/pay', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settlements'] }),
  });
}

export function useProducerDocuments(producerId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'producer-documents', producerId],
    queryFn: () => api.get<ProducerDocument[]>(`/producer-documents/producer/${producerId}`),
    enabled: !!producerId,
  });
}

export function useReviewDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: Exclude<DocumentStatus, 'PENDING_REVIEW'>; note?: string }) =>
      api.patch<ProducerDocument>(`/producer-documents/${id}/review`, { status, note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'producer-documents'] }),
  });
}

export function useUpdateProducerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProducerStatus }) => api.patch<Producer>(`/producers/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'producers'] }),
  });
}
