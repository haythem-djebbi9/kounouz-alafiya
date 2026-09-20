import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Ban,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Globe,
  Hash,
  Layers,
  MapPin,
  Monitor,
  Package,
  QrCode,
  Search as SearchIcon,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  XOctagon,
  Copy as DuplicateIcon,
  RotateCcw,
} from 'lucide-react';
import {
  downloadCsv,
  useAlert,
  useAlertStats,
  useAlerts,
  useUpdateAlert,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
  type AlertsQuery,
  type CounterfeitAlert,
} from '../api';
import {
  Button,
  Card,
  Chip,
  DateRangePicker,
  Delta,
  EmptyRow,
  ErrorState,
  Field,
  Flag,
  InfoRow,
  PageTitle,
  Pager,
  Pill,
  RowMenu,
  Select,
  SERIES,
  STATUS_COLOR,
  SidePanel,
  StatTile,
  TableShell,
  Td,
  TextArea,
  Th,
  Toast,
  UnderlineTabs,
  defaultRange,
  errorMessage,
  useToast,
  type DateRange,
} from '../ui';
import { DonutChart, LineChart } from '../charts';
import { BubbleMap } from '../maps';
import { ALERT_STATUS_TONE, ALERT_TYPE_COLOR, SCAN_RESULT_TONE, SEVERITY_TONE, describeAction } from '../labels';
import { countryName, formatBucket, formatDate, formatDateTime, formatNumber, formatRelative, formatTime } from '../format';
import { SearchField } from '../SearchField';

type TabKey = 'ALL' | AlertType | 'RESOLVED';
const TABS: TabKey[] = ['ALL', 'SUSPECTED_DUPLICATE', 'UNUSUAL_LOCATION', 'INVALID_QR', 'TAMPERED_LABEL', 'BULK_SCAN', 'RESOLVED'];
const TYPES: AlertType[] = ['SUSPECTED_DUPLICATE', 'UNUSUAL_LOCATION', 'INVALID_QR', 'TAMPERED_LABEL', 'BULK_SCAN'];
const STATUSES: AlertStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];

export const ALERT_TYPE_ICON: Record<AlertType, React.ComponentType<{ className?: string }>> = {
  SUSPECTED_DUPLICATE: DuplicateIcon,
  UNUSUAL_LOCATION: MapPin,
  INVALID_QR: QrCode,
  TAMPERED_LABEL: Tag,
  BULK_SCAN: Layers,
};

const RISK_COLOR = { HIGH: STATUS_COLOR.critical, MEDIUM: '#E0822F', LOW: STATUS_COLOR.warning } as const;

