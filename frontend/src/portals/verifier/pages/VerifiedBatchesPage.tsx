import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Package,
  PauseCircle,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import {
  useAdvanceBatch,
  useCreateBatch,
  useEligibleVerifications,
  useHoldBatch,
  useReleaseBatch,
  useVerifiedBatches,
  type BatchFilters,
} from '../commerce-hooks';
import { BATCH_STATUS_TONE, NEXT_BATCH_STATUS, PRODUCT_STATUS_TONE } from '../status-map';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  Field,
  InlineError,
  KpiCard,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  SelectInput,
  StatusPill,
  Table,
  Tabs,
  Td,
  TextArea,
  TextInput,
  Th,
} from '../ui';
import { Modal } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { BatchBucket, BatchListItem } from '../types';

export const VerifiedBatchesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<BatchFilters>({
    bucket: 'ALL',
    search: '',
    sort: 'NEWEST',
    page: 1,
    pageSize: 8,
  });
  const [selectedId, setSelectedId] = useState<string | null>(params.get('selected'));
  const [createOpen, setCreateOpen] = useState(false);

  const list = useVerifiedBatches(filters);

  useEffect(() => {
    if (!selectedId && list.data && list.data.items.length > 0) {
      setSelectedId(list.data.items[0].id);
    }
  }, [list.data, selectedId]);

  const select = (id: string) => {
    setSelectedId(id);
    setParams({ selected: id }, { replace: true });
  };

  const selected = list.data?.items.find((item) => item.id === selectedId) ?? null;
  const stats = list.data?.stats;
  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const tabs: { key: BatchBucket; label: string; count?: number }[] = [
    { key: 'ALL', label: t('verifier:tabs.all'), count: stats?.counts.ALL },
    {
      key: 'READY_FOR_PACKAGING',
      label: t('verifier:batches.bucket.readyForPackaging'),
      count: stats?.counts.READY_FOR_PACKAGING,
    },
    {
      key: 'IN_PACKAGING',
      label: t('verifier:batches.bucket.inPackaging'),
      count: stats?.counts.IN_PACKAGING,
    },
    { key: 'CONVERTED', label: t('verifier:batches.bucket.converted'), count: stats?.counts.CONVERTED },
    { key: 'ON_HOLD', label: t('verifier:batches.bucket.onHold'), count: stats?.counts.ON_HOLD },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:batches.title') }]} />
      <PageHeader
        title={t('verifier:batches.title')}
        subtitle={t('verifier:batches.subtitle')}
        actions={
          <Btn onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('verifier:actions.createBatch')}
          </Btn>
        }
      />

      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
          <KpiCard
            label={t('verifier:batches.kpi.total')}
            value={stats.counts.ALL}
            icon={<Boxes className="w-4 h-4" />}
            hint={t('verifier:batches.kpi.totalHint')}
          />
          <KpiCard
            label={t('verifier:batches.bucket.readyForPackaging')}
            value={stats.counts.READY_FOR_PACKAGING}
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="green"
            hint={t('verifier:batches.kpi.awaitingPackaging')}
          />
          <KpiCard
            label={t('verifier:batches.bucket.inPackaging')}
            value={stats.counts.IN_PACKAGING}
            icon={<Package className="w-4 h-4" />}
            tone="amber"
            hint={t('verifier:batches.kpi.inProcess')}
          />
          <KpiCard
            label={t('verifier:batches.bucket.converted')}
            value={stats.counts.CONVERTED}
            icon={<ShoppingCart className="w-4 h-4" />}
            tone="blue"
            hint={t('verifier:batches.kpi.inStore')}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <Tabs
          tabs={tabs}
          active={filters.bucket ?? 'ALL'}
          onChange={(bucket) => setFilters((f) => ({ ...f, bucket, page: 1 }))}
        />
        <div className="flex gap-2 lg:ms-auto">
          <TextInput
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
            className="w-auto text-xs"
            aria-label={t('verifier:samples.from')}
          />
          <TextInput
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
            className="w-auto text-xs"
            aria-label={t('verifier:samples.to')}
          />
          <SelectInput
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as BatchFilters['sort'], page: 1 }))}
            className="w-auto text-xs"
          >
            <option value="NEWEST">{t('verifier:sort.newest')}</option>
            <option value="OLDEST">{t('verifier:sort.oldest')}</option>
          </SelectInput>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel bodyClassName="p-0">
            <div className="p-3 border-b border-[#EAE1D2]">
              <SearchBox
                value={filters.search ?? ''}
                onChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
                placeholder={t('verifier:batches.searchPlaceholder')}
              />
            </div>

            {list.isLoading && <LoadingBlock label={t('common:status.loading')} />}

            {list.data && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>{t('verifier:table.batchId')}</Th>
                      <Th>{t('verifier:table.producer')}</Th>
                      <Th>{t('verifier:table.honeyType')}</Th>
                      <Th>{t('verifier:table.quantity')}</Th>
                      <Th>{t('verifier:table.verificationDate')}</Th>
                      <Th>{t('verifier:table.status')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <EmptyBlock
                            title={t('verifier:batches.empty')}
                            description={t('verifier:batches.emptyHint')}
                          />
                        </td>
                      </tr>
                    )}
                    {list.data.items.map((batch) => (
                      <tr
                        key={batch.id}
                        onClick={() => select(batch.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedId === batch.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                        }`}
                      >
                        <Td className="font-mono text-xs font-bold text-[#0C261B]">{batch.batchCode}</Td>
                        <Td className="text-xs text-[#0C261B]">
                          {batch.verification.request.producer.name}
                        </Td>
                        <Td className="text-xs text-gray-600">{batch.honeyType}</Td>
                        <Td className="text-xs text-gray-600 tabular-nums">{batch.quantityKg} kg</Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(batch.verification.verifiedAt)}
                        </Td>
                        <Td>
                          <StatusPill
                            tone={BATCH_STATUS_TONE[batch.status]}
                            label={t(`verifier:status.batch.${batch.status}`)}
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Pagination
                  page={list.data.page}
                  pageCount={list.data.pageCount}
                  total={list.data.total}
                  pageSize={list.data.pageSize}
                  onChange={(page) => setFilters((f) => ({ ...f, page }))}
                  summary={(from, to, total) => t('verifier:pagination.summaryBatches', { from, to, total })}
                />
              </>
            )}
          </Panel>
        </div>

        <div className="xl:col-span-4">
          {!selected && (
            <Panel>
              <EmptyBlock title={t('verifier:batches.selectPrompt')} icon={<Boxes className="w-8 h-8" />} />
            </Panel>
          )}
          {selected && <BatchSidePanel batch={selected} formatDate={formatDate} />}
        </div>
      </div>

      {createOpen && <CreateBatchModal onClose={() => setCreateOpen(false)} onCreated={select} />}
    </div>
  );
};

// --- Panneau latéral -------------------------------------------------------

const BatchSidePanel: React.FC<{
  batch: BatchListItem;
  formatDate: (value: string | null) => string;
}> = ({ batch, formatDate }) => {
  const { t } = useTranslation(['verifier', 'common']);
  const [error, setError] = useState('');
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [holdKind, setHoldKind] = useState<'SUSPENDED' | 'RECALLED'>('SUSPENDED');

  const advance = useAdvanceBatch();
  const hold = useHoldBatch();
  const release = useReleaseBatch();

  const next = NEXT_BATCH_STATUS[batch.status];
  const onHold = batch.status === 'SUSPENDED' || batch.status === 'RECALLED';

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      setHoldOpen(false);
      setHoldReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Panel title={t('verifier:batches.detailTitle')} bodyClassName="p-0">
      <div className="p-4 border-b border-[#EAE1D2]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-base font-extrabold text-[#0C261B]">{batch.batchCode}</h3>
          <StatusPill
            tone={BATCH_STATUS_TONE[batch.status]}
            label={t(`verifier:status.batch.${batch.status}`)}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">{batch.honeyType}</p>
        <p className="text-xs text-gray-500">{batch.verification.request.producer.name}</p>
      </div>

      <div className="p-4 space-y-3">
        {error && <InlineError message={error} />}

        {batch.holdReason && (
          <div className="rounded-lg border border-[#EFD9A8] bg-[#FDF6E7] p-3">
            <p className="text-xs font-bold text-[#96661A]">{t('verifier:batches.holdReason')}</p>
            <p className="text-sm text-[#96661A] mt-0.5">{batch.holdReason}</p>
          </div>
        )}

        <dl className="space-y-1.5 text-xs">
          <Row label={t('verifier:fields.origin')} value={batch.origin} />
          <Row label={t('verifier:fields.harvestSeason')} value={batch.harvestSeason} />
          <Row label={t('verifier:fields.quantity')} value={`${batch.quantityKg} kg`} />
          <Row label={t('verifier:fields.productionDate')} value={formatDate(batch.productionDate)} />
          <Row label={t('verifier:fields.bestBefore')} value={formatDate(batch.bestBefore)} />
          <Row
            label={t('verifier:fields.verificationId')}
            value={batch.verification.verificationCode}
            mono
          />
          <Row label={t('verifier:fields.qrGenerated')} value={String(batch._count.qrCodes)} />
        </dl>

        {batch.products.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#0C261B] mb-1.5">{t('verifier:batches.products')}</p>
            <ul className="space-y-1.5">
              {batch.products.map((product) => (
                <li key={product.id} className="flex items-center gap-2 text-xs">
                  <span className="text-[#0C261B] truncate flex-1">{product.nom}</span>
                  <StatusPill
                    tone={PRODUCT_STATUS_TONE[product.statut]}
                    label={t(`verifier:status.product.${product.statut}`)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-3 border-t border-[#EAE1D2]">
          <Link to={`/verificateur/lots/${batch.id}`}>
            <Btn variant="secondary" size="sm" className="w-full">
              {t('verifier:actions.viewFullDetails')}
            </Btn>
          </Link>

          {next && !onHold && (
            <Btn
              size="sm"
              isLoading={advance.isPending}
              onClick={() => run(() => advance.mutateAsync({ id: batch.id, status: next }))}
            >
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              {t(`verifier:batches.advanceTo.${next}`)}
            </Btn>
          )}

          {batch.status === 'SUSPENDED' && (
            <Btn
              variant="success"
              size="sm"
              isLoading={release.isPending}
              onClick={() => run(() => release.mutateAsync(batch.id))}
            >
              {t('verifier:actions.releaseBatch')}
            </Btn>
          )}

          {!onHold && (
            <Btn variant="danger" size="sm" onClick={() => setHoldOpen(true)}>
              <PauseCircle className="w-3.5 h-3.5" />
              {t('verifier:actions.holdBatch')}
            </Btn>
          )}
        </div>

        {holdOpen && (
          <div className="rounded-lg border border-[#EAE1D2] bg-[#FAF6EE] p-3 space-y-2">
            <Field label={t('verifier:batches.holdKind')}>
              <SelectInput
                value={holdKind}
                onChange={(e) => setHoldKind(e.target.value as 'SUSPENDED' | 'RECALLED')}
              >
                <option value="SUSPENDED">{t('verifier:status.batch.SUSPENDED')}</option>
                <option value="RECALLED">{t('verifier:status.batch.RECALLED')}</option>
              </SelectInput>
            </Field>
            <Field label={t('verifier:batches.holdReason')} required hint={t('verifier:batches.holdHint')}>
              <TextArea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} />
            </Field>
            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" size="sm" onClick={() => setHoldOpen(false)}>
                {t('common:actions.cancel')}
              </Btn>
              <Btn
                variant="danger"
                size="sm"
                isLoading={hold.isPending}
                disabled={!holdReason.trim()}
                onClick={() =>
                  run(() => hold.mutateAsync({ id: batch.id, status: holdKind, reason: holdReason }))
                }
              >
                {t('common:actions.confirm')}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

// --- Création --------------------------------------------------------------

const CreateBatchModal: React.FC<{ onClose: () => void; onCreated: (id: string) => void }> = ({
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const { data: eligible } = useEligibleVerifications();
  const create = useCreateBatch();
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    verificationId: '',
    quantityKg: '',
    productionDate: today,
    expiryDate: '',
    origin: '',
    harvestSeason: '',
    notes: '',
  });

  const selected = eligible?.find((v) => v.id === form.verificationId);

  // Pré-remplit la quantité et l'origine depuis la demande vérifiée : ce sont
  // les valeurs attendues dans la quasi-totalité des cas.
  const pick = (verificationId: string) => {
    const verification = eligible?.find((v) => v.id === verificationId);
    setForm((f) => ({
      ...f,
      verificationId,
      quantityKg: verification ? String(verification.request.quantity) : f.quantityKg,
      origin: verification?.request.governorate ? `${verification.request.governorate}, Tunisie` : f.origin,
      harvestSeason: verification?.request.productionSeason ?? f.harvestSeason,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const batch = await create.mutateAsync({
        verificationId: form.verificationId,
        quantityKg: Number(form.quantityKg),
        productionDate: new Date(form.productionDate).toISOString(),
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        bestBefore: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        origin: form.origin || undefined,
        harvestSeason: form.harvestSeason || undefined,
        notes: form.notes || undefined,
      });
      onCreated(batch.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('verifier:actions.createBatch')} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-3">
        {error && <InlineError message={error} />}

        {eligible?.length === 0 && (
          <p className="text-sm text-gray-500">{t('verifier:batches.noEligible')}</p>
        )}

        <Field label={t('verifier:batches.sourceVerification')} required>
          <SelectInput value={form.verificationId} onChange={(e) => pick(e.target.value)} required>
            <option value="">{t('verifier:batches.selectVerification')}</option>
            {(eligible ?? []).map((verification) => (
              <option key={verification.id} value={verification.id}>
                {verification.verificationCode} — {verification.request.producer.name} (
                {verification.request.honeyType})
              </option>
            ))}
          </SelectInput>
        </Field>

        {selected && (
          <p className="text-xs text-gray-500 bg-[#FAF6EE] rounded-lg p-2.5">
            {t('verifier:batches.sourceHint', {
              request: selected.request.requestCode,
              honeyType: selected.request.honeyType,
            })}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('verifier:fields.quantity')} required hint="kg">
            <TextInput
              type="number"
              step="0.001"
              min="0.001"
              value={form.quantityKg}
              onChange={(e) => setForm((f) => ({ ...f, quantityKg: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('verifier:fields.productionDate')} required>
            <TextInput
              type="date"
              value={form.productionDate}
              onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('verifier:fields.expiryDate')}>
            <TextInput
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
          </Field>
          <Field label={t('verifier:fields.harvestSeason')}>
            <TextInput
              value={form.harvestSeason}
              onChange={(e) => setForm((f) => ({ ...f, harvestSeason: e.target.value }))}
            />
          </Field>
        </div>

        <Field label={t('verifier:fields.origin')}>
          <TextInput value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} />
        </Field>

        <Field label={t('verifier:fields.notes')}>
          <TextArea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </Btn>
          <Btn type="submit" isLoading={create.isPending} disabled={!form.verificationId}>
            {t('common:actions.save')}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};

const Row: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F4F1EA] last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className={`text-[#0C261B] font-semibold text-end truncate ${mono ? 'font-mono' : ''}`}>
      {value || '—'}
    </dd>
  </div>
);
