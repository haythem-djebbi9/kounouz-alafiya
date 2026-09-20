import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  FlaskConical,
  Inbox,
  PackageCheck,
  Plus,
  ShieldCheck,
  TestTube,
} from 'lucide-react';
import {
  useFlagSampleIssue,
  useRegisterSample,
  useSampleTransition,
  useVerifierRequests,
  useVerifierSample,
  useVerifierSamples,
  type SampleFilters,
} from '../hooks';
import { SAMPLE_STATUS_TONE } from '../status-map';
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
import { ReferenceSamplePanel } from '../ReferenceSamplePanel';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { SampleEventType, SampleTab } from '../types';

type DetailTab = 'details' | 'tracking' | 'photos' | 'custody' | 'reference';

export const SampleManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();

  const [filters, setFilters] = useState<SampleFilters>({
    tab: 'ALL',
    search: '',
    sort: 'NEWEST',
    page: 1,
    pageSize: 10,
  });
  const [selectedId, setSelectedId] = useState<string | null>(params.get('selected'));
  const [registerOpen, setRegisterOpen] = useState(false);

  const list = useVerifierSamples(filters);
  const detail = useVerifierSample(selectedId ?? undefined);

  useEffect(() => {
    if (!selectedId && list.data && list.data.items.length > 0) {
      setSelectedId(list.data.items[0].id);
    }
  }, [list.data, selectedId]);

  const select = (id: string) => {
    setSelectedId(id);
    setParams({ selected: id }, { replace: true });
  };

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });

  const stats = list.data?.stats;
  const tabs: { key: SampleTab; label: string; count?: number }[] = [
    { key: 'ALL', label: t('verifier:tabs.all'), count: stats?.counts.ALL },
    { key: 'COLLECTED', label: t('verifier:samples.tab.collected'), count: stats?.counts.COLLECTED },
    { key: 'RECEIVED', label: t('verifier:samples.tab.received'), count: stats?.counts.RECEIVED },
    { key: 'IN_LABORATORY', label: t('verifier:samples.tab.inLaboratory'), count: stats?.counts.IN_LABORATORY },
    { key: 'COMPLETED', label: t('verifier:samples.tab.completed'), count: stats?.counts.COMPLETED },
    { key: 'ISSUES', label: t('verifier:samples.tab.issues'), count: stats?.counts.ISSUES },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:samples.title') }]} />
      <PageHeader
        title={t('verifier:samples.title')}
        subtitle={t('verifier:samples.subtitle')}
        actions={
          <Btn onClick={() => setRegisterOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('verifier:actions.registerSample')}
          </Btn>
        }
      />

      {/* Compteurs */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6 mb-4">
          <KpiCard
            label={t('verifier:samples.kpi.total')}
            value={stats.counts.ALL}
            icon={<TestTube className="w-4 h-4" />}
          />
          <KpiCard
            label={t('verifier:samples.tab.collected')}
            value={stats.counts.COLLECTED}
            icon={<Boxes className="w-4 h-4" />}
            tone="amber"
            hint={`${stats.percentages.COLLECTED}%`}
          />
          <KpiCard
            label={t('verifier:samples.tab.received')}
            value={stats.counts.RECEIVED}
            icon={<Inbox className="w-4 h-4" />}
            tone="blue"
            hint={`${stats.percentages.RECEIVED}%`}
          />
          <KpiCard
            label={t('verifier:samples.tab.inLaboratory')}
            value={stats.counts.IN_LABORATORY}
            icon={<FlaskConical className="w-4 h-4" />}
            tone="violet"
            hint={`${stats.percentages.IN_LABORATORY}%`}
          />
          <KpiCard
            label={t('verifier:samples.tab.completed')}
            value={stats.counts.COMPLETED}
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="green"
            hint={`${stats.percentages.COMPLETED}%`}
          />
          <KpiCard
            label={t('verifier:samples.tab.issues')}
            value={stats.counts.ISSUES}
            icon={<AlertTriangle className="w-4 h-4" />}
            tone="red"
            hint={`${stats.percentages.ISSUES}%`}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <Tabs
          tabs={tabs}
          active={filters.tab ?? 'ALL'}
          onChange={(tab) => setFilters((f) => ({ ...f, tab, page: 1 }))}
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
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SampleFilters['sort'], page: 1 }))}
            className="w-auto text-xs"
          >
            <option value="NEWEST">{t('verifier:sort.newest')}</option>
            <option value="OLDEST">{t('verifier:sort.oldest')}</option>
          </SelectInput>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel bodyClassName="p-0">
            <div className="p-3 border-b border-[#EAE1D2]">
              <SearchBox
                value={filters.search ?? ''}
                onChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
                placeholder={t('verifier:samples.searchPlaceholder')}
              />
            </div>

            {list.isLoading && <LoadingBlock label={t('common:status.loading')} />}

            {list.data && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>{t('verifier:table.sampleId')}</Th>
                      <Th>{t('verifier:table.requestId')}</Th>
                      <Th>{t('verifier:table.producer')}</Th>
                      <Th>{t('verifier:table.batchNumber')}</Th>
                      <Th>{t('verifier:table.collectionDate')}</Th>
                      <Th>{t('verifier:table.status')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <EmptyBlock title={t('verifier:samples.empty')} />
                        </td>
                      </tr>
                    )}
                    {list.data.items.map((sample) => (
                      <tr
                        key={sample.id}
                        onClick={() => select(sample.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedId === sample.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                        }`}
                      >
                        <Td className="font-mono text-xs font-bold text-[#0C261B]">
                          {sample.sampleCode ?? '—'}
                        </Td>
                        <Td className="font-mono text-xs text-gray-600">
                          {sample.request.requestCode ?? '—'}
                        </Td>
                        <Td className="text-xs text-[#0C261B]">{sample.request.producer.name}</Td>
                        <Td className="font-mono text-xs text-gray-600">
                          {sample.request.batchNumber ?? '—'}
                        </Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(sample.collectionDate)}
                        </Td>
                        <Td>
                          <StatusPill
                            tone={SAMPLE_STATUS_TONE[sample.status]}
                            label={t(`verifier:status.sample.${sample.status}`)}
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
                  summary={(from, to, total) => t('verifier:pagination.summary', { from, to, total })}
                />
              </>
            )}
          </Panel>
        </div>

        <div className="xl:col-span-5">
          {!selectedId && (
            <Panel>
              <EmptyBlock title={t('verifier:samples.selectPrompt')} icon={<TestTube className="w-8 h-8" />} />
            </Panel>
          )}
          {selectedId && detail.isLoading && (
            <Panel>
              <LoadingBlock label={t('common:status.loading')} />
            </Panel>
          )}
          {detail.data && <SampleDetail key={detail.data.id} sample={detail.data} />}
        </div>
      </div>

      {registerOpen && (
        <RegisterSampleModal
          onClose={() => setRegisterOpen(false)}
          onCreated={(id) => {
            setRegisterOpen(false);
            select(id);
          }}
        />
      )}
    </div>
  );
};

// --- Enregistrement d'un échantillon --------------------------------------

/**
 * Scénario « apport du producteur » (§2, option B) : l'équipe de vérification
 * enregistre elle-même l'échantillon. Seules les demandes acceptées et encore
 * sans échantillon sont proposées.
 */
const RegisterSampleModal: React.FC<{ onClose: () => void; onCreated: (id: string) => void }> = ({
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const register = useRegisterSample();
  const [error, setError] = useState('');
  const { data: eligible } = useVerifierRequests({
    tab: 'IN_LABORATORY',
    status: 'ACCEPTED',
    pageSize: 100,
  });

  const [form, setForm] = useState({
    requestId: '',
    collectionDate: new Date().toISOString().slice(0, 10),
    collectionMethod: 'PRODUCER_DELIVERY' as 'KOUNOUZ_VISIT' | 'PRODUCER_DELIVERY',
    quantity: '0.5',
    location: '',
    notes: '',
  });

  const awaitingSample = (eligible?.items ?? []).filter((request) => request.samples.length === 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const sample = await register.mutateAsync({
        requestId: form.requestId,
        collectionDate: new Date(form.collectionDate).toISOString(),
        collectionMethod: form.collectionMethod,
        quantity: Number(form.quantity),
        location: form.location || undefined,
        notes: form.notes || undefined,
      });
      onCreated(sample.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('verifier:actions.registerSample')} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        {error && <InlineError message={error} />}

        {awaitingSample.length === 0 && (
          <p className="text-sm text-gray-500">{t('verifier:samples.noEligibleRequest')}</p>
        )}

        <Field label={t('verifier:fields.requestId')} required>
          <SelectInput
            value={form.requestId}
            onChange={(e) => setForm((f) => ({ ...f, requestId: e.target.value }))}
            required
          >
            <option value="">{t('verifier:samples.selectRequest')}</option>
            {awaitingSample.map((request) => (
              <option key={request.id} value={request.id}>
                {request.requestCode} — {request.producer.name} ({request.honeyType})
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('verifier:fields.collectionDate')} required>
            <TextInput
              type="date"
              value={form.collectionDate}
              onChange={(e) => setForm((f) => ({ ...f, collectionDate: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('verifier:fields.collectionMethod')} required>
            <SelectInput
              value={form.collectionMethod}
              onChange={(e) =>
                setForm((f) => ({ ...f, collectionMethod: e.target.value as typeof f.collectionMethod }))
              }
            >
              <option value="PRODUCER_DELIVERY">{t('verifier:collectionMethod.PRODUCER_DELIVERY')}</option>
              <option value="KOUNOUZ_VISIT">{t('verifier:collectionMethod.KOUNOUZ_VISIT')}</option>
            </SelectInput>
          </Field>
          <Field label={t('verifier:fields.quantity')} required hint="kg">
            <TextInput
              type="number"
              step="0.001"
              min="0.001"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('verifier:fields.location')} hint={t('verifier:samples.locationHint')}>
            <TextInput
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </Field>
        </div>

        <Field label={t('verifier:fields.notes')}>
          <TextArea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            maxLength={2000}
          />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </Btn>
          <Btn type="submit" isLoading={register.isPending} disabled={!form.requestId}>
            {t('common:actions.save')}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};

// --- Détail échantillon ----------------------------------------------------

const SampleDetail: React.FC<{ sample: NonNullable<ReturnType<typeof useVerifierSample>['data']> }> = ({
  sample,
}) => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [tab, setTab] = useState<DetailTab>('details');
  const [error, setError] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueReason, setIssueReason] = useState('');

  const transition = useSampleTransition();
  const flagIssue = useFlagSampleIssue();

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const run = async (action: 'receive' | 'seal' | 'move-to-laboratory') => {
    setError('');
    try {
      await transition.mutateAsync({ id: sample.id, action });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const submitIssue = async () => {
    setError('');
    try {
      await flagIssue.mutateAsync({ id: sample.id, reason: issueReason });
      setIssueOpen(false);
      setIssueReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const canReceive = ['COLLECTED', 'SEALED', 'IN_TRANSIT'].includes(sample.status);
  // Le scellé se pose tant que l'échantillon n'est pas parti au laboratoire.
  const canSeal = !sample.seal && ['COLLECTED', 'RECEIVED'].includes(sample.status);
  const canMoveToLab = sample.status === 'RECEIVED' && !!sample.seal;

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'details', label: t('verifier:detailTabs.details') },
    { key: 'tracking', label: t('verifier:detailTabs.tracking') },
    { key: 'photos', label: t('verifier:detailTabs.photos') },
    { key: 'custody', label: t('verifier:detailTabs.custody') },
    { key: 'reference', label: t('verifier:detailTabs.reference') },
  ];

  return (
    <Panel bodyClassName="p-0">
      <div className="p-4 border-b border-[#EAE1D2]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-extrabold text-[#0C261B] font-mono">{sample.sampleCode ?? '—'}</h2>
          <StatusPill
            tone={SAMPLE_STATUS_TONE[sample.status]}
            label={t(`verifier:status.sample.${sample.status}`)}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 font-mono">{sample.request.requestCode}</p>
        <p className="text-sm text-gray-600">{sample.request.producer.name}</p>
      </div>

      <div className="px-4 pt-2">
        <Tabs tabs={tabs} active={tab} onChange={setTab} variant="underline" />
      </div>

      <div className="p-4 space-y-4">
        {error && <InlineError message={error} />}

        {sample.status === 'ISSUE' && sample.issueReason && (
          <div className="rounded-lg border border-[#F3CFCF] bg-[#FDF2F2] p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#B42323]">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('verifier:samples.issueFlagged')}
            </p>
            <p className="text-sm text-[#B42323] mt-0.5">{sample.issueReason}</p>
          </div>
        )}

        {tab === 'details' && (
          <dl className="space-y-1.5">
            <Row label={t('verifier:fields.sampleId')} value={sample.sampleCode} mono />
            <Row label={t('verifier:fields.requestId')} value={sample.request.requestCode} mono />
            <Row label={t('verifier:fields.honeyType')} value={sample.request.honeyType} />
            <Row label={t('verifier:fields.quantity')} value={`${sample.quantity} kg`} />
            <Row label={t('verifier:fields.collectionDate')} value={formatDate(sample.collectionDate)} />
            <Row
              label={t('verifier:fields.collectionMethod')}
              value={
                sample.collectionMethod
                  ? t(`verifier:collectionMethod.${sample.collectionMethod}`)
                  : undefined
              }
            />
            <Row label={t('verifier:fields.collectedBy')} value={sample.collectedBy?.name} />
            <Row label={t('verifier:fields.location')} value={sample.location} />
            {sample.seal && (
              <Row
                label={t('verifier:fields.sealCode')}
                value={sample.seal.sealCode}
                mono
                badge={
                  <StatusPill
                    tone={sample.seal.status === 'INTACT' ? 'green' : 'red'}
                    label={t(`verifier:status.seal.${sample.seal.status}`)}
                  />
                }
              />
            )}
          </dl>
        )}

        {tab === 'tracking' && (
          <ol className="space-y-0">
            {sample.timeline.steps.map((step, index) => {
              const done = !!step.event;
              return (
                <li key={step.type} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${
                        done ? 'bg-[#17693F] text-white' : 'bg-[#EEF0EC] text-[#9AA69F]'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </span>
                    {index < sample.timeline.steps.length - 1 && (
                      <span className={`w-0.5 flex-1 min-h-[22px] ${done ? 'bg-[#17693F]' : 'bg-[#EEF0EC]'}`} />
                    )}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className={`text-sm ${done ? 'text-[#0C261B] font-semibold' : 'text-gray-400'}`}>
                      {t(`verifier:custody.${step.type}`)}
                    </p>
                    {step.event && (
                      <p className="text-[11px] text-gray-500">
                        {formatDateTime(step.event.occurredAt)}
                        {step.event.user ? ` · ${step.event.user.name}` : ''}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {tab === 'photos' && (
          <>
            {sample.photos.length === 0 && <EmptyBlock title={t('verifier:samples.noPhotos')} />}
            <div className="grid grid-cols-3 gap-2">
              {sample.photos.map((photo) => (
                <img
                  key={photo}
                  src={resolveFileUrl(photo)}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover border border-[#EAE1D2]"
                />
              ))}
            </div>
          </>
        )}

        {tab === 'custody' && (
          <ul className="space-y-2">
            {sample.timeline.events.map((event) => (
              <li key={event.id} className="rounded-lg border border-[#EAE1D2] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0C261B]">
                    {t(`verifier:custody.${event.type as SampleEventType}`)}
                  </span>
                  <span className="ms-auto text-[11px] text-gray-400">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {event.user?.name ?? t('verifier:custody.system')}
                  {event.note ? ` · ${event.note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'reference' && <ReferenceSamplePanel sample={sample} />}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-[#EAE1D2]">
          {canReceive && (
            <Btn size="sm" isLoading={transition.isPending} onClick={() => run('receive')}>
              <PackageCheck className="w-3.5 h-3.5" />
              {t('verifier:actions.markReceived')}
            </Btn>
          )}
          {canSeal && (
            <Btn
              size="sm"
              variant="secondary"
              isLoading={transition.isPending}
              onClick={() => run('seal')}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('verifier:actions.applySeal')}
            </Btn>
          )}
          {canMoveToLab && (
            <Btn size="sm" isLoading={transition.isPending} onClick={() => run('move-to-laboratory')}>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              {t('verifier:actions.moveToLaboratory')}
            </Btn>
          )}
          {sample.status !== 'ISSUE' && (
            <Btn variant="danger" size="sm" className="ms-auto" onClick={() => setIssueOpen(true)}>
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('verifier:actions.flagIssue')}
            </Btn>
          )}
        </div>

        {issueOpen && (
          <div className="rounded-lg border border-[#EAE1D2] bg-[#FAF6EE] p-3 space-y-2">
            <Field
              label={t('verifier:samples.issueReason')}
              required
              hint={t('verifier:samples.issueHint')}
            >
              <TextArea value={issueReason} onChange={(e) => setIssueReason(e.target.value)} />
            </Field>
            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" size="sm" onClick={() => setIssueOpen(false)}>
                {t('common:actions.cancel')}
              </Btn>
              <Btn
                variant="danger"
                size="sm"
                isLoading={flagIssue.isPending}
                disabled={issueReason.trim().length < 5}
                onClick={submitIssue}
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

const Row: React.FC<{
  label: string;
  value?: string | null;
  mono?: boolean;
  badge?: React.ReactNode;
}> = ({ label, value, mono, badge }) => (
  <div className="flex items-center justify-between gap-2 text-xs py-1 border-b border-[#F4F1EA] last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className="flex items-center gap-2">
      <span className={`text-[#0C261B] font-semibold ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
      {badge}
    </dd>
  </div>
);
