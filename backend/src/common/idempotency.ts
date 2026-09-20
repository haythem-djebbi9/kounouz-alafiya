import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  OnApplicationBootstrap,
  OnModuleDestroy,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { type Observable, catchError, from, of, switchMap, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
// Statut provisoire : la requête d'origine est encore en cours d'exécution.
const IN_FLIGHT = 0;
const RETENTION_MS = 24 * 60 * 60_000;

/** Empreinte de la requête : une clé ne vaut que pour une requête identique. */
export function requestFingerprint(method: string, path: string, body: unknown): string {
  return createHash('sha256')
    .update(`${method.toUpperCase()} ${path}\n${JSON.stringify(body ?? null)}`)
    .digest('hex');
}

export function isValidIdempotencyKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

/**
 * Commandes rejouables sans doublon (§18 Règles métier, §16 Événements).
 *
 * Un client qui envoie `Idempotency-Key` sur un POST peut le renvoyer autant
 * de fois que nécessaire (double clic, coupure réseau sur le terrain) : seule
 * la première exécution crée l'enregistrement, les suivantes reçoivent la même
 * réponse avec l'en-tête `Idempotent-Replayed: true`.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: JwtPayload }>();
    const response = http.getResponse<Response>();

    const raw = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (request.method !== 'POST' || !key) return next.handle();
    if (!isValidIdempotencyKey(key)) {
      throw new BadRequestException('En-tête Idempotency-Key invalide (8 à 128 caractères [A-Za-z0-9_-]).');
    }

    const userId = request.user?.sub ?? '';
    const path = (request.originalUrl ?? request.url).split('?')[0];
    const fingerprint = requestFingerprint(request.method, path, request.body);

    return from(this.reserve(key, userId, path, fingerprint)).pipe(
      switchMap((existing) => {
        if (existing) {
          response.status(existing.statusCode);
          response.setHeader('Idempotent-Replayed', 'true');
          return of(existing.responseBody);
        }
        return next.handle().pipe(
          switchMap((body) =>
            from(
              this.prisma.idempotencyRecord.update({
                where: { key_userId: { key, userId } },
                data: {
                  statusCode: response.statusCode,
                  responseBody: (body ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                },
              }),
            ).pipe(switchMap(() => of(body))),
          ),
          // Échec : on libère la clé pour que le client puisse réessayer.
          catchError((err) =>
            from(this.prisma.idempotencyRecord.deleteMany({ where: { key, userId } })).pipe(
              switchMap(() => throwError(() => err)),
            ),
          ),
        );
      }),
    );
  }

  /**
   * Réserve la clé ; renvoie l'enregistrement existant s'il s'agit d'un rejeu.
   */
  private async reserve(key: string, userId: string, path: string, fingerprint: string) {
    try {
      await this.prisma.idempotencyRecord.create({
        data: { key, userId, method: 'POST', path, requestHash: fingerprint, statusCode: IN_FLIGHT },
      });
      return null;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }

    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { key_userId: { key, userId } } });
    if (!existing) {
      // Libérée entre-temps après un échec : le client peut simplement réessayer.
      throw new ConflictException('Requête concurrente sur la même clé, réessayez.');
    }
    if (existing.requestHash !== fingerprint) {
      throw new UnprocessableEntityException('Cette Idempotency-Key a déjà servi pour une requête différente.');
    }
    if (existing.statusCode === IN_FLIGHT) {
      throw new ConflictException('La requête d\'origine est encore en cours de traitement.');
    }
    return existing;
  }
}

/** Purge périodique des clés expirées (24 h de rétention). */
@Injectable()
export class IdempotencyJanitor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyJanitor.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.purge(), 60 * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async purge() {
    try {
      const { count } = await this.prisma.idempotencyRecord.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
      });
      if (count > 0) this.logger.log(`${count} clé(s) d'idempotence expirée(s) purgée(s).`);
    } catch (err) {
      this.logger.warn(`Purge des clés d'idempotence impossible : ${(err as Error).message}`);
    }
  }
}
