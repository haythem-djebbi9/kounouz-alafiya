import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductVariantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { allocateYearCode } from '../common/sequential-code.js';
import { ProductVariantInputDto, UpdateProductVariantDto } from './dto/product-variant.dto.js';
import { buildSku, formatGrams, parsePackageSizeToGrams } from './sku.js';

/**
 * Déclinaisons commerciales (SKU) d'un produit (§12 Ventes, PRD-03/04).
 *
 * Chaque format de pot est un SKU distinct, avec son prix et son stock : les
 * ventes, les gains producteur et les QR se rattachent à ce niveau. Le prix et
 * le stock portés par Product restent tenus à jour (prix « à partir de »,
 * stock total) pour les écrans qui n'affichent qu'un résumé.
 */
@Injectable()
export class ProductVariantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ netWeightG: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Attribue l'identifiant produit lisible (KZ-PRD-AAAA-NNN) s'il manque. */
  async ensureProductCode(productId: string): Promise<string> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { productCode: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable.');
    if (product.productCode) return product.productCode;

    const updated = await allocateYearCode(
      'KZ-PRD',
      (prefix) => this.prisma.product.count({ where: { productCode: { startsWith: prefix } } }),
      (productCode) => this.prisma.product.update({ where: { id: productId }, data: { productCode } }),
    );
    return updated.productCode!;
  }

  /**
   * Crée les SKU d'un produit neuf.
   *
   * Ordre de priorité : déclinaisons saisies explicitement, sinon une par
   * format réellement emballé (unités d'emballage du lot, stock = quantité
   * produite), sinon une déclinaison unique tirée de la fiche produit.
   */
  async createInitialVariants(productId: string, explicit?: ProductVariantInputDto[]) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { packaging: { include: { units: true } }, variants: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable.');
    if (product.variants.length > 0) return this.list(productId);

    let inputs: ProductVariantInputDto[];
    if (explicit && explicit.length > 0) {
      inputs = explicit;
    } else if (product.packaging && product.packaging.units.length > 0) {
      const bySize = new Map<string, number>();
      for (const unit of product.packaging.units) {
        const label = normalizeSize(unit.unitSize);
        bySize.set(label, (bySize.get(label) ?? 0) + unit.quantity);
      }
      inputs = [...bySize.entries()].map(([packageSize, stock]) => ({
        packageSize,
        price: Number(product.prix),
        stock,
      }));
    } else {
      inputs = [
        {
          packageSize: product.netWeightG ? formatGrams(product.netWeightG) : (product.packaging?.size ?? 'Standard'),
          price: Number(product.prix),
          stock: product.stock,
        },
      ];
    }

    const productCode = await this.ensureProductCode(productId);
    assertDistinctSizes(inputs);
    const sorted = [...inputs].sort(
      (a, b) => (parsePackageSizeToGrams(a.packageSize) ?? 0) - (parsePackageSizeToGrams(b.packageSize) ?? 0),
    );
    for (const [index, input] of sorted.entries()) {
      await this.createOne(productId, productCode, input, index === 0);
    }
    await this.recomputeProductSummary(productId);
    return this.list(productId);
  }

  /** Filet de sécurité : tout produit possède au moins un SKU. */
  async ensureDefaultVariant(productId: string) {
    const count = await this.prisma.productVariant.count({ where: { productId } });
    if (count === 0) await this.createInitialVariants(productId);
  }

  async addVariant(productId: string, userId: string, input: ProductVariantInputDto) {
    const productCode = await this.ensureProductCode(productId);
    const existing = await this.list(productId);
    assertDistinctSizes([...existing.map((v) => ({ packageSize: v.packageSize, price: 0 })), input]);
    const variant = await this.createOne(productId, productCode, input, existing.length === 0);
    await this.recomputeProductSummary(productId);
    await this.audit.log(userId, 'CREATE_PRODUCT_VARIANT', 'ProductVariant', variant.id, {
      details: `${variant.sku} — ${variant.packageSize} — ${variant.price} TND`,
    });
    return variant;
  }

  async updateVariant(variantId: string, userId: string, dto: UpdateProductVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Déclinaison introuvable.');

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { price: dto.price, stock: dto.stock, status: dto.status },
    });
    await this.recomputeProductSummary(variant.productId);
    await this.audit.log(userId, 'UPDATE_PRODUCT_VARIANT', 'ProductVariant', variantId, {
      previousStatus: variant.status,
      newStatus: updated.status,
      metadata: {
        sku: variant.sku,
        price: { old: variant.price.toString(), new: updated.price.toString() },
        stock: { old: variant.stock, new: updated.stock },
      },
    });
    return updated;
  }

  /**
   * SKU vendu pour une ligne de commande : celui demandé s'il est actif et
   * appartient au produit, sinon le SKU par défaut (anciens paniers).
   */
  async resolveForSale(productId: string, variantId?: string | null) {
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
      if (!variant || variant.productId !== productId) {
        throw new BadRequestException('Cette déclinaison ne correspond pas au produit commandé.');
      }
      if (variant.status !== ProductVariantStatus.ACTIVE) {
        throw new BadRequestException(`Le format ${variant.packageSize} n'est plus disponible.`);
      }
      return variant;
    }
    await this.ensureDefaultVariant(productId);
    const fallback =
      (await this.prisma.productVariant.findFirst({
        where: { productId, isDefault: true, status: ProductVariantStatus.ACTIVE },
      })) ??
      (await this.prisma.productVariant.findFirst({
        where: { productId, status: ProductVariantStatus.ACTIVE },
        orderBy: { netWeightG: 'asc' },
      }));
    if (!fallback) throw new BadRequestException("Ce produit n'a aucun format disponible à la vente.");
    return fallback;
  }

  /** Décrément atomique du stock d'un SKU : refuse de passer sous zéro. */
  async reserveStock(tx: Prisma.TransactionClient, variantId: string, quantity: number) {
    const { count } = await tx.productVariant.updateMany({
      where: { id: variantId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (count === 0) {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
      throw new BadRequestException(
        `Stock insuffisant pour ${variant?.sku ?? 'ce format'} (${variant?.stock ?? 0} disponible(s)).`,
      );
    }
  }

  /** Prix « à partir de » et stock total du produit, déduits de ses SKU actifs. */
  async recomputeProductSummary(productId: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    const active = await client.productVariant.findMany({
      where: { productId, status: ProductVariantStatus.ACTIVE },
      select: { price: true, stock: true },
    });
    if (active.length === 0) return;
    const minPrice = active.reduce((min, v) => (v.price.lessThan(min) ? v.price : min), active[0].price);
    const totalStock = active.reduce((sum, v) => sum + v.stock, 0);
    await client.product.update({ where: { id: productId }, data: { prix: minPrice, stock: totalStock } });
  }

  private async createOne(productId: string, productCode: string, input: ProductVariantInputDto, isDefault: boolean) {
    const packageSize = normalizeSize(input.packageSize);
    try {
      return await this.prisma.productVariant.create({
        data: {
          productId,
          sku: buildSku(productCode, packageSize),
          packageSize,
          netWeightG: parsePackageSizeToGrams(packageSize),
          price: input.price,
          stock: input.stock ?? 0,
          isDefault,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException(`Le format ${packageSize} existe déjà pour ce produit.`);
      }
      throw err;
    }
  }
}

/** « 500g » et « 500 G » désignent le même format : on normalise le libellé. */
function normalizeSize(size: string): string {
  const grams = parsePackageSizeToGrams(size);
  return grams !== null ? formatGrams(grams) : size.trim();
}

function assertDistinctSizes(inputs: { packageSize: string }[]) {
  const seen = new Set<string>();
  for (const input of inputs) {
    const key = normalizeSize(input.packageSize).toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException(`Le format ${normalizeSize(input.packageSize)} est déclaré deux fois.`);
    }
    seen.add(key);
  }
}
