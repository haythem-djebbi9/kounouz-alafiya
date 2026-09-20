import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Info,
  Lightbulb,
  MapPin,
  Send,
  ShieldCheck,
  Truck,
  Warehouse,
} from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useMyDocuments, useMyFarms, useMyProfile, useRequestDetail, useSaveRequest } from './hooks';
import {
  BEEKEEPING_METHODS,
  FLORAL_ORIGINS,
  GOVERNORATES,
  HIVE_TYPES,
  HONEY_TYPES,
  REQUIRED_DOCUMENT_TYPES,
  SEASONS,
  delegationsOf,
  governorateLabel,
} from './constants';
import {
  Btn,
  BtnLink,
  ErrorBlock,
  Field,
  ImageBanner,
  InfoCard,
  LoadingBlock,
  NAVY,
  NeedHelpCard,
  Notice,
  PageHeader,
  Panel,
  SelectInput,
  Stepper,
  TextArea,
  TextInput,
} from './ui';
import { formatDate, formatNumber } from './utils';
import type { CollectionMethod, FloralCategory, ProducerRequest, RequestInput } from './types';

interface FormState {
  farmId: string;
  farmSize: string;
  preferredCollectionMethod: CollectionMethod | '';
  honeyTypeKey: string;
  honeyTypeOther: string;
  otherCategory: FloralCategory;
  floralOriginKey: string;
  quantity: string;
  seasonKey: string;
  seasonYear: string;
  harvestStartDate: string;
  harvestEndDate: string;
  governorate: string;
  delegation: string;
  coordinates: string;
  hivesCount: string;
  beekeepingMethod: string;
  hiveType: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  farmId: '',
  farmSize: '',
  preferredCollectionMethod: '',
  honeyTypeKey: '',
  honeyTypeOther: '',
  otherCategory: 'MONOFLORAL',
  floralOriginKey: '',
  quantity: '',
  seasonKey: '',
  seasonYear: String(new Date().getFullYear()),
  harvestStartDate: '',
  harvestEndDate: '',
  governorate: '',
  delegation: '',
  coordinates: '',
  hivesCount: '',
  beekeepingMethod: '',
  hiveType: '',
  description: '',
};

// Retrouve la clé d'une valeur enregistrée sous forme de libellé traduit,
// quelle que soit la langue utilisée au moment de l'enregistrement.
function findKey(label: string | null, keys: readonly string[], prefix: string): string | null {
  if (!label) return null;
  for (const lang of ['ar', 'fr', 'en']) {
    const fixedT = i18n.getFixedT(lang, 'producer');
    const key = keys.find((k) => fixedT(`${prefix}.${k}`) === label);
    if (key) return key;
  }
  return null;
}

function parseCoordinates(value: string): { latitude: number; longitude: number } | null | 'invalid' {
  if (!value.trim()) return null;
  const parts = value.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return 'invalid';
  const [latitude, longitude] = parts;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return 'invalid';
  return { latitude, longitude };
}

const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : '');

