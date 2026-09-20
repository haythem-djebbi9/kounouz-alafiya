import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CircleDollarSign, Coins, CreditCard, Download, Info, Percent, Wallet } from 'lucide-react';
import { useMySales, useMySettlements } from '../hooks';
import { BarChart, DonutChart } from '../charts';
import { CHART_COLORS } from '../constants';
import {
  DateRangePicker,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  NAVY,
  Notice,
  Panel,
  SelectInput,
  StatCard,
  Table,
  Td,
  Th,
  ToneBadge,
} from '../ui';
import {
  downloadAuthorizedFile,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  inRange,
  lastMonths,
  monthLabel,
  monthlySeries,
  previousRange,
  totals,
} from '../utils';
import type { Tone } from '../utils';
import type { SaleItem, Settlement, SettlementStatus } from '../types';
import { SalesShell, useRangeState } from './SalesShell';
import { useRangeDelta } from './SalesDashboardPage';

export const SETTLEMENT_TONE: Record<SettlementStatus, Tone> = {
  OPEN: 'blue',
  PROCESSING: 'gold',
  PAID: 'green',
};

const deliveredDate = (item: SaleItem) => item.order.deliveredAt;

export function nextPayment(settlements: Settlement[]): Settlement | undefined {
  const unpaid = settlements.filter((s) => s.status !== 'PAID');
  return unpaid.sort((a, b) => a.period.localeCompare(b.period))[0];
}

