import type { TFunction } from 'i18next';
import { API_URL, api } from '../../lib/api';
import { tokenStorage } from '../../lib/tokenStorage';
import { dateLocale } from '../../i18n';
import type { ProducerRequest, SaleItem } from './types';
import type { BatchStatus } from '../../lib/api-types';

// ---------------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------------

export function formatNumber(value: number, lang: string, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(dateLocale(lang), { maximumFractionDigits: maxFractionDigits }).format(value);
}

export function formatMoney(value: number, lang: string, t: TFunction, fractionDigits = 0): string {
  const amount = new Intl.NumberFormat(dateLocale(lang), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return `${amount} ${t('producer:common.currency')}`;
}

export function formatDate(value: string | Date | null | undefined, lang: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(dateLocale(lang), options ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined, lang: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(dateLocale(lang), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value: number, lang: string): string {
  return new Intl.NumberFormat(dateLocale(lang), { style: 'percent', maximumFractionDigits: 0 }).format(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function monthLabel(period: string, lang: string, withYear = false): string {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(dateLocale(lang), {
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

// ---------------------------------------------------------------------------
// Étape d'une demande vue par le producteur (dérivée des données réelles)
// ---------------------------------------------------------------------------

export type RequestStage =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REJECTED'
  | 'COLLECTION_SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'UNDER_ANALYSIS'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'NOT_VERIFIED';

export function requestStage(request: ProducerRequest): RequestStage {
  switch (request.status) {
    case 'DRAFT':
      return 'DRAFT';
    case 'NEW':
      return 'SUBMITTED';
    case 'IN_REVIEW':
    // En attente d'une précision du producteur : la demande reste en revue
    // (la carte de réponse s'affiche en tête du détail).
    case 'INFO_REQUESTED':
      return 'UNDER_REVIEW';
    case 'REJECTED':
      return 'REJECTED';
  }
  const verification = request.verifications?.[0];
  if (verification?.status === 'VERIFIED') return 'VERIFIED';
  if (verification?.status === 'NOT_VERIFIED') return 'NOT_VERIFIED';
  if (verification?.status === 'PENDING') return 'VERIFICATION_PENDING';
  const sample = request.samples?.[0];
  if (!sample) return 'COLLECTION_SCHEDULED';
  if (sample.status === 'RECEIVED_AT_LAB') return 'UNDER_ANALYSIS';
  if (sample.status === 'ANALYZED') return 'VERIFICATION_PENDING';
  return 'SAMPLE_COLLECTED';
}

export type Tone = 'green' | 'gold' | 'blue' | 'red' | 'gray';

export const STAGE_TONE: Record<RequestStage, Tone> = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  UNDER_REVIEW: 'gold',
  REJECTED: 'red',
  COLLECTION_SCHEDULED: 'blue',
  SAMPLE_COLLECTED: 'blue',
  UNDER_ANALYSIS: 'gold',
  VERIFICATION_PENDING: 'gold',
  VERIFIED: 'green',
  NOT_VERIFIED: 'red',
};

export const BATCH_TONE: Record<BatchStatus, Tone> = {
  CREATED: 'gold',
  PACKAGED: 'blue',
  READY: 'green',
};

export function requestLabel(request: ProducerRequest, t: TFunction): string {
  return request.requestCode ?? t('producer:requests.draftLabel');
}

// ---------------------------------------------------------------------------
// Périodes
// ---------------------------------------------------------------------------

export interface DateRange {
  from: Date;
  to: Date; // inclusif (fin de journée)
}

export type RangePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM';

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function presetRange(preset: Exclude<RangePreset, 'CUSTOM'>, now = new Date()): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'THIS_MONTH':
      return { from: new Date(y, m, 1), to: endOfDay(new Date(y, m + 1, 0)) };
    case 'LAST_MONTH':
      return { from: new Date(y, m - 1, 1), to: endOfDay(new Date(y, m, 0)) };
    case 'LAST_30_DAYS':
      return { from: startOfDay(new Date(y, m, now.getDate() - 29)), to: endOfDay(now) };
    case 'LAST_3_MONTHS':
      return { from: new Date(y, m - 2, 1), to: endOfDay(new Date(y, m + 1, 0)) };
    case 'THIS_YEAR':
      return { from: new Date(y, 0, 1), to: endOfDay(new Date(y, 11, 31)) };
    case 'ALL_TIME':
      return { from: new Date(2000, 0, 1), to: endOfDay(new Date(y + 1, 11, 31)) };
  }
}

// Période précédente de même durée, pour les variations "vs période précédente".
export function previousRange(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  return { from: new Date(to.getTime() - duration), to };
}

export function inRange(value: string | Date, range: DateRange) {
  const time = new Date(value).getTime();
  return time >= range.from.getTime() && time <= range.to.getTime();
}

export function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function periodKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function lastMonths(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => periodKey(new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)));
}

// ---------------------------------------------------------------------------
// Agrégations de ventes (lignes de commande réelles)
// ---------------------------------------------------------------------------

export const isActiveSale = (item: SaleItem) => item.order.status !== 'CANCELLED';

export interface SalesTotals {
  orders: number;
  units: number;
  gross: number;
  commission: number;
  net: number;
}

export function totals(items: SaleItem[]): SalesTotals {
  const orders = new Set<string>();
  let units = 0;
  let gross = 0;
  let commission = 0;
  let net = 0;
  for (const item of items) {
    orders.add(item.order.id);
    units += item.quantity;
    gross += Number(item.lineTotal);
    commission += Number(item.commissionAmount);
    net += Number(item.netAmount);
  }
  return { orders: orders.size, units, gross, commission, net };
}

// Variation relative ; null quand la base est nulle (pas de pourcentage inventé).
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export function monthlySeries(items: SaleItem[], months: string[], dateOf: (item: SaleItem) => string | null) {
  return months.map((period) => {
    const monthItems = items.filter((item) => {
      const date = dateOf(item);
      return date ? periodKey(new Date(date)) === period : false;
    });
    return { period, ...totals(monthItems) };
  });
}

export function weeklySeries(items: SaleItem[], range: DateRange) {
  const buckets: { from: Date; to: Date }[] = [];
  let cursor = startOfDay(range.from);
  const last = range.to.getTime();
  while (cursor.getTime() <= last && buckets.length < 60) {
    const to = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6));
    buckets.push({ from: cursor, to: to.getTime() > last ? range.to : to });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
  }
  return buckets.map((bucket) => ({
    ...bucket,
    ...totals(items.filter((item) => inRange(item.order.createdAt, bucket))),
  }));
}

export function unitsByPackage(items: SaleItem[], otherLabel: string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.packageSize?.trim() || otherLabel;
    map.set(key, (map.get(key) ?? 0) + item.quantity);
  }
  const rows = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  // Au-delà de 3 formats, le reste est regroupé dans "Autres" (lisibilité du donut).
  if (rows.length <= 4) return rows;
  const head = rows.slice(0, 3);
  const rest = rows.slice(3).reduce((sum, r) => sum + r.value, 0);
  return [...head, { label: otherLabel, value: rest }];
}

