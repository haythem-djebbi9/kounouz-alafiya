import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SampleEventType, SampleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { buildCode } from '../common/sequential-code.js';
import { CreateSealDto } from './dto/create-seal.dto.js';
import { SampleEventsService } from '../verification-portal/sample-events.service.js';

// Le scellé n'est jamais modifiable après création : ce service n'expose
// volontairement aucune méthode update/delete.
@Injectable()
export class SealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly custody: SampleEventsService,
  ) {}

  async create(userId: string, dto: CreateSealDto) {
    const sample = await this.prisma.sample.findUnique({
      where: { id: dto.sampleId },
      include: { seal: true },
    });
    if (!sample) {
      throw new NotFoundException('Échantillon introuvable.');
    }
    if (sample.collectedById !== userId) {
      throw new ForbiddenException("Seul l'agent ayant collecté cet échantillon peut le sceller.");
    }
    if (sample.status !== SampleStatus.COLLECTED) {
      throw new BadRequestException("L'échantillon doit être au statut \"collecté\" pour être scellé.");
    }
    if (sample.seal) {
      throw new BadRequestException('Un scellé existe déjà pour cet échantillon.');
    }

    const count = await this.prisma.seal.count();

    const seal = await this.prisma.seal.create({
      data: {
        sampleId: sample.id,
        sealCode: buildCode('KZ-SEAL', count),
      },
    });
    // COC-02 : la pose du scellé est une étape tracée de la chaîne de possession
    // (l'événement fait passer l'échantillon au statut SEALED).
    await this.custody.record(sample.id, SampleEventType.SEALED, userId, { note: seal.sealCode });

    await this.audit.log(userId, 'APPLY_SEAL', 'Seal', seal.id, {
      previousStatus: SampleStatus.COLLECTED,
      newStatus: SampleStatus.SEALED,
    });
    return seal;
  }

  findAll() {
    return this.prisma.seal.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const seal = await this.prisma.seal.findUnique({ where: { id } });
    if (!seal) {
      throw new NotFoundException('Scellé introuvable.');
    }
    return seal;
  }
}
