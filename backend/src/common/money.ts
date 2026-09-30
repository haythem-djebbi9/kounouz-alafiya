/**
 * Montant en dinars tunisiens pour les textes produits par le serveur
 * (notifications, reçus PDF, exports, journal) : trois décimales, les
 * millimes, à la tunisienne — « 89,900 DT ».
 */
export function formatDt(value: number | string | { toString(): string }): string {
  return `${Number(value).toFixed(3).replace('.', ',')} DT`;
}
