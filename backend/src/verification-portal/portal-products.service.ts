import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, NotificationType, PackagingStatus, ProductStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateBatchProductDto } from './dto/create-batch-product.dto.js';
import { UpdateBatchProductDto } from './dto/update-batch-product.dto.js';
import { ProductVariantsService } from '../products/product-variants.service.js';
import { ProductVariantInputDto, UpdateProductVariantDto } from '../products/dto/product-variant.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

const PRODUCT_INCLUDE = {
  categorie: true,
  packaging: { include: { units: true } },
  documents: { include: { uploadedBy: { select: { id: true, name: true } } } },
  batch: {
    include: {
      verification: {
        include: {
          request: { include: { producer: true } },
          analysis: { select: { id: true, analysisCode: true, status: true, analysisDate: true } },
        },
      },
    },
  },
  qrCodes: { take: 1, orderBy: { createdAt: 'asc' } },
  // Déclinaisons commerciales (SKU) : format, prix, stock.
  variants: { orderBy: { netWeightG: 'asc' } },
  _count: { select: { qrCodes: true } },
} as const;

// Un produit ne peut naître que d'un lot réellement emballé.
const CONVERTIBLE: BatchStatus[] = [
  BatchStatus.PACKAGED,
  BatchStatus.READY,
  BatchStatus.CONVERTED_TO_PRODUCT,
];

