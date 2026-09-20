import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { currentRequestContext } from './request-context.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

/**
 * Reporte l'utilisateur authentifié dans le contexte de requête.
 *
 * Le middleware de contexte s'exécute avant l'authentification ; les
 * intercepteurs, eux, passent après les gardes : c'est ici que l'identité et
 * le rôle de l'acteur deviennent disponibles pour l'audit et les événements.
 */
@Injectable()
export class ActorContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const user = context.switchToHttp().getRequest().user as JwtPayload | undefined;
      const store = currentRequestContext();
      // Le contexte vide partagé (hors requête) ne doit jamais être muté.
      if (user && store.correlationId) {
        store.actorId = user.sub;
        store.actorRole = user.role;
      }
    }
    return next.handle();
  }
}
