import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Clock, Share2, QrCode, Check } from 'lucide-react';
import { BLOG_FALLBACK_COVER, blogCoverUrl, pickLocalized, usePublicBlogPost } from '../lib/blog';
import { ArticleBody } from './blog/ArticleBody';
import { formatBlogDate } from './blog/BlogCard';

interface ArticleModalProps {
  /** Adresse de l'article ouvert ; null = fermé. */
  slug: string | null;
  onClose: () => void;
  onVerify?: () => void;
}

// Lecture d'un article du blog. Son adresse (/blog/<slug>) est partageable :
// ouverte directement, elle affiche la page Blog avec l'article par-dessus.
export const ArticleModal: React.FC<ArticleModalProps> = ({ slug, onClose, onVerify }) => {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const lang = i18n.language;
  const { data: post, isLoading, isError } = usePublicBlogPost(slug);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [slug, onClose]);

  useEffect(() => setCopied(false), [slug]);

  if (!slug) return null;

  const title = pickLocalized(post?.title, lang);
  const excerpt = pickLocalized(post?.excerpt, lang);
  const content = pickLocalized(post?.content, lang);

  const share = async () => {
    const url = `${window.location.origin}/blog/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: title.text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Partage annulé par l'utilisateur : rien à faire.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="article-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title.text || t('marketplace:blog.title')}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#FAF6EE] rounded-2xl shadow-2xl border border-[#D49B37]/40 overflow-hidden flex flex-col max-h-[92vh] text-start"
      >
        <div className="relative aspect-[16/7] overflow-hidden bg-[#0C261B] shrink-0">
          {post && (
            <img src={blogCoverUrl(post) ?? BLOG_FALLBACK_COVER} alt="" className="w-full h-full object-cover" decoding="async" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF6EE] via-transparent to-transparent" />
          <button
            onClick={onClose}
            aria-label={t('common:actions.close')}
            className="absolute top-4 end-4 p-2 rounded-full bg-white/90 text-[#0C261B] hover:bg-white shadow-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          {post && (
            <span className="absolute bottom-3 start-6 bg-[#0C261B] text-white text-xs font-bold px-3 py-1 rounded-lg border border-[#D49B37]/50">
              {t(`marketplace:blog.categories.${post.category}`)}
            </span>
          )}
        </div>

        <div className="px-5 sm:px-8 py-6 overflow-y-auto space-y-4">
          {isLoading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-1/3 bg-[#EFE7D7] rounded" />
              <div className="h-7 w-4/5 bg-[#EFE7D7] rounded" />
              <div className="h-4 w-full bg-[#F1EBDF] rounded" />
              <div className="h-4 w-5/6 bg-[#F1EBDF] rounded" />
            </div>
          )}
          {isError && <p className="text-sm text-[#8C7A60] py-8 text-center">{t('marketplace:blog.notFound')}</p>}
          {post && (
            <>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#8C7A60] border-b border-[#EAE1D2] pb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#D49B37]" />
                  {formatBlogDate(post.publishedAt, lang)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#D49B37]" />
                  {t('marketplace:blog.readTime', { count: post.readingMinutes })}
                </span>
              </div>

              <div dir={title.lang === 'ar' ? 'rtl' : 'ltr'} className="space-y-4 text-start">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] leading-snug">{title.text}</h2>
                {excerpt.text && <p className="text-base text-[#4A5E57] font-semibold leading-relaxed">{excerpt.text}</p>}
              </div>
              {content.text && (
                <div dir={content.lang === 'ar' ? 'rtl' : 'ltr'} className="text-start">
                  {content.lang !== lang && (
                    <p className="text-xs text-[#8C7A60] italic mb-3">{t('marketplace:blog.otherLanguage')}</p>
                  )}
                  <ArticleBody content={content.text} />
                </div>
              )}

              <p className="flex gap-2 text-sm text-[#3F524B] bg-white border border-[#EAE1D2] rounded-xl p-4">
                <QrCode className="w-5 h-5 text-[#1E6B56] shrink-0" />
                {t('marketplace:article.qrReminder')}
              </p>
            </>
          )}
        </div>

        <div className="bg-[#EAE1D2] px-5 sm:px-8 py-3 border-t border-[#D5C7B0] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void share()}
              disabled={!post}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0C261B] text-xs font-bold border border-[#D5C7B0] hover:bg-[#FAF6EE] cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#1E6B56]" /> : <Share2 className="w-3.5 h-3.5 text-[#D49B37]" />}
              <span>{copied ? t('marketplace:article.shareAlert') : t('marketplace:article.share')}</span>
            </button>
            {onVerify && (
              <button
                onClick={onVerify}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#1E6B56] text-xs font-bold border border-[#1E6B56]/30 hover:bg-[#E7F3EE] cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t('marketplace:actions.verifyProduct')}</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#0C261B] text-white text-xs font-bold rounded-lg hover:bg-[#16473A] cursor-pointer"
          >
            {t('common:actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
