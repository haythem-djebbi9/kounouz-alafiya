import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, QrCode } from 'lucide-react';

interface HeroSectionProps {
  onDiscover: () => void;
  onVerify: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onDiscover, onVerify }) => {
  return (
    <section
      id="hero-section"
      className="relative w-full overflow-hidden bg-[#F6F1EB] min-h-[480px] sm:min-h-[520px] md:min-h-[560px] lg:min-h-[600px] flex items-center"
    >
      {/* 
        Full Panoramic Banner Background (banner.png) 
        Positioned to show the honey jar and flowers clearly on the right
      */}
      <motion.div
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden"
      >
        <img
          src="/images/banner.png"
          alt="كنوز العافية - عسل طبيعي فاخر"
          className="w-full h-full object-cover object-[88%_center] lg:object-[86%_center]"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('banner2.png')) {
              target.src = '/images/banner2.png';
            }
          }}
        />
      </motion.div>

      {/* 
        Hero Content aligned to the LEFT of the page in a centered "Pyramid" shape
      */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10 sm:py-12 lg:py-16 flex justify-end">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="w-full max-w-md lg:max-w-lg flex flex-col items-center text-center ml-0 mr-auto lg:mr-8 xl:mr-16"
        >
          
          {/* Headline in Pyramid Shape (Short -> Medium -> Long) */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold leading-[1.25] tracking-tight text-[#0C261B] mb-4 flex flex-col items-center">
            <span className="block text-[#0C261B]">عسل نقي.</span>
            <span className="block text-[#0C261B] mt-0.5">عافية حقيقية.</span>
            <span className="block text-[#D19A44] mt-1 font-bold whitespace-nowrap">
              جودة يمكن التحقق منها.
            </span>
          </h1>

          {/* Subtitle in Pyramid Shape (Two centered lines) */}
          <p className="text-sm sm:text-base lg:text-[16.5px] text-[#77736A] font-normal leading-relaxed mb-6 sm:mb-8 flex flex-col items-center max-w-sm">
            <span>من خيرات الطبيعة، نختار لكم منتجات تجمع</span>
            <span>بين النقاء، العناية، والشفافية.</span>
          </p>

          {/* CTA Buttons side-by-side matching screenshot */}
          <div className="flex flex-row items-center justify-center gap-3 sm:gap-3.5 w-full">
            
            {/* Dark Green CTA Button: اكتشف منتجاتنا (Left button) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="hero-discover-btn"
              onClick={onDiscover}
              className="inline-flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              <span>اكتشف منتجاتنا</span>
            </motion.button>

            {/* Light Gold-Bordered CTA Button: تحقق من منتجك (Right button) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="hero-verify-btn"
              onClick={onVerify}
              className="inline-flex items-center justify-center gap-2 bg-[#F6F1EB]/90 hover:bg-[#EAE1D2] text-[#D19A44] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-[#D19A44] hover:border-[#C79A3B] transition-all duration-200 cursor-pointer group shadow-sm backdrop-blur-xs"
            >
              <span>تحقق من منتجك</span>
              <QrCode className="w-4 h-4 text-[#D19A44] group-hover:scale-110 transition-transform" />
            </motion.button>

          </div>

        </motion.div>
      </div>
    </section>
  );
};
