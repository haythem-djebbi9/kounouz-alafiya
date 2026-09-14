import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Smartphone,
  Info,
  AlertCircle,
  Leaf,
  FlaskConical,
  MapPin,
  QrCode,
  Sparkles,
  Check,
} from 'lucide-react';

const DEMO_CODES = ['KZ-QR-2026-000001', 'KZ-QR-2026-000002'];

export const VerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const guideRef = useRef<HTMLDivElement>(null);

  const handleVerify = (codeToVerify?: string) => {
    const code = (codeToVerify || inputCode).trim().toUpperCase();
    if (!code) {
      setErrorMsg('الرجاء إدخال رمز التحقق المطبوع على العبوة');
      return;
    }
    setErrorMsg('');
    navigate(`/verify/${encodeURIComponent(code)}`);
  };

  const scrollToGuide = () => {
    guideRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="relative min-h-screen pt-3 pb-8 sm:pt-5 sm:pb-12 text-[#0C261B] bg-no-repeat overflow-hidden"
      style={{
        backgroundImage: "url('/images/cover.png')",
        backgroundSize: 'contain',
        backgroundPosition: 'center top',
        backgroundColor: '#FAF6EE',
        backgroundAttachment: 'scroll',
      }}
      dir="rtl"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-7 sm:space-y-9">

        {/* 1. Bloc de recherche principal */}
        <div className="flex justify-end w-full sm:-translate-x-2 lg:-translate-x-6 -mt-1 sm:-mt-3">
          <div className="w-full max-w-xl lg:max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl border border-[#EAE1D2] overflow-hidden text-right">

            <div className="inline-flex items-center gap-1.5 bg-[#E7F3EE] text-[#1E6B56] px-3.5 py-1.5 rounded-full text-xs font-extrabold mb-3.5 border border-[#1E6B56]/20">
              <ShieldCheck className="w-4 h-4 text-[#1E6B56]" />
              <span>نظام التحقق المعتمد من كنوز العافية</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] mb-2 tracking-tight">
              التحقق من أصالة وجودة المنتج
            </h1>

            <p className="text-sm sm:text-base font-bold text-[#0C261B] mb-1.5">
              نضمن لك أن كل قطرة من كنوز العافية نقية 100% وموثوقة المصدر
            </p>

            {/* Scan direct par la caméra du téléphone — pas besoin de cette page */}
            <div className="flex items-start gap-3 bg-[#FAF0DC] border border-[#D49B37]/40 rounded-xl p-3.5 mb-4">
              <Smartphone className="w-5 h-5 text-[#C68A28] shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-[#576B64] leading-relaxed">
                امسح رمز QR الموجود على المنتج مباشرة بكاميرا هاتفك — ستفتح صفحة التحقق تلقائياً دون الحاجة لهذا الموقع.
              </p>
            </div>

            <div className="w-full text-center my-2 relative flex items-center justify-center">
              <div className="border-t border-[#DED4C3] w-full absolute" />
              <span className="bg-white px-3 text-[11px] font-bold text-[#8C7A60] relative z-10">
                أو أدخل الرمز يدوياً
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
              className="space-y-2.5 mt-3"
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="أدخل رمز التحقق هنا (مثال: KZ-QR-2026-000001)"
                  className="w-full px-3.5 py-2.5 sm:py-3 pl-10 rounded-xl bg-white border border-[#D5C7B0] text-xs sm:text-sm text-[#0C261B] placeholder:text-[#9BAAA2] focus:outline-none focus:ring-2 focus:ring-[#C68A28] shadow-inner font-medium text-right"
                  dir="rtl"
                />
                <ShieldCheck className="w-5 h-5 text-[#C68A28] absolute left-3 pointer-events-none" />
              </div>

              {errorMsg && (
                <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
              >
                <ShieldCheck className="w-4 h-4 text-[#D49B37]" />
                <span>تحقق الآن</span>
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-start gap-1.5 mt-4 text-[11px]">
              <span className="font-bold text-[#0C261B] flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-[#C68A28]" />
                رموز تجريبية:
              </span>
              {DEMO_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleVerify(code)}
                  className="px-2 py-0.5 bg-white border border-[#D5C7B0] hover:border-[#C68A28] hover:text-[#C68A28] text-[#0C261B] rounded-md font-mono text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  {code}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={scrollToGuide}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0C261B] hover:text-[#C68A28] mt-3.5 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[#C68A28]" />
              <span>أين أجد رمز التحقق على العبوة؟</span>
            </button>

          </div>
        </div>

        {/* 2. Bandeau de confiance */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-[#EAE1D2]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[#EAE1D2]">
            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#E7F3EE] border border-[#1E6B56]/30 flex items-center justify-center text-[#1E6B56] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">100% أصلي ومضمون</h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">نضمن لك جودة وأصالة كل منتج</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#FAF0DC] border border-[#D49B37]/30 flex items-center justify-center text-[#C68A28] shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">مصدر موثوق</h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">منتجاتنا من أفضل المناحل المختارة</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#FAF0DC] border border-[#D49B37]/30 flex items-center justify-center text-[#C68A28] shrink-0">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">مختبر ومعتمد</h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">تم اختباره وفق أعلى المعايير</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#E7F3EE] border border-[#1E6B56]/30 flex items-center justify-center text-[#1E6B56] shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">طبيعي بالكامل</h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">بدون إضافات أو مواد حافظة</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Guide : où trouver le code / que signifie le résultat */}
        <div ref={guideRef} className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-[#EAE1D2]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-4 flex flex-col items-start text-right border-b lg:border-b-0 lg:border-l lg:border-[#EAE1D2] pb-6 lg:pb-0 lg:pl-8">
              <h3 className="text-lg sm:text-xl font-extrabold text-[#0C261B] mb-2">أين أجد رمز التحقق؟</h3>
              <p className="text-xs sm:text-sm text-[#61746C] leading-relaxed mb-6">
                ستجد رمز التحقق (QR) على الملصق الجانبي للمنتج أو أسفل العبوة.
              </p>
              <div className="w-full flex justify-center mt-auto">
                <div className="relative p-4 bg-[#FAF6EE] rounded-2xl border border-[#EAE1D2] flex items-center justify-center max-w-[220px]">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-24 bg-white rounded-xl border-2 border-[#D49B37] relative flex flex-col items-center justify-between p-1.5 shadow-sm">
                      <div className="w-12 h-3 bg-[#D49B37] rounded-t" />
                      <div className="w-8 h-8 rounded-md bg-[#FAF6EE] border border-[#D49B37] flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-[#0C261B]" />
                      </div>
                      <div className="w-10 h-1.5 bg-[#EAE1D2] rounded-full" />
                    </div>
                    <div className="flex flex-col items-center text-[#C68A28]">
                      <span className="text-lg font-black">←</span>
                      <div className="p-1.5 bg-white rounded-lg border border-[#D49B37] shadow-sm">
                        <QrCode className="w-7 h-7 text-[#0C261B]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col text-right">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0C261B]">ماذا تعني نتيجة التحقق؟</h3>
                <div className="w-10 h-0.5 bg-[#D49B37] rounded-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#F6FAF8] rounded-2xl p-4 sm:p-5 border border-[#BCE1D4] flex flex-col items-center text-center shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-[#1E6B56] text-white flex items-center justify-center mb-3 shadow-sm">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#0C261B] mb-2">منتج موثّق</h4>
                  <p className="text-xs font-bold text-[#1E6B56] leading-relaxed">
                    تم التحقق من هذا المنتج مخبرياً — أصلي 100%
                  </p>
                </div>

                <div className="bg-[#FFFDF7] rounded-2xl p-4 sm:p-5 border border-[#F2DEB5] flex flex-col items-center text-center shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-[#E59819] text-white flex items-center justify-center mb-3 shadow-sm">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#0C261B] mb-2">موقوف مؤقتاً</h4>
                  <p className="text-xs text-[#7A8C85] leading-relaxed">
                    غير متاح حالياً للبيع. إذا اشتريته، يرجى التواصل معنا.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
