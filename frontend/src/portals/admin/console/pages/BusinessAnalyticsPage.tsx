import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Percent,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { downloadCsv, useBusinessAnalytics, type BusinessAnalytics } from '../api';
import {
  Button,
  Card,
  DateRangePicker,
  Delta,
  ErrorState,
  LinkAction,
  LoadingState,
  PageTitle,
  Pill,
  SERIES,
  STATUS_COLOR,
  StatTile,
  TableShell,
  Td,
  Th,
  Toast,
  UnderlineTabs,
  OTHER_COLOR,
  defaultRange,
  useToast,
  type DateRange,
} from '../ui';
import { BarChart, DonutChart, Funnel, LineChart } from '../charts';
import { BubbleMap, GOVERNORATE_CENTERS } from '../maps';
import { CountryList, RegionList } from './QrScanAnalyticsPage';
import { countryName, formatBucket, formatDate, formatMoney, formatNumber, formatPercent, formatTime, governorateName } from '../format';

type TabKey = 'overview' | 'verifications' | 'sales' | 'products' | 'producers' | 'geographic' | 'customers' | 'trends' | 'exports';
const TABS: TabKey[] = ['overview', 'verifications', 'sales', 'products', 'producers', 'geographic', 'customers', 'trends', 'exports'];

export const BusinessAnalyticsPage: React.FC = () => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const toast = useToast();
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [tab, setTab] = useState<TabKey>('overview');
  const { data, isLoading, isError, refetch } = useBusinessAnalytics(range);

  const exportReport = async () => {
    try {
      await downloadCsv('/admin/analytics/business/export', range, `verification-ventes-${range.from}_${range.to}.csv`);
    } catch {
      toast.error(t('states.exportFailed'));
    }
  };

  const k = data?.kpis;
  const vsPrevious = t('shared.vsPreviousPeriod');

  return (
    <div className="space-y-5">
      <PageTitle
        title={t('business.title')}
        subtitle={t('business.subtitle')}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Button icon={<Download className="w-4 h-4" />} onClick={exportReport}>
              {t('business.exportReport')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
        <StatTile icon={<ShieldCheck className="w-5 h-5" />} label={t('business.kpi.verifiedBatches')} value={k ? formatNumber(k.verifiedBatches.total, lang) : '—'} footer={<Delta value={k?.verifiedBatches.delta} label={vsPrevious} />} />
        <StatTile icon={<QrCode className="w-5 h-5" />} tone="violet" label={t('business.kpi.totalScans')} value={k ? formatNumber(k.totalScans.total, lang) : '—'} footer={<Delta value={k?.totalScans.delta} label={vsPrevious} />} />
        <StatTile icon={<Users className="w-5 h-5" />} tone="blue" label={t('business.kpi.uniqueConsumers')} value={k ? formatNumber(k.uniqueConsumers.total, lang) : '—'} footer={<Delta value={k?.uniqueConsumers.delta} label={vsPrevious} />} />
        <StatTile icon={<Banknote className="w-5 h-5" />} tone="gold" label={t('business.kpi.totalSales')} value={k ? formatNumber(k.totalSales.total, lang) : '—'} footer={<Delta value={k?.totalSales.delta} label={vsPrevious} />} />
        <StatTile icon={<ShieldAlert className="w-5 h-5" />} tone="red" label={t('business.kpi.fraudAttempts')} value={k ? formatNumber(k.fraudAttempts.total, lang) : '—'} footer={<Delta value={k?.fraudAttempts.delta} invert label={vsPrevious} />} />
        <StatTile
          icon={<Percent className="w-5 h-5" />}
          label={t('business.kpi.verificationRate')}
          value={k ? (k.verificationRate.decided ? formatPercent(k.verificationRate.total, lang, 0) : '—') : '—'}
          footer={<Delta value={k?.verificationRate.deltaPoints} suffix={` ${t('shared.points')}`} label={t('business.kpi.decisions', { n: formatNumber(k?.verificationRate.decided ?? 0, lang) })} />}
        />
      </div>

      <UnderlineTabs tabs={TABS.map((key) => ({ key, label: t(`business.tabs.${key}`) }))} active={tab} onChange={setTab} />

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && (
        <>
          {tab === 'overview' && <OverviewTab data={data} onTab={setTab} />}
          {tab === 'verifications' && <VerificationsTab data={data} />}
          {tab === 'sales' && <SalesTab data={data} />}
          {tab === 'products' && <HoneyTypesCard data={data} />}
          {tab === 'producers' && <ProducersTab data={data} />}
          {tab === 'geographic' && <GeographicTab data={data} />}
          {tab === 'customers' && <CustomersTab data={data} />}
          {tab === 'trends' && <TrendsTab data={data} />}
          {tab === 'exports' && <ExportsTab range={range} onError={() => toast.error(t('states.exportFailed'))} />}
        </>
      )}
      <Toast message={toast.toast?.message ?? null} tone={toast.toast?.tone} onClose={toast.clear} />
    </div>
  );
};

