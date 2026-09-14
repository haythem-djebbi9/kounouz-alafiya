import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BatchStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { QrCodesService } from '../qr-codes/qr-codes.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductStatusDto } from './dto/update-product-status.dto.js';

const PRODUCT_INCLUDE = {
  categorie: true,
  batch: true,
  packaging: true,
  qrCode: true,
} as const;

// Catalogue public : ajoute la provenance (producteur/lot) nécessaire à
// l'affichage de la traçabilité sur la fiche produit du marketplace.
const PUBLIC_PRODUCT_INCLUDE = {
  categorie: true,
  qrCode: { select: { qrId: true, qrCode: true } },
  packaging: { select: { size: true } },
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
  ) {}

  async create(userId: string, dto: CreateProductDto) {
    const categorie = await this.prisma.categorie.findUnique({ where: { id: dto.categorieId } });
    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable.');
    }

    let packagingId: string | undefined;
    if (dto.batchId) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: dto.batchId },
        include: { packaging: true },
      });
      if (!batch) {
        throw new NotFoundException('Lot introuvable.');
      }
      packagingId = batch.packaging?.id;
    }

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

    await this.audit.log(userId, 'CREATE_PRODUCT', 'Product', product.id);
    return product;
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

    return this.prisma.product.update({
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
  }

  async updateStatus(id: string, userId: string, dto: UpdateProductStatusDto) {
    const product = await this.findOne(id);

    if (dto.statut === ProductStatus.PUBLIE) {
      if (!product.batchId || !product.batch) {
        throw new BadRequestException(
          'Le produit doit être rattaché à un lot certifié pour être publié.',
        );
      }
      if (product.batch.status !== BatchStatus.READY) {
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

    await this.audit.log(userId, `PRODUCT_${dto.statut}`, 'Product', id);
    return updated;
  }

  findAllForAdmin(statut?: ProductStatus) {
    return this.prisma.product.findMany({
      where: statut ? { statut } : undefined,
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    return product;
  }

  // Catalogue public (marketplace) : uniquement les produits publiés.
  findPublicCatalog(categorieSlug?: string) {
    return this.prisma.product.findMany({
      where: {
        statut: ProductStatus.PUBLIE,
        ...(categorieSlug ? { categorie: { slug: categorieSlug } } : {}),
      },
      include: PUBLIC_PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublicOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, statut: ProductStatus.PUBLIE },
      include: PUBLIC_PRODUCT_INCLUDE,
    });
    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }
    return product;
  }

  // Portail Producteur : "Vue de ses produits publiés" (cahier des charges 7.1).
  async findMineForProducer(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }
    return this.prisma.product.findMany({
      where: {
        statut: ProductStatus.PUBLIE,
        batch: { verification: { request: { producerId: producer.id } } },
      },
      include: { categorie: true, qrCode: { select: { qrId: true, qrCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
