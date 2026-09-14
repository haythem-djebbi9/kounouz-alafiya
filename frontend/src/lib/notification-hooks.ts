import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type NotificationType =
  | 'REQUEST_ACCEPTED'
  | 'COLLECTION_AVAILABLE'
  | 'SAMPLE_RECEIVED'
  | 'ANALYSIS_COMPLETED'
  | 'VERIFICATION_RESULT'
  | 'BATCH_CREATED'
  | 'PRODUCT_PUBLISHED';

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
