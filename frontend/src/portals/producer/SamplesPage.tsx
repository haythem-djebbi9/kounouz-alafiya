import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Eye, FlaskConical, Info, ShieldCheck, TestTube, Truck } from 'lucide-react';
import { Modal } from '../../design-system';
import { useMySamples } from './hooks';
import { PAGE_SIZE } from './constants';
import {
  EmptyRow,
  ErrorBlock,
  InfoCard,
  LoadingBlock,
  NAVY,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  SelectInput,
  StatCard,
  Table,
  Td,
  Th,
  ToneBadge,
} from './ui';
import { formatDate, formatDateTime, formatNumber, shortId } from './utils';
import type { Tone } from './utils';
import type { ProducerSample } from './types';
import type { SampleStatus } from '../../lib/api-types';

export const SAMPLE_TONE: Record<SampleStatus, Tone> = {
  COLLECTED: 'gray',
  SEALED: 'blue',
  IN_TRANSIT: 'blue',
  RECEIVED: 'blue',
  RECEIVED_AT_LAB: 'gold',
  ANALYZED: 'green',
  // Une anomalie gèle le dossier : le producteur voit que quelque chose
  // bloque, sans le détail de l'incident (donnée interne Kounouz).
  ISSUE: 'red',
};

const CUSTODY_STEPS: { status: SampleStatus; action: string }[] = [
  { status: 'COLLECTED', action: 'CREATE_SAMPLE' },
  { status: 'SEALED', action: 'APPLY_SEAL' },
  { status: 'IN_TRANSIT', action: 'SAMPLE_IN_TRANSIT' },
  { status: 'RECEIVED_AT_LAB', action: 'SAMPLE_RECEIVED_AT_LAB' },
  { status: 'ANALYZED', action: '' },
];

