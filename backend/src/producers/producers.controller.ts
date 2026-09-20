import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProducersService } from './producers.service.js';
import { UpdateProducerDto } from './dto/update-producer.dto.js';
import { UpdateProducerStatusDto } from './dto/update-producer-status.dto.js';
import { CreateFarmDto, UpdateFarmDto } from './dto/farm.dto.js';
import { FarmsService } from './farms.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiBearerAuth()
@ApiTags('producers')
@Controller('producers')
export class ProducersController {
  constructor(
    private readonly producersService: ProducersService,
    private readonly farms: FarmsService,
  ) {}

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll() {
    return this.producersService.findAll();
  }

  @Roles(Role.PRODUCER)
  @Get('me')
  findMe(@CurrentUser() user: JwtPayload) {
    return this.producersService.findByUserId(user.sub);
  }

  @Roles(Role.PRODUCER)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProducerDto) {
    return this.producersService.updateByUserId(user.sub, dto);
  }

  // --- Ruchers du producteur connecté ----------------------------------------

  @Roles(Role.PRODUCER)
  @Get('me/farms')
  myFarms(@CurrentUser() user: JwtPayload) {
    return this.farms.listMine(user.sub);
  }

  @Roles(Role.PRODUCER)
  @Post('me/farms')
  createFarm(@CurrentUser() user: JwtPayload, @Body() dto: CreateFarmDto) {
    return this.farms.create(user.sub, dto);
  }

  @Roles(Role.PRODUCER)
  @Patch('me/farms/:farmId')
  updateFarm(@CurrentUser() user: JwtPayload, @Param('farmId') farmId: string, @Body() dto: UpdateFarmDto) {
    return this.farms.update(user.sub, farmId, dto);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get(':id/farms')
  producerFarms(@Param('id') id: string) {
    return this.farms.listForProducer(id);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.producersService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateProducerStatusDto) {
    return this.producersService.updateStatus(id, user.sub, dto);
  }
}
