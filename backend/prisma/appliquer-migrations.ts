/**
 * Applique les migrations Prisma par le WebSocket de Neon (port 443).
 *
 * `prisma migrate deploy` passe obligatoirement par le port 5432, que les VPN
 * et les pare-feux bloquent (erreur `P1001`). Ce script fait le même travail
 * par le port 443 : il exécute les `migration.sql` non encore appliquées, dans
 * l'ordre, et inscrit chacune dans `_prisma_migrations` avec son empreinte —
 * si bien que `prisma migrate status`, plus tard et sans VPN, les reconnaît.
 *
 *   KZ_DB_WEBSOCKET=1 DATABASE_URL="postgresql://…neon.tech/…" \
 *     npx tsx prisma/appliquer-migrations.ts
 *
 * Réservé aux bases Neon. Pour une base ordinaire, utilisez `migrate deploy`.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dossierMigrations = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

// Lancé seul, ce script ne charge pas `@prisma/client` : personne ne lit le
// `.env` à sa place. On s'en charge, sans écraser une variable déjà posée par
// l'appelant (le script PowerShell, par exemple).
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'));
  } catch {
    // Pas de .env : l'adresse doit alors venir de l'environnement.
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL est absent : renseignez-le dans backend\.env ou dans l'environnement.");
  process.exit(1);
}
if (!/neon\.tech/.test(connectionString)) {
  console.error("Ce script ne vise que les bases Neon. Utilisez `npx prisma migrate deploy`.");
  process.exit(1);
}

const { Pool, neonConfig } = await import('@neondatabase/serverless');
const ws = await import('ws');
neonConfig.webSocketConstructor = ws.default;

const pool = new Pool({ connectionString });

try {
  // Table d'historique : Prisma la crée lui-même au premier `migrate deploy`.
  // Sa définition est figée depuis Prisma 2 et sert de contrat entre les deux.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" varchar(36) PRIMARY KEY NOT NULL,
      "checksum" varchar(64) NOT NULL,
      "finished_at" timestamptz,
      "migration_name" varchar(255) NOT NULL,
      "logs" text,
      "rolled_back_at" timestamptz,
      "started_at" timestamptz NOT NULL DEFAULT now(),
      "applied_steps_count" integer NOT NULL DEFAULT 0
    )`);

  const dejaFaites = new Set<string>(
    (
      await pool.query<{ migration_name: string }>(
        `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
      )
    ).rows.map((r) => r.migration_name),
  );

  const entrees = await readdir(dossierMigrations, { withFileTypes: true });
  // Les dossiers de migration sont horodatés : l'ordre alphabétique est
  // l'ordre chronologique, celui que Prisma applique.
  const migrations = entrees
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let appliquees = 0;
  for (const nom of migrations) {
    if (dejaFaites.has(nom)) {
      console.log(`  deja appliquee : ${nom}`);
      continue;
    }

    const sql = await readFile(path.join(dossierMigrations, nom, 'migration.sql'), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    process.stdout.write(`  application   : ${nom} … `);

    // Une transaction par migration, comme `migrate deploy` : une migration
    // interrompue ne laisse pas la base à moitié transformée.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
         VALUES ($1, $2, $3, now(), now(), 1)`,
        [randomUUID(), checksum, nom],
      );
      await client.query('COMMIT');
      appliquees += 1;
      console.log('ok');
    } catch (erreur) {
      await client.query('ROLLBACK').catch(() => {});
      console.log('ECHEC');
      throw erreur;
    } finally {
      client.release();
    }
  }

  console.log(
    appliquees === 0
      ? 'Aucune migration a appliquer : la base est a jour.'
      : `${appliquees} migration(s) appliquee(s).`,
  );
} finally {
  await pool.end();
}
