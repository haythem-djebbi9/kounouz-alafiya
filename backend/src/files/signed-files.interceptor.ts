import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { type Observable, map } from 'rxjs';
import {
  isPrivateUploadPath,
  mapStringsInPlace,
  signUploadPath,
  signingConfigFromEnv,
  stripUploadSignature,
} from './file-signing.js';

/**
 * Signe les chemins de fichiers privés dans les réponses authentifiées, et
 * retire les signatures des données reçues.
 *
 * - Sortie : un utilisateur autorisé à lire une fiche (échantillon, bulletin,
 *   produit...) reçoit des URL signées vers ses pièces ; une requête anonyme
 *   n'en reçoit jamais.
 * - Entrée : le client renvoie parfois ces URL (photos d'une collecte déjà
 *   téléversées) ; on stocke toujours le chemin nu, jamais une URL expirante.
 */
@Injectable()
export class SignedFilesInterceptor implements NestInterceptor {
  private readonly config = signingConfigFromEnv();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest();

    if (request.body && typeof request.body === 'object') {
      mapStringsInPlace(request.body, stripUploadSignature);
    }

    if (!request.user || !this.config.secret) return next.handle();

    return next.handle().pipe(
      map((body) =>
        mapStringsInPlace(body, (value) => (isPrivateUploadPath(value) ? signUploadPath(value, this.config) : value)),
      ),
    );
  }
}
