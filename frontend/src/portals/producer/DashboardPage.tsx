import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, ChartNoAxesColumnIncreasing, ClipboardCheck, Coins, FlaskConical, PackageOpen, PieChart, Plus, Sprout, Wallet } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { dateLocale } from '../../i18n';
import { useMyBatches, useMyRequests, useMySales } from './hooks';
import { BarChart, DonutChart } from './charts';
import { CHART_COLORS } from './constants';
import {
  BtnLink,
  EmptyRow,
  ImageBanner,
  MiniBars,
  NAVY,
  Panel,
  SelectInput,
  StatCard,
  Table,
  Td,
  Th,
  ToneBadge,
  ViewAllLink,
} from './ui';
import {
  BATCH_TONE,
  STAGE_TONE,
  change,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  isActiveSale,
  lastMonths,
  monthLabel,
  monthlySeries,
  periodKey,
  requestLabel,
  requestStage,
  totals,
  unitsByPackage,
} from './utils';
import type { Delta } from './ui';

export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { user } = useAuth();
  const { data: requests = [], isLoading: loadingRequests } = useMyRequests();
  const { data: batches = [], isLoading: loadingBatches } = useMyBatches();
  const { data: sales } = useMySales();
  const [metric, setMetric] = useState<'units' | 'net'>('units');
  const [months, setMonths] = useState(6);

  const activeItems = useMemo(() => (sales?.items ?? []).filter(isActiveSale), [sales]);
  const all = totals(activeItems);
  const thisMonthKey = periodKey(new Date());
  const lastMonthKey = periodKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const byMonth = (key: string) => totals(activeItems.filter((i) => periodKey(new Date(i.order.createdAt)) === key));
  const thisMonth = byMonth(thisMonthKey);
  const lastMonth = byMonth(lastMonthKey);

  const pctDelta = (current: number, previous: number): Delta => {
    const ratio = change(current, previous);
    if (ratio === null) return { direction: 'up', label: t('producer:dashboard.newThisMonth') };
    return {
      direction: ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat',
      label: t('producer:dashboard.vsLastMonth', { value: `${ratio > 0 ? '+' : ''}${formatPercent(ratio, lang)}` }),
    };
  };

  const series = monthlySeries(activeItems, lastMonths(months), (i) => i.order.createdAt);
  const packageData = unitsByPackage(activeItems, t('producer:common.other')).map((row, i) => ({
    ...row,
    color: [CHART_COLORS.green, CHART_COLORS.gold, CHART_COLORS.blue, CHART_COLORS.brown][i],
  }));

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className={`text-3xl sm:text-4xl font-extrabold ${NAVY}`}>{t('producer:dashboard.greeting', { name: firstName })}</h1>
          <p className="text-[#27315F] mt-1">{t('producer:dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-3">
          <p className="text-sm text-[#27315F]">
            {new Date().toLocaleDateString(dateLocale(lang), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <BtnLink to="/producteur/demandes/nouvelle">
            <Plus className="w-4 h-4" />
            {t('producer:dashboard.newRequest')}
          </BtnLink>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          tone="green"
          icon={<Box className="w-5 h-5" />}
          label={t('producer:kpi.unitsSold')}
          value={formatNumber(all.units, lang)}
          delta={{ direction: thisMonth.units > 0 ? 'up' : 'flat', label: t('producer:dashboard.plusThisMonth', { value: formatNumber(thisMonth.units, lang) }) }}
          decoration={<MiniBars color={CHART_COLORS.green} />}
        />
        <StatCard
          tone="gold"
          icon={<Coins className="w-5 h-5" />}
          label={t('producer:kpi.grossSales')}
          value={formatNumber(all.gross, lang)}
          unit={t('producer:common.currency')}
          delta={pctDelta(thisMonth.gross, lastMonth.gross)}
          decoration={<MiniBars color={CHART_COLORS.gold} />}
        />
        <StatCard
          tone="red"
          icon={<PieChart className="w-5 h-5" />}
          label={t('producer:kpi.commission')}
          value={formatNumber(all.commission, lang)}
          unit={t('producer:common.currency')}
          delta={pctDelta(thisMonth.commission, lastMonth.commission)}
          decoration={<MiniBars color="#D05A5A" />}
        />
        <StatCard
          tone="green"
          icon={<Wallet className="w-5 h-5" />}
          label={t('producer:kpi.netEarnings')}
          value={formatNumber(all.net, lang)}
          unit={t('producer:common.currency')}
          delta={pctDelta(thisMonth.net, lastMonth.net)}
          decoration={<MiniBars color={CHART_COLORS.green} />}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel
          className="lg:col-span-5"
          title={t('producer:dashboard.salesOverview')}
          action={
            <div className="flex gap-2">
              <SelectInput value={metric} onChange={(e) => setMetric(e.target.value as 'units' | 'net')} className="py-1.5 text-xs" aria-label={t('producer:dashboard.metric')}>
                <option value="units">{t('producer:kpi.unitsSold')}</option>
                <option value="net">{t('producer:kpi.netEarnings')}</option>
              </SelectInput>
              <SelectInput value={months} onChange={(e) => setMonths(Number(e.target.value))} className="py-1.5 text-xs" aria-label={t('producer:dashboard.period')}>
                <option value={6}>{t('producer:dashboard.lastMonths', { count: 6 })}</option>
                <option value={12}>{t('producer:dashboard.lastMonths', { count: 12 })}</option>
              </SelectInput>
            </div>
          }
        >
          <BarChart
            labels={series.map((s) => monthLabel(s.period, lang))}
            series={[
              metric === 'units'
                ? { key: 'units', label: t('producer:kpi.unitsSold'), color: CHART_COLORS.green, values: series.map((s) => s.units) }
                : { key: 'net', label: t('producer:kpi.netEarnings'), color: CHART_COLORS.gold, values: series.map((s) => s.net) },
            ]}
            formatValue={(v) => (metric === 'units' ? formatNumber(v, lang) : formatMoney(v, lang, t))}
            formatAxis={(v) => formatNumber(v, lang)}
            showValueLabels={months === 6}
            emptyLabel={t('producer:common.noSalesYet')}
          />
        </Panel>

        <Panel className="lg:col-span-4" title={t('producer:dashboard.unitsByPackage')}>
          <DonutChart
            data={packageData}
            centerValue={formatNumber(all.units, lang)}
            centerLabel={t('producer:common.units')}
            formatValue={(v) => formatNumber(v, lang)}
            formatPercent={(v) => formatPercent(v, lang)}
            emptyLabel={t('producer:common.noSalesYet')}
            size={160}
          />
        </Panel>

        <div className="lg:col-span-3 flex flex-col gap-4">
          <ImageBanner image="/images/beekeeper.jpg" title={t('producer:brand.promoTitle')} className="h-32" />
          <div className="rounded-xl border border-[#F5E5C2] bg-[#FFF8EA] p-4 flex-1">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-[#0B4A2F] text-white flex items-center justify-center shrink-0">
                <Sprout className="w-5 h-5" />
              </span>
              <div>
                <p className={`font-bold ${NAVY}`}>{t('producer:dashboard.workMattersTitle')}</p>
                <p className="text-sm text-[#374151] mt-1">{t('producer:dashboard.workMattersBody')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel
          className="lg:col-span-5"
          title={t('producer:dashboard.recentRequests')}
          action={<ViewAllLink to="/producteur/demandes" label={t('common:actions.viewAll')} />}
          bodyClassName="p-3 sm:p-4"
        >
          <Table>
            <thead>
              <tr>
                <Th>{t('producer:requests.cols.id')}</Th>
                <Th>{t('producer:requests.cols.honeyType')}</Th>
                <Th>{t('producer:requests.cols.submitted')}</Th>
                <Th>{t('producer:requests.cols.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {!loadingRequests && requests.length === 0 && <EmptyRow colSpan={4} message={t('producer:requests.empty')} />}
              {requests.slice(0, 3).map((request) => {
                const stage = requestStage(request);
                return (
                  <tr key={request.id}>
                    <Td>
                      <Link
                        to={request.status === 'DRAFT' ? `/producteur/demandes/${request.id}/modifier` : `/producteur/demandes/${request.id}`}
                        className="font-semibold text-[#1F4FA3] hover:underline whitespace-nowrap"
                      >
                        {requestLabel(request, t)}
                      </Link>
                    </Td>
                    <Td className="text-[#1F4FA3]">{request.honeyType || '—'}</Td>
                    <Td className="whitespace-nowrap">{formatDate(request.submittedAt ?? request.createdAt, lang)}</Td>
                    <Td>
                      <ToneBadge tone={STAGE_TONE[stage]}>{t(`producer:stage.${stage}`)}</ToneBadge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>

        <Panel
          className="lg:col-span-4"
          title={t('producer:dashboard.myBatches')}
          action={<ViewAllLink to="/producteur/lots" label={t('common:actions.viewAll')} />}
          bodyClassName="p-3 sm:p-4"
        >
          <Table>
            <thead>
              <tr>
                <Th>{t('producer:batches.cols.id')}</Th>
                <Th>{t('producer:batches.cols.honeyType')}</Th>
                <Th>{t('producer:batches.cols.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {!loadingBatches && batches.length === 0 && <EmptyRow colSpan={3} message={t('producer:batches.empty')} />}
              {batches.slice(0, 3).map((batch) => (
                <tr key={batch.id}>
                  <Td>
                    <Link to={`/producteur/lots?lot=${batch.id}`} className="font-semibold text-[#1F4FA3] hover:underline whitespace-nowrap">
                      {batch.batchCode}
                    </Link>
                  </Td>
                  <Td className="text-[#1F4FA3]">{batch.honeyType}</Td>
                  <Td>
                    <ToneBadge tone={BATCH_TONE[batch.status]}>{t(`producer:batchStatus.${batch.status}`)}</ToneBadge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>

        <Panel className="lg:col-span-3" title={t('producer:dashboard.quickActions')}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/producteur/demandes/nouvelle', icon: FlaskConical, label: t('producer:dashboard.quick.request') },
              { to: '/producteur/lots', icon: PackageOpen, label: t('producer:dashboard.quick.batches') },
              { to: '/producteur/produits', icon: ClipboardCheck, label: t('producer:dashboard.quick.products') },
              { to: '/producteur/ventes', icon: ChartNoAxesColumnIncreasing, label: t('producer:dashboard.quick.sales') },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="rounded-lg bg-[#F4F7F4] hover:bg-[#E9F1EB] border border-[#E6ECE7] p-3 flex flex-col items-start gap-2 transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-[#DDEFE3] text-[#0B4A2F] flex items-center justify-center">
                  <action.icon className="w-4.5 h-4.5" />
                </span>
                <span className="text-xs font-semibold text-[#14215B] leading-snug">{action.label}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};
