import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { BLOG_FALLBACK_COVER, blogCoverUrl, pickLocalized, type BlogPostSummary } from '../../lib/blog';
import { dateLocale } from '../../i18n';
import { ForwardArrow } from '../home/ui';

export function formatBlogDate(value: string | null, lang: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Carte d'article : accueil, boutique et page Blog. */
export const BlogCard: React.FC<{
  post: BlogPostSummary;
  onOpen: (slug: string) => void;
  large?: boolean;
}> = ({ post, onOpen, large = false }) => {
  const { t, i18n } = useTranslation('marketplace');
  const lang = i18n.language;
  const title = pickLocalized(post.title, lang);
  const excerpt = pickLocalized(post.excerpt, lang);

  return (
    <button
      type="button"
      onClick={() => onOpen(post.slug)}
      className={`group h-full w-full flex text-start bg-white rounded-2xl overflow-hidden border border-[#EAE1D2] hover:border-[#D49B37]/60 shadow-sm hover:shadow-lg transition-[border-color,box-shadow,transform] hover:-translate-y-1 cursor-pointer ${
        large ? 'flex-col md:flex-row' : 'flex-col'
      }`}
    >
      <div className={`relative overflow-hidden bg-[#EAE1D2]/50 shrink-0 ${large ? 'aspect-[16/9] md:aspect-auto md:w-1/2' : 'aspect-[4/3] w-full'}`}>
        <img
          src={blogCoverUrl(post) ?? BLOG_FALLBACK_COVER}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute top-3 start-3 bg-white/90 backdrop-blur-sm text-[#96661A] text-[11px] font-bold px-2.5 py-1 rounded-full">
          {t(`marketplace:blog.categories.${post.category}`)}
        </span>
      </div>
      <div className={`flex flex-col flex-grow ${large ? 'p-6 sm:p-8 justify-center' : 'p-4 sm:p-5'}`}>
        <p className="text-xs text-[#8C7A60] mb-2">{formatBlogDate(post.publishedAt, lang)}</p>
        <h3
          dir={title.lang === 'ar' ? 'rtl' : 'ltr'}
          className={`font-bold text-[#0C261B] leading-snug group-hover:text-[#96661A] transition-colors text-start ${
            large ? 'text-xl sm:text-2xl' : 'text-base'
          }`}
        >
          {title.text}
        </h3>
        <p
          dir={excerpt.lang === 'ar' ? 'rtl' : 'ltr'}
          className={`mt-2 text-sm text-[#6F827B] leading-relaxed text-start ${large ? 'line-clamp-4' : 'line-clamp-2'}`}
        >
          {excerpt.text}
        </p>
        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-[#8C7A60]">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {t('marketplace:blog.readTime', { count: post.readingMinutes })}
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-[#C68A28]">
            {t('marketplace:home.articles.read')}
            <ForwardArrow className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
};

export const BlogCardSkeleton: React.FC = () => (
  <div className="rounded-2xl overflow-hidden border border-[#EAE1D2] bg-white animate-pulse">
    <div className="aspect-[4/3] bg-[#EFE7D7]" />
    <div className="p-5 space-y-3">
      <div className="h-3 w-1/3 bg-[#F1EBDF] rounded" />
      <div className="h-4 w-4/5 bg-[#EFE7D7] rounded" />
      <div className="h-3 w-full bg-[#F1EBDF] rounded" />
    </div>
  </div>
);
