import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QrCode, ShieldCheck, FlaskConical, MapPin, Layers, BadgeCheck, Smartphone } from 'lucide-react';
import { ForwardArrow, SectionHeading } from './home/ui';

// Zone du QR sur /images/scan.png (image 3:2) — en pourcentages physiques, le
// cadre d'animation se superpose exactement au code imprimé sur la carte.
const QR_ZONE = { left: '45.6%', top: '56.4%', width: '10.4%', height: '13.4%' };

export const VerificationSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('marketplace');
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg(t('marketplace:verifyPage.errorEmpty'));
      return;
    }
    setErrorMsg('');
    navigate(`/verify/${encodeURIComponent(code)}`);
  };

  const sampleCodes = ['KZ-QR-2026-000001', 'KZ-QR-2026-000002'];
  const reveals = [
    { key: 'lab', icon: FlaskConical },
    { key: 'origin', icon: MapPin },
    { key: 'batch', icon: Layers },
    { key: 'status', icon: BadgeCheck },
  ] as const;

  return (
    <section id="verification-section" className="relative py-16 sm:py-24 bg-[#0C261B] overflow-hidden">
      <div className="absolute inset-0 bg-honeycomb-dark opacity-50 pointer-events-none" />
      <div className="absolute top-1/3 -start-40 w-[480px] h-[480px] rounded-full bg-[#D49B37]/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Texte + formulaire */}
        <div className="flex flex-col items-start">
          <SectionHeading
            align="start"
            tone="light"
            eyebrow={t('marketplace:home.verify.eyebrow')}
            title={t('marketplace:verifySection.headingPart1')}
            accent={t('marketplace:verifySection.headingPart2')}
            subtitle={t('marketplace:verifySection.description')}
          />

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-sm font-bold text-[#E5AC44]"
          >
            {t('marketplace:home.verify.revealsTitle')}
          </motion.p>
          <ul className="mt-3 grid grid-cols-2 gap-2.5 w-full max-w-lg">
            {reveals.map(({ key, icon: Icon }, idx) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.25 + idx * 0.08 }}
                className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5 text-sm text-white"
              >
                <Icon className="w-4 h-4 text-[#E5AC44] shrink-0" />
                {t(`marketplace:home.verify.reveals.${key}`)}
              </motion.li>
            ))}
          </ul>

          <form onSubmit={handleVerify} className="mt-7 w-full max-w-lg">
            <label htmlFor="batch-code-input" className="block text-sm font-semibold text-[#C3D3CB] mb-2">
              {t('marketplace:home.verify.inputLabel')}
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-white p-2 rounded-2xl shadow-xl focus-within:ring-4 focus-within:ring-[#D49B37]/40 transition-shadow">
              <div className="relative flex-grow flex items-center">
                <QrCode className="absolute start-3 w-5 h-5 text-[#C68A28] pointer-events-none" />
                <input
                  id="batch-code-input"
                  type="text"
                  dir="ltr"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="KZ-QR-2026-000001"
                  className="w-full ps-11 pe-3 py-3 text-base text-[#0C261B] placeholder:text-[#9AA8A2] bg-transparent focus:outline-none font-mono font-bold text-start"
                />
              </div>
              <button
                id="batch-submit-btn"
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-[#D49B37] hover:bg-[#E5AC44] text-[#0C261B] font-extrabold text-sm sm:text-base px-6 py-3 rounded-xl transition-colors cursor-pointer group shrink-0"
              >
                {t('marketplace:verifyPage.verifyCta')}
                <ForwardArrow />
              </button>
            </div>
            {errorMsg && (
              <p role="alert" className="text-xs font-bold text-rose-200 mt-2">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
              <span className="font-semibold text-[#C3D3CB]">{t('marketplace:verifySection.tryCodesLabel')}</span>
              {sampleCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => navigate(`/verify/${code}`)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#D49B37] hover:text-[#0C261B] text-white font-mono text-[11px] font-bold transition-colors cursor-pointer border border-white/15"
                >
                  {code}
                </button>
              ))}
            </div>
          </form>

          <p className="mt-6 flex items-start gap-2 text-sm text-[#A3B8B0] max-w-lg">
            <Smartphone className="w-4 h-4 text-[#E5AC44] shrink-0 mt-0.5" />
            {t('marketplace:verifyPage.scanHint')}
          </p>
        </div>

        {/* Visuel : le QR de l'étiquette est « scanné » en continu */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative"
        >
          <div className="relative aspect-[3/2] rounded-3xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/10">
            <img src="/images/scan.png" alt={t('marketplace:home.verify.imageAlt')} loading="lazy" className="w-full h-full object-cover" />

            <div className="absolute" style={QR_ZONE}>
              {/* coins du viseur */}
              {['top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-md', 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-md', 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md', 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md'].map((c) => (
                <motion.span
                  key={c}
                  className={`absolute w-1/4 h-1/4 border-emerald-400 ${c}`}
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
              <motion.span
                className="absolute inset-x-0 h-[3px] rounded-full bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,0.8)]"
                animate={{ top: ['6%', '92%', '6%'] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>

          {/* Résultat qui apparaît après le « scan » */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9, duration: 0.5, type: 'spring', bounce: 0.35 }}
            className="absolute -bottom-6 start-4 sm:start-8"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-2xl px-4 py-3 border border-emerald-100"
            >
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div className="text-start">
                <p className="text-sm font-extrabold text-emerald-800">{t('marketplace:verifyPage.guide.verified.title')}</p>
                <p className="text-xs text-[#6F827B]">{t('marketplace:home.verify.resultHint')}</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
