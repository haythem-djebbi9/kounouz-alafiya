import {
  LabAnalysisStatus,
  LabTestStatus,
  LabWorkflowStatus,
  PrismaClient,
  SampleEventType,
  SampleStatus,
  VerificationRequestStatus,
} from '@prisma/client';

// Jeu de données du portail vérificateur : chaîne de possession, bulletins
// d'analyse détaillés, bibliothèque d'étalons et volume de dossiers permettant
// aux graphiques et à la pagination d'être représentatifs.

const GOVERNORATES = [
  'Sfax',
  'Nabeul',
  'Kairouan',
  'Jendouba',
  'Béja',
  'Zaghouan',
  'Le Kef',
  'Gabès',
  'Sousse',
  'Siliana',
  'Bizerte',
  'Ariana',
  'Monastir',
  'Mahdia',
  'Tozeur',
  'Tataouine',
];

const HONEY_TYPES = [
  'Miel de Thym',
  'Miel d’Agrumes',
  'Miel de Fleurs Sauvages',
  'Miel d’Eucalyptus',
  'Miel de Romarin',
  'Miel de Caroubier',
  'Miel de Jujubier (Sedra)',
  'Miel de Pin',
  'Miel Multifloral',
  'Miel de Sauge',
];

// Étalons de comparaison, un par grand type de miel tunisien.
const REFERENCE_HONEYS = [
  { honeyType: 'Miel de Thym', region: 'Sfax', harvestSeason: 'Printemps 2026', color: 'Ambre doré', texture: 'Fluide', floralSource: 'Thymus capitatus' },
  { honeyType: 'Miel d’Agrumes', region: 'Nabeul', harvestSeason: 'Printemps 2026', color: 'Ambre clair', texture: 'Fluide', floralSource: 'Citrus aurantium' },
  { honeyType: 'Miel de Fleurs Sauvages', region: 'Kairouan', harvestSeason: 'Printemps 2026', color: 'Ambre foncé', texture: 'Crémeuse', floralSource: 'Flore spontanée' },
  { honeyType: 'Miel d’Eucalyptus', region: 'Jendouba', harvestSeason: 'Été 2026', color: 'Ambre foncé', texture: 'Cristallisée', floralSource: 'Eucalyptus camaldulensis' },
  { honeyType: 'Miel de Sauge', region: 'Béja', harvestSeason: 'Printemps 2026', color: 'Ambre moyen', texture: 'Fluide', floralSource: 'Salvia officinalis' },
  { honeyType: 'Miel de Romarin', region: 'Aïn Draham', harvestSeason: 'Printemps 2026', color: 'Ambre très clair', texture: 'Crémeuse', floralSource: 'Rosmarinus officinalis' },
  { honeyType: 'Miel de Caroubier', region: 'Kasserine', harvestSeason: 'Été 2026', color: 'Ambre foncé', texture: 'Épaisse', floralSource: 'Ceratonia siliqua' },
  { honeyType: 'Miel de Jujubier (Sedra)', region: 'Tozeur', harvestSeason: 'Automne 2025', color: 'Brun ambré', texture: 'Épaisse', floralSource: 'Ziziphus lotus' },
  { honeyType: 'Miel Multifloral', region: 'Bizerte', harvestSeason: 'Printemps 2026', color: 'Ambre moyen', texture: 'Fluide', floralSource: 'Flore mixte' },
  { honeyType: 'Miel de Pin', region: 'Tabarka', harvestSeason: 'Été 2026', color: 'Brun sombre', texture: 'Fluide', floralSource: 'Pinus halepensis' },
  { honeyType: 'Miel de Lavande', region: 'Siliana', harvestSeason: 'Printemps 2026', color: 'Ambre clair', texture: 'Crémeuse', floralSource: 'Lavandula stoechas' },
  { honeyType: 'Miel d’Oranger', region: 'Monastir', harvestSeason: 'Printemps 2026', color: 'Très clair', texture: 'Fluide', floralSource: 'Citrus sinensis' },
];

