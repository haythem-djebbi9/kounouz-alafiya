export interface Product {
  id: string;
  name: string;
  subtitle: string;
  // Slug de catégorie — géré dynamiquement par l'équipe (voir Centre de
  // vérification, étape 8), pas un ensemble fixe.
  category: string;
  categoryLabel: string;
  price: number;
  oldPrice?: number;
  weight: string;
  rating: number;
  reviewsCount: number;
  image: string;
  description: string;
  origin: string;
  // Localité réelle du rucher (ex: « Zaghouan, Tunisie »), absente sans producteur rattaché.
  producerLocation?: string;
  batchCode: string;
  benefits: string[];
  purity: string;
  isBestSeller?: boolean;
  isNew?: boolean;
  // Identifiant réel du QR code (branché sur l'API) — absent pour les données
  // d'exemple restantes du template.
  qrId?: string;
  // Formats en vente (SKU) : chacun a son prix et son stock.
  variants?: MarketVariant[];
}

export interface MarketVariant {
  id: string;
  sku: string;
  packageSize: string;
  price: number;
  stock: number;
  isDefault: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatar: string;
  rating: number;
  quote: string;
  verifiedPurchase: boolean;
  productBought?: string;
}

export interface Article {
  id: string;
  title: string;
  date: string;
  image: string;
  readTime: string;
  snippet: string;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedWeight: string;
  // SKU commandé et son prix unitaire : la vente se fait au format choisi.
  variantId?: string;
  unitPrice?: number;
}

/** Une ligne de panier = un produit dans un format donné. */
export function cartLineKey(item: Pick<CartItem, 'product' | 'variantId' | 'selectedWeight'>): string {
  return `${item.product.id}:${item.variantId ?? item.selectedWeight}`;
}

export type PageView = 'home' | 'products' | 'story' | 'verify' | 'contact' | 'help' | 'settings';
