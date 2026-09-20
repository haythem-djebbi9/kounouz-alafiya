import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

// Sondes d'exploitation (§Observabilité 4) :
//  - /health : le process répond (liveness) — ne touche aucune dépendance ;
//  - /ready  : le service peut servir du trafic (readiness) — vérifie la base.
// Volontairement hors limitation de débit : un orchestrateur les appelle
// toutes les quelques secondes.
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness — le process est vivant' })
  health() {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — dépendances disponibles (base de données)' })
  async ready() {
    const checks: Record<string, 'up' | 'down'> = { database: 'down', eventQueue: 'down' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
      // La file d'événements vit dans la base (outbox) : on vérifie qu'elle
      // est lisible, ce qui couvre aussi la présence des migrations.
      await this.prisma.domainEvent.count({ where: { status: 'DEAD_LETTER' } });
      checks.eventQueue = 'up';
    } catch {
      // On renvoie 503 : l'orchestrateur retire l'instance du service au lieu
      // de lui envoyer du trafic qui échouerait.
      throw new ServiceUnavailableException({ status: 'unavailable', checks });
    }
    return { status: 'ready', checks, timestamp: new Date().toISOString() };
  }
}
