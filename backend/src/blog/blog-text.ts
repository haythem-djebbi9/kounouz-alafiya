// Textes multilingues du blog : un article porte son titre, son chapô et son
// contenu dans chacune des langues de la vitrine.

export const BLOG_LANGUAGES = ['ar', 'fr', 'en'] as const;
export type BlogLanguage = (typeof BLOG_LANGUAGES)[number];
export type LocalizedText = Partial<Record<BlogLanguage, string>>;

// Rubriques proposées dans l'éditeur ; leur libellé est traduit côté vitrine.
export const BLOG_CATEGORIES = ['CONSEILS', 'SANTE', 'TERROIR', 'APICULTURE', 'TRACABILITE', 'ACTUALITES'] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

const WORDS_PER_MINUTE = 200;

/** Ne garde que les langues connues, textes nettoyés, sans chaîne vide. */
export function cleanLocalized(input: unknown): LocalizedText {
  const out: LocalizedText = {};
  if (!input || typeof input !== 'object') return out;
  for (const lang of BLOG_LANGUAGES) {
    const value = (input as Record<string, unknown>)[lang];
    if (typeof value === 'string' && value.trim()) out[lang] = value.trim();
  }
  return out;
}

export function hasAnyLanguage(text: LocalizedText): boolean {
  return BLOG_LANGUAGES.some((lang) => !!text[lang]);
}

/** Durée de lecture de la version la plus longue, arrondie à la minute supérieure. */
export function readingMinutes(content: LocalizedText): number {
  const words = Math.max(0, ...BLOG_LANGUAGES.map((lang) => (content[lang] ?? '').split(/\s+/).filter(Boolean).length));
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
