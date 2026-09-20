import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Globe,
  Monitor,
  QrCode,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  TrendingUp,
  UserPlus,
  Users,
  Cpu,
} from 'lucide-react';
import { downloadCsv, useScanAnalytics, type DeviceKey, type ScanAnalytics } from '../api';
import {
  Button,
  Card,
  DateRangePicker,
  Delta,
  ErrorState,
  Flag,
  LinkAction,
  LoadingState,
  PageTitle,
  Pill,
  ProductThumb,
  ProgressBar,
  SERIES,
  STATUS_COLOR,
  StatTile,
  TableShell,
  Td,
  Th,
  Toast,
  UnderlineTabs,
  defaultRange,
  useToast,
  type DateRange,
} from '../ui';
import { BarChart, DonutChart, LineChart, RankBars } from '../charts';
import { BubbleMap, GOVERNORATE_CENTERS } from '../maps';
import { SCAN_RESULT_TONE } from '../labels';
import { countryName, formatBucket, formatDate, formatNumber, formatPercent, formatTime, governorateName } from '../format';

type TabKey = 'overview' | 'locations' | 'products' | 'batches' | 'devices' | 'flow' | 'journey' | 'antiCounterfeit';
const TABS: TabKey[] = ['overview', 'locations', 'products', 'batches', 'devices', 'flow', 'journey', 'antiCounterfeit'];

export const DEVICE_ICON: Record<DeviceKey, React.ComponentType<{ className?: string }>> = {
  MOBILE: Smartphone,
  DESKTOP: Monitor,
  TABLET: Tablet,
  OTHER: Cpu,
};

export const QrScanAnalyticsPage: React.FC = () => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const navigate = useNavigate();
  const toast = useToast();
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [tab, setTab] = useState<TabKey>('overview');
  const { data, isLoading, isError, refetch } = useScanAnalytics(range);

  const exportCsv = async () => {
    try {
      await downloadCsv('/admin/analytics/scans/export', range, `scans-qr-${range.from}_${range.to}.csv`);
    } catch {
      toast.error(t('states.exportFailed'));
    }
  };

  const vsPrevious = t('shared.vsPreviousPeriod');
  const k = data?.kpis;

  return (
    <div className="space-y-5">
      <PageTitle title={t('scans.title')} subtitle={t('scans.subtitle')} actions={<DateRangePicker value={range} onChange={setRange} />} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
        <StatTile icon={<QrCode className="w-5 h-5" />} label={t('scans.kpi.total')} value={k ? formatNumber(k.totalScans.total, lang) : '—'} footer={<Delta value={k?.totalScans.delta} label={vsPrevious} />} />
        <StatTile icon={<Users className="w-5 h-5" />} tone="blue" label={t('scans.kpi.uniqueScanners')} value={k ? formatNumber(k.uniqueScanners.total, lang) : '—'} footer={<Delta value={k?.uniqueScanners.delta} label={vsPrevious} />} />
        <StatTile icon={<ShieldCheck className="w-5 h-5" />} label={t('scans.kpi.valid')} value={k ? formatNumber(k.validScans.total, lang) : '—'} footer={<span className="text-xs font-bold text-[#17693F]">{formatPercent(k?.validScans.share, lang)}</span>} />
        <StatTile
          icon={<ShieldAlert className="w-5 h-5" />}
          tone="red"
          label={t('scans.kpi.suspicious')}
          value={k ? formatNumber(k.suspiciousScans.total, lang) : '—'}
          footer={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#C7452F]">{formatPercent(k?.suspiciousScans.share, lang)}</span>
              <Delta value={k?.suspiciousScans.delta} invert />
            </span>
          }
          onClick={() => navigate('/admin/analyses/alertes')}
        />
        <StatTile icon={<Globe className="w-5 h-5" />} tone="violet" label={t('scans.kpi.countries')} value={k ? formatNumber(k.countries.total, lang) : '—'} footer={<Delta value={k?.countries.delta} label={vsPrevious} />} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex-1 min-w-0">
          <UnderlineTabs
            tabs={TABS.map((key) => ({ key, label: t(`scans.tabs.${key}`) }))}
            active={tab}
            onChange={(key) => (key === 'antiCounterfeit' ? navigate('/admin/analyses/alertes') : setTab(key))}
          />
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCsv}>
          {t('actions.export')}
        </Button>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <>
          {tab === 'overview' && <OverviewTab data={data} onTab={setTab} />}
          {tab === 'locations' && <LocationsTab data={data} />}
          {tab === 'products' && <ProductsTab data={data} />}
          {tab === 'batches' && <BatchesTab data={data} />}
          {tab === 'devices' && <DevicesTab data={data} />}
          {tab === 'flow' && <FlowTab data={data} />}
          {tab === 'journey' && <JourneyTab data={data} />}
        </>
      )}
      <Toast message={toast.toast?.message ?? null} tone={toast.toast?.tone} onClose={toast.clear} />
    </div>
  );
};