// Valeurs typiques d'un bulletin conforme ; on les fait varier légèrement d'un
// dossier à l'autre pour que l'historique des analyses soit lisible.
const BASE_RESULTS: Record<string, { value: string; status: LabTestStatus }> = {
  moisture: { value: '17.2', status: LabTestStatus.WITHIN_RANGE },
  hmf: { value: '8.4', status: LabTestStatus.WITHIN_RANGE },
  diastase: { value: '18.6', status: LabTestStatus.WITHIN_RANGE },
  conductivity: { value: '0.48', status: LabTestStatus.WITHIN_RANGE },
  ph: { value: '3.9', status: LabTestStatus.WITHIN_RANGE },
  freeAcidity: { value: '18.2', status: LabTestStatus.WITHIN_RANGE },
  sugarProfile: { value: 'Fructose 38.2 % · Glucose 31.4 %', status: LabTestStatus.NOT_APPLICABLE },
  pollenAnalysis: { value: 'Dominant : Thymus capitatus (72 %)', status: LabTestStatus.NOT_APPLICABLE },
  antibiotics: { value: 'Non détecté', status: LabTestStatus.NOT_DETECTED },
};

const PARAMETER_META: Record<string, { unit: string | null; min: number | null; max: number | null; referenceText: string | null; position: number }> = {
  moisture: { unit: '%', min: null, max: 20, referenceText: null, position: 1 },
  hmf: { unit: 'mg/kg', min: null, max: 40, referenceText: null, position: 2 },
  diastase: { unit: 'DN', min: 8, max: null, referenceText: null, position: 3 },
  conductivity: { unit: 'mS/cm', min: null, max: 0.8, referenceText: null, position: 4 },
  ph: { unit: null, min: 3.4, max: 4.5, referenceText: null, position: 5 },
  freeAcidity: { unit: 'meq/kg', min: null, max: 50, referenceText: null, position: 6 },
  sugarProfile: { unit: null, min: null, max: null, referenceText: null, position: 7 },
  pollenAnalysis: { unit: null, min: null, max: null, referenceText: null, position: 8 },
  antibiotics: { unit: null, min: null, max: null, referenceText: 'NOT_DETECTED', position: 9 },
};

/** Décalage déterministe autour d'une valeur de référence, pour varier les bulletins. */
function jitter(value: string, seed: number, decimals = 1): string {
  const base = Number(value);
  if (!Number.isFinite(base)) return value;
  const offset = ((seed % 7) - 3) * (base * 0.02);
  return (base + offset).toFixed(decimals);
}

