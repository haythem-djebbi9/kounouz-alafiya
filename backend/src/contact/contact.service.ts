import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateContactMessageDto } from './dto/create-contact-message.dto.js';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateContactMessageDto) {
    return this.prisma.contactMessage.create({ data: dto });
  }

  findAll() {
    return this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async markRead(id: string) {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException('Message introuvable.');
    }
    return this.prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
  }
}
