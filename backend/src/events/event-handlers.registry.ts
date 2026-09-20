import { Injectable } from '@nestjs/common';
import type { DomainEvent } from '@prisma/client';

export type EventHandler = (event: DomainEvent) => Promise<void>;

interface RegisteredHandler {
  name: string;
  handle: EventHandler;
}

/**
 * Table de routage événement -> gestionnaires.
 *
 * Chaque gestionnaire porte un nom stable : c'est la clé d'idempotence
 * (événement, gestionnaire) qui empêche de rejouer un effet déjà produit
 * lorsqu'un événement est relivré après une panne (EV-03).
 */
@Injectable()
export class EventHandlersRegistry {
  private readonly handlers = new Map<string, RegisteredHandler[]>();

  register(eventType: string, name: string, handle: EventHandler) {
    const list = this.handlers.get(eventType) ?? [];
    if (list.some((h) => h.name === name)) {
      throw new Error(`Gestionnaire « ${name} » déjà enregistré pour ${eventType}.`);
    }
    list.push({ name, handle });
    this.handlers.set(eventType, list);
  }

  handlersFor(eventType: string): RegisteredHandler[] {
    return this.handlers.get(eventType) ?? [];
  }

  /** Inventaire des abonnements, exposé à la supervision. */
  describe(): { eventType: string; handlers: string[] }[] {
    return [...this.handlers.entries()]
      .map(([eventType, list]) => ({ eventType, handlers: list.map((h) => h.name) }))
      .sort((a, b) => a.eventType.localeCompare(b.eventType));
  }
}
