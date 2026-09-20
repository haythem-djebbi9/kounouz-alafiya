import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDown, CheckCircle2, ExternalLink, Eye, Layers, PackageCheck, PackageOpen, Scale } from 'lucide-react';
import { Modal } from '../../design-system';
import { useMyBatches } from './hooks';
import { PAGE_SIZE } from './constants';
import {
  BtnLink,
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
import { BATCH_TONE, formatDate, formatNumber } from './utils';
import type { ProducerBatch } from './types';
import type { BatchStatus } from '../../lib/api-types';

const STATUSES: BatchStatus[] = ['CREATED', 'PACKAGED', 'READY'];

export const BatchesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { data: batches = [], isLoading, isError } = useMyBatches();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BatchStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const selected = batches.find((b) => b.id === searchParams.get('lot')) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (status !== 'ALL' && b.status !== status) return false;
      if (!q) return true;
      return [b.batchCode, b.honeyType, b.verification.request.requestCode].some((v) => v?.toLowerCase().includes(q));
    });
  }, [batches, search, status]);

  const totalKg = batches.reduce((sum, b) => sum + Number(b.quantityKg), 0);

  return (
    <div>
      <PageHeader
        title={t('producer:batches.title')}
        subtitle={t('producer:batches.subtitle')}
        breadcrumb={[{ label: t('producer:nav.dashboard'), to: '/producteur' }, { label: t('producer:nav.batches') }]}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard tone="blue" icon={<Layers className="w-5 h-5" />} label={t('producer:batches.stats.total')} value={formatNumber(batches.length, lang)} />
        <StatCard tone="green" icon={<Scale className="w-5 h-5" />} label={t('producer:batches.stats.verifiedKg')} value={formatNumber(totalKg, lang, 1)} unit={t('producer:common.kgUnit')} />
        <StatCard tone="gold" icon={<PackageOpen className="w-5 h-5" />} label={t('producer:batches.stats.packaging')} value={formatNumber(batches.filter((b) => b.status !== 'READY').length, lang)} />
        <StatCard tone="green" icon={<PackageCheck className="w-5 h-5" />} label={t('producer:batches.stats.active')} value={formatNumber(batches.filter((b) => b.status === 'READY').length, lang)} />
      </div>

      <InfoCard tone="gold" className="mb-5" icon={<PackageCheck className="w-5 h-5 text-[#A56A0B]" />}>
        {t('producer:batches.note')}
      </InfoCard>

      <Panel bodyClassName="p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('producer:batches.searchPlaceholder')} className="flex-1" />
          <SelectInput value={status} onChange={(e) => { setStatus(e.target.value as BatchStatus | 'ALL'); setPage(1); }} className="md:w-56" aria-label={t('producer:batches.cols.status')}>
            <option value="ALL">{t('producer:common.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`producer:batchStatus.${s}`)}
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
                  <Th>{t('producer:batches.cols.id')}</Th>
                  <Th>{t('producer:batches.cols.honeyType')}</Th>
                  <Th>{t('producer:batches.cols.quantity')}</Th>
                  <Th>{t('producer:batches.cols.request')}</Th>
                  <Th>{t('producer:batches.cols.verified')}</Th>
                  <Th>{t('producer:batches.cols.packaging')}</Th>
                  <Th>{t('producer:batches.cols.products')}</Th>
                  <Th>{t('producer:batches.cols.status')}</Th>
                  <Th className="text-end">{t('producer:common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={9} message={batches.length === 0 ? t('producer:batches.empty') : t('producer:common.noResults')} />}
                {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((batch) => (
                  <tr key={batch.id} className="hover:bg-[#FAFBF9]">
                    <Td className="font-mono text-xs font-bold text-[#1F4FA3] whitespace-nowrap">{batch.batchCode}</Td>
                    <Td className="font-semibold text-[#14215B]">{batch.honeyType}</Td>
                    <Td className="whitespace-nowrap">{t('producer:common.kg', { value: formatNumber(Number(batch.quantityKg), lang, 1) })}</Td>
                    <Td>
                      <Link to={`/producteur/demandes/${batch.verification.request.id}`} className="text-[#1F4FA3] hover:underline whitespace-nowrap">
                        {batch.verification.request.requestCode ?? '—'}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(batch.verification.verifiedAt, lang)}</Td>
                    <Td className="whitespace-nowrap">
                      {batch.packaging ? `${batch.packaging.packageType} · ${batch.packaging.size}` : t('producer:batches.noPackaging')}
                    </Td>
                    <Td>{formatNumber(batch.products.length, lang)}</Td>
                    <Td>
                      <ToneBadge tone={BATCH_TONE[batch.status]}>{t(`producer:batchStatus.${batch.status}`)}</ToneBadge>
                    </Td>
                    <Td className="text-end">
                      <button
                        onClick={() => setSearchParams({ lot: batch.id })}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F4F8] px-3 py-1.5 text-xs font-bold text-[#14215B] hover:bg-[#E4E9F1]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t('producer:batches.traceability')}
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} summary={(from, to, total) => t('producer:common.showing', { from, to, total })} />
          </>
        )}
      </Panel>

      <Modal isOpen={!!selected} onClose={() => setSearchParams({})} title={selected?.batchCode ?? ''} maxWidth="max-w-xl">
        {selected && <BatchTrace batch={selected} />}
      </Modal>
    </div>
  );
};

const BatchTrace: React.FC<{ batch: ProducerBatch }> = ({ batch }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;

  const chain = [
    { label: t('producer:trace.request'), value: batch.verification.request.requestCode ?? '—', sub: batch.verification.request.collectionLocation, to: `/producteur/demandes/${batch.verification.request.id}` },
    { label: t('producer:trace.sample'), value: batch.verification.sample.seal?.sealCode ?? '—', sub: t('producer:samples.seal'), to: `/producteur/echantillons?echantillon=${batch.verification.sample.id}` },
    { label: t('producer:trace.analysis'), value: t(`producer:analysisStatus.${batch.verification.analysis.status}`), sub: formatDate(batch.verification.analysis.analysisDate, lang) },
    { label: t('producer:trace.verification'), value: t(`producer:verificationStatus.${batch.verification.status}`), sub: formatDate(batch.verification.verifiedAt, lang) },
    { label: t('producer:trace.batch'), value: batch.batchCode, sub: `${t(`producer:batchStatus.${batch.status}`)} · ${t('producer:common.kg', { value: formatNumber(Number(batch.quantityKg), lang, 1) })}` },
    {
      label: t('producer:trace.packaging'),
      value: batch.packaging ? `${batch.packaging.packageType} · ${batch.packaging.size}` : t('producer:batches.noPackaging'),
      sub: batch.packaging ? `${t(`producer:packagingStatus.${batch.packaging.status}`)} · ${formatDate(batch.packaging.productionDate, lang)}` : '',
    },
  ];

  return (
    <div className="space-y-4">
      <ol className="space-y-1">
        {chain.map((node, idx) => (
          <li key={node.label}>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E6E8E3] px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-[#17693F] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">{node.label}</p>
                  <p className={`text-sm font-bold truncate ${NAVY}`}>{node.value}</p>
                  {node.sub && <p className="text-xs text-gray-500 truncate">{node.sub}</p>}
                </div>
              </div>
              {node.to && (
                <Link to={node.to} className="text-xs font-bold text-[#1F4FA3] hover:underline shrink-0">
                  {t('producer:common.view')}
                </Link>
              )}
            </div>
            {idx < chain.length - 1 && <ArrowDown className="w-4 h-4 text-gray-300 mx-auto my-0.5" />}
          </li>
        ))}
      </ol>

      <div>
        <p className={`font-bold mb-2 ${NAVY}`}>{t('producer:trace.products')}</p>
        {batch.products.length === 0 && <p className="text-sm text-gray-500">{t('producer:batches.noProducts')}</p>}
        <ul className="space-y-2">
          {batch.products.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F7F5] px-3 py-2">
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${NAVY}`}>{product.nom}</p>
                <p className="text-xs text-gray-500">
                  {t(`producer:productStatus.${product.statut}`)} · {t('producer:products.stockUnits', { count: product.stock })}
                </p>
              </div>
              {product.qrCode && (
                <a
                  href={`/verify/${product.qrCode.qrId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1F4FA3] hover:underline shrink-0"
                >
                  {product.qrCode.qrCode}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
      <BtnLink to={`/producteur/produits`} variant="outline" className="w-full">
        {t('producer:batches.viewProducts')}
      </BtnLink>
    </div>
  );
};
