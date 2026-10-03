import type { Product } from '../types';

// Recherche de la vitrine. Les fiches produits sont rédigées en français
// (« Miel de Jujubier (Sedra) ») alors que les visiteurs cherchent aussi en
// arabe ou en anglais : chaque mot cherché est donc comparé à ses équivalents
// français, après normalisation (accents, hamza, « ال », casse).

const SYNONYMS: Record<string, string[]> = {
  // arabe
  عسل: ['miel'],
  سدر: ['sedra', 'jujubier'],
  زعتر: ['thym'],
  اكليل: ['romarin'],
  روزماري: ['romarin'],
  كاليتوس: ['eucalyptus'],
  اوكاليبتوس: ['eucalyptus'],
  كينا: ['eucalyptus'],
  قوارص: ['agrumes'],
  حمضيات: ['agrumes'],
  برتقال: ['oranger'],
  زهور: ['fleurs'],
  ازهار: ['fleurs'],
  بري: ['sauvage'],
  بريه: ['sauvage'],
  متعدد: ['multifloral'],
  صنوبر: ['pin'],
  خزامي: ['lavande'],
  لافندر: ['lavande'],
  خروب: ['caroubier'],
  مريميه: ['sauge'],
  ميرميه: ['sauge'],
  ملكات: ['royale'],
  غذاء: ['gelee'],
  بروبوليس: ['propolis'],
  عكبر: ['propolis'],
  لقاح: ['pollen'],
  حبوب: ['pollen'],
  اعواد: ['baton'],
  جبلي: ['montagne'],
  جبل: ['romarin', 'montagne'],
  // anglais
  honey: ['miel'],
  sidr: ['sedra', 'jujubier'],
  jujube: ['jujubier'],
  thyme: ['thym'],
  rosemary: ['romarin'],
  orange: ['oranger'],
  citrus: ['agrumes'],
  flower: ['fleurs'],
  flowers: ['fleurs'],
  wildflower: ['fleurs', 'sauvage'],
  wild: ['sauvage'],
  pine: ['pin'],
  lavender: ['lavande'],
  carob: ['caroubier'],
  sage: ['sauge'],
  royal: ['royale'],
  jelly: ['gelee'],
  mountain: ['montagne'],
  stick: ['baton'],
  sticks: ['baton'],
};

const STOP_WORDS = new Set(['من', 'de', 'du', 'des', 'd', 'la', 'le', 'les', 'of', 'the', 'and', 'et', 'و']);

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[’'`()،,.;:!?«»"-]/g, ' ')
    .split(/\s+/)
    .map((w) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w))
    .filter(Boolean)
    .join(' ');
}

function variantsOf(token: string): string[] {
  const singular = token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token;
  return [token, singular, ...(SYNONYMS[token] ?? []), ...(SYNONYMS[singular] ?? [])];
}

export function searchProducts(products: Product[], query: string): Product[] {
  const tokens = normalizeSearch(query)
    .split(' ')
    .filter((t) => t && !STOP_WORDS.has(t));
  if (tokens.length === 0) return [];

  return products.filter((p) => {
    const haystack = normalizeSearch(
      [p.name, p.subtitle, p.description, p.categoryLabel, p.origin, p.producerLocation, p.batchCode]
        .filter(Boolean)
        .join(' '),
    );
    return tokens.every((token) => variantsOf(token).some((v) => haystack.includes(v)));
  });
}
