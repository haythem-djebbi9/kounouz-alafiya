import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageCircle } from 'lucide-react';
import { SectionHeading } from './ui';

const QUESTIONS = ['verified', 'whereQr', 'problem', 'prices', 'producer'] as const;

interface HomeFaqProps {
  onContact: () => void;
}

export const HomeFaq: React.FC<HomeFaqProps> = ({ onContact }) => {
  const { t } = useTranslation('marketplace');
  const [open, setOpen] = useState<string | null>(QUESTIONS[0]);

  return (
    <section id="home-faq" className="py-16 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('marketplace:home.faq.eyebrow')}
          title={t('marketplace:home.faq.title')}
          subtitle={t('marketplace:home.faq.subtitle')}
        />

        <div className="mt-10 space-y-3">
          {QUESTIONS.map((key, idx) => {
            const isOpen = open === key;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                className={`rounded-2xl border transition-colors ${
                  isOpen ? 'border-[#D49B37] bg-[#FFFBF3] shadow-sm' : 'border-[#EAE1D2] bg-white hover:border-[#D49B37]/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start cursor-pointer"
                >
                  <span className="text-base font-bold text-[#0C261B]">{t(`marketplace:home.faq.items.${key}.q`)}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isOpen ? 'bg-[#D49B37] text-[#0C261B]' : 'bg-[#FAF6EE] text-[#96661A]'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-[15px] text-[#4F5F58] leading-relaxed">
                        {t(`marketplace:home.faq.items.${key}.a`)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onContact}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#96661A] hover:text-[#0C261B] transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            {t('marketplace:home.faq.contact')}
          </button>
        </div>
      </div>
    </section>
  );
};