/**
 * Scans et ventes n'ont ni la même unité ni le même ordre de grandeur : deux
 * courbes alignées sur le même axe temporel plutôt qu'un graphique à double
 * échelle, qui suggérerait une corrélation arbitraire.
 */
const ScansAndSales: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const labels = data.series.map((p) => formatBucket(p.date, data.period.granularity, lang));
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold text-[#6B7A71] mb-1">{t('business.series.scans')}</p>
        <LineChart height={140} area labels={labels} series={[{ key: 'scans', label: t('business.series.scans'), color: SERIES[0], values: data.series.map((p) => p.scans) }]} emptyLabel={t('states.noData')} />
      </div>
      <div>
        <p className="text-xs font-bold text-[#6B7A71] mb-1">{t('business.series.sales')}</p>
        <LineChart
          height={140}
          area
          labels={labels}
          formatValue={(v) => formatMoney(v, lang)}
          series={[{ key: 'sales', label: t('business.series.sales'), color: SERIES[1], values: data.series.map((p) => p.sales) }]}
          emptyLabel={t('states.noData')}
        />
      </div>
    </div>
  );
};

const CategoriesDonut: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  return (
    <DonutChart
      layout="stacked"
      size={150}
      slices={data.categories.items.map((item, i) => ({
        key: item.key,
        label: item.key === 'OTHER' ? t('shared.others') : item.key,
        value: item.count,
        color: item.key === 'OTHER' ? OTHER_COLOR : SERIES[i],
      }))}
      centerValue={formatNumber(data.categories.total, i18n.language)}
      centerLabel={t('business.verifiedBatchesLabel')}
      emptyLabel={t('business.noVerifications')}
    />
  );
};

const HoneyTypesCard: React.FC<{ data: BusinessAnalytics; limit?: number; action?: React.ReactNode }> = ({ data, limit, action }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const rows = limit ? data.topHoneyTypes.slice(0, limit) : data.topHoneyTypes;
  return (
    <Card title={t('business.topProducts')} actions={action} bodyClassName="pt-2">
      <TableShell>
        <thead>
          <tr>
            <Th className="w-8">#</Th>
            <Th>{t('business.columns.honeyType')}</Th>
            <Th className="text-end">{t('business.columns.verifiedBatches')}</Th>
            <Th className="text-end">{t('business.columns.scans')}</Th>
            <Th className="text-end">{t('business.columns.revenue')}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-gray-400">{t('states.noData')}</td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={row.honeyType}>
              <Td className="text-[#7C8A82]">{formatNumber(index + 1, lang)}</Td>
              <Td className="font-semibold">🍯 {row.honeyType}</Td>
              <Td className="text-end tabular-nums">{formatNumber(row.verifiedBatches, lang)}</Td>
              <Td className="text-end tabular-nums">{formatNumber(row.scans, lang)}</Td>
              <Td className="text-end tabular-nums font-semibold">{formatMoney(row.revenue, lang)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Card>
  );
};

const RegionMapCard: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <Card title={t('business.byRegion')}>
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] gap-3 items-start">
        <BubbleMap
          view="tunisia"
          height={240}
          maxRadius={16}
          ariaLabel={t('business.byRegion')}
          bubbles={data.regions
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
        {data.regions.length === 0 ? <p className="text-sm text-gray-400">{t('business.noVerifications')}</p> : <RegionList regions={data.regions} limit={6} />}
      </div>
    </Card>
  );
};

const OriginsCard: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <Card title={t('business.origins')}>
      <BubbleMap
        view="world"
        height={160}
        maxRadius={16}
        ariaLabel={t('business.origins')}
        bubbles={data.origins
          .filter((c) => c.lat !== null && c.lng !== null)
          .map((c) => ({ key: c.code ?? '?', lat: c.lat!, lng: c.lng!, value: c.count, color: STATUS_COLOR.good, tooltip: `${countryName(c.code, lang, c.name)} · ${formatNumber(c.count, lang)}` }))}
      />
      <CountryList countries={data.origins} limit={6} className="mt-3" />
    </Card>
  );
};

