import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { dateLocale } from '../i18n';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '../lib/notification-hooks';

export const NotificationBell: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 rounded-lg text-[#0C261B] hover:bg-[#FAF6EE] min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t('notifications.heading')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 max-w-[90vw] bg-white border border-[#EAE1D2] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE1D2]">
            <p className="text-sm font-bold text-[#0C261B]">{t('notifications.heading')}</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs font-bold text-[#0C261B]/70 hover:text-[#0C261B]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('actions.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && <p className="px-4 py-6 text-center text-xs text-gray-400">{t('status.loading')}</p>}
            {!isLoading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-gray-400">{t('notifications.empty')}</p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-[#EAE1D2] last:border-b-0 flex items-start gap-2 ${
                  n.isRead ? '' : 'bg-[#FAF6EE]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0C261B]">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString(dateLocale(i18n.language), {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="shrink-0 p-1.5 rounded-lg text-[#0C261B]/50 hover:bg-white hover:text-[#0C261B]"
                    aria-label={t('actions.markAsRead')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
