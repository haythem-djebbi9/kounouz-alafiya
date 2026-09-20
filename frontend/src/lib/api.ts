import { tokenStorage } from './tokenStorage';

// API versionnée : /api/v1 (l'ancien préfixe /api reste accepté par le serveur).
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
// Origine du backend sans le préfixe /api[/vN], pour les fichiers (ex: /uploads/...).
const API_ORIGIN = API_URL.replace(/\/api(\/v\d+)?\/?$/, '');

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Levée quand le serveur est injoignable (backend arrêté, coupure réseau, mauvais VITE_API_URL...),
// à distinguer d'une ApiError (le serveur a répondu, mais avec une erreur).
export class NetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'NetworkError';
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      tokenStorage.clear();
      return false;
    }
    const data = await res.json();
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    tokenStorage.clear();
    return false;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  isRetry?: boolean;
  /**
   * Clé d'idempotence d'une commande : renvoyer la même requête avec la même
   * clé (double clic, réseau instable) ne crée jamais de doublon côté serveur.
   */
  idempotencyKey?: string;
  /** Motif d'override administratif déjà saisi (rejeu après une 428). */
  overrideReason?: string;
}

/**
 * Fournisseur du motif d'override administratif.
 *
 * Quand un admin exécute une action réservée à l'Équipe de Vérification, le
 * serveur répond 428 OVERRIDE_REASON_REQUIRED : on demande alors le motif à
 * l'utilisateur (boîte de dialogue montée à la racine de l'application) puis
 * on rejoue la requête. `null` = l'utilisateur a annulé.
 */
type OverrideReasonProvider = (context: { method: string; path: string; message: string }) => Promise<string | null>;
let overrideReasonProvider: OverrideReasonProvider | null = null;

export function setOverrideReasonProvider(provider: OverrideReasonProvider | null) {
  overrideReasonProvider = provider;
}

/** Nouvelle clé d'idempotence pour une action utilisateur. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, isRetry, headers, idempotencyKey, overrideReason, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (idempotencyKey) {
    finalHeaders['Idempotency-Key'] = idempotencyKey;
  }
  if (overrideReason) {
    // Encodé : un en-tête HTTP ne transporte que de l'ASCII.
    finalHeaders['X-Override-Reason'] = encodeURIComponent(overrideReason);
  }

  if (!skipAuth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      finalHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 401 && !skipAuth && !isRetry) {
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(path, { ...options, isRetry: true });
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as any).message) : res.statusText;

    // Override administratif : on demande le motif puis on rejoue une fois.
    const code = typeof data === 'object' && data && 'code' in data ? String((data as any).code) : '';
    if (res.status === 428 && code === 'OVERRIDE_REASON_REQUIRED' && !overrideReason && overrideReasonProvider) {
      const reason = await overrideReasonProvider({ method: rest.method ?? 'GET', path, message });
      if (reason) {
        return request<T>(path, { ...options, overrideReason: reason });
      }
    }

    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

// Ne réécrit que les fichiers réellement servis par le backend (/uploads/...).
// Les autres chemins relatifs (ex: /images/...) sont des assets statiques du
// frontend et doivent rester tels quels.
export function resolveFileUrl(path: string): string {
  if (path.startsWith('http') || !path.startsWith('/uploads')) {
    return path;
  }
  return `${API_ORIGIN}${path}`;
}

export { API_URL };
