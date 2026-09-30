import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, ImagePlus, PenLine, Save, Send, Trash2, EyeOff } from 'lucide-react';
import { ApiError } from '../../../lib/api';
import {
  BLOG_CATEGORIES,
  BLOG_FALLBACK_COVER,
  blogCoverUrl,
  useAdminBlogPost,
  useBlogCover,
  useSaveBlogPost,
  type BlogCategory,
  type BlogLanguage,
  type BlogPostInput,
  type BlogStatus,
  type LocalizedText,
} from '../../../lib/blog';
import { ArticleBody } from '../../../components/blog/ArticleBody';
import { Alert, Badge, Button, Card, Input, Select, Textarea } from '../../../design-system';

const LANGS: BlogLanguage[] = ['ar', 'fr', 'en'];

// Images du site proposées comme couverture, en plus du téléversement.
const SITE_COVERS = [
  '/images/scan.webp',
  '/images/sedre.webp',
  '/images/beekeeper.webp',
  '/images/3sal.webp',
  '/images/royal-jelly.webp',
  '/images/propolis.webp',
  '/images/jabal.webp',
  '/images/kisatona.webp',
];

interface Draft {
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
  category: BlogCategory;
  slug: string;
  coverImage: string;
  featured: boolean;
}

const EMPTY: Draft = { title: {}, excerpt: {}, content: {}, category: 'CONSEILS', slug: '', coverImage: '', featured: false };

