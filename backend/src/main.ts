import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { uploadsAccessMiddleware } from './files/uploads-access.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Derrière nginx (et un éventuel proxy HTTPS en amont), req.ip ne vaut l'IP
  // réelle du visiteur que si l'on fait confiance aux proxys déclarés. Sans
  // cela, tous les visiteurs partagent la même limite de débit et le journal
  // des scans n'enregistre que l'IP du proxy. TRUST_PROXY = nombre de proxys
  // devant l'API (1 : nginx seul ; 2 : proxy HTTPS + nginx).
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  }

  // CORS : en production on restreint aux origines déclarées (§Sécurité 12).
  // CORS_ORIGINS accepte une liste séparée par des virgules ; vide = tout
  // autoriser, ce qui reste pratique en développement local.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors(
    corsOrigins.length > 0 ? { origin: corsOrigins, credentials: true } : { origin: true },
  );
  // /health et /ready restent à la racine : les orchestrateurs et load
  // balancers les attendent là, sans préfixe applicatif.
  app.setGlobalPrefix('api', { exclude: ['health', 'ready'] });
  // API versionnée (§Infrastructure 2) : toutes les routes répondent sous
  // /api/v1/... ; l'ancien chemin /api/... reste servi pour les clients
  // existants et les QR déjà en circulation.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: ['1', VERSION_NEUTRAL] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Fichiers téléversés — hors préfixe /api. Les visuels publics sont servis
  // librement ; les preuves et documents internes exigent une URL signée,
  // délivrée uniquement dans les réponses autorisées (§13 Sécurité).
  app.use('/uploads', uploadsAccessMiddleware);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const config = new DocumentBuilder()
    .setTitle('Kounouz Alafiya API')
    .setDescription(
      'API de traçabilité et de vérification du miel — de la collecte au consommateur.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
