import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, TestTube, FlaskConical, Archive, BadgeCheck, XCircle, PackageCheck } from 'lucide-react';
import { useOperationsSummary } from '../hooks/useReports';
import { useLabAnalyses, useReferenceSamples } from '../hooks/useLaboratory';
import { Card } from '../../../design-system';
import { useAuth } from '../../../lib/auth-context';

const KpiTile: React.FC<{ icon: React.ReactNode; label: string; value: number | string; tone?: string }> = ({
  icon,
  label,
  value,
  tone = 'text-[#0C261B]',
}) => (
  <Card className="flex items-center gap-3">
    <div className={`w-11 h-11 rounded-lg bg-[#FAF6EE] flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-[#0C261B] leading-tight">{value}</p>
      <p className="text-xs text-gray-500 truncate">{label}</p>
    </div>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { user } = useAuth();
  const { data: summary, isLoading } = useOperationsSummary();
  const { data: analyses } = useLabAnalyses();
  const { data: referenceSamples } = useReferenceSamples();

  if (isLoading || !summary) {
    return <p className="text-sm text-gray-400">{t('common:status.loading')}</p>;
  }

  const pendingRequests = summary.requestsByStatus.NEW + summary.requestsByStatus.IN_REVIEW;
  const samplesInPipeline =
    summary.samplesByStatus.COLLECTED +
    summary.samplesByStatus.SEALED +
    summary.samplesByStatus.IN_TRANSIT +
    summary.samplesByStatus.RECEIVED_AT_LAB;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">{t('admin:dashboard.greeting', { name: user?.name })}</h1>
      <p className="text-gray-500 mb-6">{t('admin:dashboard.subtitle')}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiTile icon={<FileText className="w-5 h-5" />} label={t('admin:dashboard.kpi.pendingRequests')} value={pendingRequests} />
        <KpiTile icon={<TestTube className="w-5 h-5" />} label={t('admin:dashboard.kpi.samplesInPipeline')} value={samplesInPipeline} />
        <KpiTile icon={<FlaskConical className="w-5 h-5" />} label={t('admin:dashboard.kpi.labResults')} value={analyses?.length ?? 0} />
        <KpiTile icon={<Archive className="w-5 h-5" />} label={t('admin:dashboard.kpi.referenceSamples')} value={referenceSamples?.length ?? 0} />
        <KpiTile
          icon={<BadgeCheck className="w-5 h-5" />}
          label={t('admin:dashboard.kpi.verified')}
          value={summary.verificationsByStatus.VERIFIED}
          tone="text-emerald-600"
        />
        <KpiTile
          icon={<XCircle className="w-5 h-5" />}
          label={t('admin:dashboard.kpi.notVerified')}
          value={summary.verificationsByStatus.NOT_VERIFIED}
          tone="text-rose-600"
        />
        <KpiTile icon={<PackageCheck className="w-5 h-5" />} label={t('admin:dashboard.kpi.readyForPackaging')} value={summary.batchesByStatus.CREATED} />
        <KpiTile
          icon={<BadgeCheck className="w-5 h-5" />}
          label={t('admin:dashboard.kpi.verificationRate')}
          value={`${Math.round(summary.verificationRate * 100)}%`}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-1">{t('admin:dashboard.totals.producers')}</p>
          <p className="text-xl font-bold text-[#0C261B]">{summary.totals.producers}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">{t('admin:dashboard.totals.verifiedProducers')}</p>
          <p className="text-xl font-bold text-[#0C261B]">{summary.totals.verifiedProducers}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">{t('admin:dashboard.totals.publishedProducts')}</p>
          <p className="text-xl font-bold text-[#0C261B]">{summary.totals.publishedProducts}</p>
        </Card>
      </div>
    </div>
  );
};
