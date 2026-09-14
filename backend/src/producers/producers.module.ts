import { Module } from '@nestjs/common';
import { ProducersController } from './producers.controller.js';
import { ProducersService } from './producers.service.js';

@Module({
  controllers: [ProducersController],
  providers: [ProducersService],
  exports: [ProducersService],
})
export class ProducersModule {}
