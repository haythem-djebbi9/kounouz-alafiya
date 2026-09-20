import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type NotificationType =
  | 'REQUEST_ACCEPTED'
  | 'COLLECTION_AVAILABLE'
  | 'SAMPLE_RECEIVED'
  | 'ANALYSIS_COMPLETED'
  | 'VERIFICATION_RESULT'
  | 'BATCH_CREATED'
  | 'PRODUCT_PUBLISHED'
  | 'SUPPORT_TICKET_UPDATE'
  | 'DOCUMENT_REVIEWED'
  | 'NEW_ORDER'
  | 'PAYOUT_PAID'
  | 'COLLECTION_ASSIGNED'
  | 'COUNTERFEIT_ALERT'
  | 'WORKFLOW_TASK';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'REQUEST_ACCEPTED',
  'COLLECTION_AVAILABLE',
  'SAMPLE_RECEIVED',
  'ANALYSIS_COMPLETED',
  'VERIFICATION_RESULT',
  'BATCH_CREATED',
  'PRODUCT_PUBLISHED',
  'SUPPORT_TICKET_UPDATE',
  'DOCUMENT_REVIEWED',
  'NEW_ORDER',
  'PAYOUT_PAID',
  'COLLECTION_ASSIGNED',
  'COUNTERFEIT_ALERT',
  'WORKFLOW_TASK',
];

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entite: string | null;
  entiteId: string | null;
  isRead: boolean;
  createdAt: string;
}

const POLL_INTERVAL = 30_000;

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<AppNotification[]>('/notifications'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<number>('/notifications/unread-count'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => api.get<{ mutedTypes: NotificationType[] }>('/notifications/preferences'),
  });
}

export function useToggleNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationType; enabled: boolean }) =>
      api.patch<{ mutedTypes: NotificationType[] }>(`/notifications/preferences/${type}`, { enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
  });
}
