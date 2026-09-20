import { pathToFileURL } from 'node:url';
import {
  AlertSeverity,
  AuditStatus,
  CounterfeitAlertStatus,
  CounterfeitAlertType,
  LaboratoryStatus,
  Prisma,
  PrismaClient,
  ProducerStatus,
  Role,
  ScanResult,
  VerificationRequestStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Jeu de données de la console d'administration : équipe interne, producteurs
// supplémentaires, laboratoires partenaires et accréditations, historique de
// scans consommateurs, alertes anti-contrefaçon, journal d'audit et ventes
// récentes. Purement additif : il ne supprime ni ne modifie les données
// métier existantes, et ne s'exécute qu'une fois (marqueur dans le journal).
//
// Exécution seule : npx tsx prisma/seed-admin-console.ts

const MARKER = { action: 'SEED_ADMIN_CONSOLE', entite: 'System', entiteId: 'seed-admin-console' };
const DAY = 86400000;
const NOW = Date.now();

/** Générateur pseudo-aléatoire déterministe : le jeu est identique à chaque exécution. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)];
  const weighted = <T>(entries: readonly (readonly [T, number])[]) => {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
  };
  return { next, int, pick, weighted };
}

const rand = createRandom(20260916);

const GOVERNORATE_WEIGHTS = [
  ['Tunis', 20],
  ['Sfax', 14],
  ['Nabeul', 12],
  ['Sousse', 10],
  ['Ariana', 8],
  ['Bizerte', 7],
  ['Ben Arous', 5],
  ['Monastir', 5],
  ['Jendouba', 4],
  ['Kairouan', 4],
  ['Béja', 3],
  ['Le Kef', 3],
  ['Zaghouan', 2],
  ['Gabès', 2],
  ['Médenine', 2],
  ['Mahdia', 2],
  ['Siliana', 1],
] as const;

const COUNTRY_WEIGHTS = [
  ['TN', 55],
  ['FR', 10],
  ['DE', 7],
  ['IT', 6],
  ['US', 4],
  ['CA', 3],
  ['DZ', 3],
  ['BE', 2],
  ['AE', 2],
  ['GB', 2],
  ['ES', 2],
  ['LY', 1],
  ['MA', 1],
  ['SA', 1],
  ['QA', 1],
] as const;

const COUNTRY_NAMES: Record<string, string> = {
  TN: 'Tunisia', FR: 'France', DE: 'Germany', IT: 'Italy', US: 'United States', CA: 'Canada', DZ: 'Algeria',
  BE: 'Belgium', AE: 'United Arab Emirates', GB: 'United Kingdom', ES: 'Spain', LY: 'Libya', MA: 'Morocco',
  SA: 'Saudi Arabia', QA: 'Qatar',
};

const FOREIGN_CITIES: Record<string, string[]> = {
  FR: ['Paris', 'Lyon', 'Marseille', 'Nice'], DE: ['Berlin', 'Munich', 'Hamburg'], IT: ['Rome', 'Milan', 'Palermo'],
  US: ['New York', 'Chicago', 'Houston'], CA: ['Montréal', 'Toronto'], DZ: ['Alger', 'Oran', 'Annaba'],
  BE: ['Bruxelles', 'Liège'], AE: ['Dubaï', 'Abu Dhabi'], GB: ['London', 'Manchester'], ES: ['Madrid', 'Barcelona'],
  LY: ['Tripoli', 'Benghazi'], MA: ['Casablanca', 'Rabat'], SA: ['Riyadh', 'Jeddah'], QA: ['Doha'],
};

const DEVICES = [
  ['MOBILE', 'iPhone · Safari', 34],
  ['MOBILE', 'Android · Chrome', 44],
  ['MOBILE', 'Android · Samsung Internet', 4],
  ['DESKTOP', 'Windows · Chrome', 8],
  ['DESKTOP', 'macOS · Safari', 4],
  ['DESKTOP', 'Windows · Edge', 2],
  ['TABLET', 'iPad · Safari', 3],
  ['OTHER', null, 1],
] as const;

function ip() {
  return `${rand.pick([41, 102, 197, 196, 185, 88, 92])}.${rand.int(1, 254)}.${rand.int(0, 254)}.${rand.int(1, 254)}`;
}

function daysAgo(days: number, hourMin = 7, hourMax = 22) {
  const date = new Date(NOW - days * DAY);
  date.setUTCHours(rand.int(hourMin, hourMax), rand.int(0, 59), rand.int(0, 59), 0);
  return date.getTime() > NOW ? new Date(NOW - rand.int(5, 120) * 60000) : date;
}

export async function seedAdminConsole(prisma: PrismaClient): Promise<void> {
  await backfillScans(prisma);

  if (await prisma.auditLog.findFirst({ where: { action: MARKER.action } })) {
    console.log('Console d’administration : données déjà présentes, rien à ajouter.');
    return;
  }
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN }, orderBy: { createdAt: 'asc' } });
  if (!admin) throw new Error('Seed console : aucun administrateur.');

  console.log('Console d’administration — équipe et producteurs...');
  const passwordHash = await bcrypt.hash('Demo123!', 10);
  await seedStaff(prisma, passwordHash);
  await seedProducers(prisma, passwordHash);

  console.log('Console d’administration — laboratoires partenaires...');
  await seedLaboratories(prisma);

  console.log('Console d’administration — historique des scans...');
  await seedScans(prisma);

  console.log('Console d’administration — alertes anti-contrefaçon...');
  await seedAlerts(prisma, admin.id);

  console.log('Console d’administration — ventes récentes...');
  await seedOrders(prisma);

  console.log('Console d’administration — journal d’audit...');
  await seedAuditLogs(prisma);

  await prisma.auditLog.create({
    data: { ...MARKER, userId: null, module: 'SYSTEM', details: 'Données de démonstration de la console chargées.' },
  });
}

/** Les scans enregistrés avant la migration n'ont qu'un nom de pays : on les normalise. */
async function backfillScans(prisma: PrismaClient) {
  const mapping: Record<string, string> = { Tunisie: 'TN', France: 'FR', 'Émirats Arabes Unis': 'AE' };
  for (const [country, code] of Object.entries(mapping)) {
    await prisma.qRScan.updateMany({ where: { country, countryCode: null }, data: { countryCode: code } });
  }
  await prisma.qRScan.updateMany({ where: { location: { startsWith: 'Tunis' }, governorate: null, countryCode: 'TN' }, data: { governorate: 'Tunis' } });
  await prisma.qRScan.updateMany({ where: { deviceType: null, deviceInfo: { contains: 'iPhone' } }, data: { deviceType: 'MOBILE' } });
  await prisma.qRScan.updateMany({ where: { deviceType: null, deviceInfo: { contains: 'Android' } }, data: { deviceType: 'MOBILE' } });
  await prisma.qRScan.updateMany({ where: { deviceType: null, deviceInfo: { contains: 'Windows' } }, data: { deviceType: 'DESKTOP' } });
  await prisma.qRScan.updateMany({ where: { flagged: true, result: ScanResult.VALID }, data: { result: ScanResult.SUSPICIOUS } });
}

async function seedStaff(prisma: PrismaClient, passwordHash: string) {
  const staff: { name: string; email: string; role: Role; location: string; phone: string; daysAgo: number; active?: boolean }[] = [
    { name: 'Sara Mansouri', email: 'sara.mansouri@kounouzalafiya.com', role: Role.ADMIN, location: 'Tunis', phone: '+216 22 145 780', daysAgo: 150 },
    { name: 'Khaled Mannai', email: 'khaled.mannai@kounouzalafiya.com', role: Role.VERIFICATION_TEAM, location: 'Tunis', phone: '+216 98 330 214', daysAgo: 210 },
    { name: 'Lina Chaabane', email: 'lina.chaabane@kounouzalafiya.com', role: Role.VERIFICATION_TEAM, location: 'Sfax', phone: '+216 55 781 002', daysAgo: 95 },
    { name: 'Nour Ben Ali', email: 'nour.benali@kounouzalafiya.com', role: Role.VERIFICATION_TEAM, location: 'Sousse', phone: '+216 29 610 447', daysAgo: 40 },
    { name: 'Mohamed Trabelsi', email: 'mohamed.trabelsi@kounouzalafiya.com', role: Role.FIELD_AGENT, location: 'Bizerte', phone: '+216 97 204 318', daysAgo: 180 },
    { name: 'Youssef Gharbi', email: 'youssef.gharbi@kounouzalafiya.com', role: Role.FIELD_AGENT, location: 'Jendouba', phone: '+216 50 118 936', daysAgo: 20 },
    { name: 'Amel Jaziri', email: 'amel.jaziri@kounouzalafiya.com', role: Role.FIELD_AGENT, location: 'Kairouan', phone: '+216 24 902 551', daysAgo: 300, active: false },
    { name: 'Rania Ayari', email: 'rania.ayari@example.tn', role: Role.CONSUMER, location: 'Ariana', phone: '', daysAgo: 60 },
    { name: 'Omar Belhaj', email: 'omar.belhaj@example.tn', role: Role.CONSUMER, location: 'Paris', phone: '', daysAgo: 12 },
    { name: 'Ines Riahi', email: 'ines.riahi@example.tn', role: Role.CONSUMER, location: 'Sousse', phone: '', daysAgo: 5 },
  ];
  for (const member of staff) {
    if (await prisma.user.findUnique({ where: { email: member.email } })) continue;
    await prisma.user.create({
      data: {
        name: member.name,
        email: member.email,
        passwordHash,
        role: member.role,
        isActive: member.active ?? true,
        language: 'fr',
        phone: member.phone || null,
        location: member.location,
        createdAt: new Date(NOW - member.daysAgo * DAY),
        ...(member.role === Role.CONSUMER ? { consumer: { create: { name: member.name, country: member.location === 'Paris' ? 'France' : 'Tunisie' } } } : {}),
      },
    });
  }
  // Coordonnées des comptes de démonstration existants.
  const defaults: Record<string, { phone: string; location: string }> = {
    'admin@kounouzalafiya.com': { phone: '+216 71 000 100', location: 'Tunis' },
    'verification@kounouzalafiya.com': { phone: '+216 71 000 200', location: 'Tunis' },
    'agent@kounouzalafiya.com': { phone: '+216 71 000 300', location: 'Nabeul' },
  };
  for (const [email, data] of Object.entries(defaults)) {
    await prisma.user.updateMany({ where: { email, phone: null }, data });
  }
}

async function seedProducers(prisma: PrismaClient, passwordHash: string) {
  const producers: [string, string, string, ProducerStatus, number, string[]][] = [
    ['Coopérative Nabeul Miel', 'Rucher du Cap Bon', 'Nabeul', ProducerStatus.ACTIVE, 320, ['Miel de Thym', 'Miel de Fleurs Sauvages']],
    ['Ahmed Ben Saleh', 'Domaine Ben Saleh', 'Bizerte', ProducerStatus.ACTIVE, 290, ['Miel d’Agrumes', 'Miel d’Eucalyptus']],
    ['Sami Zayani', 'Ruchers de Kroumirie', 'Jendouba', ProducerStatus.PENDING, 8, ['Miel de Fleurs Sauvages', 'Miel de Forêt']],
    ['Coopérative El Kef', 'Apiculteurs du Kef', 'Le Kef', ProducerStatus.ACTIVE, 260, ['Miel de Thym', 'Miel de Pin']],
    ['Fatma Mansouri', 'Miellerie du Sahel', 'Sousse', ProducerStatus.ACTIVE, 200, ['Miel d’Eucalyptus', 'Miel Multifloral']],
    ['Mohamed Trabelsi Apiculture', 'Ruches de Zaghouan', 'Zaghouan', ProducerStatus.SUSPENDED, 240, ['Miel de Thym', 'Miel de Sidr']],
    ['Bee Nature', 'Bee Nature Siliana', 'Siliana', ProducerStatus.ACTIVE, 150, ['Miel de Fleurs Sauvages', 'Miel d’Agrumes']],
    ['Youssef Gharbi', 'Rucher de Béja', 'Béja', ProducerStatus.ACTIVE, 120, ['Miel de Sidr', 'Miel Multifloral']],
    ['Hatem Zayani', 'Zayani Honey', 'Jendouba', ProducerStatus.ACTIVE, 95, ['Miel de Forêt']],
    ['Amira Haddad', 'Les Abeilles de Sfax', 'Sfax', ProducerStatus.ACTIVE, 80, ['Miel de Romarin', 'Miel de Thym']],
    ['Karim Jlassi', 'Rucher de Kairouan', 'Kairouan', ProducerStatus.PENDING, 4, ['Miel de Sidr']],
    ['Salma Ferchichi', 'Miel de Monastir', 'Monastir', ProducerStatus.ACTIVE, 60, ['Miel d’Agrumes']],
    ['Riadh Hammami', 'Domaine Hammami', 'Ariana', ProducerStatus.ACTIVE, 45, ['Miel d’Eucalyptus']],
    ['Wafa Brahmi', 'Rucher de Mahdia', 'Mahdia', ProducerStatus.PENDING, 3, ['Miel Multifloral']],
    ['Nizar Khelifi', 'Apiculture Khelifi', 'Gabès', ProducerStatus.ACTIVE, 35, ['Miel de Sidr', 'Miel de Palmier']],
    ['Leila Oueslati', 'Ruchers de Médenine', 'Médenine', ProducerStatus.ACTIVE, 26, ['Miel de Thym']],
    ['Anis Dridi', 'Dridi Bee Farm', 'Ben Arous', ProducerStatus.REJECTED, 70, ['Miel Multifloral']],
    ['Hela Kacem', 'Rucher du Nord', 'Bizerte', ProducerStatus.ACTIVE, 18, ['Miel de Fleurs Sauvages']],
    ['Tarek Sassi', 'Sassi Honey', 'Sfax', ProducerStatus.ACTIVE, 12, ['Miel de Romarin']],
    ['Mouna Arfaoui', 'Miellerie Arfaoui', 'Nabeul', ProducerStatus.PENDING, 1, ['Miel d’Agrumes']],
    ['Bilel Chebbi', 'Chebbi Apiculture', 'Tunis', ProducerStatus.SUSPENDED, 110, ['Miel de Thym']],
    ['Olfa Guesmi', 'Ruches de Kasserine', 'Kasserine', ProducerStatus.ACTIVE, 22, ['Miel de Romarin', 'Miel de Pin']],
  ];

  let requestCount = await prisma.verificationRequest.count({ where: { requestCode: { startsWith: 'VR-2026-' } } });
  for (const [index, [name, farmName, governorate, status, age, honeyTypes]] of producers.entries()) {
    const email = `${farmName.toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@producteur.tn`;
    if (await prisma.user.findUnique({ where: { email } })) continue;
    const createdAt = new Date(NOW - age * DAY - rand.int(0, 20) * 3600000);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.PRODUCER,
        language: 'fr',
        isActive: status !== ProducerStatus.REJECTED,
        phone: `+216 ${rand.int(20, 99)} ${rand.int(100, 999)} ${rand.int(100, 999)}`,
        createdAt,
        producer: {
          create: {
            name,
            farmName,
            location: `${governorate}, Tunisie`,
            governorate,
            farmGovernorate: governorate,
            status,
            isVerified: status === ProducerStatus.ACTIVE,
            hivesCount: rand.int(20, 260),
            mainFlora: honeyTypes,
            createdAt,
          },
        },
      },
      include: { producer: true },
    });

    // Demandes au stade instruction : elles alimentent les colonnes « types de
    // miel » et « vérification » sans simuler de résultat d'analyse.
    const requestStatuses =
      status === ProducerStatus.REJECTED
        ? [VerificationRequestStatus.REJECTED]
        : status === ProducerStatus.PENDING
          ? []
          : index % 3 === 0
            ? [VerificationRequestStatus.IN_REVIEW]
            : [VerificationRequestStatus.NEW];
    for (const [i, requestStatus] of requestStatuses.entries()) {
      requestCount += 1;
      const submittedAt = new Date(NOW - rand.int(2, Math.max(3, Math.min(age, 40))) * DAY);
      await prisma.verificationRequest.create({
        data: {
          producerId: user.producer!.id,
          honeyType: honeyTypes[i % honeyTypes.length],
          collectionLocation: `${governorate}, Tunisie`,
          governorate,
          quantity: rand.int(40, 600),
          status: requestStatus,
          requestCode: `VR-2026-${String(900 + requestCount).padStart(3, '0')}`,
          submittedAt,
          createdAt: submittedAt,
        },
      });
    }
  }
}

