import type { DocumentType, FloralCategory } from './types';

// Types de miel proposés dans le formulaire de demande. Le libellé traduit
// (clé i18n producer:honey.types.X) est ce qui est enregistré dans la demande,
// car il est ensuite repris tel quel par le lot et la marketplace.
export const HONEY_TYPES: { key: string; category: FloralCategory }[] = [
  { key: 'JUJUBE', category: 'MONOFLORAL' },
  { key: 'THYME', category: 'MONOFLORAL' },
  { key: 'ROSEMARY', category: 'MONOFLORAL' },
  { key: 'EUCALYPTUS', category: 'MONOFLORAL' },
  { key: 'ORANGE_BLOSSOM', category: 'MONOFLORAL' },
  { key: 'CAROB', category: 'MONOFLORAL' },
  { key: 'ALEPPO_PINE', category: 'MONOFLORAL' },
  { key: 'WILDFLOWER', category: 'MULTIFLORAL' },
  { key: 'FOREST', category: 'MULTIFLORAL' },
  { key: 'MOUNTAIN', category: 'MULTIFLORAL' },
];

export const FLORAL_ORIGINS = [
  'WILDFLOWER',
  'THYME',
  'EUCALYPTUS',
  'ORANGE_BLOSSOM',
  'CITRUS',
  'ROSEMARY',
  'ALEPPO_PINE',
  'SAGE',
  'JUJUBE',
  'CAROB',
] as const;

export const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as const;
export const BEEKEEPING_METHODS = ['TRADITIONAL', 'MODERN', 'ORGANIC', 'TRANSHUMANT'] as const;
export const HIVE_TYPES = ['LANGSTROTH', 'DADANT', 'TRADITIONAL', 'TOP_BAR', 'OTHER'] as const;
export const ACTIVITY_TYPES = ['BEEKEEPING', 'BEEKEEPING_AND_PROCESSING', 'MIXED_FARMING'] as const;
export const REGISTRATION_STATUSES = ['REGISTERED', 'IN_PROGRESS', 'NOT_REGISTERED'] as const;
export const PAYMENT_METHODS = ['BANK_TRANSFER', 'POSTAL_ACCOUNT'] as const;

export const DOCUMENT_TYPES: { type: DocumentType; required: boolean }[] = [
  { type: 'NATIONAL_ID', required: true },
  { type: 'FARM_REGISTRATION', required: true },
  { type: 'BEEKEEPING_LICENSE', required: false },
  { type: 'TAX_ID', required: false },
  { type: 'PROOF_OF_ADDRESS', required: false },
  { type: 'OTHER', required: false },
];

export const REQUIRED_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((d) => d.required).map((d) => d.type);