export const EarningsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { data: sales, isLoading: loadingSales, isError: salesError } = useMySales();
  const { data: settlementsData, isLoading: loadingSettlements, isError: settlementsError } = useMySettlements();
  const { preset, range, onChange } = useRangeState();
  const [months, setMonths] = useState(6);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const delta = useRangeDelta(preset);

  // Les gains sont acquis à la livraison : c'est aussi la base des règlements.
  const delivered = useMemo(() => (sales?.items ?? []).filter((i) => i.order.status === 'DELIVERED' && i.order.deliveredAt), [sales]);
  const now = totals(delivered.filter((i) => inRange(i.order.deliveredAt!, range)));
  const before = totals(delivered.filter((i) => inRange(i.order.deliveredAt!, previousRange(range))));
  const settlements = settlementsData?.settlements ?? [];
  const pending = settlements.filter((s) => s.status !== 'PAID');
  const pendingAmount = pending.reduce((sum, s) => sum + s.netAmount, 0);
  const next = nextPayment(settlements);
  const rate = settlementsData?.commissionRate ?? sales?.commissionRate ?? 0.2;
  const trend = monthlySeries(delivered, lastMonths(months), deliveredDate);

  const download = async (settlement: Settlement) => {
    setDownloadError(null);
    setDownloading(settlement.period);
    try {
      await downloadAuthorizedFile(`/settlements/mine/${settlement.period}/receipt`, `recu-${settlement.id}.pdf`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : t('common:status.error'));
    } finally {
      setDownloading(null);
    }
  };

  const isLoading = loadingSales || loadingSettlements;

  return (
    <SalesShell section="earnings" actions={<DateRangePicker preset={preset} range={range} onChange={onChange} />}>
      {isLoading && <LoadingBlock />}
      {(salesError || settlementsError) && <ErrorBlock />}
      {sales && settlementsData && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard tone="blue" icon={<Coins className="w-5 h-5" />} label={t('producer:kpi.totalSalesTnd')} value={formatNumber(now.gross, lang)} delta={delta(now.gross, before.gross)} />
            <StatCard tone="gold" icon={<Percent className="w-5 h-5" />} label={t('producer:kpi.commission')} value={formatNumber(now.commission, lang)} hint={t('producer:sales.currencyRate', { rate: formatPercent(rate, lang) })} />
            <StatCard tone="green" icon={<Wallet className="w-5 h-5" />} label={t('producer:kpi.yourEarnings')} value={formatNumber(now.net, lang)} unit={t('producer:common.currency')} delta={delta(now.net, before.net)} />
            <StatCard
              tone="blue"
              icon={<CreditCard className="w-5 h-5" />}
              label={t('producer:kpi.pendingPayment')}
              value={formatNumber(pendingAmount, lang)}
              unit={t('producer:common.currency')}
              hint={next ? t('producer:earnings.nextPayout', { date: formatDate(next.expectedPayoutDate, lang) }) : t('producer:earnings.nothingPending')}
            />
          </div>

          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
            <Panel
              title={t('producer:earnings.trend')}
              subtitle={t('producer:earnings.trendHint')}
              action={
                <SelectInput value={months} onChange={(e) => setMonths(Number(e.target.value))} className="py-1.5 text-xs" aria-label={t('producer:dashboard.period')}>
                  <option value={6}>{t('producer:dashboard.lastMonths', { count: 6 })}</option>
                  <option value={12}>{t('producer:dashboard.lastMonths', { count: 12 })}</option>
                </SelectInput>
              }
            >
              <BarChart
                labels={trend.map((m) => monthLabel(m.period, lang, months > 6))}
                series={[
                  { key: 'gross', label: t('producer:kpi.totalSalesTnd'), color: CHART_COLORS.blue, values: trend.map((m) => m.gross) },
                  { key: 'commission', label: t('producer:earnings.commissionTnd'), color: CHART_COLORS.gold, values: trend.map((m) => m.commission) },
                  { key: 'net', label: t('producer:kpi.yourEarningsTnd'), color: CHART_COLORS.green, values: trend.map((m) => m.net) },
                ]}
                formatValue={(v) => formatMoney(v, lang, t)}
                formatAxis={(v) => formatNumber(v, lang)}
                height={260}
                emptyLabel={t('producer:common.noSalesYet')}
              />
            </Panel>
            <Panel title={t('producer:earnings.breakdown')} subtitle={t('producer:earnings.breakdownHint')}>
              <DonutChart
                data={[
                  { label: t('producer:earnings.kounouzShare', { rate: formatPercent(rate, lang) }), value: now.commission, color: CHART_COLORS.gold },
                  { label: t('producer:earnings.yourShare', { rate: formatPercent(1 - rate, lang) }), value: now.net, color: CHART_COLORS.green },
                ]}
                centerValue={formatNumber(now.gross, lang)}
                centerLabel={t('producer:common.currency')}
                formatValue={(v) => formatNumber(v, lang, 2)}
                formatPercent={(v) => formatPercent(v, lang)}
                emptyLabel={t('producer:sales.noSalesInRange')}
                size={180}
                layout="stacked"
              />
            </Panel>
          </div>

          {downloadError && <Notice tone="error" onClose={() => setDownloadError(null)}>{downloadError}</Notice>}

          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
            <Panel title={t('producer:earnings.payoutHistory')} subtitle={t('producer:earnings.payoutHistoryHint')} bodyClassName="p-3 sm:p-4">
              <Table>
                <thead>
                  <tr>
                    <Th>{t('producer:earnings.cols.payoutDate')}</Th>
                    <Th>{t('producer:earnings.cols.period')}</Th>
                    <Th>{t('producer:kpi.totalSalesTnd')}</Th>
                    <Th>{t('producer:earnings.commissionTnd')}</Th>
                    <Th>{t('producer:kpi.yourEarningsTnd')}</Th>
                    <Th>{t('producer:sales.cols.status')}</Th>
                    <Th>{t('producer:earnings.cols.receipt')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.length === 0 && <EmptyRow colSpan={7} message={t('producer:earnings.noSettlements')} />}
                  {settlements.map((s) => (
                    <tr key={s.id}>
                      <Td className="whitespace-nowrap">{formatDate(s.paidAt ?? s.expectedPayoutDate, lang)}</Td>
                      <Td className="whitespace-nowrap">
                        <Link to={`/producteur/ventes/reglements?periode=${s.period}`} className="text-[#1F4FA3] hover:underline">
                          {monthLabel(s.period, lang, true)}
                        </Link>
                      </Td>
                      <Td>{formatNumber(s.grossAmount, lang, 2)}</Td>
                      <Td>{formatNumber(s.commissionAmount, lang, 2)}</Td>
                      <Td className="font-semibold">{formatNumber(s.netAmount, lang, 2)}</Td>
                      <Td><ToneBadge tone={SETTLEMENT_TONE[s.status]}>{t(`producer:settlementStatus.${s.status}`)}</ToneBadge></Td>
                      <Td>
                        {s.status === 'PAID' ? (
                          <button
                            onClick={() => void download(s)}
                            disabled={downloading === s.period}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD2CC] px-2.5 py-1 text-xs font-bold text-[#14215B] hover:bg-[#F6F7F5] disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {t('producer:earnings.download')}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>

            <Panel title={t('producer:earnings.nextPayment')} subtitle={t('producer:earnings.nextPaymentHint')}>
              {next ? (
                <>
                  <dl className="divide-y divide-[#EEF0EC] text-sm">
                    {[
                      { icon: <CalendarDays className="w-4 h-4" />, label: t('producer:earnings.cols.payoutDate'), value: formatDate(next.expectedPayoutDate, lang) },
                      { icon: <CircleDollarSign className="w-4 h-4" />, label: t('producer:earnings.estimated'), value: formatMoney(next.netAmount, lang, t, 2) },
                      { icon: <CalendarDays className="w-4 h-4" />, label: t('producer:earnings.cols.period'), value: monthLabel(next.period, lang, true) },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
                        <dt className="flex items-center gap-2 text-[#374151]">{row.icon}{row.label}</dt>
                        <dd className={`font-bold ${NAVY}`}>{row.value}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="flex items-center gap-2 text-[#374151]"><Info className="w-4 h-4" />{t('producer:sales.cols.status')}</dt>
                      <dd><ToneBadge tone={SETTLEMENT_TONE[next.status]}>{t(`producer:settlementStatus.${next.status}`)}</ToneBadge></dd>
                    </div>
                  </dl>
                  <p className="text-xs text-gray-500 mt-3">{t('producer:earnings.payoutRule')}</p>
                  <Link to={`/producteur/ventes/reglements?periode=${next.period}`} className="inline-block mt-3 text-sm font-bold text-[#1F4FA3] hover:underline">
                    {t('producer:earnings.viewSettlement')}
                  </Link>
                </>
              ) : (
                <p className="text-sm text-gray-500">{t('producer:earnings.nothingPending')}</p>
              )}
              {!settlementsData.payment.iban && (
                <Notice tone="error" className="mt-4">
                  {t('producer:earnings.missingBank')}{' '}
                  <Link to="/producteur/profil?tab=account" className="underline">{t('producer:earnings.addBank')}</Link>
                </Notice>
              )}
            </Panel>
          </div>
        </div>
      )}
    </SalesShell>
  );
};
