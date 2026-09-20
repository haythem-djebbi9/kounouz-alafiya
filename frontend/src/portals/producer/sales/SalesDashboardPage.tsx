import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coins, Percent, ShoppingCart, Wallet } from 'lucide-react';
import { resolveFileUrl } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import { useMySales } from '../hooks';
import { BarChart, DonutChart } from '../charts';
import { CHART_COLORS } from '../constants';
import {
  DateRangePicker,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  Panel,
  ProductThumb,
  SelectInput,
  StatCard,
  Table,
  Td,
  Th,
  ViewAllLink,
} from '../ui';
import type { Delta } from '../ui';
import {
  change,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  inRange,
  isActiveSale,
  monthLabel,
  periodKey,
  previousRange,
  topProducts,
  totals,
  unitsByPackage,
  weeklySeries,
} from '../utils';
import type { DateRange, RangePreset } from '../utils';
import type { SaleItem } from '../types';
import { SkuSalesTable } from './SkuSalesTable';
import { SalesShell, useRangeState } from './SalesShell';

export function useRangeDelta(preset: RangePreset) {
  const { t, i18n } = useTranslation('producer');
  return (current: number, previous: number): Delta | undefined => {
    if (preset === 'ALL_TIME') return undefined;
    const ratio = change(current, previous);
    if (ratio === null) return { direction: 'up', label: t('sales.newVsPrevious') };
    return {
      direction: ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat',
      label: t('sales.vsPrevious', { value: `${ratio > 0 ? '+' : ''}${formatPercent(ratio, i18n.language)}` }),
    };
  };
}

