import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LaboratoryService } from './laboratory.service.js';
import { CreateReferenceSampleDto } from './dto/create-reference-sample.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { SensitiveAction } from '../common/admin-override.js';

@ApiBearerAuth()
@ApiTags('reference-samples')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
@Controller('reference-samples')
export class ReferenceSamplesController {
  constructor(private readonly service: LaboratoryService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReferenceSampleDto) {
    return this.service.createReferenceSample(user.sub, dto);
  }

  @Get()
  findAll() {
    return this.service.findAllReferenceSamples();
  }
}
