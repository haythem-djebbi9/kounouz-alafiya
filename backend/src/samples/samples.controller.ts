import { Controller, Get, Param, Patch, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SamplesService } from './samples.service.js';
import { CreateSampleDto } from './dto/create-sample.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { SensitiveAction } from '../common/admin-override.js';

@ApiBearerAuth()
@ApiTags('samples')
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
@Controller('samples')
export class SamplesController {
  constructor(private readonly service: SamplesService) {}

  @Roles(Role.FIELD_AGENT)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSampleDto) {
    return this.service.create(user.sub, dto);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.FIELD_AGENT)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  // Portail Producteur : suivi en lecture seule de ses échantillons.
  @Roles(Role.PRODUCER)
  @Get('producer')
  findForProducer(@CurrentUser() user: JwtPayload) {
    return this.service.findForProducer(user.sub);
  }

  // Fiche interne d'un échantillon (chaîne de custody, scellé, preuves) :
  // jamais accessible à un CONSUMER, même authentifié (§Sécurité 19.5).
  // L'appartenance Agent / Producteur est vérifiée dans le service.
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM, Role.FIELD_AGENT, Role.PRODUCER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOneForUser(id, user);
  }

  @Roles(Role.FIELD_AGENT)
  @Patch(':id/in-transit')
  markInTransit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markInTransit(id, user.sub);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id/received')
  markReceived(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markReceived(id, user.sub);
  }
}
