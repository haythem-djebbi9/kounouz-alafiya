import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, BadgeCheck, FileSearch, FlaskConical, Inbox } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { useDecisionQueue, useLabQueue, useVerifierRequests, useVerifierSamples } from '../hooks';
import { REQUEST_STATUS_TONE, SAMPLE_STATUS_TONE } from '../status-map';
import { Breadcrumb, Btn, EmptyBlock, LoadingBlock, PageHeader, Panel, StatusPill } from '../ui';
import { dateLocale } from '../../../i18n';

/**
 * Point d'entrée du portail : ce qui attend une action aujourd'hui.
 *
 * Complémentaire du Centre de vérification, qui montre les volumes et les
 * tendances : ici on ne liste que le travail à prendre, file par file.
 */
export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const { user } = useAuth();

  const toReview = useVerifierRequests({ tab: 'UNDER_REVIEW', pageSize: 5, sort: 'OLDEST' });
  const toReceive = useVerifierSamples({ tab: 'COLLECTED', pageSize: 5, sort: 'OLDEST' });
  const issues = useVerifierSamples({ tab: 'ISSUES', pageSize: 5 });
  const labQueue = useLabQueue();
  const decisions = useDecisionQueue();

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '—';

  const inProgress = (labQueue.data ?? []).filter((item) => item.status === 'RECEIVED_AT_LAB');
  const issueCount = issues.data?.stats.counts.ISSUES ?? 0;

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:dashboard.title') }]} />
      <PageHeader
        title={t('verifier:dashboard.greeting', { name: user?.name ?? '' })}
        subtitle={t('verifier:dashboard.subtitle')}
        actions={
          <Link to="/verificateur/centre">
            <Btn variant="secondary">
              {t('verifier:dashboard.openCenter')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Btn>
          </Link>
        }
      />

      {issueCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#F3CFCF] bg-[#FDF2F2] px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#B42323] shrink-0" />
          <p className="text-sm text-[#B42323] font-semibold">
            {t('verifier:dashboard.issuesAlert', { count: issueCount })}
          </p>
          <Link
            to="/verificateur/echantillons"
            className="ms-auto text-xs font-bold text-[#B42323] hover:underline whitespace-nowrap"
          >
            {t('verifier:dashboard.inspect')} →
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Demandes à instruire */}
        <Panel
          title={t('verifier:dashboard.requestsToReview')}
          icon={<FileSearch className="w-4 h-4 text-[#D49B37]" />}
          actions={
            <Link to="/verificateur/demandes" className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37]">
              {t('verifier:center.viewAll')} →
            </Link>
          }
          bodyClassName="p-0"
        >
          {toReview.isLoading && <LoadingBlock label={t('common:status.loading')} />}
          {toReview.data?.items.length === 0 && (
            <EmptyBlock title={t('verifier:dashboard.nothingToReview')} />
          )}
          <ul className="divide-y divide-[#F1EDE3]">
            {(toReview.data?.items ?? []).map((request) => (
              <li key={request.id}>
                <Link
                  to={`/verificateur/demandes?selected=${request.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF6EE]/60"
                >
                  <span className="font-mono text-xs font-bold text-[#0C261B]">
                    {request.requestCode ?? '—'}
                  </span>
                  <span className="text-xs text-gray-600 truncate flex-1">{request.producer.name}</span>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {formatDate(request.submittedAt ?? request.createdAt)}
                  </span>
                  <StatusPill
                    tone={REQUEST_STATUS_TONE[request.status]}
                    label={t(`verifier:status.request.${request.status}`)}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Décisions en attente */}
        <Panel
          title={t('verifier:dashboard.decisionsPending')}
          icon={<BadgeCheck className="w-4 h-4 text-[#17693F]" />}
          actions={
            <Link to="/verificateur/decisions" className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37]">
              {t('verifier:center.viewAll')} →
            </Link>
          }
          bodyClassName="p-0"
        >
          {decisions.isLoading && <LoadingBlock label={t('common:status.loading')} />}
          {decisions.data?.length === 0 && <EmptyBlock title={t('verifier:dashboard.nothingToDecide')} />}
          <ul className="divide-y divide-[#F1EDE3]">
            {(decisions.data ?? []).slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  to="/verificateur/decisions"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF6EE]/60"
                >
                  <span className="font-mono text-xs font-bold text-[#0C261B]">{item.analysisCode}</span>
                  <span className="text-xs text-gray-600 truncate flex-1">
                    {item.sample.request.producer.name}
                  </span>
                  {item.draft && (
                    <span className="text-[11px] font-bold text-[#96661A] bg-[#FDF6E7] rounded-full px-2 py-0.5">
                      {t('verifier:decision.draft')}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {formatDate(item.completedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Échantillons à réceptionner */}
        <Panel
          title={t('verifier:dashboard.samplesToReceive')}
          icon={<Inbox className="w-4 h-4 text-[#3B7DD8]" />}
          actions={
            <Link
              to="/verificateur/echantillons"
              className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37]"
            >
              {t('verifier:center.viewAll')} →
            </Link>
          }
          bodyClassName="p-0"
        >
          {toReceive.isLoading && <LoadingBlock label={t('common:status.loading')} />}
          {toReceive.data?.items.length === 0 && (
            <EmptyBlock title={t('verifier:dashboard.nothingToReceive')} />
          )}
          <ul className="divide-y divide-[#F1EDE3]">
            {(toReceive.data?.items ?? []).map((sample) => (
              <li key={sample.id}>
                <Link
                  to={`/verificateur/echantillons?selected=${sample.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF6EE]/60"
                >
                  <span className="font-mono text-xs font-bold text-[#0C261B]">
                    {sample.sampleCode ?? '—'}
                  </span>
                  <span className="text-xs text-gray-600 truncate flex-1">
                    {sample.request.producer.name}
                  </span>
                  <StatusPill
                    tone={SAMPLE_STATUS_TONE[sample.status]}
                    label={t(`verifier:status.sample.${sample.status}`)}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Analyses en cours */}
        <Panel
          title={t('verifier:dashboard.labInProgress')}
          icon={<FlaskConical className="w-4 h-4 text-[#7C5BD1]" />}
          actions={
            <Link
              to="/verificateur/laboratoire"
              className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37]"
            >
              {t('verifier:center.viewAll')} →
            </Link>
          }
          bodyClassName="p-0"
        >
          {labQueue.isLoading && <LoadingBlock label={t('common:status.loading')} />}
          {inProgress.length === 0 && <EmptyBlock title={t('verifier:dashboard.nothingInLab')} />}
          <ul className="divide-y divide-[#F1EDE3]">
            {inProgress.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link
                  to={`/verificateur/laboratoire?sample=${item.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF6EE]/60"
                >
                  <span className="font-mono text-xs font-bold text-[#0C261B]">
                    {item.sampleCode ?? '—'}
                  </span>
                  <span className="text-xs text-gray-600 truncate flex-1">{item.request.honeyType}</span>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {item.labAnalyses[0]?.analysisCode ?? t('verifier:dashboard.notOpened')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
};
