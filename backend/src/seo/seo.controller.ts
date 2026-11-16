import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlogPostStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

// Pages fixes de la vitrine, publiques et utiles à un moteur de recherche.
// Les portails (producteur, agent, vérification, administration) exigent une
// connexion : ils n'ont rien à faire dans un plan du site.
const STATIC_PATHS = ['/', '/blog', '/guide', '/confidentialite', '/conditions', '/retours'];

const CACHE_MS = 10 * 60_000;

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Plan du site (sitemap.xml) : les pages fixes, chaque produit en vente et
 * chaque article publié. Auparavant, /sitemap.xml renvoyait la page HTML de
 * l'application, et les moteurs ne découvraient les fiches produit que par
 * les liens. nginx sert cette réponse à l'adresse /sitemap.xml.
 */
@ApiTags('seo')
@Public()
@Controller('seo')
export class SeoController {
  private cache: { at: number; xml: string } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @ApiOperation({ summary: 'Plan du site pour les moteurs de recherche' })
  async sitemap(): Promise<string> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.xml;

    const site = (process.env.PUBLIC_APP_URL ?? 'https://kounouzalafia.io').replace(/\/+$/, '');
    const [products, posts] = await Promise.all([
      this.prisma.product.findMany({
        where: { statut: ProductStatus.PUBLIE },
        select: { id: true, updatedAt: true },
      }),
      this.prisma.blogPost.findMany({
        where: { status: BlogPostStatus.PUBLISHED },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const entries = [
      ...STATIC_PATHS.map((path) => ({ loc: site + path, lastmod: null as Date | null })),
      ...products.map((p) => ({ loc: `${site}/produit/${encodeURIComponent(p.id)}`, lastmod: p.updatedAt })),
      ...posts.map((p) => ({ loc: `${site}/blog/${encodeURIComponent(p.slug)}`, lastmod: p.updatedAt })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries.map(
        (e) =>
          `  <url><loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`,
      ),
      '</urlset>',
      '',
    ].join('\n');

    this.cache = { at: Date.now(), xml };
    return xml;
  }
}
