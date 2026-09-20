import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  BarChart3,
  Boxes,
  ChevronDown,
  FileSearch,
  FlaskConical,
  HelpCircle,
  LayoutGrid,
  Library,
  LogOut,
  Menu,
  Package,
  QrCode,
  Settings,
  ShoppingBag,
  ShieldCheck,
  TestTube,
  UserCog,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/Logo';
import { NotificationBell } from '../../components/NotificationBell';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  /** Réservé à l'ADMIN (gestion des comptes de l'équipe). */
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/verificateur', labelKey: 'nav.dashboard', icon: LayoutGrid, end: true },
  { to: '/verificateur/centre', labelKey: 'nav.center', icon: ShieldCheck },
  { to: '/verificateur/demandes', labelKey: 'nav.requests', icon: FileSearch },
  { to: '/verificateur/echantillons', labelKey: 'nav.samples', icon: TestTube },
  { to: '/verificateur/laboratoire', labelKey: 'nav.laboratory', icon: FlaskConical },
  { to: '/verificateur/etalons', labelKey: 'nav.referenceSamples', icon: Library },
  { to: '/verificateur/decisions', labelKey: 'nav.decisions', icon: BadgeCheck },
  { to: '/verificateur/lots', labelKey: 'nav.batches', icon: Boxes },
  { to: '/verificateur/emballage', labelKey: 'nav.packaging', icon: Package },
  { to: '/verificateur/produits', labelKey: 'nav.products', icon: ShoppingBag },
  { to: '/verificateur/qr', labelKey: 'nav.qrCodes', icon: QrCode },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/verificateur/rapports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/verificateur/equipe', labelKey: 'nav.team', icon: UserCog, adminOnly: true },
  { to: '/verificateur/parametres', labelKey: 'nav.settings', icon: Settings },
  { to: '/verificateur/aide', labelKey: 'nav.help', icon: HelpCircle },
];

export const VerifierLayout: React.FC = () => {
  const { t } = useTranslation(['verifier', 'common']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const visible = (items: NavItem[]) =>
    items.filter((item) => !item.adminOnly || user?.role === 'ADMIN');

  const renderNav = (items: NavItem[]) =>
    visible(items).map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => setMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[42px] ${
            isActive
              ? 'bg-[#D49B37] text-[#0C261B]'
              : 'text-[#D9E4DC] hover:bg-white/10 hover:text-white'
          }`
        }
      >
        <item.icon className="w-4.5 h-4.5 shrink-0" />
        <span className="truncate">{t(`verifier:${item.labelKey}`)}</span>
      </NavLink>
    ));

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex flex-col lg:flex-row">
      {/* En-tête mobile */}
      <header className="lg:hidden flex items-center justify-between bg-[#0C261B] px-4 py-3 sticky top-0 z-30">
        <Link to="/">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher compact />
          <NotificationBell />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg text-white hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('common:nav.menu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <nav
        className={`${menuOpen ? 'block' : 'hidden'} lg:flex lg:flex-col w-full lg:w-64 shrink-0 bg-[#0C261B] lg:min-h-screen lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto`}
      >
        <div className="hidden lg:block px-5 py-6 border-b border-white/10">
          <Link to="/" className="block">
            <Logo compact />
          </Link>
        </div>

        <div className="p-3 space-y-1 flex-1">
          {renderNav(PRIMARY_NAV)}
          <div className="pt-3 mt-3 border-t border-white/10 space-y-1">{renderNav(SECONDARY_NAV)}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-[#F0B4B4] hover:bg-white/10 transition-colors min-h-[42px]"
          >
            <LogOut className="w-4.5 h-4.5" />
            {t('common:nav.logout')}
          </button>
        </div>

        {/* Signature de marque, reprise de l'identité du site. */}
        <div className="hidden lg:block m-3 mt-0 rounded-xl overflow-hidden relative">
          <div className="h-28 bg-gradient-to-br from-[#123626] to-[#0C261B]" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end">
            <p className="text-[11px] font-bold text-[#D49B37] uppercase tracking-wide">
              {t('verifier:brand.tagline')}
            </p>
            <p className="text-[11px] text-white/70 mt-0.5">{t('verifier:brand.subline')}</p>
          </div>
        </div>
      </nav>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barre supérieure */}
        <header className="hidden lg:flex items-center justify-end gap-2 bg-white border-b border-[#EAE1D2] px-6 py-2.5 sticky top-0 z-20">
          <LanguageSwitcher compact />
          <NotificationBell />

          <div className="relative">
            <button
              onClick={() => setAccountOpen((v) => !v)}
              aria-expanded={accountOpen}
              className="flex items-center gap-2 ps-2 pe-1.5 py-1 rounded-lg hover:bg-[#FAF6EE] transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-[#0C261B] text-white grid place-items-center text-xs font-bold">
                {initials(user?.name)}
              </span>
              <span className="text-start leading-tight">
                <span className="block text-xs font-bold text-[#0C261B]">{user?.name}</span>
                <span className="block text-[10px] text-gray-500">{t('verifier:brand.role')}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {accountOpen && (
              <>
                {/* Clic hors du menu : ferme sans rien déclencher d'autre. */}
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setAccountOpen(false)}
                />
                <div className="absolute end-0 mt-1 w-52 bg-white border border-[#EAE1D2] rounded-xl shadow-lg py-1 z-20">
                  <p className="px-3 py-2 border-b border-[#EAE1D2]">
                    <span className="block text-xs font-bold text-[#0C261B] truncate">{user?.name}</span>
                    <span className="block text-[11px] text-gray-500 truncate">{user?.email}</span>
                  </p>
                  <Link
                    to="/verificateur/parametres"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#0C261B] hover:bg-[#FAF6EE]"
                  >
                    <Settings className="w-4 h-4" />
                    {t('verifier:nav.settings')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#B42323] hover:bg-[#FDF2F2]"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('common:nav.logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function initials(name: string | undefined): string {
  if (!name) return '··';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
