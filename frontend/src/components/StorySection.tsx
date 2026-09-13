import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

interface StorySectionProps {
  onReadMore: () => void;
}

export const StorySection: React.FC<StorySectionProps> = ({ onReadMore }) => {
  return (
    <section
      id="story-home-section"
      className="relative py-20 sm:py-28 lg:py-32 overflow-hidden bg-cover bg-center bg-no-repeat min-h-[480px] flex items-center border-b border-[#EAE1D2]/80"
      style={{
        backgroundImage: "url('/images/beekeeper.jpg')",
        backgroundPosition: "center 25%",
        backgroundSize: "cover",
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Right-aligned Text Container (in RTL) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl flex flex-col items-start text-right"
        >
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2 leading-tight drop-shadow-lg">
            قصتنا
          </h2>

          {/* Golden Ornamental Divider */}
          <div className="flex items-center gap-2.5 my-3">
            <div className="w-12 h-1 bg-[#D49B37] rounded-full shadow" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#D49B37] shadow" />
            <div className="w-6 h-1 bg-[#D49B37]/60 rounded-full shadow" />
          </div>

          <p className="text-base sm:text-lg lg:text-xl text-white font-semibold leading-relaxed mb-8 max-w-lg drop-shadow-lg">
            من قلب الطبيعة، ومن شغفنا بجودة الحياة، بدأت رحلة كنوز العافية. نختار بعناية أفضل مصادر العسل والمنتجات الطبيعية، ونعمل بشفافية لنقدم لك منتجات موثوقة، نقية، ومستدامة.
          </p>

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="story-read-more-btn"
            onClick={onReadMore}
            className="inline-flex items-center gap-3 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-xl hover:shadow-2xl border border-[#D49B37]/50 transition-all duration-200 cursor-pointer group backdrop-blur-sm"
          >
            <span>اقرأ المزيد</span>
            <ArrowLeft className="w-4 h-4 text-[#D49B37] transition-transform group-hover:-translate-x-1" />
          </motion.button>

        </motion.div>
      </div>
    </section>
  );
};
