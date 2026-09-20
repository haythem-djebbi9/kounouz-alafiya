import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, Role, VerificationRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ReviewActionDto, ReviewDecision } from './dto/review-action.dto.js';
import { ListRequestsQueryDto, RequestTab } from './dto/list-requests-query.dto.js';
import { DomainEventsService } from '../events/domain-events.service.js';
import { EventType } from '../events/event-types.js';

// Regroupement métier des statuts derrière les onglets du portail. Un dossier
// « In Laboratory » couvre tout l'intervalle entre l'acceptation et la
// décision : du point de vue du vérificateur, il est parti en analyse.
export const TAB_STATUSES: Record<Exclude<RequestTab, 'ALL'>, VerificationRequestStatus[]> = {
  UNDER_REVIEW: ['NEW', 'IN_REVIEW', 'INFO_REQUESTED'],
  IN_LABORATORY: [
    'ACCEPTED',
    'COLLECTION_SCHEDULED',
    'SAMPLE_COLLECTED',
    'UNDER_ANALYSIS',
    'VERIFICATION_PENDING',
  ],
  VERIFIED: ['VERIFIED'],
  REJECTED: ['REJECTED', 'NOT_VERIFIED'],
};

// Le producteur pilote uniquement DRAFT -> NEW. Tout ce qui suit appartient à
// Kounouz (cahier des charges §1 : « Kounouz controls the verification
// process »), d'où une table de transitions volontairement stricte.
const ALLOWED_REVIEW_TRANSITIONS: Record<string, VerificationRequestStatus[]> = {
  NEW: ['IN_REVIEW', 'INFO_REQUESTED', 'ACCEPTED', 'REJECTED'],
  IN_REVIEW: ['INFO_REQUESTED', 'ACCEPTED', 'REJECTED'],
  INFO_REQUESTED: ['IN_REVIEW', 'ACCEPTED', 'REJECTED'],
};

const LIST_SELECT = {
  id: true,
  requestCode: true,
  honeyType: true,
  status: true,
  quantity: true,
  batchNumber: true,
  collectionLocation: true,
  governorate: true,
  delegation: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  producer: { select: { id: true, name: true, farmName: true, governorate: true, avatarUrl: true } },
  assignedTo: { select: { id: true, name: true } },
  samples: { select: { id: true, sampleCode: true, status: true } },
  verifications: { select: { id: true, status: true, isDraft: true } },
} as const;

