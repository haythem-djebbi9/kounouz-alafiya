import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { SettlementsController } from './settlements.controller.js';
import { SalesService } from './sales.service.js';

@Module({
  controllers: [OrdersController, SettlementsController],
  providers: [SalesService],
})
export class SalesModule {}
