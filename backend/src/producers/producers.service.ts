import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { UpdateProducerDto } from './dto/update-producer.dto.js';
import { UpdateProducerStatusDto } from './dto/update-producer-status.dto.js';

@Injectable()
export class ProducersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.producer.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const producer = await this.prisma.producer.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, isActive: true, createdAt: true } },
        farms: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      },
    });
    if (!producer) {
      throw new NotFoundException('Producteur introuvable.');
    }
    return producer;
  }

  async findByUserId(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }
    return producer;
  }

  async updateByUserId(userId: string, dto: UpdateProducerDto) {
    const producer = await this.findByUserId(userId);

    // La CIN est une donnée d'identité : saisie une fois, puis verrouillée.
    if (dto.nationalId !== undefined && producer.nationalId && dto.nationalId !== producer.nationalId) {
      throw new BadRequestException("La CIN enregistrée ne peut plus être modifiée. Contactez le support Kounouz.");
    }
    const { dateOfBirth, iban, name, ...rest } = dto;
    const updated = await this.prisma.producer.update({
      where: { id: producer.id },
      data: {
        ...rest,
        ...(name !== undefined ? { name } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: new Date(dateOfBirth) } : {}),
        ...(iban !== undefined ? { iban: iban.replace(/\s+/g, ' ').trim() } : {}),
      },
    });

    // Le nom affiché du compte suit le nom complet du profil producteur.
    if (name !== undefined) {
      await this.prisma.user.update({ where: { id: userId }, data: { name } });
    }

    return updated;
  }

  async updateStatus(id: string, userId: string, dto: UpdateProducerStatusDto) {
    await this.findOne(id);
    const updated = await this.prisma.producer.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.audit.log(userId, `PRODUCER_${dto.status}`, 'Producer', id);
    return updated;
  }
}
