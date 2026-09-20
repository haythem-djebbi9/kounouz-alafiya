/**
 * Politique de reprise des gestionnaires d'événements (§16 Architecture
 * événementielle) : reprises bornées avec attente exponentielle, puis file
 * d'erreurs (dead-letter) et alerte d'exploitation.
 */

export const DEFAULT_MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 10 * 60_000;

/** Délai avant la tentative suivante : 5 s, 10 s, 20 s... plafonné à 10 min. */
export function backoffDelayMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(BASE_DELAY_MS * 2 ** exponent, MAX_DELAY_MS);
}

/** Vrai quand l'événement a épuisé ses tentatives et part en dead-letter. */
export function isExhausted(attempts: number, maxAttempts = DEFAULT_MAX_ATTEMPTS): boolean {
  return attempts >= maxAttempts;
}

export function maxAttemptsFromEnv(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ATTEMPTS;
}
