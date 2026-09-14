import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(userId: string, action: string, entite: string, entiteId: string) {
    return this.prisma.auditLog.create({
      data: { userId, action, entite, entiteId },
    });
  }
}
