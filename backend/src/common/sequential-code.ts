// Génère un code séquentiel du type PREFIX-000123, basé sur le nombre
// d'enregistrements existants. Suffisant pour un usage mono-instance ;
// l'unicité en base (@unique) reste le garde-fou en cas de course.
export function padSequence(n: number, width = 6): string {
  return String(n).padStart(width, '0');
}

export function buildCode(prefix: string, count: number, width = 6): string {
  return `${prefix}-${padSequence(count + 1, width)}`;
}

/**
 * Attribue un code annuel du type `SM-2026-001`, unique en base.
 *
 * Le compteur repart à 1 chaque année. `countExisting` reçoit le préfixe
 * `PREFIX-ANNÉE-` et renvoie le nombre de codes déjà attribués ; on retente
 * avec le numéro suivant tant que l'unicité en base est refusée, ce qui couvre
 * les attributions concurrentes sans verrou applicatif.
 */
export async function allocateYearCode<T>(
  prefix: string,
  countExisting: (codePrefix: string) => Promise<number>,
  persist: (code: string) => Promise<T>,
  { width = 3, year = new Date().getFullYear(), attempts = 5 } = {},
): Promise<T> {
  const codePrefix = `${prefix}-${year}-`;
  const count = await countExisting(codePrefix);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const code = `${codePrefix}${padSequence(count + 1 + attempt, width)}`;
    try {
      return await persist(code);
    } catch (err) {
      // P2002 = violation de contrainte d'unicité : un autre appel a pris ce
      // numéro entre-temps, on passe au suivant. Toute autre erreur remonte.
      if (!isUniqueViolation(err)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
