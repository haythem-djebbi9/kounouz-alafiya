import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ContactService } from './contact.service.js';
import { CreateContactMessageDto } from './dto/create-contact-message.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateContactMessageDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.VERIFICATION_TEAM)
  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }
}
