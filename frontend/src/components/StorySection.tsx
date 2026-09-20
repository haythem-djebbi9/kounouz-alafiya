import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flower2 } from 'lucide-react';
import { ForwardArrow } from './home/ui';

interface StorySectionProps {
  onReadMore: () => void;
}

export const StorySection: React.FC<StorySectionProps> = ({ onReadMore }) => {
  const { t } = useTranslation('marketplace');
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

  return (
    <section
      ref={ref}
      id="story-home-section"
      className="relative overflow-hidden bg-[#0C261B] min-h-[520px] flex items-center"
    >
      {/* L'image a sa zone verte à droite : le texte s'y place toujours */}
      <motion.img
        src="/images/beekeeper.jpg"
        alt={t('marketplace:home.story.imageAlt')}
        loading="lazy"
        style={{ y: imageY, top: '-6%' }}
        className="absolute left-0 w-full h-[112%] object-cover object-[20%_center] pointer-events-none select-none"
      />
      {/* Voile : plein sur mobile, dégradé vers la droite sur grand écran */}
      <div className="absolute inset-0 bg-[#0C261B]/85 lg:bg-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#0C261B]/40 lg:via-45% lg:to-[#0C261B] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-xl lg:ml-auto lg:mr-0 flex flex-col items-start text-start"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#E5AC44] border border-[#E5AC44]/40 bg-white/5 px-3 py-1 rounded-full mb-4">
            <Flower2 className="w-4 h-4" />
            {t('marketplace:nav.story')}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white leading-tight">
            {t('marketplace:home.story.title')}
          </h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="h-1 w-16 rounded-full bg-gradient-to-r from-[#D49B37] to-[#E8C378] my-5 origin-left rtl:origin-right"
          />
          <p className="text-base sm:text-lg text-[#E4ECE8] leading-relaxed">{t('marketplace:storyHome.description')}</p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              id="story-read-more-btn"
              onClick={onReadMore}
              className="inline-flex items-center justify-center gap-2.5 bg-[#D49B37] hover:bg-[#E5AC44] text-[#0C261B] font-bold px-7 py-3.5 rounded-xl shadow-lg transition-colors cursor-pointer group"
            >
              {t('marketplace:storyHome.readMore')}
              <ForwardArrow />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/inscription/producteur')}
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-xl border border-white/30 backdrop-blur-sm transition-colors cursor-pointer"
            >
              {t('marketplace:home.story.producerCta')}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
