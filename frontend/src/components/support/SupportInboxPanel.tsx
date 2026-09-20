import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, StatusBadge, EmptyState, Badge } from '../../design-system';
import { useAllTickets, type SupportTicketStatus } from '../../lib/support-hooks';
import { useContactMessages, useMarkContactMessageRead } from '../../lib/contact-hooks';
import { TicketDetail } from './HelpSupportPanel';

const STATUS_FILTERS: (SupportTicketStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export const SupportInboxPanel: React.FC = () => {
  const { t } = useTranslation(['support', 'common', 'status']);
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'ALL'>('ALL');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { data: tickets, isLoading } = useAllTickets(statusFilter === 'ALL' ? undefined : statusFilter);

  const { data: contactMessages, isLoading: contactLoading } = useContactMessages();
  const markReadMutation = useMarkContactMessageRead();

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0C261B] mb-4">{t('support:inbox.heading')}</h1>

        {selectedTicketId ? (
          <TicketDetail id={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    statusFilter === s ? 'bg-[#0C261B] text-white' : 'bg-white border border-[#EAE1D2] text-[#0C261B] hover:bg-[#FAF6EE]'
                  }`}
                >
                  {s === 'ALL' ? t('support:inbox.filterAll') : t(`status:supportTicket.${s}`)}
                </button>
              ))}
            </div>

            {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
            {!isLoading && (tickets?.length ?? 0) === 0 && <EmptyState title={t('support:inbox.noTickets')} />}
            <div className="space-y-2">
              {tickets?.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:border-[#D49B37] transition-colors"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#0C261B]">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ticket.user.name} · {ticket.user.email}
                      </p>
                    </div>
                    <StatusBadge kind="supportTicket" status={ticket.status} />
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-[#0C261B] mb-4">{t('support:inbox.contactHeading')}</h2>
        {contactLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
        {!contactLoading && (contactMessages?.length ?? 0) === 0 && (
          <EmptyState title={t('support:inbox.noContactMessages')} />
        )}
        <div className="space-y-2">
          {contactMessages?.map((msg) => (
            <Card key={msg.id} className={msg.isRead ? '' : 'border-[#D49B37]'}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#0C261B]">{msg.subject}</p>
                    {!msg.isRead && <Badge tone="gold">{t('support:inbox.unread')}</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {msg.name} · {msg.email} · {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{msg.message}</p>
                </div>
                {!msg.isRead && (
                  <button
                    onClick={() => markReadMutation.mutate(msg.id)}
                    className="shrink-0 text-xs font-bold text-[#0C261B]/70 hover:text-[#0C261B] whitespace-nowrap"
                  >
                    {t('common:actions.markAsRead')}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
