import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Nettoyage de la base...');
  // Ordre inverse des dépendances.
  await prisma.qRScan.deleteMany();
  await prisma.qRCode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categorie.deleteMany();
  await prisma.packaging.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.referenceSample.deleteMany();
  await prisma.laboratoryAnalysis.deleteMany();
  await prisma.laboratory.deleteMany();
  await prisma.seal.deleteMany();
  await prisma.sample.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.producer.deleteMany();
  await prisma.consumer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('Création des utilisateurs...');
  const admin = await prisma.user.create({
    data: {
      name: 'Amine Kounouz',
      email: 'admin@kounouzalafiya.com',
      passwordHash: await hash('Admin123!'),
      role: 'ADMIN',
    },
  });

  const verifTeamUser = await prisma.user.create({
    data: {
      name: 'Sonia Verif',
      email: 'verification@kounouzalafiya.com',
      passwordHash: await hash('Verif123!'),
      role: 'VERIFICATION_TEAM',
    },
  });

  const fieldAgentUser = await prisma.user.create({
    data: {
      name: 'Walid Terrain',
      email: 'agent@kounouzalafiya.com',
      passwordHash: await hash('Agent123!'),
      role: 'FIELD_AGENT',
    },
  });

  const producerUser1 = await prisma.user.create({
    data: {
      name: 'Ahmed Ben Salah',
      email: 'producteur@kounouzalafiya.com',
      passwordHash: await hash('Prod123!'),
      role: 'PRODUCER',
    },
  });

  const producerUser2 = await prisma.user.create({
    data: {
      name: 'Fatma Trabelsi',
      email: 'fatma.trabelsi@kounouzalafiya.com',
      passwordHash: await hash('Prod123!'),
      role: 'PRODUCER',
    },
  });

  const consumerUser = await prisma.user.create({
    data: {
      name: 'Client Démo',
      email: 'client@kounouzalafiya.com',
      passwordHash: await hash('Client123!'),
      role: 'CONSUMER',
    },
  });

  console.log('Création des profils producteur / consommateur...');
  const producer1 = await prisma.producer.create({
    data: {
      userId: producerUser1.id,
      name: 'Ahmed Ben Salah',
      farmName: 'Rucher Ben Salah',
      location: 'Le Kef, Tunisie',
      description: "Apiculteur depuis 3 générations, spécialisé dans le miel de jujubier (sedra) des montagnes du Kef.",
      isVerified: true,
    },
  });

  const producer2 = await prisma.producer.create({
    data: {
      userId: producerUser2.id,
      name: 'Fatma Trabelsi',
      farmName: 'Rucher de Zaghouan',
      location: 'Zaghouan, Tunisie',
      description: 'Petite exploitation familiale produisant du miel de fleurs sauvages en altitude.',
      isVerified: true,
    },
  });

  await prisma.consumer.create({
    data: {
      userId: consumerUser.id,
      name: 'Client Démo',
      country: 'Tunisie',
    },
  });

  console.log('Création du laboratoire...');
  const laboratory = await prisma.laboratory.create({
    data: {
      name: 'Laboratoire National de Contrôle des Produits Apicoles',
      accreditationNo: 'ISO17025-TN-0456',
      country: 'Tunisie',
      contactInfo: 'contact@lnc-apicole.tn / +216 71 000 000',
    },
  });

  console.log('Création des catégories...');
  const catMiel = await prisma.categorie.create({
    data: { nom: 'Miels', slug: 'miels', ordre: 1, description: 'Nos miels certifiés et tracés.' },
  });
  const catSedra = await prisma.categorie.create({
    data: {
      nom: 'Miel de Jujubier (Sedra)',
      slug: 'miel-sedra',
      ordre: 1,
      parentId: catMiel.id,
      description: 'Miel rare récolté sur les jujubiers sauvages.',
    },
  });
  const catFleurs = await prisma.categorie.create({
    data: {
      nom: 'Miel de Fleurs',
      slug: 'miel-fleurs',
      ordre: 2,
      parentId: catMiel.id,
      description: 'Miel polyfloral de printemps.',
    },
  });
  await prisma.categorie.create({
    data: { nom: 'Produits de la Ruche', slug: 'produits-ruche', ordre: 2, description: 'Propolis, gelée royale, pollen.' },
  });

  // ---------------------------------------------------------------------
  // Chaîne complète n°1 : VÉRIFIÉ — Miel de Sedra (Ben Salah)
  // ---------------------------------------------------------------------
  console.log('Création de la chaîne complète — exemple VÉRIFIÉ...');

  const request1 = await prisma.verificationRequest.create({
    data: {
      producerId: producer1.id,
      honeyType: 'Miel de Jujubier (Sedra)',
      description: 'Récolte de la saison automnale, ruchers en altitude.',
      collectionLocation: 'Le Kef, Tunisie',
      quantity: 50,
      status: 'ACCEPTED',
    },
  });

  const sample1 = await prisma.sample.create({
    data: {
      requestId: request1.id,
      collectedById: fieldAgentUser.id,
      collectionDate: new Date('2026-08-10T09:00:00Z'),
      location: 'Rucher Ben Salah, Le Kef',
      quantity: 0.5,
      photos: [],
      status: 'ANALYZED',
    },
  });

  await prisma.seal.create({
    data: {
      sampleId: sample1.id,
      sealCode: 'KZ-SEAL-000001',
      isSealed: true,
      sealedAt: new Date('2026-08-10T09:15:00Z'),
      status: 'INTACT',
    },
  });

  const analysis1 = await prisma.laboratoryAnalysis.create({
    data: {
      sampleId: sample1.id,
      labId: laboratory.id,
      analysisDate: new Date('2026-08-15T00:00:00Z'),
      reportFileUrl: null,
      results: {
        humidite_pct: 16.2,
        ph: 3.9,
        hmf_mg_kg: 8,
        sucres_reducteurs_pct: 78.4,
        proline_mg_kg: 320,
        pollen_dominant: 'Ziziphus lotus',
        pesticides: 'non détectés',
        antibiotiques: 'non détectés',
      },
      status: 'COMPLIANT',
    },
  });

  await prisma.referenceSample.create({
    data: {
      sampleId: sample1.id,
      referenceCode: 'KZ-REF-000001',
      storageLocation: 'Chambre froide Kounouz — Tunis',
      storedAt: new Date('2026-08-16T00:00:00Z'),
      storageConditions: '4°C, à l\'abri de la lumière',
      retentionPeriod: '24 mois',
    },
  });

  const verification1 = await prisma.verification.create({
    data: {
      requestId: request1.id,
      sampleId: sample1.id,
      analysisId: analysis1.id,
      status: 'VERIFIED',
      verifiedAt: new Date('2026-08-17T00:00:00Z'),
      notes: 'Conforme aux normes Codex Alimentarius. Miel authentique, aucune adultération détectée.',
      decidedById: verifTeamUser.id,
    },
  });

  const batch1 = await prisma.batch.create({
    data: {
      verificationId: verification1.id,
      batchCode: 'KZ-BAT-0001',
      honeyType: 'Miel de Jujubier (Sedra)',
      quantityKg: 48,
      productionDate: new Date('2026-08-20T00:00:00Z'),
      status: 'READY',
    },
  });

  const packaging1 = await prisma.packaging.create({
    data: {
      batchId: batch1.id,
      packageType: 'Pot en verre',
      size: '500g',
      labelDesign: 'Étiquette Kounouz Alafiya — hexagone doré',
      productionDate: new Date('2026-08-22T00:00:00Z'),
      status: 'COMPLETED',
    },
  });

  const product1 = await prisma.product.create({
    data: {
      packagingId: packaging1.id,
      categorieId: catSedra.id,
      batchId: batch1.id,
      nom: 'Miel de Sedra Premium 500g',
      description:
        "Miel rare de jujubier, récolté à la main dans les montagnes du Kef. Traçabilité complète du rucher jusqu'à votre table.",
      prix: 89.9,
      stock: 120,
      images: ['/images/sedre.png', '/images/beekeeper.jpg'],
      gamme: 'Premium',
      statut: 'PUBLIE',
    },
  });

  const qrCode1 = await prisma.qRCode.create({
    data: {
      productId: product1.id,
      qrCode: 'KZ-QR-2026-000001',
      qrId: 'a1b2c3d4-0001-4000-8000-000000000001',
      isActive: true,
    },
  });

  await prisma.qRScan.createMany({
    data: [
      {
        qrCodeId: qrCode1.id,
        scannedAt: new Date('2026-09-01T10:00:00Z'),
        location: 'Tunis, Tunisie',
        deviceInfo: 'iPhone 15 / Safari',
        country: 'Tunisie',
        riskScore: 0.1,
        flagged: false,
      },
      {
        qrCodeId: qrCode1.id,
        scannedAt: new Date('2026-09-05T14:30:00Z'),
        location: 'Sfax, Tunisie',
        deviceInfo: 'Samsung Galaxy S23 / Chrome',
        country: 'Tunisie',
        riskScore: 0.05,
        flagged: false,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Chaîne complète n°2 : SUSPENDU — Miel de Fleurs (Trabelsi)
  // Vérifié à l'origine, puis suspendu suite à une activité de scan suspecte.
  // ---------------------------------------------------------------------
  console.log('Création de la chaîne complète — exemple SUSPENDU...');

  const request2 = await prisma.verificationRequest.create({
    data: {
      producerId: producer2.id,
      honeyType: 'Miel de Fleurs',
      description: 'Récolte de printemps, altitude de Zaghouan.',
      collectionLocation: 'Zaghouan, Tunisie',
      quantity: 30,
      status: 'ACCEPTED',
    },
  });

  const sample2 = await prisma.sample.create({
    data: {
      requestId: request2.id,
      collectedById: fieldAgentUser.id,
      collectionDate: new Date('2026-07-05T09:00:00Z'),
      location: 'Rucher de Zaghouan',
      quantity: 0.5,
      photos: [],
      status: 'ANALYZED',
    },
  });

  await prisma.seal.create({
    data: {
      sampleId: sample2.id,
      sealCode: 'KZ-SEAL-000002',
      isSealed: true,
      sealedAt: new Date('2026-07-05T09:20:00Z'),
      status: 'INTACT',
    },
  });

  const analysis2 = await prisma.laboratoryAnalysis.create({
    data: {
      sampleId: sample2.id,
      labId: laboratory.id,
      analysisDate: new Date('2026-07-10T00:00:00Z'),
      reportFileUrl: null,
      results: {
        humidite_pct: 17.8,
        ph: 4.1,
        hmf_mg_kg: 12,
        sucres_reducteurs_pct: 74.2,
        proline_mg_kg: 280,
        pollen_dominant: 'Polyfloral',
        pesticides: 'non détectés',
        antibiotiques: 'non détectés',
      },
      status: 'COMPLIANT',
    },
  });

  await prisma.referenceSample.create({
    data: {
      sampleId: sample2.id,
      referenceCode: 'KZ-REF-000002',
      storageLocation: 'Chambre froide Kounouz — Tunis',
      storedAt: new Date('2026-07-11T00:00:00Z'),
      storageConditions: "4°C, à l'abri de la lumière",
      retentionPeriod: '24 mois',
    },
  });

  const verification2 = await prisma.verification.create({
    data: {
      requestId: request2.id,
      sampleId: sample2.id,
      analysisId: analysis2.id,
      status: 'VERIFIED',
      verifiedAt: new Date('2026-07-12T00:00:00Z'),
      notes: 'Conforme lors de la vérification initiale.',
      decidedById: verifTeamUser.id,
    },
  });

  const batch2 = await prisma.batch.create({
    data: {
      verificationId: verification2.id,
      batchCode: 'KZ-BAT-0002',
      honeyType: 'Miel de Fleurs',
      quantityKg: 28,
      productionDate: new Date('2026-07-15T00:00:00Z'),
      status: 'READY',
    },
  });

  const packaging2 = await prisma.packaging.create({
    data: {
      batchId: batch2.id,
      packageType: 'Pot en verre',
      size: '250g',
      labelDesign: 'Étiquette Kounouz Alafiya — hexagone doré',
      productionDate: new Date('2026-07-17T00:00:00Z'),
      status: 'COMPLETED',
    },
  });

  // Statut SUSPENDU : le produit reste visible mais suspendu, suite à une
  // activité de scan suspecte détectée par le système anti-contrefaçon.
  const product2 = await prisma.product.create({
    data: {
      packagingId: packaging2.id,
      categorieId: catFleurs.id,
      batchId: batch2.id,
      nom: 'Miel de Fleurs Sauvages 250g',
      description: 'Miel polyfloral léger, récolté au printemps sur les hauteurs de Zaghouan.',
      prix: 54.9,
      stock: 40,
      images: ['/images/jabal.png'],
      gamme: 'Classique',
      statut: 'SUSPENDU',
    },
  });

  const qrCode2 = await prisma.qRCode.create({
    data: {
      productId: product2.id,
      qrCode: 'KZ-QR-2026-000002',
      qrId: 'a1b2c3d4-0002-4000-8000-000000000002',
      isActive: true,
    },
  });

  // Scans suspects : plusieurs pays différents en peu de temps -> flag anti-fraude.
  await prisma.qRScan.createMany({
    data: [
      {
        qrCodeId: qrCode2.id,
        scannedAt: new Date('2026-09-10T08:00:00Z'),
        location: 'Tunis, Tunisie',
        deviceInfo: 'iPhone 13 / Safari',
        country: 'Tunisie',
        riskScore: 0.1,
        flagged: false,
      },
      {
        qrCodeId: qrCode2.id,
        scannedAt: new Date('2026-09-10T08:12:00Z'),
        location: 'Paris, France',
        deviceInfo: 'Windows / Chrome',
        country: 'France',
        riskScore: 0.85,
        flagged: true,
      },
      {
        qrCodeId: qrCode2.id,
        scannedAt: new Date('2026-09-10T08:20:00Z'),
        location: 'Dubaï, Émirats Arabes Unis',
        deviceInfo: 'Android / Chrome',
        country: 'Émirats Arabes Unis',
        riskScore: 0.92,
        flagged: true,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Chaîne en cours : demande + échantillon en transit (pipeline non terminé)
  // ---------------------------------------------------------------------
  console.log('Création d\'une demande en cours de traitement...');

  const request3 = await prisma.verificationRequest.create({
    data: {
      producerId: producer1.id,
      honeyType: 'Miel de Romarin',
      description: 'Nouvelle récolte à faire certifier.',
      collectionLocation: 'Le Kef, Tunisie',
      quantity: 20,
      status: 'IN_REVIEW',
    },
  });

  await prisma.sample.create({
    data: {
      requestId: request3.id,
      collectedById: fieldAgentUser.id,
      collectionDate: new Date('2026-09-12T09:00:00Z'),
      location: 'Rucher Ben Salah, Le Kef',
      quantity: 0.5,
      photos: [],
      status: 'IN_TRANSIT',
    },
  });

  await prisma.verificationRequest.create({
    data: {
      producerId: producer2.id,
      honeyType: 'Miel de Thym',
      description: 'Première demande de vérification.',
      collectionLocation: 'Zaghouan, Tunisie',
      quantity: 15,
      status: 'NEW',
    },
  });

  console.log('Journalisation des actions clés...');
  await prisma.auditLog.createMany({
    data: [
      { userId: producerUser1.id, action: 'CREATE_VERIFICATION_REQUEST', entite: 'VerificationRequest', entiteId: request1.id },
      { userId: verifTeamUser.id, action: 'DECIDE_VERIFICATION', entite: 'Verification', entiteId: verification1.id },
      { userId: admin.id, action: 'CREATE_BATCH', entite: 'Batch', entiteId: batch1.id },
      { userId: verifTeamUser.id, action: 'SUSPEND_PRODUCT', entite: 'Product', entiteId: product2.id },
    ],
  });

  console.log('Seed terminé.');
  console.log('---');
  console.log('Comptes de démonstration (mot de passe entre parenthèses) :');
  console.log('  admin@kounouzalafiya.com          (Admin123!)');
  console.log('  verification@kounouzalafiya.com   (Verif123!)');
  console.log('  agent@kounouzalafiya.com          (Agent123!)');
  console.log('  producteur@kounouzalafiya.com     (Prod123!)');
  console.log('  fatma.trabelsi@kounouzalafiya.com (Prod123!)');
  console.log('  client@kounouzalafiya.com         (Client123!)');
  console.log('QR codes de démonstration :');
  console.log('  KZ-QR-2026-000001 -> Vérifié (Miel de Sedra Premium)');
  console.log('  KZ-QR-2026-000002 -> Suspendu (Miel de Fleurs Sauvages)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
