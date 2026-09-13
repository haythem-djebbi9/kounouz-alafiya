import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

interface NatureToTableProps {
  onDiscoverStory: () => void;
}

export const NatureToTable: React.FC<NatureToTableProps> = ({ onDiscoverStory }) => {
  return (
    <section
      id="nature-to-table"
      className="relative overflow-hidden py-20 sm:py-28 lg:py-32 border-y border-[#1C4A3E] bg-cover bg-center bg-no-repeat flex items-center min-h-[480px]"
      style={{
        backgroundImage: "url('/images/3sal.jpg')",
        backgroundPosition: "center 40%",
        backgroundSize: "cover",
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Right-aligned text content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl text-right"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#FAF6EE] leading-tight mb-4 drop-shadow-md">
            من الطبيعة
            <br />
            <span className="text-[#E5AC44]">إلى مائدتك</span>
          </h2>

          {/* Golden Decorative Line */}
          <div className="flex items-center gap-2 my-4">
            <div className="w-12 h-1 bg-[#D49B37] rounded-full" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#D49B37]" />
            <div className="w-6 h-1 bg-[#D49B37]/40 rounded-full" />
          </div>

          <p className="text-base sm:text-lg lg:text-xl text-[#FAF6EE] leading-relaxed font-bold mb-8 max-w-lg drop-shadow-md">
            نؤمن أن جودة المنتج تبدأ من مصدره، وتكتمل بالشفافية التي تمنحك الثقة.
          </p>

          {/* Gold CTA Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="nature-story-btn"
            onClick={onDiscoverStory}
            className="inline-flex items-center gap-3 bg-[#D49B37] hover:bg-[#C68A28] text-[#0C261B] font-bold text-base px-8 py-3.5 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer group"
          >
            <span>اكتشف قصتنا</span>
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