const DETAIL_INCLUDE = {
  producer: { include: { user: { select: { email: true } } } },
  assignedTo: { select: { id: true, name: true, email: true } },
  samples: {
    include: {
      seal: true,
      collectedBy: { select: { id: true, name: true } },
      labAnalyses: { select: { id: true, status: true, workflowStatus: true, analysisDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  },
  verifications: {
    include: { decidedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  },
  comments: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  },
  documents: {
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  },
} as const;

@Injectable()
export class PortalRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  // --- Liste & compteurs -------------------------------------------------

  private whereFor(query: ListRequestsQueryDto): Prisma.VerificationRequestWhereInput {
    // Les brouillons producteur ne sortent jamais côté Kounouz.
    const where: Prisma.VerificationRequestWhereInput = {
      status: { not: VerificationRequestStatus.DRAFT },
    };

    if (query.tab && query.tab !== 'ALL') {
      where.status = { in: TAB_STATUSES[query.tab] };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.governorate) {
      where.governorate = query.governorate;
    }
    if (query.honeyType) {
      where.honeyType = { contains: query.honeyType, mode: 'insensitive' };
    }
    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }
    if (query.from || query.to) {
      where.submittedAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { requestCode: { contains: search, mode: 'insensitive' } },
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { honeyType: { contains: search, mode: 'insensitive' } },
        { collectionLocation: { contains: search, mode: 'insensitive' } },
        { producer: { name: { contains: search, mode: 'insensitive' } } },
        { producer: { farmName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  async list(query: ListRequestsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const where = this.whereFor(query);

    const orderBy: Prisma.VerificationRequestOrderByWithRelationInput =
      query.sort === 'OLDEST'
        ? { submittedAt: 'asc' }
        : query.sort === 'PRODUCER'
          ? { producer: { name: 'asc' } }
          : { submittedAt: 'desc' };

    const [items, total, counts] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where,
        select: LIST_SELECT,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.verificationRequest.count({ where }),
      this.tabCounts(),
    ]);

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) || 1, counts };
  }

  /**
   * Compteurs des onglets. Ils ignorent volontairement les filtres actifs :
   * les pastilles doivent indiquer la charge de travail réelle, pas la taille
   * de la recherche en cours.
   */
  async tabCounts() {
    const grouped = await this.prisma.verificationRequest.groupBy({
      by: ['status'],
      where: { status: { not: VerificationRequestStatus.DRAFT } },
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<
      VerificationRequestStatus,
      number
    >;
    const sum = (statuses: VerificationRequestStatus[]) =>
      statuses.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0);

    return {
      ALL: grouped.reduce((acc, g) => acc + g._count._all, 0),
      UNDER_REVIEW: sum(TAB_STATUSES.UNDER_REVIEW),
      IN_LABORATORY: sum(TAB_STATUSES.IN_LABORATORY),
      VERIFIED: sum(TAB_STATUSES.VERIFIED),
      REJECTED: sum(TAB_STATUSES.REJECTED),
      byStatus,
    };
  }

  // --- Détail ------------------------------------------------------------

  async findOne(id: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!request || request.status === VerificationRequestStatus.DRAFT) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    return { ...request, progress: buildProgress(request) };
  }

  async history(id: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      select: { id: true, samples: { select: { id: true } } },
    });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    const entityIds = [request.id, ...request.samples.map((s) => s.id)];
    return this.prisma.auditLog.findMany({
      where: { entiteId: { in: entityIds } },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Actions de revue --------------------------------------------------

  async review(id: string, userId: string, dto: ReviewActionDto) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { producer: true },
    });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }

    const nextStatus = NEXT_STATUS_FOR[dto.decision];
    const allowed = ALLOWED_REVIEW_TRANSITIONS[request.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Une demande au statut « ${request.status} » ne peut pas passer à « ${nextStatus} ».`,
      );
    }
    if (dto.decision === ReviewDecision.REQUEST_INFO && !dto.message?.trim()) {
      throw new BadRequestException("Précisez l'information demandée au producteur.");
    }
    if (dto.decision === ReviewDecision.REJECT && !dto.message?.trim()) {
      throw new BadRequestException('Un motif de refus est obligatoire.');
    }

    const updated = await this.prisma.verificationRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        assignedToId: request.assignedToId ?? userId,
        infoRequested: dto.decision === ReviewDecision.REQUEST_INFO ? dto.message : null,
        internalNotes: dto.internalNotes ?? request.internalNotes,
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.log(userId, `REQUEST_REVIEW_${dto.decision}`, 'VerificationRequest', id, {
      previousStatus: request.status,
      newStatus: nextStatus,
      reason: dto.message?.trim() || null,
    });
    await this.publishReviewEvent(dto.decision, request, nextStatus);

    // Le motif reste attaché au dossier : sans cette trace, un refus serait
    // invérifiable a posteriori.
    if (dto.message?.trim()) {
      await this.prisma.requestComment.create({
        data: { requestId: id, authorId: userId, body: dto.message.trim() },
      });
    }

    await this.notifyProducer(request.producer.userId, request.honeyType, dto, request.id);

    return { ...updated, progress: buildProgress(updated) };
  }

  /** Événements métier de la revue (acceptation, précision demandée, refus). */
  private async publishReviewEvent(
    decision: ReviewDecision,
    request: { id: string; requestCode: string | null; preferredCollectionMethod: string | null },
    nextStatus: string,
  ) {
    const payload = {
      requestCode: request.requestCode,
      status: nextStatus,
      collectionMethod: request.preferredCollectionMethod,
    };
    if (decision === ReviewDecision.APPROVE) {
      await this.domainEvents.publish(EventType.VERIFICATION_REQUEST_APPROVED, 'VerificationRequest', request.id, payload);
      // Livraison par le producteur : l'acceptation vaut organisation de la
      // collecte (le producteur apporte l'échantillon au centre Kounouz).
      if (request.preferredCollectionMethod === 'PRODUCER_DELIVERY') {
        await this.domainEvents.publish(EventType.COLLECTION_SCHEDULED, 'VerificationRequest', request.id, payload);
      }
    } else if (decision === ReviewDecision.REQUEST_INFO) {
      await this.domainEvents.publish(EventType.VERIFICATION_REQUEST_MORE_INFO, 'VerificationRequest', request.id, payload);
    } else if (decision === ReviewDecision.REJECT) {
      await this.domainEvents.publish(EventType.VERIFICATION_REQUEST_REJECTED, 'VerificationRequest', request.id, payload);
    }
  }

  private async notifyProducer(
    producerUserId: string,
    honeyType: string,
    dto: ReviewActionDto,
    requestId: string,
  ) {
    if (dto.decision === ReviewDecision.START_REVIEW) return;

    const messages: Record<string, { title: string; body: string }> = {
      [ReviewDecision.APPROVE]: {
        title: 'Demande acceptée',
        body: `Votre demande pour « ${honeyType} » est acceptée. La collecte de l'échantillon va être organisée.`,
      },
      [ReviewDecision.REJECT]: {
        title: 'Demande refusée',
        body: `Votre demande pour « ${honeyType} » a été refusée. Motif : ${dto.message}`,
      },
      [ReviewDecision.REQUEST_INFO]: {
        title: 'Information complémentaire demandée',
        body: `Kounouz a besoin d'une précision sur « ${honeyType} » : ${dto.message}`,
      },
    };
    const message = messages[dto.decision];
    if (!message) return;

    await this.notifications.notify(
      producerUserId,
      NotificationType.REQUEST_ACCEPTED,
      message.title,
      message.body,
      'VerificationRequest',
      requestId,
    );

    if (dto.decision === ReviewDecision.APPROVE) {
      await this.notifications.notifyRole(
        Role.FIELD_AGENT,
        NotificationType.COLLECTION_AVAILABLE,
        'Nouvelle collecte disponible',
        `Une collecte est à programmer pour « ${honeyType} ».`,
        'VerificationRequest',
        requestId,
      );
    }
  }

  async assign(id: string, userId: string, assigneeId: string | null) {
    if (assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee || (assignee.role !== Role.ADMIN && assignee.role !== Role.VERIFICATION_TEAM)) {
        throw new BadRequestException("Le dossier ne peut être confié qu'à un membre de l'équipe Kounouz.");
      }
    }
    const updated = await this.prisma.verificationRequest.update({
      where: { id },
      data: { assignedToId: assigneeId },
      include: DETAIL_INCLUDE,
    });
    await this.audit.log(userId, 'REQUEST_ASSIGNED', 'VerificationRequest', id);
    return { ...updated, progress: buildProgress(updated) };
  }

  async updateInternalNotes(id: string, userId: string, notes: string) {
    const updated = await this.prisma.verificationRequest.update({
      where: { id },
      data: { internalNotes: notes },
    });
    await this.audit.log(userId, 'REQUEST_NOTES_UPDATED', 'VerificationRequest', id);
    return updated;
  }

  // --- Commentaires internes ---------------------------------------------

  async addComment(id: string, userId: string, body: string) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Demande de vérification introuvable.');
    }
    return this.prisma.requestComment.create({
      data: { requestId: id, authorId: userId, body },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.requestComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable.');
    }
    // Chacun ne retire que ses propres commentaires : le fil interne doit
    // rester fidèle à ce qui a été échangé pendant l'instruction du dossier.
    if (comment.authorId !== userId) {
      throw new BadRequestException('Seul son auteur peut supprimer un commentaire.');
    }
    await this.prisma.requestComment.delete({ where: { id: commentId } });
  }
}

