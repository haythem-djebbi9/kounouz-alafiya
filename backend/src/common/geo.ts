// Référentiel géographique des tableaux d'analyse : pays (code ISO, centroïde)
// et gouvernorats tunisiens. Les scans historiques portent un nom de pays en
// texte libre (« Tunisie », « France ») : normalizeCountry les ramène au code.

export interface CountryInfo {
  code: string;
  name: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'TN', name: 'Tunisia', lat: 34.0, lng: 9.5, aliases: ['tunisie', 'تونس'] },
  { code: 'FR', name: 'France', lat: 46.6, lng: 2.4, aliases: ['فرنسا'] },
  { code: 'DE', name: 'Germany', lat: 51.1, lng: 10.4, aliases: ['allemagne', 'deutschland', 'ألمانيا'] },
  { code: 'IT', name: 'Italy', lat: 42.8, lng: 12.6, aliases: ['italie', 'italia', 'إيطاليا'] },
  { code: 'ES', name: 'Spain', lat: 40.2, lng: -3.6, aliases: ['espagne', 'españa', 'إسبانيا'] },
  { code: 'BE', name: 'Belgium', lat: 50.6, lng: 4.6, aliases: ['belgique', 'بلجيكا'] },
  { code: 'NL', name: 'Netherlands', lat: 52.2, lng: 5.5, aliases: ['pays-bas', 'هولندا'] },
  { code: 'CH', name: 'Switzerland', lat: 46.8, lng: 8.2, aliases: ['suisse', 'سويسرا'] },
  { code: 'GB', name: 'United Kingdom', lat: 54.0, lng: -2.5, aliases: ['royaume-uni', 'uk', 'المملكة المتحدة'] },
  { code: 'US', name: 'United States', lat: 39.8, lng: -98.6, aliases: ['états-unis', 'etats-unis', 'usa', 'الولايات المتحدة'] },
  { code: 'CA', name: 'Canada', lat: 56.1, lng: -106.3, aliases: ['كندا'] },
  { code: 'DZ', name: 'Algeria', lat: 28.0, lng: 2.6, aliases: ['algérie', 'algerie', 'الجزائر'] },
  { code: 'MA', name: 'Morocco', lat: 31.8, lng: -7.1, aliases: ['maroc', 'المغرب'] },
  { code: 'LY', name: 'Libya', lat: 26.3, lng: 17.2, aliases: ['libye', 'ليبيا'] },
  { code: 'EG', name: 'Egypt', lat: 26.8, lng: 30.8, aliases: ['égypte', 'egypte', 'مصر'] },
  { code: 'SA', name: 'Saudi Arabia', lat: 23.9, lng: 45.1, aliases: ['arabie saoudite', 'السعودية'] },
  { code: 'AE', name: 'United Arab Emirates', lat: 23.4, lng: 53.8, aliases: ['émirats arabes unis', 'emirats arabes unis', 'uae', 'الإمارات'] },
  { code: 'QA', name: 'Qatar', lat: 25.3, lng: 51.2, aliases: ['قطر'] },
  { code: 'KW', name: 'Kuwait', lat: 29.3, lng: 47.5, aliases: ['koweït', 'koweit', 'الكويت'] },
  { code: 'TR', name: 'Turkey', lat: 39.0, lng: 35.2, aliases: ['turquie', 'türkiye', 'تركيا'] },
  { code: 'CN', name: 'China', lat: 35.9, lng: 104.2, aliases: ['chine', 'الصين'] },
  { code: 'JP', name: 'Japan', lat: 36.2, lng: 138.3, aliases: ['japon', 'اليابان'] },
  { code: 'IN', name: 'India', lat: 20.6, lng: 79.0, aliases: ['inde', 'الهند'] },
  { code: 'RU', name: 'Russia', lat: 61.5, lng: 105.3, aliases: ['russie', 'روسيا'] },
  { code: 'BR', name: 'Brazil', lat: -14.2, lng: -51.9, aliases: ['brésil', 'bresil', 'البرازيل'] },
  { code: 'AU', name: 'Australia', lat: -25.3, lng: 133.8, aliases: ['australie', 'أستراليا'] },
  { code: 'SE', name: 'Sweden', lat: 60.1, lng: 18.6, aliases: ['suède', 'suede', 'السويد'] },
  { code: 'PT', name: 'Portugal', lat: 39.4, lng: -8.2, aliases: ['البرتغال'] },
  { code: 'SN', name: 'Senegal', lat: 14.5, lng: -14.5, aliases: ['sénégal', 'السنغال'] },
  { code: 'NG', name: 'Nigeria', lat: 9.1, lng: 8.7, aliases: ['نيجيريا'] },
];

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
const COUNTRY_BY_NAME = new Map<string, CountryInfo>();
for (const country of COUNTRIES) {
  for (const key of [country.code, country.name, ...country.aliases]) {
    COUNTRY_BY_NAME.set(key.toLowerCase(), country);
  }
}

