import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, Loader2, ShieldCheck } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { Btn, Field, InlineError, TextArea, TextInput } from '../verifier/ui';
import { useGeolocation, useRegisterSeal } from './hooks';
import { PhotoUploader } from './ui';
import { formatCoords } from './utils';

/**
 * Pose du scellé sécurisé : numéro pré-imprimé (ou attribué par Kounouz),
 * photo du scellé en place, attestation d'intégrité et position GPS.
 */
export const SealForm: React.FC<{
  sampleId: string;
  onDone: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}> = ({ sampleId, onDone, onCancel, submitLabel }) => {
  const { t } = useTranslation('agent');
  const register = useRegisterSeal();
  const geo = useGeolocation(true);
  const [mode, setMode] = useState<'printed' | 'auto'>('printed');
  const [sealCode, setSealCode] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [integrity, setIntegrity] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const position = geo.state.status === 'ready' ? geo.state.position : null;

  useEffect(() => {
    setError('');
  }, [mode]);

  const codeValid = mode === 'auto' || /^[A-Za-z0-9-]{4,40}$/.test(sealCode.trim());
  const canSubmit = codeValid && photos.length > 0 && integrity;

  const submit = async () => {
    setError('');
    try {
      await register.mutateAsync({
        sampleId,
        sealCode: mode === 'printed' ? sealCode.trim().toUpperCase() : undefined,
        photoUrl: photos[0],
        latitude: position?.latitude,
        longitude: position?.longitude,
        notes: notes.trim() || undefined,
        integrityConfirmed: integrity,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-[#0C261B] mb-1.5">{t('seal.numberSource')}</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {(['printed', 'auto'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold text-start min-h-[44px] ${
                    mode === value ? 'border-[#0C261B] bg-[#F2F8F3] text-[#0C261B]' : 'border-[#EAE1D2] text-gray-600'
                  }`}
                >
                  {t(`seal.source.${value}`)}
                </button>
              ))}
            </div>
          </div>

          {mode === 'printed' ? (
            <Field label={t('seal.number')} required hint={t('seal.numberHint')}>
              <TextInput
                value={sealCode}
                onChange={(e) => setSealCode(e.target.value.toUpperCase())}
                placeholder="KS-2026-784521"
                autoCapitalize="characters"
                dir="ltr"
                className="font-mono"
              />
            </Field>
          ) : (
            <p className="text-sm text-gray-600 bg-[#F6F7F4] rounded-lg px-3 py-2">{t('seal.autoHint')}</p>
          )}

          <Field label={t('seal.notes')}>
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder={t('seal.notesPlaceholder')} />
          </Field>

          <div className="rounded-lg bg-[#F6F7F4] px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
            {geo.state.status === 'locating' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4 text-[#17693F]" />
            )}
            <span className="flex-1" dir={position ? 'ltr' : undefined}>
              {position ? formatCoords(position) : geo.state.status === 'error' ? t('gps.unavailable') : t('gps.locating')}
            </span>
            {geo.state.status !== 'locating' && (
              <button type="button" onClick={geo.locate} className="font-bold text-[#1D4E89]">
                {t('gps.refresh')}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-[#0C261B] mb-1.5">
              {t('seal.photo')} <span className="text-[#B42323]">*</span>
            </p>
            <PhotoUploader photos={photos} onChange={setPhotos} max={3} compact />
            <p className="text-[11px] text-gray-400 mt-1">{t('seal.photoHint')}</p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-[#EAE1D2] p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={integrity}
              onChange={(e) => setIntegrity(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[#17693F]"
            />
            <span className="text-sm text-[#0C261B]">{t('seal.integrity')}</span>
          </label>
        </div>
      </div>

      {error && <InlineError message={error} />}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancel && (
          <Btn variant="secondary" onClick={onCancel} className="min-h-[46px]">
            {t('common.back')}
          </Btn>
        )}
        <Btn onClick={submit} disabled={!canSubmit} isLoading={register.isPending} className="min-h-[46px] px-6">
          <ShieldCheck className="w-4 h-4" />
          {submitLabel ?? t('seal.submit')}
        </Btn>
      </div>
    </div>
  );
};
