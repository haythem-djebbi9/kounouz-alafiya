import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Check, MapPin, Mountain } from 'lucide-react';
import { ForwardArrow, SectionHeading } from './home/ui';

interface NatureToTableProps {
  onDiscoverStory: () => void;
  /** Régions réelles des producteurs du catalogue (ex: « Zaghouan, Tunisie »). */
  origins: string[];
}

export const NatureToTable: React.FC<NatureToTableProps> = ({ onDiscoverStory, origins }) => {
  const { t } = useTranslation('marketplace');
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  // Parallaxe douce de la photo dans son cadre.
  const imageY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const points = ['producers', 'reference', 'batch'] as const;

  return (
    <section ref={ref} id="nature-to-table" className="relative py-16 sm:py-24 bg-[#FAF6EE] overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Photo */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative order-last lg:order-first max-w-md mx-auto w-full"
        >
          <div className="absolute -inset-3 rounded-[2rem] border-2 border-dashed border-[#D49B37]/40 rotate-2 pointer-events-none" />
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl shadow-[#0C261B]/20">
            <motion.img
              src="/images/jabal.png"
              alt={t('marketplace:home.terroir.imageAlt')}
              loading="lazy"
              style={{ y: imageY, top: '-8%' }}
              className="absolute left-0 w-full h-[116%] object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
            className="absolute -bottom-5 -end-3 sm:-end-6"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-2.5 bg-[#0C261B] text-white rounded-2xl shadow-xl px-4 py-3"
            >
              <Mountain className="w-5 h-5 text-[#E5AC44]" />
              <span className="text-sm font-bold">{t('marketplace:home.terroir.badge')}</span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Texte */}
        <div className="flex flex-col items-start">
          <SectionHeading
            align="start"
            eyebrow={t('marketplace:home.terroir.eyebrow')}
            title={t('marketplace:natureToTable.titleLine1')}
            accent={t('marketplace:natureToTable.titleLine2')}
            subtitle={t('marketplace:home.terroir.description')}
          />

          <ul className="mt-6 space-y-3">
            {points.map((key, idx) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 + idx * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 w-6 h-6 rounded-full bg-[#1E6B56] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-[15px] text-[#0C261B] leading-relaxed">{t(`marketplace:home.terroir.points.${key}`)}</span>
              </motion.li>
            ))}
          </ul>

          {origins.length > 0 && (
            <div className="mt-7">
              <p className="text-sm font-bold text-[#576B64] mb-2.5">{t('marketplace:home.terroir.regionsLabel')}</p>
              <div className="flex flex-wrap gap-2">
                {origins.map((origin, idx) => (
                  <motion.span
                    key={origin}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                    className="inline-flex items-center gap-1.5 bg-white border border-[#EAE1D2] text-[#0C261B] text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#D49B37]" />
                    {origin}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="nature-story-btn"
            onClick={onDiscoverStory}
            className="mt-8 inline-flex items-center gap-2.5 bg-[#D49B37] hover:bg-[#C68A28] text-[#0C261B] font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-[#D49B37]/25 transition-colors cursor-pointer group"
          >
            {t('marketplace:natureToTable.cta')}
            <ForwardArrow />
          </motion.button>
        </div>
      </div>
    </section>
  );
};
