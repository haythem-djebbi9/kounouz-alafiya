/**
 * Imprime les INSERT des articles de départ du blog (prisma/blog-articles.ts),
 * à recopier dans la migration qui crée la table :
 *
 *   npx tsx prisma/generer-sql-blog.ts
 *
 * Les textes sont passés en « dollar quoting » PostgreSQL : aucun échappement
 * à gérer, quelle que soit la langue. ON CONFLICT rend l'insertion rejouable.
 */
import { BLOG_ARTICLES } from './blog-articles.js';
import { readingMinutes } from '../src/blog/blog-text.js';

const quote = (value: string) => `$kz$${value}$kz$`;

const lignes = BLOG_ARTICLES.map((a) =>
  [
    '(',
    `  gen_random_uuid()::text, ${quote(a.slug)}, ${quote(a.category)},`,
    `  ${quote(JSON.stringify(a.title))}::jsonb,`,
    `  ${quote(JSON.stringify(a.excerpt))}::jsonb,`,
    `  ${quote(JSON.stringify(a.content))}::jsonb,`,
    `  ${quote(a.coverImage)}, ${readingMinutes(a.content)}, 'PUBLISHED', ${a.featured},`,
    `  ${quote(a.publishedAt)}::timestamp, (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1),`,
    '  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP',
    ')',
  ].join('\n'),
);

console.log(`-- Articles de départ (générés par prisma/generer-sql-blog.ts)
INSERT INTO "blog_posts" (
  "id", "slug", "category", "title", "excerpt", "content", "cover_image",
  "reading_minutes", "status", "featured", "published_at", "author_id",
  "created_at", "updated_at"
) VALUES
${lignes.join(',\n')}
ON CONFLICT ("slug") DO NOTHING;`);
