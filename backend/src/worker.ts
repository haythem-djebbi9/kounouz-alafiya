import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * Processus worker dédié (§Infrastructure 9) : traite l'outbox d'événements
 * sans servir de trafic HTTP.
 *
 *   node dist/worker.js
 *
 * À combiner avec EVENTS_WORKER_ENABLED=false sur les instances d'API pour
 * faire évoluer séparément la charge web et la charge de traitement.
 */
async function bootstrap() {
  process.env.EVENTS_WORKER_ENABLED = 'true';
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Processus worker démarré.');
}

await bootstrap();
