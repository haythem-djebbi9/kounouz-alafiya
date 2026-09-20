import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CheckCircle2, ChevronLeft, FlaskConical, Save, ShieldAlert, XCircle } from 'lucide-react';
import {
  useConfirmDecision,
  useDecision,
  useDecisionQueue,
  useOpenDecision,
  useSaveDecisionDraft,
} from '../hooks';
import { LAB_ANALYSIS_TONE, LAB_TEST_TONE, VERIFICATION_TONE } from '../status-map';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  Field,
  InlineError,
  LoadingBlock,
  PageHeader,
  Panel,
  StatusPill,
  Stepper,
  Table,
  Tabs,
  Td,
  TextArea,
  Th,
} from '../ui';
import { EvidencePanel } from '../EvidencePanel';
import { AssistantPanel } from '../../../components/AssistantPanel';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type {
  DecisionEvaluation,
  DecisionOutcome,
  EvaluationCriterion,
  EvaluationVerdict,
  PortalDecisionDetail,
} from '../types';

type DecisionTab = 'results' | 'evaluation' | 'decision' | 'notes' | 'history';

const CRITERIA: EvaluationCriterion[] = [
  'authenticity',
  'physicochemical',
  'pollen',
  'antibiotics',
  'overall',
];

// Verdicts proposés par critère : chacun a son vocabulaire métier (une analyse
// pollinique se « confirme », un paramètre physico-chimique est « conforme »).
const VERDICT_OPTIONS: Record<EvaluationCriterion, EvaluationVerdict[]> = {
  authenticity: ['VALID', 'FAILED', 'PENDING'],
  physicochemical: ['COMPLIANT', 'FAILED', 'PENDING'],
  pollen: ['CONFIRMED', 'FAILED', 'PENDING'],
  antibiotics: ['COMPLIANT', 'FAILED', 'PENDING'],
  overall: ['APPROVED', 'FAILED', 'PENDING'],
};

const VERDICT_TONE: Record<EvaluationVerdict, 'green' | 'red' | 'amber'> = {
  VALID: 'green',
  COMPLIANT: 'green',
  CONFIRMED: 'green',
  APPROVED: 'green',
  FAILED: 'red',
  PENDING: 'amber',
};

export const VerificationDecisionPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();
  const [decisionId, setDecisionId] = useState<string | null>(params.get('decision'));

  const queue = useDecisionQueue();
  const detail = useDecision(decisionId ?? undefined);
  const openDecision = useOpenDecision();

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const open = async (analysisId: string) => {
    const result = await openDecision.mutateAsync(analysisId);
    setDecisionId(result.id);
    setParams({ decision: result.id }, { replace: true });
  };

  const back = () => {
    setDecisionId(null);
    setParams({}, { replace: true });
  };

  // Vue file d'attente tant qu'aucun dossier n'est ouvert.
  if (!decisionId) {
    return (
      <div>
        <Breadcrumb
          items={[{ label: t('verifier:brand.role') }, { label: t('verifier:decision.title') }]}
        />
        <PageHeader title={t('verifier:decision.title')} subtitle={t('verifier:decision.queueSubtitle')} />

        <Panel bodyClassName="p-0">
          {queue.isLoading && <LoadingBlock label={t('common:status.loading')} />}
          {queue.data?.length === 0 && (
            <EmptyBlock
              title={t('verifier:decision.queueEmpty')}
              description={t('verifier:decision.queueEmptyHint')}
              icon={<BadgeCheck className="w-8 h-8" />}
            />
          )}
          {queue.data && queue.data.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>{t('verifier:fields.analysisCode')}</Th>
                  <Th>{t('verifier:table.sampleId')}</Th>
                  <Th>{t('verifier:table.producer')}</Th>
                  <Th>{t('verifier:table.honeyType')}</Th>
                  <Th>{t('verifier:table.completedAt')}</Th>
                  <Th>{t('verifier:table.conclusion')}</Th>
                  <Th className="text-end">{t('verifier:table.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {queue.data.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF6EE]/60">
                    <Td className="font-mono text-xs font-bold text-[#0C261B]">{item.analysisCode}</Td>
                    <Td className="font-mono text-xs text-gray-600">{item.sample.sampleCode ?? '—'}</Td>
                    <Td className="text-xs text-[#0C261B]">{item.sample.request.producer.name}</Td>
                    <Td className="text-xs text-gray-600">{item.sample.request.honeyType}</Td>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(item.completedAt)}
                    </Td>
                    <Td>
                      <StatusPill
                        tone={LAB_ANALYSIS_TONE[item.status]}
                        label={t(`verifier:status.analysis.${item.status}`)}
                      />
                    </Td>
                    <Td className="text-end">
                      <Btn size="sm" variant="secondary" onClick={() => void open(item.id)}>
                        {item.draft ? t('verifier:decision.resumeDraft') : t('verifier:decision.review')}
                      </Btn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t('verifier:brand.role') },
          { label: t('verifier:decision.title'), to: '/verificateur/decisions' },
          { label: detail.data?.verificationCode ?? '…' },
        ]}
      />
      <PageHeader
        title={t('verifier:decision.title')}
        subtitle={t('verifier:decision.subtitle')}
        actions={
          <Btn variant="ghost" onClick={back}>
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            {t('verifier:decision.backToQueue')}
          </Btn>
        }
      />

      {detail.isLoading && <LoadingBlock label={t('common:status.loading')} />}
      {detail.data && <DecisionWorkbench key={detail.data.id} decision={detail.data} onDone={back} />}
    </div>
  );
};

