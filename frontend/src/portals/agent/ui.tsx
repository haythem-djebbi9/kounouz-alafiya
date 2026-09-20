import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Loader2, Snowflake, Sun, Wind, X, Check } from 'lucide-react';
import { StatusPill } from '../verifier/ui';
import { resolveFileUrl, ApiError } from '../../lib/api';
import type { SampleStatus } from '../../lib/api-types';
import { useUploadSamplePhoto, useWeather } from './hooks';
import type { AssignmentStatus, CollectionPriority, LatLng } from './types';
import { ASSIGNMENT_TONES, PRIORITY_TONES, SAMPLE_TONES, isGoodFieldWeather, weatherKind } from './utils';

export const AssignmentStatusPill: React.FC<{ status: AssignmentStatus; overdue?: boolean }> = ({ status, overdue }) => {
  const { t } = useTranslation('agent');
  if (overdue) return <StatusPill tone="red" label={t('assignmentStatus.OVERDUE')} />;
  return <StatusPill tone={ASSIGNMENT_TONES[status]} label={t(`assignmentStatus.${status}`)} />;
};

export const PriorityPill: React.FC<{ priority: CollectionPriority }> = ({ priority }) => {
  const { t } = useTranslation('agent');
  return <StatusPill tone={PRIORITY_TONES[priority]} label={t(`priority.${priority}`)} />;
};

export const SampleStatusPill: React.FC<{ status: SampleStatus }> = ({ status }) => {
  const { t } = useTranslation('agent');
  return <StatusPill tone={SAMPLE_TONES[status]} label={t(`sampleStatus.${status}`)} />;
};

/** Ligne icône + libellé + valeur, pour les blocs d'information. */
export const IconRow: React.FC<{ icon: React.ReactNode; label?: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div className="flex items-start gap-2.5 min-w-0">
    <span className="mt-0.5 text-[#17693F] shrink-0">{icon}</span>
    <div className="min-w-0 text-sm text-[#0C261B]">
      {label && <p className="text-[11px] text-gray-500 leading-tight">{label}</p>}
      <div className="break-words">{children}</div>
    </div>
  </div>
);

