/**
 * Un produit porte désormais autant de QR que d'unités mises en marché (§17),
 * alors que la fiche produit — marketplace, back-office, page publique — n'en
 * affiche qu'un.
 *
 * Ces aides exposent ce QR de référence sous le nom `qrCode`, tel que le
 * frontend l'attend depuis toujours : le passage au QR unitaire reste ainsi
 * invisible pour tout ce qui ne s'intéresse qu'à la fiche produit.
 */

/** Sélecteur Prisma : le premier QR généré pour le produit. */
// Les QR d'une campagne partagent le même horodatage : le numéro de série
// départage, pour que le QR de référence reste stable d'un appel à l'autre.
export const PRIMARY_QR_SELECT = {
  take: 1,
  orderBy: [{ createdAt: 'asc' as const }, { serialNumber: 'asc' as const }],
  select: { qrId: true as const, qrCode: true as const },
};

/** Variante complète, pour les vues back-office qui affichent le QR entier. */
export const PRIMARY_QR_FULL = {
  take: 1,
  orderBy: [{ createdAt: 'asc' as const }, { serialNumber: 'asc' as const }],
};

type WithQrCodes<T> = T & { qrCodes?: unknown[] };

/** Remplace la liste `qrCodes` par un champ `qrCode` (le premier, ou null). */
export function withPrimaryQr<T extends object>(product: WithQrCodes<T>) {
  const { qrCodes, ...rest } = product;
  return { ...rest, qrCode: qrCodes?.[0] ?? null } as Omit<T, 'qrCodes'> & { qrCode: unknown };
}

export function withPrimaryQrAll<T extends object>(products: WithQrCodes<T>[]) {
  return products.map((product) => withPrimaryQr(product));
}
