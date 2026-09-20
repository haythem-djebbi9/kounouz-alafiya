import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing, CheckCheck, ChevronRight, FileCheck2, FlaskConical, Headset, PackageOpen, ShieldCheck, ShoppingCart, Wallet } from 'lucide-react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
  type NotificationType,
} from '../../lib/notification-hooks';
import { Btn, BtnLink, ErrorBlock, LoadingBlock, NAVY, PageHeader, Panel } from './ui';
import { formatDateTime } from './utils';

const ICONS: Partial<Record<NotificationType, React.ReactNode>> = {
  REQUEST_ACCEPTED: <ShieldCheck className="w-5 h-5" />,
  SAMPLE_RECEIVED: <FlaskConical className="w-5 h-5" />,
  ANALYSIS_COMPLETED: <FlaskConical className="w-5 h-5" />,
  VERIFICATION_RESULT: <ShieldCheck className="w-5 h-5" />,
  BATCH_CREATED: <PackageOpen className="w-5 h-5" />,
  PRODUCT_PUBLISHED: <PackageOpen className="w-5 h-5" />,
  SUPPORT_TICKET_UPDATE: <Headset className="w-5 h-5" />,
  DOCUMENT_REVIEWED: <FileCheck2 className="w-5 h-5" />,
  NEW_ORDER: <ShoppingCart className="w-5 h-5" />,
  PAYOUT_PAID: <Wallet className="w-5 h-5" />,
};

// Destination de chaque notification dans le portail producteur.
function targetOf(n: AppNotification): string | null {
  switch (n.entite) {
    case 'VerificationRequest':
      return n.entiteId ? `/producteur/demandes/${n.entiteId}` : '/producteur/demandes';
    case 'Sample':
      return n.entiteId ? `/producteur/echantillons?echantillon=${n.entiteId}` : '/producteur/echantillons';
    case 'Batch':
      return n.entiteId ? `/producteur/lots?lot=${n.entiteId}` : '/producteur/lots';
    case 'Product':
      return n.entiteId ? `/producteur/produits?produit=${n.entiteId}` : '/producteur/produits';
    case 'ProducerDocument':
      return '/producteur/profil?tab=documents';
    case 'Order':
      return '/producteur/ventes/historique';
    case 'Payout':
      return '/producteur/ventes/gains';
    case 'SupportTicket':
      return '/producteur/aide?tab=tickets';
    case 'Verification':
    case 'LaboratoryAnalysis':
      return '/producteur/demandes';
    default:
      return null;
  }
}

export const NotificationsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const navigate = useNavigate();
  const { data: notifications = [], isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unread = notifications.filter((n) => !n.isRead).length;
  const visible = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const to = targetOf(n);
    if (to) navigate(to);
  };

  return (
    <div>
      <PageHeader
        title={t('producer:notifications.title')}
        subtitle={t('producer:notifications.subtitle')}
        breadcrumb={[{ label: t('producer:nav.dashboard'), to: '/producteur' }, { label: t('producer:nav.notifications') }]}
        actions={
          <>
            <BtnLink to="/producteur/parametres" variant="outline">{t('producer:notifications.preferences')}</BtnLink>
            <Btn onClick={() => markAll.mutate()} disabled={unread === 0} loading={markAll.isPending}>
              <CheckCheck className="w-4 h-4" />
              {t('common:actions.markAllRead')}
            </Btn>
          </>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-[#EEF0EC]">
          {(['all', 'unread'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${filter === key ? 'bg-[#0B4A2F] text-white' : 'text-[#14215B] hover:bg-[#F2F4F1]'}`}
            >
              {t(`producer:notifications.filters.${key}`)}
              {key === 'unread' && unread > 0 && <span className="ms-1.5 text-xs">({unread})</span>}
            </button>
          ))}
        </div>

        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock className="m-4" />}
        {!isLoading && !isError && visible.length === 0 && (
          <div className="text-center py-14">
            <Bell className="w-10 h-10 mx-auto text-gray-300" />
            <p className={`font-bold mt-3 ${NAVY}`}>{filter === 'unread' ? t('producer:notifications.noUnread') : t('common:notifications.empty')}</p>
          </div>
        )}
        <ul>
          {visible.map((n) => (
            <li key={n.id} className="border-b border-[#EEF0EC] last:border-b-0">
              <button onClick={() => open(n)} className={`w-full text-start flex items-start gap-4 px-4 sm:px-5 py-4 hover:bg-[#FAFBF9] ${n.isRead ? '' : 'bg-[#F5FAF6]'}`}>
                <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-[#EFF1EE] text-gray-500' : 'bg-[#DDEFE3] text-[#0B4A2F]'}`}>
                  {ICONS[n.type] ?? <BellRing className="w-5 h-5" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`text-sm ${n.isRead ? 'font-semibold' : 'font-extrabold'} ${NAVY}`}>{n.title}</span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#E5484D]" aria-label={t('producer:notifications.unread')} />}
                  </span>
                  <span className="block text-sm text-gray-600 mt-0.5">{n.message}</span>
                  <span className="block text-xs text-gray-400 mt-1">
                    {t(`settings:notifications.types.${n.type}`, { defaultValue: '' })} · {formatDateTime(n.createdAt, lang)}
                  </span>
                </span>
                {targetOf(n) && <ChevronRight className="w-4 h-4 text-gray-400 mt-3 rtl:rotate-180" />}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
};