const FunnelCard: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t } = useTranslation('console');
  return (
    <Card title={t('business.funnel.title')} actions={<span className="text-xs text-[#6B7A71]">{t('business.funnel.subtitle')}</span>}>
      <Funnel stages={data.funnel.map((stage) => ({ ...stage, label: t(`business.funnel.${stage.key}`) }))} />
    </Card>
  );
};

const RecentVerifications: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <Card title={t('business.recentVerifications')} actions={<Link to="/admin/verification" className="text-xs font-bold text-[#17693F] hover:underline">{t('actions.viewAll')}</Link>} bodyClassName="pt-2">
      <TableShell>
        <thead>
          <tr>
            <Th>{t('business.columns.date')}</Th>
            <Th>{t('business.columns.honeyType')}</Th>
            <Th>{t('business.columns.batch')}</Th>
            <Th>{t('business.columns.producer')}</Th>
            <Th>{t('business.columns.location')}</Th>
            <Th>{t('business.columns.result')}</Th>
          </tr>
        </thead>
        <tbody>
          {data.recentVerifications.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-gray-400">{t('business.noVerifications')}</td>
            </tr>
          )}
          {data.recentVerifications.map((v) => (
            <tr key={v.id}>
              <Td className="whitespace-nowrap">
                {formatDate(v.verifiedAt, lang, { day: '2-digit', month: 'short' })} <span className="text-[#7C8A82]">{formatTime(v.verifiedAt, lang)}</span>
              </Td>
              <Td>{v.honeyType}</Td>
              <Td>
                {v.batchId ? (
                  <Link to={`/verificateur/lots/${v.batchId}`} className="font-mono text-xs text-[#17693F] hover:underline">
                    {v.batchCode}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">{v.batchCode ?? '—'}</span>
                )}
              </Td>
              <Td>
                <Link to={`/admin/producteurs/${v.producer.id}`} className="hover:underline">
                  {v.producer.name}
                </Link>
              </Td>
              <Td>{governorateName(v.governorate, lang)}</Td>
              <Td>
                {v.status === 'VERIFIED' ? (
                  <Pill tone="green" icon={<CheckCircle2 className="w-3 h-3" />}>{t('business.result.VERIFIED')}</Pill>
                ) : (
                  <Pill tone="red" icon={<XCircle className="w-3 h-3" />}>{t('business.result.NOT_VERIFIED')}</Pill>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Card>
  );
};

const KeyInsights: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const pct = (value: number | null) => (value === null ? '—' : `${value > 0 ? '+' : ''}${formatPercent(value, lang, 0)}`);
  const items = [
    { icon: <TrendingUp className="w-4 h-4" />, value: pct(data.insights.scanGrowth), label: t('business.insights.scanGrowth') },
    { icon: <Users className="w-4 h-4" />, value: formatNumber(data.kpis.uniqueConsumers.total, lang), label: t('business.insights.consumers'), extra: <Delta value={data.insights.consumersGrowth} /> },
    { icon: <ShoppingCart className="w-4 h-4" />, value: formatPercent(data.insights.scanToPurchaseRate, lang, 1), label: t('business.insights.scanToPurchase'), extra: <Delta value={data.insights.scanToPurchaseDeltaPoints} suffix={` ${t('shared.points')}`} /> },
    { icon: <ShieldAlert className="w-4 h-4" />, value: pct(data.insights.fraudChange), label: t('business.insights.fraudChange') },
  ];
  return (
    <Card title={t('business.insights.title')}>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#E3F2E8] text-[#17693F] grid place-items-center shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-[#0C261B] tabular-nums leading-tight">{item.value}</p>
              <p className="text-xs text-[#6B7A71] leading-snug">{item.label}</p>
              {item.extra}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const OverviewTab: React.FC<{ data: BusinessAnalytics; onTab: (tab: TabKey) => void }> = ({ data, onTab }) => {
  const { t } = useTranslation('console');
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1.2fr]">
        <Card title={t('business.scansVsSales')}>
          <ScansAndSales data={data} />
        </Card>
        <Card title={t('business.categories')}>
          <CategoriesDonut data={data} />
        </Card>
        <HoneyTypesCard data={data} limit={5} action={<LinkAction onClick={() => onTab('products')}>{t('actions.viewAll')}</LinkAction>} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <RegionMapCard data={data} />
        <OriginsCard data={data} />
        <FunnelCard data={data} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_0.8fr]">
        <RecentVerifications data={data} />
        <KeyInsights data={data} />
        <div className="relative rounded-2xl overflow-hidden min-h-[200px] bg-[#0C261B]">
          <img src="/images/beekeeper.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-left" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C261B]/90 via-[#0C261B]/30 to-transparent" />
          <p className="absolute bottom-5 start-5 end-5 font-['Playfair_Display',serif] italic text-white text-lg leading-snug">
            {t('business.banner.line1')}
            <br />
            {t('business.banner.line2')}
            <br />
            {t('business.banner.line3')}
          </p>
        </div>
      </div>
    </div>
  );
};

const VerificationsTab: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card title={t('business.verificationsOverTime')}>
          <BarChart
            labels={data.series.map((p) => formatBucket(p.date, data.period.granularity, lang))}
            values={data.series.map((p) => p.verifications)}
            color={SERIES[0]}
            label={t('business.kpi.verifiedBatches')}
            emptyLabel={t('business.noVerifications')}
          />
        </Card>
        <Card title={t('business.categories')}>
          <CategoriesDonut data={data} />
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <RecentVerifications data={data} />
        <RegionMapCard data={data} />
      </div>
    </div>
  );
};

