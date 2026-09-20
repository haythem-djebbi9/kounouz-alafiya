import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DomainEventStatus, NotificationType, Prisma, Role, type DomainEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../audit/audit.service.js';
import { runWithContext } from '../common/request-context.js';
import { EventHandlersRegistry } from './event-handlers.registry.js';
import { backoffDelayMs, isExhausted, maxAttemptsFromEnv } from './retry-policy.js';

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 25;
// Un événement « en cours » depuis plus longtemps a vu son worker s'arrêter
// en plein traitement : il est remis en file.
const STUCK_AFTER_MS = 5 * 60_000;

/**
 * Worker de l'outbox d'événements.
 *
 * Tourne hors du chemin des requêtes HTTP : une action métier n'attend
 * jamais ses effets secondaires. Plusieurs instances peuvent coexister, la
 * prise en charge d'un événement étant une mise à jour conditionnelle.
 *
 * Désactivable (EVENTS_WORKER_ENABLED=false) pour le faire tourner dans un
 * processus dédié : `node dist/worker.js`.
 */
@Injectable()
export class EventsWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EventsWorker.name);
  private readonly maxAttempts = maxAttemptsFromEnv(process.env.EVENTS_MAX_ATTEMPTS);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: EventHandlersRegistry,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.EVENTS_WORKER_ENABLED === 'false') {
      this.logger.log('Worker d\'événements désactivé dans ce processus (EVENTS_WORKER_ENABLED=false).');
      return;
    }
    this.start();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  start() {
    this.stopped = false;
    this.logger.log(`Worker d'événements démarré (max ${this.maxAttempts} tentatives).`);
    this.schedule(0);
  }

  private schedule(delay: number) {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.loop(), delay);
  }

  private async loop() {
    try {
      await this.drain();
    } catch (err) {
      this.logger.error('Cycle du worker en échec', err as Error);
    } finally {
      this.schedule(POLL_INTERVAL_MS);
    }
  }

  /** Traite tous les événements échus ; renvoie le nombre d'événements traités. */
  async drain(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let processed = 0;
    try {
      await this.requeueStuck();
      for (;;) {
        const due = await this.prisma.domainEvent.findMany({
          where: { status: DomainEventStatus.PENDING, nextAttemptAt: { lte: new Date() } },
          orderBy: { occurredAt: 'asc' },
          take: BATCH_SIZE,
        });
        if (due.length === 0) break;
        for (const event of due) {
          if (await this.claim(event.id)) {
            await this.process(event);
            processed += 1;
          }
        }
        if (due.length < BATCH_SIZE) break;
      }
    } finally {
      this.running = false;
    }
    return processed;
  }

  private async claim(id: string): Promise<boolean> {
    const claimed = await this.prisma.domainEvent.updateMany({
      where: { id, status: DomainEventStatus.PENDING },
      data: { status: DomainEventStatus.PROCESSING, nextAttemptAt: new Date() },
    });
    return claimed.count === 1;
  }

  private async requeueStuck() {
    await this.prisma.domainEvent.updateMany({
      where: {
        status: DomainEventStatus.PROCESSING,
        nextAttemptAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
      },
      data: { status: DomainEventStatus.PENDING },
    });
  }

  private async process(event: DomainEvent) {
    try {
      // Les effets produits par un gestionnaire (audit, notifications...)
      // portent la corrélation de la requête d'origine.
      await runWithContext(
        { correlationId: event.correlationId ?? event.id, actorRole: 'SYSTEM' },
        () => this.dispatch(event),
      );
      await this.prisma.domainEvent.update({
        where: { id: event.id },
        data: {
          status: DomainEventStatus.PROCESSED,
          processedAt: new Date(),
          attempts: event.attempts + 1,
          lastError: null,
        },
      });
    } catch (err) {
      await this.fail(event, err);
    }
  }

  private async dispatch(event: DomainEvent) {
    for (const handler of this.registry.handlersFor(event.eventType)) {
      const done = await this.prisma.domainEventHandling.findUnique({
        where: { eventId_handler: { eventId: event.id, handler: handler.name } },
      });
      if (done) continue; // déjà exécuté lors d'une livraison précédente

      await handler.handle(event);
      try {
        await this.prisma.domainEventHandling.create({
          data: { eventId: event.id, handler: handler.name },
        });
      } catch (err) {
        // Un autre worker a terminé ce gestionnaire en parallèle : sans gravité.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
  }

  private async fail(event: DomainEvent, err: unknown) {
    const attempts = event.attempts + 1;
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 2000);

    if (isExhausted(attempts, this.maxAttempts)) {
      await this.prisma.domainEvent.update({
        where: { id: event.id },
        data: { status: DomainEventStatus.DEAD_LETTER, attempts, lastError: message },
      });
      this.logger.error(`Événement ${event.eventType} #${event.id} en dead-letter : ${message}`);
      // Alerte d'exploitation : un échec définitif ne doit jamais rester silencieux.
      await this.notifications
        .notifyRole(
          Role.ADMIN,
          NotificationType.WORKFLOW_TASK,
          'Événement métier en échec',
          `« ${event.eventType} » a échoué ${attempts} fois et attend une intervention (Supervision).`,
          'DomainEvent',
          event.id,
        )
        .catch(() => undefined);
      await this.audit
        .log(null, 'EVENT_DEAD_LETTER', 'DomainEvent', event.id, { details: event.eventType, reason: message })
        .catch(() => undefined);
      return;
    }

    await this.prisma.domainEvent.update({
      where: { id: event.id },
      data: {
        status: DomainEventStatus.PENDING,
        attempts,
        lastError: message,
        nextAttemptAt: new Date(Date.now() + backoffDelayMs(attempts)),
      },
    });
    this.logger.warn(`Événement ${event.eventType} #${event.id} : tentative ${attempts} échouée, reprise planifiée.`);
  }
}
