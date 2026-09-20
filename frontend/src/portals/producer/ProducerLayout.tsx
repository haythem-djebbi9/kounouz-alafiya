import React, { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  CircleHelp,
  FileText,
  FlaskConical,
  Home,
  LogOut,
  Menu,
  Package,
  PackageOpen,
  Search,
  Settings,
  User,
  X,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { resolveFileUrl } from '../../lib/api';
import { useUnreadCount } from '../../lib/notification-hooks';
import { NotificationBell } from '../../components/NotificationBell';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useMyBatches, useMyProducts, useMyProfile, useMyRequests, useMySamples } from './hooks';
import { useClickOutside } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: number;
}

export const ProducerLayout: React.FC = () => {
  const { t } = useTranslation(['producer', 'common']);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { data: unread = 0 } = useUnreadCount();

  const mainItems: NavItem[] = [
    { to: '/producteur', label: t('producer:nav.dashboard'), icon: Home, end: true },
    { to: '/producteur/profil', label: t('producer:nav.profile'), icon: User },
    { to: '/producteur/demandes', label: t('producer:nav.requests'), icon: FileText },
    { to: '/producteur/echantillons', label: t('producer:nav.samples'), icon: FlaskConical },
    { to: '/producteur/lots', label: t('producer:nav.batches'), icon: PackageOpen },
    { to: '/producteur/produits', label: t('producer:nav.products'), icon: Package },
    { to: '/producteur/ventes', label: t('producer:nav.sales'), icon: ChartNoAxesColumnIncreasing },
    { to: '/producteur/notifications', label: t('producer:nav.notifications'), icon: Bell, badge: unread },
    { to: '/producteur/parametres', label: t('producer:nav.settings'), icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handleMenuButton = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((v) => !v);
    } else {
      setMobileOpen(true);
    }
  };

  const navLinkClass = (isActive: boolean) =>
    `relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-white/12 text-white' : 'text-white/85 hover:bg-white/8 hover:text-white'
    }`;

  const sidebar = (
    <aside className="flex flex-col h-full w-64 bg-gradient-to-b from-[#0A3B27] via-[#08301F] to-[#06261A] text-white">
      <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
        <Link to="/" className="flex flex-col items-center" onClick={() => setMobileOpen(false)}>
          <img src="/images/knozafialogo-removebg-preview.png" alt="" className="w-16 h-16 object-contain" />
          <span className="font-['Cairo'] text-2xl font-bold leading-tight mt-1">كنوز العافية</span>
          <span className="text-[11px] font-bold tracking-[0.18em] mt-0.5">KOUNOUZ ALAFIYA</span>
          <span className="text-[11px] text-[#F4B63F] mt-1">{t('producer:brand.tagline')}</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 end-4 p-2 rounded-lg hover:bg-white/10"
          aria-label={t('common:actions.close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1" aria-label={t('common:nav.menu')}>
        {mainItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)}>
            {({ isActive }) => (
              <span className={navLinkClass(isActive)}>
                {isActive && <span className="absolute inset-y-1 start-0 w-1 rounded-full bg-[#F4B63F]" />}
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#E5484D] text-white text-[11px] font-bold flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}

        <div className="my-3 mx-4 border-t border-white/15" />

        <NavLink to="/producteur/aide" onClick={() => setMobileOpen(false)}>
          {({ isActive }) => (
            <span className={navLinkClass(isActive)}>
              {isActive && <span className="absolute inset-y-1 start-0 w-1 rounded-full bg-[#F4B63F]" />}
              <CircleHelp className="w-5 h-5" />
              {t('producer:nav.help')}
            </span>
          )}
        </NavLink>
        <button onClick={handleLogout} className={`${navLinkClass(false)} w-full`}>
          <LogOut className="w-5 h-5 rtl:rotate-180" />
          {t('common:nav.logout')}
        </button>
      </nav>

      <div className="relative h-44 mt-4 shrink-0 overflow-hidden">
        <img src="/images/beekeeper.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-left opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06261A] via-[#06261A]/40 to-[#06261A]/90" />
        <div className="absolute bottom-5 start-6 end-6">
          <p className="text-xs font-bold tracking-wide leading-relaxed uppercase">{t('producer:brand.sidebarMotto')}</p>
          <span className="block w-10 h-0.5 bg-[#F4B63F] mt-2" />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F6F7F5] flex">
      {/* Barre latérale desktop */}
      <div className={`hidden lg:block shrink-0 sticky top-0 h-screen transition-all ${collapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
        {sidebar}
      </div>

      {/* Tiroir mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-white border-b border-[#E6E8E3]">
          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 h-16">
            <button
              onClick={handleMenuButton}
              className="p-2 rounded-lg text-[#14215B] hover:bg-[#F2F4F1]"
              aria-label={t('common:nav.menu')}
            >
              <Menu className="w-6 h-6" />
            </button>
            <GlobalSearch key={location.pathname} />
            <div className="flex items-center gap-1 sm:gap-2 ms-auto">
              <NotificationBell />
              <LanguageSwitcher compact className="sm:hidden" />
              <LanguageSwitcher className="hidden sm:block" />
              <UserMenu onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        <footer className="px-3 sm:px-6 lg:px-8 py-4 border-t border-[#E6E8E3] bg-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#27315F]">
            <p className="flex flex-wrap items-center justify-center gap-2">
              <span>© {new Date().getFullYear()} Kounouz Alafiya</span>
              <span className="text-gray-300">|</span>
              <span>{t('producer:footer.motto')}</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/producteur/aide?tab=faq" className="hover:underline">
                {t('producer:footer.privacy')}
              </Link>
              <span className="text-gray-300">|</span>
              <Link to="/producteur/aide?tab=faq" className="hover:underline">
                {t('producer:footer.terms')}
              </Link>
              <span className="text-gray-300">|</span>
              <Link to="/producteur/aide?tab=contact" className="hover:underline">
                {t('producer:footer.contact')}
              </Link>
              <span className="flex items-center gap-3 ms-2 text-[#14215B]">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube className="w-4 h-4" /></a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin className="w-4 h-4" /></a>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

const UserMenu: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { t } = useTranslation(['producer', 'common']);
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const avatar = profile?.avatarUrl ? resolveFileUrl(profile.avatarUrl) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 sm:gap-3 ps-1 pe-2 py-1 rounded-lg hover:bg-[#F2F4F1]"
        aria-expanded={open}
      >
        <Avatar src={avatar} name={user?.name ?? ''} size={40} />
        <span className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-sm font-bold text-[#14215B]">{user?.name}</span>
          <span className="text-xs text-gray-500">{t('producer:common.roleLabel')}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-[#14215B]" />
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-56 bg-white border border-[#E6E8E3] rounded-xl shadow-lg z-50 py-1">
          <div className="px-4 py-3 border-b border-[#EEF0EC]">
            <p className="text-sm font-bold text-[#14215B] truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          {[
            { to: '/producteur/profil', label: t('producer:nav.profile'), icon: User },
            { to: '/producteur/parametres', label: t('producer:nav.settings'), icon: Settings },
            { to: '/producteur/aide', label: t('producer:nav.help'), icon: CircleHelp },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1F2937] hover:bg-[#F6F7F5]"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 border-t border-[#EEF0EC]"
          >
            <LogOut className="w-4 h-4 rtl:rotate-180" />
            {t('common:nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
};

export const Avatar: React.FC<{ src: string | null; name: string; size?: number; className?: string }> = ({
  src,
  name,
  size = 40,
  className = '',
}) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return src ? (
    <img
      src={src}
      alt={name}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={`rounded-full bg-[#DDEFE3] text-[#0B4A2F] font-bold flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
};

// Recherche transverse (demandes, lots, produits, scellés) sur les données déjà
// chargées du producteur.
const GlobalSearch: React.FC = () => {
  const { t } = useTranslation('producer');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const { data: requests = [] } = useMyRequests();
  const { data: batches = [] } = useMyBatches();
  const { data: products = [] } = useMyProducts();
  const { data: samples = [] } = useMySamples();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const match = (...values: (string | null | undefined)[]) => values.some((v) => v?.toLowerCase().includes(q));
    return [
      ...requests
        .filter((r) => match(r.requestCode, r.honeyType, r.collectionLocation))
        .map((r) => ({
          key: `r-${r.id}`,
          group: t('search.groups.requests'),
          title: r.requestCode ?? t('requests.draftLabel'),
          subtitle: r.honeyType || '—',
          to: r.status === 'DRAFT' ? `/producteur/demandes/${r.id}/modifier` : `/producteur/demandes/${r.id}`,
        })),
      ...batches
        .filter((b) => match(b.batchCode, b.honeyType))
        .map((b) => ({ key: `b-${b.id}`, group: t('search.groups.batches'), title: b.batchCode, subtitle: b.honeyType, to: `/producteur/lots?lot=${b.id}` })),
      ...products
        .filter((p) => match(p.nom, p.batch?.batchCode, p.qrCode?.qrCode))
        .map((p) => ({ key: `p-${p.id}`, group: t('search.groups.products'), title: p.nom, subtitle: p.batch?.batchCode ?? '', to: `/producteur/produits?produit=${p.id}` })),
      ...samples
        .filter((s) => match(s.seal?.sealCode, s.request.requestCode, s.request.honeyType))
        .map((s) => ({
          key: `s-${s.id}`,
          group: t('search.groups.samples'),
          title: s.seal?.sealCode ?? s.request.honeyType,
          subtitle: s.request.requestCode ?? '',
          to: `/producteur/echantillons?echantillon=${s.id}`,
        })),
    ].slice(0, 8);
  }, [query, requests, batches, products, samples, t]);

  return (
    <div ref={ref} className="relative flex-1 max-w-md hidden sm:block">
      <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-gray-500 pointer-events-none" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t('search.placeholder')}
        className="w-full bg-[#F4F5F3] border border-[#E6E8E3] rounded-lg ps-9 pe-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#0B4A2F]"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute start-0 end-0 mt-1 bg-white border border-[#E6E8E3] rounded-xl shadow-lg z-50 py-1 max-h-96 overflow-y-auto">
          {results.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">{t('search.empty')}</p>}
          {results.map((result) => (
            <button
              key={result.key}
              onClick={() => {
                setOpen(false);
                setQuery('');
                navigate(result.to);
              }}
              className="w-full text-start px-4 py-2.5 hover:bg-[#F6F7F5] flex items-center justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#14215B] truncate">{result.title}</span>
                <span className="block text-xs text-gray-500 truncate">{result.subtitle}</span>
              </span>
              <span className="text-[11px] font-semibold text-[#17693F] bg-[#E7F4EC] rounded px-2 py-0.5 shrink-0">{result.group}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
