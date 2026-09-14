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
  batchCode: string;
  benefits: string[];
  purity: string;
  isBestSeller?: boolean;
  isNew?: boolean;
  // Identifiant réel du QR code (branché sur l'API) — absent pour les données
  // d'exemple restantes du template.
  qrId?: string;
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
}

export type PageView = 'home' | 'products' | 'story' | 'verify' | 'contact';
