import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyRow, Panel, Table, Td, Th } from '../ui';
import { formatNumber } from '../utils';
import type { SaleItem } from '../types';

interface SkuRow {
  key: string;
  sku: string;
  productName: string;
  packageSize: string | null;
  units: number;
  gross: number;
  commission: number;
  net: number;
}

/**
 * Ventes par format (SKU) — écran P09 du cahier des charges.
 *
 * Les formats de pot n'ont ni le même prix ni la même marge : pour chaque SKU,
 * unités vendues, chiffre d'affaires brut, commission Kounouz et net
 * producteur, sur les lignes transmises (déjà filtrées sur la période).
 */
export const SkuSalesTable: React.FC<{ items: SaleItem[]; title?: string }> = ({ items, title }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;

  const rows = useMemo(() => {
    const bySku = new Map<string, SkuRow>();
    for (const item of items) {
      const key = item.sku ?? `${item.productName}|${item.packageSize ?? ''}`;
      const row = bySku.get(key) ?? {
        key,
        sku: item.sku ?? '—',
        productName: item.productName,
        packageSize: item.packageSize,
        units: 0,
        gross: 0,
        commission: 0,
        net: 0,
      };
      row.units += item.quantity;
      row.gross += Number(item.lineTotal);
      row.commission += Number(item.commissionAmount);
      row.net += Number(item.netAmount);
      bySku.set(key, row);
    }
    return [...bySku.values()].sort((a, b) => b.gross - a.gross);
  }, [items]);

  const money = (v: number) => `${formatNumber(Math.round(v * 100) / 100, lang)} ${t('producer:common.currency')}`;
  const total = rows.reduce(
    (acc, r) => ({ units: acc.units + r.units, gross: acc.gross + r.gross, commission: acc.commission + r.commission, net: acc.net + r.net }),
    { units: 0, gross: 0, commission: 0, net: 0 },
  );

  return (
    <Panel title={title ?? t('producer:sku.title')} subtitle={t('producer:sku.hint')} bodyClassName="p-3 sm:p-4">
      <Table>
        <thead>
          <tr>
            <Th>{t('producer:sku.sku')}</Th>
            <Th>{t('producer:sku.format')}</Th>
            <Th className="text-end">{t('producer:sku.units')}</Th>
            <Th className="text-end">{t('producer:sku.gross')}</Th>
            <Th className="text-end">{t('producer:sku.commission')}</Th>
            <Th className="text-end">{t('producer:sku.net')}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6} message={t('producer:sales.noSalesInRange')} />}
          {rows.map((row) => (
            <tr key={row.key}>
              <Td>
                <span className="font-mono text-xs">{row.sku}</span>
                <span className="block text-xs text-gray-500">{row.productName}</span>
              </Td>
              <Td>{row.packageSize ?? '—'}</Td>
              <Td className="text-end">{formatNumber(row.units, lang)}</Td>
              <Td className="text-end">{money(row.gross)}</Td>
              <Td className="text-end text-gray-500">{money(row.commission)}</Td>
              <Td className="text-end font-bold text-[#0B5D3B]">{money(row.net)}</Td>
            </tr>
          ))}
          {rows.length > 1 && (
            <tr className="font-bold">
              <Td>{t('producer:sku.total')}</Td>
              <Td />
              <Td className="text-end">{formatNumber(total.units, lang)}</Td>
              <Td className="text-end">{money(total.gross)}</Td>
              <Td className="text-end text-gray-500">{money(total.commission)}</Td>
              <Td className="text-end text-[#0B5D3B]">{money(total.net)}</Td>
            </tr>
          )}
        </tbody>
      </Table>
    </Panel>
  );
};
