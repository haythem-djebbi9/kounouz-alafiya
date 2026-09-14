import { Module } from '@nestjs/common';
import { SamplesController } from './samples.controller.js';
import { SamplesService } from './samples.service.js';

@Module({
  controllers: [SamplesController],
  providers: [SamplesService],
  exports: [SamplesService],
})
export class SamplesModule {}
