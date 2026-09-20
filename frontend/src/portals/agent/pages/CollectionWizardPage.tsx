import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CloudSun,
  Crosshair,
  FlaskConical,
  Loader2,
  LocateFixed,
  MapPin,
  PartyPopper,
  RefreshCw,
  ShieldCheck,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { Breadcrumb, Btn, Field, InlineError, LoadingBlock, SelectInput, TextArea, TextInput } from '../../verifier/ui';
import {
  useAssignment,
  useCollectSample,
  useCompleteAssignment,
  useGeolocation,
  useNextSampleCode,
  useStartAssignment,
  useWeather,
} from '../hooks';
import { MapView } from '../MapView';
import { SealForm } from '../SealForm';
import { AssignmentStatusPill, DefList, PhotoUploader, SectionCard, WeatherWidget, WizardSteps } from '../ui';
import { HARVEST_SOURCES, type AssignmentDetail, type HarvestSource } from '../types';
import { combineDateTime, formatCoords, formatDate, formatDateTime, quantityInGrams, toDateInput, toTimeInput } from '../utils';

const HONEY_SUGGESTIONS = [
  'Miel de Thym',
  'Miel de Romarin',
  "Miel de Fleurs d'Oranger",
  'Miel de Jujubier (Sedra)',
  "Miel d'Eucalyptus",
  'Miel de Sauge',
  'Miel Toutes Fleurs',
  'Miel de Caroube',
];

/** Étape à afficher d'après l'avancement réel de la mission. */
function progressOf(a: AssignmentDetail) {
  if (a.status === 'COMPLETED') return 4;
  if (a.sample?.seal) return 3;
  if (a.sample) return 2;
  if (a.status === 'IN_PROGRESS') return 1;
  return 0;
}

export const CollectionWizardPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const { data: assignment, isLoading, isError } = useAssignment(assignmentId);
  const [step, setStep] = useState<number | null>(null);

  const progress = assignment ? progressOf(assignment) : 0;
  useEffect(() => {
    if (assignment && step === null) setStep(progress);
  }, [assignment, progress, step]);

  if (isLoading || (assignment && step === null)) return <LoadingBlock label={t('common.loading')} />;
  if (isError || !assignment) return <InlineError message={t('assignmentDetail.notFound')} />;
  if (assignment.status === 'CANCELLED') return <InlineError message={t('wizard.cancelled')} />;

  const current = step ?? progress;
  const steps = ['assignment', 'sample', 'seal', 'confirmation', 'complete'].map((key) => t(`wizard.steps.${key}`));
  const goTo = (index: number) => setStep(Math.min(index, 4));

  return (
    <div className="max-w-6xl mx-auto pb-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <Breadcrumb
            items={[
              { label: t('brand.role') },
              { label: t('nav.assignments'), to: '/agent/missions' },
              { label: assignment.assignmentCode, to: `/agent/missions/${assignment.id}` },
              { label: t('nav.collection') },
            ]}
          />
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0C261B]">{t('wizard.title')}</h1>
          <p className="text-sm text-gray-500">{t('wizard.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-[#BFE0CB] bg-[#F2F8F3] px-4 py-3 lg:min-w-[380px]">
          <div className="flex items-center justify-between gap-3">
            <p className="font-extrabold text-[#0C261B]">{t('assignmentDetail.assignment', { code: assignment.assignmentCode })}</p>
            <AssignmentStatusPill status={assignment.status} overdue={assignment.isOverdue} />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {t('wizard.producer')}: <b>{assignment.request.producer.name}</b> · {t('wizard.location')}:{' '}
            <b>{assignment.request.delegation ?? assignment.request.collectionLocation}</b> · {t('wizard.date')}:{' '}
            <b>{formatDate(assignment.scheduledDate, locale)}</b>
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#EAE1D2] rounded-xl px-2 sm:px-6 py-4 mb-5 overflow-x-auto">
        <div className="min-w-[480px]">
          <WizardSteps steps={steps} current={current} completed={progress} />
        </div>
      </div>

      {current === 0 && <AssignmentStep assignment={assignment} onNext={() => goTo(1)} />}
      {current === 1 &&
        (assignment.sample ? (
          <RecordedSample assignment={assignment} onBack={() => goTo(0)} onNext={() => goTo(2)} />
        ) : (
          <SampleStep assignment={assignment} onBack={() => goTo(0)} onNext={() => goTo(2)} />
        ))}
      {current === 2 && assignment.sample && (
        <SectionCard title={t('wizard.seal.heading')} icon={<ShieldCheck className="w-5 h-5" />}>
          {assignment.sample.seal ? (
            <SealSummary assignment={assignment} onBack={() => goTo(1)} onNext={() => goTo(3)} />
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{t('wizard.seal.description', { code: assignment.sample.sampleCode })}</p>
              <SealForm sampleId={assignment.sample.id} onDone={() => goTo(3)} onCancel={() => goTo(1)} submitLabel={t('common.saveContinue')} />
            </>
          )}
        </SectionCard>
      )}
      {current === 3 && <ConfirmationStep assignment={assignment} onBack={() => goTo(2)} onDone={() => goTo(4)} />}
      {current === 4 && <CompleteStep assignment={assignment} />}
    </div>
  );
};

