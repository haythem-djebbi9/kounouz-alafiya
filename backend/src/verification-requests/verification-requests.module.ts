import { Module } from '@nestjs/common';
import { VerificationRequestsController } from './verification-requests.controller.js';
import { VerificationRequestsService } from './verification-requests.service.js';
import { ProducerDocumentsModule } from '../producer-documents/producer-documents.module.js';
import { ProducersModule } from '../producers/producers.module.js';

@Module({
  imports: [ProducerDocumentsModule, ProducersModule],
  controllers: [VerificationRequestsController],
  providers: [VerificationRequestsService],
  exports: [VerificationRequestsService],
})
export class VerificationRequestsModule {}
