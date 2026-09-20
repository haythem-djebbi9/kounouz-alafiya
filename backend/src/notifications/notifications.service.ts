import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

// Notifications internes à l'application uniquement (pas d'e-mail) —
// déclenchées par les services métier sur les événements réels suivants :
// demande acceptée, collecte disponible, échantillon reçu, analyse terminée,
// résultat de vérification, lot créé, produit publié.
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(userId: string, type: NotificationType, title: string, message: string, entite?: string, entiteId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { mutedNotificationTypes: true } });
    if (!user || user.mutedNotificationTypes.includes(type)) return;
    return this.prisma.notification.create({
      data: { userId, type, title, message, entite, entiteId },
    });
  }

  async notifyMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    entite?: string,
    entiteId?: string,
  ) {
    if (userIds.length === 0) return;
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: userIds }, NOT: { mutedNotificationTypes: { has: type } } },
      select: { id: true },
    });
    if (recipients.length === 0) return;
    await this.prisma.notification.createMany({
      data: recipients.map((u) => ({ userId: u.id, type, title, message, entite, entiteId })),
    });
  }

  async notifyRole(
    role: Role,
    type: NotificationType,
    title: string,
    message: string,
    entite?: string,
    entiteId?: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: { role, isActive: true, NOT: { mutedNotificationTypes: { has: type } } },
      select: { id: true },
    });
    await this.notifyMany(
      users.map((u) => u.id),
      type,
      title,
      message,
      entite,
      entiteId,
    );
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { mutedNotificationTypes: true } });
    return { mutedTypes: user?.mutedNotificationTypes ?? [] };
  }

  async setPreference(userId: string, type: NotificationType, enabled: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { mutedNotificationTypes: true } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    const muted = new Set(user.mutedNotificationTypes);
    if (enabled) {
      muted.delete(type);
    } else {
      muted.add(type);
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mutedNotificationTypes: Array.from(muted) } });
    return { mutedTypes: Array.from(muted) };
  }

  findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification introuvable.');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException("Cette notification ne vous appartient pas.");
    }
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
