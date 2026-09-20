import { Module } from '@nestjs/common';
import { ProducerDocumentsController } from './producer-documents.controller.js';
import { ProducerDocumentsService } from './producer-documents.service.js';

@Module({
  controllers: [ProducerDocumentsController],
  providers: [ProducerDocumentsService],
  exports: [ProducerDocumentsService],
})
export class ProducerDocumentsModule {}