// --- Étape 1 : mission ------------------------------------------------------

const AssignmentStep: React.FC<{ assignment: AssignmentDetail; onNext: () => void }> = ({ assignment, onNext }) => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const start = useStartAssignment();
  const [error, setError] = useState('');
  const missing = assignment.requiredEquipment.filter((e) => !assignment.checkedEquipment.includes(e));

  const handleStart = async () => {
    setError('');
    try {
      if (assignment.status === 'PENDING') await start.mutateAsync(assignment.id);
      onNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard title={t('wizard.assignmentStep.heading')} icon={<ClipboardList className="w-5 h-5" />}>
        <DefList
          rows={[
            { label: t('wizard.producer'), value: `${assignment.request.producer.name} — ${assignment.request.producer.farmName}` },
            { label: t('wizard.location'), value: assignment.request.collectionLocation },
            {
              label: t('assignmentDetail.scheduledDate'),
              value: `${formatDate(assignment.scheduledDate, locale)}${
                assignment.timeWindowStart ? ` · ${assignment.timeWindowStart} – ${assignment.timeWindowEnd ?? ''}` : ''
              }`,
            },
            { label: t('assignmentDetail.honeyType'), value: assignment.request.honeyType },
            { label: t('assignmentDetail.expectedQuantity'), value: t('assignmentDetail.perSample', { grams: assignment.expectedQuantityGrams }) },
            { label: t('assignmentDetail.numberOfSamples'), value: assignment.numberOfSamples },
            { label: t('assignmentDetail.specialInstructions'), value: assignment.specialInstructions ?? '—' },
          ]}
        />
      </SectionCard>
      <div className="space-y-5">
        <SectionCard title={t('assignmentDetail.equipment')} icon={<CheckCircle2 className="w-5 h-5" />}>
          {missing.length === 0 ? (
            <p className="text-sm text-[#17693F] font-semibold flex items-center gap-2">
              <CircleCheck className="w-5 h-5" />
              {t('wizard.assignmentStep.equipmentReady')}
            </p>
          ) : (
            <>
              <p className="text-sm text-[#96661A] mb-2">{t('wizard.assignmentStep.equipmentMissing', { count: missing.length })}</p>
              <ul className="text-sm text-gray-600 list-disc ps-5 space-y-0.5">
                {missing.map((item) => (
                  <li key={item}>{t(`equipment.${item}`, { defaultValue: item })}</li>
                ))}
              </ul>
              <Link to={`/agent/missions/${assignment.id}`} className="inline-block mt-2 text-sm font-bold text-[#1D4E89] hover:underline">
                {t('wizard.assignmentStep.openChecklist')}
              </Link>
            </>
          )}
        </SectionCard>
        <SectionCard title={t('wizard.assignmentStep.onSite')} icon={<MapPin className="w-5 h-5" />}>
          <p className="text-sm text-gray-600">{t('wizard.assignmentStep.onSiteBody')}</p>
        </SectionCard>
        {error && <InlineError message={error} />}
        <div className="flex justify-between gap-3">
          <Link
            to={`/agent/missions/${assignment.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#0C261B]/40 text-[#0C261B] text-sm font-bold px-5 min-h-[46px]"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            {t('common.back')}
          </Link>
          <Btn onClick={handleStart} isLoading={start.isPending} className="min-h-[46px] px-6">
            {assignment.status === 'PENDING' ? t('wizard.assignmentStep.start') : t('common.continue')}
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Btn>
        </div>
      </div>
    </div>
  );
};

// --- Étape 2 : relevé de l'échantillon ---------------------------------------

const SampleStep: React.FC<{ assignment: AssignmentDetail; onBack: () => void; onNext: () => void }> = ({
  assignment,
  onBack,
  onNext,
}) => {
  const { t } = useTranslation('agent');
  const collect = useCollectSample(assignment.id);
  const nextCode = useNextSampleCode();
  const geo = useGeolocation(true);
  const now = new Date();

  const [form, setForm] = useState({
    honeyType: assignment.request.honeyType,
    quantity: String(assignment.expectedQuantityGrams),
    unit: 'g' as 'g' | 'kg',
    numberOfSamples: String(assignment.numberOfSamples),
    harvestSource: (assignment.harvestSource ?? 'PRODUCTION_HIVES') as HarvestSource,
    date: toDateInput(now),
    time: toTimeInput(now),
    latitude: '',
    longitude: '',
    notes: '',
  });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  // Dès que le GPS répond, la position du terminal remplace les champs.
  useEffect(() => {
    if (geo.state.status === 'ready') {
      const { latitude, longitude, accuracy: acc } = geo.state.position;
      setForm((f) => ({ ...f, latitude: String(latitude), longitude: String(longitude) }));
      setAccuracy(acc);
    }
  }, [geo.state]);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const hasPosition = form.latitude !== '' && form.longitude !== '' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const position = hasPosition ? { latitude: lat, longitude: lng } : null;
  const weather = useWeather(position);

  const errors = {
    honeyType: form.honeyType.trim().length < 2,
    quantity: !(Number(form.quantity) > 0),
    numberOfSamples: !(Number.isInteger(Number(form.numberOfSamples)) && Number(form.numberOfSamples) >= 1),
    position: !hasPosition,
    date: !form.date || !form.time || new Date(combineDateTime(form.date, form.time)).getTime() > Date.now() + 5 * 60_000,
  };
  const valid = !Object.values(errors).some(Boolean);

  const recommended = assignment.expectedQuantityGrams;
  const distanceMeters = useMemo(() => {
    if (!position || !assignment.coordinates) return null;
    return haversine(position, assignment.coordinates);
  }, [position?.latitude, position?.longitude, assignment.coordinates]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setTouched(true);
    setError('');
    if (!valid) return;
    try {
      await collect.mutateAsync({
        honeyType: form.honeyType.trim(),
        quantity: Number(form.quantity),
        unit: form.unit,
        numberOfSamples: Number(form.numberOfSamples),
        harvestSource: form.harvestSource,
        collectionDate: combineDateTime(form.date, form.time),
        latitude: lat,
        longitude: lng,
        gpsAccuracy: accuracy ?? undefined,
        notes: form.notes.trim() || undefined,
        photos,
        weather: weather.data,
      });
      onNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  const fieldError = (flag: boolean, message: string) => touched && flag && <p className="text-[11px] text-[#B42323] mt-1">{message}</p>;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={t('wizard.sample.heading')} icon={<FlaskConical className="w-5 h-5" />}>
          <div className="space-y-4">
            <Row label={t('wizard.sample.sampleId')} required>
              <div className="flex items-center gap-2">
                <TextInput value={nextCode.data?.sampleCode ?? '…'} readOnly className="bg-[#F6F7F4] font-mono" dir="ltr" />
                <button
                  type="button"
                  onClick={() => nextCode.refetch()}
                  className="p-2 rounded-lg text-[#17693F] hover:bg-[#F2F8F3] min-w-[40px] min-h-[40px] grid place-items-center"
                  aria-label={t('wizard.sample.refreshId')}
                  title={t('wizard.sample.refreshId')}
                >
                  <RefreshCw className={`w-4 h-4 ${nextCode.isFetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{t('wizard.sample.sampleIdHint')}</p>
            </Row>

            <Row label={t('wizard.sample.honeyType')} required>
              <TextInput list="honey-types" value={form.honeyType} onChange={update('honeyType')} />
              <datalist id="honey-types">
                {Array.from(new Set([assignment.request.honeyType, ...HONEY_SUGGESTIONS])).map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
              {fieldError(errors.honeyType, t('wizard.sample.errors.honeyType'))}
            </Row>

            <Row label={t('wizard.sample.quantity')} required>
              <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                <TextInput type="number" inputMode="decimal" min={0} step="any" value={form.quantity} onChange={update('quantity')} />
                <SelectInput value={form.unit} onChange={update('unit')}>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </SelectInput>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{t('wizard.sample.recommended', { grams: recommended })}</p>
              {fieldError(errors.quantity, t('wizard.sample.errors.quantity'))}
            </Row>

            <Row label={t('wizard.sample.numberOfSamples')} required>
              <TextInput type="number" inputMode="numeric" min={1} max={20} value={form.numberOfSamples} onChange={update('numberOfSamples')} />
              {fieldError(errors.numberOfSamples, t('wizard.sample.errors.numberOfSamples'))}
            </Row>

            <Row label={t('wizard.sample.collectionMethod')} required>
              <SelectInput value={form.harvestSource} onChange={update('harvestSource')}>
                {HARVEST_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {t(`harvestSource.${source}`)}
                  </option>
                ))}
              </SelectInput>
            </Row>

            <Row label={t('wizard.sample.dateTime')} required>
              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
                <TextInput type="date" value={form.date} max={toDateInput(new Date())} onChange={update('date')} />
                <TextInput type="time" value={form.time} onChange={update('time')} />
              </div>
              {fieldError(errors.date, t('wizard.sample.errors.date'))}
            </Row>

            <Row label={t('wizard.sample.gps')} required>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                <div>
                  <TextInput type="number" inputMode="decimal" step="any" value={form.latitude} onChange={update('latitude')} dir="ltr" />
                  <p className="text-[11px] text-gray-400 mt-0.5">{t('wizard.sample.latitude')}</p>
                </div>
                <div>
                  <TextInput type="number" inputMode="decimal" step="any" value={form.longitude} onChange={update('longitude')} dir="ltr" />
                  <p className="text-[11px] text-gray-400 mt-0.5">{t('wizard.sample.longitude')}</p>
                </div>
                <button
                  type="button"
                  onClick={geo.locate}
                  className="rounded-lg border border-[#BFE0CB] bg-[#F2F8F3] text-[#17693F] px-2 min-h-[40px] text-[11px] font-bold flex flex-col items-center justify-center leading-tight"
                >
                  {geo.state.status === 'locating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                  {t('gps.useCurrent')}
                </button>
              </div>
              {geo.state.status === 'error' && <p className="text-[11px] text-[#B42323] mt-1">{t(`gps.errors.${geo.state.reason}`)}</p>}
              {fieldError(errors.position, t('wizard.sample.errors.position'))}
            </Row>

            <Row label={t('wizard.sample.notes')}>
              <TextArea value={form.notes} onChange={update('notes')} maxLength={500} placeholder={t('wizard.sample.notesPlaceholder')} />
              <p className="text-[11px] text-gray-400 text-end tabular-nums">{form.notes.length}/500</p>
            </Row>
          </div>
        </SectionCard>

        <div className="space-y-5 min-w-0">
          <SectionCard
            title={t('wizard.sample.photos')}
            icon={<Camera className="w-5 h-5" />}
            actions={<span className="text-sm text-gray-500 tabular-nums">{t('wizard.sample.photoCount', { count: photos.length, max: 5 })}</span>}
          >
            <PhotoUploader photos={photos} onChange={setPhotos} max={5} />
            <p className="mt-3 text-xs rounded-lg bg-[#EAF1FB] text-[#1D4E89] px-3 py-2">{t('wizard.sample.photosTip')}</p>
          </SectionCard>

          <SectionCard title={t('wizard.sample.locationHeading')} icon={<MapPin className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_170px] gap-3">
              <MapView
                className="h-44"
                singleZoom={13}
                markers={[
                  ...(position ? [{ position, kind: 'pin' as const, title: t('wizard.sample.collectionPoint') }] : []),
                  ...(assignment.coordinates && (!position || (distanceMeters ?? 0) > 50)
                    ? [{ position: assignment.coordinates, kind: 'dot' as const, title: t('wizard.sample.declaredFarm') }]
                    : []),
                ]}
                emptyLabel={t('wizard.sample.noPosition')}
              />
              <div className="space-y-2">
                <div className="rounded-lg bg-[#F6F7F4] p-3 text-xs">
                  <p className="font-bold text-[#0C261B] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {assignment.request.delegation ?? assignment.request.collectionLocation}
                  </p>
                  <p className="text-gray-500 mt-1">{t('common.coordinates')}</p>
                  <p className="font-semibold text-[#0C261B]" dir="ltr">
                    {formatCoords(position) ?? '—'}
                  </p>
                  {accuracy !== null && (
                    <p className="text-[#17693F] mt-1 flex items-center gap-1">
                      <Crosshair className="w-3 h-3" />
                      {t('gps.accuracy', { meters: accuracy })}
                    </p>
                  )}
                </div>
                <Btn variant="secondary" size="sm" className="w-full" onClick={geo.locate} disabled={geo.state.status === 'locating'}>
                  <LocateFixed className="w-4 h-4" />
                  {t('gps.update')}
                </Btn>
              </div>
            </div>
            {geo.state.status === 'ready' && (
              <p className="mt-3 text-xs text-[#17693F] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {t('gps.captured')}
              </p>
            )}
            {distanceMeters !== null && distanceMeters > 2000 && (
              <p className="mt-2 text-xs rounded-lg bg-[#FDF6E7] text-[#96661A] px-3 py-2">
                {t('wizard.sample.farFromFarm', { km: (distanceMeters / 1000).toFixed(1) })}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-[#F1EDE3]">
              <p className="text-sm font-bold text-[#0C261B] mb-3 flex items-center gap-2">
                <CloudSun className="w-4 h-4" />
                {t('weather.heading')}
              </p>
              <WeatherWidget position={position} variant="inline" />
            </div>
          </SectionCard>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <InlineError message={error} />
        </div>
      )}
      {touched && !valid && (
        <div className="mt-4">
          <InlineError message={t('wizard.sample.errors.summary')} />
        </div>
      )}

      <WizardFooter onBack={onBack} onNext={submit} nextLabel={t('common.saveContinue')} isLoading={collect.isPending} />
    </>
  );
};

const RecordedSample: React.FC<{ assignment: AssignmentDetail; onBack: () => void; onNext: () => void }> = ({
  assignment,
  onBack,
  onNext,
}) => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const sample = assignment.sample!;
  return (
    <>
      <SectionCard title={t('wizard.sample.recorded')} icon={<CheckCircle2 className="w-5 h-5 text-[#17693F]" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DefList
            rows={[
              { label: t('wizard.sample.sampleId'), value: sample.sampleCode },
              { label: t('wizard.sample.honeyType'), value: sample.honeyType ?? assignment.request.honeyType },
              { label: t('wizard.sample.quantity'), value: `${quantityInGrams(sample.quantity)} g` },
              { label: t('wizard.sample.numberOfSamples'), value: sample.numberOfSamples },
              { label: t('wizard.sample.dateTime'), value: formatDateTime(sample.collectionDate, locale) },
            ]}
          />
          <PhotoGrid photos={sample.photos} />
        </div>
      </SectionCard>
      <WizardFooter onBack={onBack} onNext={onNext} nextLabel={t('common.continue')} />
    </>
  );
};

// --- Étape 3 : scellé déjà posé ----------------------------------------------

const SealSummary: React.FC<{ assignment: AssignmentDetail; onBack: () => void; onNext: () => void }> = ({
  assignment,
  onBack,
  onNext,
}) => {
  const { t, i18n } = useTranslation('agent');
  const seal = assignment.sample!.seal!;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DefList
          rows={[
            { label: t('seal.number'), value: <span className="font-mono">{seal.sealCode}</span> },
            { label: t('seal.appliedAt'), value: formatDateTime(seal.sealedAt, dateLocale(i18n.language)) },
            { label: t('seal.status'), value: t(`seal.statuses.${seal.status}`) },
          ]}
        />
        {seal.photoUrl && <PhotoGrid photos={[seal.photoUrl]} />}
      </div>
      <WizardFooter onBack={onBack} onNext={onNext} nextLabel={t('common.continue')} />
    </>
  );
};

// --- Étape 4 : confirmation ---------------------------------------------------

const ConfirmationStep: React.FC<{ assignment: AssignmentDetail; onBack: () => void; onDone: () => void }> = ({
  assignment,
  onBack,
  onDone,
}) => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const complete = useCompleteAssignment(assignment.id);
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const sample = assignment.sample;

  if (!sample?.seal) {
    return <InlineError message={t('wizard.confirmation.incomplete')} />;
  }

  const submit = async () => {
    setError('');
    try {
      await complete.mutateAsync({ producerConfirmed: confirmed, notes: notes.trim() || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={t('wizard.confirmation.heading')} icon={<ClipboardList className="w-5 h-5" />}>
          <p className="text-sm text-gray-500 mb-3">{t('wizard.confirmation.description')}</p>
          <DefList
            rows={[
              { label: t('wizard.producer'), value: assignment.request.producer.name },
              { label: t('wizard.location'), value: assignment.request.collectionLocation },
              { label: t('wizard.sample.sampleId'), value: sample.sampleCode },
              { label: t('wizard.sample.honeyType'), value: sample.honeyType ?? assignment.request.honeyType },
              { label: t('wizard.sample.quantity'), value: `${quantityInGrams(sample.quantity)} g × ${sample.numberOfSamples}` },
              { label: t('wizard.sample.dateTime'), value: formatDateTime(sample.collectionDate, locale) },
              { label: t('seal.number'), value: <span className="font-mono">{sample.seal.sealCode}</span> },
            ]}
          />
        </SectionCard>
        <div className="space-y-5">
          <SectionCard title={t('wizard.sample.photos')} icon={<Camera className="w-5 h-5" />}>
            <PhotoGrid photos={[...sample.photos, ...(sample.seal.photoUrl ? [sample.seal.photoUrl] : [])]} />
          </SectionCard>
          <SectionCard title={t('wizard.confirmation.handover')} icon={<CheckCircle2 className="w-5 h-5" />}>
            <label className="flex items-start gap-3 rounded-lg border border-[#EAE1D2] p-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#17693F]"
              />
              <span className="text-sm text-[#0C261B]">
                {t('wizard.confirmation.producerConfirmed', { name: assignment.request.producer.name })}
              </span>
            </label>
            <Field label={t('wizard.confirmation.notes')}>
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </Field>
          </SectionCard>
        </div>
      </div>
      {error && (
        <div className="mt-4">
          <InlineError message={error} />
        </div>
      )}
      <WizardFooter
        onBack={onBack}
        onNext={submit}
        nextLabel={t('wizard.confirmation.submit')}
        isLoading={complete.isPending}
        disabled={!confirmed}
      />
    </>
  );
};

// --- Étape 5 : terminé ---------------------------------------------------------

const CompleteStep: React.FC<{ assignment: AssignmentDetail }> = ({ assignment }) => {
  const { t } = useTranslation('agent');
  const navigate = useNavigate();
  const sample = assignment.sample;
  return (
    <div className="bg-white border border-[#EAE1D2] rounded-xl p-6 sm:p-10 text-center max-w-2xl mx-auto">
      <span className="mx-auto w-16 h-16 rounded-full bg-[#E8F5EC] text-[#17693F] grid place-items-center mb-4">
        <PartyPopper className="w-8 h-8" />
      </span>
      <h2 className="text-xl font-extrabold text-[#0C261B]">{t('wizard.complete.heading')}</h2>
      <p className="text-sm text-gray-500 mt-1">{t('wizard.complete.description')}</p>
      {sample && (
        <div className="mt-5 inline-grid grid-cols-2 gap-4 text-start rounded-xl bg-[#F6F7F4] px-5 py-3">
          <div>
            <p className="text-xs text-gray-500">{t('wizard.sample.sampleId')}</p>
            <p className="font-bold text-[#0C261B] font-mono">{sample.sampleCode}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('seal.number')}</p>
            <p className="font-bold text-[#0C261B] font-mono">{sample.seal?.sealCode ?? '—'}</p>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-600 mt-5">{t('wizard.complete.nextStep')}</p>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        {sample && (
          <Btn className="min-h-[46px]" onClick={() => navigate(`/agent/tracabilite/${sample.id}`)}>
            <Truck className="w-4 h-4" />
            {t('wizard.complete.custody')}
          </Btn>
        )}
        <Btn variant="secondary" className="min-h-[46px]" onClick={() => navigate('/agent/collecte')}>
          <FlaskConical className="w-4 h-4" />
          {t('wizard.complete.nextCollection')}
        </Btn>
        <Btn variant="ghost" className="min-h-[46px]" onClick={() => navigate('/agent')}>
          {t('wizard.complete.dashboard')}
        </Btn>
      </div>
    </div>
  );
};

// --- Éléments communs -----------------------------------------------------------

const Row: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-1 sm:gap-3 sm:items-start">
    <span className="text-sm font-semibold text-[#0C261B] sm:pt-2.5">
      {label}
      {required && <span className="text-[#B42323] ms-0.5">*</span>}
    </span>
    <div className="min-w-0">{children}</div>
  </div>
);

const PhotoGrid: React.FC<{ photos: string[] }> = ({ photos }) => {
  const { t } = useTranslation('agent');
  if (photos.length === 0) return <p className="text-sm text-gray-400">{t('photos.none')}</p>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((url, i) => (
        <a key={`${url}-${i}`} href={resolveFileUrl(url)} target="_blank" rel="noreferrer">
          <img src={resolveFileUrl(url)} alt={t('photos.alt')} className="aspect-square w-full object-cover rounded-lg border border-[#EAE1D2]" />
        </a>
      ))}
    </div>
  );
};

const WizardFooter: React.FC<{
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  isLoading?: boolean;
  disabled?: boolean;
}> = ({ onBack, onNext, nextLabel, isLoading, disabled }) => {
  const { t } = useTranslation('agent');
  return (
    <div className="mt-6 flex justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-lg border border-[#0C261B]/40 bg-white text-[#0C261B] text-sm font-bold px-5 min-h-[46px]"
      >
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        {t('common.back')}
      </button>
      <Btn onClick={onNext} isLoading={isLoading} disabled={disabled} className="min-h-[46px] px-6">
        {nextLabel}
        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
      </Btn>
    </div>
  );
};

function haversine(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
