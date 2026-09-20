import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderStatus, Role, SalesChannel } from '@prisma/client';
import { SalesService } from './sales.service.js';
import { CreateOrderDto, CreateStaffOrderDto, UpdateOrderStatusDto } from './dto/sales.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: SalesService) {}

  // Commande passée depuis le panier de la boutique en ligne (sans compte requis).
  @Public()
  @Post()
  @ApiOperation({ summary: 'Passer une commande depuis la boutique en ligne' })
  create(@Body() dto: CreateOrderDto) {
    return this.service.createOrder(dto, SalesChannel.ONLINE_STORE);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Post('staff')
  @ApiOperation({ summary: 'Enregistrer une vente partenaire / marketplace — équipe Kounouz' })
  createStaff(@CurrentUser() user: JwtPayload, @Body() dto: CreateStaffOrderDto) {
    const { channel, ...order } = dto;
    return this.service.createOrder(order, channel, user.sub);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll(@Query('status') status?: OrderStatus) {
    return this.service.findAllOrders(status);
  }

  @ApiBearerAuth()
  @Roles(Role.PRODUCER)
  @Get('producer/sales')
  @ApiOperation({ summary: 'Lignes de vente des produits du producteur connecté' })
  findMySales(@CurrentUser() user: JwtPayload) {
    return this.service.findProducerSales(user.sub);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateOrderStatus(id, user.sub, dto.status);
  }
}
