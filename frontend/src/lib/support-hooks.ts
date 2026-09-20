import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; role: string };
  messages: SupportTicketMessage[];
}

export function useMyTickets() {
  return useQuery({
    queryKey: ['support', 'tickets', 'mine'],
    queryFn: () => api.get<SupportTicket[]>('/support/tickets/mine'),
  });
}

export function useAllTickets(status?: SupportTicketStatus) {
  return useQuery({
    queryKey: ['support', 'tickets', 'all', status ?? 'ALL'],
    queryFn: () => api.get<SupportTicket[]>(`/support/tickets${status ? `?status=${status}` : ''}`),
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['support', 'tickets', id],
    queryFn: () => api.get<SupportTicket>(`/support/tickets/${id}`),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { subject: string; message: string }) => api.post<SupportTicket>('/support/tickets', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useAddTicketMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<SupportTicketMessage>(`/support/tickets/${ticketId}/messages`, { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useUpdateTicketStatus(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: SupportTicketStatus) => api.patch<SupportTicket>(`/support/tickets/${ticketId}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}
