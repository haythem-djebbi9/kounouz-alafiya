import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { padSequence } from '../common/sequential-code.js';
import { CreateReferenceHoneyDto } from './dto/create-reference-honey.dto.js';
import { UpdateReferenceHoneyDto } from './dto/update-reference-honey.dto.js';
import { ListReferenceHoneysQueryDto } from './dto/list-reference-honeys-query.dto.js';

/**
 * Trigramme du type de miel dans le code étalon (« Thyme Honey » -> TH).
 *
 * On retient les initiales des deux premiers mots significatifs ; un type en un
 * seul mot donne ses deux premières lettres. « Honey »/« Miel » est ignoré car
 * présent partout et donc non discriminant.
 */
export function honeyTypeTag(honeyType: string): string {
  const words = honeyType
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length > 0 && !['honey', 'miel'].includes(w.toLowerCase()));

  if (words.length === 0) return 'XX';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const LIST_SELECT = {
  id: true,
  code: true,
  honeyType: true,
  region: true,
  harvestSeason: true,
  collectionDate: true,
  color: true,
  texture: true,
  floralSource: true,
  photos: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class ReferenceHoneysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private whereFor(query: ListReferenceHoneysQueryDto): Prisma.ReferenceHoneyWhereInput {
    const where: Prisma.ReferenceHoneyWhereInput = {};
    if (query.honeyType) where.honeyType = query.honeyType;
    if (query.region) where.region = query.region;
    if (query.harvestSeason) where.harvestSeason = query.harvestSeason;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { honeyType: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
        { floralSource: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(query: ListReferenceHoneysQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const where = this.whereFor(query);

    const orderBy: Prisma.ReferenceHoneyOrderByWithRelationInput =
      query.sort === 'OLDEST'
        ? { createdAt: 'asc' }
        : query.sort === 'CODE'
          ? { code: 'asc' }
          : { createdAt: 'desc' };

    const [items, total, stats] = await Promise.all([
      this.prisma.referenceHoney.findMany({
        where,
        select: LIST_SELECT,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.referenceHoney.count({ where }),
      this.stats(),
    ]);

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) || 1, stats };
  }

  /** Cartouches de tête et valeurs proposées dans les filtres par facette. */
  async stats() {
    const [total, active, byType, byRegion, bySeason] = await Promise.all([
      this.prisma.referenceHoney.count(),
      this.prisma.referenceHoney.count({ where: { isActive: true } }),
      this.prisma.referenceHoney.groupBy({ by: ['honeyType'], _count: { _all: true } }),
      this.prisma.referenceHoney.groupBy({ by: ['region'], _count: { _all: true } }),
      this.prisma.referenceHoney.groupBy({ by: ['harvestSeason'], _count: { _all: true } }),
    ]);

    const facet = (rows: { _count: { _all: number } }[], key: string) =>
      rows
        .map((row) => ({
          value: (row as unknown as Record<string, string>)[key],
          count: row._count._all,
        }))
        .sort((a, b) => b.count - a.count);

    return {
      total,
      active,
      honeyTypes: byType.length,
      regions: byRegion.length,
      facets: {
        honeyType: facet(byType, 'honeyType'),
        region: facet(byRegion, 'region'),
        harvestSeason: facet(bySeason, 'harvestSeason'),
      },
    };
  }

  async findOne(id: string) {
    const honey = await this.prisma.referenceHoney.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!honey) {
      throw new NotFoundException('Échantillon de référence introuvable.');
    }
    return honey;
  }

  async create(userId: string, dto: CreateReferenceHoneyDto) {
    // Le trigramme dépend du type de miel mais la numérotation est globale :
    // un code reste ainsi unique et lisible d'un type à l'autre.
    const tag = honeyTypeTag(dto.honeyType);
    const count = await this.prisma.referenceHoney.count();

    let created: Awaited<ReturnType<typeof this.prisma.referenceHoney.create>> | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const code = `REF-${tag}-${padSequence(count + 1 + attempt, 3)}`;
      try {
        created = await this.prisma.referenceHoney.create({
          data: {
            code,
            honeyType: dto.honeyType,
            region: dto.region,
            harvestSeason: dto.harvestSeason,
            collectionDate: dto.collectionDate ? new Date(dto.collectionDate) : null,
            color: dto.color,
            texture: dto.texture,
            floralSource: dto.floralSource,
            notes: dto.notes,
            photos: dto.photos ?? [],
            analysisResults: (dto.analysisResults ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            createdById: userId,
          },
        });
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
    if (!created) {
      throw new Error("Impossible d'attribuer un code à l'échantillon de référence.");
    }

    await this.audit.log(userId, 'CREATE_REFERENCE_HONEY', 'ReferenceHoney', created.id);
    return created;
  }

  async update(id: string, userId: string, dto: UpdateReferenceHoneyDto) {
    await this.findOne(id);
    const updated = await this.prisma.referenceHoney.update({
      where: { id },
      data: {
        honeyType: dto.honeyType,
        region: dto.region,
        harvestSeason: dto.harvestSeason,
        collectionDate: dto.collectionDate ? new Date(dto.collectionDate) : undefined,
        color: dto.color,
        texture: dto.texture,
        floralSource: dto.floralSource,
        notes: dto.notes,
        photos: dto.photos,
        analysisResults: dto.analysisResults as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log(userId, 'UPDATE_REFERENCE_HONEY', 'ReferenceHoney', id);
    return updated;
  }

  /**
   * Un étalon n'est jamais supprimé : il a pu servir de base de comparaison à
   * des vérifications déjà prononcées. On le désactive, ce qui le retire des
   * comparaisons futures sans effacer l'historique.
   */
  async setActive(id: string, userId: string, isActive: boolean) {
    await this.findOne(id);
    const updated = await this.prisma.referenceHoney.update({ where: { id }, data: { isActive } });
    await this.audit.log(
      userId,
      isActive ? 'ACTIVATE_REFERENCE_HONEY' : 'DEACTIVATE_REFERENCE_HONEY',
      'ReferenceHoney',
      id,
    );
    return updated;
  }
}
