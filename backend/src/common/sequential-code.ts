// Génère un code séquentiel du type PREFIX-000123, basé sur le nombre
// d'enregistrements existants. Suffisant pour un usage mono-instance ;
// l'unicité en base (@unique) reste le garde-fou en cas de course.
export function padSequence(n: number, width = 6): string {
  return String(n).padStart(width, '0');
}

export function buildCode(prefix: string, count: number): string {
  return `${prefix}-${padSequence(count + 1)}`;
}
