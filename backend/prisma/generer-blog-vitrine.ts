/**
 * Copie les articles de départ du blog (prisma/blog-articles.ts) dans la
 * vitrine (frontend/src/lib/blog-starter.json). La vitrine les affiche quand
 * l'API du blog ne répond pas, pour que l'accueil ne reste jamais sans articles.
 * À relancer après toute modification de blog-articles.ts :
 *
 *   npx tsx prisma/generer-blog-vitrine.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BLOG_ARTICLES } from './blog-articles.js';
import { readingMinutes } from '../src/blog/blog-text.js';

const target = fileURLToPath(new URL('../../frontend/src/lib/blog-starter.json', import.meta.url));

const posts = BLOG_ARTICLES.map((a) => ({
  id: `starter-${a.slug}`,
  slug: a.slug,
  category: a.category,
  title: a.title,
  excerpt: a.excerpt,
  content: a.content,
  coverImage: a.coverImage,
  hasUploadedCover: false,
  readingMinutes: readingMinutes(a.content),
  status: 'PUBLISHED',
  featured: a.featured,
  publishedAt: a.publishedAt,
  createdAt: a.publishedAt,
  updatedAt: a.publishedAt,
  author: { name: 'Kounouz Alafiya' },
})).sort((x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt));

writeFileSync(target, `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
console.log(`${posts.length} articles écrits dans ${target}`);
