import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { SettlementsController } from './settlements.controller.js';
import { CommissionController } from './commission.controller.js';
import { SalesService } from './sales.service.js';
import { CommissionService } from './commission.service.js';

@Module({
  controllers: [OrdersController, SettlementsController, CommissionController],
  providers: [SalesService, CommissionService],
})
export class SalesModule {}
