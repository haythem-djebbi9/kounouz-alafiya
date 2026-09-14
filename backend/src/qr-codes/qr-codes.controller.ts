import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { QrCodesService } from './qr-codes.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiBearerAuth()
@ApiTags('qr-codes')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly service: QrCodesService) {}

  @Get()
  findAll() {
    return this.service.findAllForAdmin();
  }

  @Get(':qrId/scans')
  findScans(@Param('qrId') qrId: string) {
    return this.service.findScans(qrId);
  }
}
