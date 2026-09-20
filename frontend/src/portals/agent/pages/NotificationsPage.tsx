import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { dateLocale } from '../../../i18n';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
} from '../../../lib/notification-hooks';
import { Btn, EmptyBlock, InlineError, LoadingBlock, PageHeader } from '../../verifier/ui';
import { formatDateTime } from '../utils';

// Destination de chaque notification dans le portail agent.
function targetOf(n: AppNotification): string | null {
  switch (n.entite) {
    case 'CollectionAssignment':
      return n.entiteId ? `/agent/missions/${n.entiteId}` : '/agent/missions';
    case 'VerificationRequest':
      return '/agent/missions?tab=AVAILABLE';
    case 'Sample':
      return n.entiteId ? `/agent/tracabilite/${n.entiteId}` : '/agent/tracabilite';
    case 'SupportTicket':
      return '/agent/messages';
    default:
      return null;
  }
}

export const NotificationsPage: React.FC = () => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const navigate = useNavigate();
  const { data = [], isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = data.filter((n) => !n.isRead).length;

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const target = targetOf(n);
    if (target) navigate(target);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={t('notificationsPage.title')}
        subtitle={t('notificationsPage.subtitle', { count: unread })}
        actions={
          unread > 0 && (
            <Btn variant="secondary" onClick={() => markAll.mutate()} isLoading={markAll.isPending}>
              <CheckCheck className="w-4 h-4" />
              {t('notificationsPage.markAll')}
            </Btn>
          )
        }
      />
      {isLoading && <LoadingBlock label={t('common.loading')} />}
      {isError && <InlineError message={t('common.loadError')} />}
      {!isLoading && data.length === 0 && (
        <div className="bg-white border border-[#EAE1D2] rounded-xl">
          <EmptyBlock icon={<Bell className="w-8 h-8" />} title={t('dashboard.notifications.empty')} />
        </div>
      )}
      <ul className="bg-white border border-[#EAE1D2] rounded-xl divide-y divide-[#F1EDE3] overflow-hidden">
        {data.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => open(n)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-[#FAF6EE] ${n.isRead ? '' : 'bg-[#F2F8F3]'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-[#17693F]'}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#0C261B]">{n.title}</span>
                <span className="block text-sm text-gray-600">{n.message}</span>
                <span className="block text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt, locale)}</span>
              </span>
              {targetOf(n) && <ChevronRight className="w-4 h-4 text-gray-400 mt-1 rtl:rotate-180" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
