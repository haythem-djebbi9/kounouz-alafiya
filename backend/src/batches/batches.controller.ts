import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BatchesService } from './batches.service.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { SensitiveAction } from '../common/admin-override.js';

@ApiBearerAuth()
@ApiTags('batches')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
@Controller('batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBatchDto) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.PRODUCER)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMineForProducer(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
