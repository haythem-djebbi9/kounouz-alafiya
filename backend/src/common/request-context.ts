import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  // Identifiant de corrélation (§Observabilité 12) : relie la requête HTTP,
  // les entrées du journal d'audit et les événements métier qu'elle produit.
  correlationId: string;
  // Renseignés après authentification par ActorContextInterceptor.
  actorId: string | null;
  actorRole: string | null;
  // Override administratif en cours (§7 Permissions) : motif saisi par l'admin.
  overrideReason: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

const EMPTY_CONTEXT: RequestContext = {
  ipAddress: null,
  userAgent: null,
  correlationId: '',
  actorId: null,
  actorRole: null,
  overrideReason: null,
};

/**
 * Contexte de la requête en cours, lisible depuis n'importe quel service sans
 * le faire transiter par chaque signature : le journal d'audit et l'outbox
 * d'événements l'enregistrent ainsi pour toutes les actions.
 */
export function currentRequestContext(): RequestContext {
  return storage.getStore() ?? EMPTY_CONTEXT;
}

/** Exécute `fn` dans un contexte dédié (worker, tâches hors requête HTTP). */
export function runWithContext<T>(context: Partial<RequestContext>, fn: () => T): T {
  return storage.run({ ...EMPTY_CONTEXT, correlationId: randomUUID(), ...context }, fn);
}

// Un identifiant fourni par le client n'est repris que s'il est raisonnable :
// il finit dans les journaux, on refuse donc tout contenu exotique.
const CORRELATION_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/;

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const correlationId = candidate && CORRELATION_PATTERN.test(candidate) ? candidate : randomUUID();
  res.setHeader('X-Request-Id', correlationId);

  storage.run(
    {
      ...EMPTY_CONTEXT,
      ipAddress: clientIp(req),
      userAgent: req.headers['user-agent'] ?? null,
      correlationId,
    },
    next,
  );
}

export function clientIp(req: Request): string | null {
  // req.ip applique le réglage « trust proxy » (voir main.ts) : il remonte
  // X-Forwarded-For seulement à travers les proxys de confiance, là où la
  // première valeur brute de l'en-tête peut être forgée par le visiteur.
  const raw = req.ip || null;
  if (!raw) return null;
  if (raw === '::1') return '127.0.0.1';
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}
