import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LaboratoryService } from './laboratory.service.js';
import { CreateLabAnalysisDto } from './dto/create-lab-analysis.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { SensitiveAction } from '../common/admin-override.js';

// Réservé à ADMIN / VERIFICATION_TEAM : le Producteur et l'Agent Terrain ne
// peuvent jamais saisir ou modifier un résultat de laboratoire.
@ApiBearerAuth()
@ApiTags('lab-analyses')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
@Controller('lab-analyses')
export class LabAnalysesController {
  constructor(private readonly service: LaboratoryService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLabAnalysisDto) {
    return this.service.createAnalysis(user.sub, dto);
  }

  @Get()
  findAll() {
    return this.service.findAllAnalyses();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneAnalysis(id);
  }
}
