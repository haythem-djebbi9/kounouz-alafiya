import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

// Briques communes des sections de la page d'accueil. La vitrine s'affiche en
// arabe (RTL) comme en français / anglais (LTR) : tout est écrit en propriétés
// logiques (start/end) et les flèches « vers l'avant » se retournent en RTL.

/** Flèche « continuer » orientée dans le sens de lecture. */
export const ForwardArrow: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <ArrowRight
    aria-hidden
    className={`${className} shrink-0 transition-transform rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1`}
  />
);

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  accent?: string;
  subtitle?: string;
  tone?: 'dark' | 'light';
  align?: 'center' | 'start';
}

/** Titre de section : sur-titre, titre (avec partie dorée) et phrase d'explication. */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  accent,
  subtitle,
  tone = 'dark',
  align = 'center',
}) => {
  const light = tone === 'light';
  const centered = align === 'center';
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={`${centered ? 'text-center mx-auto items-center' : 'text-start items-start'} flex flex-col max-w-2xl`}
    >
      {eyebrow && (
        <span
          className={`inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide mb-3 px-3 py-1 rounded-full border ${
            light ? 'text-[#E5AC44] border-[#E5AC44]/40 bg-white/5' : 'text-[#96661A] border-[#D49B37]/40 bg-[#FAF0DC]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-tight ${light ? 'text-white' : 'text-[#0C261B]'}`}>
        {title} {accent && <span className={light ? 'text-[#E5AC44]' : 'text-[#C68A28]'}>{accent}</span>}
      </h2>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        className={`h-1 w-16 rounded-full bg-gradient-to-r from-[#D49B37] to-[#E8C378] my-4 ${centered ? 'origin-center' : 'origin-left rtl:origin-right'}`}
      />
      {subtitle && (
        <p className={`text-base sm:text-lg leading-relaxed ${light ? 'text-[#C3D3CB]' : 'text-[#576B64]'}`}>{subtitle}</p>
      )}
    </motion.div>
  );
};

/** Hexagone décoratif (contour) utilisé pour les motifs flottants. */
export const Hexagon: React.FC<{ className?: string; filled?: boolean }> = ({ className, filled }) => (
  <svg viewBox="0 0 100 115" className={className} aria-hidden>
    <path
      d="M50 2 L97 29 L97 86 L50 113 L3 86 L3 29 Z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 3}
    />
  </svg>
);
