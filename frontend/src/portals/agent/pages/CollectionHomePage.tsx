import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronRight, Clock, FlaskConical, MapPin, PlayCircle } from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { EmptyBlock, InlineError, LoadingBlock, PageHeader } from '../../verifier/ui';
import { useAssignments } from '../hooks';
import { AssignmentStatusPill, PriorityPill } from '../ui';
import type { Assignment } from '../types';
import { formatDate, formatTime } from '../utils';

/** Point d'entrée « Collecte d'échantillon » : reprendre ou démarrer une mission. */
export const CollectionHomePage: React.FC = () => {
  const { t } = useTranslation('agent');
  const { data = [], isLoading, isError } = useAssignments('ACTIVE');

  const inProgress = data.filter((a) => a.status === 'IN_PROGRESS');
  const toStart = data.filter((a) => a.status === 'PENDING');

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title={t('collectionHome.title')} subtitle={t('collectionHome.subtitle')} />

      {isLoading && <LoadingBlock label={t('common.loading')} />}
      {isError && <InlineError message={t('common.loadError')} />}

      {!isLoading && data.length === 0 && (
        <div className="bg-white border border-[#EAE1D2] rounded-xl">
          <EmptyBlock
            icon={<FlaskConical className="w-8 h-8" />}
            title={t('collectionHome.empty')}
            description={t('collectionHome.emptyHint')}
            action={
              <Link to="/agent/missions?tab=AVAILABLE" className="inline-flex rounded-lg bg-[#0C261B] text-white text-sm font-bold px-4 py-2.5">
                {t('collectionHome.browseAvailable')}
              </Link>
            }
          />
        </div>
      )}

      {inProgress.length > 0 && <Group title={t('collectionHome.inProgress')} items={inProgress} />}
      {toStart.length > 0 && <Group title={t('collectionHome.toStart')} items={toStart} />}
    </div>
  );
};

const Group: React.FC<{ title: string; items: Assignment[] }> = ({ title, items }) => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  return (
    <section className="mb-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</h2>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="bg-white border border-[#EAE1D2] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500">{a.assignmentCode}</span>
                <AssignmentStatusPill status={a.status} overdue={a.isOverdue} />
                {a.priority !== 'NORMAL' && <PriorityPill priority={a.priority} />}
              </div>
              <p className="text-base font-bold text-[#0C261B] truncate mt-1">
                {a.request.producer.name} · {a.request.honeyType}
              </p>
              <p className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  {formatDate(a.scheduledDate, locale)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {a.timeWindowStart ?? formatTime(a.scheduledDate, locale)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {a.request.collectionLocation}
                </span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                to={`/agent/missions/${a.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[#EAE1D2] text-[#0C261B] text-sm font-bold px-3 min-h-[44px]"
              >
                {t('common.details')}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
              <Link
                to={`/agent/collecte/${a.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0C261B] text-white text-sm font-bold px-4 min-h-[44px]"
              >
                <PlayCircle className="w-4 h-4" />
                {a.status === 'IN_PROGRESS' ? t('assignmentDetail.continueCollection') : t('assignmentDetail.startCollection')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
