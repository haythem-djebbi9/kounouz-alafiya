import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { NotificationBell } from '../../components/NotificationBell';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useMyTickets } from '../../lib/support-hooks';
import { useAgentSearch } from './hooks';
import { AssignmentStatusPill, SampleStatusPill } from './ui';
import { initials } from './utils';

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: number;
}

// Portail Agent Terrain : pensé pour le téléphone (tiroir de navigation,
// cibles tactiles larges) comme pour la tablette ou le poste du bureau.
export const AgentLayout: React.FC = () => {
  const { t } = useTranslation(['agent', 'common']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { data: tickets = [] } = useMyTickets();

  // Tickets encore ouverts dont le dernier message vient de l'équipe Kounouz.
  const unreadMessages = tickets.filter((ticket) => {
    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') return false;
    const last = ticket.messages[ticket.messages.length - 1];
    return !!last && last.authorId !== user?.id;
  }).length;

  const nav: NavItem[] = [
    { to: '/agent', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
    { to: '/agent/missions', labelKey: 'nav.assignments', icon: ClipboardList },
    { to: '/agent/collecte', labelKey: 'nav.collection', icon: FlaskConical },
    { to: '/agent/scelles', labelKey: 'nav.seals', icon: ShieldCheck },
    { to: '/agent/tracabilite', labelKey: 'nav.custody', icon: Truck },
    { to: '/agent/visites', labelKey: 'nav.visits', icon: MapPin },
    { to: '/agent/rapports', labelKey: 'nav.reports', icon: BarChart3 },
    { to: '/agent/messages', labelKey: 'nav.messages', icon: MessageSquare, badge: unreadMessages },
  ];

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const renderLink = (item: NavItem, compact: boolean) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      title={compact ? t(`agent:${item.labelKey}`) : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
          compact ? 'justify-center px-2' : 'px-3.5'
        } ${
          isActive
            ? 'bg-white/10 text-white before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-[#D49B37]'
            : 'text-[#D9E4DC] hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <item.icon className="w-5 h-5 shrink-0" />
      {!compact && <span className="truncate flex-1">{t(`agent:${item.labelKey}`)}</span>}
      {!!item.badge && (
        <span
          className={`min-w-[20px] h-5 px-1.5 rounded-full bg-[#C7452F] text-white text-[11px] font-bold grid place-items-center ${
            compact ? 'absolute top-1 end-1 min-w-[16px] h-4 text-[9px] px-1' : ''
          }`}
        >
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </NavLink>
  );

  const sidebar = (compact: boolean) => (
    <div className="flex flex-col h-full">
      <div className={`py-5 border-b border-white/10 flex flex-col items-center gap-1 ${compact ? 'px-2' : 'px-5'}`}>
        <Link to="/agent" aria-label={t('agent:nav.dashboard')} className="flex flex-col items-center">
          <img
            src="/images/knozafialogo-removebg-preview.png"
            alt=""
            className={`object-contain ${compact ? 'w-11 h-11' : 'w-16 h-16'}`}
          />
          {!compact && (
            <>
              <span className="font-['Cairo'] text-xl font-bold text-white leading-tight">كنوز العافية</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/80">KOUNOUZ ALAFIYA</span>
            </>
          )}
        </Link>
        {!compact && <p className="text-[11px] font-semibold text-[#D49B37]">{t('agent:brand.motto')}</p>}
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${compact ? 'px-2' : 'px-3'}`}>
        {nav.map((item) => renderLink(item, compact))}
        <div className="pt-3 mt-3 border-t border-white/10 space-y-1">
          {renderLink({ to: '/agent/aide', labelKey: 'nav.help', icon: HelpCircle }, compact)}
        </div>
      </nav>

      {!compact && (
        <div className="relative h-40 shrink-0 overflow-hidden">
          <img src="/images/beekeeper.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C261B] via-[#0C261B]/60 to-transparent" />
          <div className="absolute bottom-4 start-5">
            <p className="text-[11px] font-bold text-white uppercase tracking-wide leading-snug">
              {t('agent:brand.tagline')}
              <br />
              {t('agent:brand.subline')}
            </p>
            <span className="block w-8 h-0.5 bg-[#D49B37] mt-2" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F7F4] flex">
      {/* Barre latérale fixe (écrans larges) */}
      <aside
        className={`hidden lg:block shrink-0 bg-[#0C261B] sticky top-0 h-screen transition-[width] duration-200 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {sidebar(collapsed)}
      </aside>

      {/* Tiroir mobile */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/50" aria-label={t('common:actions.close')} onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-[#0C261B] shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-3 end-3 p-2 rounded-lg text-white/80 hover:bg-white/10 z-10"
              aria-label={t('common:actions.close')}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-white border-b border-[#EAE1D2] px-3 sm:px-5 h-16 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => (window.matchMedia('(min-width: 1024px)').matches ? setCollapsed((v) => !v) : setDrawerOpen(true))}
            className="p-2.5 rounded-lg text-[#0C261B] hover:bg-[#FAF6EE] min-w-[44px] min-h-[44px] grid place-items-center"
            aria-label={t('common:nav.menu')}
          >
            <Menu className="w-5 h-5" />
          </button>

          <GlobalSearch />

          <div className="flex items-center gap-1 ms-auto">
            <span className="hidden sm:block">
              <LanguageSwitcher compact />
            </span>
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                className="flex items-center gap-2 ps-1 pe-1.5 py-1 rounded-lg hover:bg-[#FAF6EE]"
              >
                <span className="w-9 h-9 rounded-full bg-[#0C261B] text-white grid place-items-center text-xs font-bold">
                  {initials(user?.name)}
                </span>
                <span className="hidden md:block text-start leading-tight">
                  <span className="block text-sm font-bold text-[#0C261B]">{user?.name}</span>
                  <span className="block text-[11px] text-gray-500">{t('agent:brand.role')}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>

              {accountOpen && (
                <>
                  <button
                    className="fixed inset-0 z-10 cursor-default"
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setAccountOpen(false)}
                  />
                  <div className="absolute end-0 mt-1 w-60 bg-white border border-[#EAE1D2] rounded-xl shadow-lg py-1 z-20">
                    <p className="px-3 py-2 border-b border-[#EAE1D2]">
                      <span className="block text-sm font-bold text-[#0C261B] truncate">{user?.name}</span>
                      <span className="block text-xs text-gray-500 truncate">{user?.email}</span>
                    </p>
                    <div className="sm:hidden px-3 py-2 border-b border-[#EAE1D2]">
                      <LanguageSwitcher compact />
                    </div>
                    <Link to="/agent/parametres" className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#0C261B] hover:bg-[#FAF6EE]">
                      <Settings className="w-4 h-4" />
                      {t('agent:nav.settings')}
                    </Link>
                    <Link to="/agent/aide" className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#0C261B] hover:bg-[#FAF6EE]">
                      <HelpCircle className="w-4 h-4" />
                      {t('agent:nav.help')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#B42323] hover:bg-[#FDF2F2]"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('common:nav.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

/** Recherche transversale : missions, producteurs, échantillons et numéros de scellé. */
const GlobalSearch: React.FC = () => {
  const { t } = useTranslation('agent');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isFetching } = useAgentSearch(debounced);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const hasResults = !!data && (data.assignments.length > 0 || data.samples.length > 0);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl min-w-0">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && query.trim()) go(`/agent/missions?q=${encodeURIComponent(query.trim())}`);
        }}
        placeholder={t('search.placeholder')}
        className="w-full ps-9 pe-3 h-10 rounded-lg border border-[#E5E7E3] bg-[#F6F7F4] text-sm text-[#0C261B] placeholder:text-gray-400 focus:outline-none focus:border-[#D49B37] focus:bg-white"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute start-0 end-0 sm:end-auto sm:w-[28rem] mt-1 bg-white border border-[#EAE1D2] rounded-xl shadow-lg z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {isFetching && !data && <p className="px-4 py-4 text-xs text-gray-400">{t('common.loading')}</p>}
          {data && !hasResults && <p className="px-4 py-4 text-xs text-gray-400">{t('search.noResults')}</p>}

          {!!data?.assignments.length && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('search.assignments')}</p>
              {data.assignments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => go(`/agent/missions/${a.id}`)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start hover:bg-[#FAF6EE]"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#0C261B] truncate">
                      {a.request.producer.name} · {a.request.honeyType}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {a.assignmentCode} · {a.request.collectionLocation}
                    </span>
                  </span>
                  <AssignmentStatusPill status={a.status} />
                </button>
              ))}
            </div>
          )}

          {!!data?.samples.length && (
            <div className="border-t border-[#F1EDE3]">
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('search.samples')}</p>
              {data.samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => go(`/agent/tracabilite/${s.id}`)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start hover:bg-[#FAF6EE]"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#0C261B] truncate">
                      {s.sampleCode ?? '—'} · {s.request.honeyType}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {s.request.producer.name}
                      {s.seal ? ` · ${s.seal.sealCode}` : ''}
                    </span>
                  </span>
                  <SampleStatusPill status={s.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
