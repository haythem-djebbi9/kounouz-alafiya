import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ExternalLink, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import {
  BLOG_FALLBACK_COVER,
  blogCoverUrl,
  pickLocalized,
  useAdminBlogPosts,
  useDeleteBlogPost,
  useSaveBlogPost,
  type BlogLanguage,
  type BlogPostSummary,
  type BlogStatus,
} from '../../../lib/blog';
import { Alert, Badge, Button, Card, EmptyState } from '../../../design-system';

const LANGS: BlogLanguage[] = ['ar', 'fr', 'en'];

// Blog de la vitrine : l'administrateur y rédige, publie et retire les articles.
export const BlogListPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'marketplace', 'common']);
  const lang = i18n.language;
  const navigate = useNavigate();
  const { data: posts = [], isLoading } = useAdminBlogPosts();
  const save = useSaveBlogPost();
  const remove = useDeleteBlogPost();
  const [filter, setFilter] = useState<BlogStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(
    () => ({
      ALL: posts.length,
      PUBLISHED: posts.filter((p) => p.status === 'PUBLISHED').length,
      DRAFT: posts.filter((p) => p.status === 'DRAFT').length,
    }),
    [posts],
  );

  const visible = posts.filter((p) => {
    if (filter !== 'ALL' && p.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || LANGS.some((l) => (p.title[l] ?? '').toLowerCase().includes(q)) || p.slug.includes(q);
  });

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  const togglePublish = (post: BlogPostSummary) =>
    run(() => save.mutateAsync({ id: post.id, body: { status: post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' } }));

  const confirmDelete = (post: BlogPostSummary) => {
    if (!window.confirm(t('admin:blog.confirmDelete', { title: pickLocalized(post.title, lang).text }))) return;
    void run(() => remove.mutateAsync(post.id));
  };

  const date = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(dateLocale(lang), { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0C261B] mb-1">{t('admin:blog.heading')}</h1>
          <p className="text-gray-500">{t('admin:blog.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/admin/blog/nouveau')}>
          <Plus className="w-4 h-4" />
          {t('admin:blog.new')}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                filter === key ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:bg-[#FAF6EE]'
              }`}
            >
              {t(`admin:blog.filters.${key}`)} <span className="opacity-70">({counts[key]})</span>
            </button>
          ))}
        </div>
        <label className="relative md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin:blog.search')}
            className="w-full ps-9 pe-3 py-2.5 text-sm rounded-lg border border-[#EAE1D2] bg-white focus:outline-none focus:border-[#D49B37]"
          />
        </label>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && visible.length === 0 && (
        <Card>
          <EmptyState title={posts.length === 0 ? t('admin:blog.empty') : t('admin:blog.noMatch')} />
        </Card>
      )}

      <div className="space-y-3">
        {visible.map((post) => {
          const title = pickLocalized(post.title, lang);
          return (
            <Card key={post.id} padded={false} className="flex flex-col sm:flex-row gap-4 p-3 sm:p-4">
              <img
                src={blogCoverUrl(post) ?? BLOG_FALLBACK_COVER}
                alt=""
                loading="lazy"
                className="w-full sm:w-36 aspect-[16/10] object-cover rounded-lg bg-[#FAF6EE] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge tone={post.status === 'PUBLISHED' ? 'green' : 'gold'}>{t(`admin:blog.status.${post.status}`)}</Badge>
                  <span className="text-xs font-bold text-[#96661A]">{t(`marketplace:blog.categories.${post.category}`)}</span>
                  {post.featured && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#B7791F]">
                      <Star className="w-3.5 h-3.5 fill-[#D49B37] text-[#D49B37]" />
                      {t('admin:blog.featured')}
                    </span>
                  )}
                </div>
                <Link
                  to={`/admin/blog/${post.id}`}
                  dir={title.lang === 'ar' ? 'rtl' : 'ltr'}
                  className="block font-bold text-[#0C261B] hover:text-[#96661A] truncate text-start"
                >
                  {title.text}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex gap-1" title={t('admin:blog.languages')}>
                    {LANGS.map((l) => (
                      <span
                        key={l}
                        className={`px-1.5 rounded font-bold uppercase ${post.title[l] ? 'bg-[#E3F2E8] text-[#17693F]' : 'bg-gray-100 text-gray-400 line-through'}`}
                      >
                        {l}
                      </span>
                    ))}
                  </span>
                  <span>
                    {post.status === 'PUBLISHED'
                      ? t('admin:blog.publishedOn', { date: date(post.publishedAt) })
                      : t('admin:blog.updatedOn', { date: date(post.updatedAt) })}
                  </span>
                  {post.author && <span>{post.author.name}</span>}
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/blog/${post.id}`)}>
                    <Pencil className="w-4 h-4" />
                    {t('admin:blog.edit')}
                  </Button>
                  <Button size="sm" variant={post.status === 'PUBLISHED' ? 'ghost' : 'secondary'} onClick={() => void togglePublish(post)}>
                    {post.status === 'PUBLISHED' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {post.status === 'PUBLISHED' ? t('admin:blog.unpublish') : t('admin:blog.publish')}
                  </Button>
                </div>
                <div className="flex gap-1">
                  {post.status === 'PUBLISHED' && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg text-gray-500 hover:text-[#0C261B] hover:bg-[#FAF6EE]"
                      title={t('admin:blog.viewOnSite')}
                      aria-label={t('admin:blog.viewOnSite')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => confirmDelete(post)}
                    className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title={t('admin:blog.delete')}
                    aria-label={t('admin:blog.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
