import { PrismaClient, SampleEventType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { pathToFileURL } from 'node:url';

// Jeu de données du portail Agent Terrain : producteurs du Cap Bon avec
// coordonnées GPS, tournée du jour, missions à venir et historique de visites
// dont un échantillon en cours de transport vers Kounouz.

const KOUNOUZ = { latitude: 36.8065, longitude: 10.1815, location: 'Kounouz Alafiya, Tunis' };

const PRODUCERS = [
  { name: 'Ahmed Trabelsi', farm: 'Rucher Trabelsi', town: 'Nabeul', lat: 36.4567, lng: 10.7352, hives: 120, honey: 'Miel de Thym', phone: '+216 23 456 789', method: 'Pratiques biologiques' },
  { name: 'Fatma Gharbi', farm: 'Les Ruches de Hammamet', town: 'Hammamet', lat: 36.4001, lng: 10.6167, hives: 85, honey: "Miel de Fleurs d'Oranger", phone: '+216 98 112 334', method: 'Apiculture traditionnelle' },
  { name: 'Sami Jebabli', farm: 'Domaine Jebabli', town: 'Menzel Bouzelfa', lat: 36.6833, lng: 10.5833, hives: 60, honey: 'Miel Toutes Fleurs', phone: '+216 55 870 221', method: 'Transhumance' },
  { name: 'Hassan Mansouri', farm: 'Rucher de Korba', town: 'Korba', lat: 36.5786, lng: 10.8586, hives: 140, honey: "Miel d'Eucalyptus", phone: '+216 22 640 117', method: 'Pratiques biologiques' },
  { name: 'Ali Ben Salem', farm: 'Rucher Ben Salem', town: 'Beni Khalled', lat: 36.6497, lng: 10.5936, hives: 45, honey: 'Miel de Sauge', phone: '+216 97 305 448', method: 'Apiculture traditionnelle' },
  { name: 'Nadia Bouzid', farm: 'Miellerie de Kélibia', town: 'Kélibia', lat: 36.8475, lng: 11.0939, hives: 70, honey: 'Miel de Romarin', phone: '+216 26 781 902', method: 'Pratiques biologiques' },
  { name: 'Karim Ayari', farm: 'Rucher de Soliman', town: 'Soliman', lat: 36.6967, lng: 10.4933, hives: 95, honey: 'Miel de Jujubier (Sedra)', phone: '+216 50 214 663', method: 'Transhumance' },
];

function at(dayOffset: number, hours: number, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function slug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.');
}

export async function seedFieldAgent(prisma: PrismaClient): Promise<void> {
  console.log('Portail agent terrain — tournée, missions et chaîne de possession...');

  const [agent, verifTeam] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'FIELD_AGENT' }, orderBy: { createdAt: 'asc' } }),
    prisma.user.findFirst({ where: { role: 'VERIFICATION_TEAM' } }),
  ]);
  if (!agent || !verifTeam) {
    throw new Error('Seed agent terrain : agent ou équipe de vérification manquant.');
  }
  if ((await prisma.collectionAssignment.count({ where: { agentId: agent.id } })) > 0) {
    console.log('  missions déjà présentes — ignoré.');
    return;
  }

  const year = new Date().getFullYear();
  const passwordHash = await bcrypt.hash('Prod123!', 10);
  const requestCount = await prisma.verificationRequest.count();
  const sampleCount = await prisma.sample.count({ where: { sampleCode: { startsWith: `SM-${year}-` } } });

  // Typage explicite : l'accumulateur est rempli dans la boucle ci-dessous et
  // relu plus bas par createRequest (sinon TS l'infère en any[]). On dérive
  // l'élément de PRODUCERS pour conserver toutes ses clés (town, lat, lng...).
  const producers: ((typeof PRODUCERS)[number] & {
    producer: Awaited<ReturnType<typeof prisma.producer.create>>;
  })[] = [];
  for (const p of PRODUCERS) {
    const email = `${slug(p.name)}@kounouzalafiya.com`;
    const user =
      (await prisma.user.findUnique({ where: { email } })) ??
      (await prisma.user.create({ data: { name: p.name, email, passwordHash, role: 'PRODUCER' } }));
    const producer =
      (await prisma.producer.findUnique({ where: { userId: user.id } })) ??
      (await prisma.producer.create({
        data: {
          userId: user.id,
          name: p.name,
          farmName: p.farm,
          location: `${p.town}, Tunisie`,
          status: 'ACTIVE',
          isVerified: true,
          phone: p.phone,
          governorate: 'Nabeul',
          farmGovernorate: 'Nabeul',
          farmDelegation: p.town,
          farmAddress: `${p.farm}, ${p.town}`,
          latitude: p.lat,
          longitude: p.lng,
          hivesCount: p.hives,
          farmPhotos: ['/images/beekeeper.jpg'],
          mainFlora: [p.honey.replace(/^Miel (de |d')?/, '')],
          activityType: 'BEEKEEPING',
        },
      }));
    producers.push({ ...p, producer });
  }

  let requestIndex = requestCount;
  const createRequest = (p: (typeof producers)[number], status: 'ACCEPTED' | 'COLLECTION_SCHEDULED' | 'SAMPLE_COLLECTED' | 'UNDER_ANALYSIS') => {
    requestIndex += 1;
    return prisma.verificationRequest.create({
      data: {
        producerId: p.producer.id,
        honeyType: p.honey,
        description: `Récolte ${year} — ${p.honey.toLowerCase()} du Cap Bon.`,
        collectionLocation: `${p.town}, Tunisie`,
        governorate: 'Nabeul',
        delegation: p.town,
        latitude: p.lat,
        longitude: p.lng,
        quantity: 40 + requestIndex % 60,
        status,
        requestCode: `VR-${year}-${String(900 + requestIndex).padStart(3, '0')}`,
        submittedAt: at(-10, 9),
        hivesCount: p.hives,
        beekeepingMethod: p.method,
        preferredCollectionMethod: 'KOUNOUZ_VISIT',
        productionSeason: `Printemps ${year}`,
      },
    });
  };

  let assignmentIndex = 0;
  const createAssignment = (
    requestId: string,
    data: {
      scheduledDate: Date;
      window: [string, string];
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      sampleId?: string;
      startedAt?: Date;
      completedAt?: Date;
      notes?: string;
      checked?: string[];
    },
  ) => {
    assignmentIndex += 1;
    return prisma.collectionAssignment.create({
      data: {
        assignmentCode: `CO-${year}-${String(assignmentIndex).padStart(3, '0')}`,
        requestId,
        agentId: agent.id,
        createdById: verifTeam.id,
        scheduledDate: data.scheduledDate,
        timeWindowStart: data.window[0],
        timeWindowEnd: data.window[1],
        status: data.status ?? 'PENDING',
        priority: data.priority ?? 'NORMAL',
        sampleId: data.sampleId,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        producerConfirmed: data.status === 'COMPLETED',
        harvestSource: 'PRODUCTION_HIVES',
        specialInstructions: 'Prélever sur des ruches actives en variant les cadres. Photographier le rucher et relever la position GPS.',
        notes:
          data.notes ??
          'Le producteur a demandé la vérification pour la saison. Le prévenir 30 minutes avant l’arrivée ; il sera présent au rucher.',
        checkedEquipment: data.checked ?? [],
      },
    });
  };

  // --- Tournée du jour ------------------------------------------------------
  const todayPlan: { window: [string, string]; hour: number; minute: number; priority?: 'HIGH' | 'URGENT'; inProgress?: boolean }[] = [
    { window: ['08:00', '10:00'], hour: 8, minute: 30, inProgress: true },
    { window: ['10:00', '12:00'], hour: 10, minute: 15 },
    { window: ['12:00', '14:00'], hour: 12, minute: 0, priority: 'HIGH' },
    { window: ['14:00', '16:00'], hour: 14, minute: 30 },
    { window: ['16:00', '18:00'], hour: 16, minute: 0, priority: 'URGENT' },
  ];
  for (const [i, plan] of todayPlan.entries()) {
    const request = await createRequest(producers[i], 'COLLECTION_SCHEDULED');
    await createAssignment(request.id, {
      scheduledDate: at(0, plan.hour, plan.minute),
      window: plan.window,
      priority: plan.priority,
      status: plan.inProgress ? 'IN_PROGRESS' : 'PENDING',
      startedAt: plan.inProgress ? at(0, 8, 40) : undefined,
      checked: plan.inProgress ? ['SAMPLING_KIT', 'STERILE_CONTAINERS', 'SECURE_SEALS', 'LABELS_QR', 'CAMERA', 'GPS'] : [],
    });
  }

  // --- Missions à venir -----------------------------------------------------
  for (const [i, offset] of [1, 2, 4].entries()) {
    const request = await createRequest(producers[5 + (i % 2)], 'COLLECTION_SCHEDULED');
    await createAssignment(request.id, { scheduledDate: at(offset, 9 + i), window: ['09:00', '12:00'] });
  }

  // --- Visites passées : un échantillon en transit, un reçu chez Kounouz ----
  let sampleIndex = sampleCount;
  const history: { producer: number; daysAgo: number; received: boolean }[] = [
    { producer: 0, daysAgo: 1, received: false },
    { producer: 3, daysAgo: 6, received: true },
  ];
  for (const [i, visit] of history.entries()) {
    const p = producers[visit.producer];
    const request = await createRequest(p, visit.received ? 'UNDER_ANALYSIS' : 'SAMPLE_COLLECTED');
    sampleIndex += 1;
    const collectedAt = at(-visit.daysAgo, 10, 24);
    const sample = await prisma.sample.create({
      data: {
        sampleCode: `SM-${year}-${String(sampleIndex).padStart(3, '0')}`,
        requestId: request.id,
        collectedById: agent.id,
        collectionDate: collectedAt,
        collectionMethod: 'KOUNOUZ_VISIT',
        location: `${p.farm}, ${p.town}`,
        quantity: 0.5,
        honeyType: p.honey,
        numberOfSamples: 1,
        harvestSource: 'PRODUCTION_HIVES',
        latitude: p.lat,
        longitude: p.lng,
        gpsAccuracy: 5,
        photos: ['/images/beekeeper.jpg'],
        status: visit.received ? 'RECEIVED_AT_LAB' : 'IN_TRANSIT',
        weather: { temperature: 24, humidity: 62, windSpeed: 12, code: 0 },
        createdAt: collectedAt,
      },
    });
    const seal = await prisma.seal.create({
      data: {
        sampleId: sample.id,
        sealCode: `KS-${year}-${String(784520 + i + 1)}`,
        sealedAt: new Date(collectedAt.getTime() + 4 * 60000),
        photoUrl: '/images/beekeeper.jpg',
        latitude: p.lat,
        longitude: p.lng,
      },
    });

    const minutes = (n: number) => new Date(collectedAt.getTime() + n * 60000);
    const farm = { location: `${p.town}, Tunisie`, latitude: p.lat, longitude: p.lng };
    const events: {
      type: SampleEventType;
      occurredAt: Date;
      userId: string | null;
      location?: string;
      latitude?: number;
      longitude?: number;
      handlerName?: string;
      note?: string;
      evidenceUrl?: string;
    }[] = [
      { type: 'REGISTERED', occurredAt: minutes(0), userId: agent.id, ...farm },
      { type: 'COLLECTED', occurredAt: minutes(0), userId: agent.id, ...farm, note: 'Prélevé sur ruches en production.', evidenceUrl: '/images/beekeeper.jpg' },
      { type: 'SEALED', occurredAt: minutes(4), userId: agent.id, ...farm, note: seal.sealCode, evidenceUrl: '/images/beekeeper.jpg' },
      { type: 'RELEASED_FOR_TRANSPORT', occurredAt: minutes(246), userId: agent.id, location: `${p.town}, Tunisie`, latitude: p.lat + 0.0034, longitude: p.lng + 0.0048, handlerName: 'Cap Bon Express', note: 'Remis au transporteur partenaire.' },
      { type: 'IN_TRANSIT', occurredAt: minutes(246), userId: agent.id, location: 'A1, Tunis, Tunisie', latitude: 36.6123, longitude: 10.3915, handlerName: 'Cap Bon Express', note: 'Véhicule en route vers le centre de vérification Kounouz.', evidenceUrl: '/images/beekeeper.jpg' },
    ];
    if (visit.received) {
      events.push(
        { type: 'RECEIVED', occurredAt: minutes(24 * 60), userId: verifTeam.id, ...KOUNOUZ },
        { type: 'IN_LABORATORY', occurredAt: minutes(26 * 60), userId: verifTeam.id, ...KOUNOUZ },
      );
    }
    await prisma.sampleEvent.createMany({ data: events.map((e) => ({ ...e, sampleId: sample.id })) });

    await createAssignment(request.id, {
      scheduledDate: at(-visit.daysAgo, 10),
      window: ['08:00', '12:00'],
      status: 'COMPLETED',
      sampleId: sample.id,
      startedAt: at(-visit.daysAgo, 9, 50),
      completedAt: minutes(15),
      checked: ['SAMPLING_KIT', 'STERILE_CONTAINERS', 'SECURE_SEALS', 'LABELS_QR', 'CAMERA', 'GPS'],
    });
  }

  // --- Collectes libres dans le pool partagé --------------------------------
  for (const p of producers.slice(5)) {
    await createRequest(p, 'ACCEPTED');
  }

  await prisma.notification.createMany({
    data: [
      { userId: agent.id, type: 'COLLECTION_ASSIGNED', title: 'Nouvelle mission de collecte', message: `CO-${year}-004 — ${producers[3].honey} chez ${producers[3].name}, ${producers[3].town}.`, entite: 'CollectionAssignment' },
      { userId: agent.id, type: 'SAMPLE_RECEIVED', title: 'Échantillon reçu', message: `L'échantillon de ${producers[3].name} est arrivé au centre Kounouz.`, entite: 'Sample', createdAt: at(-5, 10) },
    ],
  });
}

// Exécution autonome : `npx tsx prisma/seed-field-agent.ts` complète une base
// déjà peuplée sans la réinitialiser.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const prisma = new PrismaClient();
  seedFieldAgent(prisma)
    .then(() => console.log('Seed agent terrain terminé.'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
