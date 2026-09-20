import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, NotificationType, Role, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { buildCode } from '../common/sequential-code.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { PRIMARY_QR_SELECT, withPrimaryQr } from '../common/primary-qr.js';

const BATCH_INCLUDE = {
  verification: { include: { request: { include: { producer: true } } } },
  packaging: true,
  products: true,
} as const;

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateBatchDto) {
    const verification = await this.prisma.verification.findUnique({
      where: { id: dto.verificationId },
      include: { request: { include: { producer: true } }, batch: true },
    });
    if (!verification) {
      throw new NotFoundException('Vérification introuvable.');
    }
    if (verification.status !== VerificationStatus.VERIFIED) {
      throw new BadRequestException(
        'Un lot ne peut être créé qu\'à partir d\'une vérification VERIFIED.',
      );
    }
    if (verification.batch) {
      throw new BadRequestException('Un lot existe déjà pour cette vérification.');
    }

    const count = await this.prisma.batch.count();
    const batch = await this.prisma.batch.create({
      data: {
        verificationId: dto.verificationId,
        batchCode: buildCode('KZ-BAT', count, 4),
        honeyType: verification.request.honeyType,
        quantityKg: dto.quantityKg,
        productionDate: new Date(dto.productionDate),
        status: BatchStatus.CREATED,
      },
      include: BATCH_INCLUDE,
    });

    await this.audit.log(userId, 'CREATE_BATCH', 'Batch', batch.id);

    await this.notifications.notify(
      verification.request.producer.userId,
      NotificationType.BATCH_CREATED,
      'Lot créé',
      `Le lot "${batch.batchCode}" a été créé pour votre miel "${batch.honeyType}".`,
      'Batch',
      batch.id,
    );
    for (const role of [Role.ADMIN, Role.VERIFICATION_TEAM]) {
      await this.notifications.notifyRole(
        role,
        NotificationType.BATCH_CREATED,
        'Nouveau lot créé',
        `Le lot "${batch.batchCode}" a été créé.`,
        'Batch',
        batch.id,
      );
    }

    return batch;
  }

  findAll() {
    return this.prisma.batch.findMany({ include: BATCH_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  // Portail Producteur : lots issus de ses demandes vérifiées.
  async findMineForProducer(userId: string) {
    const batches = await this.prisma.batch.findMany({
      where: { verification: { request: { producer: { userId } } } },
      select: {
        id: true,
        batchCode: true,
        honeyType: true,
        quantityKg: true,
        productionDate: true,
        status: true,
        createdAt: true,
        verification: {
          select: {
            id: true,
            status: true,
            verifiedAt: true,
            request: { select: { id: true, requestCode: true, collectionLocation: true, floralCategory: true } },
            sample: { select: { id: true, seal: { select: { sealCode: true } } } },
            analysis: { select: { status: true, analysisDate: true } },
          },
        },
        packaging: { select: { packageType: true, size: true, productionDate: true, status: true } },
        products: {
          select: { id: true, nom: true, statut: true, stock: true, qrCodes: PRIMARY_QR_SELECT },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Le producteur voit le QR de reference de chacun de ses produits.
    return batches.map((batch) => ({
      ...batch,
      products: batch.products.map((product) => withPrimaryQr(product)),
    }));
  }

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id }, include: BATCH_INCLUDE });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    return batch;
  }
}
