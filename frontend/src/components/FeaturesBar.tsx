import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { FlaskConical, Route, QrCode, MapPinned } from 'lucide-react';

// Quatre garanties concrètes, chacune reliée à une étape réelle du parcours de
// vérification (analyse, traçabilité, QR, producteurs tunisiens).
export const FeaturesBar: React.FC = () => {
  const { t } = useTranslation('marketplace');
  const features = [
    { key: 'lab', icon: FlaskConical },
    { key: 'traceable', icon: Route },
    { key: 'qr', icon: QrCode },
    { key: 'local', icon: MapPinned },
  ] as const;

  return (
    <section id="features-bar" className="relative bg-[#0C261B] text-white py-10 sm:py-12 overflow-hidden">
      <div className="absolute inset-0 bg-honeycomb-dark opacity-40 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-[#D49B37]/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map(({ key, icon: Icon }, idx) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="group relative flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 text-center sm:text-start rounded-2xl p-4 sm:p-5 bg-white/[0.04] border border-white/10 hover:border-[#D49B37]/50 hover:bg-white/[0.07] transition-colors"
            >
              <div className="relative shrink-0 w-12 h-12 rounded-xl bg-[#D49B37]/15 border border-[#D49B37]/40 text-[#E5AC44] flex items-center justify-center">
                <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {t(`marketplace:home.features.${key}.title`)}
                </h3>
                <p className="text-xs sm:text-sm text-[#C3D3CB] leading-relaxed mt-1">
                  {t(`marketplace:home.features.${key}.description`)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
