import { Module } from '@nestjs/common';
import { SamplesController } from './samples.controller.js';
import { SamplesService } from './samples.service.js';
import { VerificationPortalModule } from '../verification-portal/verification-portal.module.js';

@Module({
  imports: [VerificationPortalModule],
  controllers: [SamplesController],
  providers: [SamplesService],
  exports: [SamplesService],
})
export class SamplesModule {}