const NEXT_STATUS_FOR: Record<ReviewDecision, VerificationRequestStatus> = {
  [ReviewDecision.START_REVIEW]: VerificationRequestStatus.IN_REVIEW,
  [ReviewDecision.APPROVE]: VerificationRequestStatus.ACCEPTED,
  [ReviewDecision.REJECT]: VerificationRequestStatus.REJECTED,
  [ReviewDecision.REQUEST_INFO]: VerificationRequestStatus.INFO_REQUESTED,
};

type ProgressInput = {
  status: VerificationRequestStatus;
  submittedAt: Date | null;
  samples: { status: string; labAnalyses?: { status: string }[] }[];
  verifications: { status: string; isDraft: boolean }[];
};

export type RequestProgressStep =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SAMPLE_COLLECTION'
  | 'LABORATORY_ANALYSIS'
  | 'FINAL_DECISION';

/**
 * Jalons affichés dans le bandeau « Verification Progress ». Ils sont déduits
 * des faits (échantillon existant, analyse enregistrée, décision prise) plutôt
 * que du seul statut, pour qu'un dossier ne puisse pas afficher une étape
 * franchie sans l'objet correspondant en base.
 */
export function buildProgress(request: ProgressInput): {
  steps: { step: RequestProgressStep; state: 'DONE' | 'CURRENT' | 'TODO' }[];
} {
  const hasSample = request.samples.length > 0;
  const hasAnalysis = request.samples.some((s) => (s.labAnalyses ?? []).length > 0);
  const decision = request.verifications.find((v) => !v.isDraft && v.status !== 'PENDING');
  const rejected = request.status === 'REJECTED';

  const done: Record<RequestProgressStep, boolean> = {
    SUBMITTED: !!request.submittedAt,
    UNDER_REVIEW: !['NEW', 'IN_REVIEW', 'INFO_REQUESTED'].includes(request.status),
    SAMPLE_COLLECTION: hasSample,
    LABORATORY_ANALYSIS: hasAnalysis,
    FINAL_DECISION: !!decision || rejected,
  };

  const order: RequestProgressStep[] = [
    'SUBMITTED',
    'UNDER_REVIEW',
    'SAMPLE_COLLECTION',
    'LABORATORY_ANALYSIS',
    'FINAL_DECISION',
  ];
  const currentIndex = order.findIndex((step) => !done[step]);

  return {
    steps: order.map((step, index) => ({
      step,
      state: done[step] ? 'DONE' : index === currentIndex ? 'CURRENT' : 'TODO',
    })),
  };
}
