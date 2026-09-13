import React from 'react';
import { motion } from 'motion/react';
import { Mountain, Box, ShieldCheck, Microscope } from 'lucide-react';

export const QualityProcess: React.FC = () => {
  const steps = [
    {
      icon: Mountain,
      title: 'المصدر',
      enTitle: 'Origin',
      description: 'نختار أفضل المصادر الطبيعية والمحميات الجبلية النقية.',
    },
    {
      icon: Box,
      title: 'الدفعة',
      enTitle: 'Batch',
      description: 'كل منتج يحمل رقم دفعة فريد مسجل في منظومة التتبع.',
    },
    {
      icon: ShieldCheck,
      title: 'الجودة',
      enTitle: 'Quality',
      description: 'اختبارات دقيقة ومعايير عالمية تضمن النقاء التام.',
    },
    {
      icon: Microscope,
      title: 'التحقق',
      enTitle: 'Verification',
      description: 'معلومات شفافة ونتائج مخبرية يمكن التحقق منها بلمسة واحدة.',
    },
  ];

  return (
    <section id="quality-process" className="py-16 sm:py-20 bg-[#FAF6EE] border-b border-[#EAE1D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0C261B] mb-3">
            الجودة ليست وعداً. <span className="text-[#C68A28]">إنها عملية.</span>
          </h2>

          {/* Golden Divider */}
          <div className="flex items-center justify-center gap-3 my-2">
            <div className="w-12 h-px bg-[#D49B37]" />
            <div className="w-2.5 h-2.5 rounded-full border border-[#D49B37] bg-[#FAF6EE] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#D49B37]" />
            </div>
            <div className="w-12 h-px bg-[#D49B37]" />
          </div>
        </motion.div>

        {/* 4 Hexagonal Connected Badges */}
        <div className="relative">
          
          {/* Horizontal Golden Connecting Line on Desktop */}
          <div className="hidden lg:block absolute top-14 right-16 left-16 h-0.5 bg-gradient-to-l from-[#D49B37]/20 via-[#D49B37] to-[#D49B37]/20 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="flex flex-col items-center text-center group"
                >
                  {/* Hexagonal Icon Frame with Gold Border */}
                  <div className="relative mb-5 flex items-center justify-center">
                    <div className="w-24 h-24 bg-[#FAF6EE] border-2 border-[#D49B37] rounded-2xl rotate-45 flex items-center justify-center shadow-md group-hover:scale-105 group-hover:bg-[#FAF0DC] transition-all duration-300">
                      <div className="-rotate-45 text-[#C68A28] group-hover:text-[#0C261B] transition-colors">
                        <Icon className="w-8 h-8 stroke-[1.8]" />
                      </div>
                    </div>
                  </div>

                  {/* Title & Sublabel */}
                  <h3 className="text-xl font-bold text-[#0C261B] mb-0.5">
                    {step.title}
                  </h3>
                  <span className="text-xs font-semibold text-[#8C7A60] tracking-wider mb-2 font-mono uppercase">
                    {step.enTitle}
                  </span>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-[#576B64] font-normal leading-relaxed max-w-[220px]">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
