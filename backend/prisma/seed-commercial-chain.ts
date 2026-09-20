import {
  BatchStatus,
  PackagingStatus,
  PrismaClient,
  ProductStatus,
  QrCodeStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

// Jeu de données de la chaîne commerciale : lots vérifiés, conditionnement,
// produits et QR unitaires. Il alimente les écrans B01 à B04 et Q01/Q02.

const PACKAGE_TYPES = ['Pot en verre', 'Pot en verre', 'Bocal premium'];
const UNIT_SIZES = ['500 g', '250 g', '1 kg'];

/** Répartition des lots entre les états du cycle de vie (§13). */
const STATUS_PLAN: { status: BatchStatus; count: number }[] = [
  { status: BatchStatus.READY_FOR_PACKAGING, count: 14 },
  { status: BatchStatus.IN_PACKAGING, count: 4 },
  { status: BatchStatus.PACKAGED, count: 2 },
  { status: BatchStatus.CONVERTED_TO_PRODUCT, count: 2 },
  { status: BatchStatus.PUBLISHED, count: 3 },
  { status: BatchStatus.SUSPENDED, count: 1 },
];

export async function seedCommercialChain(prisma: PrismaClient): Promise<void> {
  console.log('Chaîne commerciale — lots vérifiés...');

  const [verifTeam, categorie] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'VERIFICATION_TEAM' } }),
    prisma.categorie.findFirst({ where: { actif: true } }),
  ]);
  if (!verifTeam || !categorie) {
    throw new Error('Seed chaîne commerciale : utilisateur ou catégorie manquants.');
  }

  const eligible = await prisma.verification.findMany({
    where: { status: 'VERIFIED', isDraft: false, batch: null },
    include: { request: { include: { producer: true } } },
    orderBy: { verifiedAt: 'asc' },
  });

  const existingBatches = await prisma.batch.count();
  let index = existingBatches;
  let cursor = 0;

  const created: { id: string; status: BatchStatus; honeyType: string }[] = [];

  for (const row of STATUS_PLAN) {
    for (let i = 0; i < row.count; i++) {
      const verification = eligible[cursor++];
      if (!verification) break;
      index += 1;

      const productionDate = new Date(
        (verification.verifiedAt ?? verification.createdAt).getTime() + 2 * 86400000,
      );
      // Le miel se conserve deux ans : date de péremption cohérente avec la
      // durée de vie annoncée sur l'étiquette.
      const expiryDate = new Date(productionDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 2);

      const batch = await prisma.batch.create({
        data: {
          batchCode: `KZ-BAT-2026-${String(index).padStart(3, '0')}`,
          verificationId: verification.id,
          honeyType: verification.request.honeyType,
          quantityKg: 100 + ((index * 37) % 400),
          productionDate,
          expiryDate,
          bestBefore: expiryDate,
          origin: verification.request.governorate
            ? `${verification.request.governorate}, Tunisie`
            : 'Tunisie',
          harvestSeason: verification.request.productionSeason ?? 'Printemps 2026',
          status: row.status,
          holdReason:
            row.status === BatchStatus.SUSPENDED
              ? 'Contrôle qualité complémentaire demandé sur un pot témoin.'
              : null,
          createdAt: productionDate,
        },
      });
      created.push({ id: batch.id, status: row.status, honeyType: batch.honeyType });
    }
  }

  console.log(`Chaîne commerciale — ${created.length} lots créés.`);

  // --- Conditionnement -----------------------------------------------------

  const needPackaging = created.filter((b) =>
    ([
      BatchStatus.IN_PACKAGING,
      BatchStatus.PACKAGED,
      BatchStatus.CONVERTED_TO_PRODUCT,
      BatchStatus.PUBLISHED,
      BatchStatus.SUSPENDED,
    ] as BatchStatus[]).includes(b.status),
  );

  let unitIndex = 0;
  for (const [position, batch] of needPackaging.entries()) {
    const full = await prisma.batch.findUnique({ where: { id: batch.id } });
    if (!full) continue;

    // Un lot en cours de conditionnement n'a pas encore terminé ses unités ;
    // au-delà, tout est conditionné.
    const finished = batch.status !== BatchStatus.IN_PACKAGING;
    const packagingDate = new Date(full.productionDate.getTime() + 3 * 86400000);

    const packaging = await prisma.packaging.create({
      data: {
        batchId: batch.id,
        packageType: PACKAGE_TYPES[position % PACKAGE_TYPES.length],
        size: '500 g',
        packagingLine: 'Kounouz Standard',
        unitsPlanned: 1000,
        productionDate: packagingDate,
        expiryDate: full.expiryDate,
        status: finished ? PackagingStatus.COMPLETED : PackagingStatus.IN_PROGRESS,
        createdAt: packagingDate,
      },
    });

    const unitPlan = finished
      ? [
          { size: UNIT_SIZES[0], qty: 1000, status: PackagingStatus.COMPLETED },
          { size: UNIT_SIZES[1], qty: 800, status: PackagingStatus.COMPLETED },
        ]
      : [
          { size: UNIT_SIZES[0], qty: 1000, status: PackagingStatus.COMPLETED },
          { size: UNIT_SIZES[1], qty: 800, status: PackagingStatus.IN_PROGRESS },
          { size: UNIT_SIZES[2], qty: 300, status: PackagingStatus.PLANNED },
        ];

    for (const unit of unitPlan) {
      unitIndex += 1;
      await prisma.packagingUnit.create({
        data: {
          packagingId: packaging.id,
          unitCode: `KZ-PKG-2026-${String(unitIndex).padStart(3, '0')}`,
          unitSize: unit.size,
          quantity: unit.qty,
          packagingDate: unit.status === PackagingStatus.PLANNED ? null : packagingDate,
          expiryDate: unit.status === PackagingStatus.PLANNED ? null : full.expiryDate,
          status: unit.status,
        },
      });
    }
  }

  // --- Produits et QR ------------------------------------------------------

  console.log('Chaîne commerciale — produits et QR unitaires...');

  const withProduct = created.filter((b) =>
    ([BatchStatus.CONVERTED_TO_PRODUCT, BatchStatus.PUBLISHED] as BatchStatus[]).includes(b.status),
  );

  let qrIndex = 0;
  for (const [position, batch] of withProduct.entries()) {
    const full = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: { packaging: true },
    });
    if (!full?.packaging) continue;

    const published = batch.status === BatchStatus.PUBLISHED;
    const product = await prisma.product.create({
      data: {
        batchId: batch.id,
        packagingId: full.packaging.id,
        categorieId: categorie.id,
        nom: `Kounouz ${batch.honeyType}`,
        description: `${batch.honeyType} 100 % naturel, récolté en ${full.harvestSeason ?? '2026'} à ${full.origin ?? 'Tunisie'}.`,
        prix: 28 + ((position * 7) % 25),
        stock: 1000,
        images: [],
        netWeightG: 500,
        ingredients: '100 % miel pur',
        storageInstructions: 'À conserver au frais et au sec',
        shelfLife: '2 ans',
        tags: [batch.honeyType, 'Miel tunisien', 'Naturel'],
        statut: published ? ProductStatus.PUBLIE : ProductStatus.BROUILLON,
        createdAt: full.packaging.productionDate,
      },
    });

    // Campagne de génération : un code par pot du format principal.
    const quantity = 200;
    const generation = await prisma.qrGeneration.create({
      data: {
        batchId: batch.id,
        productId: product.id,
        quantity,
        qrType: 'PRODUCT_VERIFICATION',
        qrFormat: 'DYNAMIC',
        destinationUrl: 'http://localhost:5173/verify',
        language: 'MULTI',
        template: 'KOUNOUZ_STANDARD',
        options: {
          includeBatchNumber: true,
          includeSecurityFeatures: true,
          addSerialNumber: true,
          enableTracking: true,
        },
        createdById: verifTeam.id,
        createdAt: full.packaging.productionDate,
      },
    });

    const packagingDate = full.packaging.productionDate;
    const batchSequence = full.batchCode.slice(-3);
    const rows = Array.from({ length: quantity }, (_, i) => {
      qrIndex += 1;
      const serialNumber = `KZ-QR-2026-${batchSequence}${String(i + 1).padStart(3, '0')}`;
      // Quelques codes sont désactivés : planches d'étiquettes gâchées à
      // l'impression, retirées avant la pose.
      const deactivated = i >= quantity - 2;
      return {
        productId: product.id,
        batchId: batch.id,
        generationId: generation.id,
        qrCode: serialNumber,
        serialNumber,
        qrId: randomUUID(),
        status: deactivated ? QrCodeStatus.DEACTIVATED : QrCodeStatus.ACTIVE,
        isActive: !deactivated,
        createdAt: packagingDate,
      };
    });
    await prisma.qRCode.createMany({ data: rows, skipDuplicates: true });

    // Quelques scans consommateurs, pour que l'écran Q02 ne soit pas vide.
    if (published) {
      const scanned = await prisma.qRCode.findMany({
        where: { generationId: generation.id, status: QrCodeStatus.ACTIVE },
        select: { id: true },
        take: 4,
      });
      await prisma.qRScan.createMany({
        data: scanned.flatMap((qr, i) =>
          Array.from({ length: (i % 3) + 1 }, (_, n) => ({
            qrCodeId: qr.id,
            scannedAt: new Date(Date.now() - (i * 12 + n) * 3600000),
            country: 'Tunisie',
            location: ['Tunis', 'Sfax', 'Sousse'][i % 3],
            deviceInfo: 'Mozilla/5.0 (Android)',
          })),
        ),
      });
    }
  }

  console.log(`Chaîne commerciale — ${qrIndex} QR unitaires générés.`);
}
