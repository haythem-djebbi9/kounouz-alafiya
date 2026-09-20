/**
 * Règles de nommage des déclinaisons commerciales (SKU).
 *
 * Fonctions pures, partagées par le service et les tests : un format de pot
 * saisi librement (« 500 g », « 1kg », « 250 G ») donne toujours le même poids
 * et le même suffixe de SKU.
 */

/** Poids net en grammes d'un format lisible, ou null si non reconnu. */
export function parsePackageSizeToGrams(size: string): number | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(kg|g)\s*$/i.exec(size);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(match[2].toLowerCase() === 'kg' ? value * 1000 : value);
}

/** Libellé normalisé d'un poids : 250 -> « 250 g », 1000 -> « 1 kg ». */
export function formatGrams(grams: number): string {
  if (grams >= 1000 && grams % 1000 === 0) return `${grams / 1000} kg`;
  if (grams >= 1000) return `${(grams / 1000).toString().replace('.', ',')} kg`;
  return `${grams} g`;
}

/** Suffixe de SKU : 500 g -> « 500G », 1 kg -> « 1000G », texte libre -> majuscules. */
export function skuSuffix(packageSize: string): string {
  const grams = parsePackageSizeToGrams(packageSize);
  if (grams !== null) return `${grams}G`;
  const cleaned = packageSize
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'STD';
}

export function buildSku(productCode: string, packageSize: string): string {
  return `${productCode}-${skuSuffix(packageSize)}`;
}