// Gouvernorats de Tunisie (nom enregistré = nom latin officiel) et principales
// délégations, proposées en suggestions (saisie libre acceptée).
export const GOVERNORATES: { name: string; ar: string; delegations: string[] }[] = [
  { name: 'Ariana', ar: 'أريانة', delegations: ['Ariana Ville', 'Ettadhamen', 'Kalâat el-Andalous', 'La Soukra', 'Mnihla', 'Raoued', 'Sidi Thabet'] },
  { name: 'Béja', ar: 'باجة', delegations: ['Amdoun', 'Béja Nord', 'Béja Sud', 'Goubellat', 'Medjez el-Bab', 'Nefza', 'Téboursouk', 'Testour', 'Thibar'] },
  { name: 'Ben Arous', ar: 'بن عروس', delegations: ['Ben Arous', 'Bou Mhel el-Bassatine', 'El Mourouj', 'Ezzahra', 'Fouchana', 'Hammam Chott', 'Hammam Lif', 'Mégrine', 'Mohamedia', 'Mornag', 'Nouvelle Médina', 'Radès'] },
  { name: 'Bizerte', ar: 'بنزرت', delegations: ['Bizerte Nord', 'Bizerte Sud', 'Djoumine', 'El Alia', 'Ghar El Melh', 'Ghezala', 'Mateur', 'Menzel Bourguiba', 'Menzel Jemil', 'Ras Jebel', 'Sejnane', 'Tinja', 'Utique', 'Zarzouna'] },
  { name: 'Gabès', ar: 'قابس', delegations: ['El Hamma', 'Gabès Médina', 'Gabès Ouest', 'Gabès Sud', 'Ghannouch', 'Mareth', 'Matmata', 'Menzel El Habib', 'Métouia', 'Nouvelle Matmata'] },
  { name: 'Gafsa', ar: 'قفصة', delegations: ['Belkhir', 'El Guettar', 'El Ksar', 'Gafsa Nord', 'Gafsa Sud', 'Mdhilla', 'Métlaoui', 'Moularès', 'Redeyef', 'Sened', 'Sidi Aïch'] },
  { name: 'Jendouba', ar: 'جندوبة', delegations: ['Aïn Draham', 'Balta-Bou Aouane', 'Bou Salem', 'Fernana', 'Ghardimaou', 'Jendouba', 'Jendouba Nord', 'Oued Meliz', 'Tabarka'] },
  { name: 'Kairouan', ar: 'القيروان', delegations: ['Bou Hajla', 'Chebika', 'Echrarda', 'El Alâa', 'Haffouz', 'Hajeb El Ayoun', 'Kairouan Nord', 'Kairouan Sud', 'Nasrallah', 'Oueslatia', 'Sbikha'] },
  { name: 'Kasserine', ar: 'القصرين', delegations: ['Ezzouhour', 'Fériana', 'Foussana', 'Haïdra', 'Hassi El Ferid', 'Jedelienne', 'Kasserine Nord', 'Kasserine Sud', 'Majel Bel Abbès', 'Sbeïtla', 'Sbiba', 'Thala'] },
  { name: 'Kébili', ar: 'قبلي', delegations: ['Douz Nord', 'Douz Sud', 'Faouar', 'Kébili Nord', 'Kébili Sud', 'Souk Lahad'] },
  { name: 'Le Kef', ar: 'الكاف', delegations: ['Dahmani', 'El Ksour', 'Jérissa', 'Kalâat Khasba', 'Kalaat Senan', 'Le Kef Est', 'Le Kef Ouest', 'Nebeur', 'Sakiet Sidi Youssef', 'Sers', 'Tajerouine'] },
  { name: 'Mahdia', ar: 'المهدية', delegations: ['Bou Merdes', 'Chebba', 'Chorbane', 'El Djem', 'Essouassi', 'Hebira', 'Ksour Essef', 'Mahdia', 'Melloulèche', 'Ouled Chamekh', 'Sidi Alouane'] },
  { name: 'La Manouba', ar: 'منوبة', delegations: ['Borj El Amri', 'Djedeida', 'Douar Hicher', 'El Batan', 'La Manouba', 'Mornaguia', 'Oued Ellil', 'Tebourba'] },
  { name: 'Médenine', ar: 'مدنين', delegations: ['Ben Gardane', 'Beni Khedache', 'Djerba Ajim', 'Djerba Houmt Souk', 'Djerba Midoun', 'Médenine Nord', 'Médenine Sud', 'Sidi Makhlouf', 'Zarzis'] },
  { name: 'Monastir', ar: 'المنستير', delegations: ['Bekalta', 'Bembla', 'Beni Hassen', 'Jemmal', 'Ksar Hellal', 'Ksibet el-Médiouni', 'Moknine', 'Monastir', 'Ouerdanine', 'Sahline', 'Sayada-Lamta-Bou Hajar', 'Téboulba', 'Zéramdine'] },
  { name: 'Nabeul', ar: 'نابل', delegations: ['Béni Khalled', 'Béni Khiar', 'Bou Argoub', 'Dar Chaâbane El Fehri', 'El Haouaria', 'El Mida', 'Grombalia', 'Hammam Ghezèze', 'Hammamet', 'Kélibia', 'Korba', 'Menzel Bouzelfa', 'Menzel Temime', 'Nabeul', 'Soliman', 'Takelsa'] },
  { name: 'Sfax', ar: 'صفاقس', delegations: ['Agareb', 'Bir Ali Ben Khalifa', 'El Amra', 'El Hencha', 'Graïba', 'Jebiniana', 'Kerkennah', 'Mahrès', 'Menzel Chaker', 'Sakiet Eddaïer', 'Sakiet Ezzit', 'Sfax Ouest', 'Sfax Sud', 'Sfax Ville', 'Skhira', 'Thyna'] },
  { name: 'Sidi Bouzid', ar: 'سيدي بوزيد', delegations: ['Bir El Hafey', 'Cebbala Ouled Asker', 'Jilma', 'Meknassy', 'Menzel Bouzaiane', 'Mezzouna', 'Ouled Haffouz', 'Regueb', 'Sidi Ali Ben Aoun', 'Sidi Bouzid Est', 'Sidi Bouzid Ouest', 'Souk Jedid'] },
  { name: 'Siliana', ar: 'سليانة', delegations: ['Bargou', 'Bou Arada', 'El Aroussa', 'El Krib', 'Gaâfour', 'Kesra', 'Makthar', 'Rouhia', 'Sidi Bou Rouis', 'Siliana Nord', 'Siliana Sud'] },
  { name: 'Sousse', ar: 'سوسة', delegations: ['Akouda', 'Bouficha', 'Enfida', 'Hammam Sousse', 'Hergla', 'Kalâa Kebira', 'Kalâa Seghira', 'Kondar', "M'saken", 'Sidi Bou Ali', 'Sidi El Hani', 'Sousse Jawhara', 'Sousse Médina', 'Sousse Riadh', 'Sousse Sidi Abdelhamid', 'Zaouiet Ksibet Thrayet'] },
  { name: 'Tataouine', ar: 'تطاوين', delegations: ['Bir Lahmar', 'Dehiba', 'Ghomrassen', 'Remada', 'Smâr', 'Tataouine Nord', 'Tataouine Sud'] },
  { name: 'Tozeur', ar: 'توزر', delegations: ['Degache', 'Hazoua', 'Nefta', 'Tameghza', 'Tozeur'] },
  { name: 'Tunis', ar: 'تونس', delegations: ['Bab El Bhar', 'Bab Souika', 'Carthage', 'Cité El Khadra', 'Djebel Jelloud', 'El Kabaria', 'El Menzah', 'El Omrane', 'El Omrane Supérieur', 'El Ouardia', 'Ettahrir', 'Ezzouhour', 'Hraïria', 'La Goulette', 'La Marsa', 'Le Bardo', 'Le Kram', 'Médina', 'Séjoumi', 'Sidi El Béchir', 'Sidi Hassine'] },
  { name: 'Zaghouan', ar: 'زغوان', delegations: ['Bir Mcherga', 'El Fahs', 'Nadhour', 'Saouaf', 'Zaghouan', 'Zriba'] },
];

export function governorateLabel(name: string | null | undefined, lang: string): string {
  if (!name) return '';
  if (lang !== 'ar') return name;
  return GOVERNORATES.find((g) => g.name === name)?.ar ?? name;
}

export function delegationsOf(governorate: string | null | undefined): string[] {
  return GOVERNORATES.find((g) => g.name === governorate)?.delegations ?? [];
}

export const COMMISSION_FALLBACK_RATE = 0.2;
export const PAGE_SIZE = 10;

// Palette graphique validée (daltonisme / vision normale) — voir skill dataviz.
export const CHART_COLORS = {
  green: '#1F8A55',
  gold: '#D08C1A',
  blue: '#2F7FB8',
  brown: '#A8583A',
} as const;
