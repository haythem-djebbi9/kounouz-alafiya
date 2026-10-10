// Ajoute à une base de production les 4 miels du catalogue de départ, chacun
// avec sa chaîne de traçabilité complète (producteur, demande, échantillon
// scellé, analyse, vérification, lot, conditionnement, produit, formats, QR).
//
//   docker compose exec backend node prisma/ajouter-catalogue-initial.mjs
//
// À lancer après create-admin.mjs : les étapes internes (prélèvement, décision,
// génération des QR) sont attribuées au premier administrateur. Relancer le
// script ne crée pas de doublon : un produit déjà présent (même nom) est ignoré.
// Les comptes producteurs reçoivent un mot de passe aléatoire non communiqué :
// ils ne servent qu'à rattacher les lots à leur rucher.
//
// Script en JavaScript pur : l'image de production ne contient ni tsx ni les
// sources TypeScript, seulement @prisma/client et bcrypt.
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
const QR_PER_PRODUCT = 50;

const PRODUCERS = {
  benSalah: {
    email: 'rucher.bensalah@producteurs.kounouzalafia.io',
    name: 'Ahmed Ben Salah',
    farmName: 'Rucher Ben Salah',
    location: 'Le Kef, Tunisie',
    governorate: 'Le Kef',
  },
  trabelsi: {
    email: 'rucher.zaghouan@producteurs.kounouzalafia.io',
    name: 'Fatma Trabelsi',
    farmName: 'Rucher de Zaghouan',
    location: 'Zaghouan, Tunisie',
    governorate: 'Zaghouan',
  },
};

const LABORATORY = {
  name: 'Laboratoire National de Contrôle des Produits Apicoles',
  accreditationNo: 'ISO17025-TN-0456',
  country: 'Tunisie',
  contactInfo: 'contact@lnc-apicole.tn',
};

// Indicateurs publiés : clé, unité, bornes de référence (Codex Alimentarius).
const PARAMS = [
  { key: 'humidite_pct', unit: '%', max: 20 },
  { key: 'hmf_mg_kg', unit: 'mg/kg', max: 40 },
  { key: 'sucres_reducteurs_pct', unit: 'g/100 g', min: 60 },
  { key: 'proline_mg_kg', unit: 'mg/kg', min: 180 },
  { key: 'pesticides', text: 'NOT_DETECTED' },
  { key: 'antibiotiques', text: 'NOT_DETECTED' },
];

const HONEYS = [
  {
    code: 'SED',
    producer: 'benSalah',
    category: 'sedra',
    honeyType: 'Miel de Jujubier (Sedra)',
    nom: 'Miel de Sedra Premium 500g',
    gamme: 'Premium',
    description:
      "Miel rare de jujubier, récolté à la main dans les montagnes du Kef. Traçabilité complète du rucher jusqu'à votre table.",
    images: ['/images/sedre.webp', '/images/beekeeper.webp'],
    season: 'Automne 2025',
    pollen: 'Ziziphus lotus',
    results: { humidite_pct: 16.2, hmf_mg_kg: 8, sucres_reducteurs_pct: 78.4, proline_mg_kg: 320 },
    variants: [{ size: '500 g', grams: 500, price: 89.9, stock: 120 }],
  },
  {
    code: 'ROM',
    producer: 'trabelsi',
    category: 'miels',
    honeyType: 'Miel de Romarin',
    nom: 'Kounouz Miel de Romarin',
    description: 'Miel de Romarin 100 % naturel, récolté au printemps 2026 sur les hauteurs de Zaghouan.',
    images: [],
    season: 'Printemps 2026',
    pollen: 'Rosmarinus officinalis',
    results: { humidite_pct: 17.1, hmf_mg_kg: 11, sucres_reducteurs_pct: 74.6, proline_mg_kg: 265 },
    variants: [
      { size: '250 g', grams: 250, price: 31, stock: 800 },
      { size: '500 g', grams: 500, price: 58.9, stock: 1000 },
    ],
  },
  {
    code: 'AGR',
    producer: 'benSalah',
    category: 'miels',
    honeyType: 'Miel d’Agrumes',
    nom: 'Kounouz Miel d’Agrumes',
    description: 'Miel d’Agrumes 100 % naturel, récolté au printemps 2026 dans les vergers de la région du Kef.',
    images: [],
    season: 'Printemps 2026',
    pollen: 'Citrus spp.',
    results: { humidite_pct: 17.4, hmf_mg_kg: 13, sucres_reducteurs_pct: 75.2, proline_mg_kg: 230 },
    variants: [
      { size: '250 g', grams: 250, price: 49, stock: 800 },
      { size: '500 g', grams: 500, price: 93, stock: 1000 },
    ],
  },
  {
    code: 'FLS',
    producer: 'trabelsi',
    category: 'miels',
    honeyType: 'Miel de Fleurs Sauvages',
    nom: 'Kounouz Miel de Fleurs Sauvages',
    description: 'Miel de Fleurs Sauvages 100 % naturel, récolté au printemps 2026 sur les hauteurs de Zaghouan.',
    images: [],
    season: 'Printemps 2026',
    pollen: 'Polyfloral',
    results: { humidite_pct: 17.8, hmf_mg_kg: 12, sucres_reducteurs_pct: 74.2, proline_mg_kg: 280 },
    variants: [
      { size: '250 g', grams: 250, price: 42, stock: 800 },
      { size: '500 g', grams: 500, price: 80, stock: 1000 },
    ],
  },
];