export function topProducts(items: SaleItem[], limit = 5) {
  const map = new Map<string, { productId: string; name: string; image?: string; units: number; gross: number; net: number }>();
  for (const item of items) {
    const row = map.get(item.productId) ?? {
      productId: item.productId,
      name: item.productName,
      image: item.product.images[0],
      units: 0,
      gross: 0,
      net: 0,
    };
    row.units += item.quantity;
    row.gross += Number(item.lineTotal);
    row.net += Number(item.netAmount);
    map.set(item.productId, row);
  }
  return [...map.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Fichiers
// ---------------------------------------------------------------------------

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  // BOM : Excel ouvre correctement les accents et l'arabe.
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function authorizedBlob(path: string, isRetry = false): Promise<Blob> {
  const token = tokenStorage.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (res.status === 401 && !isRetry) {
    // Jeton d'accès expiré : un appel via le client API déclenche le
    // renouvellement, puis on retente une fois.
    await api.get('/auth/me').catch(() => undefined);
    return authorizedBlob(path, true);
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // réponse non JSON
    }
    throw new Error(message);
  }
  return res.blob();
}

export async function downloadAuthorizedFile(path: string, filename: string) {
  triggerDownload(await authorizedBlob(path), filename);
}

// Ouvre un fichier protégé (document producteur) dans un nouvel onglet.
export async function openAuthorizedFile(path: string) {
  const popup = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await authorizedBlob(path));
    if (popup) {
      popup.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (err) {
    popup?.close();
    throw err;
  }
}