export const NewRequestPage: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation(['producer', 'common']);
  const lang = i18nInstance.language;
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const { data: existing, isLoading: loadingExisting, isError: existingError } = useRequestDetail(routeId);
  const { data: profile } = useMyProfile();
  const { data: documents = [] } = useMyDocuments();
  const { data: farms = [] } = useMyFarms();
  const activeFarms = farms.filter((farm) => farm.isActive);
  const saveRequest = useSaveRequest();

  const [draftId, setDraftId] = useState<string | undefined>(routeId);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'confirm', string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<ProducerRequest | null>(null);
  const [initialized, setInitialized] = useState(!routeId);

  // Pré-remplissage : brouillon existant, sinon localisation de l'exploitation.
  useEffect(() => {
    if (routeId && existing && !initialized) {
      const honeyKey = findKey(existing.honeyType, HONEY_TYPES.map((h) => h.key), 'honey.types');
      const [seasonKey, seasonYear] = (existing.productionSeason ?? '').split('_');
      setForm({
        farmId: existing.farmId ?? '',
        farmSize: existing.farmSize ?? '',
        preferredCollectionMethod: existing.preferredCollectionMethod ?? '',
        honeyTypeKey: existing.honeyType ? (honeyKey ?? 'OTHER') : '',
        honeyTypeOther: existing.honeyType && !honeyKey ? existing.honeyType : '',
        otherCategory: existing.floralCategory ?? 'MONOFLORAL',
        floralOriginKey: findKey(existing.floralOrigin, FLORAL_ORIGINS, 'honey.origins') ?? '',
        quantity: Number(existing.quantity) > 0 ? String(Number(existing.quantity)) : '',
        seasonKey: SEASONS.includes(seasonKey as (typeof SEASONS)[number]) ? seasonKey : '',
        seasonYear: seasonYear ?? String(new Date().getFullYear()),
        harvestStartDate: toDateInput(existing.harvestStartDate),
        harvestEndDate: toDateInput(existing.harvestEndDate),
        governorate: existing.governorate ?? '',
        delegation: existing.delegation ?? '',
        coordinates: existing.latitude != null && existing.longitude != null ? `${existing.latitude}, ${existing.longitude}` : '',
        hivesCount: existing.hivesCount != null ? String(existing.hivesCount) : '',
        beekeepingMethod: existing.beekeepingMethod ?? '',
        hiveType: existing.hiveType ?? '',
        description: existing.description ?? '',
      });
      setInitialized(true);
    }
  }, [routeId, existing, initialized]);

  // Nouvelle demande : rucher principal proposé par défaut (ERD : demande -> rucher).
  useEffect(() => {
    if (!routeId && activeFarms.length > 0) {
      setForm((f) => (f.farmId ? f : { ...f, farmId: (activeFarms.find((farm) => farm.isPrimary) ?? activeFarms[0]).id }));
    }
  }, [routeId, activeFarms.length]);

  const chooseFarm = (farmId: string) => {
    const farm = activeFarms.find((item) => item.id === farmId);
    setForm((f) => ({
      ...f,
      farmId,
      ...(farm
        ? {
            governorate: farm.governorate ?? f.governorate,
            delegation: farm.delegation ?? f.delegation,
            hivesCount: farm.hivesCount != null ? String(farm.hivesCount) : f.hivesCount,
            coordinates:
              farm.latitude != null && farm.longitude != null ? `${farm.latitude}, ${farm.longitude}` : f.coordinates,
          }
        : {}),
    }));
  };

  useEffect(() => {
    if (!routeId && profile) {
      setForm((f) => ({
        ...f,
        governorate: f.governorate || profile.farmGovernorate || '',
        delegation: f.delegation || profile.farmDelegation || '',
        hivesCount: f.hivesCount || (profile.hivesCount != null ? String(profile.hivesCount) : ''),
        coordinates:
          f.coordinates || (profile.latitude != null && profile.longitude != null ? `${profile.latitude}, ${profile.longitude}` : ''),
      }));
    }
  }, [routeId, profile]);

  const requiredDocsReady = REQUIRED_DOCUMENT_TYPES.filter((type) =>
    documents.some((d) => d.type === type && d.status !== 'REJECTED'),
  ).length;
  const requiredDocsVerified = REQUIRED_DOCUMENT_TYPES.filter((type) =>
    documents.some((d) => d.type === type && d.status === 'VERIFIED'),
  ).length;
  const docsReady = requiredDocsReady === REQUIRED_DOCUMENT_TYPES.length;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const honeyTypeLabel =
    form.honeyTypeKey === 'OTHER' ? form.honeyTypeOther.trim() : form.honeyTypeKey ? t(`producer:honey.types.${form.honeyTypeKey}`) : '';
  const floralCategory: FloralCategory | undefined =
    form.honeyTypeKey === 'OTHER' ? form.otherCategory : HONEY_TYPES.find((h) => h.key === form.honeyTypeKey)?.category;

  const toInput = (): RequestInput => {
    const coords = parseCoordinates(form.coordinates);
    return {
      honeyType: honeyTypeLabel || undefined,
      floralCategory,
      floralOrigin: form.floralOriginKey ? t(`producer:honey.origins.${form.floralOriginKey}`) : undefined,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      farmSize: form.farmSize || undefined,
      productionSeason: form.seasonKey ? `${form.seasonKey}_${form.seasonYear}` : undefined,
      harvestStartDate: form.harvestStartDate || undefined,
      harvestEndDate: form.harvestEndDate || undefined,
      governorate: form.governorate || undefined,
      delegation: form.delegation || undefined,
      ...(coords && coords !== 'invalid' ? coords : {}),
      hivesCount: form.hivesCount ? Number(form.hivesCount) : undefined,
      beekeepingMethod: form.beekeepingMethod || undefined,
      hiveType: form.hiveType || undefined,
      description: form.description || undefined,
      preferredCollectionMethod: form.preferredCollectionMethod || undefined,
      farmId: form.farmId || undefined,
    };
  };

  const validateStep = (index: number) => {
    const next: typeof errors = {};
    const required = t('producer:common.required');
    if (index === 0 && !form.preferredCollectionMethod) next.preferredCollectionMethod = t('producer:wizard.errors.method');
    if (index === 1) {
      if (!form.honeyTypeKey || (form.honeyTypeKey === 'OTHER' && !form.honeyTypeOther.trim())) next.honeyTypeKey = required;
      if (!(Number(form.quantity) > 0)) next.quantity = t('producer:wizard.errors.quantity');
      if (!form.seasonKey) next.seasonKey = required;
      if (!form.governorate) next.governorate = required;
      if (!form.delegation.trim()) next.delegation = required;
      if (parseCoordinates(form.coordinates) === 'invalid') next.coordinates = t('producer:wizard.errors.coordinates');
      if (form.harvestStartDate && form.harvestEndDate && form.harvestEndDate < form.harvestStartDate) {
        next.harvestEndDate = t('producer:wizard.errors.harvestDates');
      }
    }
    if (index === 2 && !confirmed) next.confirm = t('producer:wizard.errors.confirm');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = async (submit: boolean) => {
    setApiError(null);
    setNotice(null);
    try {
      const saved = await saveRequest.mutateAsync({ id: draftId, input: { ...toInput(), submit } });
      if (submit) {
        setSubmitted(saved);
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (!draftId) {
          setDraftId(saved.id);
          navigate(`/producteur/demandes/${saved.id}/modifier`, { replace: true });
        }
        setNotice(t('producer:wizard.draftSaved'));
      }
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step === 2) {
      void persist(true);
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const steps = [
    t('producer:wizard.steps.request'),
    t('producer:wizard.steps.honey'),
    t('producer:wizard.steps.review'),
    t('producer:wizard.steps.underReview'),
  ];

  const titles = [t('producer:wizard.titles.request'), t('producer:wizard.titles.honey'), t('producer:wizard.titles.review'), t('producer:wizard.titles.underReview')];
  const subtitles = [
    t('producer:wizard.subtitles.request'),
    t('producer:wizard.subtitles.honey'),
    t('producer:wizard.subtitles.review'),
    t('producer:wizard.subtitles.underReview'),
  ];

  if (routeId && loadingExisting) return <LoadingBlock />;
  if (routeId && (existingError || !existing)) return <ErrorBlock message={t('producer:requestDetail.notFound')} />;
  if (routeId && existing && existing.status !== 'DRAFT' && !submitted) {
    return (
      <InfoCard tone="gold" icon={<Info className="w-5 h-5 text-[#A56A0B]" />} title={t('producer:wizard.alreadySubmittedTitle')}>
        <p>{t('producer:wizard.alreadySubmittedBody')}</p>
        <Link to={`/producteur/demandes/${existing.id}`} className="inline-block mt-2 font-bold text-[#1F4FA3] hover:underline">
          {t('producer:requests.trackProgress')}
        </Link>
      </InfoCard>
    );
  }

  const breadcrumb = [
    { label: t('producer:nav.dashboard'), to: '/producteur' },
    { label: t('producer:nav.requests'), to: '/producteur/demandes' },
    ...(existing?.requestCode || submitted?.requestCode ? [{ label: (submitted?.requestCode ?? existing?.requestCode)! }] : []),
    { label: steps[step] },
  ];

  const governorate = GOVERNORATES.find((g) => g.name === form.governorate);
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  return (
    <div>
      <PageHeader title={titles[step]} subtitle={subtitles[step]} breadcrumb={breadcrumb} />

      <div className="mb-6 max-w-4xl mx-auto">
        <Stepper steps={steps} current={step} />
      </div>

      {apiError && <Notice tone="error" onClose={() => setApiError(null)} className="mb-4">{apiError}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice(null)} className="mb-4">{notice}</Notice>}

      {step === 3 && submitted ? (
        <SubmittedState request={submitted} />
      ) : (
        <div className="grid xl:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-4 min-w-0">
            {step === 0 && (
              <>
                <div className="relative overflow-hidden rounded-xl bg-[#EEF4EE] border border-[#DCEAE0] min-h-[120px]">
                  <img src="/images/beekeeper.jpg" alt="" className="absolute inset-y-0 end-0 w-1/2 h-full object-cover object-left opacity-90 hidden sm:block" />
                  <div className="absolute inset-y-0 end-0 w-1/2 bg-gradient-to-r rtl:bg-gradient-to-l from-[#EEF4EE] to-transparent hidden sm:block" />
                  <div className="relative flex items-center gap-4 p-5 sm:max-w-[60%]">
                    <span className="w-14 h-14 rounded-full bg-[#0B4A2F] text-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-7 h-7" />
                    </span>
                    <div>
                      <p className={`font-bold ${NAVY}`}>{t('producer:wizard.hero.title')}</p>
                      <p className="text-sm text-[#374151] mt-1">{t('producer:wizard.hero.body')}</p>
                    </div>
                  </div>
                </div>

                <Panel title={`1. ${t('producer:wizard.section.producer')}`} subtitle={t('producer:wizard.section.producerHint')}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label={t('producer:wizard.fields.producerName')}>
                      <TextInput value={profile?.name ?? ''} disabled />
                    </Field>
                    <Field label={t('producer:wizard.fields.farmName')}>
                      <TextInput value={profile?.farmName ?? ''} disabled />
                    </Field>
                    <Field
                      label={t('producer:wizard.fields.farmLocation')}
                      hint={
                        <Link to="/producteur/profil?tab=farm" className="font-semibold text-[#1F4FA3] hover:underline">
                          {t('producer:wizard.editFarm')}
                        </Link>
                      }
                    >
                      <TextInput
                        value={
                          profile?.farmGovernorate
                            ? [profile.farmDelegation, governorateLabel(profile.farmGovernorate, lang)].filter(Boolean).join(', ')
                            : (profile?.location ?? '')
                        }
                        leading={<MapPin className="w-4 h-4" />}
                        disabled
                      />
                    </Field>
                    <Field label={t('producer:wizard.fields.farmSize')}>
                      <TextInput
                        value={form.farmSize}
                        onChange={(e) => set('farmSize', e.target.value)}
                        placeholder={t('producer:wizard.placeholders.farmSize')}
                        maxLength={60}
                      />
                    </Field>
                  </div>
                </Panel>

                <Panel title={`2. ${t('producer:wizard.section.collection')}`} subtitle={t('producer:wizard.section.collectionHint')}>
                  <div className="grid sm:grid-cols-2 gap-3" role="radiogroup">
                    {(['KOUNOUZ_VISIT', 'PRODUCER_DELIVERY'] as CollectionMethod[]).map((method) => {
                      const selected = form.preferredCollectionMethod === method;
                      const Icon = method === 'KOUNOUZ_VISIT' ? Truck : Warehouse;
                      return (
                        <button
                          key={method}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => set('preferredCollectionMethod', method)}
                          className={`text-start rounded-xl border-2 p-4 transition-colors ${
                            selected ? 'border-[#0B4A2F] bg-[#F0F8F2]' : 'border-[#E1E5DF] hover:border-[#B9C6BC]'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span className="w-10 h-10 rounded-full bg-[#DDEFE3] text-[#0B4A2F] flex items-center justify-center">
                              <Icon className="w-5 h-5" />
                            </span>
                            {selected && <CheckCircle2 className="w-5 h-5 text-[#0B4A2F]" />}
                          </span>
                          <span className={`block font-bold mt-3 ${NAVY}`}>{t(`producer:collectionMethod.${method}.title`)}</span>
                          <span className="block text-sm text-gray-600 mt-1">{t(`producer:collectionMethod.${method}.description`)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.preferredCollectionMethod && (
                    <p className="text-xs font-semibold text-rose-600 mt-2">{errors.preferredCollectionMethod}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-3">{t('producer:wizard.section.collectionNote')}</p>
                </Panel>

                <Panel title={`3. ${t('producer:wizard.section.documents')}`} subtitle={t('producer:wizard.section.documentsHint')}>
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 ${
                      docsReady ? 'bg-[#F0F8F2] border-[#D9ECDF]' : 'bg-[#FFF8EA] border-[#F5E5C2]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                          docsReady ? 'bg-[#0B4A2F] text-white' : 'bg-[#FBE9C5] text-[#A56A0B]'
                        }`}
                      >
                        <FileCheck2 className="w-5 h-5" />
                      </span>
                      <div>
                        <p className={`font-bold ${NAVY}`}>
                          {t('producer:wizard.docsCount', { ready: requiredDocsReady, total: REQUIRED_DOCUMENT_TYPES.length })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {!docsReady
                            ? t('producer:wizard.docsMissing')
                            : requiredDocsVerified === REQUIRED_DOCUMENT_TYPES.length
                              ? t('producer:wizard.docsVerified')
                              : t('producer:wizard.docsPending')}
                        </p>
                      </div>
                    </div>
                    <BtnLink to="/producteur/profil?tab=documents" variant="outline" size="sm">
                      {t('producer:wizard.manageDocuments')}
                    </BtnLink>
                  </div>
                </Panel>
              </>
            )}

            {step === 1 && (
              <>
                <Panel title={`1. ${t('producer:wizard.section.honey')}`} subtitle={t('producer:wizard.section.honeyHint')}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label={t('producer:wizard.fields.honeyType')} required error={errors.honeyTypeKey}>
                      <SelectInput value={form.honeyTypeKey} onChange={(e) => set('honeyTypeKey', e.target.value)}>
                        <option value="">{t('producer:common.select')}</option>
                        {HONEY_TYPES.map((h) => (
                          <option key={h.key} value={h.key}>
                            {t(`producer:honey.types.${h.key}`)}
                          </option>
                        ))}
                        <option value="OTHER">{t('producer:common.otherSpecify')}</option>
                      </SelectInput>
                    </Field>
                    <Field label={t('producer:wizard.fields.floralOrigin')}>
                      <SelectInput value={form.floralOriginKey} onChange={(e) => set('floralOriginKey', e.target.value)}>
                        <option value="">{t('producer:wizard.placeholders.floralOrigin')}</option>
                        {FLORAL_ORIGINS.map((key) => (
                          <option key={key} value={key}>
                            {t(`producer:honey.origins.${key}`)}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label={t('producer:wizard.fields.quantity')} required error={errors.quantity}>
                      <TextInput
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={form.quantity}
                        onChange={(e) => set('quantity', e.target.value)}
                        placeholder="500"
                      />
                    </Field>
                    {form.honeyTypeKey === 'OTHER' && (
                      <>
                        <Field label={t('producer:wizard.fields.honeyTypeOther')} required className="sm:col-span-1">
                          <TextInput value={form.honeyTypeOther} onChange={(e) => set('honeyTypeOther', e.target.value)} maxLength={80} />
                        </Field>
                        <Field label={t('producer:wizard.fields.floralCategory')}>
                          <SelectInput value={form.otherCategory} onChange={(e) => set('otherCategory', e.target.value as FloralCategory)}>
                            <option value="MONOFLORAL">{t('producer:floralCategory.MONOFLORAL')}</option>
                            <option value="MULTIFLORAL">{t('producer:floralCategory.MULTIFLORAL')}</option>
                          </SelectInput>
                        </Field>
                        <span className="hidden lg:block" />
                      </>
                    )}
                    <Field label={t('producer:wizard.fields.season')} required error={errors.seasonKey}>
                      <div className="grid grid-cols-[1fr_96px] gap-2">
                        <SelectInput value={form.seasonKey} onChange={(e) => set('seasonKey', e.target.value)} leading={<CalendarDays className="w-4 h-4" />}>
                          <option value="">{t('producer:common.select')}</option>
                          {SEASONS.map((s) => (
                            <option key={s} value={s}>
                              {t(`producer:honey.seasons.${s}`)}
                            </option>
                          ))}
                        </SelectInput>
                        <SelectInput value={form.seasonYear} onChange={(e) => set('seasonYear', e.target.value)} aria-label={t('producer:wizard.fields.year')}>
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </SelectInput>
                      </div>
                    </Field>
                    <Field label={t('producer:wizard.fields.harvestStart')}>
                      <TextInput type="date" value={form.harvestStartDate} onChange={(e) => set('harvestStartDate', e.target.value)} />
                    </Field>
                    <Field label={t('producer:wizard.fields.harvestEnd')} error={errors.harvestEndDate}>
                      <TextInput type="date" value={form.harvestEndDate} min={form.harvestStartDate || undefined} onChange={(e) => set('harvestEndDate', e.target.value)} />
                    </Field>
                  </div>
                </Panel>

                <Panel title={`2. ${t('producer:wizard.section.location')}`} subtitle={t('producer:wizard.section.locationHint')}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeFarms.length > 0 && (
                      <Field
                        label={t('producer:farms.requestFarm')}
                        hint={t('producer:farms.requestFarmHint')}
                        className="sm:col-span-2 lg:col-span-3"
                      >
                        <SelectInput value={form.farmId} onChange={(e) => chooseFarm(e.target.value)}>
                          {activeFarms.map((farm) => (
                            <option key={farm.id} value={farm.id}>
                              {farm.name} — {farm.farmCode}
                              {farm.isPrimary ? ` (${t('producer:farms.primary')})` : ''}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                    )}
                    <Field label={t('producer:fields.governorate')} required error={errors.governorate}>
                      <SelectInput
                        value={form.governorate}
                        onChange={(e) => {
                          set('governorate', e.target.value);
                          set('delegation', '');
                        }}
                      >
                        <option value="">{t('producer:common.select')}</option>
                        {GOVERNORATES.map((g) => (
                          <option key={g.name} value={g.name}>
                            {lang === 'ar' ? g.ar : g.name}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label={t('producer:fields.delegation')} required error={errors.delegation}>
                      <TextInput
                        list="request-delegations"
                        value={form.delegation}
                        onChange={(e) => set('delegation', e.target.value)}
                        placeholder={governorate ? t('producer:common.selectOrType') : t('producer:fields.chooseGovernorateFirst')}
                        disabled={!form.governorate}
                      />
                      <datalist id="request-delegations">
                        {delegationsOf(form.governorate).map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </Field>
                    <Field label={t('producer:wizard.fields.coordinates')} error={errors.coordinates}>
                      <TextInput
                        value={form.coordinates}
                        onChange={(e) => set('coordinates', e.target.value)}
                        placeholder="36.7531, 10.4205"
                        leading={<MapPin className="w-4 h-4" />}
                        dir="ltr"
                      />
                    </Field>
                  </div>
                </Panel>

                <Panel title={`3. ${t('producer:wizard.section.beekeeping')}`} subtitle={t('producer:wizard.section.beekeepingHint')}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label={t('producer:wizard.fields.hives')}>
                      <TextInput type="number" min={0} value={form.hivesCount} onChange={(e) => set('hivesCount', e.target.value)} placeholder="120" />
                    </Field>
                    <Field label={t('producer:wizard.fields.method')}>
                      <SelectInput value={form.beekeepingMethod} onChange={(e) => set('beekeepingMethod', e.target.value)}>
                        <option value="">{t('producer:common.select')}</option>
                        {BEEKEEPING_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {t(`producer:honey.methods.${m}`)}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label={t('producer:wizard.fields.hiveType')}>
                      <SelectInput value={form.hiveType} onChange={(e) => set('hiveType', e.target.value)}>
                        <option value="">{t('producer:common.select')}</option>
                        {HIVE_TYPES.map((h) => (
                          <option key={h} value={h}>
                            {t(`producer:honey.hives.${h}`)}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label={t('producer:wizard.fields.additionalInfo')} className="sm:col-span-2 lg:col-span-3">
                      <TextArea
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        maxLength={500}
                        placeholder={t('producer:wizard.placeholders.additionalInfo')}
                      />
                    </Field>
                  </div>
                  <InfoCard tone="blue" className="mt-4" icon={<Info className="w-5 h-5 text-[#1F5F9C]" />} title={t('producer:wizard.nextTitle')}>
                    <p>{t('producer:wizard.nextBody')}</p>
                    <p className="font-bold mt-1">{t('producer:wizard.batchIdNote')}</p>
                  </InfoCard>
                </Panel>
              </>
            )}

            {step === 2 && (
              <>
                <ReviewSection title={t('producer:wizard.section.producer')} onEdit={() => setStep(0)}>
                  <ReviewRow label={t('producer:wizard.fields.producerName')} value={profile?.name} />
                  <ReviewRow label={t('producer:wizard.fields.farmName')} value={profile?.farmName} />
                  <ReviewRow label={t('producer:wizard.fields.farmSize')} value={form.farmSize} />
                  <ReviewRow
                    label={t('producer:wizard.section.collection')}
                    value={form.preferredCollectionMethod ? t(`producer:collectionMethod.${form.preferredCollectionMethod}.title`) : ''}
                  />
                  <ReviewRow label={t('producer:wizard.section.documents')} value={t('producer:wizard.docsCount', { ready: requiredDocsReady, total: REQUIRED_DOCUMENT_TYPES.length })} />
                </ReviewSection>
                <ReviewSection title={t('producer:wizard.section.honey')} onEdit={() => setStep(1)}>
                  <ReviewRow label={t('producer:wizard.fields.honeyType')} value={honeyTypeLabel} />
                  <ReviewRow label={t('producer:wizard.fields.floralCategory')} value={floralCategory ? t(`producer:floralCategory.${floralCategory}`) : ''} />
                  <ReviewRow label={t('producer:wizard.fields.floralOrigin')} value={form.floralOriginKey ? t(`producer:honey.origins.${form.floralOriginKey}`) : ''} />
                  <ReviewRow label={t('producer:wizard.fields.quantity')} value={form.quantity ? t('producer:common.kg', { value: formatNumber(Number(form.quantity), lang, 1) }) : ''} />
                  <ReviewRow label={t('producer:wizard.fields.season')} value={form.seasonKey ? `${t(`producer:honey.seasons.${form.seasonKey}`)} ${form.seasonYear}` : ''} />
                  <ReviewRow
                    label={t('producer:wizard.fields.harvestPeriod')}
                    value={form.harvestStartDate || form.harvestEndDate ? `${formatDate(form.harvestStartDate || null, lang)} → ${formatDate(form.harvestEndDate || null, lang)}` : ''}
                  />
                </ReviewSection>
                <ReviewSection title={t('producer:wizard.section.location')} onEdit={() => setStep(1)}>
                  <ReviewRow label={t('producer:fields.governorate')} value={governorateLabel(form.governorate, lang)} />
                  <ReviewRow label={t('producer:fields.delegation')} value={form.delegation} />
                  <ReviewRow label={t('producer:wizard.fields.coordinates')} value={form.coordinates} />
                </ReviewSection>
                <ReviewSection title={t('producer:wizard.section.beekeeping')} onEdit={() => setStep(1)}>
                  <ReviewRow label={t('producer:wizard.fields.hives')} value={form.hivesCount} />
                  <ReviewRow label={t('producer:wizard.fields.method')} value={form.beekeepingMethod ? t(`producer:honey.methods.${form.beekeepingMethod}`) : ''} />
                  <ReviewRow label={t('producer:wizard.fields.hiveType')} value={form.hiveType ? t(`producer:honey.hives.${form.hiveType}`) : ''} />
                  <ReviewRow label={t('producer:wizard.fields.additionalInfo')} value={form.description} />
                </ReviewSection>

                {!docsReady && (
                  <Notice tone="error">
                    {t('producer:wizard.docsBlocking')}{' '}
                    <Link to="/producteur/profil?tab=documents" className="underline">
                      {t('producer:wizard.manageDocuments')}
                    </Link>
                  </Notice>
                )}

                <Panel>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => {
                        setConfirmed(e.target.checked);
                        setErrors((er) => ({ ...er, confirm: undefined }));
                      }}
                      className="mt-1 w-4 h-4 accent-[#0B4A2F]"
                    />
                    <span className="text-sm text-[#374151]">{t('producer:wizard.confirmStatement')}</span>
                  </label>
                  {errors.confirm && <p className="text-xs font-semibold text-rose-600 mt-2">{errors.confirm}</p>}
                </Panel>
              </>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex gap-2">
                {step > 0 && (
                  <Btn variant="outline" onClick={() => setStep((s) => s - 1)}>
                    {t('common:actions.previous')}
                  </Btn>
                )}
                <Btn variant="light" onClick={() => void persist(false)} loading={saveRequest.isPending && !submitted}>
                  {t('producer:wizard.saveDraft')}
                </Btn>
              </div>
              <Btn onClick={goNext} loading={saveRequest.isPending && step === 2} disabled={step === 2 && !docsReady}>
                {step === 2 ? <Send className="w-4 h-4 rtl:-scale-x-100" /> : null}
                {step === 0 && t('producer:wizard.continueToHoney')}
                {step === 1 && t('producer:wizard.continueToReview')}
                {step === 2 && t('producer:wizard.submit')}
                {step < 2 && <ChevronRight className="w-4 h-4 rtl:rotate-180" />}
              </Btn>
            </div>
          </div>

          <aside className="space-y-4">
            {step === 0 && (
              <>
                <Panel title={t('producer:wizard.process.title')} icon={<ShieldCheck className="w-5 h-5" />}>
                  <ol className="space-y-3">
                    {(['submit', 'review', 'collection', 'analysis', 'verified'] as const).map((key, idx) => (
                      <li key={key} className="flex gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx === 0 ? 'bg-[#0B4A2F] text-white' : 'bg-[#E9EDF5] text-[#14215B]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className={`text-sm font-bold ${NAVY}`}>{t(`producer:wizard.process.${key}.title`)}</p>
                          <p className="text-xs text-gray-600">{t(`producer:wizard.process.${key}.body`)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Panel>
                <InfoCard tone="gold" title={t('producer:wizard.notes.title')}>
                  <ul className="space-y-1.5 mt-1">
                    {(t('producer:wizard.notes.items', { returnObjects: true }) as string[]).map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check className="w-4 h-4 text-[#0B4A2F] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </InfoCard>
                <NeedHelpCard />
              </>
            )}
            {step === 1 && (
              <>
                <InfoCard tone="blue" icon={<Info className="w-5 h-5 text-[#1F5F9C]" />} title={t('producer:wizard.importantTitle')}>
                  <p>{t('producer:wizard.importantBody')}</p>
                </InfoCard>
                <ImageBanner image="/images/beekeeper.jpg" title={t('producer:brand.promoTitle')} className="h-28" />
                <InfoCard tone="gold" icon={<Lightbulb className="w-5 h-5 text-[#D08C1A]" />} title={t('producer:wizard.tips.title')}>
                  <ul className="list-disc ps-4 space-y-1">
                    {(t('producer:wizard.tips.items', { returnObjects: true }) as string[]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </InfoCard>
                <Panel title={t('producer:wizard.examplesTitle')} icon={<CheckCircle2 className="w-5 h-5" />}>
                  <div className="flex flex-wrap gap-2">
                    {FLORAL_ORIGINS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set('floralOriginKey', key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                          form.floralOriginKey === key
                            ? 'bg-[#0B4A2F] border-[#0B4A2F] text-white'
                            : 'bg-[#F4F6F3] border-[#E6E8E3] text-[#27315F] hover:border-[#0B4A2F]'
                        }`}
                      >
                        {t(`producer:honey.origins.${key}`)}
                      </button>
                    ))}
                  </div>
                </Panel>
                <NeedHelpCard />
              </>
            )}
            {step === 2 && (
              <>
                <InfoCard tone="blue" icon={<Info className="w-5 h-5 text-[#1F5F9C]" />} title={t('producer:wizard.nextTitle')}>
                  <p>{t('producer:wizard.nextBody')}</p>
                </InfoCard>
                <InfoCard tone="green" icon={<ShieldCheck className="w-5 h-5 text-[#17693F]" />} title={t('producer:wizard.controlTitle')}>
                  <p>{t('producer:wizard.controlBody')}</p>
                </InfoCard>
                <NeedHelpCard />
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

const ReviewSection: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({ title, onEdit, children }) => {
  const { t } = useTranslation('common');
  return (
    <Panel
      title={title}
      action={
        <button onClick={onEdit} className="text-sm font-bold text-[#1F4FA3] hover:underline">
          {t('actions.edit')}
        </button>
      }
      bodyClassName="px-4 sm:px-5 pb-3 pt-2"
    >
      <dl className="divide-y divide-[#EEF0EC]">{children}</dl>
    </Panel>
  );
};

const ReviewRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 py-2.5 text-sm">
    <dt className="text-gray-500">{label}</dt>
    <dd className="font-semibold text-[#14215B] break-words">{value || '—'}</dd>
  </div>
);

const SubmittedState: React.FC<{ request: ProducerRequest }> = ({ request }) => {
  const { t } = useTranslation(['producer', 'common']);
  return (
    <div className="max-w-2xl mx-auto">
      <Panel bodyClassName="p-6 sm:p-10 text-center">
        <span className="mx-auto w-16 h-16 rounded-full bg-[#E7F4EC] text-[#17693F] flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </span>
        <h2 className={`text-2xl font-extrabold mt-4 ${NAVY}`}>{t('producer:wizard.success.title')}</h2>
        <p className="text-gray-600 mt-2">{t('producer:wizard.success.body')}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F1F4F8] px-4 py-2 text-sm">
          {t('producer:wizard.success.reference')}
          <span className="font-mono font-bold text-[#14215B]">{request.requestCode}</span>
        </p>
        <div className="text-start mt-6 space-y-3">
          {(['review', 'collection', 'analysis', 'verified'] as const).map((key, idx) => (
            <div key={key} className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-[#E9EDF5] text-[#14215B] flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
              <div>
                <p className={`text-sm font-bold ${NAVY}`}>{t(`producer:wizard.process.${key}.title`)}</p>
                <p className="text-xs text-gray-600">{t(`producer:wizard.process.${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
          <BtnLink to={`/producteur/demandes/${request.id}`}>{t('producer:requests.trackProgress')}</BtnLink>
          <BtnLink to="/producteur" variant="outline">
            {t('producer:nav.dashboard')}
          </BtnLink>
        </div>
      </Panel>
    </div>
  );
};
