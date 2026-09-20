import { PrismaClient } from '@prisma/client';
import { seedPhase1Compliance } from './seed-phase1-compliance.js';

/**
 * Remet une base existante en conformité avec le modèle Phase 1 (ruchers,
 * codes produit, SKU) sans rejouer tout le seed. Idempotent.
 *
 *   npx tsx prisma/run-phase1-compliance.ts
 */
const prisma = new PrismaClient();
await seedPhase1Compliance(prisma);
console.log(
  `Conformité Phase 1 : ${await prisma.farm.count()} rucher(s), ${await prisma.productVariant.count()} SKU.`,
);
await prisma.$disconnect();
