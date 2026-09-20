import type { Tone } from '../verifier/ui';
import type { SampleStatus } from '../../lib/api-types';
import type { AssignmentStatus, CollectionPriority, CustodyEventType, LatLng } from './types';

/** Bornes de la journée locale du terminal, en ISO — le serveur ignore le fuseau de l'agent. */
export function localDayRange(date = new Date()) {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Combine une date (YYYY-MM-DD) et une heure (HH:mm) locales en ISO. */
export function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}

export function formatDate(value: string | Date, locale: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', ...options });
}

export function formatTime(value: string | Date, locale: string) {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(value: string | Date, locale: string) {
  return `${formatDate(value, locale)}, ${formatTime(value, locale)}`;
}

export function formatCoords(point: LatLng | null | undefined) {
  if (!point) return null;
  const lat = `${Math.abs(point.latitude).toFixed(4)} ${point.latitude >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(point.longitude).toFixed(4)} ${point.longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lng}`;
}

export function googleMapsLink(point: LatLng | null, fallbackQuery?: string) {
  if (point) return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery ?? '')}`;
}

export function directionsLink(destination: LatLng | null, fallbackQuery?: string) {
  const target = destination ? `${destination.latitude},${destination.longitude}` : encodeURIComponent(fallbackQuery ?? '');
  return `https://www.google.com/maps/dir/?api=1&destination=${target}&travelmode=driving`;
}

/** Itinéraire complet de la tournée (Google Maps accepte jusqu'à 9 étapes intermédiaires). */
export function routeLink(stops: LatLng[]) {
  if (stops.length === 0) return null;
  const fmt = (p: LatLng) => `${p.latitude},${p.longitude}`;
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).slice(0, 9).map(fmt).join('|');
  return `https://www.google.com/maps/dir/?api=1&destination=${fmt(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`;
}

export const ASSIGNMENT_TONES: Record<AssignmentStatus, Tone> = {
  PENDING: 'blue',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'neutral',
};

export const PRIORITY_TONES: Record<CollectionPriority, Tone> = {
  LOW: 'neutral',
  NORMAL: 'green',
  HIGH: 'amber',
  URGENT: 'red',
};

export const SAMPLE_TONES: Record<SampleStatus, Tone> = {
  COLLECTED: 'blue',
  SEALED: 'violet',
  IN_TRANSIT: 'amber',
  RECEIVED: 'green',
  RECEIVED_AT_LAB: 'green',
  ANALYZED: 'green',
  ISSUE: 'red',
};

export const EVENT_TONES: Partial<Record<CustodyEventType, Tone>> = {
  ISSUE: 'red',
  LOCATION_UPDATE: 'blue',
  IN_TRANSIT: 'amber',
};

/** Codes météo WMO regroupés en quelques familles lisibles. */
export function weatherKind(code: number): 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm' {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code <= 48) return 'fog';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain';
  if (code <= 77 || code === 85 || code === 86) return 'snow';
  return 'storm';
}

/** Conditions favorables à l'ouverture des ruches : ni pluie ni vent fort, température douce. */
export function isGoodFieldWeather(w: { temperature: number; windSpeed: number; code: number }) {
  const kind = weatherKind(w.code);
  return (kind === 'clear' || kind === 'cloudy') && w.windSpeed < 30 && w.temperature >= 12 && w.temperature <= 38;
}

export function initials(name: string | undefined | null) {
  if (!name) return '··';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function quantityInGrams(quantityKg: string | number) {
  return Math.round(Number(quantityKg) * 1000);
}