async function seedLaboratories(prisma: PrismaClient) {
  const existing = await prisma.laboratory.findFirst({ orderBy: { name: 'asc' } });
  if (existing && !existing.email) {
    await prisma.laboratory.update({
      where: { id: existing.id },
      data: {
        tagline: 'Contrôle national des produits de la ruche',
        email: 'contact@lnc-apicole.tn',
        phone: '+216 71 000 000',
        city: 'Tunis',
        address: 'Rue de la Science, 1002 Tunis',
        website: 'www.lnc-apicole.tn',
        contactName: 'Dr. Salma Youssef',
        createdAt: new Date('2024-01-12T09:00:00Z'),
        accreditations: {
          create: [
            { name: 'ISO 17025', issuingBody: 'TUNAC', certificateNumber: 'ISO17025-TN-0456', validUntil: new Date('2026-12-15') },
            { name: 'TUNAC', issuingBody: 'Conseil National d’Accréditation', certificateNumber: 'TUNAC-LAB-118', validUntil: new Date('2026-10-22') },
          ],
        },
      },
    });
  }

  const labs: {
    name: string; tagline: string; city: string; country: string; email: string; phone: string; website: string;
    status: LaboratoryStatus; joined: string; accreditations: [string, string, string][];
  }[] = [
    { name: 'MedLab Analysis', tagline: 'Des analyses fiables pour une santé durable', city: 'Tunis', country: 'Tunisie', email: 'contact@medlab-analysis.tn', phone: '+216 71 123 456', website: 'www.medlab-analysis.tn', status: LaboratoryStatus.ACTIVE, joined: '2024-01-12', accreditations: [['ISO 17025', 'TUNAC', '2026-12-15'], ['TUNAC', 'TUNAC', '2026-10-22']] },
    { name: 'BioTest Lab', tagline: 'Biologie et qualité alimentaire', city: 'Sfax', country: 'Tunisie', email: 'contact@biotest-lab.tn', phone: '+216 74 220 118', website: 'www.biotest-lab.tn', status: LaboratoryStatus.ACTIVE, joined: '2024-02-03', accreditations: [['ISO 17025', 'TUNAC', '2027-02-01']] },
    { name: 'LabPlus Sfax', tagline: 'Chimie analytique des produits de la ruche', city: 'Sfax', country: 'Tunisie', email: 'info@labplus-sfax.tn', phone: '+216 74 401 990', website: 'www.labplus-sfax.tn', status: LaboratoryStatus.ACTIVE, joined: '2024-03-18', accreditations: [['ISO 17025', 'TUNAC', '2027-03-18']] },
    { name: 'Centre Apicole du Sahel', tagline: 'Pollens, résidus et authenticité', city: 'Sousse', country: 'Tunisie', email: 'analyses@apicole-sahel.tn', phone: '+216 73 300 212', website: 'www.apicole-sahel.tn', status: LaboratoryStatus.ACTIVE, joined: '2024-01-22', accreditations: [['ISO 17025', 'TUNAC', '2026-11-30'], ['COFRAC', 'COFRAC', '2027-01-15']] },
    { name: 'Analyse & Conseil', tagline: 'Conseil qualité pour les filières agricoles', city: 'Sousse', country: 'Tunisie', email: 'contact@analyse-conseil.tn', phone: '+216 73 118 004', website: 'www.analyse-conseil.tn', status: LaboratoryStatus.PENDING, joined: '2026-08-14', accreditations: [['ISO 17025', 'TUNAC', '2027-08-01']] },
    { name: 'AgroLab Bizerte', tagline: 'Laboratoire agroalimentaire du Nord', city: 'Bizerte', country: 'Tunisie', email: 'contact@agrolab-bizerte.tn', phone: '+216 72 430 671', website: 'www.agrolab-bizerte.tn', status: LaboratoryStatus.ACTIVE, joined: '2024-03-30', accreditations: [['ISO 17025', 'TUNAC', '2026-09-01'], ['TUNAC', 'TUNAC', '2027-03-30']] },
    { name: 'Qualité Lab France', tagline: 'Contre-expertise et marchés export', city: 'Paris', country: 'France', email: 'contact@qualitelab.fr', phone: '+33 1 44 00 12 12', website: 'www.qualitelab.fr', status: LaboratoryStatus.ACTIVE, joined: '2024-04-11', accreditations: [['ISO 17025', 'COFRAC', '2027-04-11'], ['COFRAC', 'COFRAC', '2027-04-11']] },
    { name: 'NutriScan', tagline: 'Profil nutritionnel et étiquetage', city: 'Tunis', country: 'Tunisie', email: 'contact@nutriscan.tn', phone: '+216 71 845 300', website: 'www.nutriscan.tn', status: LaboratoryStatus.SUSPENDED, joined: '2024-05-09', accreditations: [] },
  ];

  for (const lab of labs) {
    if (await prisma.laboratory.findFirst({ where: { name: lab.name } })) continue;
    await prisma.laboratory.create({
      data: {
        name: lab.name,
        tagline: lab.tagline,
        city: lab.city,
        country: lab.country,
        address: `${lab.city}, ${lab.country}`,
        email: lab.email,
        phone: lab.phone,
        website: lab.website,
        status: lab.status,
        accreditationNo: lab.accreditations[0] ? `${lab.accreditations[0][0].replace(/\s/g, '')}-${rand.int(100, 999)}` : '—',
        contactInfo: `${lab.email} / ${lab.phone}`,
        createdAt: new Date(`${lab.joined}T09:00:00Z`),
        accreditations: {
          create: lab.accreditations.map(([name, issuingBody, validUntil]) => ({
            name,
            issuingBody,
            certificateNumber: `${name.replace(/\s/g, '')}-${rand.int(1000, 9999)}`,
            validUntil: new Date(validUntil),
          })),
        },
      },
    });
  }
}

