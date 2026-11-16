import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Tous les montants de la plateforme — vitrine comme portails — sont en dinar
// tunisien. Le dinar se divise en 1000 millimes : un prix s'écrit toujours
// avec ses 3 décimales (42,000 DT ; 89,900 DT), comme dans le commerce
// tunisien. Afficher « 42 DT » à côté de « 89,900 DT » donnait deux formats
// sur une même page (revue du 5 novembre). Seuls les totaux arrondis des
// tableaux de bord (`round`) s'écrivent sans décimales.
const NUMBER_LOCALES: Record<string, string> = { ar: 'ar-TN', fr: 'fr-TN', en: 'en-US' };
const CURRENCY_LABELS: Record<string, string> = { ar: 'د.ت', fr: 'DT', en: 'TND' };

// Isolement bidirectionnel (FSI … PDI) : un montant garde « 35 DT » dans une
// phrase arabe, et « 35 د.ت » dans une phrase française, sans s'inverser.
const ISOLATE_START = '⁨';
const ISOLATE_END = '⁩';

export function currencyLabel(lang: string): string {
  return CURRENCY_LABELS[lang] ?? CURRENCY_LABELS.fr;
}

/** Montant seul, sans devise. `round` : entier (tableaux de bord, totaux). */
export function formatAmount(value: number, lang: string, round = false): string {
  const digits = round ? 0 : 3;
  return new Intl.NumberFormat(NUMBER_LOCALES[lang] ?? 'fr-TN', {
    numberingSystem: 'latn',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(round ? Math.round(value) : value);
}

/** Montant en dinars dans la langue voulue : « 35,000 د.ت », « 89,900 DT », « 1,250.000 TND ». */
export function formatTnd(value: number | string | null | undefined, lang: string, options: { round?: boolean } = {}): string {
  const amount = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(amount)) return '—';
  return `${ISOLATE_START}${formatAmount(amount, lang, options.round)} ${currencyLabel(lang)}${ISOLATE_END}`;
}

/** Formateur de montants lié à la langue active. */
export function usePriceFormatter() {
  const { i18n } = useTranslation();
  return useCallback((value: number | string | null | undefined, options?: { round?: boolean }) => formatTnd(value, i18n.language, options), [i18n.language]);
}
