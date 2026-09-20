import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coins, Copy, Download, Percent, ReceiptText, ShoppingCart, Wallet } from 'lucide-react';
import { Modal } from '../../../design-system';
import { resolveFileUrl } from '../../../lib/api';
import { useMySales } from '../hooks';
import { PAGE_SIZE } from '../constants';
import {
  ActionMenu,
  Btn,
  DateRangePicker,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  NAVY,
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
import { exportCsv, formatDate, formatDateTime, formatMoney, formatNumber, formatPercent, inRange, isActiveSale, periodKey, previousRange, totals } from '../utils';
import type { Tone } from '../utils';
import type { OrderStatus, SaleItem, SalesChannel } from '../types';
import { SalesShell, useRangeState } from './SalesShell';
import { useRangeDelta } from './SalesDashboardPage';

export const ORDER_TONE: Record<OrderStatus, Tone> = {
  PENDING: 'gray',
  CONFIRMED: 'blue',
  SHIPPED: 'gold',
  DELIVERED: 'green',
  CANCELLED: 'red',
};
const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const CHANNELS: SalesChannel[] = ['ONLINE_STORE', 'MARKETPLACE', 'RETAIL_PARTNER'];

export const SalesHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useMySales();
  // Arrivée depuis une fiche produit : on élargit à l'année pour voir son historique.
  const { preset, range, onChange } = useRangeState(searchParams.get('produit') ? 'THIS_YEAR' : 'THIS_MONTH');
  const delta = useRangeDelta(preset);

  const [search, setSearch] = useState('');
  const [product, setProduct] = useState(searchParams.get('produit') ?? 'ALL');
  const [size, setSize] = useState('ALL');
  const [channel, setChannel] = useState<SalesChannel | 'ALL'>('ALL');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SaleItem | null>(null);

  const items = data?.items ?? [];
  const productOptions = useMemo(() => [...new Map(items.map((i) => [i.productId, i.productName])).entries()], [items]);
  const sizeOptions = useMemo(() => [...new Set(items.map((i) => i.packageSize).filter(Boolean))] as string[], [items]);

  const inPeriod = items.filter((i) => inRange(i.order.createdAt, range));
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriod.filter((i) => {
      if (product !== 'ALL' && i.productId !== product) return false;
      if (size !== 'ALL' && i.packageSize !== size) return false;
      if (channel !== 'ALL' && i.order.channel !== channel) return false;
      if (status !== 'ALL' && i.order.status !== status) return false;
      if (!q) return true;
      return [i.order.orderNumber, i.productName, i.order.city].some((v) => v.toLowerCase().includes(q));
    });
  }, [inPeriod, search, product, size, channel, status]);

  const now = totals(inPeriod.filter(isActiveSale));
  const before = totals(items.filter(isActiveSale).filter((i) => inRange(i.order.createdAt, previousRange(range))));

  const reset = () => {
    setSearch('');
    setProduct('ALL');
    setSize('ALL');
    setChannel('ALL');
    setStatus('ALL');
    setPage(1);
  };

  const handleExport = () => {
    exportCsv(
      `ventes-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t('producer:sales.cols.date'),
        t('producer:sales.cols.order'),
        t('producer:products.cols.product'),
        t('producer:products.cols.package'),
        t('producer:sales.cols.quantity'),
        t('producer:sales.cols.unitPrice'),
        t('producer:sales.cols.amount'),
        t('producer:sales.cols.commission'),
        t('producer:kpi.yourEarnings'),
        t('producer:sales.cols.channel'),
        t('producer:sales.cols.status'),
      ],
      rows.map((i) => [
        formatDate(i.order.createdAt, lang),
        i.order.orderNumber,
        i.productName,
        i.packageSize ?? '',
        i.quantity,
        Number(i.unitPrice).toFixed(2),
        Number(i.lineTotal).toFixed(2),
        Number(i.commissionAmount).toFixed(2),
        Number(i.netAmount).toFixed(2),
        t(`producer:channel.${i.order.channel}`),
        t(`producer:orderStatus.${i.order.status}`),
      ]),
    );
  };

  const filterSelect = (value: string, onValue: (v: string) => void, all: string, options: [string, string][], label: string) => (
    <SelectInput value={value} onChange={(e) => { onValue(e.target.value); setPage(1); }} aria-label={label} className="text-xs sm:text-sm">
      <option value="ALL">{all}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </SelectInput>
  );

  return (
    <SalesShell
      section="history"
      actions={
        <>
          <Btn variant="outline" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="w-4 h-4" />
            {t('producer:common.export')}
          </Btn>
          <DateRangePicker preset={preset} range={range} onChange={(p, r) => { onChange(p, r); setPage(1); }} />
        </>
      }
    >
      {isLoading && <LoadingBlock />}
      {isError && <ErrorBlock />}
      {data && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard tone="green" icon={<ShoppingCart className="w-5 h-5" />} label={t('producer:kpi.totalOrders')} value={formatNumber(now.orders, lang)} delta={delta(now.orders, before.orders)} />
            <StatCard tone="blue" icon={<Coins className="w-5 h-5" />} label={t('producer:kpi.totalSales')} value={formatNumber(now.gross, lang)} unit={t('producer:common.currency')} delta={delta(now.gross, before.gross)} />
            <StatCard tone="gold" icon={<Percent className="w-5 h-5" />} label={t('producer:kpi.commission')} value={formatNumber(now.commission, lang)} unit={t('producer:common.currency')} hint={t('producer:sales.rate', { rate: formatPercent(data.commissionRate, lang) })} />
            <StatCard tone="green" icon={<Wallet className="w-5 h-5" />} label={t('producer:kpi.yourEarnings')} value={formatNumber(now.net, lang)} unit={t('producer:common.currency')} delta={delta(now.net, before.net)} />
          </div>

          <Panel bodyClassName="p-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-3 mb-4">
              <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('producer:sales.searchPlaceholder')} />
              {filterSelect(product, setProduct, t('producer:sales.filters.allProducts'), productOptions, t('producer:products.cols.product'))}
              {filterSelect(size, setSize, t('producer:sales.filters.allSizes'), sizeOptions.map((s) => [s, s]), t('producer:products.cols.package'))}
              {filterSelect(channel, (v) => setChannel(v as SalesChannel | 'ALL'), t('producer:sales.filters.allChannels'), CHANNELS.map((c) => [c, t(`producer:channel.${c}`)]), t('producer:sales.cols.channel'))}
              {filterSelect(status, (v) => setStatus(v as OrderStatus | 'ALL'), t('producer:common.allStatuses'), ORDER_STATUSES.map((s) => [s, t(`producer:orderStatus.${s}`)]), t('producer:sales.cols.status'))}
              <Btn variant="light" onClick={reset}>{t('producer:common.reset')}</Btn>
            </div>

            <Table>
              <thead>
                <tr>
                  <Th>{t('producer:sales.cols.date')}</Th>
                  <Th>{t('producer:sales.cols.order')}</Th>
                  <Th>{t('producer:products.cols.product')}</Th>
                  <Th>{t('producer:products.cols.package')}</Th>
                  <Th>{t('producer:sales.cols.quantity')}</Th>
                  <Th>{t('producer:sales.cols.unitPriceTnd')}</Th>
                  <Th>{t('producer:sales.cols.amountTnd')}</Th>
                  <Th>{t('producer:sales.cols.commissionTnd')}</Th>
                  <Th>{t('producer:kpi.yourEarningsTnd')}</Th>
                  <Th>{t('producer:sales.cols.channel')}</Th>
                  <Th>{t('producer:sales.cols.status')}</Th>
                  <Th className="text-end">{t('producer:common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={12} message={items.length === 0 ? t('producer:common.noSalesYet') : t('producer:sales.noSalesInRange')} />}
                {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFBF9]">
                    <Td className="whitespace-nowrap">{formatDate(item.order.createdAt, lang)}</Td>
                    <Td className="font-mono text-xs whitespace-nowrap">#{item.order.orderNumber}</Td>
                    <Td>
                      <span className="flex items-center gap-2 min-w-[150px]">
                        <ProductThumb src={item.product.images[0] ? resolveFileUrl(item.product.images[0]) : undefined} alt={item.productName} size={30} />
                        <span className="font-semibold text-[#1F4FA3]">{item.productName}</span>
                      </span>
                    </Td>
                    <Td>{item.packageSize ?? '—'}</Td>
                    <Td>{formatNumber(item.quantity, lang)}</Td>
                    <Td>{formatNumber(Number(item.unitPrice), lang, 2)}</Td>
                    <Td>{formatNumber(Number(item.lineTotal), lang, 2)}</Td>
                    <Td>{formatNumber(Number(item.commissionAmount), lang, 2)}</Td>
                    <Td className="font-semibold">{formatNumber(Number(item.netAmount), lang, 2)}</Td>
                    <Td className="whitespace-nowrap">{t(`producer:channel.${item.order.channel}`)}</Td>
                    <Td><ToneBadge tone={ORDER_TONE[item.order.status]}>{t(`producer:orderStatus.${item.order.status}`)}</ToneBadge></Td>
                    <Td className="text-end">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => setSelected(item)} className="rounded-md border border-[#CBD2CC] px-3 py-1.5 text-xs font-bold text-[#14215B] hover:bg-[#F6F7F5]">
                          {t('producer:common.view')}
                        </button>
                        <ActionMenu
                          actions={[
                            { label: t('producer:sales.copyOrder'), icon: <Copy className="w-4 h-4" />, onClick: () => void navigator.clipboard?.writeText(item.order.orderNumber) },
                            ...(item.order.status === 'DELIVERED' && item.order.deliveredAt
                              ? [{ label: t('producer:sales.viewSettlement'), icon: <ReceiptText className="w-4 h-4" />, onClick: () => navigate(`/producteur/ventes/reglements?periode=${periodKey(new Date(item.order.deliveredAt!))}`) }]
                              : []),
                          ]}
                        />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} summary={(from, to, total) => t('producer:sales.showingOrders', { from, to, total })} />
          </Panel>
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? `${t('producer:sales.cols.order')} #${selected.order.orderNumber}` : ''}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ProductThumb src={selected.product.images[0] ? resolveFileUrl(selected.product.images[0]) : undefined} alt={selected.productName} size={56} />
              <div>
                <p className={`font-bold ${NAVY}`}>{selected.productName}</p>
                <p className="text-xs text-gray-500">{selected.packageSize ?? '—'} · {selected.product.batch?.batchCode ?? '—'}</p>
              </div>
              <ToneBadge tone={ORDER_TONE[selected.order.status]} className="ms-auto">{t(`producer:orderStatus.${selected.order.status}`)}</ToneBadge>
            </div>
            <dl className="divide-y divide-[#EEF0EC] text-sm">
              {[
                [t('producer:sales.detail.orderedOn'), formatDateTime(selected.order.createdAt, lang)],
                [t('producer:sales.detail.deliveredOn'), formatDateTime(selected.order.deliveredAt, lang)],
                [t('producer:sales.cols.channel'), t(`producer:channel.${selected.order.channel}`)],
                [t('producer:sales.detail.city'), selected.order.city],
                [t('producer:sales.cols.quantity'), formatNumber(selected.quantity, lang)],
                [t('producer:sales.cols.unitPrice'), formatMoney(Number(selected.unitPrice), lang, t, 2)],
                [t('producer:sales.cols.amount'), formatMoney(Number(selected.lineTotal), lang, t, 2)],
                [t('producer:sales.detail.commission', { rate: formatPercent(Number(selected.commissionRate), lang) }), `− ${formatMoney(Number(selected.commissionAmount), lang, t, 2)}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-semibold text-[#14215B] text-end">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-2.5">
                <dt className={`font-bold ${NAVY}`}>{t('producer:kpi.yourEarnings')}</dt>
                <dd className="font-extrabold text-[#17693F]">{formatMoney(Number(selected.netAmount), lang, t, 2)}</dd>
              </div>
            </dl>
            <p className="text-xs text-gray-500">{t('producer:sales.detail.privacy')}</p>
          </div>
        )}
      </Modal>
    </SalesShell>
  );
};
