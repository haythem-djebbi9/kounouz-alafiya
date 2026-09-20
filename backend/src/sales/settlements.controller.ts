import { BadRequestException, Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { SalesService } from './sales.service.js';
import { PaySettlementDto } from './dto/sales.dto.js';
import { buildSettlementReceiptPdf } from './settlement-receipt.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

@ApiBearerAuth()
@ApiTags('settlements')
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly service: SalesService) {}

  @Roles(Role.PRODUCER)
  @Get('mine')
  @ApiOperation({ summary: 'Règlements mensuels du producteur connecté' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMySettlements(user.sub);
  }

  @Roles(Role.PRODUCER)
  @Get('mine/:period')
  findMineOne(@CurrentUser() user: JwtPayload, @Param('period') period: string) {
    if (!PERIOD_PATTERN.test(period)) throw new BadRequestException('Période invalide.');
    return this.service.findMySettlement(user.sub, period);
  }

  @Roles(Role.PRODUCER)
  @Get('mine/:period/receipt')
  async receipt(@CurrentUser() user: JwtPayload, @Param('period') period: string, @Res() res: Response) {
    if (!PERIOD_PATTERN.test(period)) throw new BadRequestException('Période invalide.');
    const settlement = await this.service.findMySettlement(user.sub, period);
    if (settlement.status !== 'PAID') {
      throw new BadRequestException("Le reçu n'est disponible qu'après le versement.");
    }
    const pdf = await buildSettlementReceiptPdf(settlement);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-${settlement.id}.pdf"`);
    res.send(pdf);
  }

  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll() {
    return this.service.findAllSettlements();
  }

  @Roles(Role.ADMIN)
  @Post('pay')
  @ApiOperation({ summary: "Marquer une période comme payée — Admin uniquement" })
  pay(@CurrentUser() user: JwtPayload, @Body() dto: PaySettlementDto) {
    return this.service.paySettlement(user.sub, dto);
  }
}
