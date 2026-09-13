import React from 'react';
import { motion } from 'motion/react';
import { Leaf, MapPin, ShieldCheck, Gem } from 'lucide-react';

export const FeaturesBar: React.FC = () => {
  const features = [
    {
      icon: Leaf,
      title: '100% طبيعي',
      description: 'من الطبيعة كما هي',
    },
    {
      icon: MapPin,
      title: 'قابل للتتبع',
      description: 'نعرف مصدر كل منتج',
    },
    {
      icon: ShieldCheck,
      title: 'تم التحقق',
      description: 'اختبارات مخبرية دقيقة',
    },
    {
      icon: Gem,
      title: 'جودة ممتازة',
      description: 'معايير عالمية للنقاء',
    },
  ];

  return (
    <section id="features-bar" className="relative bg-[#0C261B] text-white py-7 sm:py-8 overflow-hidden shadow-inner">
      {/* Decorative Golden Top Hexagon Badge Accent */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
        <div className="w-6 h-6 bg-[#0C261B] border-2 border-[#D19A44] rotate-45 flex items-center justify-center shadow-md">
          <div className="w-2 h-2 bg-[#D19A44] rotate-45" />
        </div>
      </div>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-honeycomb-dark opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-4 lg:gap-8 items-center divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#1A3B2E]">
          
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                className={`flex flex-col items-center text-center px-3 sm:px-4 ${
                  idx > 1 ? 'pt-4 md:pt-0' : idx === 1 ? 'pt-0' : ''
                }`}
              >
                {/* Icon Circle */}
                <div className="mb-2.5 text-[#D19A44] flex items-center justify-center w-11 h-11 rounded-full bg-[#143B2B]/60 border border-[#D19A44]/30 transition-transform duration-300 hover:scale-110">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-white mb-1 tracking-tight">
                  {feature.title}
                </h3>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm text-[#A3B8B0] font-normal leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}

        </div>
      </div>
    </section>
  );
};
