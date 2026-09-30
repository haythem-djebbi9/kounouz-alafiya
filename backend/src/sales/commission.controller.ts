import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { CommissionService } from './commission.service.js';
import { UpdateCommissionDto } from './dto/sales.dto.js';

@ApiBearerAuth()
@ApiTags('commission')
@Controller('commission')
export class CommissionController {
  constructor(private readonly service: CommissionService) {}

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  @ApiOperation({ summary: 'Taux de commission en vigueur et historique des changements' })
  describe() {
    return this.service.describe();
  }

  @Roles(Role.ADMIN)
  @Put()
  @ApiOperation({ summary: 'Modifier le taux de commission — Admin uniquement, ventes futures seulement' })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateCommissionDto) {
    return this.service.update(user.sub, dto.rate, dto.reason);
  }
}
