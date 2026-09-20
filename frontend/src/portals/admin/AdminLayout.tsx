import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  ChevronDown,
  CircleHelp,
  FileText,
  FlaskConical,
  FolderTree,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  LogOut,
  Menu,
  Package,
  QrCode,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TestTube,
  UserRound,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { NotificationBell } from '../../components/NotificationBell';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAdminSearch } from './console/api';
import { Avatar, Pill, useClickOutside } from './console/ui';

interface NavLeaf {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

interface NavBranch {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavBranch;

const isBranch = (entry: NavEntry): entry is NavBranch => 'children' in entry;

// Ordre du menu de la console ; les écrans historiques (demandes, scellés,
// catégories, ventes, support) restent accessibles à leur place logique.
const NAV: NavEntry[] = [
  { to: '/admin', labelKey: 'nav.dashboard', icon: LayoutGrid, end: true },
  { to: '/admin/utilisateurs', labelKey: 'nav.usersRoles', icon: UsersRound },
  { to: '/admin/producteurs', labelKey: 'nav.producers', icon: Users },
  { to: '/admin/laboratoires', labelKey: 'nav.laboratories', icon: FlaskConical },
  { to: '/admin/demandes', labelKey: 'nav.requests', icon: FileText },
  { to: '/admin/echantillons', labelKey: 'nav.samples', icon: TestTube },
  { to: '/admin/scelles', labelKey: 'nav.seals', icon: ShieldCheck },
  { to: '/admin/lots', labelKey: 'nav.verifiedBatches', icon: Boxes },
  { to: '/admin/produits', labelKey: 'nav.products', icon: ShoppingBag },
  { to: '/admin/categories', labelKey: 'nav.categories', icon: FolderTree },
  { to: '/admin/emballage', labelKey: 'nav.packaging', icon: Package },
  { to: '/admin/qr-codes', labelKey: 'nav.qrCodes', icon: QrCode },
  { to: '/admin/verification', labelKey: 'nav.verification', icon: BadgeCheck },
  {
    key: 'analytics',
    labelKey: 'nav.analytics',
    icon: LineChart,
    children: [
      { to: '/admin/analyses/scans', labelKey: 'nav.qrScanAnalytics', icon: QrCode },
      { to: '/admin/analyses/alertes', labelKey: 'nav.antiCounterfeit', icon: ShieldCheck },
      { to: '/admin/analyses/verification', labelKey: 'nav.businessAnalytics', icon: BarChart3 },
    ],
  },
  {
    key: 'sales',
    labelKey: 'nav.sales',
    icon: ShoppingCart,
    children: [
      { to: '/admin/commandes', labelKey: 'nav.orders', icon: ShoppingCart },
      { to: '/admin/reglements', labelKey: 'nav.settlements', icon: Banknote },
    ],
  },
  { to: '/admin/rapports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/admin/journal', labelKey: 'nav.auditLogs', icon: ScrollText },
  { to: '/admin/support', labelKey: 'nav.support', icon: LifeBuoy },
  { to: '/admin/parametres', labelKey: 'nav.settings', icon: Settings },
  { to: '/admin/aide', labelKey: 'nav.help', icon: CircleHelp },
];

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation(['console', 'common']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openBranches, setOpenBranches] = useState<Record<string, boolean>>({});
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useClickOutside<HTMLDivElement>(accountOpen, () => setAccountOpen(false));

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const toggleMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((v) => !v);
    else setMobileOpen(true);
  };

  const branchActive = (branch: NavBranch) => branch.children.some((child) => location.pathname.startsWith(child.to));
  const compact = collapsed && !mobileOpen;

  const leafClass = (isActive: boolean, nested = false) =>
    `relative flex items-center gap-3 rounded-lg ${compact ? 'justify-center px-0' : nested ? 'ps-9 pe-3' : 'px-3.5'} py-2 text-[13.5px] font-semibold transition-colors ${
      isActive ? 'bg-white/[0.12] text-[#F4C465]' : 'text-white/80 hover:bg-white/[0.07] hover:text-white'
    }`;

  const renderLeaf = (item: NavLeaf, nested = false) => (
    <NavLink key={item.to} to={item.to} end={item.end} title={compact ? t(item.labelKey) : undefined}>
      {({ isActive }) => (
        <span className={leafClass(isActive, nested)}>
          {isActive && !nested && <span className="absolute inset-y-1 start-0 w-1 rounded-full bg-[#F4B63F]" />}
          {nested ? (
            <span className={`absolute start-5 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#F4B63F]' : 'bg-white/40'}`} />
          ) : (
            <item.icon className="w-[18px] h-[18px] shrink-0" />
          )}
          {!compact && <span className="flex-1 truncate">{t(item.labelKey)}</span>}
        </span>
      )}
    </NavLink>
  );

