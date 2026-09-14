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

  return {
    id: p.id,
    name: p.nom,
    subtitle: p.gamme ?? p.categorie.nom,
    category: p.categorie.slug,
    categoryLabel: p.categorie.nom,
    price: Number(p.prix),
    weight: p.packaging?.size ?? '',
    // Aucun système d'avis dans le backend : on affiche honnêtement 0 plutôt
    // que d'inventer une note ou un nombre d'avis.
    rating: 0,
    reviewsCount: 0,
    image: p.images[0] ? resolveFileUrl(p.images[0]) : '/images/cover.png',
    description: p.description ?? '',
    origin: producer ? `${producer.location}` : p.categorie.nom,
    batchCode: p.batch?.batchCode ?? '',
    benefits: [],
    // Chaque produit du catalogue public a, par construction, déjà traversé
    // tout le pipeline de vérification (seul un lot VERIFIED + READY permet
    // la publication) — ce badge est donc toujours vrai, pas une estimation.
    purity: 'منتج موثّق مخبرياً',
    qrId: p.qrCode?.qrId,
  };
}
