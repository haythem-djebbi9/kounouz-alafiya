import { Module } from '@nestjs/common';
import { SealsController } from './seals.controller.js';
import { SealsService } from './seals.service.js';

@Module({
  controllers: [SealsController],
  providers: [SealsService],
  exports: [SealsService],
})
export class SealsModule {}
