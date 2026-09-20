import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  Database,
  FlaskConical,
  Headphones,
  Info,
  Package,
  QrCode,
  ShieldCheck,
  ShieldX,
  TestTube,
  Users,
  UserCheck,
  UsersRound,
  Library,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../../../../lib/auth-context';
import { useAdminDashboard, type DashboardAlert, type ScanScope } from '../api';
import {
  Button,
  Card,
  Delta,
  ErrorState,
  LinkAction,
  LoadingState,
  PageTitle,
  ProductThumb,
  ProgressBar,
  Select,
  STATUS_COLOR,
  StatTile,
  TONE_CLASSES,
} from '../ui';
import { BarChart, DonutChart, RankBars } from '../charts';
import { BubbleMap, GOVERNORATE_CENTERS } from '../maps';
import { ACTION_TYPE_STYLE, describeAction } from '../labels';
import { formatBucket, formatBytes, formatDate, formatNumber, formatPercent, formatRelative, governorateName } from '../format';

export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation(['console', 'common']);
  const lang = i18n.language;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [months, setMonths] = useState(9);
  const [scope, setScope] = useState<ScanScope>('ALL');
  const { data, isLoading, isError, refetch } = useAdminDashboard(months, scope);

  const vsLastMonth = t('shared.vsLastMonth');

  return (
    <div className="space-y-5">
      <PageTitle
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle', { name: user?.name ?? '' })}
        actions={
          <span className="inline-flex items-center gap-2 bg-white border border-[#E4DED2] rounded-xl px-3 min-h-[40px] text-sm font-semibold text-[#0C261B]">
            <CalendarDays className="w-4 h-4 text-[#17693F]" />
            {formatDate(new Date(), lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        }
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
            <StatTile icon={<Users className="w-5 h-5" />} label={t('dashboard.kpi.producers')} value={formatNumber(data.kpis.producers.total, lang)} footer={<Delta value={data.kpis.producers.delta} label={vsLastMonth} />} onClick={() => navigate('/admin/producteurs')} />
            <StatTile icon={<FlaskConical className="w-5 h-5" />} tone="blue" label={t('dashboard.kpi.laboratories')} value={formatNumber(data.kpis.laboratories.total, lang)} footer={<Delta value={data.kpis.laboratories.delta} label={vsLastMonth} />} onClick={() => navigate('/admin/laboratoires')} />
            <StatTile icon={<Package className="w-5 h-5" />} tone="gold" label={t('dashboard.kpi.products')} value={formatNumber(data.kpis.products.total, lang)} footer={<Delta value={data.kpis.products.delta} label={vsLastMonth} />} onClick={() => navigate('/admin/produits')} />
            <StatTile icon={<Boxes className="w-5 h-5" />} tone="violet" label={t('dashboard.kpi.batches')} value={formatNumber(data.kpis.batches.total, lang)} footer={<Delta value={data.kpis.batches.delta} label={vsLastMonth} />} onClick={() => navigate('/admin/lots')} />
            <StatTile icon={<QrCode className="w-5 h-5" />} tone="neutral" label={t('dashboard.kpi.qrCodes')} value={formatNumber(data.kpis.qrCodes.total, lang)} footer={<Delta value={data.kpis.qrCodes.delta} label={vsLastMonth} />} onClick={() => navigate('/admin/qr-codes')} />
            <StatTile
              icon={<ShieldCheck className="w-5 h-5" />}
              label={t('dashboard.kpi.verifiedBatches')}
              value={formatNumber(data.kpis.verifiedBatches.total, lang)}
              footer={
                <span className="flex items-center gap-2">
                  <ProgressBar value={data.kpis.verifiedBatches.share} className="flex-1" />
                  <span className="text-xs font-bold text-[#17693F] tabular-nums">{formatPercent(data.kpis.verifiedBatches.share, lang, 0)}</span>
                </span>
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              title={t('dashboard.scansOverTime')}
              actions={
                <Select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-40" label={t('dashboard.scansOverTime')}>
                  {[6, 9, 12].map((m) => (
                    <option key={m} value={m}>
                      {t('dashboard.lastMonths', { months: m })}
                    </option>
                  ))}
                </Select>
              }
            >
              <BarChart
                labels={data.scansOverTime.map((p) => formatBucket(p.month, 'month', lang))}
                tooltipTitles={data.scansOverTime.map((p) => formatDate(`${p.month}-01`, lang, { month: 'long', year: 'numeric' }))}
                values={data.scansOverTime.map((p) => p.total)}
                color={STATUS_COLOR.good}
                label={t('dashboard.scans')}
                highlightLast
                height={230}
                emptyLabel={t('states.noData')}
              />
            </Card>

            <Card title={t('dashboard.verificationStatus')}>
              <div className="pt-2">
                <DonutChart
                  slices={data.verificationStatus.items.map((item) => ({
                    key: item.key,
                    label: t(`dashboard.qrStatus.${item.key}`),
                    value: item.count,
                    color: item.key === 'VERIFIED' ? STATUS_COLOR.good : item.key === 'PENDING' ? STATUS_COLOR.warning : STATUS_COLOR.critical,
                  }))}
                  centerValue={formatNumber(data.verificationStatus.total, lang)}
                  centerLabel={t('dashboard.qrCodesLabel')}
                  emptyLabel={t('states.noData')}
                />
              </div>
            </Card>

            <Card title={t('dashboard.recentActivities')} actions={<LinkAction onClick={() => navigate('/admin/journal')}>{t('actions.viewAll')}</LinkAction>} bodyClassName="px-4 pb-3 pt-2">
              {data.recentActivities.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">{t('states.noData')}</p>
              ) : (
                <ul className="divide-y divide-[#F3EEE4]">
                  {data.recentActivities.map((log) => {
                    const style = ACTION_TYPE_STYLE[log.actionType ?? 'UPDATE'];
                    return (
                      <li key={log.id} className="flex items-start gap-3 py-2.5">
                        <span className={`w-8 h-8 rounded-lg grid place-items-center border shrink-0 ${TONE_CLASSES[style.tone]}`}>
                          <style.icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#0C261B] truncate">{describeAction(t, log)}</p>
                          <p className="text-xs text-[#6B7A71] truncate">{log.details ?? log.user?.name ?? t('shared.system')}</p>
                        </div>
                        <span className="text-[11px] text-[#7C8A82] whitespace-nowrap">{formatRelative(log.createdAt, lang)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              title={t('dashboard.scanLocations')}
              actions={
                <Select value={scope} onChange={(e) => setScope(e.target.value as ScanScope)} className="w-40" label={t('dashboard.scanLocations')}>
                  <option value="ALL">{t('dashboard.scope.ALL')}</option>
                  <option value="VALID">{t('dashboard.scope.VALID')}</option>
                  <option value="SUSPICIOUS">{t('dashboard.scope.SUSPICIOUS')}</option>
                </Select>
              }
            >
              <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-4 items-start">
                <BubbleMap
                  view="tunisia"
                  height={250}
                  ariaLabel={t('dashboard.scanLocations')}
                  bubbles={data.scanLocations.regions
                    .filter((r) => GOVERNORATE_CENTERS[r.governorate])
                    .map((r) => ({
                      key: r.governorate,
                      lat: GOVERNORATE_CENTERS[r.governorate][0],
                      lng: GOVERNORATE_CENTERS[r.governorate][1],
                      value: r.count,
                      color: STATUS_COLOR.good,
                      tooltip: `${governorateName(r.governorate, lang)} · ${formatNumber(r.count, lang)}`,
                    }))}
                />
                <div>
                  <p className="text-xs font-bold text-[#0C261B] mb-2">{t('dashboard.topRegions')}</p>
                  <RegionShares regions={data.scanLocations.regions} />
                </div>
              </div>
            </Card>

            <Card title={t('dashboard.topProducts')} actions={<LinkAction onClick={() => navigate('/admin/analyses/scans')}>{t('actions.viewAll')}</LinkAction>}>
              <RankBars
                emptyLabel={t('states.noData')}
                rows={data.topProducts.map((product, index) => ({
                  key: product.id,
                  label: (
                    <Link to={`/admin/produits/${product.id}`} className="hover:underline">
                      {product.nom}
                    </Link>
                  ),
                  value: product.count,
                  leading: (
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="w-4 text-xs font-bold text-[#7C8A82] tabular-nums">{index + 1}</span>
                      <ProductThumb src={product.image} size={34} />
                    </span>
                  ),
                }))}
              />
            </Card>

            <Card title={t('dashboard.alerts')} actions={<LinkAction onClick={() => navigate('/admin/analyses/alertes')}>{t('actions.viewAll')}</LinkAction>} bodyClassName="px-4 pb-3 pt-2">
              {data.alerts.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">{t('dashboard.noAlerts')}</p>
              ) : (
                <ul className="divide-y divide-[#F3EEE4]">
                  {data.alerts.map((alert) => (
                    <AlertItem key={`${alert.kind}-${alert.id}`} alert={alert} />
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr_0.9fr]">
            <div className="relative rounded-2xl overflow-hidden min-h-[180px] bg-[#0C261B]">
              <img src="/images/beekeeper.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-left" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0C261B]/30 to-[#0C261B]/85 rtl:bg-gradient-to-l" />
              <div className="relative h-full flex items-center justify-end p-6">
                <p className="font-['Playfair_Display',serif] italic text-white text-xl leading-snug text-end max-w-[60%]">
                  {t('dashboard.bannerLine1')}
                  <br />
                  {t('dashboard.bannerLine2')}
                </p>
              </div>
            </div>

            <Card title={t('dashboard.systemOverview')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <SystemRow icon={<UsersRound className="w-4 h-4" />} label={t('dashboard.system.users')} value={formatNumber(data.system.users, lang)} />
                <SystemRow icon={<TestTube className="w-4 h-4" />} label={t('dashboard.system.samples')} value={formatNumber(data.system.samples, lang)} />
                <SystemRow icon={<UserCheck className="w-4 h-4" />} label={t('dashboard.system.activeUsers')} value={formatNumber(data.system.activeUsers, lang)} />
                <SystemRow icon={<FlaskConical className="w-4 h-4" />} label={t('dashboard.system.labResults')} value={formatNumber(data.system.labResults, lang)} />
                <SystemRow icon={<Users className="w-4 h-4" />} label={t('dashboard.system.producers')} value={formatNumber(data.system.producers, lang)} />
                <SystemRow icon={<Library className="w-4 h-4" />} label={t('dashboard.system.referenceSamples')} value={formatNumber(data.system.referenceSamples, lang)} />
                <SystemRow icon={<BadgeCheck className="w-4 h-4" />} label={t('dashboard.system.verificationTeam')} value={formatNumber(data.system.verificationTeam, lang)} />
                <SystemRow
                  icon={<Database className="w-4 h-4" />}
                  label={t('dashboard.system.storage')}
                  value={formatBytes(data.system.storage.bytes, lang)}
                  hint={t('dashboard.system.files', { files: formatNumber(data.system.storage.files, lang) })}
                />
              </div>
            </Card>

            <Card>
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-2">
                <span className="w-14 h-14 rounded-full bg-[#E3F2E8] text-[#17693F] grid place-items-center">
                  <Headphones className="w-7 h-7" />
                </span>
                <div>
                  <p className="font-bold text-[#0C261B]">{t('dashboard.support.title')}</p>
                  <p className="text-xs text-[#6B7A71] mt-0.5">{t('dashboard.support.subtitle')}</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/admin/support')}>
                  {t('dashboard.support.action')}
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

const RegionShares: React.FC<{ regions: { governorate: string; count: number; share: number }[] }> = ({ regions }) => {
  const { t, i18n } = useTranslation('console');
  if (regions.length === 0) return <p className="text-sm text-gray-400">{t('states.noData')}</p>;
  const top = regions.slice(0, 5);
  const others = regions.slice(5).reduce((sum, r) => sum + r.share, 0);
  const rows = others > 0 ? [...top.map((r) => ({ key: r.governorate, label: governorateName(r.governorate, i18n.language), share: r.share })), { key: 'others', label: t('shared.others'), share: Math.round(others * 10) / 10 }] : top.map((r) => ({ key: r.governorate, label: governorateName(r.governorate, i18n.language), share: r.share }));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-2 text-[13px]">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.key === 'others' ? '#9AA69F' : STATUS_COLOR.good }} />
          <span className="flex-1 truncate text-[#1F2A24]">{row.label}</span>
          <span className="font-bold text-[#0C261B] tabular-nums">{formatPercent(row.share, i18n.language, 0)}</span>
        </li>
      ))}
    </ul>
  );
};

const SystemRow: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string }> = ({ icon, label, value, hint }) => (
  <div className="flex items-center gap-3 py-2 border-b border-[#F3EEE4] last:border-0">
    <span className="w-8 h-8 rounded-lg bg-[#F4F1EA] text-[#17693F] grid place-items-center shrink-0">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] text-[#3F4A44] truncate">{label}</span>
      {hint && <span className="block text-[11px] text-[#9AA69F] truncate">{hint}</span>}
    </span>
    <span className="text-sm font-bold text-[#0C261B] tabular-nums">{value}</span>
  </div>
);

const AlertItem: React.FC<{ alert: DashboardAlert }> = ({ alert }) => {
  const { t, i18n } = useTranslation('console');
  const navigate = useNavigate();
  const lang = i18n.language;

  const config = (() => {
    switch (alert.kind) {
      case 'COUNTERFEIT':
        return {
          icon: <ShieldX className="w-4 h-4" />,
          tone: alert.severity === 'HIGH' ? 'red' : 'amber',
          title: t(`enums.alertType.${alert.type}`),
          subtitle: t('dashboard.alertItems.counterfeit', { code: alert.code, n: formatNumber(alert.count, lang) }),
          to: `/admin/analyses/alertes?alert=${alert.id}`,
        } as const;
      case 'BATCH_HOLD':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          tone: 'amber',
          title: t(`dashboard.alertItems.batch.${alert.status === 'RECALLED' ? 'RECALLED' : 'SUSPENDED'}`),
          subtitle: alert.code,
          to: `/verificateur/lots/${alert.id}`,
        } as const;
      case 'LAB_PENDING':
        return {
          icon: <Info className="w-4 h-4" />,
          tone: 'blue',
          title: t('dashboard.alertItems.labPending'),
          subtitle: alert.code ?? '—',
          to: '/admin/laboratoire',
        } as const;
      case 'INVALID_SCANS':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          tone: 'red',
          title: t('dashboard.alertItems.invalidScans'),
          subtitle: t('dashboard.alertItems.invalidScansDetail', { n: formatNumber(alert.count, lang) }),
          to: '/admin/analyses/alertes',
        } as const;
    }
  })();

  return (
    <li>
      <button onClick={() => navigate(config.to)} className="w-full flex items-start gap-3 py-2.5 text-start hover:bg-[#FBF9F4] rounded-lg px-1">
        <span className={`w-8 h-8 rounded-full grid place-items-center border shrink-0 ${TONE_CLASSES[config.tone]}`}>{config.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[#0C261B] truncate">{config.title}</span>
          <span className="block text-xs text-[#6B7A71] truncate">{config.subtitle}</span>
        </span>
        <span className="text-[11px] text-[#7C8A82] whitespace-nowrap">{formatRelative(alert.at, lang)}</span>
      </button>
    </li>
  );
};
