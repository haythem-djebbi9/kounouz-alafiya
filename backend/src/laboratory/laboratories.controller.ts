import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LaboratoryService } from './laboratory.service.js';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiBearerAuth()
@ApiTags('laboratories')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
@Controller('laboratories')
export class LaboratoriesController {
  constructor(private readonly service: LaboratoryService) {}

  @Post()
  create(@Body() dto: CreateLaboratoryDto) {
    return this.service.createLaboratory(dto);
  }

  @Get()
  findAll() {
    return this.service.findAllLaboratories();
  }
}
