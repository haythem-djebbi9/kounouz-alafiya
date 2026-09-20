import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CheckCircle2, ChevronRight, Clock, MapPin, Route, Timer } from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { EmptyBlock, InlineError, LoadingBlock, PageHeader, SearchBox } from '../../verifier/ui';
import { useAssignments } from '../hooks';
import { MapView, type MapMarker } from '../MapView';
import { AssignmentStatusPill, SampleStatusPill, SectionCard } from '../ui';
import { formatDate, formatTime } from '../utils';

/** Historique des visites terrain : missions clôturées ou annulées. */
export const VisitsPage: React.FC = () => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError } = useAssignments('COMPLETED', search.trim());

  const completed = data.filter((a) => a.status === 'COMPLETED');
  const durations = completed
    .filter((a) => a.startedAt && a.completedAt)
    .map((a) => (new Date(a.completedAt!).getTime() - new Date(a.startedAt!).getTime()) / 60_000);
  const averageMinutes = durations.length ? Math.round(durations.reduce((x, y) => x + y, 0) / durations.length) : null;
  const regions = new Set(data.map((a) => a.request.delegation ?? a.request.collectionLocation)).size;

  const markers: MapMarker[] = useMemo(
    () =>
      data
        .filter((a) => a.coordinates)
        .map((a) => ({
          position: a.coordinates!,
          kind: a.status === 'COMPLETED' ? ('done' as const) : ('dot' as const),
          title: `${a.request.producer.name} — ${formatDate(a.completedAt ?? a.scheduledDate, locale)}`,
          onClick: () => navigate(`/agent/missions/${a.id}`),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, locale],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader title={t('visits.title')} subtitle={t('visits.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi icon={<CheckCircle2 className="w-5 h-5" />} label={t('visits.kpis.completed')} value={completed.length} />
        <Kpi icon={<Timer className="w-5 h-5" />} label={t('visits.kpis.averageDuration')} value={averageMinutes !== null ? `${averageMinutes} min` : '—'} />
        <Kpi icon={<Route className="w-5 h-5" />} label={t('visits.kpis.places')} value={regions} />
      </div>

      <SectionCard title={t('visits.map')} icon={<MapPin className="w-5 h-5" />}>
        <MapView className="h-72" markers={markers} emptyLabel={t('visits.mapEmpty')} />
      </SectionCard>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#0C261B]">{t('visits.history')}</h2>
        <SearchBox value={search} onChange={setSearch} placeholder={t('assignments.searchPlaceholder')} className="w-full max-w-xs" />
      </div>

      {isLoading && <LoadingBlock label={t('common.loading')} />}
      {isError && <InlineError message={t('common.loadError')} />}
      {!isLoading && data.length === 0 && (
        <div className="bg-white border border-[#EAE1D2] rounded-xl">
          <EmptyBlock icon={<MapPin className="w-8 h-8" />} title={t('visits.empty')} />
        </div>
      )}

      <ul className="space-y-3">
        {data.map((a) => (
          <li key={a.id}>
            <Link
              to={`/agent/missions/${a.id}`}
              className="flex flex-col md:flex-row md:items-center gap-3 bg-white border border-[#EAE1D2] rounded-xl p-4 hover:border-[#D49B37]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">{a.assignmentCode}</span>
                  <AssignmentStatusPill status={a.status} />
                  {a.sample && <SampleStatusPill status={a.sample.status} />}
                </div>
                <p className="text-base font-bold text-[#0C261B] truncate mt-1">
                  {a.request.producer.name} · {a.request.honeyType}
                </p>
                <p className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    {formatDate(a.completedAt ?? a.scheduledDate, locale)}
                  </span>
                  {a.completedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(a.completedAt, locale)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {a.request.collectionLocation}
                  </span>
                </p>
              </div>
              {a.sample && (
                <div className="text-sm md:text-end">
                  <p className="font-mono font-bold text-[#0C261B]">{a.sample.sampleCode}</p>
                  <p className="font-mono text-xs text-gray-500">{a.sample.seal?.sealCode ?? '—'}</p>
                </div>
              )}
              <ChevronRight className="hidden md:block w-4 h-4 text-gray-400 rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="bg-white border border-[#EAE1D2] rounded-xl p-4 flex items-center gap-3">
    <span className="w-11 h-11 rounded-full bg-[#E8F5EC] text-[#17693F] grid place-items-center">{icon}</span>
    <div>
      <p className="text-2xl font-extrabold text-[#0C261B] tabular-nums leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  </div>
);
