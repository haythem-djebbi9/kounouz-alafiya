import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Accès autorisé aux fichiers téléversés (§13 Sécurité, §8 Infrastructure).
 *
 * Deux familles de fichiers vivent sous /uploads :
 *  - PUBLICS : visuels destinés au site (images produit, photo du producteur) ;
 *  - PRIVÉS : preuves et documents internes — photos de collecte et de
 *    scellé, bulletins d'analyse, échantillons de référence, documents
 *    produit. Ils ne sont jamais servis sans une URL signée.
 *
 * L'URL signée n'est délivrée que dans la réponse d'une requête authentifiée
 * et autorisée : c'est l'autorisation de la route métier qui ouvre l'accès au
 * fichier, sans exposer d'identifiant de stockage.
 */

export const PUBLIC_UPLOAD_PREFIXES = new Set(['products', 'producers']);
export const PRIVATE_UPLOAD_PREFIXES = new Set(['samples', 'analyses', 'reference-honeys', 'product-documents']);

const PRIVATE_PATH = /^\/uploads\/(samples|analyses|reference-honeys|product-documents)\/[^?#\s]+$/;
const SIGNED_PATH = /^(\/uploads\/[^?#\s]+)\?exp=\d+&sig=[A-Za-z0-9_-]+$/;

export interface SigningConfig {
  secret: string;
  ttlSeconds: number;
}

export function signingConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SigningConfig {
  const secret = env.FILES_SIGNING_SECRET || env.JWT_ACCESS_SECRET || '';
  const ttl = Number(env.FILES_URL_TTL_SECONDS);
  return { secret, ttlSeconds: Number.isInteger(ttl) && ttl >= 60 ? ttl : 3600 };
}

export function isPrivateUploadPath(value: string): boolean {
  return PRIVATE_PATH.test(value);
}

function signature(path: string, exp: number, secret: string): string {
  return createHmac('sha256', secret).update(`${path}:${exp}`).digest('base64url');
}

/**
 * Signe un chemin privé. L'échéance est alignée sur une fenêtre de TTL : dans
 * une même fenêtre, l'URL est identique et reste donc en cache navigateur.
 */
export function signUploadPath(path: string, config: SigningConfig, nowMs = Date.now()): string {
  const now = Math.floor(nowMs / 1000);
  const exp = (Math.floor(now / config.ttlSeconds) + 2) * config.ttlSeconds;
  return `${path}?exp=${exp}&sig=${signature(path, exp, config.secret)}`;
}

export function verifyUploadSignature(
  path: string,
  exp: unknown,
  sig: unknown,
  config: SigningConfig,
  nowMs = Date.now(),
): boolean {
  if (typeof exp !== 'string' || typeof sig !== 'string' || !config.secret) return false;
  const expiry = Number(exp);
  if (!Number.isInteger(expiry) || expiry * 1000 < nowMs) return false;
  const expected = Buffer.from(signature(path, expiry, config.secret));
  const received = Buffer.from(sig);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Retire une signature d'un chemin renvoyé par le client avant stockage. */
export function stripUploadSignature(value: string): string {
  const match = SIGNED_PATH.exec(value);
  return match ? match[1] : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Applique `transform` à toutes les chaînes d'une structure JSON (objets
 * simples et tableaux), en place. Les autres objets (Date, Decimal, Buffer,
 * flux) sont laissés intacts : leur sérialisation propre doit être préservée.
 */
export function mapStringsInPlace(value: unknown, transform: (s: string) => string, depth = 0): unknown {
  if (typeof value === 'string') return transform(value);
  if (depth > 12) return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = mapStringsInPlace(value[i], transform, depth + 1);
    return value;
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) value[key] = mapStringsInPlace(value[key], transform, depth + 1);
  }
  return value;
}
