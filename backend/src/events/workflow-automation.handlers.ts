import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationType, Role, type DomainEvent } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EventHandlersRegistry } from './event-handlers.registry.js';
import { EventType } from './event-types.js';

type Payload = Record<string, unknown>;

function text(payload: Payload, key: string, fallback = ''): string {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/**
 * Automatisations de la chaîne de vérification (§6 à §11 Architecture
 * événementielle).
 *
 * Elles créent le travail interne suivant — une tâche notifiée à l'Équipe de
 * Vérification — mais ne prennent JAMAIS de décision : aucune automatisation
 * ne déclare un miel vérifié, ne crée un lot, un produit ou un QR (§19 « Ce qui
 * ne doit pas être automatisé »). Les notifications destinées au producteur
 * restent émises par les services métier, comme avant.
 */
@Injectable()
export class WorkflowAutomationHandlers implements OnModuleInit {
  constructor(
    private readonly registry: EventHandlersRegistry,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // VR-A01 : une demande soumise crée une tâche de revue.
    this.registry.register(EventType.VERIFICATION_REQUEST_SUBMITTED, 'task.review-request', (e) =>
      this.task(
        e,
        'Nouvelle demande à examiner',
        `La demande ${text(e.payload as Payload, 'requestCode', 'de vérification')} attend une revue.`,
      ),
    );

    // MORE_INFO -> revue : la réponse du producteur relance la revue.
    this.registry.register(EventType.VERIFICATION_REQUEST_INFO_PROVIDED, 'task.review-info-provided', (e) =>
      this.task(
        e,
        'Informations complémentaires reçues',
        `Le producteur a répondu pour la demande ${text(e.payload as Payload, 'requestCode', '')} : elle repasse en revue.`,
      ),
    );

    // VR-A02 déjà couvert par le service (notification producteur).
    // COL-A03 : livraison par le producteur -> tâche de réception Kounouz.
    this.registry.register(EventType.COLLECTION_SCHEDULED, 'task.receive-delivery', async (e) => {
      const payload = e.payload as Payload;
      if (payload.collectionMethod !== 'PRODUCER_DELIVERY') return;
      await this.task(
        e,
        'Réception d\'échantillon à prévoir',
        `Le producteur livrera l'échantillon de la demande ${text(payload, 'requestCode')} au centre Kounouz.`,
      );
    });

    // VER-A01 (bulletin reçu -> décision en attente) : la tâche est déjà
    // notifiée par le service de laboratoire à la clôture du bulletin ; aucun
    // gestionnaire ici, pour ne pas la doubler. L'événement reste tracé.

    // BATCH-A01 / VER-A04 : seul VERIFIED ouvre la création du lot.
    this.registry.register(EventType.VERIFICATION_COMPLETED, 'task.create-batch', async (e) => {
      const payload = e.payload as Payload;
      if (payload.status !== 'VERIFIED') return;
      await this.task(
        e,
        'Lot vérifié à créer',
        `Le dossier ${text(payload, 'verificationCode', '')} est VÉRIFIÉ : le lot peut être créé.`,
      );
    });

    // PKG-A01 : un lot éligible génère une tâche d'emballage.
    this.registry.register(EventType.BATCH_CREATED, 'task.package-batch', (e) =>
      this.task(e, 'Emballage à réaliser', `Le lot ${text(e.payload as Payload, 'batchCode')} attend son emballage Kounouz.`),
    );

    // PKG-A02 : emballage terminé -> tâche de création produit.
    this.registry.register(EventType.PACKAGING_COMPLETED, 'task.create-product', (e) =>
      this.task(
        e,
        'Produit à créer',
        `L'emballage du lot ${text(e.payload as Payload, 'batchCode')} est terminé : le produit et ses SKU peuvent être créés.`,
      ),
    );

    // QR-A01 : produit créé -> tâche de génération des QR.
    this.registry.register(EventType.PRODUCT_CREATED, 'task.generate-qr', (e) =>
      this.task(
        e,
        'QR codes à générer',
        `Le produit ${text(e.payload as Payload, 'productName')} est prêt : ses QR codes peuvent être générés.`,
      ),
    );

    // Un rappel de lot est un événement critique : l'administration est avertie.
    this.registry.register(EventType.BATCH_RECALLED, 'alert.batch-recalled', (e) =>
      this.notifications.notifyRole(
        Role.ADMIN,
        NotificationType.WORKFLOW_TASK,
        'Lot rappelé',
        `Le lot ${text(e.payload as Payload, 'batchCode')} a été rappelé : la page publique l'affiche désormais.`,
        e.entityType,
        e.entityId,
      ),
    );
  }

  private task(event: DomainEvent, title: string, message: string) {
    return this.notifications.notifyRole(
      Role.VERIFICATION_TEAM,
      NotificationType.WORKFLOW_TASK,
      title,
      message,
      event.entityType,
      event.entityId,
    );
  }
}
