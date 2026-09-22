/**
 * Charge les données de démonstration si la base est vide.
 *
 * Sert au premier démarrage sur un hébergeur : la base y est créée vide, et
 * personne ne peut lancer le chargement depuis son poste quand le port 5432
 * est filtré par le réseau. Le conteneur, lui, atteint sa base.
 *
 * Le chargement commence par vider la base : on ne l'exécute donc que si elle
 * ne contient aucun utilisateur. Un redémarrage ne détruit jamais des données
 * existantes, et l'exécution reste sans effet une fois la base peuplée.
 */
import { createDbClient } from './db-client.js';

const prisma = await createDbClient();

let utilisateurs: number;
try {
  utilisateurs = await prisma.user.count();
} catch (erreur) {
  console.error('[amorçage] base illisible, chargement abandonné :', (erreur as Error).message);
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.$disconnect();

if (utilisateurs > 0) {
  console.log(`[amorçage] ${utilisateurs} utilisateurs déjà présents : chargement ignoré.`);
  process.exit(0);
}

console.log('[amorçage] base vide : chargement des données de démonstration...');
// seed.ts s'exécute au chargement du module et signale lui-même sa fin.
await import('./seed.js');