export const AntiCounterfeitAlertsPage: React.FC = () => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<AlertType | 'ALL'>('ALL');
  const [status, setStatus] = useState<AlertStatus | 'ALL'>('ALL');
  const [countryCode, setCountryCode] = useState('');
  const [productId, setProductId] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
  const [moreFilters, setMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const selectedId = params.get('alert');

  // L'onglet pilote le type ou le statut ; les listes déroulantes restent synchronisées.
  const changeTab = (key: TabKey) => {
    setTab(key);
    if (key === 'ALL') {
      setType('ALL');
      setStatus('ALL');
    } else if (key === 'RESOLVED') {
      setType('ALL');
      setStatus('RESOLVED');
    } else {
      setType(key);
      setStatus('ALL');
    }
  };

  useEffect(() => setPage(1), [range, search, type, status, countryCode, productId, severity, pageSize]);

  const stats = useAlertStats(range);
  const query: AlertsQuery = { ...range, page, pageSize, search, type, status, countryCode, productId, severity };
  const alerts = useAlerts(query);
  const s = stats.data;

  const openAlert = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('alert', id);
    else next.delete('alert');
    setParams(next, { replace: true });
  };

  const exportCsv = async () => {
    try {
      await downloadCsv('/admin/alerts/export', { ...query, page: undefined, pageSize: undefined }, `alertes-contrefacon-${range.to}.csv`);
    } catch {
      toast.error(t('states.exportFailed'));
    }
  };

  const vsPrevious = t('shared.vsPreviousPeriod');

  return (
    <div className="space-y-5">
      <PageTitle title={t('alerts.title')} subtitle={t('alerts.subtitle')} actions={<DateRangePicker value={range} onChange={setRange} />} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
        <StatTile icon={<AlertTriangle className="w-5 h-5" />} tone="red" label={t('alerts.kpi.total')} value={s ? formatNumber(s.kpis.total.total, lang) : '—'} footer={<Delta value={s?.kpis.total.delta} invert label={vsPrevious} />} active={tab === 'ALL'} onClick={() => changeTab('ALL')} />
        <StatTile icon={<DuplicateIcon className="w-5 h-5" />} tone="red" label={t('alerts.kpi.duplicates')} value={s ? formatNumber(s.kpis.duplicates.total, lang) : '—'} footer={<Delta value={s?.kpis.duplicates.delta} invert label={vsPrevious} />} active={tab === 'SUSPECTED_DUPLICATE'} onClick={() => changeTab('SUSPECTED_DUPLICATE')} />
        <StatTile icon={<MapPin className="w-5 h-5" />} tone="amber" label={t('alerts.kpi.unusualLocations')} value={s ? formatNumber(s.kpis.unusualLocations.total, lang) : '—'} footer={<Delta value={s?.kpis.unusualLocations.delta} invert label={vsPrevious} />} active={tab === 'UNUSUAL_LOCATION'} onClick={() => changeTab('UNUSUAL_LOCATION')} />
        <StatTile icon={<QrCode className="w-5 h-5" />} tone="violet" label={t('alerts.kpi.invalidOrTampered')} value={s ? formatNumber(s.kpis.invalidOrTampered.total, lang) : '—'} footer={<Delta value={s?.kpis.invalidOrTampered.delta} invert label={vsPrevious} />} active={tab === 'INVALID_QR'} onClick={() => changeTab('INVALID_QR')} />
        <StatTile icon={<ShieldCheck className="w-5 h-5" />} label={t('alerts.kpi.resolved')} value={s ? formatNumber(s.kpis.resolved.total, lang) : '—'} footer={<Delta value={s?.kpis.resolved.delta} label={vsPrevious} />} active={tab === 'RESOLVED'} onClick={() => changeTab('RESOLVED')} />
      </div>

      {s && s.kpis.open > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#F3CFCF] bg-[#FDF2F2] px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#B42323] shrink-0" />
          <p className="text-sm text-[#B42323] font-semibold flex-1">{t('alerts.openBanner', { n: formatNumber(s.kpis.open, lang) })}</p>
          <button onClick={() => { setTab('ALL'); setType('ALL'); setStatus('OPEN'); }} className="text-xs font-bold text-[#B42323] hover:underline whitespace-nowrap">
            {t('alerts.showOpen')}
          </button>
        </div>
      )}

      <Card bodyClassName="p-0">
        <div className="px-4 pt-2">
          <UnderlineTabs tabs={TABS.map((key) => ({ key, label: t(`alerts.tabs.${key}`) }))} active={tab} onChange={changeTab} />
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchField value={search} onChange={setSearch} placeholder={t('alerts.searchPlaceholder')} className="flex-1 min-w-[220px]" />
          <Select value={type} onChange={(e) => setType(e.target.value as AlertType | 'ALL')} className="w-48" label={t('alerts.columns.type')}>
            <option value="ALL">{t('alerts.allTypes')}</option>
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(`enums.alertType.${ty}`)}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as AlertStatus | 'ALL')} className="w-40" label={t('shared.status')}>
            <option value="ALL">{t('shared.allStatuses')}</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {t(`enums.alertStatus.${st}`)}
              </option>
            ))}
          </Select>
          <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-40" label={t('shared.country')}>
            <option value="">{t('shared.allCountries')}</option>
            {(s?.byCountry ?? []).filter((c) => c.code).map((c) => (
              <option key={c.code!} value={c.code!}>
                {countryName(c.code, lang, c.name)}
              </option>
            ))}
          </Select>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-44" label={t('alerts.columns.product')}>
            <option value="">{t('alerts.allProducts')}</option>
            {(s?.filters.products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
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
            <div className="w-full flex flex-wrap gap-2 pt-1">
              <Select value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity | 'ALL')} className="w-44" label={t('alerts.severity')}>
                <option value="ALL">{t('alerts.allSeverities')}</option>
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                  <option key={sev} value={sev}>
                    {t(`enums.severity.${sev}`)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {s && (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1.1fr] px-4 pb-4">
            <div className="rounded-xl border border-[#EFE9DD] p-3">
              <p className="text-sm font-bold text-[#0C261B] mb-2">{t('alerts.overTime')}</p>
              <LineChart
                height={200}
                labels={s.overTime.map((p) => formatBucket(p.date, s.period.granularity, lang))}
                series={[
                  { key: 'total', label: t('alerts.series.total'), color: SERIES[3], values: s.overTime.map((p) => p.total) },
                  { key: 'duplicates', label: t('alerts.series.duplicates'), color: SERIES[1], values: s.overTime.map((p) => p.duplicates) },
                  { key: 'resolved', label: t('alerts.series.resolved'), color: SERIES[0], values: s.overTime.map((p) => p.resolved) },
                ]}
                emptyLabel={t('states.noData')}
              />
            </div>
            <div className="rounded-xl border border-[#EFE9DD] p-3">
              <p className="text-sm font-bold text-[#0C261B] mb-2">{t('alerts.byType')}</p>
              <DonutChart
                size={140}
                slices={s.byType.map((item) => ({ key: item.type, label: t(`enums.alertType.${item.type}`), value: item.count, color: ALERT_TYPE_COLOR[item.type] }))}
                centerValue={formatNumber(s.kpis.total.total, lang)}
                centerLabel={t('alerts.totalAlerts')}
                emptyLabel={t('states.noData')}
              />
            </div>
            <div className="rounded-xl border border-[#EFE9DD] p-3">
              <p className="text-sm font-bold text-[#0C261B] mb-2">{t('alerts.byCountry')}</p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                <BubbleMap
                  view="world"
                  height={170}
                  maxRadius={16}
                  ariaLabel={t('alerts.byCountry')}
                  bubbles={s.byCountry
                    .filter((c) => c.lat !== null && c.lng !== null)
                    .map((c) => ({
                      key: c.code ?? 'unknown',
                      lat: c.lat!,
                      lng: c.lng!,
                      value: c.count,
                      color: RISK_COLOR[c.risk],
                      tooltip: `${countryName(c.code, lang, c.name)} · ${formatNumber(c.count, lang)} · ${t(`alerts.risk.${c.risk}`)}`,
                    }))}
                />
                <ul className="space-y-2 text-xs">
                  {(['HIGH', 'MEDIUM', 'LOW'] as const).map((risk) => (
                    <li key={risk} className="flex items-center gap-2 whitespace-nowrap">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: RISK_COLOR[risk] }} />
                      {t(`alerts.risk.${risk}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="mt-2 space-y-1">
                {s.byCountry.slice(0, 4).map((c) => (
                  <li key={c.code ?? 'unknown'} className="flex items-center gap-2 text-[13px]">
                    <Flag code={c.code} />
                    <span className="flex-1 truncate">{countryName(c.code, lang, c.name)}</span>
                    <Pill tone={c.risk === 'HIGH' ? 'red' : c.risk === 'MEDIUM' ? 'amber' : 'gold'} dot={false}>
                      {t(`alerts.risk.${c.risk}`)}
                    </Pill>
                    <span className="font-bold tabular-nums w-8 text-end">{formatNumber(c.count, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="px-4 pb-2">
          <h2 className="text-[15px] font-bold text-[#0C261B]">{t('alerts.recent')}</h2>
        </div>
        {alerts.isError ? (
          <ErrorState onRetry={() => alerts.refetch()} />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>{t('alerts.columns.date')}</Th>
                  <Th>{t('alerts.columns.type')}</Th>
                  <Th>{t('alerts.columns.qrCode')}</Th>
                  <Th>{t('alerts.columns.product')}</Th>
                  <Th>{t('alerts.columns.location')}</Th>
                  <Th>{t('alerts.columns.details')}</Th>
                  <Th>{t('alerts.columns.status')}</Th>
                  <Th className="text-end">{t('table.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {alerts.data?.items.length === 0 && <EmptyRow colSpan={9} message={t('alerts.empty')} />}
                {alerts.data?.items.map((alert, index) => (
                  <AlertRow key={alert.id} alert={alert} index={(page - 1) * pageSize + index + 1} selected={selectedId === alert.id} onOpen={() => openAlert(alert.id)} />
                ))}
              </tbody>
            </TableShell>
            {alerts.data && <Pager page={page} pageSize={pageSize} total={alerts.data.total} onPage={setPage} onPageSize={setPageSize} />}
          </>
        )}
      </Card>

      <AlertDetailPanel alertId={selectedId} onClose={() => openAlert(null)} onToast={(message, tone) => (tone === 'error' ? toast.error(message) : toast.success(message))} />
      <Toast message={toast.toast?.message ?? null} tone={toast.toast?.tone} onClose={toast.clear} />
    </div>
  );
};

const AlertRow: React.FC<{ alert: CounterfeitAlert; index: number; selected: boolean; onOpen: () => void }> = ({ alert, index, selected, onOpen }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const Icon = ALERT_TYPE_ICON[alert.type];
  const update = useUpdateAlert();
  return (
    <tr className={`cursor-pointer ${selected ? 'bg-[#F3F8F4]' : 'hover:bg-[#FBF9F4]'}`} onClick={onOpen}>
      <Td className="text-[#7C8A82] tabular-nums">{formatNumber(index, lang)}</Td>
      <Td className="whitespace-nowrap">
        <p>{formatDate(alert.createdAt, lang)}</p>
        <p className="text-xs text-[#7C8A82]">{formatTime(alert.createdAt, lang)}</p>
      </Td>
      <Td className="whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-full grid place-items-center text-white shrink-0" style={{ backgroundColor: ALERT_TYPE_COLOR[alert.type] }}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold">{t(`enums.alertType.${alert.type}`)}</span>
        </span>
      </Td>
      <Td>
        <Chip className="font-mono">{alert.qrCode?.qrCode ?? alert.scannedIdentifier ?? '—'}</Chip>
      </Td>
      <Td className="max-w-[160px] truncate">{alert.product?.nom ?? '—'}</Td>
      <Td className="whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <Flag code={alert.countryCode} />
          {alert.location?.split(',')[0] ?? countryName(alert.countryCode, lang)}
        </span>
      </Td>
      <Td className="max-w-[240px]">
        <p className="truncate text-[#3F4A44]">{alert.details ?? '—'}</p>
      </Td>
      <Td>
        <Pill tone={ALERT_STATUS_TONE[alert.status]}>{t(`enums.alertStatus.${alert.status}`)}</Pill>
      </Td>
      <Td className="text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <span className="inline-flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={onOpen}>
            {t('actions.view')}
          </Button>
          <RowMenu
            label={t('table.actions')}
            items={[
              { label: t('actions.viewDetails'), icon: <Eye className="w-4 h-4" />, onClick: onOpen },
              { label: t('actions.investigate'), icon: <SearchIcon className="w-4 h-4" />, hidden: alert.status !== 'OPEN', onClick: () => update.mutate({ id: alert.id, status: 'INVESTIGATING' }) },
              { label: t('actions.markResolved'), icon: <CheckCircle2 className="w-4 h-4" />, hidden: alert.status === 'RESOLVED' || alert.status === 'DISMISSED', onClick: () => update.mutate({ id: alert.id, status: 'RESOLVED' }) },
              { label: t('actions.dismiss'), icon: <Ban className="w-4 h-4" />, hidden: alert.status === 'RESOLVED' || alert.status === 'DISMISSED', onClick: () => update.mutate({ id: alert.id, status: 'DISMISSED' }) },
              { label: t('actions.reopen'), icon: <RotateCcw className="w-4 h-4" />, hidden: alert.status === 'OPEN' || alert.status === 'INVESTIGATING', onClick: () => update.mutate({ id: alert.id, status: 'OPEN' }) },
            ]}
          />
        </span>
      </Td>
    </tr>
  );
};

const AlertDetailPanel: React.FC<{ alertId: string | null; onClose: () => void; onToast: (message: string, tone?: 'error') => void }> = ({ alertId, onClose, onToast }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const { data: alert, isLoading } = useAlert(alertId);
  const update = useUpdateAlert();
  const [status, setStatus] = useState<AlertStatus>('OPEN');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (alert) {
      setStatus(alert.status);
      setNote(alert.resolutionNote ?? '');
    }
  }, [alert]);

  const save = async (next: AlertStatus) => {
    if (!alert) return;
    try {
      await update.mutateAsync({ id: alert.id, status: next, note });
      onToast(t(`alerts.toasts.${next}`));
    } catch (err) {
      onToast(errorMessage(err, t('states.saveFailed')), 'error');
    }
  };

  const Icon = alert ? ALERT_TYPE_ICON[alert.type] : AlertTriangle;
  const closed = alert?.status === 'RESOLVED' || alert?.status === 'DISMISSED';

  return (
    <SidePanel
      open={!!alertId}
      onClose={onClose}
      title={t('alerts.detail.title')}
      footer={
        alert && (
          <div className="flex flex-wrap gap-2 justify-end">
            {!closed && alert.status !== 'INVESTIGATING' && (
              <Button icon={<SearchIcon className="w-4 h-4" />} loading={update.isPending && update.variables?.status === 'INVESTIGATING'} onClick={() => save('INVESTIGATING')}>
                {t('actions.investigate')}
              </Button>
            )}
            {!closed ? (
              <Button variant="secondary" icon={<CheckCircle2 className="w-4 h-4" />} loading={update.isPending && update.variables?.status === 'RESOLVED'} onClick={() => save('RESOLVED')}>
                {t('actions.markResolved')}
              </Button>
            ) : (
              <Button variant="secondary" icon={<RotateCcw className="w-4 h-4" />} onClick={() => save('OPEN')}>
                {t('actions.reopen')}
              </Button>
            )}
          </div>
        )
      }
    >
      {isLoading && <p className="p-5 text-sm text-gray-400">{t('states.loading')}</p>}
      {alert && (
        <div className="p-5 space-y-5">
          <div className="flex items-start gap-3 rounded-xl bg-[#FDF2F2] border border-[#F3CFCF] p-3">
            <span className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0" style={{ backgroundColor: ALERT_TYPE_COLOR[alert.type] }}>
              <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-[#0C261B]">{t(`enums.alertType.${alert.type}`)}</p>
              <p className="text-xs font-mono text-[#6B7A71]">#{alert.alertCode}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Pill tone={ALERT_STATUS_TONE[alert.status]}>{t(`enums.alertStatus.${alert.status}`)}</Pill>
                <Pill tone={SEVERITY_TONE[alert.severity]} dot={false}>
                  {t('alerts.severityLabel', { level: t(`enums.severity.${alert.severity}`) })}
                </Pill>
              </div>
            </div>
          </div>

          <div>
            <InfoRow icon={<CalendarClock className="w-3.5 h-3.5" />} label={t('alerts.columns.date')}>
              {formatDateTime(alert.createdAt, lang)}
            </InfoRow>
            <InfoRow icon={<QrCode className="w-3.5 h-3.5" />} label={t('alerts.columns.qrCode')}>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono text-xs">{alert.qrCode?.qrCode ?? alert.scannedIdentifier ?? '—'}</span>
                {(alert.qrCode?.qrCode ?? alert.scannedIdentifier) && (
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(alert.qrCode?.qrCode ?? alert.scannedIdentifier ?? '');
                      onToast(t('actions.copied'));
                    }}
                    className="p-1 rounded text-[#7C8A82] hover:text-[#0C261B]"
                    aria-label={t('actions.copy')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </InfoRow>
            <InfoRow icon={<Package className="w-3.5 h-3.5" />} label={t('alerts.columns.product')}>
              {alert.product ? (
                <Link to={`/admin/produits/${alert.product.id}`} className="text-[#17693F] hover:underline">
                  {alert.product.nom}
                </Link>
              ) : (
                <span className="text-[#B42323]">{t('alerts.detail.unknownCode')}</span>
              )}
            </InfoRow>
            <InfoRow icon={<Boxes className="w-3.5 h-3.5" />} label={t('alerts.detail.batch')}>
              {alert.batch ? (
                <Link to={`/verificateur/lots/${alert.batch.id}`} className="font-mono text-xs text-[#17693F] hover:underline">
                  {alert.batch.batchCode}
                </Link>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label={t('alerts.columns.location')}>
              <span className="inline-flex items-center gap-1.5">
                <Flag code={alert.countryCode} />
                {alert.location ?? countryName(alert.countryCode, lang)}
              </span>
            </InfoRow>
            <InfoRow icon={<Monitor className="w-3.5 h-3.5" />} label={t('alerts.detail.device')}>
              {alert.deviceInfo ?? (alert.deviceType ? t(`enums.device.${alert.deviceType}`) : '—')}
            </InfoRow>
            <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label={t('alerts.detail.ip')}>
              <span className="font-mono text-xs">{alert.ipAddress ?? '—'}</span>
            </InfoRow>
            <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label={t('alerts.detail.scanCount')}>
              {t('alerts.detail.scanCountValue', { n: formatNumber(alert.scanCount, lang), when: formatRelative(alert.lastSeenAt, lang) })}
            </InfoRow>
          </div>

          <div className="rounded-xl bg-[#FDF2F2] border border-[#F3CFCF] px-3 py-2.5">
            <p className="text-xs font-bold text-[#B42323] mb-0.5 flex items-center gap-1.5">
              <XOctagon className="w-3.5 h-3.5" />
              {t('alerts.columns.details')}
            </p>
            <p className="text-sm text-[#8F1D1D]">{alert.details ?? '—'}</p>
          </div>

          <div className="grid gap-3">
            <Field label={t('shared.status')}>
              <div className="flex gap-2">
                <Select value={status} onChange={(e) => setStatus(e.target.value as AlertStatus)} className="flex-1">
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {t(`enums.alertStatus.${st}`)}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" disabled={status === alert.status && note === (alert.resolutionNote ?? '')} loading={update.isPending} onClick={() => save(status)}>
                  {t('actions.save')}
                </Button>
              </div>
            </Field>
            <Field label={t('alerts.detail.note')} hint={alert.resolvedBy && alert.resolvedAt ? t('alerts.detail.resolvedBy', { name: alert.resolvedBy.name, date: formatDateTime(alert.resolvedAt, lang) }) : undefined}>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={t('alerts.detail.notePlaceholder')} />
            </Field>
          </div>

          <section>
            <h3 className="text-sm font-bold text-[#0C261B] mb-2">{t('alerts.detail.relatedScans')}</h3>
            {alert.relatedScans.length === 0 ? (
              <p className="text-sm text-gray-400">{t('states.noData')}</p>
            ) : (
              <ul className="divide-y divide-[#F3EEE4] border border-[#EFE9DD] rounded-xl">
                {alert.relatedScans.map((scan) => (
                  <li key={scan.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <Flag code={scan.countryCode} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[#0C261B] font-semibold">{scan.location ?? '—'}</span>
                      <span className="block truncate text-[#7C8A82]">
                        {formatDateTime(scan.scannedAt, lang)} · {scan.deviceInfo ?? '—'}
                      </span>
                    </span>
                    <Pill tone={SCAN_RESULT_TONE[scan.result]}>{t(`enums.scanResult.${scan.result}`)}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {alert.relatedAlerts.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-[#0C261B] mb-2">{t('alerts.detail.relatedAlerts')}</h3>
              <ul className="space-y-1">
                {alert.relatedAlerts.map((related) => (
                  <li key={related.id}>
                    <Link to={`/admin/analyses/alertes?alert=${related.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[#FAF6EE]">
                      <span className="font-mono text-[#17693F]">{related.alertCode}</span>
                      <span className="flex-1 truncate">{t(`enums.alertType.${related.type}`)}</span>
                      <Pill tone={ALERT_STATUS_TONE[related.status]}>{t(`enums.alertStatus.${related.status}`)}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {alert.trail.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-[#0C261B] mb-2">{t('alerts.detail.history')}</h3>
              <ul className="space-y-2">
                {alert.trail.map((log) => (
                  <li key={log.id} className="flex items-start gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#17693F] mt-1.5 shrink-0" />
                    <span className="flex-1">
                      <span className="font-semibold text-[#0C261B]">{describeAction(t, log)}</span>
                      <span className="block text-[#7C8A82]">
                        {log.user?.name ?? t('shared.system')} · {formatDateTime(log.createdAt, lang)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </SidePanel>
  );
};