export function countryByCode(code: string | null | undefined): CountryInfo | undefined {
  return code ? COUNTRY_BY_CODE.get(code.toUpperCase()) : undefined;
}

/** Code ISO à partir d'un code ou d'un nom de pays saisi librement. */
export function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_BY_NAME.get(trimmed.toLowerCase())?.code ?? null;
}

export interface GovernorateInfo {
  name: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const GOVERNORATES: GovernorateInfo[] = [
  { name: 'Tunis', lat: 36.8065, lng: 10.1815, aliases: ['تونس'] },
  { name: 'Ariana', lat: 36.8625, lng: 10.1956, aliases: ['أريانة'] },
  { name: 'Ben Arous', lat: 36.7531, lng: 10.2189, aliases: ['بن عروس'] },
  { name: 'La Manouba', lat: 36.8101, lng: 10.0956, aliases: ['manouba', 'منوبة'] },
  { name: 'Nabeul', lat: 36.4561, lng: 10.7376, aliases: ['نابل'] },
  { name: 'Zaghouan', lat: 36.4029, lng: 10.1429, aliases: ['زغوان'] },
  { name: 'Bizerte', lat: 37.2744, lng: 9.8739, aliases: ['بنزرت'] },
  { name: 'Béja', lat: 36.7256, lng: 9.1817, aliases: ['beja', 'باجة'] },
  { name: 'Jendouba', lat: 36.5011, lng: 8.7802, aliases: ['جندوبة'] },
  { name: 'Le Kef', lat: 36.1742, lng: 8.7049, aliases: ['kef', 'el kef', 'الكاف'] },
  { name: 'Siliana', lat: 36.0849, lng: 9.3708, aliases: ['سليانة'] },
  { name: 'Sousse', lat: 35.8256, lng: 10.6084, aliases: ['سوسة'] },
  { name: 'Monastir', lat: 35.7643, lng: 10.8113, aliases: ['المنستير'] },
  { name: 'Mahdia', lat: 35.5047, lng: 11.0622, aliases: ['المهدية'] },
  { name: 'Sfax', lat: 34.7406, lng: 10.7603, aliases: ['صفاقس'] },
  { name: 'Kairouan', lat: 35.6781, lng: 10.0963, aliases: ['القيروان'] },
  { name: 'Kasserine', lat: 35.1676, lng: 8.8365, aliases: ['القصرين'] },
  { name: 'Sidi Bouzid', lat: 35.0382, lng: 9.4849, aliases: ['سيدي بوزيد'] },
  { name: 'Gabès', lat: 33.8815, lng: 10.0982, aliases: ['gabes', 'قابس'] },
  { name: 'Médenine', lat: 33.3549, lng: 10.5055, aliases: ['medenine', 'مدنين'] },
  { name: 'Tataouine', lat: 32.9297, lng: 10.4518, aliases: ['تطاوين'] },
  { name: 'Gafsa', lat: 34.425, lng: 8.7842, aliases: ['قفصة'] },
  { name: 'Tozeur', lat: 33.9197, lng: 8.1335, aliases: ['توزر'] },
  { name: 'Kébili', lat: 33.7044, lng: 8.969, aliases: ['kebili', 'قبلي'] },
];

const GOVERNORATE_BY_NAME = new Map<string, GovernorateInfo>();
for (const gov of GOVERNORATES) {
  for (const key of [gov.name, ...gov.aliases]) {
    GOVERNORATE_BY_NAME.set(key.toLowerCase(), gov);
  }
}

export function normalizeGovernorate(value: string | null | undefined): string | null {
  if (!value) return null;
  const head = value.split(',')[0].trim().toLowerCase();
  return GOVERNORATE_BY_NAME.get(head)?.name ?? null;
}

/**
 * Gouvernorat le plus proche d'une position, uniquement à l'intérieur du cadre
 * de la Tunisie : au-delà, attribuer un gouvernorat serait une invention.
 */
export function nearestGovernorate(lat: number, lng: number): string | null {
  if (lat < 30.2 || lat > 37.6 || lng < 7.5 || lng > 11.7) return null;
  let best: GovernorateInfo | null = null;
  let bestDistance = Infinity;
  for (const gov of GOVERNORATES) {
    const d = (gov.lat - lat) ** 2 + (gov.lng - lng) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = gov;
    }
  }
  return best?.name ?? null;
}
