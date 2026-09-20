import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Lock, MapPin, Save } from 'lucide-react';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { useUpdateMyProfile, useUploadProducerImage } from '../hooks';
import { GOVERNORATES } from '../constants';
import { Btn, Field, NAVY, Notice, Panel, SelectInput, TextInput } from '../ui';
import { Avatar } from '../ProducerLayout';
import type { ProducerProfile } from '../types';

const toForm = (p: ProducerProfile) => ({
  name: p.name,
  phone: p.phone ?? '',
  dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
  nationalId: p.nationalId ?? '',
  address: p.address ?? '',
  governorate: p.governorate ?? '',
  postalCode: p.postalCode ?? '',
});

export const PersonalInfoTab: React.FC<{ profile: ProducerProfile }> = ({ profile }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { user } = useAuth();
  const update = useUpdateMyProfile();
  const upload = useUploadProducerImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => toForm(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => setForm(toForm(profile)), [profile]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = t('producer:common.required');
    if (form.phone && !/^\+?[0-9\s-]{8,20}$/.test(form.phone)) next.phone = t('producer:fields.errors.phone');
    if (form.nationalId && !/^[0-9]{8}$/.test(form.nationalId)) next.nationalId = t('producer:fields.errors.nationalId');
    if (form.postalCode && !/^[0-9]{4}$/.test(form.postalCode)) next.postalCode = t('producer:fields.errors.postalCode');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    setNotice(null);
    if (!validate()) return;
    try {
      await update.mutateAsync({
        name: form.name.trim(),
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        ...(form.nationalId && !profile.nationalId ? { nationalId: form.nationalId } : {}),
        address: form.address,
        governorate: form.governorate || undefined,
        postalCode: form.postalCode || undefined,
      });
      setNotice({ tone: 'success', text: t('producer:profile.saved') });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : t('common:status.error') });
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    try {
      const { url } = await upload.mutateAsync(file);
      await update.mutateAsync({ avatarUrl: url });
      setNotice({ tone: 'success', text: t('producer:profile.photoUpdated') });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : t('common:status.error') });
    }
  };

  return (
    <div className="space-y-4">
      {notice && <Notice tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Notice>}
      <div className="grid lg:grid-cols-[1fr_1fr_280px] gap-4">
        <Panel title={t('producer:profile.personal.title')}>
          <div className="space-y-4">
            <Field label={t('producer:profile.personal.fullName')} required error={errors.name}>
              <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
            </Field>
            <Field label={t('producer:profile.personal.phone')} error={errors.phone}>
              <TextInput
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+216 22 123 456"
                leading={<span className="text-base" aria-hidden>🇹🇳</span>}
                inputMode="tel"
                dir="ltr"
              />
            </Field>
            <Field
              label={t('producer:profile.personal.email')}
              hint={
                <Link to="/producteur/profil?tab=account" className="font-semibold text-[#1F4FA3] hover:underline">
                  {t('producer:profile.personal.changeEmail')}
                </Link>
              }
            >
              <TextInput value={user?.email ?? ''} disabled dir="ltr" />
            </Field>
            <Field label={t('producer:profile.personal.dateOfBirth')}>
              <TextInput type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field
              label={t('producer:profile.personal.nationalId')}
              error={errors.nationalId}
              hint={profile.nationalId ? t('producer:profile.personal.nationalIdLocked') : t('producer:profile.personal.nationalIdOnce')}
            >
              <TextInput
                value={form.nationalId}
                onChange={(e) => set('nationalId', e.target.value.replace(/\D/g, '').slice(0, 8))}
                disabled={!!profile.nationalId}
                trailing={profile.nationalId ? <Lock className="w-4 h-4" /> : undefined}
                inputMode="numeric"
                dir="ltr"
              />
            </Field>
          </div>
        </Panel>

        <Panel title={t('producer:profile.address.title')}>
          <div className="space-y-4">
            <Field label={t('producer:profile.address.address')}>
              <TextInput value={form.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" />
            </Field>
            <Field label={t('producer:fields.governorate')}>
              <SelectInput value={form.governorate} onChange={(e) => set('governorate', e.target.value)}>
                <option value="">{t('producer:common.select')}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g.name} value={g.name}>{lang === 'ar' ? g.ar : g.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('producer:profile.address.postalCode')} error={errors.postalCode}>
              <TextInput value={form.postalCode} onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" dir="ltr" />
            </Field>
            <div className="flex items-start gap-3 rounded-lg bg-[#F4F6F3] p-3 text-sm text-[#374151]">
              <MapPin className="w-4 h-4 text-[#14215B] mt-0.5 shrink-0" />
              {t('producer:profile.address.note')}
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={t('producer:profile.photo.title')} className="flex-1">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar src={profile.avatarUrl ? resolveFileUrl(profile.avatarUrl) : null} name={profile.name} size={130} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-1 end-1 w-10 h-10 rounded-full bg-[#0B4A2F] text-white flex items-center justify-center border-2 border-white"
                  aria-label={t('producer:profile.changePhoto')}
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => fileRef.current?.click()} className={`mt-3 text-sm font-semibold ${NAVY} hover:underline`}>
                {t('producer:profile.photo.click')}
              </button>
              <p className="text-xs text-gray-500">{t('producer:profile.photo.formats')}</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void handlePhoto(e.target.files?.[0])} />
            </div>
          </Panel>
          <div className="flex gap-3">
            <Btn variant="outline" className="flex-1 border-[#0B4A2F]" onClick={() => { setForm(toForm(profile)); setErrors({}); }}>
              {t('common:actions.cancel')}
            </Btn>
            <Btn variant="gold" className="flex-1" onClick={() => void handleSave()} loading={update.isPending}>
              <Save className="w-4 h-4" />
              {t('producer:profile.saveChanges')}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};
