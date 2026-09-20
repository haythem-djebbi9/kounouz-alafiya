import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, FlaskConical, MapPin, PackageOpen, Plus, ShieldCheck, Sprout, Truck, X } from 'lucide-react';
import { useMyBatches, useRequestDetail } from './hooks';
import { governorateLabel } from './constants';
import { BtnLink, ErrorBlock, InfoCard, LoadingBlock, NAVY, NeedHelpCard, PageHeader, Panel, ToneBadge } from './ui';
import { STAGE_TONE, formatDate, formatNumber, requestStage } from './utils';
import type { RequestStage } from './utils';
import type { ProducerRequest } from './types';
import { InfoRequestResponse } from './InfoRequestResponse';
import { AssistantPanel } from '../../components/AssistantPanel';

type TrackState = 'done' | 'current' | 'pending' | 'error';

interface TrackStep {
  key: string;
  label: string;
  date?: string | null;
  state: TrackState;
  description?: string;
}

const ORDER: RequestStage[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'COLLECTION_SCHEDULED',
  'SAMPLE_COLLECTED',
  'UNDER_ANALYSIS',
  'VERIFICATION_PENDING',
  'VERIFIED',
];

function buildTrack(request: ProducerRequest, stage: RequestStage, hasBatch: boolean, t: (k: string) => string): TrackStep[] {
  const sample = request.samples?.[0];
  const verification = request.verifications?.[0];
  const analysis = sample?.labAnalyses?.[0];
  const position = ORDER.indexOf(stage === 'NOT_VERIFIED' ? 'VERIFIED' : stage);

  const stateFor = (index: number): TrackState => {
    if (stage === 'REJECTED') return index === 0 ? 'done' : index === 1 ? 'error' : 'pending';
    if (stage === 'NOT_VERIFIED' && index === 6) return 'error';
    if (index < position) return 'done';
    if (index === position) return stage === 'VERIFIED' ? 'done' : 'current';
    return 'pending';
  };

  return [
    { key: 'submitted', label: t('producer:track.submitted'), date: request.submittedAt, state: request.status === 'DRAFT' ? 'current' : 'done' },
    {
      key: 'review',
      label: t('producer:track.review'),
      state: stage === 'SUBMITTED' ? 'current' : stage === 'DRAFT' ? 'pending' : stateFor(1),
    },
    {
      key: 'collection',
      label: t('producer:track.collection'),
      description: request.preferredCollectionMethod ? t(`producer:collectionMethod.${request.preferredCollectionMethod}.short`) : undefined,
      state: stateFor(2),
    },
    {
      key: 'sample',
      label: t('producer:track.sample'),
      date: sample?.collectionDate,
      description: sample?.seal ? `${t('producer:samples.seal')} ${sample.seal.sealCode}` : undefined,
      state: stateFor(3),
    },
    { key: 'analysis', label: t('producer:track.analysis'), date: analysis?.analysisDate, state: stateFor(4) },
    { key: 'decision', label: t('producer:track.decision'), date: verification?.verifiedAt, state: stateFor(5) },
    {
      key: 'result',
      label: stage === 'NOT_VERIFIED' ? t('producer:stage.NOT_VERIFIED') : t('producer:track.verified'),
      date: verification?.verifiedAt,
      state: stateFor(6),
    },
    {
      key: 'batch',
      label: t('producer:track.batch'),
      state: hasBatch ? 'done' : stage === 'VERIFIED' ? 'current' : 'pending',
    },
  ];
}

const DOT: Record<TrackState, string> = {
  done: 'bg-[#0B4A2F] border-[#0B4A2F] text-white',
  current: 'bg-white border-[#D08C1A] text-[#D08C1A] ring-4 ring-[#D08C1A]/15',
  pending: 'bg-white border-[#D5DAD4] text-gray-400',
  error: 'bg-rose-600 border-rose-600 text-white',
};

