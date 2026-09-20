import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Download,
  FileText,
  FlaskConical,
  Printer,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  downloadAnalysisFile,
  useAnalysisBySample,
  useCompleteAnalysis,
  useDeleteAnalysisFile,
  useLabParameters,
  useLabQueue,
  useOpenAnalysis,
  useSaveAnalysisResults,
  useUploadAnalysisFile,
} from '../hooks';
import { useLaboratories } from '../../admin/hooks/useLaboratory';
import { LAB_ANALYSIS_TONE, LAB_TEST_TONE, LAB_WORKFLOW_TONE, SAMPLE_STATUS_TONE } from '../status-map';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  Field,
  InlineError,
  LoadingBlock,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  Stepper,
  Table,
  Tabs,
  Td,
  TextArea,
  TextInput,
  Th,
} from '../ui';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { LabParameter, PortalAnalysisDetail, StepState } from '../types';

type LabTab = 'analysis' | 'results' | 'documents' | 'notes' | 'history';

export const LaboratoryPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();
  const [sampleId, setSampleId] = useState<string | null>(params.get('sample'));

  const queue = useLabQueue();
  const analysis = useAnalysisBySample(sampleId ?? undefined);

  // À l'arrivée, on ouvre le premier échantillon de la file plutôt qu'un écran
  // vide : le laboratoire travaille toujours sur la file du jour.
  useEffect(() => {
    if (!sampleId && queue.data && queue.data.length > 0) {
      setSampleId(queue.data[0].id);
    }
  }, [queue.data, sampleId]);

  const select = (id: string) => {
    setSampleId(id);
    setParams({ sample: id }, { replace: true });
  };

  const locale = dateLocale(i18n.language);

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:laboratory.title') }]} />
      <PageHeader
        title={t('verifier:laboratory.title')}
        subtitle={t('verifier:laboratory.subtitle')}
        actions={
          <Btn variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            {t('verifier:actions.printReport')}
          </Btn>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        {/* File du laboratoire */}
        <div className="xl:col-span-3">
          <Panel title={t('verifier:laboratory.queue')} bodyClassName="p-0">
            {queue.isLoading && <LoadingBlock label={t('common:status.loading')} />}
            {queue.data?.length === 0 && <EmptyBlock title={t('verifier:laboratory.queueEmpty')} />}
            <ul className="divide-y divide-[#F1EDE3] max-h-[70vh] overflow-y-auto">
              {(queue.data ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => select(item.id)}
                    className={`w-full text-start px-3 py-2.5 transition-colors ${
                      sampleId === item.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0C261B]">
                        {item.sampleCode ?? '—'}
                      </span>
                      <StatusPill
                        className="ms-auto"
                        tone={SAMPLE_STATUS_TONE[item.status]}
                        label={t(`verifier:status.sample.${item.status}`)}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {item.request.producer.name} · {item.request.honeyType}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Poste de travail */}
        <div className="xl:col-span-9">
          {!sampleId && (
            <Panel>
              <EmptyBlock
                title={t('verifier:laboratory.selectPrompt')}
                icon={<FlaskConical className="w-8 h-8" />}
              />
            </Panel>
          )}

          {sampleId && analysis.isLoading && (
            <Panel>
              <LoadingBlock label={t('common:status.loading')} />
            </Panel>
          )}

          {sampleId && analysis.isError && <OpenAnalysisCard sampleId={sampleId} />}

          {analysis.data && <AnalysisWorkbench key={analysis.data.id} analysis={analysis.data} locale={locale} />}
        </div>
      </div>
    </div>
  );
};

// --- Ouverture d'un dossier d'analyse -------------------------------------

const OpenAnalysisCard: React.FC<{ sampleId: string }> = ({ sampleId }) => {
  const { t } = useTranslation(['verifier', 'common']);
  const { data: labs } = useLaboratories();
  const openAnalysis = useOpenAnalysis();
  const [labId, setLabId] = useState('');
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await openAnalysis.mutateAsync({
        sampleId,
        labId,
        expectedCompletion: expectedCompletion ? new Date(expectedCompletion).toISOString() : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Panel title={t('verifier:laboratory.openTitle')}>
      <p className="text-sm text-gray-600 mb-4">{t('verifier:laboratory.openHint')}</p>
      {error && <InlineError message={error} />}
      <div className="grid gap-3 sm:grid-cols-2 mt-3">
        <Field label={t('verifier:fields.laboratory')} required>
          <SelectInput value={labId} onChange={(e) => setLabId(e.target.value)}>
            <option value="">{t('verifier:laboratory.selectLab')}</option>
            {(labs ?? []).map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t('verifier:fields.expectedCompletion')}>
          <TextInput
            type="date"
            value={expectedCompletion}
            onChange={(e) => setExpectedCompletion(e.target.value)}
          />
        </Field>
      </div>
      <Btn className="mt-4" disabled={!labId} isLoading={openAnalysis.isPending} onClick={submit}>
        <FlaskConical className="w-4 h-4" />
        {t('verifier:actions.openAnalysis')}
      </Btn>
    </Panel>
  );
};

// --- Poste de travail ------------------------------------------------------

const AnalysisWorkbench: React.FC<{ analysis: PortalAnalysisDetail; locale: string }> = ({
  analysis,
  locale,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const [tab, setTab] = useState<LabTab>('analysis');
  const [error, setError] = useState('');

  const { data: parameters } = useLabParameters();
  const saveResults = useSaveAnalysisResults();
  const complete = useCompleteAnalysis();
  const uploadFile = useUploadAnalysisFile();
  const deleteFile = useDeleteAnalysisFile();

  // Copie locale des valeurs saisies : on n'écrit en base qu'à l'enregistrement,
  // pour ne pas générer une requête par frappe.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(analysis.testResults.map((r) => [r.parameterKey, r.value ?? ''])),
  );
  const [conclusion, setConclusion] = useState(analysis.conclusion ?? '');
  const [notes, setNotes] = useState(analysis.internalNotes ?? '');

  const locked = analysis.workflowStatus === 'COMPLETED' || analysis.workflowStatus === 'REVIEWED';

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const byKey = useMemo(
    () => new Map((parameters ?? []).map((p) => [p.key, p])),
    [parameters],
  );

  const save = async () => {
    setError('');
    try {
      await saveResults.mutateAsync({
        id: analysis.id,
        results: Object.keys(values).map((parameterKey) => ({
          parameterKey,
          value: values[parameterKey],
        })),
        conclusion,
        internalNotes: notes,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const markCompleted = async () => {
    setError('');
    try {
      await complete.mutateAsync(analysis.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      await uploadFile.mutateAsync({ id: analysis.id, file });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    } finally {
      event.target.value = '';
    }
  };

  // Jalons du dossier laboratoire, déduits des faits enregistrés.
  const steps: { label: string; state: StepState }[] = [
    { label: t('verifier:labSteps.received'), state: 'DONE' },
    {
      label: t('verifier:labSteps.inLaboratory'),
      state: locked ? 'DONE' : 'CURRENT',
    },
    {
      label: t('verifier:labSteps.analysisCompleted'),
      state: analysis.completedAt ? 'DONE' : locked ? 'CURRENT' : 'TODO',
    },
    {
      label: t('verifier:labSteps.resultsReviewed'),
      state: analysis.workflowStatus === 'REVIEWED' ? 'DONE' : 'TODO',
    },
    { label: t('verifier:labSteps.finalDecision'), state: 'TODO' },
  ];

  const tabs: { key: LabTab; label: string }[] = [
    { key: 'analysis', label: t('verifier:labTabs.analysis') },
    { key: 'results', label: t('verifier:labTabs.results') },
    { key: 'documents', label: t('verifier:labTabs.documents') },
    { key: 'notes', label: t('verifier:labTabs.notes') },
    { key: 'history', label: t('verifier:labTabs.history') },
  ];

  return (
    <div className="space-y-4">
      {/* Bandeau dossier */}
      <Panel>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div>
            <p className="font-mono text-base font-extrabold text-[#0C261B]">
              {analysis.sample.sampleCode ?? '—'}
            </p>
            <p className="text-xs text-gray-500">
              {analysis.sample.request.requestCode} · {analysis.sample.request.producer.name}
            </p>
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <StatusPill
              tone={LAB_WORKFLOW_TONE[analysis.workflowStatus]}
              label={t(`verifier:status.workflow.${analysis.workflowStatus}`)}
            />
            <StatusPill
              tone={LAB_ANALYSIS_TONE[analysis.status]}
              label={t(`verifier:status.analysis.${analysis.status}`)}
            />
          </div>
        </div>
        <Stepper steps={steps} currentLabel={t('verifier:progress.current')} />
      </Panel>

      <div>
        <Tabs tabs={tabs} active={tab} onChange={setTab} variant="underline" />
      </div>

      {error && <InlineError message={error} />}

      {tab === 'analysis' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <Panel title={t('verifier:laboratory.sampleInfo')}>
              <dl className="space-y-1.5 text-xs">
                <Row label={t('verifier:fields.sampleId')} value={analysis.sample.sampleCode} mono />
                <Row label={t('verifier:fields.requestId')} value={analysis.sample.request.requestCode} mono />
                <Row label={t('verifier:fields.producer')} value={analysis.sample.request.producer.name} />
                <Row label={t('verifier:fields.honeyType')} value={analysis.sample.request.honeyType} />
                <Row label={t('verifier:fields.batchNumber')} value={analysis.sample.request.batchNumber} mono />
                <Row
                  label={t('verifier:fields.collectionDate')}
                  value={formatDate(analysis.sample.collectionDate)}
                />
                <Row label={t('verifier:fields.quantity')} value={`${analysis.sample.quantity} kg`} />
                <Row label={t('verifier:fields.location')} value={analysis.sample.location} />
              </dl>
            </Panel>

            <Panel title={t('verifier:laboratory.assignment')}>
              <dl className="space-y-1.5 text-xs">
                <Row label={t('verifier:fields.assignedTo')} value={analysis.assignedTo?.name} />
                <Row label={t('verifier:fields.laboratory')} value={analysis.laboratory?.name} />
                <Row
                  label={t('verifier:fields.assignmentDate')}
                  value={formatDate(analysis.assignmentDate)}
                />
                <Row
                  label={t('verifier:fields.expectedCompletion')}
                  value={formatDate(analysis.expectedCompletion)}
                />
                <Row label={t('verifier:fields.analysisCode')} value={analysis.analysisCode} mono />
              </dl>
            </Panel>
          </div>

          {/* Bulletin */}
          <div className="lg:col-span-5">
            <Panel title={t('verifier:laboratory.tests')} bodyClassName="p-0">
              <p className="px-4 py-2 text-xs text-gray-500 border-b border-[#EAE1D2]">
                {locked ? t('verifier:laboratory.testsLocked') : t('verifier:laboratory.testsHint')}
              </p>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('verifier:table.parameter')}</Th>
                    <Th>{t('verifier:table.result')}</Th>
                    <Th>{t('verifier:table.unit')}</Th>
                    <Th>{t('verifier:table.referenceRange')}</Th>
                    <Th>{t('verifier:table.status')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.testResults.map((result) => {
                    const parameter = byKey.get(result.parameterKey);
                    return (
                      <tr key={result.id}>
                        <Td className="text-xs text-[#0C261B] font-semibold">
                          {t(`verifier:parameters.${result.parameterKey}`)}
                        </Td>
                        <Td>
                          <TextInput
                            value={values[result.parameterKey] ?? ''}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [result.parameterKey]: e.target.value }))
                            }
                            disabled={locked}
                            className="py-1 min-h-[30px] text-xs w-28"
                            placeholder={locked ? '—' : t('verifier:laboratory.valuePlaceholder')}
                          />
                        </Td>
                        <Td className="text-xs text-gray-500">{result.unit ?? '—'}</Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {referenceLabel(parameter, result.referenceText, t)}
                        </Td>
                        <Td>
                          <StatusPill
                            tone={LAB_TEST_TONE[result.status]}
                            label={t(`verifier:testStatus.${result.status}`)}
                          />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Panel>
          </div>

          {/* Conclusion et pièces */}
          <div className="lg:col-span-3 space-y-4">
            <Panel title={t('verifier:laboratory.conclusion')}>
              <div
                className={`rounded-lg border p-3 ${
                  analysis.status === 'COMPLIANT'
                    ? 'border-[#BFE0CB] bg-[#E8F5EC]'
                    : analysis.status === 'NON_COMPLIANT'
                      ? 'border-[#F3CFCF] bg-[#FDF2F2]'
                      : 'border-[#EFD9A8] bg-[#FDF6E7]'
                }`}
              >
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#0C261B]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t(`verifier:status.analysis.${analysis.status}`)}
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  {analysis.conclusion ?? t('verifier:laboratory.conclusionPending')}
                </p>
              </div>

              <dl className="space-y-1.5 text-xs mt-3">
                <Row label={t('verifier:fields.analysisDate')} value={formatDate(analysis.analysisDate)} />
                <Row label={t('verifier:fields.validatedBy')} value={analysis.assignedTo?.name} />
                <Row label={t('verifier:fields.reportNumber')} value={analysis.reportNumber} mono />
              </dl>

              {!locked && (
                <div className="flex flex-col gap-2 mt-3">
                  <Btn size="sm" variant="secondary" isLoading={saveResults.isPending} onClick={save}>
                    <Save className="w-3.5 h-3.5" />
                    {t('verifier:actions.saveResults')}
                  </Btn>
                  <Btn size="sm" variant="success" isLoading={complete.isPending} onClick={markCompleted}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('verifier:actions.markCompleted')}
                  </Btn>
                </div>
              )}
            </Panel>

            <Panel title={t('verifier:laboratory.files')}>
              <ul className="space-y-1.5">
                {analysis.files.length === 0 && (
                  <li className="text-xs text-gray-400">{t('verifier:laboratory.noFiles')}</li>
                )}
                {analysis.files.map((file) => (
                  <li key={file.id} className="flex items-center gap-2 text-xs">
                    <FileText className="w-3.5 h-3.5 text-[#B42323] shrink-0" />
                    <span className="truncate flex-1 text-[#0C261B]">{file.fileName}</span>
                    <span className="text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button
                      onClick={() => void downloadAnalysisFile(file)}
                      className="p-1 rounded text-gray-400 hover:text-[#0C261B]"
                      aria-label={t('common:actions.download')}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {!locked && (
                      <button
                        onClick={() => deleteFile.mutate(file.id)}
                        className="p-1 rounded text-gray-400 hover:text-[#B42323]"
                        aria-label={t('common:actions.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {!locked && (
                <label className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#EAE1D2] px-3 py-2 text-xs font-bold text-[#0C261B] cursor-pointer hover:border-[#D49B37]">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadFile.isPending ? t('common:status.loading') : t('verifier:actions.uploadFile')}
                  <input type="file" className="hidden" onChange={onUpload} accept=".pdf,image/*" />
                </label>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === 'results' && (
        <Panel title={t('verifier:laboratory.previousAnalyses')} bodyClassName="p-0">
          {analysis.previousResults.length === 0 && (
            <EmptyBlock
              title={t('verifier:laboratory.noPrevious')}
              description={t('verifier:laboratory.noPreviousHint')}
            />
          )}
          {analysis.previousResults.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>{t('verifier:table.date')}</Th>
                  <Th>{t('verifier:table.parameter')}</Th>
                  <Th>{t('verifier:table.result')}</Th>
                  <Th>{t('verifier:table.status')}</Th>
                  <Th>{t('verifier:fields.analysisCode')}</Th>
                </tr>
              </thead>
              <tbody>
                {analysis.previousResults.map((result) => (
                  <tr key={result.id}>
                    <Td className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(result.analysis.analysisDate)}
                    </Td>
                    <Td className="text-xs text-[#0C261B]">
                      {t(`verifier:parameters.${result.parameterKey}`)}
                    </Td>
                    <Td className="text-xs text-gray-600">
                      {result.value ?? '—'} {result.unit ?? ''}
                    </Td>
                    <Td>
                      <StatusPill
                        tone={LAB_TEST_TONE[result.status]}
                        label={t(`verifier:testStatus.${result.status}`)}
                      />
                    </Td>
                    <Td className="font-mono text-xs text-gray-500">{result.analysis.analysisCode}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}

      {tab === 'documents' && (
        <Panel title={t('verifier:laboratory.files')}>
          <ul className="space-y-2">
            {analysis.files.length === 0 && <EmptyBlock title={t('verifier:laboratory.noFiles')} />}
            {analysis.files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-[#EAE1D2] px-3 py-2"
              >
                <FileText className="w-4 h-4 text-[#B42323]" />
                <span className="text-sm text-[#0C261B] truncate flex-1">{file.fileName}</span>
                <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <Btn size="sm" variant="ghost" onClick={() => void downloadAnalysisFile(file)}>
                  <Download className="w-3.5 h-3.5" />
                </Btn>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === 'notes' && (
        <Panel title={t('verifier:labTabs.notes')}>
          <Field label={t('verifier:laboratory.internalNotes')} hint={t('verifier:laboratory.notesHint')}>
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={locked} />
          </Field>
          <Field label={t('verifier:laboratory.conclusion')} className="mt-3">
            <TextArea value={conclusion} onChange={(e) => setConclusion(e.target.value)} disabled={locked} />
          </Field>
          {!locked && (
            <Btn className="mt-3" size="sm" isLoading={saveResults.isPending} onClick={save}>
              <Save className="w-3.5 h-3.5" />
              {t('common:actions.save')}
            </Btn>
          )}
        </Panel>
      )}

      {tab === 'history' && (
        <Panel title={t('verifier:labTabs.history')}>
          <dl className="space-y-1.5 text-xs">
            <Row label={t('verifier:fields.assignmentDate')} value={formatDate(analysis.assignmentDate)} />
            <Row label={t('verifier:fields.expectedCompletion')} value={formatDate(analysis.expectedCompletion)} />
            <Row label={t('verifier:fields.completedAt')} value={formatDate(analysis.completedAt)} />
            <Row label={t('verifier:fields.analysisCode')} value={analysis.analysisCode} mono />
            <Row label={t('verifier:fields.reportNumber')} value={analysis.reportNumber} mono />
          </dl>
        </Panel>
      )}
    </div>
  );
};

/** Libellé lisible de la plage de référence : « ≤ 20 », « ≥ 8 », « 3.4 – 4.5 ». */
function referenceLabel(
  parameter: LabParameter | undefined,
  referenceText: string | null,
  t: (key: string) => string,
): string {
  if (referenceText === 'NOT_DETECTED') return t('verifier:testStatus.NOT_DETECTED');
  if (!parameter) return '—';
  const { min, max } = parameter;
  if (min !== null && max !== null) return `${min} – ${max}`;
  if (max !== null) return `≤ ${max}`;
  if (min !== null) return `≥ ${min}`;
  return '—';
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
