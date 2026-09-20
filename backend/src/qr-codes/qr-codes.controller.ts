import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { QrCodesService } from './qr-codes.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateQrCodeStatusDto } from './dto/update-qr-code-status.dto.js';
import { SensitiveAction } from '../common/admin-override.js';

@ApiBearerAuth()
@ApiTags('qr-codes')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
// Actions opérationnelles « A* » : override admin motivé et audité.
@SensitiveAction()
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

  @Patch(':qrId/status')
  setActive(@Param('qrId') qrId: string, @Body() dto: UpdateQrCodeStatusDto) {
    return this.service.setActive(qrId, dto.isActive);
  }
}