const prisma = new PrismaClient();
const day = (offset) => new Date(Date.UTC(2026, 8, 1) + offset * 86400000);

async function ensureCategories() {
  const miels = await prisma.categorie.upsert({
    where: { slug: 'miels' },
    update: {},
    create: { nom: 'Miels', slug: 'miels', ordre: 1, description: 'Nos miels certifiés et tracés.' },
  });
  const sedra = await prisma.categorie.upsert({
    where: { slug: 'miel-sedra' },
    update: {},
    create: {
      nom: 'Miel de Jujubier (Sedra)',
      slug: 'miel-sedra',
      ordre: 1,
      parentId: miels.id,
      description: 'Miel rare récolté sur les jujubiers sauvages.',
    },
  });
  return { miels, sedra };
}

async function ensureLaboratory() {
  const existing = await prisma.laboratory.findFirst({ where: { accreditationNo: LABORATORY.accreditationNo } });
  if (existing) return existing;
  return prisma.laboratory.create({ data: { ...LABORATORY, status: 'ACTIVE' } });
}

async function ensureProducer(db, key) {
  const p = PRODUCERS[key];
  const existing = await db.user.findUnique({ where: { email: p.email }, include: { producer: true } });
  if (existing?.producer) return existing.producer;
  const passwordHash = await bcrypt.hash(randomBytes(24).toString('base64url'), 10);
  const user = await db.user.create({
    data: {
      name: p.name,
      email: p.email,
      passwordHash,
      role: 'PRODUCER',
      producer: {
        create: {
          name: p.name,
          farmName: p.farmName,
          location: p.location,
          governorate: p.governorate,
          status: 'ACTIVE',
        },
      },
    },
    include: { producer: true },
  });
  return user.producer;
}

function testResult(param, honey, position) {
  if (param.text) {
    return {
      parameterKey: param.key,
      value: null,
      unit: null,
      referenceText: param.text,
      status: 'NOT_DETECTED',
      position,
    };
  }
  const value = honey.results[param.key];
  const ok = (param.max === undefined || value <= param.max) && (param.min === undefined || value >= param.min);
  return {
    parameterKey: param.key,
    value: String(value),
    unit: param.unit,
    referenceMin: param.min ?? null,
    referenceMax: param.max ?? null,
    status: ok ? 'WITHIN_RANGE' : 'OUT_OF_RANGE',
    position,
  };
}

