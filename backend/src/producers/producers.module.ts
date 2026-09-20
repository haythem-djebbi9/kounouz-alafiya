import { Module } from '@nestjs/common';
import { ProducersController } from './producers.controller.js';
import { ProducersService } from './producers.service.js';
import { FarmsService } from './farms.service.js';

@Module({
  controllers: [ProducersController],
  providers: [ProducersService, FarmsService],
  exports: [ProducersService, FarmsService],
})
export class ProducersModule {}