// Barres hebdomadaires sur une période courte, mensuelles au-delà de ~2 mois.
function buildOverview(items: SaleItem[], range: DateRange, lang: string) {
  const days = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  if (days <= 62) {
    return weeklySeries(items, range).map((bucket) => ({
      label: `${bucket.from.getDate()}–${bucket.to.getDate()} ${bucket.to.toLocaleDateString(dateLocale(lang), { month: 'short' })}`,
      units: bucket.units,
      gross: bucket.gross,
    }));
  }
  const firstSale = items.reduce<Date | null>((min, i) => {
    const d = new Date(i.order.createdAt);
    return !min || d < min ? d : min;
  }, null);
  const start = new Date(Math.max(range.from.getTime(), firstSale?.getTime() ?? range.from.getTime()));
  const end = new Date(Math.min(range.to.getTime(), Date.now()));
  const months: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end && months.length < 24) {
    months.push(periodKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months.map((period) => {
    const monthTotals = totals(items.filter((i) => periodKey(new Date(i.order.createdAt)) === period));
    return { label: monthLabel(period, lang), units: monthTotals.units, gross: monthTotals.gross };
  });
}

export const SalesDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { data, isLoading, isError } = useMySales();
  const { preset, range, onChange } = useRangeState();
  const [metric, setMetric] = useState<'units' | 'gross'>('units');
  const delta = useRangeDelta(preset);

  const active = useMemo(() => (data?.items ?? []).filter(isActiveSale), [data]);
  const current = active.filter((i) => inRange(i.order.createdAt, range));
  const previous = active.filter((i) => inRange(i.order.createdAt, previousRange(range)));
  const now = totals(current);
  const before = totals(previous);
  const rate = data?.commissionRate ?? 0.2;

  const overview = buildOverview(current, range, lang);
  const packages = unitsByPackage(current, t('producer:common.other')).map((row, i) => ({
    ...row,
    color: [CHART_COLORS.green, CHART_COLORS.gold, CHART_COLORS.blue, CHART_COLORS.brown][i],
  }));
  const top = topProducts(current);

  return (
    <SalesShell section="dashboard" actions={<DateRangePicker preset={preset} range={range} onChange={onChange} />}>
      {isLoading && <LoadingBlock />}
      {isError && <ErrorBlock />}
      {data && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard tone="green" icon={<ShoppingCart className="w-5 h-5" />} label={t('producer:kpi.totalUnits')} value={formatNumber(now.units, lang)} delta={delta(now.units, before.units)} />
            <StatCard tone="blue" icon={<Coins className="w-5 h-5" />} label={t('producer:kpi.totalSales')} value={formatNumber(now.gross, lang)} unit={t('producer:common.currency')} delta={delta(now.gross, before.gross)} />
            <StatCard tone="gold" icon={<Percent className="w-5 h-5" />} label={t('producer:kpi.commission')} value={formatNumber(now.commission, lang)} unit={t('producer:common.currency')} hint={t('producer:sales.rate', { rate: formatPercent(rate, lang) })} />
            <StatCard tone="green" icon={<Wallet className="w-5 h-5" />} label={t('producer:kpi.yourEarnings')} value={formatNumber(now.net, lang)} unit={t('producer:common.currency')} delta={delta(now.net, before.net)} />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <Panel
              title={t('producer:sales.overview')}
              subtitle={t('producer:sales.overviewHint')}
              action={
                <SelectInput value={metric} onChange={(e) => setMetric(e.target.value as 'units' | 'gross')} className="py-1.5 text-xs" aria-label={t('producer:dashboard.metric')}>
                  <option value="units">{t('producer:kpi.unitsSold')}</option>
                  <option value="gross">{t('producer:kpi.salesTnd')}</option>
                </SelectInput>
              }
            >
              <BarChart
                labels={overview.map((o) => o.label)}
                series={[
                  metric === 'units'
                    ? { key: 'units', label: t('producer:kpi.unitsSold'), color: '#0B5D3B', values: overview.map((o) => o.units) }
                    : { key: 'gross', label: t('producer:kpi.salesTnd'), color: CHART_COLORS.blue, values: overview.map((o) => o.gross) },
                ]}
                formatValue={(v) => (metric === 'units' ? formatNumber(v, lang) : formatMoney(v, lang, t))}
                formatAxis={(v) => formatNumber(v, lang)}
                showValueLabels={overview.length <= 8}
                emptyLabel={t('producer:sales.noSalesInRange')}
              />
            </Panel>
            <Panel title={t('producer:sales.byPackage')} subtitle={t('producer:sales.byPackageHint')}>
              <DonutChart
                data={packages}
                centerValue={formatNumber(now.units, lang)}
                centerLabel={t('producer:common.units')}
                formatValue={(v) => formatNumber(v, lang)}
                formatPercent={(v) => formatPercent(v, lang)}
                emptyLabel={t('producer:sales.noSalesInRange')}
              />
            </Panel>
          </div>

          <SkuSalesTable items={current} />

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title={t('producer:sales.topProducts')} bodyClassName="p-3 sm:p-4">
              <Table>
                <thead>
                  <tr>
                    <Th>{t('producer:products.cols.product')}</Th>
                    <Th>{t('producer:kpi.unitsSold')}</Th>
                    <Th>{t('producer:kpi.salesTnd')}</Th>
                    <Th>{t('producer:kpi.yourEarningsTnd')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {top.length === 0 && <EmptyRow colSpan={4} message={t('producer:sales.noSalesInRange')} />}
                  {top.map((row) => (
                    <tr key={row.productId}>
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <ProductThumb src={row.image ? resolveFileUrl(row.image) : undefined} alt={row.name} size={32} />
                          <Link to={`/producteur/ventes/historique?produit=${row.productId}`} className="font-semibold text-[#1F4FA3] hover:underline">{row.name}</Link>
                        </span>
                      </Td>
                      <Td>{formatNumber(row.units, lang)}</Td>
                      <Td>{formatNumber(row.gross, lang, 2)}</Td>
                      <Td className="font-semibold">{formatNumber(row.net, lang, 2)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
            <Panel title={t('producer:sales.recentSales')} action={<ViewAllLink to="/producteur/ventes/historique" label={t('common:actions.viewAll')} />} bodyClassName="p-3 sm:p-4">
              <Table>
                <thead>
                  <tr>
                    <Th>{t('producer:sales.cols.date')}</Th>
                    <Th>{t('producer:products.cols.product')}</Th>
                    <Th>{t('producer:products.cols.package')}</Th>
                    <Th>{t('producer:sales.cols.units')}</Th>
                    <Th>{t('producer:sales.cols.amount')}</Th>
                    <Th>{t('producer:kpi.yourEarnings')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {current.length === 0 && <EmptyRow colSpan={6} message={t('producer:sales.noSalesInRange')} />}
                  {current.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <Td className="whitespace-nowrap">{formatDate(item.order.createdAt, lang)}</Td>
                      <Td className="font-semibold text-[#1F4FA3]">{item.productName}</Td>
                      <Td>{item.packageSize ?? '—'}</Td>
                      <Td>{formatNumber(item.quantity, lang)}</Td>
                      <Td className="whitespace-nowrap">{formatMoney(Number(item.lineTotal), lang, t)}</Td>
                      <Td className="whitespace-nowrap font-semibold">{formatMoney(Number(item.netAmount), lang, t)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </div>
        </div>
      )}
    </SalesShell>
  );
};
