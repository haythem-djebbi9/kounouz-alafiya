import { dateLocale } from '../../../i18n';
import { GOVERNORATES } from '../../producer/constants';

// Mise en forme des nombres, dates et lieux selon la langue active.

export function formatNumber(value: number | null | undefined, lang: string, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString(dateLocale(lang), { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function formatCompact(value: number, lang: string): string {
  return value.toLocaleString(dateLocale(lang), { notation: 'compact', maximumFractionDigits: 1 });
}

export function formatPercent(value: number | null | undefined, lang: string, digits = 1): string {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value, lang, digits)}%`;
}

export function formatMoney(value: number, lang: string): string {
  return `${value.toLocaleString(dateLocale(lang), { maximumFractionDigits: 0 })} TND`;
}

export function formatDate(value: string | Date | null | undefined, lang: string, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(dateLocale(lang), options ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined, lang: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(dateLocale(lang), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(value: string | Date, lang: string): string {
  return new Date(value).toLocaleTimeString(dateLocale(lang), { hour: '2-digit', minute: '2-digit' });
}

/** « il y a 5 min », « il y a 3 h »… via Intl.RelativeTimeFormat. */
export function formatRelative(value: string | Date, lang: string): string {
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(dateLocale(lang), { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}

export function formatBytes(bytes: number, lang: string): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${formatNumber(value, lang, unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(seconds: number, lang: string): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const unit = (value: number, name: 'day' | 'hour' | 'minute') =>
    new Intl.NumberFormat(dateLocale(lang), { style: 'unit', unit: name, unitDisplay: 'narrow' }).format(value);
  if (days > 0) return `${unit(days, 'day')} ${unit(hours, 'hour')}`;
  if (hours > 0) return `${unit(hours, 'hour')} ${unit(minutes, 'minute')}`;
  return unit(Math.max(minutes, 1), 'minute');
}

/** Libellé de période d'une série (jour, semaine, mois). */
export function formatBucket(date: string, granularity: 'day' | 'week' | 'month', lang: string): string {
  const d = new Date(`${date.length === 7 ? `${date}-01` : date}T00:00:00Z`);
  const locale = dateLocale(lang);
  if (granularity === 'month') return d.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' });
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const displayNames = new Map<string, Intl.DisplayNames>();

export function countryName(code: string | null | undefined, lang: string, fallback?: string | null): string {
  if (!code) return fallback ?? '—';
  try {
    const locale = dateLocale(lang);
    if (!displayNames.has(locale)) displayNames.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
    return displayNames.get(locale)!.of(code.toUpperCase()) ?? fallback ?? code;
  } catch {
    return fallback ?? code;
  }
}

export function governorateName(name: string | null | undefined, lang: string): string {
  if (!name) return '—';
  if (lang !== 'ar') return name;
  return GOVERNORATES.find((g) => g.name === name || (name === 'Manouba' && g.name === 'La Manouba'))?.ar ?? name;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '··';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** YYYY-MM-DD en heure locale, pour les champs <input type="date"> et l'API. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBefore(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}
