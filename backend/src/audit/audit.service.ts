import { Injectable } from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentRequestContext } from '../common/request-context.js';

export interface AuditExtra {
  module?: string;
  details?: string;
  status?: AuditStatus;
  metadata?: { field?: string; oldValue?: unknown; newValue?: unknown; notes?: string } & Record<string, unknown>;
  // Champs d'audit recommandés (§15 Permissions & machines à états).
  previousStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
}

// Module fonctionnel affiché dans le journal, déduit de l'entité touchée quand
// l'appelant ne le précise pas.
const MODULE_BY_ENTITY: Record<string, string> = {
  User: 'USER',
  Producer: 'PRODUCER',
  ProducerDocument: 'PRODUCER',
  Farm: 'PRODUCER',
  VerificationRequest: 'REQUEST',
  Sample: 'SAMPLE',
  Seal: 'SAMPLE',
  CollectionAssignment: 'SAMPLE',
  ReferenceSample: 'LABORATORY',
  ReferenceHoney: 'LABORATORY',
  Laboratory: 'LABORATORY',
  LaboratoryAnalysis: 'LABORATORY',
  LabAnalysisFile: 'LABORATORY',
  Verification: 'VERIFICATION',
  Batch: 'BATCH',
  Packaging: 'PACKAGING',
  PackagingUnit: 'PACKAGING',
  Product: 'PRODUCT',
  ProductVariant: 'PRODUCT',
  ProductDocument: 'PRODUCT',
  QRCode: 'QR_CODE',
  QrGeneration: 'QR_CODE',
  CounterfeitAlert: 'ANTI_COUNTERFEIT',
  Order: 'SALES',
  Payout: 'SALES',
  DomainEvent: 'SYSTEM',
  System: 'SYSTEM',
  Settings: 'SETTINGS',
};

export function moduleOfEntity(entite: string): string {
  return MODULE_BY_ENTITY[entite] ?? 'SYSTEM';
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Journalise une action sensible.
   *
   * Le rôle de l'acteur, l'identifiant de corrélation et l'éventuel override
   * administratif sont repris du contexte de requête : chaque appel existant
   * en bénéficie sans changer de signature. Un statut avant/après et un motif
   * peuvent être précisés pour les transitions d'état.
   */
  log(userId: string | null, action: string, entite: string, entiteId: string, extra: AuditExtra = {}) {
    const context = currentRequestContext();
    const isOverride = context.actorRole === 'ADMIN' && !!context.overrideReason;
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entite,
        entiteId,
        module: extra.module ?? moduleOfEntity(entite),
        details: extra.details,
        status: extra.status ?? AuditStatus.SUCCESS,
        metadata: extra.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        actorRole: userId && userId === context.actorId ? context.actorRole : null,
        previousStatus: extra.previousStatus ?? null,
        newStatus: extra.newStatus ?? null,
        reason: extra.reason ?? (isOverride ? context.overrideReason : null),
        correlationId: context.correlationId || null,
        isOverride,
      },
    });
  }
}
