import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProducerDto } from './dto/update-producer.dto.js';

@Injectable()
export class ProducersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.producer.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const producer = await this.prisma.producer.findUnique({ where: { id } });
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
    return this.prisma.producer.update({
      where: { id: producer.id },
      data: dto,
    });
  }
}