export const RequestDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading, isError } = useRequestDetail(id);
  const { data: batches = [] } = useMyBatches();

  if (isLoading) return <LoadingBlock />;
  if (isError || !request) return <ErrorBlock message={t('producer:requestDetail.notFound')} />;

  const stage = requestStage(request);
  const batch = batches.find((b) => b.verification.request.id === request.id);
  const track = buildTrack(request, stage, !!batch, t);
  const sample = request.samples?.[0];
  const verification = request.verifications?.[0];
  const [seasonKey, seasonYear] = (request.productionSeason ?? '').split('_');

  const detail = (label: string, value?: string | number | null) => (
    <div className="py-2.5 grid grid-cols-[minmax(120px,40%)_1fr] gap-3 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-[#14215B] break-words">{value === null || value === undefined || value === '' ? '—' : value}</dd>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={request.requestCode ?? t('producer:requests.draftLabel')}
        subtitle={`${request.honeyType} · ${request.collectionLocation}`}
        breadcrumb={[
          { label: t('producer:nav.dashboard'), to: '/producteur' },
          { label: t('producer:nav.requests'), to: '/producteur/demandes' },
          { label: request.requestCode ?? t('producer:requests.draftLabel') },
        ]}
        actions={
          <>
            <ToneBadge tone={STAGE_TONE[stage]} className="text-sm px-3 py-1.5">
              {t(`producer:stage.${stage}`)}
            </ToneBadge>
            {request.status === 'DRAFT' ? (
              <BtnLink to={`/producteur/demandes/${request.id}/modifier`}>{t('producer:requests.continueDraft')}</BtnLink>
            ) : (
              <BtnLink to="/producteur/demandes/nouvelle" variant="outline">
                <Plus className="w-4 h-4" />
                {t('producer:dashboard.newRequest')}
              </BtnLink>
            )}
          </>
        }
      />

      <Panel title={t('producer:requestDetail.progress')} className="mb-5">
        <ol className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
          {track.map((step, idx) => (
            <li key={step.key} className="flex xl:flex-col items-start xl:items-center gap-3 xl:gap-2 xl:text-center relative">
              {idx > 0 && (
                <span
                  className={`hidden xl:block absolute top-4 end-1/2 w-full h-0.5 ${step.state === 'pending' ? 'bg-[#E1E5DF]' : 'bg-[#0B4A2F]'}`}
                  aria-hidden
                />
              )}
              <span className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${DOT[step.state]}`}>
                {step.state === 'done' ? <Check className="w-4 h-4" strokeWidth={3} /> : step.state === 'error' ? <X className="w-4 h-4" strokeWidth={3} /> : idx + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-xs font-bold ${step.state === 'pending' ? 'text-gray-400' : NAVY}`}>{step.label}</span>
                {step.description && <span className="block text-[11px] text-gray-500">{step.description}</span>}
                {step.date && step.state !== 'pending' && <span className="block text-[11px] text-gray-500">{formatDate(step.date, lang)}</span>}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid xl:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-4 min-w-0">
          {request.status === 'INFO_REQUESTED' && <InfoRequestResponse request={request} />}
          {stage === 'REJECTED' && (
            <InfoCard tone="red" icon={<X className="w-5 h-5 text-rose-600" />} title={t('producer:requestDetail.rejectedTitle')}>
              <p>{t('producer:requestDetail.rejectedBody')}</p>
            </InfoCard>
          )}
          {verification && verification.status !== 'PENDING' && (
            <InfoCard
              tone={verification.status === 'VERIFIED' ? 'green' : 'red'}
              icon={<ShieldCheck className={`w-5 h-5 ${verification.status === 'VERIFIED' ? 'text-[#17693F]' : 'text-rose-600'}`} />}
              title={verification.status === 'VERIFIED' ? t('producer:requestDetail.verifiedTitle') : t('producer:requestDetail.notVerifiedTitle')}
            >
              <p>{verification.status === 'VERIFIED' ? t('producer:requestDetail.verifiedBody') : t('producer:requestDetail.notVerifiedBody')}</p>
              {verification.notes && <p className="mt-1 italic">« {verification.notes} »</p>}
            </InfoCard>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Panel title={t('producer:wizard.section.honey')} icon={<Sprout className="w-5 h-5" />} bodyClassName="px-4 sm:px-5 pb-3">
              <dl className="divide-y divide-[#EEF0EC]">
                {detail(t('producer:wizard.fields.honeyType'), request.honeyType)}
                {detail(t('producer:wizard.fields.floralCategory'), request.floralCategory ? t(`producer:floralCategory.${request.floralCategory}`) : null)}
                {detail(t('producer:wizard.fields.floralOrigin'), request.floralOrigin)}
                {detail(t('producer:wizard.fields.quantity'), t('producer:common.kg', { value: formatNumber(Number(request.quantity), lang, 1) }))}
                {detail(t('producer:wizard.fields.season'), seasonKey ? `${t(`producer:honey.seasons.${seasonKey}`, { defaultValue: seasonKey })} ${seasonYear ?? ''}` : null)}
                {detail(
                  t('producer:wizard.fields.harvestPeriod'),
                  request.harvestStartDate || request.harvestEndDate
                    ? `${formatDate(request.harvestStartDate, lang)} → ${formatDate(request.harvestEndDate, lang)}`
                    : null,
                )}
              </dl>
            </Panel>
            <Panel title={t('producer:wizard.section.location')} icon={<MapPin className="w-5 h-5" />} bodyClassName="px-4 sm:px-5 pb-3">
              <dl className="divide-y divide-[#EEF0EC]">
                {detail(t('producer:fields.governorate'), governorateLabel(request.governorate, lang))}
                {detail(t('producer:fields.delegation'), request.delegation)}
                {detail(t('producer:wizard.fields.coordinates'), request.latitude != null ? `${request.latitude}, ${request.longitude}` : null)}
                {detail(t('producer:wizard.fields.hives'), request.hivesCount)}
                {detail(t('producer:wizard.fields.method'), request.beekeepingMethod ? t(`producer:honey.methods.${request.beekeepingMethod}`, { defaultValue: request.beekeepingMethod }) : null)}
                {detail(t('producer:wizard.fields.hiveType'), request.hiveType ? t(`producer:honey.hives.${request.hiveType}`, { defaultValue: request.hiveType }) : null)}
              </dl>
            </Panel>
          </div>

          {request.description && (
            <Panel title={t('producer:wizard.fields.additionalInfo')}>
              <p className="text-sm text-[#374151] whitespace-pre-line">{request.description}</p>
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          {request.status !== 'DRAFT' && (
            <AssistantPanel
              endpoint="producer/status-explanation"
              body={{ requestId: request.id }}
              title={t('producer:infoRequest.assistantTitle')}
            />
          )}
          {request.farm && (
            <Panel title={t('producer:farms.requestFarm')} icon={<MapPin className="w-5 h-5" />}>
              <p className={`text-sm font-bold ${NAVY}`}>{request.farm.name}</p>
              <p className="text-xs text-gray-500 font-mono">{request.farm.farmCode}</p>
            </Panel>
          )}
          <Panel title={t('producer:wizard.section.collection')} icon={<Truck className="w-5 h-5" />}>
            <p className={`text-sm font-bold ${NAVY}`}>
              {request.preferredCollectionMethod ? t(`producer:collectionMethod.${request.preferredCollectionMethod}.title`) : '—'}
            </p>
            <p className="text-xs text-gray-600 mt-1">{t('producer:requestDetail.methodNote')}</p>
          </Panel>

          <Panel title={t('producer:requestDetail.sampleTitle')} icon={<FlaskConical className="w-5 h-5" />}>
            {!sample ? (
              <p className="text-sm text-gray-500">{t('producer:requestDetail.noSample')}</p>
            ) : (
              <dl className="divide-y divide-[#EEF0EC] -my-2">
                {detail(t('producer:samples.cols.collected'), formatDate(sample.collectionDate, lang))}
                {detail(t('producer:samples.seal'), sample.seal?.sealCode)}
                {detail(t('producer:samples.cols.custody'), t(`producer:sampleStatus.${sample.status}`))}
                {detail(t('producer:samples.cols.analysis'), sample.labAnalyses?.[0] ? t(`producer:analysisStatus.${sample.labAnalyses[0].status}`) : t('producer:samples.noAnalysis'))}
              </dl>
            )}
            {sample && (
              <Link to={`/producteur/echantillons?echantillon=${sample.id}`} className="inline-block mt-3 text-sm font-bold text-[#1F4FA3] hover:underline">
                {t('producer:requestDetail.viewCustody')}
              </Link>
            )}
          </Panel>

          {batch && (
            <Panel title={t('producer:requestDetail.batchTitle')} icon={<PackageOpen className="w-5 h-5" />}>
              <p className="font-mono font-bold text-[#14215B]">{batch.batchCode}</p>
              <p className="text-sm text-gray-600 mt-1">{t(`producer:batchStatus.${batch.status}`)}</p>
              <Link to={`/producteur/lots?lot=${batch.id}`} className="inline-block mt-3 text-sm font-bold text-[#1F4FA3] hover:underline">
                {t('producer:requestDetail.viewBatch')}
              </Link>
            </Panel>
          )}
          <NeedHelpCard />
        </aside>
      </div>
    </div>
  );
};
