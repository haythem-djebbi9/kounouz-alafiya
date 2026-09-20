import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  SlidersHorizontal,
  Timer,
  Users,
  XCircle,
  Map as MapIcon,
} from 'lucide-react';
import { GOVERNORATES } from '../../../producer/constants';
import {
  downloadCsv,
  useAdminProducers,
  useCreateProducer,
  useProducersOverview,
  useSetProducerStatus,
  type AdminProducer,
  type ProducerStatus,
  type ProducersQuery,
} from '../api';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Delta,
  Dialog,
  EmptyRow,
  ErrorState,
  Field,
  Input,
  PageTitle,
  Pager,
  Pill,
  RowMenu,
  Select,
  STATUS_COLOR,
  StatTile,
  TableShell,
  Td,
  TextArea,
  Th,
  Toast,
  errorMessage,
  useToast,
} from '../ui';
import { DonutChart, MiniBars } from '../charts';
import { BubbleMap, GOVERNORATE_CENTERS } from '../maps';
import { PRODUCER_STATUS_TONE } from '../labels';
import { formatDate, formatNumber, formatPercent, governorateName } from '../format';
import { SearchField } from '../SearchField';

const STATUSES: ProducerStatus[] = ['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'];
const STATUS_COLORS: Record<ProducerStatus, string> = {
  ACTIVE: STATUS_COLOR.good,
  PENDING: STATUS_COLOR.warning,
  SUSPENDED: STATUS_COLOR.critical,
  REJECTED: STATUS_COLOR.neutral,
};
const VERIFICATION_TONE = { VERIFIED: 'green', IN_REVIEW: 'blue', ISSUE: 'red', NONE: 'neutral' } as const;

