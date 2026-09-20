/**
 * Seuils de délai (SLA) des étapes du parcours de vérification (§14
 * Monitoring). Ils sont modifiables par l'administration sans redéploiement ;
 * ces valeurs ne sont que les défauts de démarrage.
 */
export interface SlaThresholds {
  /** Demande soumise non tranchée (revue). */
  requestReviewHours: number;
  /** Mission de collecte non réalisée après la date prévue. */
  collectionOverdueDays: number;
  /** Échantillon réceptionné non remis au laboratoire. */
  sampleToLabDays: number;
  /** Bulletin clôturé sans décision. */
  analysisToDecisionDays: number;
  /** Lot vérifié non emballé. */
  verificationToPackagingDays: number;
  /** Lot emballé non publié. */
  packagingToPublicationDays: number;
  /** Période de ventes close non réglée au producteur. */
  settlementDays: number;
}

export const DEFAULT_SLA: SlaThresholds = {
  requestReviewHours: 48,
  collectionOverdueDays: 2,
  sampleToLabDays: 3,
  analysisToDecisionDays: 5,
  verificationToPackagingDays: 10,
  packagingToPublicationDays: 7,
  settlementDays: 20,
};

const BOUNDS: Record<keyof SlaThresholds, [number, number]> = {
  requestReviewHours: [1, 24 * 30],
  collectionOverdueDays: [0, 90],
  sampleToLabDays: [0, 90],
  analysisToDecisionDays: [0, 90],
  verificationToPackagingDays: [0, 180],
  packagingToPublicationDays: [0, 180],
  settlementDays: [0, 180],
};

/**
 * Fusionne une saisie avec les seuils courants. Toute valeur hors bornes ou
 * non entière est refusée : un seuil aberrant masquerait les retards.
 */
export function mergeSla(current: SlaThresholds, input: Partial<Record<string, unknown>>): SlaThresholds {
  const next: SlaThresholds = { ...current };
  for (const key of Object.keys(DEFAULT_SLA) as (keyof SlaThresholds)[]) {
    if (!(key in input) || input[key] === undefined) continue;
    const value = Number(input[key]);
    const [min, max] = BOUNDS[key];
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new RangeError(`${key} doit être un entier entre ${min} et ${max}.`);
    }
    next[key] = value;
  }
  return next;
}

/** Date limite avant laquelle une étape commencée est en retard. */
export function overdueBefore(now: Date, amount: number, unit: 'hours' | 'days'): Date {
  const ms = unit === 'hours' ? amount * 3_600_000 : amount * 86_400_000;
  return new Date(now.getTime() - ms);
}
