import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Expand, Home, ImagePlus, Leaf, LocateFixed, MapPin, Save, Sprout, X, FileText, Image } from 'lucide-react';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import { useUpdateMyProfile, useUploadProducerImage } from '../hooks';
import {
  ACTIVITY_TYPES,
  FLORAL_ORIGINS,
  GOVERNORATES,
  REGISTRATION_STATUSES,
  delegationsOf,
} from '../constants';
import { Btn, Field, NAVY, Notice, Panel, SelectInput, TextArea, TextInput } from '../ui';
import type { ProducerProfile } from '../types';

const MAX_PHOTOS = 8;

const toForm = (p: ProducerProfile) => ({
  farmName: p.farmName,
  activityType: p.activityType ?? '',
  registrationStatus: p.registrationStatus ?? '',
  registrationNumber: p.registrationNumber ?? '',
  farmGovernorate: p.farmGovernorate ?? '',
  farmDelegation: p.farmDelegation ?? '',
  farmAddress: p.farmAddress ?? '',
  gps: p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : '',
  farmPhotos: p.farmPhotos,
  hivesCount: p.hivesCount != null ? String(p.hivesCount) : '',
  productionStartMonth: p.productionStartMonth ? String(p.productionStartMonth) : '',
  productionEndMonth: p.productionEndMonth ? String(p.productionEndMonth) : '',
  mainFlora: p.mainFlora,
  annualProductionKg: p.annualProductionKg ? String(Number(p.annualProductionKg)) : '',
  description: p.description ?? '',
});

function parseGps(value: string) {
  const parts = value.split(',').map((v) => Number(v.trim()));
  if (parts.length !== 2 || parts.some(Number.isNaN) || Math.abs(parts[0]) > 90 || Math.abs(parts[1]) > 180) return null;
  return { latitude: parts[0], longitude: parts[1] };
}

