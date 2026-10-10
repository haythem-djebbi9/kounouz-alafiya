import type { LabTestResult } from '@prisma/client';

// Représentation publique approuvée d'un bulletin d'analyse : uniquement les
// paramètres normés saisis par Kounouz, jamais le JSON libre `results` ni
// `conclusion` / `internalNotes`. Partagée par la page de vérification (scan
// d'un QR) et la fiche produit du catalogue, pour qu'elles affichent la même chose.
export function toPublicLabParameters(testResults: LabTestResult[]) {
  return testResults.map((test) => ({
    parameterKey: test.parameterKey,
    value: test.value,
    unit: test.unit,
    status: test.status,
    reference:
      test.referenceText ??
      (test.referenceMin !== null && test.referenceMax !== null
        ? `${test.referenceMin} – ${test.referenceMax}`
        : test.referenceMax !== null
          ? `≤ ${test.referenceMax}`
          : test.referenceMin !== null
            ? `≥ ${test.referenceMin}`
            : null),
  }));
}