async function createChain(db, honey, index, ctx) {
  const producer = await ensureProducer(db, honey.producer);
  const p = PRODUCERS[honey.producer];
  const seq = String(index + 1).padStart(3, '0');
  const t0 = index * 3;

  const request = await db.verificationRequest.create({
    data: {
      producerId: producer.id,
      honeyType: honey.honeyType,
      description: `Récolte ${honey.season}, ${p.farmName}.`,
      collectionLocation: p.location,
      governorate: p.governorate,
      productionSeason: honey.season,
      quantity: 100,
      status: 'VERIFIED',
      createdAt: day(t0),
    },
  });

  const sample = await db.sample.create({
    data: {
      requestId: request.id,
      sampleCode: `KZ-SPL-2026-${seq}`,
      collectedById: ctx.admin.id,
      collectionDate: day(t0 + 1),
      location: p.farmName,
      quantity: 0.5,
      status: 'ANALYZED',
    },
  });

  await db.seal.create({
    data: { sampleId: sample.id, sealCode: `KZ-SEAL-2026-${seq}`, isSealed: true, sealedAt: day(t0 + 1), status: 'INTACT' },
  });

  const analysis = await db.laboratoryAnalysis.create({
    data: {
      sampleId: sample.id,
      labId: ctx.laboratory.id,
      analysisCode: `KZ-ANA-2026-${seq}`,
      analysisDate: day(t0 + 5),
      results: { ...honey.results, pollen_dominant: honey.pollen, pesticides: 'non détectés', antibiotiques: 'non détectés' },
      status: 'COMPLIANT',
      workflowStatus: 'REVIEWED',
      testResults: { create: PARAMS.map((param, i) => testResult(param, honey, i)) },
    },
  });

  await db.referenceSample.create({
    data: {
      sampleId: sample.id,
      referenceCode: `KZ-REF-2026-${seq}`,
      storageLocation: 'Chambre froide Kounouz — Tunis',
      storedAt: day(t0 + 6),
      storageConditions: "4 °C, à l'abri de la lumière",
      retentionPeriod: '24 mois',
    },
  });

  const verification = await db.verification.create({
    data: {
      requestId: request.id,
      sampleId: sample.id,
      analysisId: analysis.id,
      status: 'VERIFIED',
      verifiedAt: day(t0 + 7),
      notes: 'Conforme aux critères du Codex Alimentarius.',
      decidedById: ctx.admin.id,
    },
  });

  const productionDate = day(t0 + 9);
  const bestBefore = new Date(productionDate);
  bestBefore.setUTCFullYear(bestBefore.getUTCFullYear() + 2);

  const batch = await db.batch.create({
    data: {
      verificationId: verification.id,
      batchCode: `KZ-BAT-2026-${seq}`,
      honeyType: honey.honeyType,
      quantityKg: 100,
      productionDate,
      expiryDate: bestBefore,
      bestBefore,
      origin: p.location,
      harvestSeason: honey.season,
      status: 'PUBLISHED',
    },
  });

  const packagingDate = day(t0 + 11);
  const packaging = await db.packaging.create({
    data: {
      batchId: batch.id,
      packageType: 'Pot en verre',
      size: honey.variants[0].size,
      packagingLine: 'Kounouz Standard',
      unitsPlanned: honey.variants.reduce((sum, v) => sum + v.stock, 0),
      productionDate: packagingDate,
      expiryDate: bestBefore,
      status: 'COMPLETED',
      units: {
        create: honey.variants.map((v, i) => ({
          unitCode: `KZ-PKG-2026-${seq}${i + 1}`,
          unitSize: v.size,
          quantity: v.stock,
          packagingDate,
          expiryDate: bestBefore,
          status: 'COMPLETED',
        })),
      },
    },
  });

  const main = honey.variants[0];
  const product = await db.product.create({
    data: {
      batchId: batch.id,
      packagingId: packaging.id,
      categorieId: honey.category === 'sedra' ? ctx.categories.sedra.id : ctx.categories.miels.id,
      nom: honey.nom,
      description: honey.description,
      prix: main.price,
      stock: honey.variants.reduce((sum, v) => sum + v.stock, 0),
      images: honey.images,
      gamme: honey.gamme ?? null,
      netWeightG: main.grams,
      ingredients: '100 % miel pur',
      storageInstructions: "À conserver à température ambiante, à l'abri de la lumière et de l'humidité",
      shelfLife: '2 ans',
      tags: [honey.honeyType, 'Miel tunisien', 'Naturel'],
      statut: 'PUBLIE',
      variants: {
        create: honey.variants.map((v, i) => ({
          sku: `KZ-${honey.code}-${v.grams}`,
          packageSize: v.size,
          netWeightG: v.grams,
          price: v.price,
          stock: v.stock,
          isDefault: i === 0,
        })),
      },
    },
  });

  const generation = await db.qrGeneration.create({
    data: {
      batchId: batch.id,
      productId: product.id,
      quantity: QR_PER_PRODUCT,
      qrType: 'PRODUCT_VERIFICATION',
      qrFormat: 'DYNAMIC',
      destinationUrl: `${PUBLIC_APP_URL}/verify`,
      language: 'MULTI',
      template: 'KOUNOUZ_STANDARD',
      options: { includeBatchNumber: true, includeSecurityFeatures: true, addSerialNumber: true, enableTracking: true },
      createdById: ctx.admin.id,
    },
  });

  await db.qRCode.createMany({
    data: Array.from({ length: QR_PER_PRODUCT }, (_, i) => {
      const serialNumber = `KZ-QR-2026-${seq}${String(i + 1).padStart(3, '0')}`;
      return {
        productId: product.id,
        batchId: batch.id,
        generationId: generation.id,
        qrCode: serialNumber,
        serialNumber,
        qrId: randomUUID(),
        status: 'ACTIVE',
        isActive: true,
      };
    }),
  });

  return product;
}

try {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (!admin) {
    console.error("Aucun administrateur : lancez d'abord prisma/create-admin.mjs.");
    process.exit(1);
  }
  const ctx = { admin, categories: await ensureCategories(), laboratory: await ensureLaboratory() };

  for (const [index, honey] of HONEYS.entries()) {
    const existing = await prisma.product.findFirst({ where: { nom: honey.nom } });
    if (existing) {
      console.log(`Déjà présent : ${honey.nom}`);
      continue;
    }
    // Une chaîne par transaction : un échec ne laisse pas de demi-produit.
    const product = await prisma.$transaction((tx) => createChain(tx, honey, index, ctx), { timeout: 60_000 });
    console.log(`Ajouté : ${product.nom}`);
  }
  console.log('Catalogue de départ en place.');
} finally {
  await prisma.$disconnect();
}
