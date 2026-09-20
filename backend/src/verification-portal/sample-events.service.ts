import { Injectable } from '@nestjs/common';
import { SampleEventType, SampleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

// Étapes attendues de la chaîne de possession, dans l'ordre. La timeline du
// portail affiche toujours ces étapes : celles sans événement enregistré
// apparaissent grisées, ce qui montre le reste à faire autant que le fait.
export const CUSTODY_STEPS: SampleEventType[] = [
  SampleEventType.REGISTERED,
  SampleEventType.COLLECTED,
  SampleEventType.SEALED,
  SampleEventType.IN_TRANSIT,
  SampleEventType.RECEIVED,
  SampleEventType.IN_LABORATORY,
  SampleEventType.ANALYSIS_COMPLETED,
  SampleEventType.RESULT_ADDED,
];

// Statut porté par l'échantillon une fois l'événement enregistré. Les
// événements absents de cette table (REGISTERED, RESULT_ADDED,
// RELEASED_FOR_TRANSPORT, LOCATION_UPDATE) tracent un fait sans faire avancer
// le statut.
const STATUS_AFTER_EVENT: Partial<Record<SampleEventType, SampleStatus>> = {
  [SampleEventType.COLLECTED]: SampleStatus.COLLECTED,
  [SampleEventType.SEALED]: SampleStatus.SEALED,
  [SampleEventType.IN_TRANSIT]: SampleStatus.IN_TRANSIT,
  [SampleEventType.RECEIVED]: SampleStatus.RECEIVED,
  [SampleEventType.SENT_TO_LAB]: SampleStatus.RECEIVED_AT_LAB,
  [SampleEventType.IN_LABORATORY]: SampleStatus.RECEIVED_AT_LAB,
  [SampleEventType.ANALYSIS_COMPLETED]: SampleStatus.ANALYZED,
  [SampleEventType.ISSUE]: SampleStatus.ISSUE,
};

export function statusAfter(type: SampleEventType): SampleStatus | undefined {
  return STATUS_AFTER_EVENT[type];
}

@Injectable()
export class SampleEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /**
   * Publie les événements métier d'une étape de possession, une fois celle-ci
   * écrite (EV-01) : `chain_of_custody.updated` pour toute étape, plus
   * `sample.collected` / `sample.sealed` pour les deux jalons suivis par
   * l'automatisation.
   */
  async announce(sampleId: string, type: SampleEventType, eventId: string) {
    await this.domainEvents.publish(EventType.CHAIN_OF_CUSTODY_UPDATED, 'Sample', sampleId, { type, eventId });
    if (type === SampleEventType.COLLECTED) {
      await this.domainEvents.publish(EventType.SAMPLE_COLLECTED, 'Sample', sampleId, { eventId });
    }
    if (type === SampleEventType.SEALED) {
      await this.domainEvents.publish(EventType.SAMPLE_SEALED, 'Sample', sampleId, { eventId });
    }
  }

  /**
   * Enregistre une transition de la chaîne de possession.
   *
   * L'événement est la source de vérité : `Sample.status` n'en est que la
   * projection courante, mise à jour dans la même transaction pour qu'un
   * échantillon ne puisse jamais afficher un statut sans trace associée.
   */
  async record(
    sampleId: string,
    type: SampleEventType,
    userId: string | null,
    options: {
      note?: string;
      evidenceUrl?: string;
      occurredAt?: Date;
      location?: string;
      latitude?: number;
      longitude?: number;
      handlerName?: string;
    } = {},
  ) {
    const nextStatus = statusAfter(type);

    const recorded = await this.prisma.$transaction(async (tx) => {
      const event = await tx.sampleEvent.create({
        data: {
          sampleId,
          type,
          userId,
          note: options.note,
          evidenceUrl: options.evidenceUrl,
          location: options.location,
          latitude: options.latitude,
          longitude: options.longitude,
          handlerName: options.handlerName,
          occurredAt: options.occurredAt ?? new Date(),
        },
      });

      if (nextStatus) {
        await tx.sample.update({ where: { id: sampleId }, data: { status: nextStatus } });
      }

      return event;
    });
    await this.announce(sampleId, type, recorded.id);
    return recorded;
  }

  findBySample(sampleId: string) {
    return this.prisma.sampleEvent.findMany({
      where: { sampleId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { occurredAt: 'asc' },
    });
  }

  /**
   * Reconstitue les étapes attendues avec, pour chacune, l'événement qui l'a
   * réalisée — ou `null` si elle reste à faire. Un ISSUE est renvoyé à part :
   * c'est un incident du parcours, pas une étape de celui-ci.
   */
  async timeline(sampleId: string) {
    const events = await this.findBySample(sampleId);
    const steps = CUSTODY_STEPS.map((type) => ({
      type,
      event: events.find((e) => e.type === type) ?? null,
    }));
    return {
      steps,
      issues: events.filter((e) => e.type === SampleEventType.ISSUE),
      events,
    };
  }
}
