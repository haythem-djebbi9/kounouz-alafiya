import { PrismaClient } from '@prisma/client';

/**
 * Construit le client Prisma des scripts de chargement de données.
 *
 * Par défaut, Prisma parle à PostgreSQL en TCP sur le port 5432. Ce port est
 * bloqué par la plupart des VPN (Proton VPN, NordVPN…), par les pare-feux
 * d'entreprise et par certains opérateurs : la connexion s'ouvre puis se coupe
 * aussitôt, et Prisma répond `P1001: Can't reach database server` alors que la
 * base est parfaitement joignable. `Test-NetConnection` affiche « ouvert » dans
 * ce cas : seul un vrai échange avec le serveur fait foi.
 *
 * `KZ_DB_WEBSOCKET=1` fait passer la connexion par le WebSocket de Neon, sur le
 * port 443 — celui des sites web, que ces réseaux laissent toujours passer. Les
 * requêtes et les transactions sont les mêmes ; seul le transport change.
 * Réservé aux bases Neon. Sans la variable, rien ne change : le chargement
 * utilise le TCP habituel, y compris vers la base locale.
 */
export async function createDbClient(): Promise<PrismaClient> {
  if (process.env.KZ_DB_WEBSOCKET !== '1') {
    return new PrismaClient();
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('KZ_DB_WEBSOCKET=1 exige DATABASE_URL.');
  }
  if (!/neon\.tech/.test(connectionString)) {
    throw new Error(
      "KZ_DB_WEBSOCKET=1 ne fonctionne qu'avec une base Neon. " +
        'Retirez la variable pour une base locale ou un autre hébergeur.',
    );
  }

  // Importés ici seulement : ces paquets ne servent qu'au chargement des
  // données et sont absents de l'image de production (devDependencies).
  const [{ PrismaNeon }, { neonConfig }, ws] = await Promise.all([
    import('@prisma/adapter-neon'),
    import('@neondatabase/serverless'),
    import('ws'),
  ]);

  // Node n'a pas de WebSocket utilisable par le driver Neon : on lui fournit
  // celui du paquet `ws`.
  neonConfig.webSocketConstructor = ws.default;

  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}
