// Règles commerciales de la boutique, identiques à celles de l'API
// (backend/src/sales/sales.service.ts) : livraison offerte au-delà du seuil.
export const SHIPPING_FEE = 25;
export const FREE_SHIPPING_THRESHOLD = 200;

export const isShippingFree = (subtotal: number) => subtotal > FREE_SHIPPING_THRESHOLD;
