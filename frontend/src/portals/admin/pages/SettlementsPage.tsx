import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import { useAdminSettlements, usePaySettlement } from '../hooks/useSales';
import type { AdminSettlement } from '../hooks/useSales';
import { Card, Badge, Button, EmptyState, Alert } from '../../../design-system';

const TONE = { OPEN: 'blue', PROCESSING: 'gold', PAID: 'green' } as const;

// Règlements mensuels des producteurs : une période clôturée (mois terminé)
// peut être marquée comme payée par un administrateur, ce qui fige ses montants.
export const SettlementsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'producer', 'common']);
  const { user } = useAuth();
  const { data: settlements = [], isLoading } = useAdminSettlements();
  const pay = usePaySettlement();
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'ADMIN';

  const money = (value: number) => `${value.toFixed(2)} ${t('producer:common.currency')}`;
  const month = (period: string) => {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(dateLocale(i18n.language), { month: 'long', year: 'numeric' });
  };

  const markPaid = async (settlement: AdminSettlement) => {
    const reference = window.prompt(t('admin:settlements.referencePrompt', { producer: settlement.producer.name, amount: money(settlement.netAmount) }));
    if (reference === null) return;
    setError('');
    try {
      await pay.mutateAsync({ producerId: settlement.producer.id, period: settlement.period, reference: reference || undefined });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  const toPay = settlements.filter((s) => s.status === 'PROCESSING');

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">{t('admin:settlements.heading')}</h1>
      <p className="text-gray-500 mb-4">{t('admin:settlements.subtitle')}</p>

      {toPay.length > 0 && (
        <Alert tone="warning" className="mb-4">
          {t('admin:settlements.toPay', { count: toPay.length, amount: money(toPay.reduce((sum, s) => sum + s.netAmount, 0)) })}
        </Alert>
      )}
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && settlements.length === 0 && (
        <Card>
          <EmptyState title={t('admin:settlements.empty')} />
        </Card>
      )}

      <div className="space-y-3">
        {settlements.map((s) => (
          <Card key={`${s.producer.id}-${s.period}`} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-[#0C261B]">{s.producer.name}</p>
                <Badge tone={TONE[s.status]}>{t(`producer:settlementStatus.${s.status}`)}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.producer.farmName} · {month(s.period)} · {t('admin:settlements.orders', { count: s.orderCount })}
              </p>
              <p className="text-xs text-gray-400">
                {s.producer.bankName ?? '—'} · <span dir="ltr">{s.producer.iban ?? t('admin:settlements.noIban')}</span>
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
              <p className="text-xs text-gray-500">
                {t('admin:settlements.gross')} {money(s.grossAmount)} · {t('admin:settlements.commission')} {money(s.commissionAmount)}
              </p>
              <p className="text-lg font-bold text-[#0C261B]">{money(s.netAmount)}</p>
              {s.status === 'PAID' && s.paidAt && (
                <p className="text-xs text-gray-400">
                  {t('admin:settlements.paidOn', { date: new Date(s.paidAt).toLocaleDateString(dateLocale(i18n.language)) })}
                  {s.reference ? ` · ${s.reference}` : ''}
                </p>
              )}
              {s.status === 'PROCESSING' && isAdmin && (
                <Button size="sm" onClick={() => void markPaid(s)} isLoading={pay.isPending}>
                  {t('admin:settlements.markPaid')}
                </Button>
              )}
              {s.status === 'OPEN' && <p className="text-xs text-gray-400">{t('admin:settlements.openHint')}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