@Injectable()
export class PortalProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly variants: ProductVariantsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  /** Lots emballés, avec ou sans produit : la file de l'écran B03. */
  queue() {
    return this.prisma.batch.findMany({
      where: { status: { in: CONVERTIBLE } },
      select: {
        id: true,
        batchCode: true,
        honeyType: true,
        quantityKg: true,
        origin: true,
        harvestSeason: true,
        status: true,
        productionDate: true,
        verification: {
          select: { request: { select: { producer: { select: { id: true, name: true } } } } },
        },
        packaging: { select: { packageType: true, size: true, status: true } },
        products: { select: { id: true, nom: true, statut: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    return product;
  }

  findByBatch(batchId: string) {
    return this.prisma.product.findMany({
      where: { batchId },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Crée la fiche produit à partir d'un lot emballé.
   *
   * Le produit naît en BROUILLON : la publication au catalogue est une action
   * distincte, qui déclenche la génération du QR et l'activation marché (§16).
   */
  async create(userId: string, dto: CreateBatchProductDto) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: { packaging: true, verification: { include: { request: true } } },
    });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    if (!CONVERTIBLE.includes(batch.status)) {
      throw new BadRequestException(
        "Le lot doit être emballé avant la création du produit commercial.",
      );
    }
    if (!batch.packaging || batch.packaging.status !== PackagingStatus.COMPLETED) {
      throw new BadRequestException("L'emballage du lot doit être finalisé.");
    }

    const categorie = await this.prisma.categorie.findUnique({ where: { id: dto.categorieId } });
    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable.');
    }

    const product = await this.prisma.product.create({
      data: {
        batchId: batch.id,
        packagingId: batch.packaging.id,
        categorieId: dto.categorieId,
        nom: dto.nom,
        description: dto.description,
        prix: dto.prix,
        stock: dto.stock ?? 0,
        images: dto.images ?? [],
        gamme: dto.gamme,
        netWeightG: dto.netWeightG,
        ingredients: dto.ingredients,
        storageInstructions: dto.storageInstructions,
        shelfLife: dto.shelfLife,
        tags: dto.tags ?? [],
        statut: ProductStatus.BROUILLON,
      },
    });

    if (batch.status !== BatchStatus.CONVERTED_TO_PRODUCT) {
      await this.prisma.batch.update({
        where: { id: batch.id },
        data: { status: BatchStatus.CONVERTED_TO_PRODUCT },
      });
    }

    // PRD-03 : un SKU par format réellement emballé (ou ceux saisis).
    await this.variants.createInitialVariants(product.id, dto.variants);

    await this.audit.log(userId, 'CREATE_BATCH_PRODUCT', 'Product', product.id, {
      newStatus: ProductStatus.BROUILLON,
    });
    await this.domainEvents.publish(EventType.PRODUCT_CREATED, 'Product', product.id, {
      productName: product.nom,
      batchId: batch.id,
      batchCode: batch.batchCode,
    });
    return this.findOne(product.id);
  }

  // --- Déclinaisons (SKU) ----------------------------------------------------

  async addVariant(productId: string, userId: string, dto: ProductVariantInputDto) {
    const product = await this.findOne(productId);
    if (product.statut === ProductStatus.ARCHIVE) {
      throw new BadRequestException('Un produit archivé ne reçoit plus de nouveau format.');
    }
    await this.variants.addVariant(productId, userId, dto);
    return this.findOne(productId);
  }

  async updateVariant(variantId: string, userId: string, dto: UpdateProductVariantDto) {
    const variant = await this.variants.updateVariant(variantId, userId, dto);
    return this.findOne(variant.productId);
  }

  async update(id: string, userId: string, dto: UpdateBatchProductDto) {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: {
        categorieId: dto.categorieId,
        nom: dto.nom,
        description: dto.description,
        prix: dto.prix,
        stock: dto.stock,
        images: dto.images,
        gamme: dto.gamme,
        netWeightG: dto.netWeightG,
        ingredients: dto.ingredients,
        storageInstructions: dto.storageInstructions,
        shelfLife: dto.shelfLife,
        tags: dto.tags,
      },
    });
    // Le prix « à partir de » et le stock total restent déduits des SKU.
    await this.variants.recomputeProductSummary(id);
    await this.audit.log(userId, 'UPDATE_BATCH_PRODUCT', 'Product', id);
    return this.findOne(id);
  }

  /**
   * Met le produit en marché : publication au catalogue et passage du lot en
   * PUBLISHED. Le QR de référence est créé par ProductsService lors de la
   * publication ; les QR unitaires viennent des campagnes de génération.
   */
  async activate(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        batch: { include: { verification: { include: { request: { include: { producer: true } } } } } },
        qrCodes: { take: 1 },
      },
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    if (!product.batch) {
      throw new BadRequestException('Le produit doit être rattaché à un lot vérifié.');
    }
    if (product.batch.status === BatchStatus.SUSPENDED || product.batch.status === BatchStatus.RECALLED) {
      throw new BadRequestException(
        "Le lot rattaché est suspendu ou rappelé : le produit ne peut pas être mis en marché.",
      );
    }
    if (product.statut === ProductStatus.ARCHIVE) {
      throw new BadRequestException('Un produit archivé ne peut pas être remis en marché.');
    }
    if (product.qrCodes.length === 0) {
      throw new BadRequestException(
        "Générez les QR codes du produit avant sa mise en marché.",
      );
    }
    await this.variants.ensureDefaultVariant(id);

    await this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { statut: ProductStatus.PUBLIE } }),
      this.prisma.batch.update({
        where: { id: product.batchId! },
        data: { status: BatchStatus.PUBLISHED },
      }),
    ]);

    await this.audit.log(userId, 'ACTIVATE_PRODUCT', 'Product', id, {
      previousStatus: product.statut,
      newStatus: ProductStatus.PUBLIE,
    });
    await this.notifications.notify(
      product.batch.verification.request.producer.userId,
      NotificationType.PRODUCT_PUBLISHED,
      'Produit publié',
      `Votre miel est en vente sous le nom « ${product.nom} ».`,
      'Product',
      id,
    );
    for (const role of [Role.ADMIN, Role.VERIFICATION_TEAM]) {
      await this.notifications.notifyRole(
        role,
        NotificationType.PRODUCT_PUBLISHED,
        'Produit mis en marché',
        `« ${product.nom} » est publié au catalogue.`,
        'Product',
        id,
      );
    }

    return this.findOne(id);
  }

  // --- Documents produit ---------------------------------------------------

  async addDocument(
    id: string,
    userId: string,
    type: string,
    file: { originalname: string; filename: string; mimetype: string; size: number },
  ) {
    await this.findOne(id);
    const document = await this.prisma.productDocument.create({
      data: {
        productId: id,
        type: type || 'OTHER',
        fileName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    await this.audit.log(userId, 'UPLOAD_PRODUCT_DOCUMENT', 'ProductDocument', document.id);
    return document;
  }

  /** Lien de téléchargement signé d'un document produit (accès journalisé). */
  async documentDownload(documentId: string, userId: string) {
    const document = await this.prisma.productDocument.findUnique({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    await this.audit.log(userId, 'ACCESS_PRODUCT_DOCUMENT', 'ProductDocument', documentId, {
      details: document.fileName,
    });
    return {
      url: `/uploads/product-documents/${document.storedName}`,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  async deleteDocument(documentId: string, userId: string) {
    const document = await this.prisma.productDocument.findUnique({
      where: { id: documentId },
      include: { product: { select: { statut: true } } },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    // Une fiche publiée engage Kounouz : ses pièces justificatives restent.
    if (document.product.statut === ProductStatus.PUBLIE) {
      throw new BadRequestException(
        "Les pièces d'un produit publié sont conservées et ne peuvent pas être supprimées.",
      );
    }
    await this.prisma.productDocument.delete({ where: { id: documentId } });
    await this.audit.log(userId, 'DELETE_PRODUCT_DOCUMENT', 'ProductDocument', documentId);
  }
}
