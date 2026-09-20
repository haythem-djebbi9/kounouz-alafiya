/**
 * Agrégation des ventes par SKU (§12 Ventes, SAL-01/04).
 *
 * Les formats de pot n'ont ni le même prix ni la même marge : le producteur
 * doit voir, pour chaque SKU, les unités vendues, le chiffre d'affaires brut,
 * la commission Kounouz et son net. Fonction pure, partagée par le portail
 * producteur et les tests.
 */

export interface SaleLine {
  sku: string | null;
  productName: string;
  packageSize: string | null;
  quantity: number;
  lineTotal: number | { toString(): string };
  commissionAmount: number | { toString(): string };
  netAmount: number | { toString(): string };
}

export interface SkuSummary {
  sku: string;
  productName: string;
  packageSize: string | null;
  unitsSold: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function aggregateBySku(lines: SaleLine[]): SkuSummary[] {
  const bySku = new Map<string, SkuSummary>();
  for (const line of lines) {
    // Lignes antérieures aux SKU : regroupées par produit et format.
    const key = line.sku ?? `${line.productName} ${line.packageSize ?? ''}`.trim();
    const current = bySku.get(key) ?? {
      sku: line.sku ?? '—',
      productName: line.productName,
      packageSize: line.packageSize,
      unitsSold: 0,
      grossAmount: 0,
      commissionAmount: 0,
      netAmount: 0,
    };
    current.unitsSold += line.quantity;
    current.grossAmount += Number(line.lineTotal);
    current.commissionAmount += Number(line.commissionAmount);
    current.netAmount += Number(line.netAmount);
    bySku.set(key, current);
  }
  return [...bySku.values()]
    .map((s) => ({
      ...s,
      grossAmount: round2(s.grossAmount),
      commissionAmount: round2(s.commissionAmount),
      netAmount: round2(s.netAmount),
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount);
}

/** Montants d'une ligne de vente pour un taux de commission donné. */
export function lineAmounts(unitPrice: number, quantity: number, rate: number) {
  const lineTotal = round2(unitPrice * quantity);
  const commissionAmount = round2(lineTotal * rate);
  return { lineTotal, commissionAmount, netAmount: round2(lineTotal - commissionAmount) };
}
