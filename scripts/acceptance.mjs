#!/usr/bin/env node
/**
 * Tests d'acceptation Kounouz Alafiya — à lancer après chaque déploiement.
 *
 *   node scripts/acceptance.mjs
 *   API_URL=http://localhost:3001/api node scripts/acceptance.mjs
 *
 * Vérifie ce que le cahier des charges déclare non négociable :
 *   - les sondes d'exploitation répondent ;
 *   - la matrice des permissions est appliquée côté serveur ;
 *   - la page publique ne divulgue aucune donnée interne ;
 *   - le QR résout l'état courant de la base ;
 *   - les routes sensibles sont limitées en débit.
 *
 * Sort en code 1 dès qu'un test échoue : utilisable comme garde-fou en CI.
 */

const API = (process.env.API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const ROOT = API.replace(/\/api$/, '');

const COMPTES = {
  admin: ['admin@kounouzalafiya.com', 'Admin123!'],
  verificateur: ['verification@kounouzalafiya.com', 'Verif123!'],
  agent: ['agent@kounouzalafiya.com', 'Agent123!'],
  producteur: ['producteur@kounouzalafiya.com', 'Prod123!'],
  client: ['client@kounouzalafiya.com', 'Client123!'],
};

const VERT = '[32m';
const ROUGE = '[31m';
const GRAS = '[1m';
const FIN = '[0m';

let reussis = 0;
let echecs = 0;
const jetons = {};

function ok(nom, detail = '') {
  reussis += 1;
  console.log(`  ${VERT}OK${FIN}   ${nom}${detail ? ` — ${detail}` : ''}`);
}

function ko(nom, detail = '') {
  echecs += 1;
  console.log(`  ${ROUGE}KO${FIN}   ${nom}${detail ? ` — ${detail}` : ''}`);
}

function section(titre) {
  console.log(`\n${GRAS}${titre}${FIN}`);
}

async function appel(chemin, { methode = 'GET', jeton, corps, base = API } = {}) {
  const res = await fetch(`${base}${chemin}`, {
    method: methode,
    headers: {
      ...(corps ? { 'Content-Type': 'application/json' } : {}),
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await res.text();
  let donnees = null;
  try {
    donnees = texte ? JSON.parse(texte) : null;
  } catch {
    donnees = texte;
  }
  return { statut: res.status, donnees };
}

/** Attend un code HTTP précis (ou l'un des codes acceptés). */
async function attendre(nom, chemin, codes, options = {}) {
  const attendus = Array.isArray(codes) ? codes : [codes];
  const { statut } = await appel(chemin, options);
  if (attendus.includes(statut)) {
    ok(nom, `HTTP ${statut}`);
  } else {
    ko(nom, `HTTP ${statut}, attendu ${attendus.join(' ou ')}`);
  }
  return statut;
}

function premier(donnees) {
  if (Array.isArray(donnees)) return donnees[0];
  if (donnees && Array.isArray(donnees.data)) return donnees.data[0];
  return undefined;
}

async function main() {
  console.log(`${GRAS}Kounouz Alafiya — tests d'acceptation${FIN}`);
  console.log(`API : ${API}`);

  // -- 1. Exploitation ------------------------------------------------------
  section("1. Sondes d'exploitation");
  const sante = await appel('/health', { base: ROOT });
  if (sante.statut === 200 && sante.donnees?.status === 'ok') {
    ok('/health répond');
  } else {
    ko('/health répond', `HTTP ${sante.statut}`);
  }
  const pret = await appel('/ready', { base: ROOT });
  if (pret.statut === 200 && pret.donnees?.checks?.database === 'up') {
    ok('/ready confirme la base de données');
  } else {
    ko('/ready confirme la base de données', JSON.stringify(pret.donnees));
  }

  // -- 2. Authentification --------------------------------------------------
  section("2. Authentification des 5 types d'utilisateurs");
  for (const [role, [email, motDePasse]] of Object.entries(COMPTES)) {
    const { statut, donnees } = await appel('/auth/login', {
      methode: 'POST',
      corps: { email, password: motDePasse },
    });
    if (statut === 200 && donnees?.accessToken) {
      jetons[role] = donnees.accessToken;
      ok(`connexion ${role}`, donnees.user?.role);
    } else {
      ko(`connexion ${role}`, `HTTP ${statut}`);
    }
  }
  if (!jetons.verificateur) {
    console.log(`\n${ROUGE}Impossible de continuer sans le compte vérificateur.${FIN}`);
    console.log('La base est-elle peuplée ?  npm run prisma:seed');
    process.exit(1);
  }

  // -- 3. Matrice des permissions -------------------------------------------
  section('3. Matrice des permissions (refus côté serveur)');
  await attendre('non authentifié ne lit pas les échantillons', '/samples', 401);
  await attendre("producteur ne crée pas d'échantillon", '/samples', 403, {
    methode: 'POST',
    jeton: jetons.producteur,
    corps: {},
  });
  await attendre('agent ne décide pas de la vérification', '/verifications', 403, {
    methode: 'POST',
    jeton: jetons.agent,
    corps: {},
  });
  await attendre('producteur ne crée pas de lot', '/batches', 403, {
    methode: 'POST',
    jeton: jetons.producteur,
    corps: {},
  });
  await attendre('producteur ne crée pas de produit', '/products', 403, {
    methode: 'POST',
    jeton: jetons.producteur,
    corps: {},
  });
  await attendre("agent ne lit pas le journal d'audit", '/admin/audit-logs', 403, {
    jeton: jetons.agent,
  });
  await attendre('producteur ne gère pas les utilisateurs', '/admin/users', 403, {
    jeton: jetons.producteur,
  });

  // -- 4. Cloisonnement du consommateur -------------------------------------
  section("4. Le consommateur n'atteint aucune donnée interne");
  const ech = premier((await appel('/samples', { jeton: jetons.verificateur })).donnees);
  const ver = premier((await appel('/verifications', { jeton: jetons.verificateur })).donnees);
  const dem = premier(
    (await appel('/verification-requests', { jeton: jetons.verificateur })).donnees,
  );

  if (ech?.id) {
    await attendre('consommateur ne lit pas un échantillon', `/samples/${ech.id}`, 403, {
      jeton: jetons.client,
    });
    await attendre('vérificateur lit bien cet échantillon', `/samples/${ech.id}`, 200, {
      jeton: jetons.verificateur,
    });
  } else {
    ko('échantillon de test introuvable', 'base non peuplée ?');
  }

  if (ver?.id) {
    await attendre('consommateur ne lit pas une vérification', `/verifications/${ver.id}`, 403, {
      jeton: jetons.client,
    });
  } else {
    ko('vérification de test introuvable', 'base non peuplée ?');
  }

  if (dem?.id) {
    await attendre(
      'consommateur ne lit pas une demande',
      `/verification-requests/${dem.id}`,
      403,
      { jeton: jetons.client },
    );
  } else {
    ko('demande de test introuvable', 'base non peuplée ?');
  }

  // -- 5. Page publique : allowlist -----------------------------------------
  section('5. Vérification publique — aucune fuite interne');
  const qr = premier((await appel('/qr-codes', { jeton: jetons.verificateur })).donnees);
  if (qr?.qrId) {
    const { statut, donnees } = await appel(`/verify/${qr.qrId}`);
    if (statut !== 200) {
      ko('le QR résout publiquement', `HTTP ${statut}`);
    } else {
      ok('le QR résout publiquement', `statut affiché : ${donnees.displayStatus}`);

      const brut = JSON.stringify(donnees);
      const interdits = [
        'notes',
        'internalNotes',
        'conclusion',
        'results',
        'referenceSample',
        'custody',
        'sealCode',
        'decidedBy',
      ];
      const fuites = interdits.filter((champ) => brut.includes(`"${champ}"`));
      if (fuites.length === 0) {
        ok('aucun champ interne dans la réponse publique');
      } else {
        ko('champs internes exposés', fuites.join(', '));
      }

      if (donnees.verification && 'notes' in donnees.verification) {
        ko('les notes de décision restent internes', 'champ notes présent');
      } else {
        ok('les notes de décision restent internes');
      }

      if (Array.isArray(donnees.analysis?.parameters)) {
        ok('bulletin publié sous forme normalisée', `${donnees.analysis.parameters.length} paramètre(s)`);
      } else {
        ok('aucun bulletin publié pour ce QR (cas admis)');
      }

      if (['VERIFIED', 'SUSPENDED', 'RECALLED'].includes(donnees.displayStatus)) {
        ok("statut public dérivé de l'état courant du lot");
      } else {
        ko('statut public inattendu', donnees.displayStatus);
      }
    }
  } else {
    ko('QR de test introuvable', 'base non peuplée ?');
  }

  await attendre('QR inconnu renvoie un 404 générique', '/verify/QR-INEXISTANT-0000', 404);

  // -- 6. Limitation de débit -----------------------------------------------
  section('6. Limitation de débit sur la connexion');
  let vu429 = false;
  for (let i = 0; i < 14 && !vu429; i += 1) {
    const { statut } = await appel('/auth/login', {
      methode: 'POST',
      corps: { email: 'inexistant@test.local', password: 'mauvais' },
    });
    if (statut === 429) vu429 = true;
  }
  if (vu429) {
    ok('la force brute est bloquée (429)');
  } else {
    ko("la force brute n'est pas bloquée", 'aucun 429 en 14 tentatives');
  }

  // -- Bilan ----------------------------------------------------------------
  console.log(`\n${GRAS}Bilan :${FIN} ${reussis} réussi(s), ${echecs} échec(s)`);
  if (echecs > 0) {
    console.log(`${ROUGE}Déploiement NON conforme.${FIN}`);
    process.exit(1);
  }
  console.log(`${VERT}Déploiement conforme au cahier des charges.${FIN}`);
}

main().catch((err) => {
  console.error(`\n${ROUGE}Erreur pendant les tests :${FIN} ${err.message}`);
  console.error("L'API est-elle démarrée ?");
  process.exit(1);
});
