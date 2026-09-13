export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: 'honey' | 'royal-jelly' | 'propolis' | 'bundles' | 'sticks' | 'pollen';
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
}

export interface VerificationBatch {
  batchCode: string;
  productName: string;
  harvestDate: string;
  expiryDate: string;
  origin: string;
  location: string;
  beekeeper: string;
  labCertificateNo: string;
  testDate: string;
  purityScore: number;
  moisturePercentage: number;
  sucrosePercentage: number;
  fructoseGlucosePercentage: number;
  hmfScore: number;
  pollenAnalysis: string;
  status: 'verified' | 'premium' | 'certified';
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
