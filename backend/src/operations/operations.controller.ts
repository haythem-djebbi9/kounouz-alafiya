import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DomainEventStatus, Role } from '@prisma/client';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OperationsService } from './operations.service.js';

class UpdateSlaDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(720) requestReviewHours?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(90) collectionOverdueDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(90) sampleToLabDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(90) analysisToDecisionDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(180) verificationToPackagingDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(180) packagingToPublicationDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(180) settlementDays?: number;
}

/**
 * Supervision (§Monitoring) : santé technique, file d'événements et retards du
 * parcours. Les retards sont visibles de l'Équipe de Vérification ; la file
 * d'événements et les seuils relèvent de l'administration.
 */
@ApiBearerAuth()
@ApiTags('operations')
@Controller('operations')
export class OperationsController {
  constructor(
    private readonly operations: OperationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get('overview')
  async overview() {
    const started = Date.now();
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    const [events, aging] = await Promise.all([this.operations.eventsOverview(), this.operations.workflowAging()]);
    return {
      health: {
        database,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1_048_576),
        workerEnabled: process.env.EVENTS_WORKER_ENABLED !== 'false',
        responseMs: Date.now() - started,
      },
      events,
      aging,
    };
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get('aging')
  aging() {
    return this.operations.workflowAging();
  }

  @Roles(Role.ADMIN)
  @Get('events')
  events(
    @Query('status') status?: DomainEventStatus,
    @Query('eventType') eventType?: string,
    @Query('correlationId') correlationId?: string,
  ) {
    const valid = status && Object.values(DomainEventStatus).includes(status) ? status : undefined;
    return this.operations.listEvents(valid, eventType, correlationId);
  }

  @Roles(Role.ADMIN)
  @Post('events/:id/requeue')
  requeue(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.operations.requeue(id, user.sub);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get('settings/sla')
  sla() {
    return this.operations.getSla();
  }

  @Roles(Role.ADMIN)
  @Put('settings/sla')
  updateSla(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSlaDto) {
    return this.operations.updateSla(user.sub, dto as Record<string, unknown>);
  }
}