export const SamplesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { data: samples = [], isLoading, isError } = useMySamples();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SampleStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const selected = samples.find((s) => s.id === searchParams.get('echantillon')) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return samples.filter((s) => {
      if (status !== 'ALL' && s.status !== status) return false;
      if (!q) return true;
      return [s.seal?.sealCode, s.request.requestCode, s.request.honeyType, s.location].some((v) => v?.toLowerCase().includes(q));
    });
  }, [samples, search, status]);

  const countBy = (predicate: (s: ProducerSample) => boolean) => formatNumber(samples.filter(predicate).length, lang);

  return (
    <div>
      <PageHeader
        title={t('producer:samples.title')}
        subtitle={t('producer:samples.subtitle')}
        breadcrumb={[{ label: t('producer:nav.dashboard'), to: '/producteur' }, { label: t('producer:nav.samples') }]}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard tone="blue" icon={<TestTube className="w-5 h-5" />} label={t('producer:samples.stats.total')} value={countBy(() => true)} />
        <StatCard tone="gold" icon={<Truck className="w-5 h-5" />} label={t('producer:samples.stats.inCustody')} value={countBy((s) => ['COLLECTED', 'SEALED', 'IN_TRANSIT'].includes(s.status))} />
        <StatCard tone="red" icon={<FlaskConical className="w-5 h-5" />} label={t('producer:samples.stats.atLab')} value={countBy((s) => s.status === 'RECEIVED_AT_LAB')} />
        <StatCard tone="green" icon={<ShieldCheck className="w-5 h-5" />} label={t('producer:samples.stats.analyzed')} value={countBy((s) => s.status === 'ANALYZED')} />
      </div>

      <InfoCard tone="blue" className="mb-5" icon={<Info className="w-5 h-5 text-[#1F5F9C]" />}>
        {t('producer:samples.readOnlyNote')}
      </InfoCard>

      <Panel bodyClassName="p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('producer:samples.searchPlaceholder')} className="flex-1" />
          <SelectInput value={status} onChange={(e) => { setStatus(e.target.value as SampleStatus | 'ALL'); setPage(1); }} className="md:w-56" aria-label={t('producer:samples.cols.custody')}>
            <option value="ALL">{t('producer:common.allStatuses')}</option>
            {CUSTODY_STEPS.map((step) => (
              <option key={step.status} value={step.status}>
                {t(`producer:sampleStatus.${step.status}`)}
              </option>
            ))}
          </SelectInput>
        </div>

        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock />}
        {!isLoading && !isError && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('producer:samples.cols.ref')}</Th>
                  <Th>{t('producer:samples.cols.request')}</Th>
                  <Th>{t('producer:requests.cols.honeyType')}</Th>
                  <Th>{t('producer:samples.cols.collected')}</Th>
                  <Th>{t('producer:requests.cols.method')}</Th>
                  <Th>{t('producer:samples.cols.seal')}</Th>
                  <Th>{t('producer:samples.cols.custody')}</Th>
                  <Th>{t('producer:samples.cols.analysis')}</Th>
                  <Th className="text-end">{t('producer:common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={9} message={samples.length === 0 ? t('producer:samples.empty') : t('producer:common.noResults')} />}
                {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((sample) => {
                  const analysis = sample.labAnalyses[0];
                  return (
                    <tr key={sample.id} className="hover:bg-[#FAFBF9]">
                      <Td className="font-mono text-xs font-bold text-[#14215B]">{shortId(sample.id)}</Td>
                      <Td>
                        <Link to={`/producteur/demandes/${sample.request.id}`} className="font-semibold text-[#1F4FA3] hover:underline whitespace-nowrap">
                          {sample.request.requestCode ?? '—'}
                        </Link>
                      </Td>
                      <Td className="font-semibold text-[#14215B]">{sample.request.honeyType}</Td>
                      <Td className="whitespace-nowrap">{formatDate(sample.collectionDate, lang)}</Td>
                      <Td className="whitespace-nowrap">
                        {sample.request.preferredCollectionMethod ? t(`producer:collectionMethod.${sample.request.preferredCollectionMethod}.short`) : '—'}
                      </Td>
                      <Td>
                        {sample.seal ? (
                          <span className="flex flex-col">
                            <span className="font-mono text-xs font-bold">{sample.seal.sealCode}</span>
                            <span className={`text-[11px] font-semibold ${sample.seal.status === 'INTACT' ? 'text-[#17693F]' : 'text-rose-600'}`}>
                              {t(`producer:sealStatus.${sample.seal.status}`)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">{t('producer:samples.notSealed')}</span>
                        )}
                      </Td>
                      <Td>
                        <ToneBadge tone={SAMPLE_TONE[sample.status]}>{t(`producer:sampleStatus.${sample.status}`)}</ToneBadge>
                      </Td>
                      <Td className="whitespace-nowrap">{analysis ? t(`producer:analysisStatus.${analysis.status}`) : '—'}</Td>
                      <Td className="text-end">
                        <button
                          onClick={() => setSearchParams({ echantillon: sample.id })}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F4F8] px-3 py-1.5 text-xs font-bold text-[#14215B] hover:bg-[#E4E9F1]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t('producer:samples.viewCustody')}
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} summary={(from, to, total) => t('producer:common.showing', { from, to, total })} />
          </>
        )}
      </Panel>

      <Modal isOpen={!!selected} onClose={() => setSearchParams({})} title={t('producer:samples.custodyTitle')} maxWidth="max-w-xl">
        {selected && <CustodyDetail sample={selected} />}
      </Modal>
    </div>
  );
};

const CustodyDetail: React.FC<{ sample: ProducerSample }> = ({ sample }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const currentIndex = CUSTODY_STEPS.findIndex((s) => s.status === sample.status);
  const analysis = sample.labAnalyses[0];

  const eventDate = (action: string, status: SampleStatus) => {
    if (status === 'ANALYZED') return analysis?.analysisDate ?? null;
    return sample.custodyEvents.find((e) => e.action === action)?.createdAt ?? (status === 'COLLECTED' ? sample.collectionDate : null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">{t('producer:samples.cols.request')}</p>
          <p className={`font-bold ${NAVY}`}>{sample.request.requestCode ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('producer:requests.cols.honeyType')}</p>
          <p className={`font-bold ${NAVY}`}>{sample.request.honeyType}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('producer:samples.quantity')}</p>
          <p className={`font-bold ${NAVY}`}>{t('producer:common.kg', { value: formatNumber(Number(sample.quantity), lang, 3) })}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('producer:samples.location')}</p>
          <p className={`font-bold ${NAVY}`}>{sample.location}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('producer:samples.seal')}</p>
          <p className={`font-bold font-mono ${NAVY}`}>{sample.seal?.sealCode ?? '—'}</p>
        </div>
        <div>
          <p className="text-gray-500">{t('producer:samples.collectedBy')}</p>
          <p className={`font-bold ${NAVY}`}>{sample.collectedBy.name}</p>
        </div>
      </div>

      <div className="border-t border-[#EEF0EC] pt-4">
        <p className={`font-bold mb-3 ${NAVY}`}>{t('producer:samples.chain')}</p>
        <ol>
          {CUSTODY_STEPS.map((step, idx) => {
            const done = idx <= currentIndex;
            const date = done ? eventDate(step.action, step.status) : null;
            return (
              <li key={step.status} className={`relative ps-9 ${idx < CUSTODY_STEPS.length - 1 ? 'pb-5' : ''}`}>
                {idx < CUSTODY_STEPS.length - 1 && (
                  <span className={`absolute start-[13px] top-7 bottom-0 w-0.5 ${idx < currentIndex ? 'bg-[#0B4A2F]' : 'bg-[#E1E5DF]'}`} />
                )}
                <span
                  className={`absolute start-0 top-0 w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                    done ? 'bg-[#0B4A2F] border-[#0B4A2F] text-white' : 'bg-white border-[#D5DAD4] text-gray-400'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                </span>
                <p className={`text-sm font-bold ${done ? NAVY : 'text-gray-400'}`}>{t(`producer:sampleStatus.${step.status}`)}</p>
                <p className="text-xs text-gray-500">{date ? formatDateTime(date, lang) : done ? t('producer:samples.dateUnavailable') : t('producer:samples.upcoming')}</p>
              </li>
            );
          })}
        </ol>
      </div>

      {analysis && (
        <InfoCard tone={analysis.status === 'NON_COMPLIANT' ? 'red' : analysis.status === 'COMPLIANT' ? 'green' : 'gold'} icon={<FlaskConical className="w-5 h-5" />}>
          <p className={`font-bold ${NAVY}`}>{analysis.laboratory.name}</p>
          <p>
            {t(`producer:analysisStatus.${analysis.status}`)} · {formatDate(analysis.analysisDate, lang)}
          </p>
        </InfoCard>
      )}
      <p className="text-xs text-gray-500">{t('producer:samples.readOnlyNote')}</p>
    </div>
  );
};
