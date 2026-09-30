#!/usr/bin/env node
/**
 * Scénario de démonstration Kounouz Alafiya — rejoué automatiquement.
 *
 *   node scripts/scenario-demo.mjs
 *   API_URL=https://kounouz-alafiya.onrender.com/api SITE_URL=https://kounouz-alafiya.vercel.app \
 *     node scripts/scenario-demo.mjs
 *
 * Suit le parcours de SCENARIO_DEMONSTRATION.md, acte par acte, et vérifie que
 * chaque fonctionnalité montrée au client répond comme prévu : vitrine et prix
 * en dinars, vérification d'un pot, les cinq espaces de travail, la commission
 * réglable depuis la console, la gestion du blog — puis mesure les temps de
 * réponse et la compression.
 *
 * Données : le script crée un article de blog et, sur une API locale, une
 * commande de test ; il les retire ensuite (article supprimé, commande
 * annulée, stock restitué, taux de commission remis à sa valeur). Sur une API
 * distante, la commande n'est passée qu'avec KZ_SCENARIO_COMMANDE=1.
 *
 * Sort en code 1 dès qu'une vérification échoue.
 */

const API = (process.env.API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const ROOT = API.replace(/\/api(\/v\d+)?$/, '');
const SITE = process.env.SITE_URL?.replace(/\/$/, '');
const LOCAL = /localhost|127\.0\.0\.1/.test(API);
const AVEC_COMMANDE = process.env.KZ_SCENARIO_COMMANDE ? process.env.KZ_SCENARIO_COMMANDE === '1' : LOCAL;

const COMPTES = {
  admin: ['admin@kounouzalafiya.com', 'Admin123!'],
  verificateur: ['verification@kounouzalafiya.com', 'Verif123!'],
  agent: ['agent@kounouzalafiya.com', 'Agent123!'],
  producteur: ['producteur@kounouzalafiya.com', 'Prod123!'],
  client: ['client@kounouzalafiya.com', 'Client123!'],
};

const VERT = '\x1b[32m';
const ROUGE = '\x1b[31m';
const JAUNE = '\x1b[33m';
const GRAS = '\x1b[1m';
const FIN = '\x1b[0m';

let reussis = 0;
let echecs = 0;
let alertes = 0;
const jetons = {};

const ok = (nom, detail = '') => {
  reussis += 1;
  console.log(`  ${VERT}OK${FIN}   ${nom}${detail ? ` — ${detail}` : ''}`);
};
const ko = (nom, detail = '') => {
  echecs += 1;
  console.log(`  ${ROUGE}KO${FIN}   ${nom}${detail ? ` — ${detail}` : ''}`);
};
const alerte = (nom, detail = '') => {
  alertes += 1;
  console.log(`  ${JAUNE}!!${FIN}   ${nom}${detail ? ` — ${detail}` : ''}`);
};
const verifier = (condition, nom, detail = '') => (condition ? ok(nom, detail) : ko(nom, detail));
const section = (titre) => console.log(`\n${GRAS}${titre}${FIN}`);

async function appel(chemin, { methode = 'GET', jeton, corps, base = API, entetes = {} } = {}) {
  const debut = performance.now();
  const res = await fetch(`${base}${chemin}`, {
    method: methode,
    headers: {
      'Accept-Encoding': 'gzip',
      ...(corps ? { 'Content-Type': 'application/json' } : {}),
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      ...entetes,
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await res.text();
  const duree = Math.round(performance.now() - debut);
  let donnees = null;
  try {
    donnees = texte ? JSON.parse(texte) : null;
  } catch {
    donnees = texte;
  }
  return { statut: res.status, donnees, entetes: res.headers, duree, taille: texte.length };
}

const liste = (d) => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.items) ? d.items : []);
const arrondi2 = (n) => Math.round(n * 100) / 100;

async function main() {
  console.log(`${GRAS}Kounouz Alafiya — scénario de démonstration automatisé${FIN}`);
  console.log(`API : ${API}${SITE ? `  ·  site : ${SITE}` : ''}`);

  // -- Réveil ------------------------------------------------------------------
  // L'hébergement gratuit endort le serveur : le premier appel peut durer une minute.
  const reveil = await appel('/health', { base: ROOT });
  if (reveil.statut !== 200) {
    console.log(`${ROUGE}L'API ne répond pas (/health : HTTP ${reveil.statut}).${FIN}`);
    process.exit(1);
  }

  // -- Acte 0 : performances ------------------------------------------------------
  section('Acte 0 — Performances et réseau');
  for (const chemin of ['/products/catalog', '/categories', '/blog']) {
    const mesures = [];
    let derniere;
    for (let i = 0; i < 3; i += 1) {
      derniere = await appel(chemin);
      mesures.push(derniere.duree);
    }
    const mediane = mesures.sort((a, b) => a - b)[1];
    if (derniere.statut !== 200) ko(`${chemin} répond`, `HTTP ${derniere.statut}`);
    else if (mediane > 1500) alerte(`${chemin} lent`, `${mediane} ms (médiane de 3)`);
    else ok(`${chemin} répond vite`, `${mediane} ms (médiane de 3)`);
  }
  const catalogue = await appel('/products/catalog');
  verifier(
    catalogue.entetes.get('content-encoding') === 'gzip',
    'réponses de l’API compressées (gzip)',
    catalogue.entetes.get('content-encoding') ?? 'aucune compression',
  );
  const blogCache = (await appel('/blog')).entetes.get('cache-control') ?? '';
  verifier(/max-age=\d+/.test(blogCache), 'blog public mis en cache', blogCache || 'aucun Cache-Control');

  // -- Acte 1 : vitrine ---------------------------------------------------------
  section('Acte 1 — La vitrine (visiteur sans compte)');
  const produits = liste(catalogue.donnees);
  verifier(produits.length > 0, 'catalogue publié', `${produits.length} produit(s)`);
  verifier(
    produits.every((p) => Number(p.prix) > 0 && (p.variants ?? []).every((v) => Number(v.price) > 0)),
    'chaque produit et chaque format a un prix en dinars',
  );
  const incoherents = produits.filter((p) => {
    const v = (p.variants ?? []).filter((x) => x.netWeightG).sort((a, b) => a.netWeightG - b.netWeightG);
    return v.some((x, i) => i > 0 && Number(x.price) <= Number(v[i - 1].price));
  });
  verifier(
    incoherents.length === 0,
    'un grand format coûte plus cher qu’un petit',
    incoherents.map((p) => p.nom).join(', ') || `${produits.length} produit(s) contrôlé(s)`,
  );
  const categories = await appel('/categories');
  verifier(categories.statut === 200 && liste(categories.donnees).length > 0, 'catégories publiques');

  const articles = liste((await appel('/blog')).donnees);
  verifier(articles.length > 0, 'articles de blog publiés', `${articles.length} article(s)`);
  if (articles[0]) {
    const detail = await appel(`/blog/${articles[0].slug}`);
    const langues = ['ar', 'fr', 'en'].filter((l) => detail.donnees?.content?.[l]);
    verifier(detail.statut === 200 && langues.length > 0, 'lecture d’un article', `langues : ${langues.join(', ')}`);
  }

  // -- Acte 2 : vérification d'un pot -------------------------------------------
  section('Acte 2 — Le consommateur vérifie un pot');
  const verifie = await appel('/verify/KZ-QR-2026-000001');
  verifier(verifie.donnees?.displayStatus === 'VERIFIED', 'KZ-QR-2026-000001 → produit vérifié', verifie.donnees?.product?.nom);
  const suspendu = await appel('/verify/KZ-QR-2026-000002');
  verifier(suspendu.donnees?.displayStatus === 'SUSPENDED', 'KZ-QR-2026-000002 → produit suspendu');
  verifier((await appel('/verify/KZ-QR-INEXISTANT')).statut === 404, 'code inconnu → introuvable (404)');

  // -- Acte 3 : connexions --------------------------------------------------------
  section('Acte 3 — Les cinq espaces de travail');
  for (const [role, [email, password]] of Object.entries(COMPTES)) {
    const { statut, donnees } = await appel('/auth/login', { methode: 'POST', corps: { email, password } });
    if (statut === 200 && donnees?.accessToken) {
      jetons[role] = donnees.accessToken;
      ok(`connexion ${role}`, donnees.user?.role);
    } else {
      ko(`connexion ${role}`, `HTTP ${statut}`);
    }
  }
  if (!jetons.admin) {
    console.log(`\n${ROUGE}Sans le compte administrateur, la suite du scénario est impossible.${FIN}`);
    process.exit(1);
  }

  const ecrans = [
    ['producteur', '/verification-requests/mine', 'producteur : ses demandes de vérification'],
    ['producteur', '/orders/producer/sales', 'producteur : ses ventes et sa commission'],
    ['verificateur', '/verification-portal/dashboard', 'vérification : tableau de bord'],
    ['verificateur', '/verification-portal/requests', 'vérification : revue des demandes'],
    ['agent', '/field-agent/dashboard', 'agent terrain : tableau de bord'],
    ['agent', '/field-agent/assignments', 'agent terrain : missions'],
    ['admin', '/admin/dashboard', 'administration : tableau de bord'],
    ['admin', '/orders', 'administration : commandes'],
    ['admin', '/settlements', 'administration : règlements producteurs'],
    ['admin', '/admin/audit-logs', 'administration : journal d’audit'],
  ];
  for (const [role, chemin, nom] of ecrans) {
    if (!jetons[role]) continue;
    const r = await appel(chemin, { jeton: jetons[role] });
    verifier(r.statut === 200, nom, `HTTP ${r.statut}, ${r.duree} ms`);
  }

  // -- Acte 4 : commission ----------------------------------------------------------
  section('Acte 4 — Commission Kounouz réglable depuis la console');
  const reglage = await appel('/commission', { jeton: jetons.admin });
  const tauxInitial = reglage.donnees?.rate;
  verifier(typeof tauxInitial === 'number', 'taux de commission en vigueur', `${Math.round(tauxInitial * 10000) / 100} %`);
  verifier(reglage.donnees?.defaultRate === 0.2, 'taux par défaut : 20 %');

  const commandes = liste((await appel('/orders', { jeton: jetons.admin })).donnees);
  const lignes = commandes.flatMap((c) => c.items ?? []);
  const lignesAuTaux = lignes.filter((l) => Number(l.commissionRate) === 0.2);
  const montantsJustes = lignes.every((l) => Math.abs(arrondi2(Number(l.lineTotal) * Number(l.commissionRate)) - Number(l.commissionAmount)) <= 0.01);
  verifier(lignesAuTaux.length > 0, 'commission de 20 % prélevée automatiquement sur les ventes', `${lignesAuTaux.length}/${lignes.length} ligne(s) à 20 %`);
  verifier(montantsJustes, 'montant de commission = prix × taux sur chaque ligne');

  verifier((await appel('/commission', { methode: 'PUT', jeton: jetons.producteur, corps: { rate: 0.1 } })).statut === 403, 'un producteur ne peut pas changer le taux (403)');
  verifier((await appel('/commission', { methode: 'PUT', jeton: jetons.verificateur, corps: { rate: 0.1 } })).statut === 403, 'l’équipe de vérification ne peut pas changer le taux (403)');
  verifier((await appel('/commission', { methode: 'PUT', jeton: jetons.admin, corps: { rate: 0.8 } })).statut === 400, 'un taux au-delà de 50 % est refusé (400)');

  try {
    const change = await appel('/commission', { methode: 'PUT', jeton: jetons.admin, corps: { rate: 0.18, reason: 'Scénario de test automatisé' } });
    verifier(change.statut === 200 && change.donnees?.rate === 0.18, 'l’administrateur passe le taux à 18 %');
    const ventesProducteur = await appel('/orders/producer/sales', { jeton: jetons.producteur });
    verifier(ventesProducteur.donnees?.commissionRate === 0.18, 'le producteur voit le nouveau taux');

    if (!AVEC_COMMANDE) {
      alerte('commande de test non passée sur une API distante', 'relancer avec KZ_SCENARIO_COMMANDE=1 pour la tester');
    } else {
      const produit = produits.find((p) => (p.variants ?? []).some((v) => v.stock > 0));
      const format = produit?.variants.find((v) => v.stock > 0);
      if (!format) {
        ko('commande de test', 'aucun format en stock');
      } else {
        const commande = await appel('/orders', {
          methode: 'POST',
          corps: {
            customerName: 'Client Scénario',
            customerPhone: '+216 20 000 000',
            shippingAddress: 'Rue du Test, Tunis',
            city: 'Tunis',
            items: [{ productId: produit.id, variantId: format.id, quantity: 1 }],
          },
        });
        const ligne = commande.donnees?.items?.[0];
        verifier(commande.statut === 201, 'commande passée sur la vitrine', commande.donnees?.orderNumber ?? `HTTP ${commande.statut}`);
        if (ligne) {
          verifier(Number(ligne.commissionRate) === 0.18, 'la nouvelle commande applique le taux de 18 %');
          verifier(
            Math.abs(Number(ligne.commissionAmount) - arrondi2(Number(ligne.lineTotal) * 0.18)) <= 0.01,
            'commission calculée sur le prix du format',
            `${ligne.lineTotal} DT × 18 % = ${ligne.commissionAmount} DT`,
          );
          // Fiche produit, jamais mise en cache (le catalogue l'est 30 s).
          const stockDe = async () =>
            (await appel(`/products/catalog/${produit.id}`)).donnees?.variants?.find((v) => v.id === format.id)?.stock;
          const stockApres = await stockDe();
          verifier(stockApres === format.stock - 1, 'le stock du format diminue', `${format.stock} → ${stockApres}`);
          const annulation = await appel(`/orders/${commande.donnees.id}/status`, {
            methode: 'PATCH',
            jeton: jetons.admin,
            corps: { status: 'CANCELLED' },
          });
          const stockRendu = await stockDe();
          verifier(annulation.statut === 200 && stockRendu === format.stock, 'commande de test annulée, stock restitué', `${stockRendu}`);
        }
      }
    }
  } finally {
    if (typeof tauxInitial === 'number') {
      const retour = await appel('/commission', {
        methode: 'PUT',
        jeton: jetons.admin,
        corps: { rate: tauxInitial, reason: 'Fin du scénario de test : taux rétabli' },
      });
      verifier(retour.donnees?.rate === tauxInitial, 'taux initial rétabli', `${Math.round(tauxInitial * 10000) / 100} %`);
    }
  }

  // -- Acte 5 : blog -------------------------------------------------------------------
  section('Acte 5 — Gestion du blog depuis la console');
  const slug = `scenario-test-${Date.now().toString(36)}`;
  verifier(
    (await appel('/blog', { methode: 'POST', jeton: jetons.producteur, corps: { title: { fr: 'x' }, category: 'CONSEILS' } })).statut === 403,
    'un producteur ne peut pas écrire d’article (403)',
  );
  const cree = await appel('/blog', {
    methode: 'POST',
    jeton: jetons.admin,
    corps: {
      slug,
      category: 'ACTUALITES',
      title: { fr: 'Article de test du scénario', ar: 'مقال تجريبي', en: 'Scenario test article' },
      excerpt: { fr: 'Créé puis supprimé par le test automatisé.' },
      content: { fr: 'Premier paragraphe.\n\n## Intertitre\n\n- un point\n- un autre point\n\n> Encadré.' },
    },
  });
  const id = cree.donnees?.id;
  verifier(cree.statut === 201 && cree.donnees?.status === 'DRAFT', 'brouillon créé', slug);
  if (id) {
    try {
      verifier((await appel(`/blog/${slug}`)).statut === 404, 'un brouillon reste invisible du public');
      const publie = await appel(`/blog/${id}`, { methode: 'PATCH', jeton: jetons.admin, corps: { status: 'PUBLISHED' } });
      verifier(publie.donnees?.status === 'PUBLISHED' && !!publie.donnees?.publishedAt, 'article publié');
      const visible = await appel(`/blog/${slug}`);
      verifier(visible.statut === 200 && visible.donnees?.title?.ar === 'مقال تجريبي', 'article visible sur le site, en trois langues');
      const retire = await appel(`/blog/${id}`, { methode: 'PATCH', jeton: jetons.admin, corps: { status: 'DRAFT' } });
      verifier(retire.donnees?.status === 'DRAFT' && (await appel(`/blog/${slug}`)).statut === 404, 'article dépublié : il disparaît du site');
    } finally {
      const supprime = await appel(`/blog/${id}`, { methode: 'DELETE', jeton: jetons.admin });
      verifier(supprime.statut === 200, 'article de test supprimé');
    }
  }

  // -- Acte 6 : site web -----------------------------------------------------------------
  if (SITE) {
    section('Acte 6 — Le site web');
    const accueil = await fetch(SITE);
    const html = await accueil.text();
    verifier(accueil.status === 200 && html.includes('id="root"'), 'la page d’accueil se charge');
    const lien = await fetch(`${SITE}/blog/${articles[0]?.slug ?? 'x'}`);
    verifier(lien.status === 200, 'un lien d’article /blog/… s’ouvre directement');
    const banniere = await fetch(`${SITE}/images/banner.webp`);
    const poids = (await banniere.arrayBuffer()).byteLength;
    verifier(banniere.status === 200 && poids < 300_000, 'image d’accueil allégée (WebP)', `${Math.round(poids / 1024)} Ko`);
    const script = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
    if (script) {
      const js = await fetch(`${SITE}${script}`, { headers: { 'Accept-Encoding': 'gzip' } });
      const cache = js.headers.get('cache-control') ?? '';
      const kilo = Math.round((await js.arrayBuffer()).byteLength / 1024);
      verifier(kilo < 700, 'script principal allégé (portails chargés à la demande)', `${kilo} Ko`);
      verifier(/immutable|max-age=31536000/.test(cache), 'scripts mis en cache longue durée', cache || 'aucun Cache-Control');
    }
  }

  // -- Bilan -------------------------------------------------------------------------------
  console.log(`\n${GRAS}Bilan :${FIN} ${reussis} réussi(s), ${echecs} échec(s), ${alertes} alerte(s)`);
  if (echecs > 0) {
    console.log(`${ROUGE}Le scénario de démonstration ne passe pas entièrement.${FIN}`);
    process.exit(1);
  }
  console.log(`${VERT}Le scénario de démonstration passe de bout en bout.${FIN}`);
}

main().catch((err) => {
  console.error(`\n${ROUGE}Erreur pendant le scénario :${FIN} ${err.message}`);
  console.error("L'API est-elle démarrée ? (API_URL)");
  process.exit(1);
});