/** Création et modification d'un article, dans les trois langues de la vitrine. */
export const BlogEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const { t } = useTranslation(['admin', 'marketplace', 'common']);
  const navigate = useNavigate();
  const { data: post, isLoading } = useAdminBlogPost(id);
  const save = useSaveBlogPost();
  const cover = useBlogCover();
  const fileInput = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [tab, setTab] = useState<BlogLanguage>('fr');
  const [preview, setPreview] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!post) return;
    setDraft({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      slug: post.slug,
      coverImage: post.coverImage ?? '',
      featured: post.featured,
    });
  }, [post]);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const setText = (field: 'title' | 'excerpt' | 'content', value: string) =>
    setDraft((d) => ({ ...d, [field]: { ...d[field], [tab]: value } }));

  const status: BlogStatus = post?.status ?? 'DRAFT';
  const coverSrc = pendingPreview ?? (post?.hasUploadedCover ? blogCoverUrl(post) : draft.coverImage || null);
  const complete = (l: BlogLanguage) => !!draft.title[l]?.trim() && !!draft.content[l]?.trim();

  const submit = async (nextStatus: BlogStatus) => {
    setError('');
    setNotice('');
    const body: Partial<BlogPostInput> = {
      title: draft.title,
      excerpt: draft.excerpt,
      content: draft.content,
      category: draft.category,
      coverImage: draft.coverImage || null,
      featured: draft.featured,
      status: nextStatus,
      ...(draft.slug.trim() && draft.slug.trim() !== post?.slug ? { slug: draft.slug.trim() } : {}),
    };
    try {
      const saved = await save.mutateAsync({ id, body });
      if (pendingFile) {
        await cover.mutateAsync({ id: saved.id, file: pendingFile });
        setPendingFile(null);
      }
      setNotice(nextStatus === 'PUBLISHED' ? t('admin:blog.editor.publishedNotice') : t('admin:blog.editor.savedNotice'));
      if (isNew) navigate(`/admin/blog/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  const removeUploadedCover = async () => {
    if (!id) return;
    setError('');
    try {
      await cover.mutateAsync({ id, file: null });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  if (!isNew && isLoading) return <p className="text-sm text-gray-400">{t('common:status.loading')}</p>;

  const dir = tab === 'ar' ? 'rtl' : 'ltr';
  const busy = save.isPending || cover.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/admin/blog" className="inline-flex items-center gap-1 text-sm font-bold text-[#96661A] hover:text-[#0C261B] mb-1">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('admin:blog.back')}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0C261B]">{isNew ? t('admin:blog.editor.newTitle') : t('admin:blog.editor.editTitle')}</h1>
            {!isNew && <Badge tone={status === 'PUBLISHED' ? 'green' : 'gold'}>{t(`admin:blog.status.${status}`)}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === 'PUBLISHED' ? (
            <>
              <Button variant="ghost" onClick={() => void submit('DRAFT')} disabled={busy}>
                <EyeOff className="w-4 h-4" />
                {t('admin:blog.unpublish')}
              </Button>
              <Button onClick={() => void submit('PUBLISHED')} isLoading={busy}>
                <Save className="w-4 h-4" />
                {t('admin:blog.editor.update')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => void submit('DRAFT')} disabled={busy}>
                <Save className="w-4 h-4" />
                {t('admin:blog.editor.saveDraft')}
              </Button>
              <Button variant="secondary" onClick={() => void submit('PUBLISHED')} isLoading={busy}>
                <Send className="w-4 h-4" />
                {t('admin:blog.publish')}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 bg-[#F4F1EA] p-1 rounded-lg" role="tablist">
              {LANGS.map((l) => (
                <button
                  key={l}
                  role="tab"
                  aria-selected={tab === l}
                  onClick={() => setTab(l)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                    tab === l ? 'bg-white text-[#0C261B] shadow-sm' : 'text-gray-500 hover:text-[#0C261B]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${complete(l) ? 'bg-[#17693F]' : 'bg-gray-300'}`} />
                  {t(`admin:blog.editor.languages.${l}`)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#96661A] hover:text-[#0C261B]"
            >
              {preview ? <PenLine className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {preview ? t('admin:blog.editor.write') : t('admin:blog.editor.preview')}
            </button>
          </div>

          {preview ? (
            <div dir={dir} className="rounded-xl border border-[#EAE1D2] bg-[#FAF6EE] p-5 space-y-3 text-start min-h-[300px]">
              <h2 className="text-2xl font-extrabold text-[#0C261B]">{draft.title[tab] || '—'}</h2>
              {draft.excerpt[tab] && <p className="font-semibold text-[#4A5E57]">{draft.excerpt[tab]}</p>}
              <ArticleBody content={draft.content[tab] ?? ''} />
            </div>
          ) : (
            <div dir={dir} className="space-y-4">
              <Input
                label={t('admin:blog.editor.title')}
                value={draft.title[tab] ?? ''}
                maxLength={200}
                onChange={(e) => setText('title', e.target.value)}
              />
              <Textarea
                label={t('admin:blog.editor.excerpt')}
                hint={t('admin:blog.editor.excerptHint')}
                rows={2}
                maxLength={500}
                value={draft.excerpt[tab] ?? ''}
                onChange={(e) => setText('excerpt', e.target.value)}
              />
              <label className="block">
                <span className="block text-sm font-bold text-[#0C261B] mb-1.5">{t('admin:blog.editor.content')}</span>
                <textarea
                  rows={16}
                  value={draft.content[tab] ?? ''}
                  onChange={(e) => setText('content', e.target.value)}
                  className="w-full px-4 py-3 text-sm leading-7 text-[#0C261B] bg-white border-2 border-[#EAE1D2] focus:border-[#D49B37] rounded-lg outline-none resize-y font-[inherit]"
                />
                <span className="block text-xs text-gray-500 mt-1" dir="auto">
                  {t('admin:blog.editor.formatHelp')}
                </span>
              </label>
            </div>
          )}
          <p className="text-xs text-gray-500">{t('admin:blog.editor.languageHint')}</p>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <Select
              label={t('admin:blog.editor.category')}
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as BlogCategory }))}
            >
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`marketplace:blog.categories.${c}`)}
                </option>
              ))}
            </Select>
            <Input
              label={t('admin:blog.editor.slug')}
              hint={t('admin:blog.editor.slugHint')}
              dir="ltr"
              value={draft.slug}
              placeholder="mon-article"
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            />
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft((d) => ({ ...d, featured: e.target.checked }))}
                className="mt-1 w-4 h-4 accent-[#D49B37]"
              />
              <span>
                <span className="block text-sm font-bold text-[#0C261B]">{t('admin:blog.editor.featured')}</span>
                <span className="block text-xs text-gray-500">{t('admin:blog.editor.featuredHint')}</span>
              </span>
            </label>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-bold text-[#0C261B]">{t('admin:blog.editor.cover')}</p>
            <img src={coverSrc ?? BLOG_FALLBACK_COVER} alt="" className={`w-full aspect-[16/10] object-cover rounded-lg ${coverSrc ? '' : 'opacity-40'}`} />
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                setPendingFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                <ImagePlus className="w-4 h-4" />
                {t('admin:blog.editor.upload')}
              </Button>
              {(pendingFile || post?.hasUploadedCover) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => (pendingFile ? setPendingFile(null) : void removeUploadedCover())}
                  disabled={cover.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('admin:blog.editor.removeUpload')}
                </Button>
              )}
            </div>
            {pendingFile && <p className="text-xs text-[#96661A]">{t('admin:blog.editor.pendingUpload')}</p>}
            {!pendingFile && !post?.hasUploadedCover && (
              <>
                <p className="text-xs text-gray-500">{t('admin:blog.editor.orSiteImage')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {SITE_COVERS.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, coverImage: src }))}
                      className={`rounded-md overflow-hidden border-2 ${draft.coverImage === src ? 'border-[#D49B37]' : 'border-transparent hover:border-[#EAE1D2]'}`}
                    >
                      <img src={src} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                    </button>
                  ))}
                </div>
                <Input
                  label={t('admin:blog.editor.coverUrl')}
                  dir="ltr"
                  value={draft.coverImage}
                  placeholder="https://…"
                  onChange={(e) => setDraft((d) => ({ ...d, coverImage: e.target.value.trim() }))}
                />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
