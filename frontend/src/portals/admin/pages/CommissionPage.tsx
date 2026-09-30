import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, History, Percent, Save } from 'lucide-react';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import { formatTnd } from '../../../lib/format-price';
import { useCommission, useUpdateCommission } from '../hooks/useSales';
import { Alert, Button, Card, EmptyState, Input, Textarea } from '../../../design-system';

// Pourcentage affiché (20) ↔ taux enregistré (0,2).
const toPercent = (rate: number) => Math.round(rate * 10_000) / 100;

/**
 * Commission Kounouz sur les ventes : l'administrateur règle ici le
 * pourcentage prélevé sur chaque vente (20 % par défaut). Le changement vaut
 * pour les commandes suivantes ; les ventes passées gardent leur taux.
 */
export const CommissionPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const lang = i18n.language;
  const { data, isLoading } = useCommission();
  const update = useUpdateCommission();
  const [percent, setPercent] = useState('');
  const [reason, setReason] = useState('');
  const [example, setExample] = useState('100');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setPercent(String(toPercent(data.rate)));
  }, [data]);

  const maxPercent = data ? toPercent(data.maxRate) : 50;
  const draft = Number(percent.replace(',', '.'));
  const draftValid = percent.trim() !== '' && Number.isFinite(draft) && draft >= 0 && draft <= maxPercent;
  const changed = !!data && draftValid && toPercent(data.rate) !== draft;
  const previewRate = draftValid ? draft / 100 : (data?.rate ?? 0.2);
  const sale = Math.max(0, Number(example.replace(',', '.')) || 0);
  const kounouzShare = Math.round(sale * previewRate * 1000) / 1000;
  const producerShare = Math.round((sale - kounouzShare) * 1000) / 1000;
  const pct = (value: number) => `${value.toLocaleString(dateLocale(lang), { maximumFractionDigits: 2 })} %`;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftValid) return;
    setError('');
    setSaved(false);
    try {
      await update.mutateAsync({ rate: Math.round(draft * 100) / 10_000, reason: reason.trim() || undefined });
      setReason('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#0C261B] mb-1">{t('admin:commission.heading')}</h1>
        <p className="text-gray-500">{t('admin:commission.subtitle')}</p>
      </div>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}

      {data && (
        <div className="grid gap-5 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <div className="flex items-center gap-4 mb-5">
              <span className="w-14 h-14 rounded-2xl bg-[#FBF1DE] text-[#B7791F] grid place-items-center shrink-0">
                <Percent className="w-7 h-7" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">{t('admin:commission.current')}</p>
                <p className="text-3xl font-extrabold text-[#0C261B] tabular-nums">{pct(toPercent(data.rate))}</p>
                <p className="text-xs text-gray-400">
                  {data.updatedAt
                    ? t('admin:commission.updatedBy', {
                        name: data.updatedBy ?? '—',
                        date: new Date(data.updatedAt).toLocaleDateString(dateLocale(lang), { day: '2-digit', month: 'long', year: 'numeric' }),
                      })
                    : t('admin:commission.defaultValue', { rate: pct(toPercent(data.defaultRate)) })}
                </p>
              </div>
            </div>

            <form onSubmit={(e) => void save(e)} className="space-y-4">
              <Input
                label={t('admin:commission.newRate')}
                type="number"
                inputMode="decimal"
                min={0}
                max={maxPercent}
                step={0.5}
                value={percent}
                onChange={(e) => {
                  setPercent(e.target.value);
                  setSaved(false);
                }}
                error={percent.trim() !== '' && !draftValid ? t('admin:commission.rangeError', { max: maxPercent }) : undefined}
                hint={t('admin:commission.rateHint', { max: maxPercent })}
              />
              <Textarea
                label={t('admin:commission.reason')}
                rows={2}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('admin:commission.reasonPlaceholder')}
              />
              <Alert tone="info">{t('admin:commission.futureOnly')}</Alert>
              {error && <Alert tone="error">{error}</Alert>}
              {saved && <Alert tone="success">{t('admin:commission.saved', { rate: pct(toPercent(data.rate)) })}</Alert>}
              <Button type="submit" disabled={!changed} isLoading={update.isPending}>
                <Save className="w-4 h-4" />
                {t('admin:commission.save')}
              </Button>
            </form>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-bold text-[#0C261B] mb-1">{t('admin:commission.simulator')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('admin:commission.simulatorHint')}</p>
            <Input
              label={t('admin:commission.saleAmount')}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />
            <div className="mt-5 h-3 rounded-full bg-[#E3F2E8] overflow-hidden flex" aria-hidden>
              <div className="bg-[#D49B37] h-full" style={{ width: `${Math.min(100, previewRate * 100)}%` }} />
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D49B37]" />
                  {t('admin:commission.kounouzShare', { rate: pct(previewRate * 100) })}
                </dt>
                <dd className="font-bold text-[#0C261B] tabular-nums">{formatTnd(kounouzShare, lang)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#17693F]" />
                  {t('admin:commission.producerShare')}
                </dt>
                <dd className="font-bold text-[#17693F] tabular-nums">{formatTnd(producerShare, lang)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {data && (
        <Card>
          <h2 className="font-bold text-[#0C261B] mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-[#B7791F]" />
            {t('admin:commission.history')}
          </h2>
          {data.history.length === 0 ? (
            <EmptyState title={t('admin:commission.noHistory')} />
          ) : (
            <ul className="divide-y divide-[#F1EBDF]">
              {data.history.map((h) => (
                <li key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0C261B] tabular-nums inline-flex items-center gap-2">
                      <span>{h.from !== null ? pct(toPercent(h.from)) : '—'}</span>
                      <ArrowRight className="w-4 h-4 text-[#B7791F] rtl:rotate-180" aria-hidden />
                      <span>{h.to !== null ? pct(toPercent(h.to)) : '—'}</span>
                    </p>
                    {h.reason && <p className="text-sm text-gray-500">{h.reason}</p>}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {new Date(h.at).toLocaleString(dateLocale(lang), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {h.by ? ` · ${h.by}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};
