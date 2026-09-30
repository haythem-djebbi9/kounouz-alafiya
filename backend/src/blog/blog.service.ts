import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BlogPostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { slugify } from '../common/slugify.js';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto.js';
import { cleanLocalized, hasAnyLanguage, readingMinutes, type LocalizedText } from './blog-text.js';

export const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const COVER_MAX_BYTES = 3 * 1024 * 1024;

// Adresses réservées par les routes du contrôleur.
const RESERVED_SLUGS = new Set(['admin']);

// Colonnes d'une liste d'articles : ni le contenu complet, ni les octets de
// l'image téléversée (coverMime suffit à savoir qu'il y en a une).
const LIST_SELECT = {
  id: true,
  slug: true,
  category: true,
  title: true,
  excerpt: true,
  coverImage: true,
  coverMime: true,
  readingMinutes: true,
  status: true,
  featured: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { name: true } },
} satisfies Prisma.BlogPostSelect;

const DETAIL_SELECT = { ...LIST_SELECT, content: true } satisfies Prisma.BlogPostSelect;

type ListRow = Prisma.BlogPostGetPayload<{ select: typeof LIST_SELECT }>;

function toView<T extends ListRow>(row: T) {
  const { coverMime, ...rest } = row;
  return { ...rest, hasUploadedCover: !!coverMime };
}

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Vitrine -----------------------------------------------------------------

  async listPublished(limit?: number, category?: string) {
    const rows = await this.prisma.blogPost.findMany({
      where: { status: BlogPostStatus.PUBLISHED, ...(category ? { category } : {}) },
      select: LIST_SELECT,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit && limit > 0 ? Math.min(limit, 50) : 50,
    });
    return rows.map(toView);
  }

  async findPublished(slug: string) {
    const row = await this.prisma.blogPost.findFirst({
      where: { slug, status: BlogPostStatus.PUBLISHED },
      select: DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Article introuvable.');
    return toView(row);
  }

  /**
   * Image téléversée d'un article. Par son adresse lisible, seuls les articles
   * publiés répondent ; par son identifiant (impossible à deviner), un
   * brouillon aussi — c'est ce qu'affiche l'aperçu de l'éditeur.
   */
  async coverFile(idOrSlug: string) {
    const row = await this.prisma.blogPost.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug, status: BlogPostStatus.PUBLISHED }] },
      select: { coverData: true, coverMime: true, updatedAt: true },
    });
    if (!row?.coverData || !row.coverMime) throw new NotFoundException('Aucune image pour cet article.');
    return { data: Buffer.from(row.coverData), mime: row.coverMime, updatedAt: row.updatedAt };
  }

  // --- Console d'administration -----------------------------------------------

  async listAll() {
    const rows = await this.prisma.blogPost.findMany({
      select: LIST_SELECT,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return rows.map(toView);
  }

  async findOne(id: string) {
    const row = await this.prisma.blogPost.findUnique({ where: { id }, select: DETAIL_SELECT });
    if (!row) throw new NotFoundException('Article introuvable.');
    return toView(row);
  }

  async create(userId: string, dto: CreateBlogPostDto) {
    const title = cleanLocalized(dto.title);
    if (!hasAnyLanguage(title)) throw new BadRequestException('Donnez un titre à l’article, dans au moins une langue.');
    const content = cleanLocalized(dto.content);
    const status = dto.status === 'PUBLISHED' ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT;
    if (status === BlogPostStatus.PUBLISHED) this.assertPublishable(title, content);

    const slug = dto.slug ? await this.assertFreeSlug(dto.slug) : await this.uniqueSlug(title);
    const post = await this.prisma.blogPost.create({
      data: {
        slug,
        category: dto.category,
        title,
        excerpt: cleanLocalized(dto.excerpt),
        content,
        coverImage: dto.coverImage || null,
        featured: dto.featured ?? false,
        readingMinutes: readingMinutes(content),
        status,
        publishedAt: status === BlogPostStatus.PUBLISHED ? new Date() : null,
        authorId: userId,
      },
      select: { id: true },
    });
    await this.audit.log(userId, 'CREATE_BLOG_POST', 'BlogPost', post.id, {
      details: title.fr ?? title.en ?? title.ar,
      newStatus: status,
    });
    return this.findOne(post.id);
  }

  async update(userId: string, id: string, dto: UpdateBlogPostDto) {
    const current = await this.prisma.blogPost.findUnique({
      where: { id },
      select: { title: true, content: true, status: true, publishedAt: true, slug: true },
    });
    if (!current) throw new NotFoundException('Article introuvable.');

    const title = dto.title !== undefined ? cleanLocalized(dto.title) : (current.title as LocalizedText);
    if (!hasAnyLanguage(title)) throw new BadRequestException('Donnez un titre à l’article, dans au moins une langue.');
    const content = dto.content !== undefined ? cleanLocalized(dto.content) : (current.content as LocalizedText);
    const status = dto.status ? BlogPostStatus[dto.status] : current.status;
    if (status === BlogPostStatus.PUBLISHED) this.assertPublishable(title, content);

    const slug = dto.slug && dto.slug !== current.slug ? await this.assertFreeSlug(dto.slug) : undefined;
    await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(slug ? { slug } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.title !== undefined ? { title } : {}),
        ...(dto.excerpt !== undefined ? { excerpt: cleanLocalized(dto.excerpt) } : {}),
        ...(dto.content !== undefined ? { content, readingMinutes: readingMinutes(content) } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage || null } : {}),
        ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        status,
        // La date de publication est celle de la première mise en ligne.
        ...(status === BlogPostStatus.PUBLISHED && !current.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });

    const action =
      status === current.status
        ? 'UPDATE_BLOG_POST'
        : status === BlogPostStatus.PUBLISHED
          ? 'PUBLISH_BLOG_POST'
          : 'UNPUBLISH_BLOG_POST';
    await this.audit.log(userId, action, 'BlogPost', id, {
      details: title.fr ?? title.en ?? title.ar,
      previousStatus: current.status,
      newStatus: status,
    });
    return this.findOne(id);
  }

  async remove(userId: string, id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id }, select: { title: true, status: true } });
    if (!post) throw new NotFoundException('Article introuvable.');
    await this.prisma.blogPost.delete({ where: { id } });
    const title = post.title as LocalizedText;
    await this.audit.log(userId, 'DELETE_BLOG_POST', 'BlogPost', id, {
      details: title.fr ?? title.en ?? title.ar,
      previousStatus: post.status,
    });
    return { deleted: true };
  }

  async setCover(userId: string, id: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    if (!COVER_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Seules les images JPEG, PNG ou WebP sont acceptées.');
    }
    if (file.size > COVER_MAX_BYTES) throw new BadRequestException('Image trop lourde (3 Mo maximum).');
    await this.ensureExists(id);
    await this.prisma.blogPost.update({
      where: { id },
      data: { coverData: new Uint8Array(file.buffer), coverMime: file.mimetype },
    });
    await this.audit.log(userId, 'UPDATE_BLOG_POST', 'BlogPost', id, { details: 'Image de couverture téléversée' });
    return this.findOne(id);
  }

  async removeCover(userId: string, id: string) {
    await this.ensureExists(id);
    await this.prisma.blogPost.update({ where: { id }, data: { coverData: null, coverMime: null } });
    await this.audit.log(userId, 'UPDATE_BLOG_POST', 'BlogPost', id, { details: 'Image de couverture retirée' });
    return this.findOne(id);
  }

  // --- Règles -------------------------------------------------------------------

  private assertPublishable(title: LocalizedText, content: LocalizedText) {
    const ready = (['ar', 'fr', 'en'] as const).some((lang) => title[lang] && content[lang]);
    if (!ready) {
      throw new BadRequestException('Pour publier, rédigez au moins une langue complète : titre et contenu.');
    }
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.blogPost.count({ where: { id } });
    if (!found) throw new NotFoundException('Article introuvable.');
  }

  private async assertFreeSlug(slug: string) {
    if (RESERVED_SLUGS.has(slug)) throw new BadRequestException('Cette adresse est réservée.');
    const taken = await this.prisma.blogPost.count({ where: { slug } });
    if (taken) throw new ConflictException('Un autre article utilise déjà cette adresse.');
    return slug;
  }

  // Adresse lisible tirée du titre (latin de préférence) ; un titre
  // uniquement en arabe donne une adresse neutre.
  private async uniqueSlug(title: LocalizedText) {
    const base = slugify(title.fr ?? title.en ?? '').slice(0, 70).replace(/-+$/, '') || `article-${Date.now().toString(36)}`;
    const safeBase = RESERVED_SLUGS.has(base) ? `${base}-article` : base;
    const existing = await this.prisma.blogPost.findMany({
      where: { slug: { startsWith: safeBase } },
      select: { slug: true },
    });
    const used = new Set(existing.map((p) => p.slug));
    if (!used.has(safeBase)) return safeBase;
    let n = 2;
    while (used.has(`${safeBase}-${n}`)) n++;
    return `${safeBase}-${n}`;
  }
}
