import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, LogOut, ShieldCheck, Inbox, Settings, HelpCircle } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { PageView } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: PageView) => void;
}

// Panneau de compte rapide pour un CONSOMMATEUR déjà connecté (commandes,
// aide, paramètres). Les autres rôles sont envoyés directement vers leur
// espace dédié et n'ouvrent jamais ce panneau — voir Header.handleAccountClick.
export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { t } = useTranslation(['auth', 'common']);
  const { user, isAuthenticated, logout } = useAuth();

  if (!isOpen || !isAuthenticated || !user) return null;

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const goTo = (page: PageView) => {
    onClose();
    onNavigate?.(page);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn">
      <div
        id="account-modal"
        className="w-full max-w-md bg-[#FAF6EE] rounded-2xl shadow-2xl border border-[#D49B37]/40 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="bg-[#0C261B] text-white p-5 flex items-center justify-between border-b border-[#D49B37]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#163D32] border border-[#D49B37] flex items-center justify-center text-[#D49B37] font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{user.name}</h3>
              <p className="text-xs text-[#A3B8B0]">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher compact className="text-white [&_button]:text-white [&_button:hover]:bg-[#163D32]" />
            <button
              onClick={onClose}
              className="p-1.5 text-[#A3B8B0] hover:text-white hover:bg-[#163D32] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="bg-[#FAF0DC] p-3.5 rounded-xl border border-[#D49B37]/40 flex items-center gap-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-[#D49B37] shrink-0" />
            <span className="text-[#576B64]">{t('auth:account.verifiedBadge')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => goTo('settings')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#EAE1D2] bg-white text-xs font-bold text-[#0C261B] hover:bg-[#FAF6EE]"
            >
              <Settings className="w-4 h-4" />
              {t('auth:account.settingsLink')}
            </button>
            <button
              onClick={() => goTo('help')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#EAE1D2] bg-white text-xs font-bold text-[#0C261B] hover:bg-[#FAF6EE]"
            >
              <HelpCircle className="w-4 h-4" />
              {t('auth:account.helpLink')}
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-[#0C261B] mb-2">{t('auth:account.ordersHeading')}</p>
            <div className="py-10 text-center bg-white rounded-xl border border-[#EAE1D2]">
              <Inbox className="w-8 h-8 text-[#D5C7B0] mx-auto mb-2" />
              <p className="text-xs text-[#8C7A60]">{t('auth:account.noOrders')}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#EAE1D2] p-4 border-t border-[#D5C7B0] flex items-center justify-between shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" />
            {t('common:nav.logout')}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0C261B] text-white text-xs font-bold rounded-lg hover:bg-[#16473A]"
          >
            {t('common:actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
