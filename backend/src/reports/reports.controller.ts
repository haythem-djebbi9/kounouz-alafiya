import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service.js';
import { buildOperationsPdf } from './pdf-report.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiBearerAuth()
@ApiTags('reports')
@Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('operations')
  getOperations() {
    return this.service.getOperationsSummary();
  }

  @Get('by-producer')
  getByProducer() {
    return this.service.getByProducer();
  }

  @Get('anti-fraud')
  getAntiFraud() {
    return this.service.getAntiFraudStats();
  }

  @Get('operations/export')
  async exportOperations(@Query('format') format: string | undefined, @Res({ passthrough: true }) res: Response) {
    if (format === 'pdf') {
      const summary = await this.service.getOperationsSummary();
      const pdf = await buildOperationsPdf(summary);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="rapport-operations.pdf"');
      return res.send(pdf);
    }
    const csv = await this.service.exportOperationsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-operations.csv"');
    return res.send(csv);
  }

  @Get('by-producer/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="rapport-producteurs.csv"')
  async exportByProducer() {
    return this.service.exportByProducerCsv();
  }
}