async function seedScans(prisma: PrismaClient) {
  const codes = await prisma.qRCode.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, productId: true, product: { select: { statut: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (codes.length === 0) return;

  // Popularité inégale des produits : quelques références concentrent l'essentiel des scans.
  const productIds = [...new Set(codes.map((c) => c.productId))];
  const productWeight = new Map(productIds.map((id, i) => [id, Math.max(1, 40 / (i + 1))]));
  const codesByProduct = new Map<string, string[]>();
  for (const code of codes) {
    codesByProduct.set(code.productId, [...(codesByProduct.get(code.productId) ?? []), code.id]);
  }
  const productEntries = productIds.map((id) => [id, productWeight.get(id)!] as const);

  const visitors: string[] = [];
  const rows: Prisma.QRScanCreateManyInput[] = [];
  const TOTAL = 3400;
  for (let i = 0; i < TOTAL; i++) {
    // Croissance régulière sur neuf mois, plus marquée ces dernières semaines.
    const position = Math.pow(rand.next(), 0.72);
    const days = Math.floor((1 - position) * 258);
    const scannedAt = daysAgo(days);

    const countryCode = rand.weighted(COUNTRY_WEIGHTS);
    const governorate = countryCode === 'TN' ? rand.weighted(GOVERNORATE_WEIGHTS) : null;
    const city = governorate ?? rand.pick(FOREIGN_CITIES[countryCode] ?? ['—']);
    const [deviceType, deviceInfo] = (() => {
      const device = rand.weighted(DEVICES.map((d) => [d, d[2]] as const));
      return [device[0], device[1]];
    })();

    const returning = visitors.length > 0 && rand.next() < 0.33;
    const visitorId = returning ? rand.pick(visitors) : `v-${(i + 1).toString(36)}-${rand.int(1000, 9999)}`;
    if (!returning) visitors.push(visitorId);

    const outcome = rand.weighted([
      [ScanResult.VALID, 965],
      [ScanResult.SUSPICIOUS, 25],
      [ScanResult.INVALID, 10],
    ] as const);

    const productId = rand.weighted(productEntries);
    const qrCodeId = rand.pick(codesByProduct.get(productId)!);

    rows.push({
      qrCodeId: outcome === ScanResult.INVALID ? null : qrCodeId,
      scannedIdentifier: outcome === ScanResult.INVALID ? `KZ-QR-2026-${rand.int(900000, 999999)}` : null,
      scannedAt,
      location: `${city}, ${COUNTRY_NAMES[countryCode]}`,
      country: COUNTRY_NAMES[countryCode],
      countryCode,
      city,
      governorate,
      deviceType,
      deviceInfo,
      ipAddress: ip(),
      visitorId,
      result: outcome,
      riskScore: outcome === ScanResult.VALID ? rand.int(0, 3) / 10 : rand.int(5, 10) / 10,
      flagged: outcome !== ScanResult.VALID,
    });
  }
  for (let i = 0; i < rows.length; i += 500) {
    await prisma.qRScan.createMany({ data: rows.slice(i, i + 500) });
  }
}

async function seedAlerts(prisma: PrismaClient, adminId: string) {
  const codes = await prisma.qRCode.findMany({
    where: { product: { statut: { in: ['PUBLIE', 'RUPTURE', 'SUSPENDU'] } } },
    select: { id: true, qrCode: true, productId: true, batchId: true },
    take: 400,
  });
  const fallback = codes.length ? codes : await prisma.qRCode.findMany({ select: { id: true, qrCode: true, productId: true, batchId: true }, take: 400 });
  if (fallback.length === 0) return;
  const hotCodes = fallback.slice(0, 12);

  const resolvers = await prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.VERIFICATION_TEAM] } }, select: { id: true } });
  let sequence = await prisma.counterfeitAlert.count({ where: { alertCode: { startsWith: 'ALERT-2026-' } } });

  const ALERT_COUNTRIES = [
    ['TN', 30], ['FR', 12], ['DZ', 10], ['LY', 8], ['DE', 6], ['IT', 6], ['US', 5], ['MA', 4], ['AE', 4], ['TR', 3], ['CN', 3], ['BR', 2],
  ] as const;
  const NAMES: Record<string, string> = { ...COUNTRY_NAMES, TR: 'Turkey', CN: 'China', BR: 'Brazil' };
  const CITIES: Record<string, string[]> = { ...FOREIGN_CITIES, TR: ['Istanbul'], CN: ['Shenzhen', 'Guangzhou'], BR: ['São Paulo'] };

  const TOTAL = 96;
  for (let i = 0; i < TOTAL; i++) {
    const age = Math.floor(Math.pow(rand.next(), 0.8) * 80);
    const createdAt = daysAgo(age, 0, 23);
    const type = rand.weighted([
      [CounterfeitAlertType.SUSPECTED_DUPLICATE, 38],
      [CounterfeitAlertType.UNUSUAL_LOCATION, 19],
      [CounterfeitAlertType.INVALID_QR, 19],
      [CounterfeitAlertType.TAMPERED_LABEL, 12],
      [CounterfeitAlertType.BULK_SCAN, 12],
    ] as const);
    const countryCode = rand.weighted(ALERT_COUNTRIES);
    const city = countryCode === 'TN' ? rand.weighted(GOVERNORATE_WEIGHTS) : rand.pick(CITIES[countryCode] ?? ['—']);
    const code = rand.next() < 0.45 ? rand.pick(hotCodes) : rand.pick(fallback);
    const invalid = type === CounterfeitAlertType.INVALID_QR;
    const scanCount =
      type === CounterfeitAlertType.BULK_SCAN ? rand.int(40, 180) : type === CounterfeitAlertType.SUSPECTED_DUPLICATE ? rand.int(5, 24) : rand.int(1, 6);
    const [deviceType, deviceInfo] = rand.weighted(DEVICES.map((d) => [[d[0], d[1]] as const, d[2]] as const));

    const status =
      age > 30
        ? rand.weighted([[CounterfeitAlertStatus.RESOLVED, 80], [CounterfeitAlertStatus.DISMISSED, 12], [CounterfeitAlertStatus.INVESTIGATING, 8]] as const)
        : age > 7
          ? rand.weighted([[CounterfeitAlertStatus.RESOLVED, 45], [CounterfeitAlertStatus.INVESTIGATING, 30], [CounterfeitAlertStatus.OPEN, 25]] as const)
          : rand.weighted([[CounterfeitAlertStatus.OPEN, 65], [CounterfeitAlertStatus.INVESTIGATING, 25], [CounterfeitAlertStatus.RESOLVED, 10]] as const);
    const closed = status === CounterfeitAlertStatus.RESOLVED || status === CounterfeitAlertStatus.DISMISSED;
    const resolvedAt = closed ? new Date(Math.min(NOW - 3600000, createdAt.getTime() + rand.int(4, 96) * 3600000)) : null;

    const details: Record<CounterfeitAlertType, string> = {
      SUSPECTED_DUPLICATE: `${scanCount} scans en 10 min depuis ${rand.int(2, 5)} appareils différents.`,
      UNUSUAL_LOCATION: `Scanné depuis ${countryCode} et TN en moins de 1 heure.`,
      INVALID_QR: 'Identifiant inconnu : format de code non émis par Kounouz.',
      TAMPERED_LABEL: rand.next() < 0.5 ? 'Signalement consommateur (DAMAGED_SEAL) : opercule décollé.' : 'Scan d’un code désactivé, jamais mis en circulation.',
      BULK_SCAN: `${scanCount} scans en 5 minutes depuis la même adresse.`,
    };

    sequence += 1;
    await prisma.counterfeitAlert.create({
      data: {
        alertCode: `ALERT-2026-${String(sequence).padStart(5, '0')}`,
        type,
        status,
        severity:
          type === CounterfeitAlertType.SUSPECTED_DUPLICATE || type === CounterfeitAlertType.TAMPERED_LABEL || scanCount > 60
            ? AlertSeverity.HIGH
            : rand.weighted([[AlertSeverity.MEDIUM, 70], [AlertSeverity.LOW, 30]] as const),
        qrCodeId: invalid ? null : code.id,
        scannedIdentifier: invalid ? `KZ-QR-2026-${rand.int(900000, 999999)}` : null,
        productId: invalid ? null : code.productId,
        batchId: invalid ? null : code.batchId,
        location: `${city}, ${NAMES[countryCode]}`,
        country: NAMES[countryCode],
        countryCode,
        deviceInfo,
        deviceType,
        ipAddress: ip(),
        scanCount,
        details: details[type],
        resolutionNote: closed ? (status === CounterfeitAlertStatus.DISMISSED ? 'Faux positif : dégustation en magasin.' : 'Distributeur contacté, étiquettes retirées du circuit.') : null,
        resolvedById: closed ? (resolvers.length ? rand.pick(resolvers).id : adminId) : null,
        resolvedAt,
        lastSeenAt: new Date(createdAt.getTime() + rand.int(1, 90) * 60000),
        createdAt,
      },
    });
  }
}

