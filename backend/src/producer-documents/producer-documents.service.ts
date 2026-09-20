import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  ProducerDocumentStatus,
  ProducerDocumentType,
  Role,
} from '@prisma/client';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

// Stockage HORS du dossier statique /uploads : ces pièces (CIN, justificatifs)
// ne sont servies qu'au producteur concerné et à l'équipe Kounouz, via
// GET /producer-documents/:id/file.
export const DOCUMENTS_DIR = join(process.cwd(), 'private-uploads', 'documents');
if (!existsSync(DOCUMENTS_DIR)) {
  mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// Pièces exigées avant de pouvoir soumettre une demande de vérification.
export const REQUIRED_DOCUMENT_TYPES: ProducerDocumentType[] = [
  ProducerDocumentType.NATIONAL_ID,
  ProducerDocumentType.FARM_REGISTRATION,
];

const DOCUMENT_SELECT = {
  id: true,
  producerId: true,
  type: true,
  fileName: true,
  mimeType: true,
  size: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class ProducerDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async producerForUser(userId: string) {
    const producer = await this.prisma.producer.findUnique({ where: { userId } });
    if (!producer) {
      throw new NotFoundException('Aucun profil producteur pour ce compte.');
    }
    return producer;
  }

  findMine(userId: string) {
    return this.producerForUser(userId).then((producer) =>
      this.prisma.producerDocument.findMany({
        where: { producerId: producer.id },
        select: DOCUMENT_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  findForProducer(producerId: string) {
    return this.prisma.producerDocument.findMany({
      where: { producerId },
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Un nouveau dépôt pour un type unique (hors "OTHER") remplace l'ancien
  // document non validé : le producteur corrige un justificatif refusé sans
  // accumuler de doublons.
  async upload(userId: string, type: ProducerDocumentType, file: Express.Multer.File) {
    const producer = await this.producerForUser(userId);

    if (type !== ProducerDocumentType.OTHER) {
      const existing = await this.prisma.producerDocument.findMany({ where: { producerId: producer.id, type } });
      if (existing.some((d) => d.status === ProducerDocumentStatus.VERIFIED)) {
        this.removeStoredFile(file.filename);
        throw new BadRequestException('Ce document a déjà été validé par Kounouz.');
      }
      for (const doc of existing) {
        await this.prisma.producerDocument.delete({ where: { id: doc.id } });
        this.removeStoredFile(doc.storedName);
      }
    }

    const document = await this.prisma.producerDocument.create({
      data: {
        producerId: producer.id,
        type,
        fileName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      },
      select: DOCUMENT_SELECT,
    });
    await this.audit.log(userId, 'UPLOAD_PRODUCER_DOCUMENT', 'ProducerDocument', document.id);
    return document;
  }

  async getFileForUser(id: string, user: JwtPayload) {
    const document = await this.prisma.producerDocument.findUnique({
      where: { id },
      include: { producer: { select: { userId: true } } },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    const isStaff = user.role === Role.ADMIN || user.role === Role.VERIFICATION_TEAM;
    if (!isStaff && document.producer.userId !== user.sub) {
      throw new ForbiddenException("Vous n'avez pas accès à ce document.");
    }
    const path = join(DOCUMENTS_DIR, document.storedName);
    if (!existsSync(path)) {
      throw new NotFoundException('Fichier introuvable sur le serveur.');
    }
    return { path, mimeType: document.mimeType, fileName: document.fileName };
  }

  async remove(id: string, userId: string) {
    const document = await this.prisma.producerDocument.findUnique({
      where: { id },
      include: { producer: { select: { userId: true } } },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    if (document.producer.userId !== userId) {
      throw new ForbiddenException("Vous n'avez pas accès à ce document.");
    }
    if (document.status === ProducerDocumentStatus.VERIFIED) {
      throw new BadRequestException('Un document validé ne peut plus être supprimé.');
    }
    await this.prisma.producerDocument.delete({ where: { id } });
    this.removeStoredFile(document.storedName);
    await this.audit.log(userId, 'DELETE_PRODUCER_DOCUMENT', 'ProducerDocument', id);
  }

  async review(id: string, reviewerId: string, status: ProducerDocumentStatus, note?: string) {
    const document = await this.prisma.producerDocument.findUnique({
      where: { id },
      include: { producer: true },
    });
    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }
    const updated = await this.prisma.producerDocument.update({
      where: { id },
      data: { status, reviewNote: note ?? null, reviewedById: reviewerId, reviewedAt: new Date() },
      select: DOCUMENT_SELECT,
    });
    await this.audit.log(reviewerId, `DOCUMENT_${status}`, 'ProducerDocument', id);
    await this.notifications.notify(
      document.producer.userId,
      NotificationType.DOCUMENT_REVIEWED,
      status === ProducerDocumentStatus.VERIFIED ? 'Document validé' : 'Document refusé',
      status === ProducerDocumentStatus.VERIFIED
        ? `Votre document "${document.fileName}" a été validé par Kounouz.`
        : `Votre document "${document.fileName}" a été refusé${note ? ` : ${note}` : '.'}`,
      'ProducerDocument',
      id,
    );
    return updated;
  }

  // Utilisé à la soumission d'une demande : chaque pièce exigée doit être
  // déposée et ne pas avoir été refusée.
  async missingRequiredDocuments(producerId: string) {
    const documents = await this.prisma.producerDocument.findMany({
      where: { producerId, type: { in: REQUIRED_DOCUMENT_TYPES }, status: { not: ProducerDocumentStatus.REJECTED } },
      select: { type: true },
    });
    const present = new Set(documents.map((d) => d.type));
    return REQUIRED_DOCUMENT_TYPES.filter((type) => !present.has(type));
  }

  private removeStoredFile(storedName: string) {
    const path = join(DOCUMENTS_DIR, storedName);
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // best-effort : l'enregistrement en base fait foi
    }
  }
}
