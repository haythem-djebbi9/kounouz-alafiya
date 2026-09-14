import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { slugify } from '../common/slugify.js';
import { CreateCategorieDto } from './dto/create-categorie.dto.js';
import { UpdateCategorieDto } from './dto/update-categorie.dto.js';

const CATEGORIE_INCLUDE = {
  children: { orderBy: { ordre: 'asc' as const } },
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base);
    let candidate = root;
    let suffix = 1;
    while (
      await this.prisma.categorie.findFirst({
        where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      })
    ) {
      suffix += 1;
      candidate = `${root}-${suffix}`;
    }
    return candidate;
  }

  async create(dto: CreateCategorieDto) {
    const slug = await this.uniqueSlug(dto.slug ?? dto.nom);
    return this.prisma.categorie.create({
      data: {
        nom: dto.nom,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        ordre: dto.ordre ?? 0,
        parentId: dto.parentId,
        actif: dto.actif ?? true,
      },
    });
  }

  // Catalogue public : uniquement les catégories racines actives, avec leurs sous-catégories actives.
  findPublic() {
    return this.prisma.categorie.findMany({
      where: { actif: true, parentId: null },
      include: { children: { where: { actif: true }, orderBy: { ordre: 'asc' } } },
      orderBy: { ordre: 'asc' },
    });
  }

  // Vue admin : toutes les catégories, actives ou non.
  findAllForAdmin() {
    return this.prisma.categorie.findMany({
      include: CATEGORIE_INCLUDE,
      orderBy: { ordre: 'asc' },
    });
  }

  async findOne(id: string) {
    const categorie = await this.prisma.categorie.findUnique({ where: { id }, include: CATEGORIE_INCLUDE });
    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable.');
    }
    return categorie;
  }

  async update(id: string, dto: UpdateCategorieDto) {
    await this.findOne(id);
    const slug = dto.slug || dto.nom ? await this.uniqueSlug(dto.slug ?? dto.nom!, id) : undefined;
    return this.prisma.categorie.update({
      where: { id },
      data: { ...dto, ...(slug ? { slug } : {}) },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const productCount = await this.prisma.product.count({ where: { categorieId: id } });
    if (productCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer cette catégorie : des produits y sont rattachés.',
      );
    }
    await this.prisma.categorie.delete({ where: { id } });
  }
}
