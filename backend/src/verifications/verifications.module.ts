import { Module } from '@nestjs/common';
import { VerificationsController } from './verifications.controller.js';
import { VerificationsService } from './verifications.service.js';

@Module({
  controllers: [VerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService],
})
export class VerificationsModule {}
