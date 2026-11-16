// Lieux et saisons saisis en texte libre, en français (« Le Kef, Tunisie »,
// « Printemps 2026 »), mais affichés dans une interface arabe ou anglaise.
// Plutôt que de dupliquer chaque champ en base, on traduit à l'affichage ce
// qui est connu — les 24 gouvernorats, quelques localités, les saisons — et
// on laisse intact ce qui ne l'est pas : un nom propre inconnu reste lisible.

type Names = { ar: string; en: string };

// Clés normalisées : minuscules, sans accents ni article.
const PLACES: Record<string, Names> = {
  tunisie: { ar: 'تونس', en: 'Tunisia' },
  tunis: { ar: 'تونس', en: 'Tunis' },
  ariana: { ar: 'أريانة', en: 'Ariana' },
  'ben arous': { ar: 'بن عروس', en: 'Ben Arous' },
  manouba: { ar: 'منوبة', en: 'Manouba' },
  nabeul: { ar: 'نابل', en: 'Nabeul' },
  zaghouan: { ar: 'زغوان', en: 'Zaghouan' },
  bizerte: { ar: 'بنزرت', en: 'Bizerte' },
  beja: { ar: 'باجة', en: 'Beja' },
  jendouba: { ar: 'جندوبة', en: 'Jendouba' },
  kef: { ar: 'الكاف', en: 'Kef' },
  siliana: { ar: 'سليانة', en: 'Siliana' },
  sousse: { ar: 'سوسة', en: 'Sousse' },
  monastir: { ar: 'المنستير', en: 'Monastir' },
  mahdia: { ar: 'المهدية', en: 'Mahdia' },
  sfax: { ar: 'صفاقس', en: 'Sfax' },
  kairouan: { ar: 'القيروان', en: 'Kairouan' },
  kasserine: { ar: 'القصرين', en: 'Kasserine' },
  'sidi bouzid': { ar: 'سيدي بوزيد', en: 'Sidi Bouzid' },
  gabes: { ar: 'قابس', en: 'Gabes' },
  medenine: { ar: 'مدنين', en: 'Medenine' },
  tataouine: { ar: 'تطاوين', en: 'Tataouine' },
  gafsa: { ar: 'قفصة', en: 'Gafsa' },
  tozeur: { ar: 'توزر', en: 'Tozeur' },
  kebili: { ar: 'قبلي', en: 'Kebili' },
  'cap bon': { ar: 'الوطن القبلي', en: 'Cap Bon' },
  'ain draham': { ar: 'عين دراهم', en: 'Ain Draham' },
  tabarka: { ar: 'طبرقة', en: 'Tabarka' },
  djerba: { ar: 'جربة', en: 'Djerba' },
};

const SEASONS: Record<string, Names> = {
  printemps: { ar: 'ربيع', en: 'Spring' },
  ete: { ar: 'صيف', en: 'Summer' },
  automne: { ar: 'خريف', en: 'Autumn' },
  hiver: { ar: 'شتاء', en: 'Winter' },
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^(le|la|el)\s+/, '')
    .trim();
}

function pick(names: Names | undefined, lang: string): string | undefined {
  if (!names) return undefined;
  return lang === 'ar' ? names.ar : lang === 'en' ? names.en : undefined;
}

/** « Le Kef, Tunisie » → « الكاف، تونس » en arabe, « Kef, Tunisia » en anglais. */
export function localizePlace(text: string | null | undefined, lang: string): string {
  if (!text) return '';
  if (lang === 'fr') return text;
  const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
  const translated = parts.map((part) => pick(PLACES[normalize(part)], lang) ?? part);
  return translated.join(lang === 'ar' ? '، ' : ', ');
}

/** « Printemps 2026 » → « ربيع 2026 » / « Spring 2026 ». */
export function localizeSeason(text: string | null | undefined, lang: string): string {
  if (!text) return '';
  if (lang === 'fr') return text;
  return text.replace(/[A-Za-zÀ-ÿ]+/g, (word) => pick(SEASONS[normalize(word)], lang) ?? word);
}
