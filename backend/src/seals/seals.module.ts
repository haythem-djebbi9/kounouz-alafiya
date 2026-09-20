import { Module } from '@nestjs/common';
import { SealsController } from './seals.controller.js';
import { SealsService } from './seals.service.js';
import { VerificationPortalModule } from '../verification-portal/verification-portal.module.js';

@Module({
  imports: [VerificationPortalModule],
  controllers: [SealsController],
  providers: [SealsService],
  exports: [SealsService],
})
export class SealsModule {}