const SalesTab: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={<Banknote className="w-5 h-5" />} tone="gold" label={t('business.kpi.totalSales')} value={formatMoney(data.kpis.totalSales.total, lang)} footer={<Delta value={data.kpis.totalSales.delta} />} />
        <StatTile icon={<ShoppingCart className="w-5 h-5" />} label={t('business.sales.orders')} value={formatNumber(data.kpis.orders.total, lang)} footer={<Delta value={data.kpis.orders.delta} />} />
        <StatTile icon={<BarChart3 className="w-5 h-5" />} tone="blue" label={t('business.sales.averageOrder')} value={formatMoney(data.insights.averageOrderValue, lang)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card title={t('business.series.sales')}>
          <LineChart
            area
            labels={data.series.map((p) => formatBucket(p.date, data.period.granularity, lang))}
            formatValue={(v) => formatMoney(v, lang)}
            series={[{ key: 'sales', label: t('business.series.sales'), color: SERIES[1], values: data.series.map((p) => p.sales) }]}
            emptyLabel={t('states.noData')}
          />
        </Card>
        <Card title={t('business.sales.byChannel')}>
          <DonutChart
            layout="stacked"
            size={150}
            valueFormat={(v) => formatMoney(v, lang)}
            slices={data.salesByChannel.map((c, i) => ({ key: c.channel, label: t(`enums.channel.${c.channel}`, { defaultValue: c.channel }), value: c.revenue, color: SERIES[i] }))}
            centerValue={formatNumber(data.kpis.totalSales.total, lang)}
            centerLabel="TND"
            emptyLabel={t('states.noData')}
          />
        </Card>
      </div>
      <HoneyTypesCard data={data} />
    </div>
  );
};