// --- Poste de décision -----------------------------------------------------

const DecisionWorkbench: React.FC<{ decision: PortalDecisionDetail; onDone: () => void }> = ({
  decision,
  onDone,
}) => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [tab, setTab] = useState<DecisionTab>('evaluation');
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState<DecisionEvaluation>(decision.evaluation ?? {});
  const [comments, setComments] = useState(decision.notes ?? '');
  const [outcome, setOutcome] = useState<DecisionOutcome | ''>('');

  const saveDraft = useSaveDecisionDraft();
  const confirm = useConfirmDecision();

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const decided = !decision.isDraft && decision.status !== 'PENDING';
  const compliant = decision.analysis.status === 'COMPLIANT';
  // VER-02 : VÉRIFIÉ n'est proposé que si toutes les pièces exigées sont là.
  const evidence = decision.evidence ?? [];
  const missingForApprove = evidence.filter((item) => item.requiredForVerified && !item.ok);

  const submitDraft = async () => {
    setError('');
    try {
      await saveDraft.mutateAsync({ id: decision.id, comments, evaluation });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const submitDecision = async () => {
    if (!outcome) return;
    setError('');
    try {
      await confirm.mutateAsync({ id: decision.id, outcome, comments, evaluation });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const setCriterion = (criterion: EvaluationCriterion, verdict: EvaluationVerdict) =>
    setEvaluation((prev) => ({ ...prev, [criterion]: verdict }));

  return (
    <div className="space-y-4">
      {/* Bandeau dossier */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-[#0C261B] font-mono">
              {decision.verificationCode ?? '—'}
            </h2>
            <StatusPill
              tone={VERIFICATION_TONE[decision.status]}
              label={
                decision.isDraft
                  ? t('verifier:decision.draft')
                  : t(`verifier:status.verification.${decision.status}`)
              }
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">{decision.sample.request.honeyType}</p>
          <dl className="space-y-1.5 text-xs mt-3">
            <Row label={t('verifier:fields.requestId')} value={decision.sample.request.requestCode} mono />
            <Row label={t('verifier:fields.producer')} value={decision.sample.request.producer.name} />
            <Row label={t('verifier:fields.region')} value={decision.sample.request.governorate} />
            <Row
              label={t('verifier:fields.collectionDate')}
              value={formatDate(decision.sample.collectionDate)}
            />
            <Row label={t('verifier:fields.quantity')} value={`${decision.sample.quantity} kg`} />
          </dl>
        </Panel>

        <Panel className="lg:col-span-4">
          <div
            className={`rounded-lg border p-3 ${
              compliant ? 'border-[#BFE0CB] bg-[#E8F5EC]' : 'border-[#F3CFCF] bg-[#FDF2F2]'
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#0C261B]">
              {compliant ? (
                <CheckCircle2 className="w-4 h-4 text-[#17693F]" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-[#B42323]" />
              )}
              {compliant
                ? t('verifier:decision.meetsStandards')
                : t('verifier:decision.failsStandards')}
            </p>
            <p className="text-[11px] text-gray-600 mt-1">
              {decision.analysis.conclusion ?? t('verifier:decision.assessmentHint')}
            </p>
          </div>
          {!compliant && (
            <p className="text-[11px] text-[#B42323] mt-2 font-semibold">
              {t('verifier:decision.cannotApprove')}
            </p>
          )}
        </Panel>

        <Panel className="lg:col-span-3">
          <dl className="space-y-1.5 text-xs">
            <Row label={t('verifier:fields.analysisDate')} value={formatDate(decision.analysis.analysisDate)} />
            <Row label={t('verifier:fields.validatedBy')} value={decision.analysis.assignedTo?.name} />
            <Row label={t('verifier:fields.reportNumber')} value={decision.analysis.reportNumber} mono />
            <Row label={t('verifier:fields.laboratory')} value={decision.analysis.laboratory?.name} />
          </dl>
        </Panel>
      </div>

      <Panel>
        <Stepper
          steps={decision.steps.map((step) => ({
            label: t(`verifier:decisionSteps.${step.step}`),
            state: step.state,
            hint: step.at ? formatDate(step.at) : undefined,
          }))}
          currentLabel={t('verifier:progress.current')}
        />
      </Panel>

      <Tabs
        tabs={[
          { key: 'results' as DecisionTab, label: t('verifier:decisionTabs.results') },
          { key: 'evaluation' as DecisionTab, label: t('verifier:decisionTabs.evaluation') },
          { key: 'decision' as DecisionTab, label: t('verifier:decisionTabs.decision') },
          { key: 'notes' as DecisionTab, label: t('verifier:decisionTabs.notes') },
          { key: 'history' as DecisionTab, label: t('verifier:decisionTabs.history') },
        ]}
        active={tab}
        onChange={setTab}
        variant="underline"
      />

      {error && <InlineError message={error} />}

      {tab === 'results' && (
        <Panel title={t('verifier:decisionTabs.results')} bodyClassName="p-0">
          <Table>
            <thead>
              <tr>
                <Th>{t('verifier:table.parameter')}</Th>
                <Th>{t('verifier:table.result')}</Th>
                <Th>{t('verifier:table.unit')}</Th>
                <Th>{t('verifier:table.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {decision.analysis.testResults.map((result) => (
                <tr key={result.id}>
                  <Td className="text-xs text-[#0C261B] font-semibold">
                    {t(`verifier:parameters.${result.parameterKey}`)}
                  </Td>
                  <Td className="text-xs text-gray-700">{result.value ?? '—'}</Td>
                  <Td className="text-xs text-gray-500">{result.unit ?? '—'}</Td>
                  <Td>
                    <StatusPill
                      tone={LAB_TEST_TONE[result.status]}
                      label={t(`verifier:testStatus.${result.status}`)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}

      {tab === 'evaluation' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t('verifier:decision.qualityEvaluation')}>
            <ul className="space-y-3">
              {CRITERIA.map((criterion) => (
                <li key={criterion}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0C261B]">
                        {t(`verifier:criteria.${criterion}.label`)}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {t(`verifier:criteria.${criterion}.hint`)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {VERDICT_OPTIONS[criterion].map((verdict) => {
                        const active = evaluation[criterion] === verdict;
                        return (
                          <button
                            key={verdict}
                            type="button"
                            disabled={decided}
                            onClick={() => setCriterion(criterion, verdict)}
                            className={`text-[11px] font-bold rounded-full border px-2 py-0.5 transition-colors disabled:opacity-60 ${
                              active
                                ? verdictClass(VERDICT_TONE[verdict])
                                : 'bg-white text-gray-500 border-[#EAE1D2] hover:border-[#D49B37]'
                            }`}
                          >
                            {t(`verifier:verdict.${verdict}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          {evidence.length > 0 && <EvidencePanel items={evidence} />}

          <AssistantPanel
            endpoint="verification/case-summary"
            body={{ verificationId: decision.id }}
            title={t('verifier:evidence.assistantTitle')}
          />

          <Panel title={t('verifier:decision.finalDecision')}>
            <fieldset disabled={decided} className="space-y-2">
              {(['APPROVE', 'REJECT', 'REQUEST_ADDITIONAL_ANALYSIS'] as DecisionOutcome[]).map((option) => {
                const disabled = option === 'APPROVE' && (!compliant || missingForApprove.length > 0);
                return (
                  <label
                    key={option}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      outcome === option ? 'border-[#D49B37] bg-[#FDF6E7]' : 'border-[#EAE1D2]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#D49B37]'}`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={option}
                      checked={outcome === option}
                      disabled={disabled}
                      onChange={() => setOutcome(option)}
                      className="mt-0.5 accent-[#D49B37]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#0C261B]">
                        {t(`verifier:outcome.${option}.label`)}
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        {t(`verifier:outcome.${option}.hint`)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <Field
              label={t('verifier:decision.comments')}
              className="mt-3"
              hint={t('verifier:decision.commentsHint', { count: comments.length })}
            >
              <TextArea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                maxLength={500}
                disabled={decided}
              />
            </Field>

            {!decided && (
              <div className="flex flex-wrap gap-2 justify-end mt-3 pt-3 border-t border-[#EAE1D2]">
                <Btn variant="secondary" size="sm" isLoading={saveDraft.isPending} onClick={submitDraft}>
                  <Save className="w-3.5 h-3.5" />
                  {t('verifier:actions.saveDraft')}
                </Btn>
                <Btn
                  variant="success"
                  size="sm"
                  disabled={!outcome}
                  isLoading={confirm.isPending}
                  onClick={submitDecision}
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {t('verifier:actions.confirmDecision')}
                </Btn>
              </div>
            )}

            {decided && (
              <p className="mt-3 text-xs font-semibold text-[#17693F] bg-[#E8F5EC] rounded-lg px-3 py-2">
                {t('verifier:decision.alreadyDecided')}
              </p>
            )}
          </Panel>
        </div>
      )}

      {tab === 'decision' && (
        <Panel title={t('verifier:decision.summary')}>
          <dl className="space-y-1.5 text-xs">
            <Row
              label={t('verifier:decision.currentStatus')}
              value={t(`verifier:status.verification.${decision.status}`)}
            />
            <Row label={t('verifier:fields.decidedBy')} value={decision.decidedBy?.name} />
            <Row label={t('verifier:fields.verifiedAt')} value={formatDate(decision.verifiedAt)} />
          </dl>
          {decision.notes && (
            <p className="text-sm text-gray-600 bg-[#FAF6EE] rounded-lg p-3 mt-3">{decision.notes}</p>
          )}
        </Panel>
      )}

      {tab === 'notes' && (
        <Panel title={t('verifier:decisionTabs.notes')}>
          <Field label={t('verifier:decision.comments')}>
            <TextArea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              maxLength={500}
              disabled={decided}
            />
          </Field>
          {!decided && (
            <Btn className="mt-3" size="sm" isLoading={saveDraft.isPending} onClick={submitDraft}>
              <Save className="w-3.5 h-3.5" />
              {t('verifier:actions.saveDraft')}
            </Btn>
          )}
        </Panel>
      )}

      {tab === 'history' && (
        <Panel title={t('verifier:decisionTabs.history')}>
          <ul className="space-y-2.5">
            {decision.steps.map((step) => (
              <li key={step.step} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    step.state === 'DONE' ? 'bg-[#17693F]' : 'bg-[#DCE3DD]'
                  }`}
                />
                <span className="text-[#0C261B]">{t(`verifier:decisionSteps.${step.step}`)}</span>
                <span className="ms-auto text-xs text-gray-500">
                  {step.at ? formatDate(step.at) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
};

function verdictClass(tone: 'green' | 'red' | 'amber'): string {
  if (tone === 'green') return 'bg-[#E8F5EC] text-[#17693F] border-[#BFE0CB]';
  if (tone === 'red') return 'bg-[#FDF2F2] text-[#B42323] border-[#F3CFCF]';
  return 'bg-[#FDF6E7] text-[#96661A] border-[#EFD9A8]';
}

const Row: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F4F1EA] last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className={`text-[#0C261B] font-semibold text-end truncate ${mono ? 'font-mono' : ''}`}>
      {value || '—'}
    </dd>
  </div>
);
