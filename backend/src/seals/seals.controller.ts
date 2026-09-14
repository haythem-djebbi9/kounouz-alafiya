import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SealsService } from './seals.service.js';
import { CreateSealDto } from './dto/create-seal.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiBearerAuth()
@ApiTags('seals')
@Controller('seals')
export class SealsController {
  constructor(private readonly service: SealsService) {}

  @Roles(Role.FIELD_AGENT)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSealDto) {
    return this.service.create(user.sub, dto);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM, Role.FIELD_AGENT)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM, Role.FIELD_AGENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