export const FarmInfoTab: React.FC<{ profile: ProducerProfile }> = ({ profile }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const update = useUpdateMyProfile();
  const upload = useUploadProducerImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => toForm(profile));
  const [floraInput, setFloraInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => setForm(toForm(profile)), [profile]);

  const set = <K extends keyof ReturnType<typeof toForm>>(key: K, value: ReturnType<typeof toForm>[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const coords = parseGps(form.gps);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2026, i, 1).toLocaleDateString(dateLocale(lang), { month: 'short' }),
  }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('gps', `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocating(false);
      },
      () => {
        setNotice({ tone: 'error', text: t('producer:profile.farm.locationDenied') });
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const addFlora = (value: string) => {
    const clean = value.trim();
    if (!clean || form.mainFlora.includes(clean)) return;
    set('mainFlora', [...form.mainFlora, clean]);
    setFloraInput('');
  };

  const handlePhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setNotice(null);
    const room = MAX_PHOTOS - form.farmPhotos.length;
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        urls.push((await upload.mutateAsync(file)).url);
      }
      set('farmPhotos', [...form.farmPhotos, ...urls]);
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : t('common:status.error') });
    }
  };

  const handleSave = async () => {
    setNotice(null);
    const next: Record<string, string> = {};
    if (!form.farmName.trim()) next.farmName = t('producer:common.required');
    if (form.gps && !coords) next.gps = t('producer:wizard.errors.coordinates');
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await update.mutateAsync({
        farmName: form.farmName.trim(),
        activityType: form.activityType || undefined,
        registrationStatus: form.registrationStatus || undefined,
        registrationNumber: form.registrationNumber,
        farmGovernorate: form.farmGovernorate || undefined,
        farmDelegation: form.farmDelegation,
        farmAddress: form.farmAddress,
        ...(coords ?? {}),
        // L'ancienne "localisation" libre reste alimentée pour les écrans existants.
        ...(form.farmGovernorate ? { location: [form.farmDelegation, form.farmGovernorate].filter(Boolean).join(', ') } : {}),
        farmPhotos: form.farmPhotos,
        hivesCount: form.hivesCount ? Number(form.hivesCount) : undefined,
        productionStartMonth: form.productionStartMonth ? Number(form.productionStartMonth) : undefined,
        productionEndMonth: form.productionEndMonth ? Number(form.productionEndMonth) : undefined,
        mainFlora: form.mainFlora,
        annualProductionKg: form.annualProductionKg ? Number(form.annualProductionKg) : undefined,
        description: form.description,
      });
      setNotice({ tone: 'success', text: t('producer:profile.saved') });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : t('common:status.error') });
    }
  };

  const mapSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.longitude - 0.03},${coords.latitude - 0.02},${coords.longitude + 0.03},${coords.latitude + 0.02}&layer=mapnik&marker=${coords.latitude},${coords.longitude}`
    : null;
  const mapLink = coords ? `https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}#map=14/${coords.latitude}/${coords.longitude}` : null;

  return (
    <div className="space-y-4">
      {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      <div className="grid md:grid-cols-[1.1fr_1.3fr_1fr] rounded-xl overflow-hidden border border-[#E6E8E3] bg-white">
        <img src="/images/beekeeper.jpg" alt="" className="h-36 md:h-full w-full object-cover object-left" />
        <div className="flex items-center gap-4 p-5 bg-[#F4F7F2]">
          <span className="w-12 h-12 rounded-full bg-[#0B4A2F] text-white flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6" />
          </span>
          <div>
            <p className={`font-bold ${NAVY}`}>{t('producer:profile.farm.bannerTitle')}</p>
            <p className="text-sm text-[#374151] mt-1">{t('producer:profile.farm.bannerBody')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-5 bg-[#FFF3DA]">
          <Sprout className="w-8 h-8 text-[#D08C1A] shrink-0" />
          <p className={`font-bold ${NAVY}`}>{t('producer:profile.farm.bannerMotto')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title={t('producer:profile.farm.basic')} icon={<Home className="w-5 h-5" />}>
          <div className="space-y-4">
            <Field label={t('producer:profile.farm.farmName')} required error={errors.farmName}>
              <TextInput value={form.farmName} onChange={(e) => set('farmName', e.target.value)} />
            </Field>
            <Field label={t('producer:profile.farm.activityType')}>
              <SelectInput value={form.activityType} onChange={(e) => set('activityType', e.target.value)}>
                <option value="">{t('producer:common.select')}</option>
                {ACTIVITY_TYPES.map((a) => <option key={a} value={a}>{t(`producer:options.activity.${a}`)}</option>)}
              </SelectInput>
            </Field>
            <Field label={t('producer:profile.farm.registrationStatus')}>
              <SelectInput value={form.registrationStatus} onChange={(e) => set('registrationStatus', e.target.value)}>
                <option value="">{t('producer:common.select')}</option>
                {REGISTRATION_STATUSES.map((r) => <option key={r} value={r}>{t(`producer:options.registration.${r}`)}</option>)}
              </SelectInput>
            </Field>
            <Field label={t('producer:profile.farm.registrationNumber')}>
              <TextInput value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} placeholder="TN-AP-2024-1587" dir="ltr" />
            </Field>
          </div>
        </Panel>

        <Panel title={t('producer:profile.farm.location')} icon={<MapPin className="w-5 h-5" />}>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t('producer:fields.governorate')}>
                <SelectInput value={form.farmGovernorate} onChange={(e) => { set('farmGovernorate', e.target.value); set('farmDelegation', ''); }}>
                  <option value="">{t('producer:common.select')}</option>
                  {GOVERNORATES.map((g) => <option key={g.name} value={g.name}>{lang === 'ar' ? g.ar : g.name}</option>)}
                </SelectInput>
              </Field>
              <Field label={t('producer:fields.delegation')}>
                <TextInput list="farm-delegations" value={form.farmDelegation} onChange={(e) => set('farmDelegation', e.target.value)} disabled={!form.farmGovernorate} placeholder={form.farmGovernorate ? t('producer:common.selectOrType') : t('producer:fields.chooseGovernorateFirst')} />
                <datalist id="farm-delegations">
                  {delegationsOf(form.farmGovernorate).map((d) => <option key={d} value={d} />)}
                </datalist>
              </Field>
            </div>
            <Field label={t('producer:profile.farm.fullAddress')}>
              <TextInput value={form.farmAddress} onChange={(e) => set('farmAddress', e.target.value)} />
            </Field>
            <Field label={t('producer:profile.farm.gps')} error={errors.gps}>
              <div className="flex gap-2">
                <TextInput value={form.gps} onChange={(e) => set('gps', e.target.value)} placeholder="36.8101, 8.7156" dir="ltr" className="flex-1" />
                <Btn variant="outline" size="sm" onClick={useMyLocation} loading={locating} className="shrink-0 min-h-[42px]">
                  <LocateFixed className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('producer:profile.farm.useLocation')}</span>
                </Btn>
              </div>
            </Field>
            <div className="relative h-36 rounded-lg overflow-hidden border border-[#E6E8E3] bg-[#EEF2EC]">
              {mapSrc ? (
                <>
                  <iframe title={t('producer:profile.farm.map')} src={mapSrc} className="w-full h-full border-0" loading="lazy" />
                  <a href={mapLink!} target="_blank" rel="noreferrer" className="absolute top-2 end-2 w-8 h-8 rounded-md bg-white shadow flex items-center justify-center text-[#14215B]" aria-label={t('producer:profile.farm.openMap')}>
                    <Expand className="w-4 h-4" />
                  </a>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-gray-500 px-4">
                  <MapPin className="w-6 h-6 mb-1" />
                  {t('producer:profile.farm.mapPlaceholder')}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel title={t('producer:profile.farm.photos')} subtitle={t('producer:profile.farm.photosHint')} icon={<Image className="w-5 h-5" />}>
          <div className="grid grid-cols-2 gap-3">
            {form.farmPhotos.map((photo) => (
              <div key={photo} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[#EEF2EC]">
                <img src={resolveFileUrl(photo)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => set('farmPhotos', form.farmPhotos.filter((p) => p !== photo))}
                  className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-[#14215B] text-white flex items-center justify-center"
                  aria-label={t('common:actions.delete')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {form.farmPhotos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
                className="aspect-[4/3] rounded-lg border-2 border-dashed border-[#CBD2CC] flex flex-col items-center justify-center text-center text-[#14215B] hover:bg-[#F6F7F5] disabled:opacity-50"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm font-semibold mt-1">{upload.isPending ? t('common:status.saving') : t('producer:profile.farm.addPhoto')}</span>
                <span className="text-[11px] text-gray-500">{t('producer:profile.photo.formats')}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { void handlePhotos(e.target.files); e.target.value = ''; }} />
          <p className="text-xs text-gray-500 mt-3">{t('producer:profile.farm.photosSaveHint')}</p>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Panel title={t('producer:profile.farm.beekeeping')} icon={<Sprout className="w-5 h-5" />}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('producer:wizard.fields.hives')}>
              <TextInput type="number" min={0} value={form.hivesCount} onChange={(e) => set('hivesCount', e.target.value)} />
            </Field>
            <Field label={t('producer:profile.farm.productionPeriod')}>
              <div className="grid grid-cols-2 gap-2">
                <SelectInput value={form.productionStartMonth} onChange={(e) => set('productionStartMonth', e.target.value)} leading={<CalendarDays className="w-4 h-4" />} aria-label={t('producer:profile.farm.from')}>
                  <option value="">—</option>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </SelectInput>
                <SelectInput value={form.productionEndMonth} onChange={(e) => set('productionEndMonth', e.target.value)} aria-label={t('producer:profile.farm.to')}>
                  <option value="">—</option>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </SelectInput>
              </div>
            </Field>
            <Field label={t('producer:profile.farm.mainFlora')}>
              <div className="rounded-lg border border-[#D5DAD4] bg-white p-2 flex flex-wrap gap-1.5 min-h-[42px]">
                {form.mainFlora.map((flora) => (
                  <span key={flora} className="inline-flex items-center gap-1 rounded-md bg-[#EEF1F6] px-2 py-1 text-xs font-semibold text-[#14215B]">
                    {flora}
                    <button onClick={() => set('mainFlora', form.mainFlora.filter((f) => f !== flora))} aria-label={t('common:actions.delete')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  list="flora-options"
                  value={floraInput}
                  onChange={(e) => setFloraInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addFlora(floraInput);
                    }
                  }}
                  onBlur={() => addFlora(floraInput)}
                  placeholder={form.mainFlora.length ? '' : t('producer:profile.farm.floraPlaceholder')}
                  className="flex-1 min-w-[100px] text-sm outline-none px-1"
                />
                <datalist id="flora-options">
                  {FLORAL_ORIGINS.map((key) => <option key={key} value={t(`producer:honey.origins.${key}`)} />)}
                </datalist>
              </div>
            </Field>
            <Field label={t('producer:profile.farm.annualProduction')}>
              <TextInput type="number" min={0} value={form.annualProductionKg} onChange={(e) => set('annualProductionKg', e.target.value)} trailing={<span className="text-xs">{t('producer:common.kgUnit')}</span>} />
            </Field>
          </div>
        </Panel>

        <Panel title={t('producer:profile.farm.description')} subtitle={t('producer:profile.farm.descriptionHint')} icon={<FileText className="w-5 h-5" />}>
          <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={500} rows={5} />
        </Panel>
      </div>

      <div className="flex justify-end gap-3">
        <Btn variant="outline" className="border-[#0B4A2F] min-w-[120px]" onClick={() => { setForm(toForm(profile)); setErrors({}); }}>
          {t('common:actions.cancel')}
        </Btn>
        <Btn variant="gold" className="min-w-[160px]" onClick={() => void handleSave()} loading={update.isPending}>
          <Save className="w-4 h-4" />
          {t('producer:profile.saveChanges')}
        </Btn>
      </div>
    </div>
  );
};