const OverviewTab: React.FC<{ data: ScanAnalytics; onTab: (tab: TabKey) => void }> = ({ data, onTab }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const g = data.period.granularity;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
        <Card title={t('scans.overTime')} actions={<Pill tone="neutral" dot={false}>{t(`scans.granularity.${g}`)}</Pill>}>
          <BarChart
            labels={data.overTime.map((p) => formatBucket(p.date, g, lang))}
            tooltipTitles={data.overTime.map((p) => formatDate(p.date, lang))}
            values={data.overTime.map((p) => p.total)}
            color={STATUS_COLOR.good}
            label={t('scans.scans')}
            emptyLabel={t('states.noData')}
          />
        </Card>
        <Card title={t('scans.resultBreakdown')}>
          <div className="pt-2">
            <DonutChart
              layout="stacked"
              size={150}
              slices={[
                { key: 'VALID', label: t('enums.scanResult.VALID'), value: data.resultBreakdown.valid, color: STATUS_COLOR.good },
                { key: 'SUSPICIOUS', label: t('enums.scanResult.SUSPICIOUS'), value: data.resultBreakdown.suspicious, color: STATUS_COLOR.warning },
                { key: 'INVALID', label: t('enums.scanResult.INVALID'), value: data.resultBreakdown.invalid, color: STATUS_COLOR.critical },
              ]}
              centerValue={formatNumber(data.resultBreakdown.total, lang)}
              centerLabel={t('scans.totalScans')}
              emptyLabel={t('states.noData')}
            />
          </div>
        </Card>
        <Card title={t('scans.byDevice')} actions={<LinkAction onClick={() => onTab('devices')}>{t('actions.viewAll')}</LinkAction>}>
          <DeviceList devices={data.devices} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title={t('scans.byCountry')} actions={<LinkAction onClick={() => onTab('locations')}>{t('actions.viewAll')}</LinkAction>}>
          <BubbleMap view="world" height={170} ariaLabel={t('scans.byCountry')} bubbles={countryBubbles(data, lang)} maxRadius={18} />
          <CountryList countries={data.countries} limit={6} className="mt-3" />
        </Card>
        <Card title={t('scans.byRegion')} actions={<LinkAction onClick={() => onTab('locations')}>{t('actions.viewAll')}</LinkAction>}>
          <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] gap-3 items-start">
            <BubbleMap view="tunisia" height={250} ariaLabel={t('scans.byRegion')} bubbles={regionBubbles(data, lang)} maxRadius={16} />
            <RegionList regions={data.regions} limit={6} />
          </div>
        </Card>
        <Card title={t('scans.topProducts')} actions={<LinkAction onClick={() => onTab('products')}>{t('actions.viewAll')}</LinkAction>}>
          <RankBars
            emptyLabel={t('states.noData')}
            rows={data.topProducts.slice(0, 5).map((product, index) => ({
              key: product.id,
              label: product.nom,
              value: product.count,
              leading: (
                <span className="flex items-center gap-2 shrink-0">
                  <span className="w-4 text-xs font-bold text-[#7C8A82] tabular-nums">{index + 1}</span>
                  <ProductThumb src={product.image} size={32} />
                </span>
              ),
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr_0.8fr]">
        <Card title={t('scans.recentScans')} bodyClassName="pt-2">
          <RecentScansTable data={data} />
        </Card>
        <Card title={t('scans.insights.title')}>
          <div className="grid grid-cols-2 gap-3">
            <Insight icon={<UserPlus className="w-4 h-4" />} value={formatPercent(data.insights.newScannerShare, lang, 0)} label={t('scans.insights.newScanners')} />
            <Insight icon={<Repeat className="w-4 h-4" />} value={formatNumber(data.insights.avgScansPerScanner, lang, 1)} label={t('scans.insights.avgPerScanner')} />
            <Insight
              icon={<TrendingUp className="w-4 h-4" />}
              value={data.insights.scanGrowth === null ? '—' : `${data.insights.scanGrowth > 0 ? '+' : ''}${formatPercent(data.insights.scanGrowth, lang, 0)}`}
              label={t('scans.insights.growth')}
            />
            <Insight icon={<ShieldCheck className="w-4 h-4" />} value={formatPercent(data.insights.trustedShare, lang, 1)} label={t('scans.insights.trusted')} />
          </div>
        </Card>
        <div className="relative rounded-2xl overflow-hidden min-h-[200px] bg-[#0C261B]">
          <img src="/images/beekeeper.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-left" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C261B]/90 via-[#0C261B]/30 to-transparent" />
          <p className="absolute bottom-5 start-5 end-5 font-['Playfair_Display',serif] italic text-white text-lg leading-snug">
            {t('scans.banner.line1')}
            <br />
            {t('scans.banner.line2')}
            <br />
            {t('scans.banner.line3')}
          </p>
        </div>
      </div>
    </div>
  );
};

function countryBubbles(data: Pick<ScanAnalytics, 'countries'>, lang: string) {
  return data.countries
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({
      key: c.code ?? 'unknown',
      lat: c.lat!,
      lng: c.lng!,
      value: c.count,
      color: STATUS_COLOR.good,
      tooltip: `${countryName(c.code, lang, c.name)} · ${formatNumber(c.count, lang)}`,
    }));
}

