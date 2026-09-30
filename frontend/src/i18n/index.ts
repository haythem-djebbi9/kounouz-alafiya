import i18n, { type BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

// Traductions chargées à la demande : seule la langue active est téléchargée,
// et chaque portail n'apporte ses textes (producer, agent, console…) qu'à sa
// première ouverture. Les trois langues complètes pèsent plus de 600 Ko : les
// embarquer toutes doublait le poids de la page d'accueil.
const LOADERS = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', { import: 'default' });

const lazyLocales: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    const load = LOADERS[`./locales/${language}/${namespace}.json`];
    if (!load) {
      callback(null, {});
      return;
    }
    load().then(
      (data) => callback(null, data),
      (error: Error) => callback(error, false),
    );
  },
};

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

// Espaces de noms de la vitrine, chargés dès le démarrage ; les autres le sont
// par le premier composant qui les demande (useTranslation).
const STARTUP_NAMESPACES = ['common', 'status', 'marketplace'];

void i18n
  .use(lazyLocales)
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // Les trois langues ont exactement les mêmes clés : pas de langue de
    // secours, donc rien d'autre que la langue active à télécharger.
    fallbackLng: false,
    load: 'currentOnly',
    ns: STARTUP_NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    react: { useSuspense: true },
  });

/**
 * Garantit qu'un espace de noms est chargé dans les trois langues — pour les
 * rares écrans qui comparent un libellé enregistré à ses traductions.
 */
export async function ensureNamespaceInAllLanguages(namespace: string): Promise<void> {
  const missing = SUPPORTED_LANGUAGES.filter((lang) => !i18n.hasResourceBundle(lang, namespace));
  if (missing.length > 0) await i18n.reloadResources([...missing], [namespace]);
}

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
