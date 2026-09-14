import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProducersService } from './producers.service.js';
import { UpdateProducerDto } from './dto/update-producer.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiBearerAuth()
@ApiTags('producers')
@Controller('producers')
export class ProducersController {
  constructor(private readonly producersService: ProducersService) {}

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

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.producersService.findOne(id);
  }
}