export async function seedVerificationPortal(prisma: PrismaClient): Promise<void> {
  console.log('Portail vérificateur — codes, chaîne de possession et bulletins...');

  const [verifTeam, fieldAgent, producers, laboratory] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'VERIFICATION_TEAM' } }),
    prisma.user.findFirst({ where: { role: 'FIELD_AGENT' } }),
    prisma.producer.findMany(),
    prisma.laboratory.findFirst(),
  ]);
  if (!verifTeam || !fieldAgent || !laboratory || producers.length === 0) {
    throw new Error('Seed du portail : utilisateurs, producteurs ou laboratoire manquants.');
  }

  // --- Codes lisibles et gouvernorats sur les dossiers existants ----------

  const existingRequests = await prisma.verificationRequest.findMany({ orderBy: { createdAt: 'asc' } });
  for (const [index, request] of existingRequests.entries()) {
    await prisma.verificationRequest.update({
      where: { id: request.id },
      data: {
        batchNumber: `TH-2026-${String(index + 1).padStart(3, '0')}`,
        governorate: request.governorate ?? GOVERNORATES[index % GOVERNORATES.length],
        assignedToId: verifTeam.id,
      },
    });
  }

  const existingSamples = await prisma.sample.findMany({ orderBy: { createdAt: 'asc' } });
  for (const [index, sample] of existingSamples.entries()) {
    await prisma.sample.update({
      where: { id: sample.id },
      data: {
        sampleCode: sample.sampleCode ?? `SM-2026-${String(index + 1).padStart(3, '0')}`,
        collectionMethod: index % 2 === 0 ? 'KOUNOUZ_VISIT' : 'PRODUCER_DELIVERY',
      },
    });
    await seedCustody(prisma, sample.id, sample.status, sample.collectionDate, fieldAgent.id, verifTeam.id);
  }

  const existingAnalyses = await prisma.laboratoryAnalysis.findMany({ orderBy: { createdAt: 'asc' } });
  for (const [index, analysis] of existingAnalyses.entries()) {
    const code = analysis.analysisCode ?? `LAB-2026-${String(index + 1).padStart(3, '0')}`;
    await prisma.laboratoryAnalysis.update({
      where: { id: analysis.id },
      data: {
        analysisCode: code,
        reportNumber: code,
        assignedToId: verifTeam.id,
        assignmentDate: analysis.analysisDate,
        expectedCompletion: new Date(analysis.analysisDate.getTime() + 4 * 86400000),
        completedAt: analysis.status === LabAnalysisStatus.PENDING ? null : analysis.analysisDate,
        workflowStatus:
          analysis.status === LabAnalysisStatus.PENDING
            ? LabWorkflowStatus.IN_PROGRESS
            : LabWorkflowStatus.COMPLETED,
        conclusion:
          analysis.status === LabAnalysisStatus.COMPLIANT
            ? 'Échantillon conforme aux normes qualité du miel tunisien.'
            : null,
      },
    });
    await seedTestResults(prisma, analysis.id, index, analysis.status);
  }

  const existingVerifications = await prisma.verification.findMany({ orderBy: { createdAt: 'asc' } });
  for (const [index, verification] of existingVerifications.entries()) {
    await prisma.verification.update({
      where: { id: verification.id },
      data: {
        verificationCode: verification.verificationCode ?? `VT-2026-${String(index + 1).padStart(3, '0')}`,
        isDraft: false,
        evaluation: {
          authenticity: 'VALID',
          physicochemical: 'COMPLIANT',
          pollen: 'CONFIRMED',
          antibiotics: 'COMPLIANT',
          overall: verification.status === 'VERIFIED' ? 'APPROVED' : 'FAILED',
        },
      },
    });
  }

  // --- Bibliothèque d'étalons ---------------------------------------------

  console.log('Portail vérificateur — bibliothèque d’étalons...');
  for (const [index, honey] of REFERENCE_HONEYS.entries()) {
    const tag = honeyTag(honey.honeyType);
    await prisma.referenceHoney.create({
      data: {
        code: `REF-${tag}-${String(index + 1).padStart(3, '0')}`,
        honeyType: honey.honeyType,
        region: honey.region,
        harvestSeason: honey.harvestSeason,
        collectionDate: new Date(2026, 3 - (index % 3), 15),
        color: honey.color,
        texture: honey.texture,
        floralSource: honey.floralSource,
        notes: 'Étalon issu d’un producteur certifié. Sert de base de comparaison qualité.',
        photos: [],
        analysisResults: {
          moisture: jitter('17.2', index),
          hmf: jitter('8.4', index),
          ph: jitter('3.9', index, 2),
        },
        isActive: true,
        createdById: verifTeam.id,
      },
    });
  }

  // --- Volume de dossiers pour les graphiques ------------------------------

  console.log('Portail vérificateur — dossiers de démonstration...');
  await seedRequestVolume(prisma, {
    producers: producers.map((p) => p.id),
    verifTeamId: verifTeam.id,
    fieldAgentId: fieldAgent.id,
    laboratoryId: laboratory.id,
    startIndex: existingRequests.length,
    sampleStartIndex: existingSamples.length,
    analysisStartIndex: existingAnalyses.length,
  });
}

function honeyTag(honeyType: string): string {
  const words = honeyType
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length > 0 && !['honey', 'miel', 'de', 'd'].includes(w.toLowerCase()));
  if (words.length === 0) return 'XX';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Rejoue la chaîne de possession cohérente avec le statut atteint. */