async function seedOrders(prisma: PrismaClient) {
  const products = await prisma.product.findMany({
    where: { statut: 'PUBLIE', batchId: { not: null } },
    select: {
      id: true,
      nom: true,
      prix: true,
      batch: { select: { verification: { select: { request: { select: { producerId: true } } } } } },
    },
  });
  if (products.length === 0) return;

  const last = await prisma.order.findFirst({ where: { orderNumber: { startsWith: 'KZ' } }, orderBy: { orderNumber: 'desc' } });
  let orderNumber = last ? Number(last.orderNumber.replace(/\D/g, '')) || 2000 : 2000;
  const CITIES = ['Tunis', 'Sfax', 'Sousse', 'Nabeul', 'Bizerte', 'Ariana', 'Monastir', 'Paris'];
  const NAMES = ['Rania Ayari', 'Omar Belhaj', 'Ines Riahi', 'Mehdi Kefi', 'Sonia Hamdi', 'Walid Bouazizi', 'Asma Toumi', 'Fares Mejri'];

  // Commandes d'août et septembre uniquement : les mois antérieurs sont déjà
  // réglés aux producteurs et ne doivent pas changer.
  const augustStart = new Date('2026-08-01T00:00:00Z').getTime();
  const span = Math.max(DAY, NOW - augustStart);
  for (let i = 0; i < 46; i++) {
    const createdAt = new Date(augustStart + Math.pow(rand.next(), 0.8) * span);
    if (createdAt.getTime() > NOW) continue;
    const product = rand.pick(products);
    const producerId = product.batch?.verification?.request.producerId;
    if (!producerId) continue;
    const quantity = rand.weighted([[1, 50], [2, 30], [3, 12], [4, 8]] as const);
    const unitPrice = Number(product.prix);
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
    const commissionAmount = Math.round(lineTotal * 0.2 * 100) / 100;
    const shippingFee = lineTotal > 200 ? 0 : 7;
    const recent = NOW - createdAt.getTime() < 5 * DAY;
    const status = recent
      ? rand.weighted([['PENDING', 40], ['CONFIRMED', 40], ['SHIPPED', 20]] as const)
      : rand.weighted([['DELIVERED', 82], ['SHIPPED', 8], ['CANCELLED', 10]] as const);
    orderNumber += 1;
    await prisma.order.create({
      data: {
        orderNumber: `KZ${orderNumber}`,
        customerName: rand.pick(NAMES),
        customerPhone: `+216 ${rand.int(20, 99)} ${rand.int(100, 999)} ${rand.int(100, 999)}`,
        shippingAddress: 'Adresse de démonstration',
        city: rand.pick(CITIES),
        channel: rand.weighted([['ONLINE_STORE', 55], ['MARKETPLACE', 30], ['RETAIL_PARTNER', 15]] as const),
        status,
        subtotal: lineTotal,
        shippingFee,
        total: lineTotal + shippingFee,
        createdAt,
        deliveredAt: status === 'DELIVERED' ? new Date(Math.min(NOW, createdAt.getTime() + 2 * DAY)) : null,
        items: {
          create: {
            productId: product.id,
            producerId,
            productName: product.nom,
            quantity,
            unitPrice,
            lineTotal,
            commissionRate: 0.2,
            commissionAmount,
            netAmount: Math.round((lineTotal - commissionAmount) * 100) / 100,
          },
        },
      },
    });
  }
}