/** Tableau clé / valeur à deux colonnes. */
export const DefList: React.FC<{ rows: { label: string; value: React.ReactNode }[] }> = ({ rows }) => (
  <dl className="divide-y divide-[#F1EDE3]">
    {rows.map((row) => (
      <div key={row.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-2 text-sm">
        <dt className="text-gray-500">{row.label}</dt>
        <dd className="text-[#0C261B] font-semibold break-words">{row.value ?? '—'}</dd>
      </div>
    ))}
  </dl>
);

export const SectionCard: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, icon, actions, className = '', bodyClassName = 'p-4', children }) => (
  <section className={`bg-white border border-[#EAE1D2] rounded-xl min-w-0 ${className}`}>
    {(title || actions) && (
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0C261B] min-w-0">
          {icon && <span className="text-[#0C261B] shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </h2>
        {actions}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const Avatar: React.FC<{ name: string; url?: string | null; className?: string }> = ({
  name,
  url,
  className = 'w-10 h-10 text-xs',
}) => {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={resolveFileUrl(url)}
        alt={name}
        onError={() => setFailed(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className={`rounded-full bg-[#0C261B] text-white grid place-items-center font-bold shrink-0 ${className}`}>
      {letters}
    </span>
  );
};

/** Téléversement de photos de preuve (appareil photo sur mobile). */
export const PhotoUploader: React.FC<{
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  compact?: boolean;
}> = ({ photos, onChange, max = 5, compact }) => {
  const { t } = useTranslation('agent');
  const upload = useUploadSamplePhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from<File>(e.target.files ?? []).slice(0, max - photos.length);
    e.target.value = '';
    if (files.length === 0) return;
    setError('');
    let next = photos;
    for (const file of files) {
      try {
        const res = await upload.mutateAsync(file);
        next = [...next, res.url];
        onChange(next);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('photos.uploadError'));
        break;
      }
    }
  };

  const canAdd = photos.length < max;

  return (
    <div>
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'}`}>
        {photos.map((url) => (
          <div key={url} className="relative aspect-square">
            <img
              src={resolveFileUrl(url)}
              alt={t('photos.alt')}
              className="w-full h-full object-cover rounded-lg border border-[#EAE1D2]"
            />
            <button
              type="button"
              onClick={() => onChange(photos.filter((p) => p !== url))}
              className="absolute top-1 end-1 w-6 h-6 rounded-full bg-[#0C261B] text-white grid place-items-center shadow"
              aria-label={t('photos.remove')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="aspect-square rounded-lg border-2 border-dashed border-[#D5DAD4] hover:border-[#D49B37] bg-[#FAFBF9] flex flex-col items-center justify-center gap-1 text-center px-1 disabled:opacity-60"
          >
            {upload.isPending ? (
              <Loader2 className="w-5 h-5 text-[#D49B37] animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-[#0C261B]" />
            )}
            <span className="text-[11px] font-bold text-[#0C261B] leading-tight">{t('photos.add')}</span>
            <span className="text-[9px] text-gray-400 leading-tight">{t('photos.formats')}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      {error && <p className="text-xs text-[#B42323] mt-2">{error}</p>}
    </div>
  );
};

const WEATHER_ICONS = {
  clear: Sun,
  cloudy: CloudSun,
  fog: CloudFog,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
};

export const WeatherIcon: React.FC<{ code: number; className?: string }> = ({ code, className = 'w-8 h-8' }) => {
  const Icon = WEATHER_ICONS[weatherKind(code)];
  return <Icon className={`${className} ${weatherKind(code) === 'clear' ? 'text-[#E3A21A]' : 'text-[#5B7A90]'}`} />;
};

/** Conditions météo actuelles au point donné, avec avis terrain. */
export const WeatherWidget: React.FC<{ position: LatLng | null; place?: string; variant?: 'card' | 'inline' }> = ({
  position,
  place,
  variant = 'card',
}) => {
  const { t } = useTranslation('agent');
  const { data, isLoading, isError } = useWeather(position);

  if (!position) return <p className="text-xs text-gray-400">{t('weather.noPosition')}</p>;
  if (isLoading) return <p className="text-xs text-gray-400">{t('common.loading')}</p>;
  if (isError || !data) return <p className="text-xs text-gray-400">{t('weather.unavailable')}</p>;

  const good = isGoodFieldWeather(data);

  if (variant === 'inline') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
        <div className="flex items-center gap-2">
          <WeatherIcon code={data.code} />
          <div>
            <p className="text-lg font-extrabold text-[#0C261B] leading-none tabular-nums">{data.temperature}°C</p>
            <p className="text-[11px] text-gray-500">{t(`weather.kinds.${weatherKind(data.code)}`)}</p>
          </div>
        </div>
        <Metric icon={<Droplets className="w-4 h-4 text-[#3B7DD8]" />} label={t('weather.humidity')} value={`${data.humidity}%`} />
        <Metric icon={<Wind className="w-4 h-4 text-[#5B7A90]" />} label={t('weather.wind')} value={`${data.windSpeed} km/h`} />
        <Metric
          icon={good ? <Check className="w-4 h-4 text-[#17693F]" /> : <X className="w-4 h-4 text-[#B42323]" />}
          label={t('weather.fieldConditions')}
          value={good ? t('weather.good') : t('weather.poor')}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <WeatherIcon code={data.code} className="w-10 h-10" />
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-[#0C261B] leading-none tabular-nums">{data.temperature}°C</p>
          {place && <p className="text-xs text-gray-600 truncate mt-1">{place}</p>}
          <p className="text-xs text-gray-500">{t(`weather.kinds.${weatherKind(data.code)}`)}</p>
        </div>
      </div>
      <p
        className={`text-xs font-bold rounded-lg px-3 py-2 text-center ${
          good ? 'bg-[#E8F5EC] text-[#17693F]' : 'bg-[#FDF6E7] text-[#96661A]'
        }`}
      >
        {good ? t('weather.goodForVisits') : t('weather.poorForVisits')}
      </p>
    </div>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 min-w-0">
    {icon}
    <div className="min-w-0">
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      <p className="text-sm font-bold text-[#0C261B] truncate">{value}</p>
    </div>
  </div>
);

/** Barre d'étapes horizontale du parcours de collecte. */
export const WizardSteps: React.FC<{ steps: string[]; current: number; completed: number }> = ({
  steps,
  current,
  completed,
}) => (
  <ol className="flex items-start">
    {steps.map((label, index) => {
      const done = index < completed;
      const active = index === current;
      return (
        <li key={label} className="flex-1 flex flex-col items-center relative min-w-0">
          {index > 0 && (
            <span
              aria-hidden
              className={`absolute top-4 end-1/2 w-full h-0.5 -z-0 ${index <= completed ? 'bg-[#17693F]' : 'bg-[#DCE3DD]'}`}
            />
          )}
          <span
            className={`relative z-10 w-8 h-8 rounded-full grid place-items-center text-sm font-bold border-2 ${
              done
                ? 'bg-[#17693F] border-[#17693F] text-white'
                : active
                  ? 'bg-[#0C261B] border-[#0C261B] text-white'
                  : 'bg-white border-[#DCE3DD] text-[#9AA69F]'
            }`}
          >
            {done && !active ? <Check className="w-4 h-4" /> : index + 1}
          </span>
          <span
            className={`mt-1.5 text-[11px] sm:text-xs text-center leading-tight px-0.5 ${
              active || done ? 'text-[#0C261B] font-semibold' : 'text-gray-400'
            }`}
          >
            {label}
          </span>
        </li>
      );
    })}
  </ol>
);
