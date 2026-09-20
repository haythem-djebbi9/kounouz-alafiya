import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, PackagingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { SavePackagingDto } from './dto/save-packaging.dto.js';
import { SavePackagingUnitDto } from './dto/save-packaging-unit.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

const PACKAGING_INCLUDE = {
  units: { orderBy: { createdAt: 'asc' } },
  batch: {
    include: {
      verification: {
        include: { request: { include: { producer: true } } },
      },
      products: { select: { id: true, nom: true, statut: true } },
    },
  },
} as const;

// Les lots sur lesquels l'atelier peut travailler.
const PACKAGEABLE: BatchStatus[] = [
  BatchStatus.VERIFIED,
  BatchStatus.CREATED,
  BatchStatus.READY_FOR_PACKAGING,
  BatchStatus.IN_PACKAGING,
  BatchStatus.PACKAGED,
  BatchStatus.READY,
];

@Injectable()
export class PortalPackagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /** Lots prêts à être conditionnés ou en cours de conditionnement. */
  queue() {
    return this.prisma.batch.findMany({
      where: { status: { in: PACKAGEABLE } },
      select: {
        id: true,
        batchCode: true,
        honeyType: true,
        quantityKg: true,
        status: true,
        productionDate: true,
        verification: {
          select: { request: { select: { producer: { select: { name: true } } } } },
        },
        packaging: { select: { id: true, status: true, _count: { select: { units: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBatch(batchId: string) {
    const packaging = await this.prisma.packaging.findUnique({
      where: { batchId },
      include: PACKAGING_INCLUDE,
    });
    if (!packaging) {
      throw new NotFoundException("Aucun emballage n'a encore été ouvert pour ce lot.");
    }
    return this.withProgress(packaging);
  }

  /**
   * Ajoute au dossier d'emballage le décompte réel des unités.
   *
   * `unitsPlanned` est la cible annoncée ; `unitsTotal` la somme des unités
   * effectivement déclarées. L'écart entre les deux est ce que l'atelier doit
   * encore produire, et c'est lui qui borne le nombre de QR à générer.
   */
  private withProgress<T extends { unitsPlanned: number | null; units: { quantity: number; status: PackagingStatus }[] }>(
    packaging: T,
  ) {
    const unitsTotal = packaging.units.reduce((sum, unit) => sum + unit.quantity, 0);
    const unitsCompleted = packaging.units
      .filter((unit) => unit.status === PackagingStatus.COMPLETED)
      .reduce((sum, unit) => sum + unit.quantity, 0);

    return {
      ...packaging,
      progress: {
        unitsPlanned: packaging.unitsPlanned ?? unitsTotal,
        unitsTotal,
        unitsCompleted,
        remaining: Math.max(0, (packaging.unitsPlanned ?? unitsTotal) - unitsTotal),
      },
    };
  }

  /** Crée ou met à jour le dossier d'emballage d'un lot. */
  async save(batchId: string, userId: string, dto: SavePackagingDto) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { packaging: true },
    });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    if (!PACKAGEABLE.includes(batch.status)) {
      throw new BadRequestException(
        `Un lot au statut « ${batch.status} » ne peut plus être conditionné.`,
      );
    }

    const data = {
      packageType: dto.packageType,
      size: dto.size,
      packagingLine: dto.packagingLine,
      unitsPlanned: dto.unitsPlanned,
      productionDate: new Date(dto.productionDate),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      labelDesign: dto.labelDesign,
      notes: dto.notes,
    };

    if (batch.packaging) {
      await this.prisma.packaging.update({ where: { batchId }, data });
    } else {
      await this.prisma.packaging.create({
        data: { ...data, batchId, status: PackagingStatus.IN_PROGRESS },
      });
      // L'ouverture du dossier fait entrer le lot en conditionnement.
      if (batch.status !== BatchStatus.IN_PACKAGING) {
        await this.prisma.batch.update({
          where: { id: batchId },
          data: { status: BatchStatus.IN_PACKAGING },
        });
      }
    }

    await this.audit.log(userId, 'SAVE_PACKAGING', 'Batch', batchId);
    return this.findByBatch(batchId);
  }

  // --- Unités de conditionnement ------------------------------------------

  async addUnit(batchId: string, userId: string, dto: SavePackagingUnitDto) {
    const packaging = await this.prisma.packaging.findUnique({
      where: { batchId },
      include: { units: true },
    });
    if (!packaging) {
      throw new NotFoundException("Ouvrez d'abord le dossier d'emballage du lot.");
    }
    if (packaging.status === PackagingStatus.COMPLETED) {
      throw new BadRequestException("Cet emballage est finalisé : aucune unité ne peut être ajoutée.");
    }

    const unit = await allocateYearCode(
      'KZ-PKG',
      (prefix) => this.prisma.packagingUnit.count({ where: { unitCode: { startsWith: prefix } } }),
      (unitCode) =>
        this.prisma.packagingUnit.create({
          data: {
            unitCode,
            packagingId: packaging.id,
            unitSize: dto.unitSize,
            quantity: dto.quantity,
            packagingDate: dto.packagingDate ? new Date(dto.packagingDate) : null,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
            status: dto.status ?? PackagingStatus.PLANNED,
          },
        }),
    );

    await this.audit.log(userId, 'ADD_PACKAGING_UNIT', 'PackagingUnit', unit.id);
    return this.findByBatch(batchId);
  }

  async updateUnit(unitId: string, userId: string, dto: SavePackagingUnitDto) {
    const unit = await this.prisma.packagingUnit.findUnique({
      where: { id: unitId },
      include: { packaging: true },
    });
    if (!unit) {
      throw new NotFoundException('Unité de conditionnement introuvable.');
    }
    if (unit.packaging.status === PackagingStatus.COMPLETED) {
      throw new BadRequestException('Cet emballage est finalisé : ses unités ne sont plus modifiables.');
    }

    await this.prisma.packagingUnit.update({
      where: { id: unitId },
      data: {
        unitSize: dto.unitSize,
        quantity: dto.quantity,
        packagingDate: dto.packagingDate ? new Date(dto.packagingDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        status: dto.status,
      },
    });
    await this.audit.log(userId, 'UPDATE_PACKAGING_UNIT', 'PackagingUnit', unitId);
    return this.findByBatch(unit.packaging.batchId);
  }

  async deleteUnit(unitId: string, userId: string) {
    const unit = await this.prisma.packagingUnit.findUnique({
      where: { id: unitId },
      include: { packaging: true },
    });
    if (!unit) {
      throw new NotFoundException('Unité de conditionnement introuvable.');
    }
    // Une unité déjà conditionnée correspond à des pots réels : on ne
    // l'efface pas, on corrige sa quantité.
    if (unit.status === PackagingStatus.COMPLETED) {
      throw new BadRequestException(
        "Une unité déjà conditionnée ne peut pas être supprimée. Corrigez sa quantité.",
      );
    }

    await this.prisma.packagingUnit.delete({ where: { id: unitId } });
    await this.audit.log(userId, 'DELETE_PACKAGING_UNIT', 'PackagingUnit', unitId);
    return this.findByBatch(unit.packaging.batchId);
  }

  /**
   * Clôture le conditionnement : le lot devient emballé et peut donner lieu à
   * un produit. Au moins une unité doit être effectivement conditionnée.
   */
  async complete(batchId: string, userId: string) {
    const packaging = await this.prisma.packaging.findUnique({
      where: { batchId },
      include: { units: true },
    });
    if (!packaging) {
      throw new NotFoundException('Emballage introuvable.');
    }
    if (packaging.status === PackagingStatus.COMPLETED) {
      throw new BadRequestException('Cet emballage est déjà finalisé.');
    }
    const completed = packaging.units.filter((u) => u.status === PackagingStatus.COMPLETED);
    if (completed.length === 0) {
      throw new BadRequestException(
        "Au moins une unité doit être conditionnée avant de finaliser l'emballage.",
      );
    }

    await this.prisma.$transaction([
      this.prisma.packaging.update({
        where: { batchId },
        data: { status: PackagingStatus.COMPLETED },
      }),
      this.prisma.batch.update({ where: { id: batchId }, data: { status: BatchStatus.PACKAGED } }),
    ]);

    await this.audit.log(userId, 'COMPLETE_PACKAGING', 'Packaging', packaging.id, {
      previousStatus: packaging.status,
      newStatus: PackagingStatus.COMPLETED,
    });
    const batch = await this.prisma.batch.findUnique({ where: { id: batchId }, select: { batchCode: true } });
    await this.domainEvents.publish(EventType.PACKAGING_COMPLETED, 'Packaging', packaging.id, {
      batchId,
      batchCode: batch?.batchCode,
      units: completed.map((u) => ({ size: u.unitSize, quantity: u.quantity })),
    });
    return this.findByBatch(batchId);
  }
}
