import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, FileText, FlaskConical, Timer, XCircle } from 'lucide-react';
import { DonutChart } from '../../producer/charts';
import { useVerifierDashboard } from '../hooks';
import { FAMILY_COLORS, NEXT_STEP_KEY, REQUEST_STATUS_TONE } from '../status-map';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  KpiCard,
  LineChart,
  LoadingBlock,
  PageHeader,
  Panel,
  RegionBreakdown,
  StatusPill,
  Table,
  Td,
  Th,
} from '../ui';
import { dateLocale } from '../../../i18n';
import type { StatusFamily } from '../types';

const FAMILIES: StatusFamily[] = ['UNDER_REVIEW', 'IN_LABORATORY', 'VERIFIED', 'REJECTED'];

export const VerificationCenterPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useVerifierDashboard(months);

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatMonth = (month: string) => {
    const [year, m] = month.split('-').map(Number);
    return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'short' });
  };

  return (
    <div>
      <Breadcrumb
        items={[{ label: t('verifier:brand.role') }, { label: t('verifier:center.title') }]}
      />
      <PageHeader
        title={t('verifier:center.title')}
        subtitle={t('verifier:center.subtitle')}
        actions={
          <Link to="/verificateur/demandes">
            <Btn>
              <FileText className="w-4 h-4" />
              {t('verifier:center.reviewRequests')}
            </Btn>
          </Link>
        }
      />

      {isLoading && <LoadingBlock label={t('common:status.loading')} />}

      {data && (
        <div className="space-y-5">
          {/* Indicateurs */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label={t('verifier:kpi.total')}
              value={data.kpis.TOTAL.total}
              icon={<FileText className="w-4 h-4" />}
              tone="neutral"
              delta={data.kpis.TOTAL.delta}
              deltaLabel={t('verifier:kpi.vsLastMonth')}
              noDeltaLabel={t('verifier:kpi.noComparison')}
            />
            <KpiCard
              label={t('verifier:status.family.UNDER_REVIEW')}
              value={data.kpis.UNDER_REVIEW.total}
              icon={<Timer className="w-4 h-4" />}
              tone="amber"
              delta={data.kpis.UNDER_REVIEW.delta}
              deltaLabel={t('verifier:kpi.vsLastMonth')}
              noDeltaLabel={t('verifier:kpi.noComparison')}
            />
            <KpiCard
              label={t('verifier:status.family.IN_LABORATORY')}
              value={data.kpis.IN_LABORATORY.total}
              icon={<FlaskConical className="w-4 h-4" />}
              tone="blue"
              delta={data.kpis.IN_LABORATORY.delta}
              deltaLabel={t('verifier:kpi.vsLastMonth')}
              noDeltaLabel={t('verifier:kpi.noComparison')}
            />
            <KpiCard
              label={t('verifier:status.family.VERIFIED')}
              value={data.kpis.VERIFIED.total}
              icon={<BadgeCheck className="w-4 h-4" />}
              tone="green"
              delta={data.kpis.VERIFIED.delta}
              deltaLabel={t('verifier:kpi.vsLastMonth')}
              noDeltaLabel={t('verifier:kpi.noComparison')}
            />
            <KpiCard
              label={t('verifier:status.family.REJECTED')}
              value={data.kpis.REJECTED.total}
              icon={<XCircle className="w-4 h-4" />}
              tone="red"
              delta={data.kpis.REJECTED.delta}
              deltaLabel={t('verifier:kpi.vsLastMonth')}
              noDeltaLabel={t('verifier:kpi.noComparison')}
            />
          </div>

          {/* Graphiques */}
          <div className="grid gap-4 lg:grid-cols-12">
            <Panel
              className="lg:col-span-6"
              title={t('verifier:center.trend')}
              actions={
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="text-xs rounded-lg border border-[#EAE1D2] px-2 py-1 bg-white text-[#0C261B] focus:outline-none focus:border-[#D49B37]"
                >
                  {[3, 6, 12].map((value) => (
                    <option key={value} value={value}>
                      {t('verifier:center.lastMonths', { count: value })}
                    </option>
                  ))}
                </select>
              }
            >
              <LineChart
                labels={data.trend.map((point) => formatMonth(point.month))}
                series={FAMILIES.map((family) => ({
                  key: family,
                  label: t(`verifier:status.family.${family}`),
                  color: FAMILY_COLORS[family],
                  values: data.trend.map((point) => point[family]),
                }))}
                emptyLabel={t('verifier:center.noData')}
              />
            </Panel>

            <Panel className="lg:col-span-3" title={t('verifier:center.byStatus')}>
              <DonutChart
                data={data.byStatus.items.map((item) => ({
                  label: t(`verifier:status.family.${item.key}`),
                  value: item.count,
                  color: FAMILY_COLORS[item.key],
                }))}
                centerValue={String(data.byStatus.total)}
                centerLabel={t('verifier:center.requests')}
                formatValue={(value) => String(value)}
                formatPercent={(ratio) => `${Math.round(ratio * 100)}%`}
                emptyLabel={t('verifier:center.noData')}
                layout="stacked"
                size={150}
              />
            </Panel>

            <Panel className="lg:col-span-3" title={t('verifier:center.byRegion')}>
              <RegionBreakdown rows={data.byRegion} emptyLabel={t('verifier:center.noData')} />
            </Panel>
          </div>

          {/* Dossiers récents */}
          <Panel
            title={t('verifier:center.recent')}
            bodyClassName="p-0"
            actions={
              <Link
                to="/verificateur/demandes"
                className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37]"
              >
                {t('verifier:center.viewAll')} →
              </Link>
            }
          >
            <Table>
              <thead>
                <tr>
                  <Th>{t('verifier:table.requestId')}</Th>
                  <Th>{t('verifier:table.date')}</Th>
                  <Th>{t('verifier:table.producer')}</Th>
                  <Th>{t('verifier:table.location')}</Th>
                  <Th>{t('verifier:table.honeyType')}</Th>
                  <Th>{t('verifier:table.batchNumber')}</Th>
                  <Th>{t('verifier:table.status')}</Th>
                  <Th>{t('verifier:table.nextStep')}</Th>
                  <Th className="text-end">{t('verifier:table.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <EmptyBlock title={t('verifier:center.noRequests')} />
                    </td>
                  </tr>
                )}
                {data.recent.map((request) => (
                  <tr key={request.id} className="hover:bg-[#FAF6EE]/60">
                    <Td className="font-mono text-xs font-bold text-[#0C261B]">
                      {request.requestCode ?? '—'}
                    </Td>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(request.submittedAt ?? request.createdAt)}
                    </Td>
                    <Td className="text-[#0C261B]">{request.producer.name}</Td>
                    <Td className="text-gray-600 text-xs">
                      {request.governorate ?? request.collectionLocation ?? '—'}
                    </Td>
                    <Td className="text-gray-600 text-xs">{request.honeyType}</Td>
                    <Td className="font-mono text-xs text-gray-600">{request.batchNumber ?? '—'}</Td>
                    <Td>
                      <StatusPill
                        tone={REQUEST_STATUS_TONE[request.status]}
                        label={t(`verifier:status.request.${request.status}`)}
                      />
                    </Td>
                    <Td className="text-xs text-gray-500">
                      {NEXT_STEP_KEY[request.status] === 'none'
                        ? '—'
                        : t(`verifier:nextStep.${NEXT_STEP_KEY[request.status]}`)}
                    </Td>
                    <Td className="text-end">
                      <Link
                        to={`/verificateur/demandes?selected=${request.id}`}
                        className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37]"
                      >
                        {t('common:actions.view')}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        </div>
      )}
    </div>
  );
};
