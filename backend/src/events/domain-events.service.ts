import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentRequestContext } from '../common/request-context.js';
import { EVENT_SCHEMA_VERSION, type EventTypeName } from './event-types.js';

export interface PublishOptions {
  /** Événement à l'origine de celui-ci (chaîne de causalité). */
  causationId?: string;
  /**
   * Clé métier d'unicité : publier deux fois le même fait (ex: re-soumission
   * après une coupure réseau) ne crée qu'un seul événement.
   */
  idempotencyKey?: string;
}

/**
 * Publication d'événements métier dans l'outbox.
 *
 * Appelé juste après l'écriture qui constitue le fait (EV-01) : si cette
 * écriture échoue, on n'arrive jamais ici et aucun événement n'est publié
 * (EV-02). Le traitement est ensuite asynchrone (EventsWorker).
 *
 * La publication ne doit jamais faire échouer l'action métier déjà validée :
 * une erreur d'outbox est journalisée et l'action reste acquise.
 */
@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async publish(
    eventType: EventTypeName,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown> = {},
    options: PublishOptions = {},
  ) {
    const context = currentRequestContext();
    try {
      return await this.prisma.domainEvent.create({
        data: {
          eventType,
          entityType,
          entityId,
          payload: payload as Prisma.InputJsonValue,
          actorId: context.actorId,
          actorRole: context.actorRole,
          correlationId: context.correlationId || null,
          causationId: options.causationId ?? null,
          schemaVersion: EVENT_SCHEMA_VERSION,
          idempotencyKey: options.idempotencyKey ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Même clé d'idempotence : le fait est déjà enregistré.
        return this.prisma.domainEvent.findUnique({ where: { idempotencyKey: options.idempotencyKey } });
      }
      this.logger.error(`Publication de ${eventType} impossible pour ${entityType}#${entityId}`, err as Error);
      return null;
    }
  }
}
