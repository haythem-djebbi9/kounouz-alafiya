import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Calendar,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  HelpCircle,
  Hourglass,
  Plus,
  ShieldCheck,
  Truck,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { dateLocale } from '../../../i18n';
import { useNotifications } from '../../../lib/notification-hooks';
import { InlineError, LoadingBlock } from '../../verifier/ui';
import { useAgentDashboard, useGeolocation } from '../hooks';
import { MapView, type MapMarker } from '../MapView';
import { AssignmentStatusPill, SectionCard, WeatherWidget } from '../ui';
import { formatTime, routeLink } from '../utils';
import type { Assignment } from '../types';

const NOTIFICATION_DOTS: Record<string, string> = {
  COLLECTION_ASSIGNED: '#3B7DD8',
  COLLECTION_AVAILABLE: '#3B7DD8',
  SAMPLE_RECEIVED: '#17693F',
  ANALYSIS_COMPLETED: '#D49B37',
  VERIFICATION_RESULT: '#D49B37',
};

/** Mission à ouvrir en priorité : celle en cours, sinon la prochaine de la journée. */
export function nextAssignment(assignments: Assignment[]) {
  return (
    assignments.find((a) => a.status === 'IN_PROGRESS') ?? assignments.find((a) => a.status === 'PENDING') ?? null
  );
}