async function seedCustody(
  prisma: PrismaClient,
  sampleId: string,
  status: SampleStatus,
  collectionDate: Date,
  fieldAgentId: string,
  verifTeamId: string,
) {
  const already = await prisma.sampleEvent.count({ where: { sampleId } });
  if (already > 0) return;

  const reached: SampleEventType[] = [SampleEventType.REGISTERED, SampleEventType.COLLECTED];
  const order: Record<SampleStatus, SampleEventType[]> = {
    [SampleStatus.COLLECTED]: [],
    [SampleStatus.SEALED]: [SampleEventType.SEALED],
    [SampleStatus.IN_TRANSIT]: [SampleEventType.SEALED, SampleEventType.IN_TRANSIT],
    [SampleStatus.RECEIVED]: [SampleEventType.SEALED, SampleEventType.IN_TRANSIT, SampleEventType.RECEIVED],
    [SampleStatus.RECEIVED_AT_LAB]: [
      SampleEventType.SEALED,
      SampleEventType.IN_TRANSIT,
      SampleEventType.RECEIVED,
      SampleEventType.IN_LABORATORY,
    ],
    [SampleStatus.ANALYZED]: [
      SampleEventType.SEALED,
      SampleEventType.IN_TRANSIT,
      SampleEventType.RECEIVED,
      SampleEventType.IN_LABORATORY,
      SampleEventType.ANALYSIS_COMPLETED,
      SampleEventType.RESULT_ADDED,
    ],
    [SampleStatus.ISSUE]: [SampleEventType.SEALED, SampleEventType.ISSUE],
  };
  reached.push(...order[status]);

  await prisma.sampleEvent.createMany({
    data: reached.map((type, step) => ({
      sampleId,
      type,
      // Une étape par demi-journée : la timeline reste lisible.
      occurredAt: new Date(collectionDate.getTime() + step * 43200000),
      userId: step <= 2 ? fieldAgentId : verifTeamId,
    })),
  });
}

async function seedTestResults(
  prisma: PrismaClient,
  analysisId: string,
  seed: number,
  status: LabAnalysisStatus,
) {
  const already = await prisma.labTestResult.count({ where: { analysisId } });
  if (already > 0) return;

  await prisma.labTestResult.createMany({
    data: Object.entries(BASE_RESULTS).map(([parameterKey, base]) => {
      const meta = PARAMETER_META[parameterKey];
      const numeric = Number(base.value);
      // Un bulletin non conforme sort l'humidité de sa plage : c'est
      // l'anomalie la plus courante sur un miel récolté trop tôt.
      const nonCompliantHere = status === LabAnalysisStatus.NON_COMPLIANT && parameterKey === 'moisture';
      return {
        analysisId,
        parameterKey,
        value: nonCompliantHere
          ? '22.4'
          : Number.isFinite(numeric)
            ? jitter(base.value, seed, parameterKey === 'conductivity' || parameterKey === 'ph' ? 2 : 1)
            : base.value,
        unit: meta.unit,
        referenceMin: meta.min,
        referenceMax: meta.max,
        referenceText: meta.referenceText,
        status: nonCompliantHere ? LabTestStatus.OUT_OF_RANGE : base.status,
        position: meta.position,
      };
    }),
  });
}

/**
 * Crée un volume de demandes réparties sur six mois, plusieurs gouvernorats et
 * tous les statuts du flux, pour que la tendance, le camembert et la carte du
 * Centre de vérification aient de la matière.
 */
