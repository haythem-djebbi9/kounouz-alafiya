import { Module } from '@nestjs/common';
import { AntiFraudController } from './anti-fraud.controller.js';
import { AntiFraudService } from './anti-fraud.service.js';

@Module({
  controllers: [AntiFraudController],
  providers: [AntiFraudService],
  exports: [AntiFraudService],
})
export class AntiFraudModule {}
