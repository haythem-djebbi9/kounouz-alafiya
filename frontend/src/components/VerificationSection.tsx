import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QrCode, ArrowLeft, ShieldCheck, Award, MapPin, Layers, Sparkles } from 'lucide-react';
import { VERIFICATION_BATCHES } from '../data/mockData';
import { VerificationBatch } from '../types';

interface VerificationSectionProps {
  onShowBatchDetails: (batch: VerificationBatch) => void;
  onOpenScanner: () => void;
}

export const VerificationSection: React.FC<VerificationSectionProps> = ({
  onShowBatchDetails,
  onOpenScanner,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg('الرجاء إدخال رمز التحقق المطبوع على العبوة');
      return;
    }

    const batch = VERIFICATION_BATCHES[code] || VERIFICATION_BATCHES['KZ-LUX-500'];
    setErrorMsg('');
    onShowBatchDetails(batch);
  };

  const sampleCodes = ['KZ-LUX-500', 'KZ-SIDR-2025', 'KZ-STICK-2025'];

  return (
    <section
      id="verification-section"
      className="relative py-16 sm:py-24 border-b border-[#EAE1D2]/80 overflow-hidden bg-cover bg-center bg-no-repeat min-h-[460px] flex items-center"
      style={{
        backgroundImage: "url('/images/banner2.png')",
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-end">
        {/* Left-aligned Content Card / Area (via justify-end in RTL) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl flex flex-col items-start text-right"
        >
          
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0C261B] mb-2 leading-tight drop-shadow-sm">
            لا تكتفِ بالثقة. <span className="text-[#C68A28]">تحقق.</span>
          </h2>

          {/* Golden Ornamental Line */}
          <div className="flex items-center gap-2 my-2">
            <div className="w-12 h-1 bg-[#D49B37] rounded-full" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#D49B37]" />
            <div className="w-6 h-1 bg-[#D49B37]/40 rounded-full" />
          </div>

          <p className="text-base sm:text-lg text-[#0C261B] font-semibold leading-relaxed max-w-lg mb-7">
            امسح رمز QR الموجود على منتجك أو أدخل رمز التحقق لمعرفة معلوماته ومصدره ونتائج الاختبار.
          </p>

          {/* Verification Input Box Form */}
          <form onSubmit={handleVerify} className="w-full max-w-lg mb-4">
            <div className="flex flex-col sm:flex-row items-stretch gap-3 bg-white p-2 rounded-xl border-2 border-[#D49B37] shadow-lg">
              
              {/* Text Input with Scan Button */}
              <div className="relative flex-grow flex items-center">
                <input
                  id="batch-code-input"
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="أدخل رمز التحقق (مثال: KZ-LUX-500)"
                  className="w-full pl-10 pr-4 py-3 text-sm sm:text-base text-[#0C261B] placeholder:text-[#9AA8A2] bg-transparent focus:outline-none font-bold"
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={onOpenScanner}
                  title="مسح الكاميرا للرمز"
                  className="absolute left-2.5 p-2 text-[#C68A28] hover:text-[#0C261B] hover:bg-[#FAF6EE] rounded-lg transition-colors cursor-pointer"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              {/* Submit Button */}
              <button
                id="batch-submit-btn"
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm sm:text-base px-6 py-3 rounded-lg transition-all duration-200 cursor-pointer shadow-md group shrink-0"
              >
                <span>تحقق الآن</span>
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </button>

            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600 mt-1.5 mr-2 bg-white/90 px-2 py-0.5 rounded inline-block">
                {errorMsg}
              </p>
            )}

            {/* Sample Batch Codes Chips */}
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="font-bold text-[#0C261B] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D49B37]" />
                جرّب رموز جاهزة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sampleCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setInputCode(code);
                      onShowBatchDetails(VERIFICATION_BATCHES[code]);
                    }}
                    className="px-2.5 py-1 rounded bg-white hover:bg-[#D49B37] hover:text-white text-[#0C261B] font-mono text-[11px] font-bold transition-all cursor-pointer border border-[#D49B37]/50 shadow-sm"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* 4 Quick Badges with Icons and Sublabels */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 w-full max-w-lg pt-4 border-t border-[#D49B37]/40 mt-2">
            
            <div className="flex flex-col items-center text-center bg-white/80 p-2 rounded-xl border border-[#D49B37]/30 shadow-sm backdrop-blur-[1px]">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D49B37]/60 flex items-center justify-center text-[#C68A28] mb-1 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0C261B]">المصدر</span>
              <span className="text-[10px] text-[#7A8C85] font-semibold">Origin</span>
            </div>

            <div className="flex flex-col items-center text-center bg-white/80 p-2 rounded-xl border border-[#D49B37]/30 shadow-sm backdrop-blur-[1px]">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D49B37]/60 flex items-center justify-center text-[#C68A28] mb-1 shadow-sm">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0C261B]">الدفعة</span>
              <span className="text-[10px] text-[#7A8C85] font-semibold">Batch</span>
            </div>

            <div className="flex flex-col items-center text-center bg-white/80 p-2 rounded-xl border border-[#D49B37]/30 shadow-sm backdrop-blur-[1px]">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D49B37]/60 flex items-center justify-center text-[#C68A28] mb-1 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0C261B]">الجودة</span>
              <span className="text-[10px] text-[#7A8C85] font-semibold">Quality</span>
            </div>

            <div className="flex flex-col items-center text-center bg-white/80 p-2 rounded-xl border border-[#D49B37]/30 shadow-sm backdrop-blur-[1px]">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D49B37]/60 flex items-center justify-center text-[#C68A28] mb-1 shadow-sm">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0C261B]">التحقق</span>
              <span className="text-[10px] text-[#7A8C85] font-semibold">Verification</span>
            </div>

          </div>

        </motion.div>
      </div>
    </section>
  );
};
