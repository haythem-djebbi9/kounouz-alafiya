import { Module } from '@nestjs/common';
import { VerificationRequestsController } from './verification-requests.controller.js';
import { VerificationRequestsService } from './verification-requests.service.js';

@Module({
  controllers: [VerificationRequestsController],
  providers: [VerificationRequestsService],
  exports: [VerificationRequestsService],
})
export class VerificationRequestsModule {}
