import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, SupportTicketStatus } from '@prisma/client';
import { SupportService } from './support.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiBearerAuth()
@ApiTags('support')
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTicketDto) {
    return this.service.createTicket(user.sub, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  @Get()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  findAll(@Query('status') status?: SupportTicketStatus) {
    return this.service.findAllForStaff(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOneForUser(id, user);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateTicketMessageDto) {
    return this.service.addMessage(id, user, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.service.updateStatus(id, dto);
  }
}