function regionBubbles(data: Pick<ScanAnalytics, 'regions'>, lang: string) {
  return data.regions
    .filter((r) => GOVERNORATE_CENTERS[r.governorate])
    .map((r) => ({
      key: r.governorate,
      lat: GOVERNORATE_CENTERS[r.governorate][0],
      lng: GOVERNORATE_CENTERS[r.governorate][1],
      value: r.count,
      color: STATUS_COLOR.good,
      tooltip: `${governorateName(r.governorate, lang)} · ${formatNumber(r.count, lang)}`,
    }));
}

export const CountryList: React.FC<{ countries: ScanAnalytics['countries']; limit?: number; className?: string }> = ({ countries, limit, className = '' }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  if (countries.length === 0) return <p className={`text-sm text-gray-400 ${className}`}>{t('states.noData')}</p>;
  const shown = limit ? countries.slice(0, limit) : countries;
  const rest = limit ? countries.slice(limit) : [];
  const restCount = rest.reduce((sum, c) => sum + c.count, 0);
  const restShare = rest.reduce((sum, c) => sum + c.share, 0);
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {shown.map((c) => (
        <li key={c.code ?? 'unknown'} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-[13px]">
          {c.code ? <Flag code={c.code} /> : <Globe className="w-4 h-4 text-[#9AA69F]" />}
          <span className="truncate text-[#1F2A24]">{c.code ? countryName(c.code, lang, c.name) : t('shared.unknown')}</span>
          <span className="font-bold tabular-nums text-[#0C261B]">{formatNumber(c.count, lang)}</span>
          <span className="w-12 text-end text-[#6B7A71] tabular-nums">{formatPercent(c.share, lang)}</span>
        </li>
      ))}
      {restCount > 0 && (
        <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-[13px] text-[#6B7A71]">
          <Globe className="w-4 h-4" />
          <span>{t('shared.others')}</span>
          <span className="font-bold tabular-nums">{formatNumber(restCount, lang)}</span>
          <span className="w-12 text-end tabular-nums">{formatPercent(restShare, lang)}</span>
        </li>
      )}
    </ul>
  );
};

