import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// La vitrine est tunisienne : tous les prix sont en dinar tunisien. Le dinar
// se divise en 1000 millimes, d'où 3 décimales quand le prix n'est pas rond
// (89,900 DT) — un prix rond reste lisible sans décimales (35 DT).
const NUMBER_LOCALES: Record<string, string> = { ar: 'ar-TN', fr: 'fr-TN', en: 'en-US' };

export function formatAmount(value: number, lang: string): string {
  const rounded = Math.round(value * 1000) / 1000;
  const whole = Number.isInteger(rounded);
  return new Intl.NumberFormat(NUMBER_LOCALES[lang] ?? 'fr-TN', {
    numberingSystem: 'latn',
    minimumFractionDigits: whole ? 0 : 3,
    maximumFractionDigits: whole ? 0 : 3,
  }).format(rounded);
}

/** Formate un montant en dinars tunisiens dans la langue active (ex: « 35 د.ت », « 35 DT »). */
export function usePriceFormatter() {
  const { t, i18n } = useTranslation('marketplace');
  return useCallback(
    (value: number) => `${formatAmount(value, i18n.language)} ${t('marketplace:currency')}`,
    [i18n.language, t],
  );
}
