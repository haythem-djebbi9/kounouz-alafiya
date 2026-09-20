import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CreateContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (input: CreateContactMessageInput) =>
      api.post<ContactMessage>('/contact', input, { skipAuth: true }),
  });
}

export function useContactMessages() {
  return useQuery({
    queryKey: ['contact', 'messages'],
    queryFn: () => api.get<ContactMessage[]>('/contact'),
  });
}

export function useMarkContactMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/contact/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contact', 'messages'] });
    },
  });
}
