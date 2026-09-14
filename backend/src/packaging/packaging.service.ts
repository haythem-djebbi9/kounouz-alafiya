import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, PackagingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreatePackagingDto } from './dto/create-packaging.dto.js';

@Injectable()
export class PackagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreatePackagingDto) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: { packaging: true },
    });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    if (batch.packaging) {
      throw new BadRequestException('Un emballage existe déjà pour ce lot.');
    }
    if (batch.status !== BatchStatus.CREATED) {
      throw new BadRequestException('Ce lot a déjà été emballé.');
    }

    const [packaging] = await this.prisma.$transaction([
      this.prisma.packaging.create({
        data: {
          batchId: dto.batchId,
          packageType: dto.packageType,
          size: dto.size,
          labelDesign: dto.labelDesign,
          productionDate: new Date(dto.productionDate),
          status: PackagingStatus.IN_PROGRESS,
        },
      }),
      this.prisma.batch.update({
        where: { id: dto.batchId },
        data: { status: BatchStatus.PACKAGED },
      }),
    ]);

    await this.audit.log(userId, 'CREATE_PACKAGING', 'Packaging', packaging.id);
    return packaging;
  }

  async complete(id: string, userId: string) {
    const packaging = await this.prisma.packaging.findUnique({ where: { id } });
    if (!packaging) {
      throw new NotFoundException('Emballage introuvable.');
    }
    if (packaging.status !== PackagingStatus.IN_PROGRESS) {
      throw new BadRequestException('Cet emballage est déjà finalisé.');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.packaging.update({
        where: { id },
        data: { status: PackagingStatus.COMPLETED },
      }),
      this.prisma.batch.update({
        where: { id: packaging.batchId },
        data: { status: BatchStatus.READY },
      }),
    ]);

    await this.audit.log(userId, 'COMPLETE_PACKAGING', 'Packaging', id);
    return updated;
  }

  findAll() {
    return this.prisma.packaging.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const packaging = await this.prisma.packaging.findUnique({ where: { id }, include: { batch: true } });
    if (!packaging) {
      throw new NotFoundException('Emballage introuvable.');
    }
    return packaging;
  }
}
