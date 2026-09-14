import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VerificationsService } from './verifications.service.js';
import { CreateVerificationDto } from './dto/create-verification.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiBearerAuth()
@ApiTags('verifications')
@Controller('verifications')
export class VerificationsController {
  constructor(private readonly service: VerificationsService) {}

  // Décision réservée à ADMIN / VERIFICATION_TEAM — jamais Producteur ni Agent Terrain.
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVerificationDto) {
    return this.service.create(user.sub, dto);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOneForUser(id, user);
  }
}
