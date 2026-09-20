import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Article } from '../types';
import { Clock, Instagram } from 'lucide-react';
import { ForwardArrow, SectionHeading } from './home/ui';

interface FromWorldSectionProps {
  onOpenArticle: (article: Article) => void;
  onShowAll: () => void;
}

const STORIES = [
  { key: 'story1', id: 'art-4', image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=600&q=80' },
  { key: 'story2', id: 'art-5', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80' },
  { key: 'story3', id: 'art-6', image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80' },
  { key: 'story4', id: 'art-1', image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80' },
] as const;

export const FromWorldSection: React.FC<FromWorldSectionProps> = ({ onOpenArticle, onShowAll }) => {
  const { t } = useTranslation('marketplace');
  const articles: Article[] = STORIES.map(({ key, id, image }) => ({
    id,
    image,
    title: t(`marketplace:fromWorld.stories.${key}.articleTitle`),
    date: t(`marketplace:fromWorld.stories.${key}.date`),
    readTime: t(`marketplace:fromWorld.stories.${key}.readTime`),
    snippet: t(`marketplace:fromWorld.stories.${key}.snippet`),
    category: t(`marketplace:fromWorld.stories.${key}.category`),
  }));

  return (
    <section id="from-world-section" className="py-16 sm:py-24 bg-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('marketplace:home.articles.eyebrow')}
          title={t('marketplace:fromWorld.title')}
          subtitle={t('marketplace:home.articles.subtitle')}
        />

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {articles.map((article, idx) => (
            <motion.button
              type="button"
              key={article.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              onClick={() => onOpenArticle(article)}
              className="group flex flex-col text-start bg-white rounded-2xl overflow-hidden border border-[#EAE1D2] hover:border-[#D49B37]/60 shadow-sm hover:shadow-lg transition-[border-color,box-shadow] cursor-pointer"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAE1D2]/50">
                <img
                  src={article.image}
                  alt={article.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <span className="absolute top-3 start-3 bg-white/90 backdrop-blur-sm text-[#96661A] text-[11px] font-bold px-2.5 py-1 rounded-full">
                  {article.category}
                </span>
              </div>
              <div className="flex flex-col flex-grow p-4 sm:p-5">
                <h3 className="text-base font-bold text-[#0C261B] leading-snug group-hover:text-[#96661A] transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 text-sm text-[#6F827B] leading-relaxed line-clamp-2">{article.snippet}</p>
                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-[#8C7A60]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {article.readTime}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#C68A28]">
                    {t('marketplace:home.articles.read')}
                    <ForwardArrow className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </motion.button>
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
            className="inline-flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm px-7 py-2.5 rounded-xl transition-colors cursor-pointer group"
          >
            {t('marketplace:fromWorld.showMore')}
            <ForwardArrow className="w-4 h-4 text-[#D49B37]" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
