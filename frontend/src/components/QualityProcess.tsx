import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Flower2, Lock, FlaskConical, BadgeCheck, QrCode, Smartphone } from 'lucide-react';
import { SectionHeading } from './home/ui';

// « Parcours de confiance » : les six étapes réelles du flux Kounouz, du dépôt
// de la demande par le producteur jusqu'au scan du consommateur.
const STEPS = [
  { key: 'request', icon: Flower2 },
  { key: 'collect', icon: Lock },
  { key: 'lab', icon: FlaskConical },
  { key: 'decision', icon: BadgeCheck },
  { key: 'qr', icon: QrCode },
  { key: 'you', icon: Smartphone },
] as const;

export const QualityProcess: React.FC = () => {
  const { t } = useTranslation('marketplace');

  return (
    <section id="quality-process" className="relative py-16 sm:py-24 bg-white overflow-hidden">
      <div className="absolute -top-32 -end-32 w-96 h-96 rounded-full bg-[#FAF0DC] blur-3xl opacity-70 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('marketplace:home.journey.eyebrow')}
          title={t('marketplace:quality.headingPart1')}
          accent={t('marketplace:quality.headingPart2')}
          subtitle={t('marketplace:home.journey.subtitle')}
        />

        <div className="relative mt-14">
          {/* Ligne de progression — horizontale sur grand écran */}
          <div className="hidden lg:block absolute top-9 start-[8%] end-[8%] h-1 rounded-full bg-[#F1E8D8]" />
          <motion.div
            className="hidden lg:block absolute top-9 start-[8%] end-[8%] h-1 rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-[#D49B37] via-[#E5AC44] to-[#1E6B56] origin-left rtl:origin-right"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-120px' }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
          />
          {/* … et verticale sur mobile */}
          <div className="lg:hidden absolute top-2 bottom-2 start-[26px] w-1 rounded-full bg-[#F1E8D8]" />
          <motion.div
            className="lg:hidden absolute top-2 bottom-2 start-[26px] w-1 rounded-full bg-gradient-to-b from-[#D49B37] to-[#1E6B56] origin-top"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
          />

          <ol className="relative grid grid-cols-1 lg:grid-cols-6 gap-7 lg:gap-4">
            {STEPS.map(({ key, icon: Icon }, idx) => {
              const last = idx === STEPS.length - 1;
              return (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: 0.15 + idx * 0.22 }}
                  className="group flex lg:flex-col items-start lg:items-center gap-4 lg:gap-0 text-start lg:text-center"
                >
                  <div className="relative shrink-0">
                    <motion.div
                      whileHover={{ rotate: 6, scale: 1.06 }}
                      className={`relative z-10 w-14 h-14 lg:w-[72px] lg:h-[72px] rounded-2xl flex items-center justify-center shadow-md border-2 transition-colors ${
                        last
                          ? 'bg-[#1E6B56] border-[#1E6B56] text-white'
                          : 'bg-[#FAF6EE] border-[#D49B37] text-[#96661A] group-hover:bg-[#0C261B] group-hover:text-[#E5AC44]'
                      }`}
                    >
                      <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
                    </motion.div>
                    <span className="absolute -top-2 -end-2 z-20 w-6 h-6 rounded-full bg-[#0C261B] text-[#E5AC44] text-xs font-extrabold flex items-center justify-center border-2 border-white">
                      {idx + 1}
                    </span>
                    {last && (
                      <span className="absolute inset-0 rounded-2xl bg-[#1E6B56]/40 animate-ping motion-reduce:animate-none" />
                    )}
                  </div>
                  <div className="lg:mt-5 lg:px-1">
                    <h3 className="text-base lg:text-[17px] font-bold text-[#0C261B] leading-snug">
                      {t(`marketplace:home.journey.steps.${key}.title`)}
                    </h3>
                    <p className="text-sm text-[#576B64] leading-relaxed mt-1">
                      {t(`marketplace:home.journey.steps.${key}.description`)}
                    </p>
                    <span className="inline-block mt-2 text-[11px] font-bold text-[#96661A] bg-[#FAF0DC] px-2 py-0.5 rounded-full">
                      {t(`marketplace:home.journey.steps.${key}.who`)}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
