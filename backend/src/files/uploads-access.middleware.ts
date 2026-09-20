import type { NextFunction, Request, Response } from 'express';
import {
  PRIVATE_UPLOAD_PREFIXES,
  PUBLIC_UPLOAD_PREFIXES,
  signingConfigFromEnv,
  verifyUploadSignature,
} from './file-signing.js';

// Lu à la première requête : en local, le fichier .env n'est chargé qu'à
// l'initialisation du module Nest, après l'import de ce fichier.
let config: ReturnType<typeof signingConfigFromEnv> | null = null;

/**
 * Garde d'accès devant le service statique de /uploads.
 *
 * Les visuels publics passent librement ; les preuves et documents internes
 * exigent une URL signée valide, et toute autre arborescence est refusée
 * (pas d'énumération possible du stockage).
 */
export function uploadsAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  const segments = req.path.split('/').filter(Boolean);
  const prefix = segments[0] ?? '';

  if (segments.some((s) => s === '..' || s.startsWith('.'))) {
    res.status(400).json({ statusCode: 400, message: 'Chemin invalide.' });
    return;
  }

  if (PUBLIC_UPLOAD_PREFIXES.has(prefix)) {
    next();
    return;
  }

  if (PRIVATE_UPLOAD_PREFIXES.has(prefix)) {
    const path = `/uploads${req.path}`;
    config ??= signingConfigFromEnv();
    if (verifyUploadSignature(path, req.query.exp, req.query.sig, config)) {
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
      return;
    }
    res.status(403).json({
      statusCode: 403,
      message: 'Fichier interne : accès réservé aux utilisateurs autorisés.',
    });
    return;
  }

  res.status(404).json({ statusCode: 404, message: 'Fichier introuvable.' });
}
