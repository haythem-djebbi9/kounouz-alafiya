import { LabTestStatus } from '@prisma/client';

// Référentiel qualité Kounouz pour le miel tunisien. Les seuils suivent le
// Codex Alimentarius (norme 12-1981) et la directive 2001/110/CE.
//
// Ce catalogue décrit le bulletin vierge : à la saisie, chaque plage est
// recopiée sur la ligne LabTestResult correspondante. Faire évoluer un seuil
// ici n'altère donc jamais un bulletin déjà validé.

export type LabParameterKind = 'NUMERIC' | 'QUALITATIVE' | 'ABSENCE';

export interface LabParameter {
  key: string;
  kind: LabParameterKind;
  unit: string | null;
  min: number | null;
  max: number | null;
  /** Plage affichée quand elle ne se déduit pas de min/max (ex: « Non détecté »). */
  referenceText: string | null;
  position: number;
}

export const LAB_PARAMETERS: LabParameter[] = [
  { key: 'moisture', kind: 'NUMERIC', unit: '%', min: null, max: 20, referenceText: null, position: 1 },
  { key: 'hmf', kind: 'NUMERIC', unit: 'mg/kg', min: null, max: 40, referenceText: null, position: 2 },
  { key: 'diastase', kind: 'NUMERIC', unit: 'DN', min: 8, max: null, referenceText: null, position: 3 },
  { key: 'conductivity', kind: 'NUMERIC', unit: 'mS/cm', min: null, max: 0.8, referenceText: null, position: 4 },
  { key: 'ph', kind: 'NUMERIC', unit: null, min: 3.4, max: 4.5, referenceText: null, position: 5 },
  { key: 'freeAcidity', kind: 'NUMERIC', unit: 'meq/kg', min: null, max: 50, referenceText: null, position: 6 },
  { key: 'sugarProfile', kind: 'QUALITATIVE', unit: null, min: null, max: null, referenceText: null, position: 7 },
  { key: 'pollenAnalysis', kind: 'QUALITATIVE', unit: null, min: null, max: null, referenceText: null, position: 8 },
  { key: 'antibiotics', kind: 'ABSENCE', unit: null, min: null, max: null, referenceText: 'NOT_DETECTED', position: 9 },
];

export const LAB_PARAMETER_BY_KEY = new Map(LAB_PARAMETERS.map((p) => [p.key, p]));

/**
 * Positionne une valeur saisie vis-à-vis de sa plage de référence.
 *
 * Une valeur vide reste NOT_APPLICABLE : tant que l'analyste n'a rien saisi,
 * le paramètre ne doit pas compter comme conforme.
 */
export function evaluateParameter(parameter: LabParameter, value: string | null | undefined): LabTestStatus {
  const raw = (value ?? '').trim();
  if (!raw) return LabTestStatus.NOT_APPLICABLE;

  if (parameter.kind === 'ABSENCE') {
    // On accepte les libellés usuels du bulletin ainsi que « 0 ».
    const normalized = raw.toLowerCase();
    const absent =
      normalized === '0' ||
      normalized.startsWith('non détect') ||
      normalized.startsWith('non detect') ||
      normalized.startsWith('not detect') ||
      normalized.startsWith('nd');
    return absent ? LabTestStatus.NOT_DETECTED : LabTestStatus.DETECTED;
  }

  if (parameter.kind === 'QUALITATIVE') {
    return LabTestStatus.NOT_APPLICABLE;
  }

  // Tolère la virgule décimale, courante sur les bulletins francophones.
  const numeric = Number(raw.replace(',', '.'));
  if (!Number.isFinite(numeric)) return LabTestStatus.NOT_APPLICABLE;
  if (parameter.min !== null && numeric < parameter.min) return LabTestStatus.OUT_OF_RANGE;
  if (parameter.max !== null && numeric > parameter.max) return LabTestStatus.OUT_OF_RANGE;
  return LabTestStatus.WITHIN_RANGE;
}

/**
 * Un bulletin n'est conforme que si aucun paramètre n'est hors plage et
 * qu'aucun résidu d'antibiotique n'a été détecté. Les paramètres qualitatifs
 * (profil sucres, pollens) sont appréciés par l'analyste, pas par la machine :
 * ils ne peuvent donc pas rendre un bulletin non conforme à eux seuls.
 */
export function isAnalysisCompliant(results: { status: LabTestStatus }[]): boolean {
  return !results.some(
    (r) => r.status === LabTestStatus.OUT_OF_RANGE || r.status === LabTestStatus.DETECTED,
  );
}
