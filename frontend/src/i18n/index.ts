import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonAr from './locales/ar/common.json';
import statusAr from './locales/ar/status.json';
import authAr from './locales/ar/auth.json';
import settingsAr from './locales/ar/settings.json';
import supportAr from './locales/ar/support.json';
import producerAr from './locales/ar/producer.json';
import agentAr from './locales/ar/agent.json';
import adminAr from './locales/ar/admin.json';
import marketplaceAr from './locales/ar/marketplace.json';
import guideAr from './locales/ar/guide.json';
import verifierAr from './locales/ar/verifier.json';
import consoleAr from './locales/ar/console.json';

import commonFr from './locales/fr/common.json';
import statusFr from './locales/fr/status.json';
import authFr from './locales/fr/auth.json';
import settingsFr from './locales/fr/settings.json';
import supportFr from './locales/fr/support.json';
import producerFr from './locales/fr/producer.json';
import agentFr from './locales/fr/agent.json';
import adminFr from './locales/fr/admin.json';
import marketplaceFr from './locales/fr/marketplace.json';
import guideFr from './locales/fr/guide.json';
import verifierFr from './locales/fr/verifier.json';
import consoleFr from './locales/fr/console.json';

import commonEn from './locales/en/common.json';
import statusEn from './locales/en/status.json';
import authEn from './locales/en/auth.json';
import settingsEn from './locales/en/settings.json';
import supportEn from './locales/en/support.json';
import producerEn from './locales/en/producer.json';
import agentEn from './locales/en/agent.json';
import adminEn from './locales/en/admin.json';
import marketplaceEn from './locales/en/marketplace.json';
import guideEn from './locales/en/guide.json';
import verifierEn from './locales/en/verifier.json';
import consoleEn from './locales/en/console.json';

export const SUPPORTED_LANGUAGES = ['ar', 'fr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';
export const LANGUAGE_STORAGE_KEY = 'kz_lang';

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

export function persistLanguage(lang: SupportedLanguage): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    ar: {
      common: commonAr,
      status: statusAr,
      auth: authAr,
      settings: settingsAr,
      support: supportAr,
      producer: producerAr,
      agent: agentAr,
      admin: adminAr,
      marketplace: marketplaceAr,
      guide: guideAr,
      verifier: verifierAr,
      console: consoleAr,
    },
    fr: {
      common: commonFr,
      status: statusFr,
      auth: authFr,
      settings: settingsFr,
      support: supportFr,
      producer: producerFr,
      agent: agentFr,
      admin: adminFr,
      marketplace: marketplaceFr,
      guide: guideFr,
      verifier: verifierFr,
      console: consoleFr,
    },
    en: {
      common: commonEn,
      status: statusEn,
      auth: authEn,
      settings: settingsEn,
      support: supportEn,
      producer: producerEn,
      agent: agentEn,
      admin: adminEn,
      marketplace: marketplaceEn,
      guide: guideEn,
      verifier: verifierEn,
      console: consoleEn,
    },
  },
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  ns: ['common', 'status', 'auth', 'settings', 'support', 'producer', 'agent', 'admin', 'marketplace', 'guide', 'verifier', 'console'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

const DATE_LOCALES: Record<SupportedLanguage, string> = { ar: 'ar-TN', fr: 'fr-FR', en: 'en-US' };

// À utiliser partout où une date est formatée (toLocaleDateString, etc.) pour
// qu'elle suive la langue active plutôt qu'un "ar-TN" figé.
export function dateLocale(lang: string): string {
  return DATE_LOCALES[lang as SupportedLanguage] ?? DATE_LOCALES[DEFAULT_LANGUAGE];
}

export function applyDocumentDirection(lang: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = i18n.dir(lang);
}

applyDocumentDirection(i18n.language);
i18n.on('languageChanged', applyDocumentDirection);

export default i18n;