const ProducersTab: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <Card title={t('business.topProducers')} bodyClassName="pt-2">
      <TableShell>
        <thead>
          <tr>
            <Th className="w-8">#</Th>
            <Th>{t('business.columns.producer')}</Th>
            <Th className="text-end">{t('business.columns.verifiedBatches')}</Th>
            <Th className="text-end">{t('business.columns.units')}</Th>
            <Th className="text-end">{t('business.columns.revenue')}</Th>
          </tr>
        </thead>
        <tbody>
          {data.topProducers.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-gray-400">{t('states.noData')}</td>
            </tr>
          )}
          {data.topProducers.map((p, index) => (
            <tr key={p.id} className="hover:bg-[#FBF9F4]">
              <Td className="text-[#7C8A82]">{formatNumber(index + 1, lang)}</Td>
              <Td>
                <Link to={`/admin/producteurs/${p.id}`} className="hover:underline">
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block text-xs text-[#6B7A71]">{p.farmName}</span>
                </Link>
              </Td>
              <Td className="text-end tabular-nums">{formatNumber(p.verifiedBatches, lang)}</Td>
              <Td className="text-end tabular-nums">{formatNumber(p.units, lang)}</Td>
              <Td className="text-end tabular-nums font-semibold">{formatMoney(p.revenue, lang)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Card>
  );
};

const GeographicTab: React.FC<{ data: BusinessAnalytics }> = ({ data }) => (
  <div className="grid gap-4 xl:grid-cols-2">
    <RegionMapCard data={data} />
    <OriginsCard data={data} />
  </div>
);

const CustomersTab: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={<Users className="w-5 h-5" />} tone="blue" label={t('business.kpi.uniqueConsumers')} value={formatNumber(data.kpis.uniqueConsumers.total, lang)} footer={<Delta value={data.kpis.uniqueConsumers.delta} />} />
        <StatTile icon={<ShoppingCart className="w-5 h-5" />} label={t('business.insights.scanToPurchase')} value={formatPercent(data.insights.scanToPurchaseRate, lang, 1)} footer={<Delta value={data.insights.scanToPurchaseDeltaPoints} suffix={` ${t('shared.points')}`} />} />
        <StatTile icon={<QrCode className="w-5 h-5" />} tone="violet" label={t('business.customers.scansPerConsumer')} value={data.kpis.uniqueConsumers.total ? formatNumber(data.kpis.totalScans.total / data.kpis.uniqueConsumers.total, lang, 2) : '—'} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <FunnelCard data={data} />
        <OriginsCard data={data} />
      </div>
    </div>
  );
};

const TrendsTab: React.FC<{ data: BusinessAnalytics }> = ({ data }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const labels = data.trends.map((p) => formatBucket(p.month, 'month', lang));
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card title={t('business.trends.verifications')}>
        <BarChart labels={labels} values={data.trends.map((p) => p.verifications)} color={SERIES[0]} label={t('business.trends.verifications')} emptyLabel={t('states.noData')} />
      </Card>
      <Card title={t('business.trends.scans')}>
        <LineChart labels={labels} series={[{ key: 'scans', label: t('business.trends.scans'), color: SERIES[0], values: data.trends.map((p) => p.scans) }]} emptyLabel={t('states.noData')} />
      </Card>
      <Card title={t('business.trends.sales')}>
        <LineChart
          labels={labels}
          formatValue={(v) => formatMoney(v, lang)}
          series={[{ key: 'sales', label: t('business.trends.sales'), color: SERIES[1], values: data.trends.map((p) => p.sales) }]}
          emptyLabel={t('states.noData')}
        />
      </Card>
      <p className="xl:col-span-3 text-xs text-[#9AA69F]">{t('business.trends.hint')}</p>
    </div>
  );
};

const ExportsTab: React.FC<{ range: DateRange; onError: () => void }> = ({ range, onError }) => {
  const { t } = useTranslation('console');
  const [busy, setBusy] = useState<string | null>(null);
  const exports = [
    { key: 'business', path: '/admin/analytics/business/export', params: range, file: `verification-ventes-${range.to}.csv` },
    { key: 'scans', path: '/admin/analytics/scans/export', params: range, file: `scans-qr-${range.to}.csv` },
    { key: 'alerts', path: '/admin/alerts/export', params: range, file: `alertes-contrefacon-${range.to}.csv` },
    { key: 'audit', path: '/admin/audit-logs/export', params: range, file: `journal-audit-${range.to}.csv` },
    { key: 'producers', path: '/admin/producers/export', params: {}, file: `producteurs-${range.to}.csv` },
    { key: 'laboratories', path: '/admin/laboratories/export', params: {}, file: `laboratoires-${range.to}.csv` },
    { key: 'users', path: '/admin/users/export', params: {}, file: `utilisateurs-${range.to}.csv` },
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <Card title={t('business.exports.title')}>
        <ul className="divide-y divide-[#F3EEE4]">
          {exports.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-3">
              <span className="w-9 h-9 rounded-lg bg-[#E3F2E8] text-[#17693F] grid place-items-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0C261B]">{t(`business.exports.items.${item.key}.title`)}</p>
                <p className="text-xs text-[#6B7A71]">{t(`business.exports.items.${item.key}.description`)}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<Download className="w-3.5 h-3.5" />}
                loading={busy === item.key}
                onClick={async () => {
                  setBusy(item.key);
                  try {
                    await downloadCsv(item.path, item.params, item.file);
                  } catch {
                    onError();
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                CSV
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t('business.exports.reportsTitle')}>
        <p className="text-sm text-[#3F4A44]">{t('business.exports.reportsText')}</p>
        <Link to="/admin/rapports" className="inline-block mt-3">
          <Button variant="secondary" icon={<BarChart3 className="w-4 h-4" />}>
            {t('business.exports.openReports')}
          </Button>
        </Link>
      </Card>
    </div>
  );
};
