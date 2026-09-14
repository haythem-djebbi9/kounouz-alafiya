import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AntiFraudService } from './anti-fraud.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiBearerAuth()
@ApiTags('anti-fraud')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
@Controller('anti-fraud')
export class AntiFraudController {
  constructor(private readonly service: AntiFraudService) {}

  @Get('flagged-scans')
  findFlagged() {
    return this.service.findFlaggedScans();
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }
}
