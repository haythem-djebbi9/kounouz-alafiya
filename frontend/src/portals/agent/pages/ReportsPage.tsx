import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BarChart3, CalendarCheck, CheckCircle2, FlaskConical, Scale, ShieldCheck, Timer, Printer } from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { Btn, InlineError, KpiCard, LineChart, LoadingBlock, PageHeader, SelectInput } from '../../verifier/ui';
import { useAgentReports } from '../hooks';
import { SectionCard } from '../ui';

const PERIODS = [1, 3, 6, 12];

/** Bilan d'activité de l'agent sur la période choisie. */
export const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const [months, setMonths] = useState(6);
  const { data, isLoading, isError } = useAgentReports(months);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <>
            <SelectInput value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-44" aria-label={t('reports.period')}>
              {PERIODS.map((m) => (
                <option key={m} value={m}>
                  {t('reports.lastMonths', { count: m })}
                </option>
              ))}
            </SelectInput>
            <Btn variant="secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              {t('reports.print')}
            </Btn>
          </>
        }
      />

      {isLoading && <LoadingBlock label={t('common.loading')} />}
      {isError && <InlineError message={t('common.loadError')} />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label={t('reports.kpis.assignments')} value={data.totals.assignments} icon={<CalendarCheck className="w-4 h-4" />} tone="blue" />
            <KpiCard label={t('reports.kpis.completed')} value={data.totals.completed} icon={<CheckCircle2 className="w-4 h-4" />} tone="green" />
            <KpiCard label={t('reports.kpis.samples')} value={data.totals.samples} icon={<FlaskConical className="w-4 h-4" />} tone="amber" />
            <KpiCard label={t('reports.kpis.sealed')} value={data.totals.sealed} icon={<ShieldCheck className="w-4 h-4" />} tone="violet" />
            <KpiCard
              label={t('reports.kpis.onTimeRate')}
              value={data.totals.onTimeRate !== null ? `${data.totals.onTimeRate}%` : '—'}
              icon={<CheckCircle2 className="w-4 h-4" />}
              tone="green"
              hint={t('reports.kpis.onTimeHint')}
            />
            <KpiCard
              label={t('reports.kpis.averageDuration')}
              value={data.totals.averageDurationMinutes !== null ? `${data.totals.averageDurationMinutes} min` : '—'}
              icon={<Timer className="w-4 h-4" />}
            />
            <KpiCard label={t('reports.kpis.quantity')} value={`${data.totals.quantityKg} kg`} icon={<Scale className="w-4 h-4" />} />
            <KpiCard
              label={t('reports.kpis.issues')}
              value={data.totals.issues}
              icon={<AlertTriangle className="w-4 h-4" />}
              tone={data.totals.issues > 0 ? 'red' : 'neutral'}
              hint={t('reports.kpis.rescheduled', { count: data.totals.rescheduled })}
            />
          </div>

          <SectionCard title={t('reports.monthly')} icon={<BarChart3 className="w-5 h-5" />}>
            <LineChart
              labels={data.monthly.map((m) => {
                const [y, mo] = m.month.split('-').map(Number);
                return new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
              })}
              series={[
                { key: 'assignments', label: t('reports.series.assignments'), color: '#3B7DD8', values: data.monthly.map((m) => m.assignments) },
                { key: 'completed', label: t('reports.series.completed'), color: '#17693F', values: data.monthly.map((m) => m.completed) },
                { key: 'samples', label: t('reports.series.samples'), color: '#D49B37', values: data.monthly.map((m) => m.samples) },
              ]}
              emptyLabel={t('reports.empty')}
            />
          </SectionCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Breakdown title={t('reports.byHoneyType')} rows={data.byHoneyType} />
            <Breakdown
              title={t('reports.bySampleStatus')}
              rows={data.bySampleStatus.map((r) => ({ ...r, label: t(`sampleStatus.${r.label}`, { defaultValue: r.label }) }))}
            />
            <Breakdown title={t('reports.byRegion')} rows={data.byRegion} />
          </div>
        </>
      )}
    </div>
  );
};

const Breakdown: React.FC<{ title: string; rows: { label: string; count: number }[] }> = ({ title, rows }) => {
  const { t } = useTranslation('agent');
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{t('reports.empty')}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.slice(0, 8).map((row) => (
            <li key={row.label}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-[#0C261B] truncate">{row.label}</span>
                <span className="font-bold tabular-nums text-[#0C261B]">{row.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F1EDE3] mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-[#17693F]" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
};