async function seedAuditLogs(prisma: PrismaClient) {
  const [staff, producers, batches, samples, requests, labs, qrGenerations, alerts] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.VERIFICATION_TEAM, Role.FIELD_AGENT] }, isActive: true }, select: { id: true, name: true, role: true } }),
    prisma.producer.findMany({ select: { id: true, name: true, userId: true } }),
    prisma.batch.findMany({ select: { id: true, batchCode: true }, take: 60 }),
    prisma.sample.findMany({ select: { id: true, sampleCode: true }, take: 60 }),
    prisma.verificationRequest.findMany({ where: { requestCode: { not: null } }, select: { id: true, requestCode: true }, take: 60 }),
    prisma.laboratory.findMany({ select: { id: true, name: true } }),
    prisma.qrGeneration.findMany({ select: { id: true, quantity: true }, take: 20 }),
    prisma.counterfeitAlert.findMany({ where: { status: { in: ['RESOLVED', 'INVESTIGATING'] } }, select: { id: true, alertCode: true, status: true, resolvedAt: true, resolvedById: true, updatedAt: true }, take: 40 }),
  ]);
  const byRole = (role: Role) => staff.filter((s) => s.role === role);
  const admins = byRole(Role.ADMIN);
  const verifiers = byRole(Role.VERIFICATION_TEAM);
  const agents = byRole(Role.FIELD_AGENT);
  const userIps = new Map<string, string>();
  const ipOf = (userId: string | null) => {
    if (!userId) return ip();
    if (!userIps.has(userId)) userIps.set(userId, ip());
    return rand.next() < 0.85 ? userIps.get(userId)! : ip();
  };
  const ua = (mobile = false) =>
    mobile
      ? 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

  type Template = () => Prisma.AuditLogCreateManyInput | null;
  const pickOr = <T>(items: T[]) => (items.length ? rand.pick(items) : null);

  const templates: [Template, number][] = [
    [() => { const u = pickOr(staff); return u && { userId: u.id, action: 'LOGIN', entite: 'User', entiteId: u.id, module: 'AUTH', details: 'Connexion réussie.', userAgent: ua(u.role === Role.FIELD_AGENT) }; }, 26],
    [() => { const p = pickOr(producers); return p && { userId: p.userId, action: 'LOGIN', entite: 'User', entiteId: p.userId, module: 'AUTH', details: 'Connexion réussie.', userAgent: ua(true) }; }, 10],
    [() => { const u = pickOr(staff); return u && { userId: u.id, action: 'LOGOUT', entite: 'User', entiteId: u.id, module: 'AUTH', userAgent: ua() }; }, 5],
    [() => ({ userId: null, action: 'LOGIN_FAILED', entite: 'User', entiteId: '-', module: 'AUTH', status: AuditStatus.FAILED, details: `Compte inconnu : ${rand.pick(['admin@kounouz.tn', 'root@kounouzalafiya.com', 'test@test.com'])}`, userAgent: ua() }), 3],
    [() => { const u = pickOr(staff); return u && { userId: u.id, action: 'LOGIN_FAILED', entite: 'User', entiteId: u.id, module: 'AUTH', status: AuditStatus.FAILED, details: 'Mot de passe incorrect.', userAgent: ua() }; }, 3],
    [() => { const u = pickOr(verifiers); const s = pickOr(samples); return u && s && { userId: u.id, action: 'SAVE_LAB_RESULTS', entite: 'LaboratoryAnalysis', entiteId: s.id, module: 'LABORATORY', details: `Résultats saisis — ${s.sampleCode ?? ''}`, metadata: { field: 'Résultat labo', oldValue: null, newValue: { pollen: `${rand.int(8, 18)}.${rand.int(0, 9)}%`, humidity: `${rand.int(15, 19)}.${rand.int(0, 9)}%`, hmf: `${rand.int(3, 12)}.${rand.int(0, 9)} mg/kg` }, notes: 'Analyse terminée, résultats conformes.' } }; }, 7],
    [() => { const u = pickOr(verifiers); const b = pickOr(batches); return u && b && { userId: u.id, action: 'VERIFICATION_VERIFIED', entite: 'Verification', entiteId: b.id, module: 'VERIFICATION', details: `Lot vérifié ${b.batchCode}` }; }, 6],
    [() => { const u = pickOr(verifiers); const r = pickOr(requests); return u && r && { userId: u.id, action: 'REQUEST_REVIEW_REJECT', entite: 'VerificationRequest', entiteId: r.id, module: 'REQUEST', details: `Demande rejetée ${r.requestCode}`, status: AuditStatus.SUCCESS }; }, 2],
    [() => { const u = pickOr(agents); const s = pickOr(samples); return u && s && { userId: u.id, action: 'CREATE_SAMPLE', entite: 'Sample', entiteId: s.id, module: 'SAMPLE', details: `Nouvel échantillon ${s.sampleCode ?? ''}`, userAgent: ua(true) }; }, 6],
    [() => { const u = pickOr(agents); const s = pickOr(samples); return u && s && { userId: u.id, action: 'APPLY_SEAL', entite: 'Seal', entiteId: s.id, module: 'SAMPLE', details: `Scellé posé — ${s.sampleCode ?? ''}`, userAgent: ua(true) }; }, 4],
    [() => { const u = pickOr([...verifiers, ...admins]); const g = pickOr(qrGenerations); const b = pickOr(batches); return u && b && { userId: u.id, action: 'GENERATE_QR_CODES', entite: 'QrGeneration', entiteId: g?.id ?? b.id, module: 'QR_CODE', details: `${g?.quantity ?? 500} QR codes générés — lot ${b.batchCode}` }; }, 4],
    [() => { const u = pickOr(admins); const p = pickOr(producers); return u && p && { userId: u.id, action: 'PRODUCER_ACTIVE', entite: 'Producer', entiteId: p.id, module: 'PRODUCER', details: p.name, metadata: { field: 'status', oldValue: 'PENDING', newValue: 'ACTIVE' } }; }, 3],
    [() => { const p = pickOr(producers); return p && { userId: p.userId, action: 'CREATE_VERIFICATION_REQUEST', entite: 'VerificationRequest', entiteId: p.id, module: 'REQUEST', details: `Nouvelle demande — ${p.name}`, userAgent: ua(true) }; }, 5],
    [() => { const u = pickOr(admins); const target = pickOr(staff); return u && target && { userId: u.id, action: 'CHANGE_USER_ROLE', entite: 'User', entiteId: target.id, module: 'USER', details: target.name, metadata: { field: 'role', oldValue: { role: 'FIELD_AGENT' }, newValue: { role: target.role } } }; }, 1],
    [() => { const u = pickOr(verifiers); const b = pickOr(batches); return u && b && { userId: u.id, action: 'UPDATE_BATCH', entite: 'Batch', entiteId: b.id, module: 'BATCH', details: `Lot mis à jour ${b.batchCode}`, metadata: { field: 'notes', oldValue: null, newValue: 'Conditionnement planifié' } }; }, 5],
    [() => { const u = pickOr(admins); const l = pickOr(labs); return u && l && { userId: u.id, action: 'UPDATE_LABORATORY', entite: 'Laboratory', entiteId: l.id, module: 'LABORATORY', details: l.name, metadata: { field: 'phone', oldValue: { phone: '+216 71 000 000' }, newValue: { phone: '+216 71 123 456' } } }; }, 2],
    [() => { const p = pickOr(producers); return p && { userId: p.userId, action: 'DELETE_PRODUCER_DOCUMENT', entite: 'ProducerDocument', entiteId: p.id, module: 'PRODUCER', details: 'Brouillon de pièce supprimé' }; }, 1],
    [() => { const u = pickOr(verifiers); const b = pickOr(batches); return u && b && { userId: u.id, action: 'BATCH_SUSPENDED', entite: 'Batch', entiteId: b.id, module: 'BATCH', status: AuditStatus.WARNING, details: `Lot suspendu ${b.batchCode} — activité de scan suspecte` }; }, 1],
    [() => ({ userId: null, action: 'SYSTEM_BACKUP', entite: 'System', entiteId: 'daily-backup', module: 'SYSTEM', details: 'Sauvegarde quotidienne de la base terminée.' }), 3],
  ];
  const templateEntries = templates.map(([fn, w]) => [fn, w] as const);

  const rows: Prisma.AuditLogCreateManyInput[] = [];
  while (rows.length < 620) {
    const row = rand.weighted(templateEntries)();
    if (!row) continue;
    const age = Math.floor(Math.pow(rand.next(), 0.9) * 62);
    rows.push({ ...row, createdAt: daysAgo(age, 6, 23), ipAddress: ipOf(row.userId ?? null) });
  }
  for (const alert of alerts) {
    if (!alert.resolvedById && alert.status !== 'INVESTIGATING') continue;
    rows.push({
      userId: alert.resolvedById ?? pickOr(admins)?.id ?? null,
      action: alert.status === 'RESOLVED' ? 'RESOLVE_ALERT' : 'INVESTIGATE_ALERT',
      entite: 'CounterfeitAlert',
      entiteId: alert.id,
      module: 'ANTI_COUNTERFEIT',
      details: alert.alertCode,
      metadata: { field: 'status', oldValue: 'OPEN', newValue: alert.status },
      createdAt: alert.resolvedAt ?? alert.updatedAt,
      ipAddress: ipOf(alert.resolvedById),
    });
  }
  for (let i = 0; i < rows.length; i += 500) {
    await prisma.auditLog.createMany({ data: rows.slice(i, i + 500) });
  }

  // Dernière connexion de chaque compte = sa plus récente entrée LOGIN.
  const lastLogins = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: { action: 'LOGIN', userId: { not: null } },
    _max: { createdAt: true },
  });
  for (const entry of lastLogins) {
    if (!entry.userId || !entry._max.createdAt) continue;
    await prisma.user.updateMany({
      where: { id: entry.userId, OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: entry._max.createdAt } }] },
      data: { lastLoginAt: entry._max.createdAt },
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const prisma = new PrismaClient();
  seedAdminConsole(prisma)
    .then(() => console.log('Seed console d’administration terminé.'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