export const RegionList: React.FC<{ regions: ScanAnalytics['regions']; limit?: number }> = ({ regions, limit }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  if (regions.length === 0) return <p className="text-sm text-gray-400">{t('states.noData')}</p>;
  const shown = limit ? regions.slice(0, limit) : regions;
  const rest = limit ? regions.slice(limit) : [];
  const restCount = rest.reduce((sum, r) => sum + r.count, 0);
  return (
    <ul className="space-y-1.5">
      {shown.map((r) => (
        <li key={r.governorate} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-[13px]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#17693F]" />
          <span className="truncate">{governorateName(r.governorate, lang)}</span>
          <span className="font-bold tabular-nums">{formatNumber(r.count, lang)}</span>
          <span className="w-11 text-end text-[#6B7A71] tabular-nums">{formatPercent(r.share, lang)}</span>
        </li>
      ))}
      {restCount > 0 && (
        <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-[13px] text-[#6B7A71]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9AA69F]" />
          <span>{t('shared.others')}</span>
          <span className="font-bold tabular-nums">{formatNumber(restCount, lang)}</span>
          <span className="w-11 text-end tabular-nums">{formatPercent(rest.reduce((s, r) => s + r.share, 0), lang)}</span>
        </li>
      )}
    </ul>
  );
};

const DeviceList: React.FC<{ devices: ScanAnalytics['devices'] }> = ({ devices }) => {
  const { t, i18n } = useTranslation('console');
  return (
    <ul className="space-y-3">
      {devices.map((device) => {
        const Icon = DEVICE_ICON[device.key];
        return (
          <li key={device.key} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#F4F1EA] text-[#17693F] grid place-items-center shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#1F2A24]">{t(`enums.device.${device.key}`)}</span>
                <span className="font-bold tabular-nums text-[#0C261B]">{formatPercent(device.share, i18n.language)}</span>
              </div>
              <ProgressBar value={device.share} className="mt-1" />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const Insight: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({ icon, value, label }) => (
  <div className="rounded-xl border border-[#EFE9DD] p-3">
    <span className="w-8 h-8 rounded-lg bg-[#E3F2E8] text-[#17693F] grid place-items-center">{icon}</span>
    <p className="text-xl font-extrabold text-[#0C261B] mt-2 tabular-nums">{value}</p>
    <p className="text-xs text-[#6B7A71] leading-snug">{label}</p>
  </div>
);

const RecentScansTable: React.FC<{ data: ScanAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <TableShell>
      <thead>
        <tr>
          <Th>{t('scans.columns.date')}</Th>
          <Th>{t('scans.columns.location')}</Th>
          <Th>{t('scans.columns.product')}</Th>
          <Th>{t('scans.columns.result')}</Th>
          <Th>{t('scans.columns.scanner')}</Th>
        </tr>
      </thead>
      <tbody>
        {data.recentScans.length === 0 && (
          <tr>
            <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
              {t('states.noData')}
            </td>
          </tr>
        )}
        {data.recentScans.map((scan) => (
          <tr key={scan.id}>
            <Td className="whitespace-nowrap">
              {formatDate(scan.scannedAt, lang, { day: '2-digit', month: 'short' })} <span className="text-[#7C8A82]">{formatTime(scan.scannedAt, lang)}</span>
            </Td>
            <Td className="whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5">
                <Flag code={scan.countryCode} />
                {scan.governorate ? governorateName(scan.governorate, lang) : (scan.location?.split(',')[0] ?? '—')}
              </span>
            </Td>
            <Td className="max-w-[180px] truncate">
              {scan.product ? (
                <Link to={`/admin/produits/${scan.product.id}`} className="hover:underline">
                  {scan.product.nom}
                </Link>
              ) : (
                <span className="font-mono text-xs text-[#B42323]">{scan.qrCode ?? '—'}</span>
              )}
            </Td>
            <Td>
              <Pill tone={SCAN_RESULT_TONE[scan.result]}>{t(`enums.scanResult.${scan.result}`)}</Pill>
            </Td>
            <Td className="whitespace-nowrap text-xs">{t(`scans.scannerType.${scan.scannerType}`)}</Td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
};

const LocationsTab: React.FC<{ data: ScanAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title={t('scans.byCountry')}>
        <BubbleMap view="world" height={300} ariaLabel={t('scans.byCountry')} bubbles={countryBubbles(data, lang)} maxRadius={26} />
        <TableShell className="mt-3">
          <thead>
            <tr>
              <Th>{t('shared.country')}</Th>
              <Th className="text-end">{t('scans.scans')}</Th>
              <Th className="text-end">{t('scans.columns.share')}</Th>
              <Th className="text-end">{t('scans.kpi.suspicious')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.countries.map((c) => (
              <tr key={c.code ?? 'unknown'}>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <Flag code={c.code} />
                    {c.code ? countryName(c.code, lang, c.name) : t('shared.unknown')}
                  </span>
                </Td>
                <Td className="text-end tabular-nums font-semibold">{formatNumber(c.count, lang)}</Td>
                <Td className="text-end tabular-nums">{formatPercent(c.share, lang)}</Td>
                <Td className={`text-end tabular-nums ${c.notValid > 0 ? 'text-[#C7452F] font-semibold' : ''}`}>{formatNumber(c.notValid, lang)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>
      <Card title={t('scans.byRegion')}>
        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <BubbleMap view="tunisia" height={420} ariaLabel={t('scans.byRegion')} bubbles={regionBubbles(data, lang)} maxRadius={24} />
          <RegionList regions={data.regions} />
        </div>
      </Card>
    </div>
  );
};

const ProductsTab: React.FC<{ data: ScanAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const total = data.resultBreakdown.total;
  return (
    <Card title={t('scans.topProducts')} bodyClassName="pt-2">
      <TableShell>
        <thead>
          <tr>
            <Th className="w-10">#</Th>
            <Th>{t('scans.columns.product')}</Th>
            <Th className="text-end">{t('scans.scans')}</Th>
            <Th className="text-end">{t('scans.kpi.uniqueScanners')}</Th>
            <Th className="text-end">{t('scans.kpi.suspicious')}</Th>
            <Th>{t('scans.columns.share')}</Th>
          </tr>
        </thead>
        <tbody>
          {data.topProducts.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-gray-400">{t('states.noData')}</td>
            </tr>
          )}
          {data.topProducts.map((p, index) => (
            <tr key={p.id} className="hover:bg-[#FBF9F4]">
              <Td className="text-[#7C8A82]">{formatNumber(index + 1, lang)}</Td>
              <Td>
                <Link to={`/admin/produits/${p.id}`} className="flex items-center gap-2.5 hover:underline">
                  <ProductThumb src={p.image} size={32} />
                  <span className="font-semibold">{p.nom}</span>
                </Link>
              </Td>
              <Td className="text-end tabular-nums font-semibold">{formatNumber(p.count, lang)}</Td>
              <Td className="text-end tabular-nums">{formatNumber(p.scanners, lang)}</Td>
              <Td className={`text-end tabular-nums ${p.notValid > 0 ? 'text-[#C7452F] font-semibold' : ''}`}>{formatNumber(p.notValid, lang)}</Td>
              <Td className="w-48">
                <div className="flex items-center gap-2">
                  <ProgressBar value={total ? (p.count / total) * 100 : 0} className="flex-1" />
                  <span className="text-xs tabular-nums w-12 text-end">{formatPercent(total ? (p.count / total) * 100 : 0, lang)}</span>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Card>
  );
};

const BatchesTab: React.FC<{ data: ScanAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <Card title={t('scans.topBatches')} bodyClassName="pt-2">
      <TableShell>
        <thead>
          <tr>
            <Th>{t('scans.columns.batch')}</Th>
            <Th>{t('scans.columns.honeyType')}</Th>
            <Th>{t('shared.status')}</Th>
            <Th className="text-end">{t('scans.columns.scannedCodes')}</Th>
            <Th className="text-end">{t('scans.scans')}</Th>
            <Th className="text-end">{t('scans.kpi.suspicious')}</Th>
          </tr>
        </thead>
        <tbody>
          {data.topBatches.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-gray-400">{t('states.noData')}</td>
            </tr>
          )}
          {data.topBatches.map((b) => (
            <tr key={b.id} className="hover:bg-[#FBF9F4]">
              <Td>
                <Link to={`/verificateur/lots/${b.id}`} className="font-mono text-xs font-bold text-[#17693F] hover:underline">
                  {b.batchCode}
                </Link>
              </Td>
              <Td>{b.honeyType}</Td>
              <Td>
                <Pill tone={b.status === 'SUSPENDED' || b.status === 'RECALLED' ? 'red' : 'green'}>{t(`enums.batchStatus.${b.status}`, { defaultValue: b.status })}</Pill>
              </Td>
              <Td className="text-end tabular-nums">{formatNumber(b.scannedCodes, lang)}</Td>
              <Td className="text-end tabular-nums font-semibold">{formatNumber(b.count, lang)}</Td>
              <Td className={`text-end tabular-nums ${b.notValid > 0 ? 'text-[#C7452F] font-semibold' : ''}`}>{formatNumber(b.notValid, lang)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Card>
  );
};

const DevicesTab: React.FC<{ data: ScanAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const g = data.period.granularity;
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <Card title={t('scans.byDevice')}>
        <DonutChart
          slices={data.devices.map((d, i) => ({ key: d.key, label: t(`enums.device.${d.key}`), value: d.count, color: SERIES[i] }))}
          centerValue={formatNumber(data.resultBreakdown.total, lang)}
          centerLabel={t('scans.totalScans')}
          emptyLabel={t('states.noData')}
        />
      </Card>
      <Card title={t('scans.validVsSuspicious')}>
        <LineChart
          labels={data.overTime.map((p) => formatBucket(p.date, g, lang))}
          series={[
            { key: 'valid', label: t('enums.scanResult.VALID'), color: SERIES[0], values: data.overTime.map((p) => p.valid) },
            { key: 'notValid', label: t('scans.kpi.suspicious'), color: SERIES[3], values: data.overTime.map((p) => p.notValid) },
          ]}
          emptyLabel={t('states.noData')}
        />
      </Card>
    </div>
  );
};

const FlowTab: React.FC<{ data: ScanAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  // 2024-01-01 est un lundi : sert de repère pour nommer les jours ISO 1 à 7.
  const weekday = (iso: number) => new Date(Date.UTC(2024, 0, iso)).toLocaleDateString(lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', timeZone: 'UTC' });
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title={t('scans.flow.byHour')}>
        <BarChart
          labels={data.flow.byHour.map((h) => `${String(h.hour).padStart(2, '0')}h`)}
          values={data.flow.byHour.map((h) => h.count)}
          color={SERIES[0]}
          label={t('scans.scans')}
          emptyLabel={t('states.noData')}
        />
        <p className="text-[11px] text-[#9AA69F] mt-2">{t('scans.flow.utcHint')}</p>
      </Card>
      <Card title={t('scans.flow.byWeekday')}>
        <BarChart
          labels={data.flow.byWeekday.map((d) => weekday(d.weekday))}
          values={data.flow.byWeekday.map((d) => d.count)}
          color={SERIES[0]}
          label={t('scans.scans')}
          emptyLabel={t('states.noData')}
        />
      </Card>
    </div>
  );
};

const JourneyTab: React.FC<{ data: ScanAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const returning = Math.max(0, data.journey.scanners - data.journey.newScanners);
  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <Card title={t('scans.journey.frequency')}>
        <BarChart
          labels={data.journey.buckets.map((b) => t('scans.journey.bucket', { range: b.key }))}
          values={data.journey.buckets.map((b) => b.scanners)}
          color={SERIES[0]}
          label={t('scans.kpi.uniqueScanners')}
          emptyLabel={t('states.noData')}
        />
      </Card>
      <Card title={t('scans.journey.newVsReturning')}>
        <DonutChart
          slices={[
            { key: 'new', label: t('scans.scannerType.NEW'), value: data.journey.newScanners, color: SERIES[0] },
            { key: 'returning', label: t('scans.scannerType.RETURNING'), value: returning, color: SERIES[1] },
          ]}
          centerValue={formatNumber(data.journey.scanners, lang)}
          centerLabel={t('scans.kpi.uniqueScanners')}
          emptyLabel={t('states.noData')}
        />
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Insight icon={<Repeat className="w-4 h-4" />} value={formatPercent(data.journey.repeatShare, lang, 1)} label={t('scans.journey.repeatShare')} />
          <Insight icon={<QrCode className="w-4 h-4" />} value={formatNumber(data.insights.avgScansPerScanner, lang, 1)} label={t('scans.insights.avgPerScanner')} />
        </div>
      </Card>
    </div>
  );
};
