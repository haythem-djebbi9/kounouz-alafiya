import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { type Observable, from, switchMap } from 'rxjs';
import { AuditService } from '../audit/audit.service.js';
import { currentRequestContext } from './request-context.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

/**
 * Marque une action opérationnelle sensible (matrice des permissions, colonne
 * « A* ») : l'Équipe de Vérification l'exécute normalement, un Admin ne peut
 * l'exécuter qu'en override motivé et tracé (§7 et §14 Permissions).
 */
export const SENSITIVE_ACTION_KEY = 'kounouz:sensitiveAction';
export const SensitiveAction = () => SetMetadata(SENSITIVE_ACTION_KEY, true);

export const OVERRIDE_REASON_HEADER = 'x-override-reason';
export const OVERRIDE_REASON_MIN_LENGTH = 5;

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Lit le motif transmis dans l'en-tête (encodé en URI par le client). */
export function readOverrideReason(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // En-tête non encodé : on garde la valeur brute.
  }
  const trimmed = decoded.trim().slice(0, 500);
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class AdminOverrideInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const sensitive = this.reflector.getAllAndOverride<boolean>(SENSITIVE_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!sensitive || !user || user.role !== Role.ADMIN || !MUTATIONS.has(request.method)) {
      return next.handle();
    }

    const reason = readOverrideReason(request.headers[OVERRIDE_REASON_HEADER]);
    if (!reason || reason.length < OVERRIDE_REASON_MIN_LENGTH) {
      // 428 Precondition Required : le client doit rejouer la requête en
      // fournissant le motif — l'interface affiche alors une boîte de saisie.
      throw new HttpException(
        {
          statusCode: HttpStatus.PRECONDITION_REQUIRED,
          code: 'OVERRIDE_REASON_REQUIRED',
          message:
            "Action réservée à l'Équipe de Vérification : un administrateur doit motiver cet override.",
        },
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }

    // Les entrées d'audit écrites par le service métier pendant cette requête
    // seront marquées comme override et porteront ce motif.
    currentRequestContext().overrideReason = reason;

    return next.handle().pipe(
      switchMap((result) =>
        from(
          this.audit
            .log(user.sub, 'ADMIN_OVERRIDE', 'System', request.params?.id ?? request.params?.qrId ?? '-', {
              module: 'SYSTEM',
              details: `${request.method} ${request.originalUrl ?? request.url}`,
              reason,
            })
            .then(() => result),
        ),
      ),
    );
  }
}
