import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module.js';

@Module({
  imports: [AntiFraudModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