export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAgentDashboard();
  const { data: notifications = [] } = useNotifications();
  const geo = useGeolocation(true);

  const now = new Date();
  const hour = now.getHours();
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const firstName = user?.name?.split(' ')[0] ?? '';

  const assignments = data?.assignments ?? [];
  const next = nextAssignment(assignments);
  const startCollectionPath = next ? `/agent/collecte/${next.id}` : '/agent/collecte';
  const agentPosition = geo.state.status === 'ready' ? geo.state.position : null;

  const { markers, stops } = useMemo(() => {
    const located = assignments.filter((a) => a.coordinates && a.status !== 'CANCELLED');
    const list: MapMarker[] = located.map((a) => ({
      position: a.coordinates!,
      kind: a.status === 'COMPLETED' ? 'done' : 'numbered',
      label: assignments.indexOf(a) + 1,
      title: `${a.request.producer.name} — ${a.request.delegation ?? a.request.collectionLocation}`,
      onClick: () => navigate(`/agent/missions/${a.id}`),
    }));
    if (agentPosition) list.unshift({ position: agentPosition, kind: 'home', title: t('dashboard.route.start') });
    return {
      markers: list,
      stops: [...(agentPosition ? [agentPosition] : []), ...located.map((a) => a.coordinates!)],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, agentPosition?.latitude, agentPosition?.longitude]);

  const fullRoute = routeLink(stops.slice(agentPosition ? 1 : 0));
  const weatherPosition = agentPosition ?? next?.coordinates ?? assignments.find((a) => a.coordinates)?.coordinates ?? null;
  const weatherPlace = agentPosition
    ? t('weather.currentPosition')
    : next
      ? next.request.delegation ?? next.request.collectionLocation
      : undefined;

  const stats = [
    { key: 'today', value: data?.stats.today, icon: ClipboardList, tone: 'bg-[#E8F5EC] text-[#17693F]', to: '/agent/missions?tab=TODAY' },
    { key: 'completed', value: data?.stats.completed, icon: CheckCheck, tone: 'bg-[#E8F5EC] text-[#17693F]', to: '/agent/missions?tab=COMPLETED' },
    { key: 'inProgress', value: data?.stats.inProgress, icon: Hourglass, tone: 'bg-[#FDF6E7] text-[#96661A]', to: '/agent/missions?tab=ACTIVE' },
    { key: 'upcoming', value: data?.stats.upcoming, icon: CalendarClock, tone: 'bg-[#EAF1FB] text-[#1D4E89]', to: '/agent/missions?tab=UPCOMING' },
  ] as const;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0C261B]">
            {t(`dashboard.greeting.${greetingKey}`, { name: firstName })}
          </h1>
          <p className="text-sm text-gray-500">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[#0C261B]">
            <Calendar className="w-5 h-5" />
            <div className="leading-tight">
              <p className="text-xs text-gray-500">{now.toLocaleDateString(locale, { weekday: 'long' })}</p>
              <p className="text-sm font-bold">{now.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <Link
            to={startCollectionPath}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0C261B] hover:bg-[#123626] text-white text-sm font-bold px-4 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.newCollection')}
          </Link>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-3">
          <InlineError message={t('common.loadError')} />
          <button onClick={() => refetch()} className="text-sm font-bold text-[#0C261B] underline">
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.key}
            to={stat.to}
            className="bg-white border border-[#EAE1D2] rounded-xl p-4 flex items-center gap-3 hover:border-[#D49B37] transition-colors"
          >
            <span className={`w-12 h-12 rounded-full grid place-items-center shrink-0 ${stat.tone}`}>
              <stat.icon className="w-6 h-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-extrabold text-[#0C261B] tabular-nums leading-none">
                {isLoading ? '–' : stat.value ?? 0}
              </span>
              <span className="block text-xs text-gray-600 mt-1 leading-tight">{t(`dashboard.stats.${stat.key}`)}</span>
            </span>
          </Link>
        ))}
      </div>

      {!!data?.stats.overdue && (
        <Link
          to="/agent/missions?tab=ACTIVE"
          className="flex items-center gap-2 rounded-lg border border-[#F3CFCF] bg-[#FDF2F2] px-4 py-3 text-sm font-semibold text-[#B42323]"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {t('dashboard.overdue', { count: data.stats.overdue })}
          <ChevronRight className="w-4 h-4 ms-auto rtl:rotate-180" />
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tournée du jour */}
        <SectionCard
          className="lg:col-span-2"
          title={t('dashboard.route.heading')}
          icon={<ClipboardList className="w-5 h-5" />}
          actions={
            fullRoute && (
              <a href={fullRoute} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#17693F] hover:underline">
                {t('common.viewFullMap')}
              </a>
            )
          }
        >
          {isLoading ? (
            <LoadingBlock label={t('common.loading')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-4">
              <MapView
                className="h-64 md:h-72"
                markers={markers}
                paths={stops.length > 1 ? [{ points: stops, followRoads: true }] : []}
                emptyLabel={t('dashboard.route.empty')}
              />
              <ol className="space-y-1">
                {assignments.length === 0 && <li className="text-sm text-gray-400 py-6 text-center">{t('dashboard.route.noStops')}</li>}
                {assignments.map((a, index) => (
                  <li key={a.id}>
                    <Link
                      to={`/agent/missions/${a.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#FAF6EE]"
                    >
                      <span
                        className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold text-white shrink-0 ${
                          a.status === 'COMPLETED' ? 'bg-[#17693F]' : 'bg-[#0C261B]'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-gray-500 tabular-nums">
                          {a.timeWindowStart ?? formatTime(a.scheduledDate, locale)}
                        </span>
                        <span className="block text-sm font-bold text-[#0C261B] truncate">{a.request.producer.name}</span>
                        <span className="block text-xs text-gray-500 truncate">
                          {a.request.delegation ?? a.request.collectionLocation}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 rtl:rotate-180" />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title={t('dashboard.notifications.heading')}
            icon={<Bell className="w-5 h-5" />}
            actions={
              <Link to="/agent/notifications" className="text-sm font-bold text-[#17693F] hover:underline">
                {t('common.viewAll')}
              </Link>
            }
          >
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">{t('dashboard.notifications.empty')}</p>
            ) : (
              <ul className="divide-y divide-[#F1EDE3]">
                {notifications.slice(0, 3).map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: NOTIFICATION_DOTS[n.type] ?? '#9AA69F' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm text-[#0C261B] ${n.isRead ? 'font-semibold' : 'font-bold'}`}>{n.title}</span>
                      <span className="block text-xs text-gray-500 line-clamp-2">{n.message}</span>
                    </span>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{relativeDay(n.createdAt, locale, t)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard bodyClassName="p-4 bg-gradient-to-br from-white to-[#F2F8F3] rounded-xl">
            <WeatherWidget position={weatherPosition} place={weatherPlace} />
          </SectionCard>
        </div>

        {/* Missions du jour */}
        <SectionCard
          className="lg:col-span-2"
          title={t('dashboard.table.heading', { count: assignments.length })}
          icon={<ClipboardCheck className="w-5 h-5" />}
          actions={
            <Link to="/agent/missions" className="text-sm font-bold text-[#17693F] hover:underline">
              {t('common.viewAll')}
            </Link>
          }
          bodyClassName="p-2 sm:p-4"
        >
          {assignments.length === 0 && !isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('dashboard.table.empty')}</p>
          ) : (
            <>
              {/* Tableau (tablette / bureau) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-xs text-gray-500">
                      {['index', 'producer', 'location', 'sampleType', 'status', 'action'].map((col) => (
                        <th key={col} className="text-start font-semibold px-3 py-2">
                          {t(`dashboard.table.cols.${col}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a, index) => (
                      <tr key={a.id} className="border-t border-[#F1EDE3]">
                        <td className="px-3 py-2.5 text-gray-500 tabular-nums">{index + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#0C261B]">{a.request.producer.name}</td>
                        <td className="px-3 py-2.5 text-gray-600">{a.request.delegation ?? a.request.collectionLocation}</td>
                        <td className="px-3 py-2.5 text-gray-600">{a.request.honeyType}</td>
                        <td className="px-3 py-2.5">
                          <AssignmentStatusPill status={a.status} overdue={a.isOverdue} />
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            to={`/agent/missions/${a.id}`}
                            className="inline-flex items-center gap-1 font-bold text-[#1D4E89] hover:underline"
                          >
                            {t('common.view')}
                            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Cartes (téléphone) */}
              <ul className="sm:hidden divide-y divide-[#F1EDE3]">
                {assignments.map((a, index) => (
                  <li key={a.id}>
                    <Link to={`/agent/missions/${a.id}`} className="flex items-center gap-3 px-2 py-3">
                      <span className="text-xs text-gray-400 tabular-nums w-4">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[#0C261B] truncate">{a.request.producer.name}</span>
                        <span className="block text-xs text-gray-500 truncate">
                          {a.request.delegation ?? a.request.collectionLocation} · {a.request.honeyType}
                        </span>
                      </span>
                      <AssignmentStatusPill status={a.status} overdue={a.isOverdue} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title={t('dashboard.quickActions.heading')} icon={<Zap className="w-5 h-5" />}>
            <div className="space-y-2.5">
              <Link
                to={startCollectionPath}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#0C261B] hover:bg-[#123626] text-white text-sm font-bold min-h-[46px]"
              >
                <FlaskConical className="w-4 h-4" />
                {t('dashboard.quickActions.startCollection')}
              </Link>
              <Link
                to="/agent/scelles"
                className="flex items-center justify-center gap-2 rounded-lg border border-[#0C261B] text-[#0C261B] hover:bg-[#FAF6EE] text-sm font-bold min-h-[46px]"
              >
                <ShieldCheck className="w-4 h-4" />
                {t('dashboard.quickActions.registerSeal')}
              </Link>
              <Link
                to="/agent/tracabilite?filtre=transport"
                className="flex items-center justify-center gap-2 rounded-lg border border-[#0C261B] text-[#0C261B] hover:bg-[#FAF6EE] text-sm font-bold min-h-[46px]"
              >
                <Truck className="w-4 h-4" />
                {t('dashboard.quickActions.updateDelivery')}
              </Link>
            </div>
          </SectionCard>

          <Link
            to="/agent/aide"
            className="flex items-center gap-3 bg-white border border-[#EAE1D2] rounded-xl p-4 hover:border-[#D49B37]"
          >
            <HelpCircle className="w-6 h-6 text-[#0C261B] shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#0C261B]">{t('dashboard.help.title')}</span>
              <span className="block text-xs text-gray-500">{t('dashboard.help.body')}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
};

function relativeDay(value: string, locale: string, t: (key: string) => string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return formatTime(date, locale);
  if (date.toDateString() === yesterday.toDateString()) return t('common.yesterday');
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}
