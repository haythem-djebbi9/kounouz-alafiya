import { Module } from '@nestjs/common';
import { QrCodesController } from './qr-codes.controller.js';
import { VerifyController } from './verify.controller.js';
import { QrCodesService } from './qr-codes.service.js';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module.js';

@Module({
  imports: [AntiFraudModule],
  controllers: [QrCodesController, VerifyController],
  providers: [QrCodesService],
  exports: [QrCodesService],
})
export class QrCodesModule {}
