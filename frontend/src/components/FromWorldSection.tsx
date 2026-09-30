import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Instagram } from 'lucide-react';
import { ForwardArrow, SectionHeading } from './home/ui';
import { usePublicBlogPosts } from '../lib/blog';
import { BlogCard, BlogCardSkeleton } from './blog/BlogCard';

interface FromWorldSectionProps {
  onOpenArticle: (slug: string) => void;
  onShowAll: () => void;
}

// Derniers articles du blog sur l'accueil (gérés depuis la console
// d'administration). Sans article publié, la section disparaît.
export const FromWorldSection: React.FC<FromWorldSectionProps> = ({ onOpenArticle, onShowAll }) => {
  const { t } = useTranslation('marketplace');
  const { data: posts, isLoading } = usePublicBlogPosts(4);

  if (!isLoading && (!posts || posts.length === 0)) return null;

  return (
    <section id="from-world-section" className="py-16 sm:py-24 bg-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('marketplace:home.articles.eyebrow')}
          title={t('marketplace:fromWorld.title')}
          subtitle={t('marketplace:home.articles.subtitle')}
        />

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {isLoading && [0, 1, 2, 3].map((i) => <BlogCardSkeleton key={i} />)}
          {posts?.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
            >
              <BlogCard post={post} onOpen={onOpenArticle} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mt-10 max-w-3xl mx-auto rounded-2xl border border-[#EAE1D2] bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
        >
          <a
            href="https://instagram.com/kunuzalafiya"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Instagram className="w-6 h-6" />
            </span>
            <span className="text-start">
              <span className="text-sm font-bold text-[#0C261B] block">{t('marketplace:fromWorld.instagramFollow')}</span>
              <span dir="ltr" className="text-xs font-medium text-[#7E8F88] font-mono">@kunuzalafiya</span>
            </span>
          </a>
          <button
            id="blog-show-more-btn"
            onClick={onShowAll}
            className="inline-flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm px-7 py-2.5 rounded-xl transition-colors cursor-pointer group whitespace-nowrap"
          >
            {t('marketplace:blog.allArticles')}
            <ForwardArrow className="w-4 h-4 text-[#D49B37]" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
