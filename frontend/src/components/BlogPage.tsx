import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search } from 'lucide-react';
import { pickLocalized, usePublicBlogPosts, type BlogCategory } from '../lib/blog';
import { BlogCard, BlogCardSkeleton } from './blog/BlogCard';

// Page Blog de la vitrine : tous les articles publiés, filtrables par rubrique.
export const BlogPage: React.FC<{ onOpenArticle: (slug: string) => void }> = ({ onOpenArticle }) => {
  const { t, i18n } = useTranslation('marketplace');
  const { data: posts = [], isLoading, isError } = usePublicBlogPosts();
  const [category, setCategory] = useState<BlogCategory | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  const categories = useMemo(() => [...new Set(posts.map((p) => p.category))], [posts]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (category !== 'ALL' && p.category !== category) return false;
      if (!q) return true;
      const haystack = [pickLocalized(p.title, i18n.language).text, pickLocalized(p.excerpt, i18n.language).text].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, category, query, i18n.language]);

  // L'article mis en avant ouvre la page tant qu'aucun filtre n'est actif.
  const featured = category === 'ALL' && !query ? (visible.find((p) => p.featured) ?? visible[0]) : undefined;
  const others = featured ? visible.filter((p) => p.id !== featured.id) : visible;

  return (
    <div className="bg-[#FAF6EE] min-h-screen py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <header className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#96661A] bg-white border border-[#EAE1D2] rounded-full px-3 py-1">
            <BookOpen className="w-3.5 h-3.5" />
            {t('home.articles.eyebrow')}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0C261B]">{t('blog.title')}</h1>
          <p className="mt-3 text-[#6F827B] leading-relaxed">{t('blog.subtitle')}</p>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(['ALL', ...categories] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                  category === c ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:bg-[#EFE7D7]'
                }`}
              >
                {c === 'ALL' ? t('blog.allCategories') : t(`blog.categories.${c}`)}
              </button>
            ))}
          </div>
          <label className="relative md:w-72">
            <Search className="w-4 h-4 text-[#8C7A60] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('blog.searchPlaceholder')}
              className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white border border-[#EAE1D2] text-sm focus:outline-none focus:border-[#D49B37]"
            />
          </label>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        )}
        {isError && <p className="text-center text-[#8C7A60] py-12">{t('blog.loadError')}</p>}
        {!isLoading && !isError && visible.length === 0 && <p className="text-center text-[#8C7A60] py-12">{t('blog.empty')}</p>}

        {featured && <BlogCard post={featured} onOpen={onOpenArticle} large />}
        {others.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {others.map((post) => (
              <BlogCard key={post.id} post={post} onOpen={onOpenArticle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
