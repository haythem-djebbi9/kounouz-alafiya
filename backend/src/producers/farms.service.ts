import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { CreateFarmDto, UpdateFarmDto } from './dto/farm.dto.js';

/**
 * Ruchers d'un producteur (ERD : ProducerProfile -> Farm, 1:N).
 *
 * Le producteur gère uniquement ses propres ruchers : la propriété est déduite
 * du compte authentifié, jamais d'un identifiant fourni par le client (§6
 * Sécurité). Un rucher déjà cité par une demande n'est jamais supprimé — il
 * peut seulement être désactivé, pour préserver la traçabilité.
 */
@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async producerIdForUser(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId }, select: { id: true } });
    if (!producer) throw new NotFoundException('Aucun profil producteur pour ce compte.');
    return producer.id;
  }

  async listMine(userId: string) {
    const producerId = await this.producerIdForUser(userId);
    return this.listForProducer(producerId);
  }

  listForProducer(producerId: string) {
    return this.prisma.farm.findMany({
      where: { producerId },
      include: { _count: { select: { verificationRequests: true } } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateFarmDto) {
    const producerId = await this.producerIdForUser(userId);
    const hasFarm = (await this.prisma.farm.count({ where: { producerId } })) > 0;
    const farm = await allocateYearCode(
      'FRM',
      (prefix) => this.prisma.farm.count({ where: { farmCode: { startsWith: prefix } } }),
      (farmCode) =>
        this.prisma.farm.create({
          data: { ...dto, mainFlora: dto.mainFlora ?? [], farmCode, producerId, isPrimary: !hasFarm },
        }),
    );
    await this.audit.log(userId, 'CREATE_FARM', 'Farm', farm.id, { details: `${farm.farmCode} — ${farm.name}` });
    return farm;
  }

  async update(userId: string, farmId: string, dto: UpdateFarmDto) {
    const producerId = await this.producerIdForUser(userId);
    const farm = await this.prisma.farm.findUnique({ where: { id: farmId } });
    if (!farm || farm.producerId !== producerId) {
      throw new NotFoundException('Rucher introuvable.');
    }
    if (dto.isActive === false && (dto.isPrimary ?? farm.isPrimary)) {
      throw new BadRequestException('Le rucher principal ne peut pas être désactivé : désignez-en un autre avant.');
    }

    const { isPrimary, ...fields } = dto;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.farm.updateMany({ where: { producerId, isPrimary: true }, data: { isPrimary: false } });
      }
      return tx.farm.update({
        where: { id: farmId },
        data: { ...fields, ...(isPrimary ? { isPrimary: true } : {}) },
      });
    });
    await this.audit.log(userId, 'UPDATE_FARM', 'Farm', farmId, { details: updated.farmCode });
    return updated;
  }

  /** Rucher utilisable dans une demande : appartient au producteur et est actif. */
  async requireUsableFarm(producerId: string, farmId: string) {
    const farm = await this.prisma.farm.findUnique({ where: { id: farmId } });
    if (!farm || farm.producerId !== producerId) {
      throw new BadRequestException('Ce rucher ne vous appartient pas.');
    }
    if (!farm.isActive) {
      throw new BadRequestException('Ce rucher est désactivé.');
    }
    return farm;
  }

  primaryFarm(producerId: string) {
    return this.prisma.farm.findFirst({
      where: { producerId, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }
}
