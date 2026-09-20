import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  CalendarDays,
  Coins,
  CreditCard,
  Download,
  Headset,
  Info,
  Landmark,
  Package,
  Percent,
  ReceiptText,
  ShoppingCart,
  Tag,
  Wallet,
} from 'lucide-react';
import { resolveFileUrl } from '../../../lib/api';
import { useMySettlements, useSettlementDetail } from '../hooks';
import { PAGE_SIZE } from '../constants';
import {
  Btn,
  BtnLink,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  NAVY,
  Notice,
  Pagination,
  Panel,
  ProductThumb,
  SearchBox,
  SelectInput,
  StatCard,
  Table,
  Td,
  Th,
  ToneBadge,
} from '../ui';
import { downloadAuthorizedFile, exportCsv, formatDate, formatMoney, formatNumber, formatPercent, monthLabel } from '../utils';
import { ORDER_TONE } from './SalesHistoryPage';
import { SETTLEMENT_TONE } from './EarningsPage';
import { SkuSalesTable } from './SkuSalesTable';
import { SalesShell } from './SalesShell';

export const SettlementDetailsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: list, isLoading: loadingList, isError: listError } = useMySettlements();
  const settlements = list?.settlements ?? [];
  const period =
    searchParams.get('periode') ?? (settlements.find((s) => s.status !== 'OPEN') ?? settlements[0])?.period;
  const { data: detail, isLoading: loadingDetail, isError: detailError } = useSettlementDetail(period);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (detail?.items ?? []).filter((i) => !q || [i.order.orderNumber, i.productName].some((v) => v.toLowerCase().includes(q)));
  }, [detail, search]);

  const handleExport = () => {
    if (!detail) return;
    exportCsv(
      `${detail.id}.csv`,
      [
        t('producer:sales.cols.date'),
        t('producer:sales.cols.order'),
        t('producer:products.cols.product'),
        t('producer:sales.cols.quantity'),
        t('producer:sales.cols.unitPrice'),
        t('producer:sales.cols.amount'),
        t('producer:sales.cols.commission'),
        t('producer:kpi.yourEarnings'),
      ],
      rows.map((i) => [
        formatDate(i.order.deliveredAt ?? i.order.createdAt, lang),
        i.order.orderNumber,
        i.productName,
        i.quantity,
        Number(i.unitPrice).toFixed(2),
        Number(i.lineTotal).toFixed(2),
        Number(i.commissionAmount).toFixed(2),
        Number(i.netAmount).toFixed(2),
      ]),
    );
  };

  const receipt = async () => {
    if (!detail) return;
    setError(null);
    try {
      await downloadAuthorizedFile(`/settlements/mine/${detail.period}/receipt`, `recu-${detail.id}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:status.error'));
    }
  };

  const selector = settlements.length > 0 && (
    <SelectInput
      value={period ?? ''}
      onChange={(e) => {
        setSearchParams({ periode: e.target.value });
        setPage(1);
      }}
      leading={<CalendarDays className="w-4 h-4" />}
      aria-label={t('producer:settlements.select')}
      className="min-w-[240px] font-semibold"
    >
      {settlements.map((s) => (
        <option key={s.id} value={s.period}>
          {t('producer:settlements.option', { id: `#${s.id}`, month: monthLabel(s.period, lang, true) })}
        </option>
      ))}
    </SelectInput>
  );

  const summaryRow = (icon: React.ReactNode, label: string, value: React.ReactNode, strong = false) => (
    <div className={`flex items-center justify-between gap-3 py-2.5 text-sm ${strong ? 'bg-[#F0F8F2] px-2 rounded-md' : ''}`}>
      <dt className="flex items-center gap-2 text-[#374151]">{icon}{label}</dt>
      <dd className={`${strong ? 'font-extrabold text-[#17693F]' : `font-bold ${NAVY}`} text-end`}>{value}</dd>
    </div>
  );

  return (
    <SalesShell section="settlements" actions={selector}>
      {(loadingList || (period && loadingDetail)) && <LoadingBlock />}
      {(listError || detailError) && <ErrorBlock />}
      {!loadingList && settlements.length === 0 && (
        <Panel>
          <div className="text-center py-10">
            <ReceiptText className="w-10 h-10 mx-auto text-gray-300" />
            <p className={`font-bold mt-3 ${NAVY}`}>{t('producer:earnings.noSettlements')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('producer:settlements.emptyHint')}</p>
          </div>
        </Panel>
      )}
      {detail && (
        <div className="space-y-5">
          {error && <Notice tone="error" onClose={() => setError(null)}>{error}</Notice>}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard tone="green" icon={<Coins className="w-5 h-5" />} label={t('producer:kpi.totalSalesTnd')} value={formatNumber(detail.grossAmount, lang, 2)} hint={t('producer:settlements.ordersCount', { count: detail.orderCount })} />
            <StatCard tone="gold" icon={<Percent className="w-5 h-5" />} label={t('producer:settlements.commission')} value={formatNumber(detail.commissionAmount, lang, 2)} hint={t('producer:sales.currencyRate', { rate: formatPercent(detail.commissionRate, lang) })} />
            <StatCard tone="green" icon={<Wallet className="w-5 h-5" />} label={t('producer:settlements.netEarnings')} value={formatNumber(detail.netAmount, lang, 2)} unit={t('producer:common.currency')} />
            <StatCard
              tone="blue"
              icon={<CalendarDays className="w-5 h-5" />}
              label={t('producer:settlements.period')}
              value={<span className="text-base sm:text-lg">{formatDate(detail.periodStart, lang)} – {formatDate(detail.periodEnd, lang)}</span>}
              hint={t('producer:settlements.monthly')}
            />
          </div>

          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
            <div className="space-y-4 min-w-0">
            <Panel
              title={t('producer:settlements.ordersTitle')}
              subtitle={t('producer:settlements.ordersHint')}
              action={
                <Btn variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
                  <Download className="w-4 h-4" />
                  {t('producer:common.export')}
                </Btn>
              }
              bodyClassName="p-3 sm:p-4"
            >
              <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('producer:sales.searchPlaceholder')} className="mb-3" />
              <Table>
                <thead>
                  <tr>
                    <Th>{t('producer:settlements.deliveredOn')}</Th>
                    <Th>{t('producer:sales.cols.order')}</Th>
                    <Th>{t('producer:products.cols.product')}</Th>
                    <Th>{t('producer:sales.cols.quantity')}</Th>
                    <Th>{t('producer:sales.cols.unitPriceTnd')}</Th>
                    <Th>{t('producer:sales.cols.amountTnd')}</Th>
                    <Th>{t('producer:sales.cols.commissionTnd')}</Th>
                    <Th>{t('producer:sales.cols.status')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <EmptyRow colSpan={8} message={t('producer:common.noResults')} />}
                  {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => (
                    <tr key={item.id}>
                      <Td className="whitespace-nowrap">{formatDate(item.order.deliveredAt, lang)}</Td>
                      <Td className="font-mono text-xs whitespace-nowrap">#{item.order.orderNumber}</Td>
                      <Td>
                        <span className="flex items-center gap-2 min-w-[140px]">
                          <ProductThumb src={item.product.images[0] ? resolveFileUrl(item.product.images[0]) : undefined} alt={item.productName} size={28} />
                          <span className="font-semibold text-[#1F4FA3]">{item.productName}</span>
                        </span>
                      </Td>
                      <Td>{formatNumber(item.quantity, lang)}</Td>
                      <Td>{formatNumber(Number(item.unitPrice), lang, 2)}</Td>
                      <Td>{formatNumber(Number(item.lineTotal), lang, 2)}</Td>
                      <Td>{formatNumber(Number(item.commissionAmount), lang, 2)}</Td>
                      <Td><ToneBadge tone={ORDER_TONE[item.order.status]}>{t(`producer:orderStatus.${item.order.status}`)}</ToneBadge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} summary={(from, to, total) => t('producer:sales.showingOrders', { from, to, total })} />
            </Panel>
            <SkuSalesTable items={detail.items} title={t('producer:sku.settlementTitle')} />
            </div>

            <div className="space-y-4">
              <Panel title={t('producer:settlements.summary')}>
                <dl className="divide-y divide-[#EEF0EC]">
                  {summaryRow(<ShoppingCart className="w-4 h-4" />, t('producer:kpi.totalOrders'), formatNumber(detail.orderCount, lang))}
                  {summaryRow(<Package className="w-4 h-4" />, t('producer:settlements.itemsSold'), formatNumber(detail.itemsSold, lang))}
                  {summaryRow(<Coins className="w-4 h-4" />, t('producer:settlements.totalAmount'), formatMoney(detail.grossAmount, lang, t, 2))}
                  {summaryRow(<Tag className="w-4 h-4" />, t('producer:settlements.rate'), formatPercent(detail.commissionRate, lang))}
                  {summaryRow(<Percent className="w-4 h-4" />, t('producer:settlements.totalCommission'), formatMoney(detail.commissionAmount, lang, t, 2))}
                  {summaryRow(<Wallet className="w-4 h-4" />, t('producer:settlements.netEarnings'), formatMoney(detail.netAmount, lang, t, 2), true)}
                </dl>
              </Panel>

              <Panel title={t('producer:settlements.paymentInfo')}>
                <dl className="divide-y divide-[#EEF0EC]">
                  {summaryRow(<CreditCard className="w-4 h-4" />, t('producer:account.payment.method'), detail.payment.paymentMethod ? t(`producer:options.payment.${detail.payment.paymentMethod}`, { defaultValue: detail.payment.paymentMethod }) : '—')}
                  {summaryRow(<Landmark className="w-4 h-4" />, t('producer:account.payment.bank'), detail.payment.bankName || '—')}
                  {summaryRow(<Banknote className="w-4 h-4" />, t('producer:account.payment.iban'), <span dir="ltr" className="font-mono text-xs">{detail.payment.iban || '—'}</span>)}
                  {summaryRow(<CalendarDays className="w-4 h-4" />, detail.paidAt ? t('producer:settlements.paidOn') : t('producer:settlements.expectedPayout'), formatDate(detail.paidAt ?? detail.expectedPayoutDate, lang))}
                  {detail.reference && summaryRow(<ReceiptText className="w-4 h-4" />, t('producer:settlements.reference'), detail.reference)}
                  {summaryRow(<Info className="w-4 h-4" />, t('producer:sales.cols.status'), <ToneBadge tone={SETTLEMENT_TONE[detail.status]}>{t(`producer:settlementStatus.${detail.status}`)}</ToneBadge>)}
                </dl>
                <p className="flex items-start gap-2 text-xs text-gray-500 bg-[#F4F6F3] rounded-md p-2.5 mt-3">
                  <Info className="w-4 h-4 shrink-0" />
                  {t('producer:earnings.payoutRule')}
                </p>
                {detail.status === 'PAID' ? (
                  <Btn variant="outline" className="w-full mt-3" onClick={() => void receipt()}>
                    <Download className="w-4 h-4" />
                    {t('producer:settlements.downloadReceipt')}
                  </Btn>
                ) : (
                  !detail.payment.iban && (
                    <BtnLink to="/producteur/profil?tab=account" variant="outline" className="w-full mt-3">
                      {t('producer:earnings.addBank')}
                    </BtnLink>
                  )
                )}
              </Panel>

              <Panel title={t('producer:settlements.support')}>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-start gap-2 text-sm text-[#374151]">
                    <Headset className="w-5 h-5 shrink-0 text-[#14215B]" />
                    {t('producer:settlements.supportBody')}
                  </p>
                  <Link to="/producteur/aide?tab=tickets" className="shrink-0 rounded-md border border-[#CBD2CC] px-3 py-1.5 text-xs font-bold text-[#14215B] hover:bg-[#F6F7F5]">
                    {t('producer:help.cta')}
                  </Link>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </SalesShell>
  );
};