export const ProducersManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState<ProducerStatus | 'ALL'>('ALL');
  const [honeyType, setHoneyType] = useState('');
  const [verification, setVerification] = useState('');
  const [moreFilters, setMoreFilters] = useState(false);
  const [mapRegion, setMapRegion] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [creating, setCreating] = useState(false);
  const [statusChange, setStatusChange] = useState<{ producer: AdminProducer; status: ProducerStatus } | null>(null);

  useEffect(() => setPage(1), [search, region, status, honeyType, verification, pageSize]);

  const overview = useProducersOverview();
  const query: ProducersQuery = { page, pageSize, search, region, status, honeyType, verification };
  const list = useAdminProducers(query);
  const kpis = overview.data?.kpis;

  const regionRows = useMemo(() => {
    const rows = overview.data?.byRegion ?? [];
    return mapRegion ? rows.filter((r) => r.governorate === mapRegion) : rows;
  }, [overview.data, mapRegion]);

  const exportCsv = async () => {
    try {
      await downloadCsv('/admin/producers/export', { search, region, status, honeyType, verification }, `producteurs-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      toast.error(t('states.exportFailed'));
    }
  };

  const menuFor = (producer: AdminProducer) => [
    { label: t('actions.viewProfile'), icon: <Eye className="w-4 h-4" />, onClick: () => navigate(`/admin/producteurs/${producer.id}`) },
    {
      label: t('actions.approve'),
      icon: <CheckCircle2 className="w-4 h-4" />,
      hidden: producer.status !== 'PENDING' && producer.status !== 'REJECTED',
      onClick: () => setStatusChange({ producer, status: 'ACTIVE' }),
    },
    {
      label: t('actions.reject'),
      icon: <XCircle className="w-4 h-4" />,
      danger: true,
      hidden: producer.status !== 'PENDING',
      onClick: () => setStatusChange({ producer, status: 'REJECTED' }),
    },
    {
      label: t('actions.suspend'),
      icon: <PauseCircle className="w-4 h-4" />,
      danger: true,
      hidden: producer.status !== 'ACTIVE',
      onClick: () => setStatusChange({ producer, status: 'SUSPENDED' }),
    },
    {
      label: t('actions.reactivate'),
      icon: <PlayCircle className="w-4 h-4" />,
      hidden: producer.status !== 'SUSPENDED',
      onClick: () => setStatusChange({ producer, status: 'ACTIVE' }),
    },
  ];

  return (
    <div className="space-y-5">
      <PageTitle
        title={t('producers.title')}
        subtitle={t('producers.subtitle')}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            {t('producers.addProducer')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
        <StatTile icon={<Users className="w-5 h-5" />} label={t('producers.kpi.total')} value={kpis ? formatNumber(kpis.total.total, lang) : '—'} footer={<Delta value={kpis?.total.delta} label={t('shared.vsLastMonth')} />} active={status === 'ALL'} onClick={() => setStatus('ALL')} />
        <StatTile icon={<CheckCircle2 className="w-5 h-5" />} label={t('producers.kpi.active')} value={kpis ? formatNumber(kpis.active.total, lang) : '—'} footer={<span className="text-xs font-bold text-[#17693F]">{formatPercent(kpis?.active.share, lang, 0)}</span>} active={status === 'ACTIVE'} onClick={() => setStatus('ACTIVE')} />
        <StatTile icon={<Clock3 className="w-5 h-5" />} tone="amber" label={t('producers.kpi.pending')} value={kpis ? formatNumber(kpis.pending.total, lang) : '—'} footer={<span className="text-xs font-bold text-[#B7791F]">{formatPercent(kpis?.pending.share, lang, 0)}</span>} active={status === 'PENDING'} onClick={() => setStatus('PENDING')} />
        <StatTile icon={<XCircle className="w-5 h-5" />} tone="red" label={t('producers.kpi.suspended')} value={kpis ? formatNumber(kpis.suspended.total, lang) : '—'} footer={<span className="text-xs font-bold text-[#C7452F]">{formatPercent(kpis?.suspended.share, lang, 0)}</span>} active={status === 'SUSPENDED'} onClick={() => setStatus('SUSPENDED')} />
        <StatTile icon={<MapPin className="w-5 h-5" />} tone="blue" label={t('producers.kpi.regions')} value={kpis ? formatNumber(kpis.regions, lang) : '—'} footer={<span className="text-xs text-[#6B7A71]">{t('producers.kpi.acrossTunisia')}</span>} />
      </div>

      {overview.isError && <ErrorState onRetry={() => overview.refetch()} />}
      {overview.data && (
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr_0.8fr]">
          <Card
            title={t('producers.byRegion')}
            icon={<MapIcon className="w-4 h-4 text-[#17693F]" />}
            actions={
              <Select value={mapRegion} onChange={(e) => setMapRegion(e.target.value)} className="w-40" label={t('producers.byRegion')}>
                <option value="">{t('shared.allRegions')}</option>
                {overview.data.byRegion.map((r) => (
                  <option key={r.governorate} value={r.governorate}>
                    {governorateName(r.governorate, lang)}
                  </option>
                ))}
              </Select>
            }
          >
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-4 items-start">
              <BubbleMap
                view="tunisia"
                height={260}
                ariaLabel={t('producers.byRegion')}
                bubbles={regionRows
                  .filter((r) => GOVERNORATE_CENTERS[r.governorate])
                  .map((r) => ({
                    key: r.governorate,
                    lat: GOVERNORATE_CENTERS[r.governorate][0],
                    lng: GOVERNORATE_CENTERS[r.governorate][1],
                    value: r.count,
                    color: STATUS_COLOR.good,
                    tooltip: `${governorateName(r.governorate, lang)} · ${formatNumber(r.count, lang)}`,
                  }))}
              />
              <ul className="space-y-1.5 max-h-[260px] overflow-y-auto pe-1">
                {regionRows.map((r) => (
                  <li key={r.governorate}>
                    <button
                      onClick={() => setRegion(region === r.governorate ? '' : r.governorate)}
                      className={`w-full flex items-center gap-2 text-[13px] rounded-lg px-2 py-1 ${region === r.governorate ? 'bg-[#E3F2E8]' : 'hover:bg-[#F6F4EE]'}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#17693F]" />
                      <span className="flex-1 text-start truncate">{governorateName(r.governorate, lang)}</span>
                      <span className="font-bold tabular-nums">{formatNumber(r.count, lang)}</span>
                    </button>
                  </li>
                ))}
                {overview.data.unknownRegion > 0 && (
                  <li className="flex items-center gap-2 text-[13px] px-2 py-1 text-[#7C8A82]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9AA69F]" />
                    <span className="flex-1">{t('producers.unknownRegion')}</span>
                    <span className="font-bold tabular-nums">{formatNumber(overview.data.unknownRegion, lang)}</span>
                  </li>
                )}
              </ul>
            </div>
          </Card>

          <Card title={t('producers.statusBreakdown')}>
            <div className="pt-2">
              <DonutChart
                slices={overview.data.byStatus.map((s) => ({
                  key: s.key,
                  label: t(`enums.producerStatus.${s.key}`),
                  value: s.count,
                  color: STATUS_COLORS[s.key],
                }))}
                centerValue={formatNumber(overview.data.kpis.total.total, lang)}
                centerLabel={t('producers.producersLabel')}
                emptyLabel={t('states.noData')}
                layout="stacked"
              />
            </div>
          </Card>

          <div className="grid gap-4">
            <Card title={t('producers.newProducers')}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-extrabold text-[#0C261B] tabular-nums">{formatNumber(overview.data.newProducers.count, lang)}</p>
                  <Delta value={overview.data.newProducers.delta} label={t('shared.vsPrevious30')} />
                </div>
                <div className="w-32">
                  <MiniBars
                    values={overview.data.newProducers.buckets.map((b) => b.count)}
                    labels={overview.data.newProducers.buckets.map((b) => formatDate(b.from, lang, { day: 'numeric', month: 'short' }))}
                  />
                </div>
              </div>
            </Card>
            <Card title={t('producers.avgVerification')}>
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-[#E3F2E8] text-[#17693F] grid place-items-center">
                  <Timer className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-3xl font-extrabold text-[#0C261B] tabular-nums">
                    {overview.data.avgVerificationDays.value === null
                      ? '—'
                      : t('shared.days', { days: formatNumber(overview.data.avgVerificationDays.value, lang, 1) })}
                  </p>
                  <Delta value={overview.data.avgVerificationDays.delta} invert label={t('producers.vsPrevious90')} />
                </div>
              </div>
              <p className="text-[11px] text-[#9AA69F] mt-2">{t('producers.avgVerificationHint', { n: formatNumber(overview.data.avgVerificationDays.sample, lang) })}</p>
            </Card>
          </div>
        </div>
      )}

      <Card bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchField value={search} onChange={setSearch} placeholder={t('producers.searchPlaceholder')} className="flex-1 min-w-[220px]" />
          <Select value={region} onChange={(e) => setRegion(e.target.value)} className="w-40" label={t('shared.region')}>
            <option value="">{t('shared.allRegions')}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.name} value={g.name}>
                {governorateName(g.name, lang)}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProducerStatus | 'ALL')} className="w-40" label={t('shared.status')}>
            <option value="ALL">{t('shared.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`enums.producerStatus.${s}`)}
              </option>
            ))}
          </Select>
          <Select value={honeyType} onChange={(e) => setHoneyType(e.target.value)} className="w-44" label={t('producers.columns.honeyTypes')}>
            <option value="">{t('producers.allHoneyTypes')}</option>
            {(list.data?.honeyTypes ?? []).map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
          <Button variant="secondary" icon={<SlidersHorizontal className="w-4 h-4" />} onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters}>
            {t(moreFilters ? 'actions.lessFilters' : 'actions.moreFilters')}
          </Button>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCsv}>
            {t('actions.export')}
          </Button>
          {moreFilters && (
            <div className="w-full flex flex-wrap items-center gap-2 pt-1">
              <Select value={verification} onChange={(e) => setVerification(e.target.value)} className="w-56" label={t('producers.columns.verification')}>
                <option value="">{t('producers.allVerification')}</option>
                {(['VERIFIED', 'IN_REVIEW', 'ISSUE', 'NONE'] as const).map((v) => (
                  <option key={v} value={v}>
                    {t(`producers.verification.${v}`)}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setRegion('');
                  setStatus('ALL');
                  setHoneyType('');
                  setVerification('');
                }}
              >
                {t('actions.clearFilters')}
              </Button>
            </div>
          )}
        </div>

        {list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>{t('producers.columns.producer')}</Th>
                  <Th>{t('producers.columns.location')}</Th>
                  <Th>{t('producers.columns.honeyTypes')}</Th>
                  <Th>{t('producers.columns.status')}</Th>
                  <Th>{t('producers.columns.verification')}</Th>
                  <Th className="text-end">{t('producers.columns.batches')}</Th>
                  <Th className="text-end">{t('producers.columns.products')}</Th>
                  <Th>{t('producers.columns.joined')}</Th>
                  <Th className="text-end">{t('table.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {list.data?.items.length === 0 && <EmptyRow colSpan={10} message={t('producers.empty')} />}
                {list.data?.items.map((producer, index) => (
                  <tr key={producer.id} className="hover:bg-[#FBF9F4] cursor-pointer" onClick={() => navigate(`/admin/producteurs/${producer.id}`)}>
                    <Td className="text-[#7C8A82] tabular-nums">{formatNumber((page - 1) * pageSize + index + 1, lang)}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-[210px]">
                        <Avatar name={producer.name} src={producer.avatarUrl} size={34} />
                        <div className="min-w-0">
                          <p className="font-bold text-[#0C261B] truncate">{producer.name}</p>
                          <p className="text-xs text-[#6B7A71] truncate">{producer.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#7C8A82]" />
                        {governorateName(producer.governorate, lang)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {producer.honeyTypes.length === 0 ? <span className="text-[#9AA69F]">—</span> : producer.honeyTypes.map((h) => <Chip key={h}>{h}</Chip>)}
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={PRODUCER_STATUS_TONE[producer.status]}>{t(`enums.producerStatus.${producer.status}`)}</Pill>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Pill tone={VERIFICATION_TONE[producer.verification.status]}>{t(`producers.verification.${producer.verification.status}`)}</Pill>
                      {producer.verification.date && <p className="text-[11px] text-[#7C8A82] mt-0.5">{formatDate(producer.verification.date, lang)}</p>}
                    </Td>
                    <Td className="text-end tabular-nums font-semibold">{formatNumber(producer.batches, lang)}</Td>
                    <Td className="text-end tabular-nums font-semibold">{formatNumber(producer.products, lang)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(producer.createdAt, lang)}</Td>
                    <Td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <RowMenu label={t('table.actions')} items={menuFor(producer)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            {list.data && <Pager page={page} pageSize={pageSize} total={list.data.total} onPage={setPage} onPageSize={setPageSize} />}
          </>
        )}
      </Card>

      {creating && (
        <CreateProducerDialog
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            toast.success(t('producers.toasts.created'));
          }}
        />
      )}
      {statusChange && (
        <ProducerStatusDialog
          producer={statusChange.producer}
          status={statusChange.status}
          onClose={() => setStatusChange(null)}
          onDone={() => {
            setStatusChange(null);
            toast.success(t('producers.toasts.statusChanged'));
          }}
        />
      )}
      <Toast message={toast.toast?.message ?? null} tone={toast.toast?.tone} onClose={toast.clear} />
    </div>
  );
};

const CreateProducerDialog: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const { t, i18n } = useTranslation('console');
  const create = useCreateProducer();
  const [form, setForm] = useState({ name: '', email: '', password: '', farmName: '', governorate: '', phone: '', status: 'PENDING' as 'PENDING' | 'ACTIVE' });
  const [error, setError] = useState('');
  const valid =
    form.name.trim().length >= 2 && /.+@.+\..+/.test(form.email) && form.password.length >= 8 && form.farmName.trim().length >= 2 && !!form.governorate;

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('producers.form.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            loading={create.isPending}
            disabled={!valid}
            onClick={async () => {
              setError('');
              try {
                await create.mutateAsync({ ...form, email: form.email.trim() });
                onDone();
              } catch (err) {
                setError(errorMessage(err, t('states.saveFailed')));
              }
            }}
          >
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t('producers.form.name')} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label={t('producers.form.farmName')} required>
          <Input value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} />
        </Field>
        <Field label={t('users.fields.email')} required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t('users.fields.phone')}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={t('shared.region')} required>
          <Select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })}>
            <option value="">{t('producers.form.chooseRegion')}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.name} value={g.name}>
                {governorateName(g.name, i18n.language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('shared.status')}>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'PENDING' | 'ACTIVE' })}>
            <option value="PENDING">{t('enums.producerStatus.PENDING')}</option>
            <option value="ACTIVE">{t('enums.producerStatus.ACTIVE')}</option>
          </Select>
        </Field>
        <Field label={t('users.fields.password')} required hint={t('producers.form.passwordHint')} className="sm:col-span-2">
          <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <p className="sm:col-span-2 text-xs font-semibold text-[#B42323] bg-[#FDF2F2] border border-[#F3CFCF] rounded-lg px-3 py-2">{error}</p>}
      </div>
    </Dialog>
  );
};

const ProducerStatusDialog: React.FC<{ producer: AdminProducer; status: ProducerStatus; onClose: () => void; onDone: () => void }> = ({
  producer,
  status,
  onClose,
  onDone,
}) => {
  const { t } = useTranslation('console');
  const mutation = useSetProducerStatus();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const danger = status === 'SUSPENDED' || status === 'REJECTED';

  return (
    <Dialog
      open
      size="sm"
      onClose={onClose}
      title={t(`producers.statusDialog.${status}`, { name: producer.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={mutation.isPending}
            onClick={async () => {
              try {
                await mutation.mutateAsync({ id: producer.id, status, note: note.trim() || undefined });
                onDone();
              } catch (err) {
                setError(errorMessage(err, t('states.saveFailed')));
              }
            }}
          >
            {t('actions.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#3F4A44] mb-3">
        {t('producers.statusDialog.description', { from: t(`enums.producerStatus.${producer.status}`), to: t(`enums.producerStatus.${status}`) })}
      </p>
      <Field label={t('shared.noteOptional')}>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
      {error && <p className="text-xs font-semibold text-[#B42323] mt-2">{error}</p>}
    </Dialog>
  );
};
