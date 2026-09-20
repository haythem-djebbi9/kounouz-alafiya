import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role, SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

const TICKET_INCLUDE = {
  user: { select: { id: true, name: true, email: true, role: true } },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true, role: true } } },
  },
} as const;

const STAFF_ROLES = [Role.ADMIN, Role.VERIFICATION_TEAM] as const;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        messages: { create: { authorId: userId, body: dto.message } },
      },
      include: TICKET_INCLUDE,
    });

    for (const role of STAFF_ROLES) {
      await this.notifications.notifyRole(
        role,
        NotificationType.SUPPORT_TICKET_UPDATE,
        'Nouveau ticket de support',
        `${ticket.user.name} a ouvert un ticket : "${ticket.subject}".`,
        'SupportTicket',
        ticket.id,
      );
    }

    return ticket;
  }

  findMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: TICKET_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findAllForStaff(status?: SupportTicketStatus) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      include: TICKET_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOneForUser(id: string, user: JwtPayload) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id }, include: TICKET_INCLUDE });
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }
    if (!this.isStaff(user) && ticket.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à ce ticket.");
    }
    return ticket;
  }

  async addMessage(id: string, user: JwtPayload, dto: CreateTicketMessageDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }
    const isStaff = this.isStaff(user);
    if (!isStaff && ticket.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à ce ticket.");
    }
    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException('Ce ticket est fermé.');
    }

    const message = await this.prisma.supportTicketMessage.create({
      data: { ticketId: id, authorId: user.sub, body: dto.body },
    });

    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: isStaff && ticket.status === SupportTicketStatus.OPEN ? SupportTicketStatus.IN_PROGRESS : ticket.status,
      },
    });

    if (isStaff) {
      await this.notifications.notify(
        ticket.userId,
        NotificationType.SUPPORT_TICKET_UPDATE,
        'Nouvelle réponse à votre ticket',
        `Une réponse a été ajoutée à votre ticket "${ticket.subject}".`,
        'SupportTicket',
        ticket.id,
      );
    } else {
      for (const role of STAFF_ROLES) {
        await this.notifications.notifyRole(
          role,
          NotificationType.SUPPORT_TICKET_UPDATE,
          'Nouveau message sur un ticket',
          `Un nouveau message a été ajouté au ticket "${ticket.subject}".`,
          'SupportTicket',
          ticket.id,
        );
      }
    }

    return message;
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: dto.status },
      include: TICKET_INCLUDE,
    });

    await this.notifications.notify(
      ticket.userId,
      NotificationType.SUPPORT_TICKET_UPDATE,
      'Mise à jour de votre ticket',
      `Le statut de votre ticket "${ticket.subject}" est maintenant : ${dto.status}.`,
      'SupportTicket',
      ticket.id,
    );

    return updated;
  }

  private isStaff(user: JwtPayload): boolean {
    return (STAFF_ROLES as readonly Role[]).includes(user.role);
  }
}
