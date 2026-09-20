import { PrismaClient, ProducerDocumentStatus, ProducerDocumentType } from '@prisma/client';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Comptes producteurs de démonstration : ils reçoivent les pièces exigées à la
// soumission d'une demande, pour que le scénario puisse démarrer tout de suite.
const DEMO_PRODUCER_EMAILS = ['producteur@kounouzalafiya.com', 'fatma.trabelsi@kounouzalafiya.com'];

// PDF d'une page, valide, marqué « document de démonstration ».
const DEMO_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
  '4 0 obj<</Length 71>>stream',
  'BT /F1 18 Tf 60 780 Td (Kounouz Alafiya - document de demonstration) Tj ET',
  'endstream endobj',
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
  'trailer<</Root 1 0 R>>',
  '%%EOF',
].join('\n');

/**
 * Données de démonstration conformes au modèle Phase 1 : chaque producteur a
 * un rucher principal, chaque produit un identifiant lisible et au moins un
 * SKU, chaque ligne de commande son SKU. Reprend la logique de la migration
 * `phase1_compliance`, pour qu'une base neuve peuplée par le seed soit dans le
 * même état qu'une base migrée. Idempotent : peut être rejoué sans doublon.
 */
export async function seedPhase1Compliance(prisma: PrismaClient) {
  const year = new Date().getFullYear();

  // 1) Rucher principal de chaque producteur sans rucher.
  const producers = await prisma.producer.findMany({ where: { farms: { none: {} } }, orderBy: { createdAt: 'asc' } });
  let farmCount = await prisma.farm.count({ where: { farmCode: { startsWith: `FRM-${year}-` } } });
  for (const producer of producers) {
    farmCount += 1;
    await prisma.farm.create({
      data: {
        producerId: producer.id,
        farmCode: `FRM-${year}-${String(farmCount).padStart(3, '0')}`,
        name: producer.farmName || producer.name,
        governorate: producer.farmGovernorate ?? producer.governorate,
        delegation: producer.farmDelegation,
        address: producer.farmAddress,
        latitude: producer.latitude,
        longitude: producer.longitude,
        hivesCount: producer.hivesCount,
        mainFlora: producer.mainFlora,
        isPrimary: true,
      },
    });
  }

  // 2) Demandes rattachées au rucher principal.
  const unlinked = await prisma.verificationRequest.findMany({ where: { farmId: null }, select: { id: true, producerId: true } });
  for (const request of unlinked) {
    const farm = await prisma.farm.findFirst({ where: { producerId: request.producerId, isPrimary: true } });
    if (farm) await prisma.verificationRequest.update({ where: { id: request.id }, data: { farmId: farm.id } });
  }

  // 3) Identifiant produit + SKU par défaut.
  const products = await prisma.product.findMany({
    where: { OR: [{ productCode: null }, { variants: { none: {} } }] },
    include: { packaging: { include: { units: true } } },
    orderBy: { createdAt: 'asc' },
  });
  for (const product of products) {
    let code = product.productCode;
    if (!code) {
      const prefix = `KZ-PRD-${product.createdAt.getFullYear()}-`;
      const n = (await prisma.product.count({ where: { productCode: { startsWith: prefix } } })) + 1;
      code = `${prefix}${String(n).padStart(3, '0')}`;
      await prisma.product.update({ where: { id: product.id }, data: { productCode: code } });
    }
    const hasVariant = (await prisma.productVariant.count({ where: { productId: product.id } })) > 0;
    if (hasVariant) continue;

    // Un SKU par format emballé quand l'emballage détaille ses unités.
    const sizes = new Map<number, number>();
    for (const unit of product.packaging?.units ?? []) {
      const grams = gramsOf(unit.unitSize);
      if (grams) sizes.set(grams, (sizes.get(grams) ?? 0) + unit.quantity);
    }
    if (sizes.size === 0) sizes.set(product.netWeightG ?? 500, product.stock);

    let first = true;
    for (const [grams, stock] of [...sizes.entries()].sort((a, b) => a[0] - b[0])) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `${code}-${grams}G`,
          packageSize: grams >= 1000 && grams % 1000 === 0 ? `${grams / 1000} kg` : `${grams} g`,
          netWeightG: grams,
          price: product.prix,
          stock,
          isDefault: first,
        },
      });
      first = false;
    }
  }

  // 4) Pièces obligatoires des producteurs de démonstration.
  await seedDemoProducerDocuments(prisma);

  // 5) Lignes de commande rattachées au SKU par défaut.
  const items = await prisma.orderItem.findMany({ where: { variantId: null }, select: { id: true, productId: true } });
  for (const item of items) {
    const variant = await prisma.productVariant.findFirst({ where: { productId: item.productId, isDefault: true } });
    if (variant) await prisma.orderItem.update({ where: { id: item.id }, data: { variantId: variant.id, sku: variant.sku } });
  }
}

function gramsOf(size: string): number | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(kg|g)\s*$/i.exec(size);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Math.round(match[2].toLowerCase() === 'kg' ? value * 1000 : value);
}

async function seedDemoProducerDocuments(prisma: PrismaClient) {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@kounouzalafiya.com' } });
  const dir = join(process.cwd(), 'private-uploads', 'documents');
  mkdirSync(dir, { recursive: true });

  for (const email of DEMO_PRODUCER_EMAILS) {
    const producer = await prisma.producer.findFirst({ where: { user: { email } } });
    if (!producer) continue;
    for (const type of [ProducerDocumentType.NATIONAL_ID, ProducerDocumentType.FARM_REGISTRATION]) {
      const exists = await prisma.producerDocument.count({ where: { producerId: producer.id, type } });
      if (exists > 0) continue;
      const storedName = `demo-${producer.id}-${type.toLowerCase()}.pdf`;
      const path = join(dir, storedName);
      if (!existsSync(path)) writeFileSync(path, DEMO_PDF);
      await prisma.producerDocument.create({
        data: {
          producerId: producer.id,
          type,
          fileName: type === ProducerDocumentType.NATIONAL_ID ? 'cin-demo.pdf' : 'registre-exploitation-demo.pdf',
          storedName,
          mimeType: 'application/pdf',
          size: Buffer.byteLength(DEMO_PDF),
          status: ProducerDocumentStatus.VERIFIED,
          reviewedById: admin?.id ?? null,
          reviewedAt: new Date(),
          reviewNote: 'Document de démonstration.',
        },
      });
    }
  }
}