  const sidebar = (
    <aside
      className={`flex flex-col h-full ${compact ? 'w-[76px]' : 'w-64'} bg-gradient-to-b from-[#0A3B27] via-[#08301F] to-[#06261A] text-white transition-[width] duration-200`}
    >
      <div className={`relative ${compact ? 'px-2 pt-5 pb-4' : 'px-6 pt-6 pb-5'} flex flex-col items-center text-center`}>
        <Link to="/admin" className="flex flex-col items-center">
          <img src="/images/knozafialogo-removebg-preview.png" alt="" className={compact ? 'w-11 h-11 object-contain' : 'w-16 h-16 object-contain'} />
          {!compact && (
            <>
              <span className="font-['Cairo'] text-2xl font-bold leading-tight mt-1">كنوز العافية</span>
              <span className="text-[11px] font-bold tracking-[0.18em] mt-0.5">KOUNOUZ ALAFIYA</span>
              <span className="text-[11px] text-[#F4B63F] mt-1">{t('brand.tagline')}</span>
            </>
          )}
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 end-4 p-2 rounded-lg hover:bg-white/10"
          aria-label={t('actions.close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5 admin-sidebar-scroll" aria-label={t('nav.menu')}>
        {NAV.map((entry) => {
          if (!isBranch(entry)) return renderLeaf(entry);
          const open = openBranches[entry.key] ?? branchActive(entry);
          const active = branchActive(entry);
          if (compact) {
            return (
              <div key={entry.key} className="space-y-0.5">
                {entry.children.map((child) => (
                  <NavLink key={child.to} to={child.to} title={t(child.labelKey)}>
                    {({ isActive }) => (
                      <span className={leafClass(isActive)}>
                        <child.icon className="w-[18px] h-[18px]" />
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          }
          return (
            <div key={entry.key}>
              <button
                onClick={() => setOpenBranches((prev) => ({ ...prev, [entry.key]: !open }))}
                aria-expanded={open}
                className={`${leafClass(false)} w-full ${active ? '!text-white' : ''}`}
              >
                {active && <span className="absolute inset-y-1 start-0 w-1 rounded-full bg-[#F4B63F]" />}
                <entry.icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1 truncate text-start">{t(entry.labelKey)}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && <div className="mt-0.5 space-y-0.5">{entry.children.map((child) => renderLeaf(child, true))}</div>}
            </div>
          );
        })}
        <div className="my-2 mx-3 border-t border-white/15" />
        <button onClick={handleLogout} className={`${leafClass(false)} w-full`} title={compact ? t('common:nav.logout') : undefined}>
          <LogOut className="w-[18px] h-[18px] rtl:rotate-180" />
          {!compact && t('common:nav.logout')}
        </button>
      </nav>

      {!compact && (
        <div className="relative h-40 shrink-0 overflow-hidden">
          <img src="/images/jabal.png" alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_18%] opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06261A] via-[#06261A]/35 to-[#06261A]/90" />
          <div className="absolute bottom-5 start-6 end-6">
            <p className="text-xs font-bold tracking-wide leading-relaxed uppercase">
              {t('brand.footerLine1')}
              <br />
              {t('brand.footerLine2')}
            </p>
            <span className="block w-10 h-0.5 bg-[#F4B63F] mt-2" />
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex">
      <div className="hidden lg:block sticky top-0 h-screen shrink-0">{sidebar}</div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#EAE1D2]">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-16">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg text-[#0C261B] hover:bg-[#F4F1EA] min-w-[40px] min-h-[40px] grid place-items-center"
              aria-label={t(collapsed ? 'nav.expand' : 'nav.collapse')}
            >
              <Menu className="w-5 h-5" />
            </button>

            <GlobalSearch />

            <div className="flex-1 hidden xl:flex justify-end pe-2">
              <p className="font-['Playfair_Display',serif] italic text-[#0C261B] text-[15px] leading-tight text-end">
                {t('brand.sloganLine1')}
                <br />
                <span className="ps-6">{t('brand.sloganLine2')}</span>
              </p>
            </div>

            <div className="flex items-center gap-1 ms-auto xl:ms-0">
              <NotificationBell />
              <LanguageSwitcher compact />
              <div ref={accountRef} className="relative">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2 ps-1.5 pe-1 py-1 rounded-xl hover:bg-[#F4F1EA]"
                >
                  <Avatar name={user?.name} size={36} />
                  <span className="hidden md:block text-start leading-tight">
                    <span className="block text-sm font-bold text-[#0C261B] max-w-[140px] truncate">{user?.name}</span>
                    <span className="block text-[11px] text-[#6B7A71]">{t('brand.role')}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {accountOpen && (
                  <div className="absolute end-0 mt-1 w-56 bg-white border border-[#EAE1D2] rounded-xl shadow-lg py-1 z-40">
                    <div className="px-3 py-2 border-b border-[#EAE1D2]">
                      <p className="text-sm font-bold text-[#0C261B] truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/admin/parametres"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#0C261B] hover:bg-[#FAF6EE]"
                    >
                      <Settings className="w-4 h-4" />
                      {t('nav.settings')}
                    </Link>
                    <Link
                      to="/verificateur"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#0C261B] hover:bg-[#FAF6EE]"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      {t('nav.verifierPortal')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#B42323] hover:bg-[#FDF2F2]"
                    >
                      <LogOut className="w-4 h-4 rtl:rotate-180" />
                      {t('common:nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const GlobalSearch: React.FC = () => {
  const { t } = useTranslation('console');
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const { data, isFetching } = useAdminSearch(debounced);

  const groups = useMemo(() => {
    if (!data) return [];
    return [
      { key: 'producers', icon: Users, items: data.producers.map((p) => ({ id: p.id, title: p.name, subtitle: p.farmName, to: `/admin/producteurs/${p.id}` })) },
      { key: 'users', icon: UserRound, items: data.users.map((u) => ({ id: u.id, title: u.name, subtitle: u.email, to: `/admin/utilisateurs?user=${u.id}` })) },
      { key: 'batches', icon: Boxes, items: data.batches.map((b) => ({ id: b.id, title: b.batchCode, subtitle: b.honeyType, to: `/verificateur/lots/${b.id}` })) },
      { key: 'qrCodes', icon: QrCode, items: data.qrCodes.map((q) => ({ id: q.id, title: q.qrCode, subtitle: q.product.nom, to: '/admin/qr-codes' })) },
      { key: 'products', icon: ShoppingBag, items: data.products.map((p) => ({ id: p.id, title: p.nom, subtitle: p.statut, to: `/admin/produits/${p.id}` })) },
      { key: 'laboratories', icon: FlaskConical, items: data.laboratories.map((l) => ({ id: l.id, title: l.name, subtitle: [l.city, l.country].filter(Boolean).join(', '), to: `/admin/laboratoires?lab=${l.id}` })) },
      { key: 'alerts', icon: ShieldCheck, items: data.alerts.map((a) => ({ id: a.id, title: a.alertCode, subtitle: t(`enums.alertType.${a.type}`), to: `/admin/analyses/alertes?alert=${a.id}` })) },
    ].filter((group) => group.items.length > 0);
  }, [data, t]);

  const go = (to: string) => {
    setOpen(false);
    setValue('');
    navigate(to);
  };

  return (
    <div ref={ref} className="relative flex-1 max-w-xl">
      <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
        className="w-full h-10 ps-9 pe-3 2xl:pe-20 rounded-xl bg-[#F4F1EA] border border-transparent text-sm text-[#0C261B] placeholder:text-[#7C8A82] focus:bg-white focus:border-[#D49B37] focus:outline-none"
      />
      {open && value.trim().length > 0 && (
        <div className="absolute start-0 end-0 mt-1 bg-white border border-[#EAE1D2] rounded-xl shadow-xl z-50 max-h-[70vh] overflow-y-auto py-2 min-w-[300px]">
          {value.trim().length < 2 && <p className="px-4 py-3 text-xs text-gray-400">{t('search.minChars')}</p>}
          {value.trim().length >= 2 && isFetching && groups.length === 0 && <p className="px-4 py-3 text-xs text-gray-400">{t('states.loading')}</p>}
          {value.trim().length >= 2 && !isFetching && groups.length === 0 && <p className="px-4 py-3 text-xs text-gray-400">{t('search.noResults')}</p>}
          {groups.map((group) => (
            <div key={group.key} className="py-1">
              <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-[#9AA69F]">{t(`search.groups.${group.key}`)}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.to)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-start hover:bg-[#FAF6EE]"
                >
                  <group.icon className="w-4 h-4 text-[#17693F] shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#0C261B] truncate">{item.title}</span>
                    <span className="block text-xs text-gray-500 truncate">{item.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {/* Raccourci clavier, affiché seulement sur grand écran. */}
      <span className="hidden 2xl:block absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Pill tone="neutral" dot={false}>Ctrl K</Pill>
      </span>
    </div>
  );
};
