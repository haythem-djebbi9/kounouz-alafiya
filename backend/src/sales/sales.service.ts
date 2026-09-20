import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  OrderStatus,
  Prisma,
  ProductStatus,
  SalesChannel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateOrderDto, PaySettlementDto } from './dto/sales.dto.js';
import { ProductVariantsService } from '../products/product-variants.service.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';
import { aggregateBySku, lineAmounts } from './sku-report.js';

// Frais de livraison alignés sur le panier de la vitrine (CartDrawer).
const SHIPPING_FEE = 25;
const FREE_SHIPPING_THRESHOLD = 200;
// Les gains d'une période mensuelle sont versés le 15 du mois suivant.
const PAYOUT_DAY = 15;

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export type SettlementStatus = 'OPEN' | 'PROCESSING' | 'PAID';

const round2 = (value: number) => Math.round(value * 100) / 100;

export function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function periodBounds(period: string) {
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const lastDay = new Date(year, month, 0);
  const payoutDate = new Date(year, month, PAYOUT_DAY);
  return { start, end, lastDay, payoutDate };
}

const PRODUCER_ITEM_SELECT = {
  id: true,
  productId: true,
  variantId: true,
  sku: true,
  productName: true,
  packageSize: true,
  quantity: true,
  unitPrice: true,
  lineTotal: true,
  commissionRate: true,
  commissionAmount: true,
  netAmount: true,
  product: { select: { images: true, batch: { select: { batchCode: true } } } },
  // Pas de données personnelles du client côté producteur : ville uniquement.
  order: {
    select: { id: true, orderNumber: true, status: true, channel: true, city: true, createdAt: true, deliveredAt: true },
  },
} as const;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly variants: ProductVariantsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  private commissionRate(): number {
    const raw = Number(this.config.get<string>('KOUNOUZ_COMMISSION_RATE', '0.2'));
    return Number.isFinite(raw) && raw >= 0 && raw < 1 ? raw : 0.2;
  }

  private async producerForUser(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }
    return producer;
  }

  // --- Commandes ----------------------------------------------------------------

  async createOrder(dto: CreateOrderDto, channel: SalesChannel, actorUserId?: string) {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        batch: { select: { verification: { select: { request: { select: { producerId: true, producer: { select: { userId: true } } } } } } } },
      },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Un ou plusieurs produits sont introuvables.');
    }
    const productById = new Map(products.map((p) => [p.id, p]));

    // SAL-01 : la vente se fait au niveau du SKU (format de pot). Deux lignes
    // qui désignent le même SKU sont fusionnées.
    const bySku = new Map<string, { variant: Awaited<ReturnType<ProductVariantsService['resolveForSale']>>; quantity: number }>();
    for (const item of dto.items) {
      const product = productById.get(item.productId)!;
      if (product.statut !== ProductStatus.PUBLIE) {
        throw new BadRequestException(`Le produit "${product.nom}" n'est plus disponible.`);
      }
      const variant = await this.variants.resolveForSale(product.id, item.variantId);
      const entry = bySku.get(variant.id) ?? { variant, quantity: 0 };
      entry.quantity += item.quantity;
      bySku.set(variant.id, entry);
    }

    const rate = this.commissionRate();
    const lines = [...bySku.values()].map(({ variant, quantity }) => {
      const product = productById.get(variant.productId)!;
      const producerId = product.batch?.verification.request.producerId;
      if (!producerId) {
        throw new BadRequestException(`Le produit "${product.nom}" n'est rattaché à aucun lot vérifié.`);
      }
      if (variant.stock < quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour "${product.nom}" ${variant.packageSize} (${variant.stock} disponible(s)).`,
        );
      }
      const unitPrice = Number(variant.price);
      return {
        product,
        variant,
        producerUserId: product.batch!.verification.request.producer.userId,
        data: {
          productId: product.id,
          variantId: variant.id,
          sku: variant.sku,
          producerId,
          productName: product.nom,
          packageSize: variant.packageSize,
          quantity,
          unitPrice,
          commissionRate: rate,
          ...lineAmounts(unitPrice, quantity, rate),
        },
      };
    });

    const subtotal = round2(lines.reduce((sum, l) => sum + l.data.lineTotal, 0));
    const shippingFee = channel === SalesChannel.ONLINE_STORE && subtotal <= FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const order = await this.prisma.$transaction(async (tx) => {
          for (const line of lines) {
            // Décrément conditionnel par SKU : protège contre une vente
            // concurrente du dernier pot entre la lecture et l'écriture.
            await this.variants.reserveStock(tx, line.variant.id, line.data.quantity);
          }
          for (const productId of new Set(lines.map((l) => l.product.id))) {
            await this.variants.recomputeProductSummary(productId, tx);
            await tx.product.updateMany({
              where: { id: productId, stock: 0, statut: ProductStatus.PUBLIE },
              data: { statut: ProductStatus.RUPTURE },
            });
          }

          const orderCount = await tx.order.count();
          return tx.order.create({
            data: {
              orderNumber: `KZ${1001 + orderCount + attempt}`,
              customerName: dto.customerName.trim(),
              customerPhone: dto.customerPhone.trim(),
              customerEmail: dto.customerEmail,
              shippingAddress: dto.shippingAddress.trim(),
              city: dto.city.trim(),
              channel,
              subtotal,
              shippingFee,
              total: round2(subtotal + shippingFee),
              items: { create: lines.map((l) => l.data) },
            },
            include: { items: true },
          });
        });

        if (actorUserId) {
          await this.audit.log(actorUserId, 'CREATE_ORDER', 'Order', order.id);
        }
        await this.domainEvents.publish(EventType.ORDER_CREATED, 'Order', order.id, {
          orderNumber: order.orderNumber,
          channel,
          total: Number(order.total),
          skus: lines.map((l) => ({ sku: l.data.sku, quantity: l.data.quantity })),
        });
        const producerUserIds = [...new Set(lines.map((l) => l.producerUserId))];
        await this.notifications.notifyMany(
          producerUserIds,
          NotificationType.NEW_ORDER,
          'Nouvelle commande',
          `La commande ${order.orderNumber} contient vos produits.`,
          'Order',
          order.id,
        );
        return order;
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
          throw err;
        }
      }
    }
    throw new BadRequestException("Impossible d'enregistrer la commande, veuillez réessayer.");
  }

  findAllOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: { items: { include: { producer: { select: { id: true, name: true, farmName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(id: string, userId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      throw new NotFoundException('Commande introuvable.');
    }
    if (!ORDER_TRANSITIONS[order.status].includes(status)) {
      throw new BadRequestException(`Impossible de passer une commande "${order.status}" à "${status}".`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
            await this.variants.recomputeProductSummary(item.productId, tx);
          } else {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          }
          await tx.product.updateMany({
            where: { id: item.productId, statut: ProductStatus.RUPTURE, stock: { gt: 0 } },
            data: { statut: ProductStatus.PUBLIE },
          });
        }
      }
      return tx.order.update({
        where: { id },
        data: { status, ...(status === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}) },
        include: { items: { include: { producer: { select: { id: true, name: true, farmName: true } } } } },
      });
    });

    await this.audit.log(userId, `ORDER_${status}`, 'Order', id, {
      previousStatus: order.status,
      newStatus: status,
    });
    return updated;
  }

  // --- Portail Producteur ---------------------------------------------------------

  async findProducerSales(userId: string) {
    const producer = await this.producerForUser(userId);
    const items = await this.prisma.orderItem.findMany({
      where: { producerId: producer.id },
      select: PRODUCER_ITEM_SELECT,
      orderBy: { order: { createdAt: 'desc' } },
    });
    // P09 : ventes par SKU (unités, brut, commission, net).
    return { commissionRate: this.commissionRate(), items, bySku: aggregateBySku(items) };
  }

  // Une période de règlement = les lignes LIVRÉES au cours du mois. Une fois
  // payée, la période est figée dans Payout (les montants ne bougent plus).
  private async computeSettlements(producerId: string) {
    const [deliveredItems, payouts] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: { producerId, order: { status: OrderStatus.DELIVERED, deliveredAt: { not: null } } },
        select: {
          quantity: true,
          lineTotal: true,
          commissionAmount: true,
          netAmount: true,
          commissionRate: true,
          order: { select: { id: true, deliveredAt: true } },
        },
      }),
      this.prisma.payout.findMany({ where: { producerId } }),
    ]);

    const byPeriod = new Map<
      string,
      { orders: Set<string>; itemsSold: number; gross: number; commission: number; net: number }
    >();
    for (const item of deliveredItems) {
      const period = periodOf(item.order.deliveredAt!);
      const bucket = byPeriod.get(period) ?? { orders: new Set(), itemsSold: 0, gross: 0, commission: 0, net: 0 };
      bucket.orders.add(item.order.id);
      bucket.itemsSold += item.quantity;
      bucket.gross += Number(item.lineTotal);
      bucket.commission += Number(item.commissionAmount);
      bucket.net += Number(item.netAmount);
      byPeriod.set(period, bucket);
    }

    const payoutByPeriod = new Map(payouts.map((p) => [p.period, p]));
    const currentPeriod = periodOf(new Date());
    const periods = [...new Set([...byPeriod.keys(), ...payoutByPeriod.keys()])].sort().reverse();

    return periods.map((period) => {
      const { start, lastDay, payoutDate } = periodBounds(period);
      const payout = payoutByPeriod.get(period);
      const bucket = byPeriod.get(period);
      const gross = payout ? Number(payout.grossAmount) : round2(bucket?.gross ?? 0);
      const commission = payout ? Number(payout.commissionAmount) : round2(bucket?.commission ?? 0);
      const status: SettlementStatus = payout ? 'PAID' : period >= currentPeriod ? 'OPEN' : 'PROCESSING';
      return {
        id: `STL-${period}`,
        period,
        periodStart: start,
        periodEnd: lastDay,
        expectedPayoutDate: payoutDate,
        status,
        orderCount: payout ? payout.orderCount : (bucket?.orders.size ?? 0),
        itemsSold: payout ? payout.itemsSold : (bucket?.itemsSold ?? 0),
        grossAmount: gross,
        commissionAmount: commission,
        netAmount: payout ? Number(payout.netAmount) : round2(bucket?.net ?? 0),
        commissionRate: gross > 0 ? round2((commission / gross) * 10000) / 10000 : this.commissionRate(),
        paidAt: payout?.paidAt ?? null,
        reference: payout?.reference ?? null,
      };
    });
  }

  async findMySettlements(userId: string) {
    const producer = await this.producerForUser(userId);
    const settlements = await this.computeSettlements(producer.id);
    return {
      commissionRate: this.commissionRate(),
      payment: { paymentMethod: producer.paymentMethod, bankName: producer.bankName, iban: producer.iban },
      settlements,
    };
  }

  async findMySettlement(userId: string, period: string) {
    const producer = await this.producerForUser(userId);
    const settlement = (await this.computeSettlements(producer.id)).find((s) => s.period === period);
    if (!settlement) {
      throw new NotFoundException('Règlement introuvable pour cette période.');
    }
    const { start, end } = periodBounds(period);
    const items = await this.prisma.orderItem.findMany({
      where: {
        producerId: producer.id,
        order: { status: OrderStatus.DELIVERED, deliveredAt: { gte: start, lt: end } },
      },
      select: PRODUCER_ITEM_SELECT,
      orderBy: { order: { deliveredAt: 'desc' } },
    });
    return {
      ...settlement,
      producer: { name: producer.name, farmName: producer.farmName },
      payment: { paymentMethod: producer.paymentMethod, bankName: producer.bankName, iban: producer.iban },
      items,
      bySku: aggregateBySku(items),
    };
  }

  // --- Règlements (équipe Kounouz) --------------------------------------------------

  async findAllSettlements() {
    const producers = await this.prisma.producer.findMany({
      where: { OR: [{ orderItems: { some: {} } }, { payouts: { some: {} } }] },
      select: { id: true, name: true, farmName: true, paymentMethod: true, bankName: true, iban: true },
      orderBy: { name: 'asc' },
    });
    const rows = await Promise.all(
      producers.map(async (producer) =>
        (await this.computeSettlements(producer.id)).map((settlement) => ({ ...settlement, producer })),
      ),
    );
    return rows.flat().sort((a, b) => b.period.localeCompare(a.period));
  }

  async paySettlement(userId: string, dto: PaySettlementDto) {
    const producer = await this.prisma.producer.findUnique({ where: { id: dto.producerId } });
    if (!producer) {
      throw new NotFoundException('Producteur introuvable.');
    }
    const settlement = (await this.computeSettlements(producer.id)).find((s) => s.period === dto.period);
    if (!settlement) {
      throw new NotFoundException('Aucune vente livrée sur cette période.');
    }
    if (settlement.status === 'PAID') {
      throw new BadRequestException('Cette période a déjà été réglée.');
    }
    if (settlement.status === 'OPEN') {
      throw new BadRequestException("La période n'est pas encore clôturée : elle ne peut être réglée qu'après la fin du mois.");
    }

    const payout = await this.prisma.payout.create({
      data: {
        producerId: producer.id,
        period: dto.period,
        orderCount: settlement.orderCount,
        itemsSold: settlement.itemsSold,
        grossAmount: settlement.grossAmount,
        commissionAmount: settlement.commissionAmount,
        netAmount: settlement.netAmount,
        reference: dto.reference,
        paidById: userId,
      },
    });
    await this.audit.log(userId, 'PAY_SETTLEMENT', 'Payout', payout.id, {
      previousStatus: settlement.status,
      newStatus: 'PAID',
      metadata: {
        period: dto.period,
        grossAmount: settlement.grossAmount,
        commissionAmount: settlement.commissionAmount,
        netAmount: settlement.netAmount,
      },
    });
    await this.domainEvents.publish(
      EventType.SETTLEMENT_GENERATED,
      'Payout',
      payout.id,
      { producerId: producer.id, period: dto.period, netAmount: settlement.netAmount },
      { idempotencyKey: `settlement:${producer.id}:${dto.period}` },
    );
    await this.notifications.notify(
      producer.userId,
      NotificationType.PAYOUT_PAID,
      'Paiement effectué',
      `Vos gains de la période ${dto.period} (${settlement.netAmount.toFixed(2)} TND) ont été versés.`,
      'Payout',
      payout.id,
    );
    return payout;
  }
}

