import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

/**
 * Choisit le transport vers PostgreSQL.
 *
 * Par défaut, Prisma se connecte en TCP sur le port 5432. Certains
 * hébergeurs n'atteignent pas ce port sur une base Neon : la connexion
 * échoue aussitôt et Prisma répond `P1001: Can't reach database server`
 * alors que la base répond parfaitement par ailleurs. C'est le cas depuis
 * Render, où l'API redémarrait en boucle sans jamais joindre Neon.
 *
 * `KZ_DB_WEBSOCKET=1` fait passer les requêtes par le WebSocket de Neon,
 * sur le port 443 — celui des sites web, qui n'est jamais filtré. Les
 * requêtes et les transactions sont identiques ; seul le transport change.
 *
 * Sans la variable, rien ne change : le TCP habituel est conservé, y
 * compris vers un PostgreSQL local ou un autre hébergeur.
 */
function optionsDuClient(): ConstructorParameters<typeof PrismaClient>[0] {
  if (process.env.KZ_DB_WEBSOCKET !== '1') {
    return undefined;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('KZ_DB_WEBSOCKET=1 exige DATABASE_URL.');
  }
  if (!/neon\.tech/.test(connectionString)) {
    throw new Error("KZ_DB_WEBSOCKET=1 ne fonctionne qu'avec une base Neon.");
  }

  // Node n'expose pas de WebSocket utilisable par le pilote Neon.
  neonConfig.webSocketConstructor = ws;

  return { adapter: new PrismaNeon({ connectionString }) };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super(optionsDuClient());
  }

  async onModuleInit() {
    if (process.env.KZ_DB_WEBSOCKET === '1') {
      this.logger.log('Connexion à la base par le WebSocket Neon (port 443).');
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
