import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { QrCode, ShieldCheck, CheckCircle2, ChevronDown, MapPin } from 'lucide-react';
import type { Product } from '../types';
import { ForwardArrow, Hexagon } from './home/ui';

interface HeroSectionProps {
  onDiscover: () => void;
  onVerify: () => void;
  /** Produit réel mis en avant dans la carte « lot vérifié » (desktop). */
  featured?: Product;
}

// Motif flottant : positions physiques (côté gauche, zone crème de l'image).
const FLOATING_HEXAGONS = [
  { left: '4%', top: '14%', size: 'w-10', duration: 7, delay: 0, opacity: 'opacity-30' },
  { left: '38%', top: '8%', size: 'w-6', duration: 6, delay: 1.2, opacity: 'opacity-25' },
  { left: '44%', top: '72%', size: 'w-8', duration: 8, delay: 0.6, opacity: 'opacity-20' },
  { left: '10%', top: '80%', size: 'w-5', duration: 5.5, delay: 2, opacity: 'opacity-30' },
];

// Grains de pollen dorés qui montent doucement.
const POLLEN = [8, 18, 27, 36, 52, 61, 70, 83, 92];

export const HeroSection: React.FC<HeroSectionProps> = ({ onDiscover, onVerify, featured }) => {
  const { t } = useTranslation(['marketplace', 'common']);
  const lines = [t('marketplace:hero.titleLine1'), t('marketplace:hero.titleLine2')];
  const points = [
    t('marketplace:home.hero.points.lab'),
    t('marketplace:home.hero.points.origin'),
    t('marketplace:home.hero.points.qr'),
  ];

  const scrollToProducts = () =>
    document.getElementById('discover-treasures')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section
      id="hero-section"
      className="relative w-full overflow-hidden bg-[#F6F1EB] min-h-[660px] md:min-h-[600px] lg:min-h-[660px] flex items-start md:items-center"
    >
      {/* Image de fond : léger zoom lent (effet Ken Burns) */}
      <motion.img
        src="/images/banner.png"
        alt={t('marketplace:hero.imageAlt')}
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
        className="absolute inset-0 w-full h-full object-cover object-[82%_bottom] md:object-[86%_center] select-none pointer-events-none"
      />

      {/* Voiles de lisibilité : le texte ne passe jamais sur le pot de miel */}
      <div className="absolute inset-0 md:hidden bg-gradient-to-b from-[#F6F1EB] via-[#F6F1EB]/90 via-55% to-[#F6F1EB]/0 pointer-events-none" />
      <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-[#F6F1EB] via-[#F6F1EB]/85 via-40% to-transparent to-70% pointer-events-none" />

      {/* Motif d'alvéoles flottantes */}
      {FLOATING_HEXAGONS.map((h, i) => (
        <motion.div
          key={i}
          className={`absolute text-[#D49B37] ${h.opacity} pointer-events-none hidden sm:block`}
          style={{ left: h.left, top: h.top }}
          animate={{ y: [0, -16, 0], rotate: [0, 8, 0] }}
          transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Hexagon className={h.size} />
        </motion.div>
      ))}
      {POLLEN.map((left, i) => (
        <motion.span
          key={left}
          className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-[#E5AC44] pointer-events-none"
          style={{ left: `${left}%` }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [-10, -420], opacity: [0, 0.8, 0] }}
          transition={{ duration: 9 + (i % 4), delay: i * 1.1, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* Contenu : toujours dans la zone claire (à gauche physiquement) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-56 sm:pb-64 md:py-16">
        <div className="w-full max-w-xl mx-auto md:ml-0 md:mr-auto flex flex-col items-center md:items-start text-center md:text-start">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#D49B37]/40 text-[#0C261B] text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full shadow-sm mb-5"
          >
            <ShieldCheck className="w-4 h-4 text-[#1E6B56]" />
            {t('marketplace:home.hero.eyebrow')}
          </motion.span>

          <h1 className="text-[34px] sm:text-5xl lg:text-[56px] font-extrabold leading-[1.2] tracking-tight text-[#0C261B] mb-5">
            {lines.map((line, i) => (
              <motion.span
                key={i}
                className="block"
                initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.15, ease: 'easeOut' }}
              >
                {line}
              </motion.span>
            ))}
            <motion.span
              className="block mt-1 text-[0.8em] bg-gradient-to-r from-[#B8802A] via-[#E5AC44] to-[#B8802A] bg-[length:200%_auto] bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', backgroundPosition: ['0% 50%', '200% 50%'] }}
              transition={{
                opacity: { duration: 0.7, delay: 0.45 },
                y: { duration: 0.7, delay: 0.45 },
                filter: { duration: 0.7, delay: 0.45 },
                backgroundPosition: { duration: 6, repeat: Infinity, ease: 'linear' },
              }}
            >
              {t('common:appTagline')}.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="text-base sm:text-lg text-[#4F5F58] leading-relaxed mb-7 max-w-lg"
          >
            {t('marketplace:home.hero.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              id="hero-discover-btn"
              onClick={onDiscover}
              className="relative overflow-hidden inline-flex items-center justify-center gap-2.5 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-lg shadow-[#0C261B]/20 transition-colors cursor-pointer group"
            >
              {/* reflet qui traverse le bouton */}
              <motion.span
                aria-hidden
                className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg]"
                animate={{ x: ['0%', '480%'] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
              />
              <span className="relative">{t('marketplace:hero.discoverCta')}</span>
              <ForwardArrow className="relative w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              id="hero-verify-btn"
              onClick={onVerify}
              className="inline-flex items-center justify-center gap-2.5 bg-white/85 hover:bg-white text-[#96661A] font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl border-2 border-[#D49B37] shadow-sm backdrop-blur-sm transition-colors cursor-pointer group"
            >
              <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>{t('marketplace:actions.verifyProduct')}</span>
            </motion.button>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 1 } } }}
            className="mt-7 flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2"
          >
            {points.map((point) => (
              <motion.li
                key={point}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C261B]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#1E6B56]" />
                {point}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>

      {/* Carte « lot vérifié » flottante, à côté du pot (grands écrans) */}
      {featured?.batchCode && (
        <motion.div
          className="hidden xl:block absolute z-10"
          style={{ right: '25%', bottom: '13%' }}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 1.2, ease: 'easeOut' }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-64 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-[#0C261B]/15 border border-white p-4 text-start"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex w-10 h-10 shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping motion-reduce:animate-none" />
                <span className="relative w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-emerald-800">{t('marketplace:home.hero.card.status')}</p>
                <p className="text-xs text-[#6F827B] truncate">{featured.name}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#EAE1D2] space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6F827B]">{t('marketplace:home.hero.card.batch')}</span>
                <span dir="ltr" className="font-mono font-bold text-[#0C261B]">{featured.batchCode}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6F827B]">{t('marketplace:home.hero.card.origin')}</span>
                <span className="inline-flex items-center gap-1 font-bold text-[#0C261B] truncate">
                  <MapPin className="w-3 h-3 text-[#D49B37] shrink-0" />
                  {featured.producerLocation ?? featured.origin}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Invitation à défiler */}
      <motion.button
        type="button"
        onClick={scrollToProducts}
        aria-label={t('marketplace:home.hero.scroll')}
        className="hidden md:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-1 text-[#0C261B]/70 hover:text-[#0C261B] text-xs font-semibold cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        <span>{t('marketplace:home.hero.scroll')}</span>
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </motion.button>
    </section>
  );
};