async function seedRequestVolume(
  prisma: PrismaClient,
  ctx: {
    producers: string[];
    verifTeamId: string;
    fieldAgentId: string;
    laboratoryId: string;
    startIndex: number;
    sampleStartIndex: number;
    analysisStartIndex: number;
  },
) {
  const now = new Date();
  // Répartition cible : plus de dossiers récents que d'anciens, et une majorité
  // de dossiers aboutis — profil réaliste d'un service qui monte en charge.
  const plan: { monthsAgo: number; status: VerificationRequestStatus; count: number }[] = [
    { monthsAgo: 5, status: 'VERIFIED', count: 6 },
    { monthsAgo: 5, status: 'REJECTED', count: 1 },
    { monthsAgo: 4, status: 'VERIFIED', count: 8 },
    { monthsAgo: 4, status: 'NOT_VERIFIED', count: 2 },
    { monthsAgo: 3, status: 'VERIFIED', count: 9 },
    { monthsAgo: 3, status: 'REJECTED', count: 2 },
    { monthsAgo: 2, status: 'VERIFIED', count: 10 },
    { monthsAgo: 2, status: 'UNDER_ANALYSIS', count: 6 },
    { monthsAgo: 1, status: 'UNDER_ANALYSIS', count: 12 },
    { monthsAgo: 1, status: 'VERIFICATION_PENDING', count: 7 },
    { monthsAgo: 1, status: 'REJECTED', count: 2 },
    { monthsAgo: 0, status: 'NEW', count: 11 },
    { monthsAgo: 0, status: 'IN_REVIEW', count: 9 },
    { monthsAgo: 0, status: 'INFO_REQUESTED', count: 3 },
    { monthsAgo: 0, status: 'ACCEPTED', count: 6 },
    { monthsAgo: 0, status: 'SAMPLE_COLLECTED', count: 5 },
  ];

  let requestIndex = ctx.startIndex;
  let sampleIndex = ctx.sampleStartIndex;
  let analysisIndex = ctx.analysisStartIndex;

  for (const row of plan) {
    for (let i = 0; i < row.count; i++) {
      const createdAt = new Date(
        now.getFullYear(),
        now.getMonth() - row.monthsAgo,
        1 + ((requestIndex * 7) % 26),
        9,
        0,
        0,
      );
      const honeyType = HONEY_TYPES[requestIndex % HONEY_TYPES.length];
      const governorate = GOVERNORATES[requestIndex % GOVERNORATES.length];
      requestIndex += 1;

      const request = await prisma.verificationRequest.create({
        data: {
          producerId: ctx.producers[requestIndex % ctx.producers.length],
          honeyType,
          description: `Lot proposé à la vérification — ${honeyType.toLowerCase()} de ${governorate}.`,
          collectionLocation: `${governorate}, Tunisie`,
          governorate,
          quantity: 10 + ((requestIndex * 13) % 90),
          status: row.status,
          requestCode: `VR-2026-${String(requestIndex).padStart(3, '0')}`,
          batchNumber: `TH-2026-${String(requestIndex).padStart(3, '0')}`,
          submittedAt: createdAt,
          createdAt,
          updatedAt: createdAt,
          preferredCollectionMethod: requestIndex % 2 === 0 ? 'KOUNOUZ_VISIT' : 'PRODUCER_DELIVERY',
          assignedToId: ctx.verifTeamId,
          hivesCount: 40 + ((requestIndex * 3) % 120),
          productionSeason: 'Printemps 2026',
        },
      });

      if (!STATUSES_WITH_SAMPLE.includes(row.status)) continue;

      sampleIndex += 1;
      const collectionDate = new Date(createdAt.getTime() + 3 * 86400000);
      const sampleStatus = SAMPLE_STATUS_FOR[row.status] ?? SampleStatus.COLLECTED;

      const sample = await prisma.sample.create({
        data: {
          sampleCode: `SM-2026-${String(sampleIndex).padStart(3, '0')}`,
          requestId: request.id,
          collectedById: ctx.fieldAgentId,
          collectionDate,
          collectionMethod: requestIndex % 2 === 0 ? 'KOUNOUZ_VISIT' : 'PRODUCER_DELIVERY',
          location: `${governorate}, Tunisie`,
          quantity: 0.5,
          status: sampleStatus,
          createdAt: collectionDate,
        },
      });

      await prisma.seal.create({
        data: {
          sampleId: sample.id,
          sealCode: `KZ-SEL-2026-${String(sampleIndex).padStart(6, '0')}`,
          sealedAt: new Date(collectionDate.getTime() + 3600000),
          status: 'INTACT',
        },
      });

      await seedCustody(prisma, sample.id, sampleStatus, collectionDate, ctx.fieldAgentId, ctx.verifTeamId);

      if (!STATUSES_WITH_ANALYSIS.includes(row.status)) continue;

      analysisIndex += 1;
      const analysisDate = new Date(collectionDate.getTime() + 5 * 86400000);
      const compliant = row.status !== 'NOT_VERIFIED';
      const code = `LAB-2026-${String(analysisIndex).padStart(3, '0')}`;
      const inProgress = row.status === 'UNDER_ANALYSIS';

      const analysis = await prisma.laboratoryAnalysis.create({
        data: {
          analysisCode: code,
          reportNumber: code,
          sampleId: sample.id,
          labId: ctx.laboratoryId,
          assignedToId: ctx.verifTeamId,
          assignmentDate: new Date(collectionDate.getTime() + 86400000),
          expectedCompletion: analysisDate,
          analysisDate,
          completedAt: inProgress ? null : analysisDate,
          status: inProgress
            ? LabAnalysisStatus.PENDING
            : compliant
              ? LabAnalysisStatus.COMPLIANT
              : LabAnalysisStatus.NON_COMPLIANT,
          workflowStatus: inProgress ? LabWorkflowStatus.IN_PROGRESS : LabWorkflowStatus.COMPLETED,
          conclusion: inProgress
            ? null
            : compliant
              ? 'Échantillon conforme aux normes qualité du miel tunisien.'
              : 'Humidité supérieure au seuil réglementaire.',
          results: {},
          createdAt: analysisDate,
        },
      });

      await seedTestResults(prisma, analysis.id, analysisIndex, analysis.status);

      if (!STATUSES_WITH_DECISION.includes(row.status)) continue;

      await prisma.verification.create({
        data: {
          verificationCode: `VT-2026-${String(analysisIndex).padStart(3, '0')}`,
          requestId: request.id,
          sampleId: sample.id,
          analysisId: analysis.id,
          status: row.status === 'VERIFIED' ? 'VERIFIED' : 'NOT_VERIFIED',
          isDraft: false,
          verifiedAt: new Date(analysisDate.getTime() + 86400000),
          notes:
            row.status === 'VERIFIED'
              ? 'Miel de qualité. Tous les paramètres sont dans les plages de référence.'
              : 'Paramètres hors plage : le lot ne peut pas être vérifié.',
          decidedById: ctx.verifTeamId,
          evaluation: {
            authenticity: row.status === 'VERIFIED' ? 'VALID' : 'FAILED',
            physicochemical: row.status === 'VERIFIED' ? 'COMPLIANT' : 'FAILED',
            pollen: 'CONFIRMED',
            antibiotics: 'COMPLIANT',
            overall: row.status === 'VERIFIED' ? 'APPROVED' : 'FAILED',
          },
          createdAt: new Date(analysisDate.getTime() + 86400000),
        },
      });
    }
  }
}

const STATUSES_WITH_SAMPLE: VerificationRequestStatus[] = [
  'SAMPLE_COLLECTED',
  'UNDER_ANALYSIS',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'NOT_VERIFIED',
];

const STATUSES_WITH_ANALYSIS: VerificationRequestStatus[] = [
  'UNDER_ANALYSIS',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'NOT_VERIFIED',
];

const STATUSES_WITH_DECISION: VerificationRequestStatus[] = ['VERIFIED', 'NOT_VERIFIED'];

const SAMPLE_STATUS_FOR: Partial<Record<VerificationRequestStatus, SampleStatus>> = {
  SAMPLE_COLLECTED: SampleStatus.RECEIVED,
  UNDER_ANALYSIS: SampleStatus.RECEIVED_AT_LAB,
  VERIFICATION_PENDING: SampleStatus.ANALYZED,
  VERIFIED: SampleStatus.ANALYZED,
  NOT_VERIFIED: SampleStatus.ANALYZED,
};
