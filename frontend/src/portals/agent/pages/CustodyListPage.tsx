import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MapPin, PackageSearch } from 'lucide-react';
import { dateLocale } from '../../../i18n';
import type { SampleStatus } from '../../../lib/api-types';
import { EmptyBlock, InlineError, LoadingBlock, PageHeader, SearchBox, Tabs } from '../../verifier/ui';
import { useCustodySamples } from '../hooks';
import { SampleStatusPill } from '../ui';
import { formatDateTime } from '../utils';

type TabKey = 'CUSTODY' | 'DELIVERED' | 'ISSUES' | 'ALL';

const TAB_STATUSES: Record<Exclude<TabKey, 'ALL'>, SampleStatus[]> = {
  CUSTODY: ['COLLECTED', 'SEALED', 'IN_TRANSIT'],
  DELIVERED: ['RECEIVED', 'RECEIVED_AT_LAB', 'ANALYZED'],
  ISSUES: ['ISSUE'],
};

export const CustodyListPage: React.FC = () => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const [tab, setTab] = useState<TabKey>('CUSTODY');
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError } = useCustodySamples();

  const term = search.trim().toLowerCase();
  const rows = data
    .filter((s) => tab === 'ALL' || TAB_STATUSES[tab].includes(s.status))
    .filter(
      (s) =>
        !term ||
        [s.sampleCode, s.seal?.sealCode, s.request.producer.name, s.honeyType, s.request.honeyType, s.assignment?.assignmentCode]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term)),
    );

  const count = (key: TabKey) => (key === 'ALL' ? data.length : data.filter((s) => TAB_STATUSES[key].includes(s.status)).length);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title={t('custody.listTitle')} subtitle={t('custody.listSubtitle')} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <Tabs<TabKey>
          tabs={(['CUSTODY', 'DELIVERED', 'ISSUES', 'ALL'] as TabKey[]).map((key) => ({
            key,
            label: t(`custody.tabs.${key}`),
            count: count(key),
            tone: key === 'ISSUES' ? 'red' : undefined,
          }))}
          active={tab}
          onChange={setTab}
        />
        <SearchBox value={search} onChange={setSearch} placeholder={t('custody.searchPlaceholder')} className="md:w-72" />
      </div>

      {isLoading && <LoadingBlock label={t('common.loading')} />}
      {isError && <InlineError message={t('common.loadError')} />}

      {!isLoading && rows.length === 0 && (
        <div className="bg-white border border-[#EAE1D2] rounded-xl">
          <EmptyBlock icon={<PackageSearch className="w-8 h-8" />} title={t('custody.empty')} />
        </div>
      )}

      <ul className="space-y-3">
        {rows.map((sample) => (
          <li key={sample.id}>
            <Link
              to={`/agent/tracabilite/${sample.id}`}
              className="flex items-center gap-4 bg-white border border-[#EAE1D2] rounded-xl p-4 hover:border-[#D49B37] transition-colors"
            >
              <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-2 md:gap-4 md:items-center">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-[#0C261B]">{sample.sampleCode ?? '—'}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {sample.request.producer.name} · {sample.honeyType ?? sample.request.honeyType}
                  </p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="text-xs text-gray-400">{t('custody.sealNumber')}</p>
                  <p className="font-mono text-[#0C261B] truncate">{sample.seal?.sealCode ?? '—'}</p>
                </div>
                <div className="min-w-0 text-sm">
                  {sample.lastEvent ? (
                    <>
                      <p className="font-semibold text-[#0C261B] truncate">{t(`events.${sample.lastEvent.type}.title`)}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        {formatDateTime(sample.lastEvent.occurredAt, locale)}
                        {sample.lastEvent.location && (
                          <>
                            <MapPin className="w-3 h-3 shrink-0" />
                            {sample.lastEvent.location}
                          </>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">{formatDateTime(sample.collectionDate, locale)}</p>
                  )}
                </div>
              </div>
              <SampleStatusPill status={sample.status} />
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
