import type { Product as MockProduct } from '../types';
import type { PublicProduct } from './marketplace-hooks';
import { resolveFileUrl } from './api';

// Le template de vitrine (composants existants) attend la forme `Product` de
// ../types.ts. Cet adaptateur relie les vraies données de l'API à cette forme
// sans réécrire les composants d'affichage déjà en place. Les champs sans
// équivalent réel (notes, avis) restent neutres plutôt que d'être inventés —
// voir la note sur `purity` ci-dessous.
export function toMockProduct(p: PublicProduct): MockProduct {
  const producer = p.batch?.verification?.request.producer;
  const variants = (p.variants ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    packageSize: v.packageSize,
    price: Number(v.price),
    stock: v.stock,
    isDefault: v.isDefault,
  }));
  // Format présenté par défaut : le SKU par défaut en stock, sinon le premier
  // format disponible, sinon le premier tout court.
  const preferred =
    variants.find((v) => v.isDefault && v.stock > 0) ?? variants.find((v) => v.stock > 0) ?? variants[0];

  return {
    id: p.id,
    name: p.nom,
    subtitle: p.gamme ?? p.categorie.nom,
    category: p.categorie.slug,
    categoryLabel: p.categorie.nom,
    price: preferred ? preferred.price : Number(p.prix),
    weight: preferred ? preferred.packageSize : (p.packaging?.size ?? ''),
    variants,
    // Aucun système d'avis dans le backend : on affiche honnêtement 0 plutôt
    // que d'inventer une note ou un nombre d'avis.
    rating: 0,
    reviewsCount: 0,
    image: p.images[0] ? resolveFileUrl(p.images[0]) : '/images/cover.png',
    description: p.description ?? '',
    origin: producer ? `${producer.location}` : p.categorie.nom,
    producerLocation: producer?.location || undefined,
    batchCode: p.batch?.batchCode ?? '',
    benefits: [],
    // Chaque produit du catalogue public a, par construction, déjà traversé
    // tout le pipeline de vérification (seul un lot VERIFIED + READY permet
    // la publication) — ce badge est donc toujours vrai, pas une estimation.
    purity: 'منتج موثّق مخبرياً',
    qrId: p.qrCode?.qrId,
  };
}
