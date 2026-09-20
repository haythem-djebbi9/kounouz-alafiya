import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsUUID } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { AssistantService } from './assistant.service.js';

class VerificationRefDto {
  @IsUUID()
  verificationId!: string;
}
class SampleRefDto {
  @IsUUID()
  sampleId!: string;
}
class RequestRefDto {
  @IsUUID()
  requestId!: string;
}
class AlertRefDto {
  @IsUUID()
  alertId!: string;
}

/**
 * Passerelle d'assistance (§6 et §19 Architecture IA).
 *
 * Mêmes contrôles que le reste de l'API (authentification, rôle, propriété) ;
 * les réponses sont en lecture seule et ne modifient aucun enregistrement.
 * Ces points d'accès ne remplacent jamais les routes de transition d'état.
 */
@ApiBearerAuth()
@ApiTags('assistant')
@Throttle({ default: { ttl: 60_000, limit: 30 } })
@Controller('ai')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post('verification/case-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Synthèse d'un dossier de vérification (sans décision)" })
  caseSummary(@Body() dto: VerificationRefDto, @CurrentUser() user: JwtPayload) {
    return this.assistant.caseSummary(dto.verificationId, user.sub);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post('verification/missing-evidence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pièces manquantes avant décision' })
  missingEvidence(@Body() dto: SampleRefDto, @CurrentUser() user: JwtPayload) {
    return this.assistant.missingEvidence(dto.sampleId, user.sub);
  }

  @Roles(Role.PRODUCER, Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post('producer/status-explanation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Explication de l'avancement d'une demande (producteur propriétaire)" })
  statusExplanation(@Body() dto: RequestRefDto, @CurrentUser() user: JwtPayload) {
    return this.assistant.producerStatusExplanation(dto.requestId, user);
  }

  @Roles(Role.ADMIN)
  @Post('admin/analytics-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Synthèse d'exploitation" })
  analyticsSummary(@CurrentUser() user: JwtPayload) {
    return this.assistant.analyticsSummary(user.sub);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post('anti-counterfeit/explain-alert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Explication d'une alerte (signal interne)" })
  explainAlert(@Body() dto: AlertRefDto, @CurrentUser() user: JwtPayload) {
    return this.assistant.explainAlert(dto.alertId, user.sub);
  }
}
