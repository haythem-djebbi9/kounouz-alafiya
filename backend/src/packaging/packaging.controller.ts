import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PackagingService } from './packaging.service.js';
import { CreatePackagingDto } from './dto/create-packaging.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiBearerAuth()
@ApiTags('packaging')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
@Controller('packagings')
export class PackagingController {
  constructor(private readonly service: PackagingService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePackagingDto) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.complete(id, user.sub);
  }
}
