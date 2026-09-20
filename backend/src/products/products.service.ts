import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, NotificationType, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { QrCodesService } from '../qr-codes/qr-codes.service.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';
import { ProductVariantsService } from './product-variants.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductStatusDto } from './dto/update-product-status.dto.js';
import {
  PRIMARY_QR_FULL,
  PRIMARY_QR_SELECT,
  withPrimaryQr,
  withPrimaryQrAll,
} from '../common/primary-qr.js';

const PRODUCT_INCLUDE = {
  categorie: true,
  batch: true,
  packaging: true,
  qrCodes: PRIMARY_QR_FULL,
  variants: { orderBy: { netWeightG: 'asc' } },
} as const;

// Catalogue public : ajoute la provenance (producteur/lot) nécessaire à
// l'affichage de la traçabilité sur la fiche produit du marketplace.
const PUBLIC_PRODUCT_INCLUDE = {
  categorie: true,
  qrCodes: PRIMARY_QR_SELECT,
  packaging: { select: { size: true } },
  // Formats en vente (SKU actifs) : le client choisit son format.
  variants: {
    where: { status: 'ACTIVE' },
    orderBy: { netWeightG: 'asc' },
    select: { id: true, sku: true, packageSize: true, netWeightG: true, price: true, stock: true, isDefault: true },
  },
  batch: {
    select: {
      batchCode: true,
      honeyType: true,
      verification: {
        select: {
          request: { select: { producer: { select: { name: true, farmName: true, location: true } } } },
        },
      },
    },
  },
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly qrCodes: QrCodesService,
    private readonly notifications: NotificationsService,
    private readonly variants: ProductVariantsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async create(userId: string, dto: CreateProductDto) {
    const categorie = await this.prisma.categorie.findUnique({ where: { id: dto.categorieId } });
    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable.');
    }

    // PRD-01 : un produit commercial n'existe qu'à partir d'un lot vérifié et
    // emballé par Kounouz — y compris par cette ancienne route admin.
    if (!dto.batchId) {
      throw new BadRequestException('Un produit doit être créé à partir d\'un lot vérifié et emballé.');
    }
    const batch = await this.prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: { packaging: true },
    });
    if (!batch) {
      throw new NotFoundException('Lot introuvable.');
    }
    if (!PACKAGED_BATCH_STATUSES.includes(batch.status) || !batch.packaging) {
      throw new BadRequestException("L'emballage Kounouz du lot doit être finalisé avant de créer le produit.");
    }
    const packagingId = batch.packaging.id;

    const product = await this.prisma.product.create({
      data: {
        categorieId: dto.categorieId,
        batchId: dto.batchId,
        packagingId,
        nom: dto.nom,
        description: dto.description,
        prix: dto.prix,
        stock: dto.stock ?? 0,
        images: dto.images ?? [],
        gamme: dto.gamme,
        statut: ProductStatus.BROUILLON,
      },
      include: PRODUCT_INCLUDE,
    });

    await this.variants.ensureDefaultVariant(product.id);
    await this.audit.log(userId, 'CREATE_PRODUCT', 'Product', product.id, { newStatus: ProductStatus.BROUILLON });
    await this.domainEvents.publish(EventType.PRODUCT_CREATED, 'Product', product.id, {
      productName: product.nom,
      batchId: product.batchId,
    });
    return withPrimaryQr(await this.findOne(product.id));
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (dto.batchId && dto.batchId !== product.batchId && product.statut !== ProductStatus.BROUILLON) {
      throw new BadRequestException(
        "Le lot d'un produit déjà publié ne peut plus être modifié.",
      );
    }

    let packagingId: string | null | undefined;
    if (dto.batchId) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: dto.batchId },
        include: { packaging: true },
      });
      if (!batch) {
        throw new NotFoundException('Lot introuvable.');
      }
      packagingId = batch.packaging?.id ?? null;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        categorieId: dto.categorieId,
        batchId: dto.batchId,
        ...(packagingId !== undefined ? { packagingId } : {}),
        nom: dto.nom,
        description: dto.description,
        prix: dto.prix,
        stock: dto.stock,
        images: dto.images,
        gamme: dto.gamme,
      },
      include: PRODUCT_INCLUDE,
    });
    return withPrimaryQr(updated);
  }

  async updateStatus(id: string, userId: string, dto: UpdateProductStatusDto) {
    const product = await this.findOne(id);

    if (product.statut === ProductStatus.ARCHIVE) {
      throw new BadRequestException('Un produit archivé ne change plus de statut.');
    }

    if (dto.statut === ProductStatus.PUBLIE) {
      if (!product.batchId || !product.batch) {
        throw new BadRequestException(
          'Le produit doit être rattaché à un lot certifié pour être publié.',
        );
      }
      // BAT-04 : un lot suspendu ou rappelé bloque toute publication.
      if (product.batch.status === BatchStatus.SUSPENDED || product.batch.status === BatchStatus.RECALLED) {
        throw new BadRequestException('Le lot rattaché est suspendu ou rappelé : publication impossible.');
      }
      if (!PACKAGED_BATCH_STATUSES.includes(product.batch.status)) {
        throw new BadRequestException("Le lot rattaché n'est pas encore prêt (emballage non finalisé).");
      }
      await this.qrCodes.generateForProduct(id);
    } else if (!product.qrCode) {
      throw new BadRequestException('Le produit doit être publié au moins une fois avant ce statut.');
    }

    // Rattrape le lien vers l'emballage si celui-ci a été finalisé après la
    // création du produit (l'emballage n'existait pas encore à ce moment-là).
    const packagingId =
      dto.statut === ProductStatus.PUBLIE && !product.packagingId
        ? ((await this.prisma.batch.findUnique({ where: { id: product.batchId! }, include: { packaging: true } }))
            ?.packaging?.id ?? undefined)
        : undefined;

    const updated = await this.prisma.product.update({
      where: { id },
      data: { statut: dto.statut, ...(packagingId ? { packagingId } : {}) },
      include: PRODUCT_INCLUDE,
    });

    await this.audit.log(userId, `PRODUCT_${dto.statut}`, 'Product', id, {
      previousStatus: product.statut,
      newStatus: dto.statut,
    });
    if (dto.statut === ProductStatus.SUSPENDU) {
      await this.domainEvents.publish(EventType.PRODUCT_SUSPENDED, 'Product', id, { productName: updated.nom });
    }

    if (dto.statut === ProductStatus.PUBLIE) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: product.batchId! },
        include: { verification: { include: { request: { include: { producer: true } } } } },
      });
      const producerUserId = batch?.verification.request.producer.userId;
      if (producerUserId) {
        await this.notifications.notify(
          producerUserId,
          NotificationType.PRODUCT_PUBLISHED,
          'Produit publié',
          `Votre produit "${updated.nom}" est maintenant publié sur la marketplace.`,
          'Product',
          updated.id,
        );
      }
    }

    return withPrimaryQr(updated);
  }

  async findAllForAdmin(statut?: ProductStatus) {
    const products = await this.prisma.product.findMany({
      where: statut ? { statut } : undefined,
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return withPrimaryQrAll(products);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    return withPrimaryQr(product);
  }

  // Catalogue public (marketplace) : uniquement les produits publiés.
  async findPublicCatalog(categorieSlug?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        statut: ProductStatus.PUBLIE,
        ...(categorieSlug ? { categorie: { slug: categorieSlug } } : {}),
      },
      include: PUBLIC_PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return withPrimaryQrAll(products);
  }

  async findPublicOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, statut: ProductStatus.PUBLIE },
      include: PUBLIC_PRODUCT_INCLUDE,
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    return withPrimaryQr(product);
  }

  // Portail Producteur : produits créés par Kounouz à partir de ses lots
  // vérifiés (tous statuts : en préparation, publiés, inactifs), avec le
  // nombre d'unités vendues. Lecture seule — Kounouz reste maître du catalogue.
  async findMineForProducer(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }
    const products = await this.prisma.product.findMany({
      where: { batch: { verification: { request: { producerId: producer.id } } } },
      include: {
        categorie: true,
        packaging: { select: { size: true, packageType: true } },
        qrCodes: PRIMARY_QR_SELECT,
        variants: {
    where: { status: 'ACTIVE' },
    orderBy: { netWeightG: 'asc' },
    select: { id: true, sku: true, packageSize: true, netWeightG: true, price: true, stock: true, isDefault: true },
  },
        batch: {
          select: {
            id: true,
            batchCode: true,
            status: true,
            honeyType: true,
            verification: {
              select: { status: true, verifiedAt: true, request: { select: { floralCategory: true, collectionLocation: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sales = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { producerId: producer.id, order: { status: { not: 'CANCELLED' } } },
      _sum: { quantity: true },
    });
    const soldByProduct = new Map(sales.map((s) => [s.productId, s._sum.quantity ?? 0]));

    return products.map((product) => ({
      ...withPrimaryQr(product),
      unitsSold: soldByProduct.get(product.id) ?? 0,
    }));
  }
}

// États d'un lot dont l'emballage Kounouz est terminé (READY : ancien nom de
// PACKAGED, conservé pour les lots antérieurs).
const PACKAGED_BATCH_STATUSES: BatchStatus[] = [
  BatchStatus.PACKAGED,
  BatchStatus.READY,
  BatchStatus.CONVERTED_TO_PRODUCT,
  BatchStatus.PUBLISHED,
];
