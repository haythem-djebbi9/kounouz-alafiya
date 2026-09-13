import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Camera,
  Upload,
  Keyboard,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Phone,
  Leaf,
  FlaskConical,
  MapPin,
  QrCode,
  Sparkles,
  Check,
  Image as ImageIcon
} from 'lucide-react';
import { VerificationBatch } from '../types';
import { VERIFICATION_BATCHES } from '../data/mockData';

interface VerificationPageProps {
  onShowBatchDetails: (batch: VerificationBatch) => void;
  onNavigateContact?: () => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  onShowBatchDetails,
  onNavigateContact,
}) => {
  const [method, setMethod] = useState<'code' | 'camera' | 'upload'>('code');
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);

  const sampleCodes = ['KNOZ-24A5-B7C9', 'KZ-LUX-500', 'KZ-SIDR-2025', 'KZ-STICK-2025'];

  const handleVerify = (codeToVerify?: string) => {
    const code = (codeToVerify || inputCode).trim().toUpperCase();
    if (!code) {
      setErrorMsg('الرجاء إدخال رمز التحقق المطبوع على العبوة');
      return;
    }

    const batch = VERIFICATION_BATCHES[code] || VERIFICATION_BATCHES['KZ-LUX-500'];
    setErrorMsg('');
    onShowBatchDetails(batch);
  };

  const handleCameraScan = (simulatedCode: string) => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setInputCode(simulatedCode);
      handleVerify(simulatedCode);
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setScanning(true);
      setTimeout(() => {
        setScanning(false);
        const randomCode = 'KNOZ-24A5-B7C9';
        setInputCode(randomCode);
        handleVerify(randomCode);
      }, 1400);
    }
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
        
        {/* 1. Main Verification Section positioned further to the visual LEFT and higher UP */}
        <div className="flex justify-end w-full sm:-translate-x-2 lg:-translate-x-6 -mt-1 sm:-mt-3">
          <div className="w-full max-w-xl lg:max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl border border-[#EAE1D2] overflow-hidden text-right">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#E7F3EE] text-[#1E6B56] px-3.5 py-1.5 rounded-full text-xs font-extrabold mb-3.5 border border-[#1E6B56]/20">
              <ShieldCheck className="w-4 h-4 text-[#1E6B56]" />
              <span>نظام التحقق الذكي المعتمد</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] mb-2 tracking-tight">
              التحقق من أصالة وجودة المنتج
            </h1>

            {/* Subtitles */}
            <p className="text-sm sm:text-base font-bold text-[#0C261B] mb-1.5">
              نضمن لك أن كل قطرة من كنوز العافية نقية 100% وموثوقة المصدر
            </p>
            <p className="text-xs sm:text-sm text-[#61746C] leading-relaxed mb-5 max-w-xl">
              أدخل رمز التحقق الموجود على الملصق، أو قم بمسحه بالكاميرا، أو حمّل صورة الرمز للتحقق الفوري من نتائج الفحص المخبري وتاريخ الإنتاج ومصدر المنحل.
            </p>

            {/* Method Selector Title Divider */}
            <div className="w-full text-center my-2 relative flex items-center justify-center">
              <div className="border-t border-[#DED4C3] w-full absolute" />
              <span className="bg-white px-3 text-[11px] font-bold text-[#8C7A60] relative z-10">
                اختر طريقة التحقق
              </span>
            </div>

            {/* 3 Tabs / Buttons (Row) */}
            <div className="grid grid-cols-3 gap-2 w-full my-3">
              
              {/* Method 1: Enter Code */}
              <button
                type="button"
                onClick={() => setMethod('code')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer text-center ${
                  method === 'code'
                    ? 'bg-white border-[#C68A28] shadow-sm ring-1 ring-[#C68A28]'
                    : 'bg-[#F4EFE6]/80 border-[#E2D8C7] hover:bg-white text-[#52645D]'
                }`}
              >
                <Keyboard
                  className={`w-4 h-4 mb-1 ${
                    method === 'code' ? 'text-[#C68A28]' : 'text-[#7D9087]'
                  }`}
                />
                <span className="text-[11px] sm:text-xs font-bold text-[#0C261B] block">
                  إدخال الرمز
                </span>
                <span className="text-[9px] text-[#7D9087] mt-0.5 hidden sm:block">
                  أدخل الرمز يدويًا
                </span>
              </button>

              {/* Method 2: Camera Scan */}
              <button
                type="button"
                onClick={() => setMethod('camera')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer text-center ${
                  method === 'camera'
                    ? 'bg-white border-[#C68A28] shadow-sm ring-1 ring-[#C68A28]'
                    : 'bg-[#F4EFE6]/80 border-[#E2D8C7] hover:bg-white text-[#52645D]'
                }`}
              >
                <Camera
                  className={`w-4 h-4 mb-1 ${
                    method === 'camera' ? 'text-[#C68A28]' : 'text-[#7D9087]'
                  }`}
                />
                <span className="text-[11px] sm:text-xs font-bold text-[#0C261B] block">
                  مسح بالكاميرا
                </span>
                <span className="text-[9px] text-[#7D9087] mt-0.5 hidden sm:block">
                  استخدم كاميرا الجهاز
                </span>
              </button>

              {/* Method 3: Upload Image */}
              <button
                type="button"
                onClick={() => setMethod('upload')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer text-center ${
                  method === 'upload'
                    ? 'bg-white border-[#C68A28] shadow-sm ring-1 ring-[#C68A28]'
                    : 'bg-[#F4EFE6]/80 border-[#E2D8C7] hover:bg-white text-[#52645D]'
                }`}
              >
                <Upload
                  className={`w-4 h-4 mb-1 ${
                    method === 'upload' ? 'text-[#C68A28]' : 'text-[#7D9087]'
                  }`}
                />
                <span className="text-[11px] sm:text-xs font-bold text-[#0C261B] block">
                  تحميل صورة
                </span>
                <span className="text-[9px] text-[#7D9087] mt-0.5 hidden sm:block">
                  تحميل الرمز من جهازك
                </span>
              </button>

            </div>

            {/* Dynamic Method Form / Area */}
            <div className="w-full mt-2">
              {method === 'code' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerify();
                  }}
                  className="space-y-2.5"
                >
                  {/* Text Input with Shield Check inside */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => {
                        setInputCode(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="أدخل رمز التحقق هنا (مثال: KZ-LUX-500)"
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

                  {/* Verify Now Button */}
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#D49B37]" />
                    <span>تحقق الآن</span>
                  </button>
                </form>
              )}

              {method === 'camera' && (
                <div className="bg-white rounded-xl p-4 border border-[#D5C7B0] text-center space-y-3 shadow-sm">
                  <div className="relative w-full max-w-xs mx-auto aspect-video bg-[#0C261B] rounded-lg overflow-hidden flex flex-col items-center justify-center text-white border border-[#D49B37]/40">
                    {scanning && (
                      <div className="absolute inset-x-0 h-0.5 bg-[#D49B37] shadow-[0_0_12px_#D49B37] animate-pulse top-1/2" />
                    )}
                    <QrCode className={`w-10 h-10 text-[#D49B37] ${scanning ? 'animate-bounce' : 'opacity-80'}`} />
                    <p className="text-[10px] text-[#EAE1D2] mt-1.5 font-medium">
                      {scanning ? 'جارِ قراءة الرمز والتحقق...' : 'وجّه الكاميرا نحو رمز QR على المنتج'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCameraScan('KNOZ-24A5-B7C9')}
                    disabled={scanning}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#0C261B] hover:bg-[#143B2B] text-white text-xs font-bold px-4 py-2 rounded-lg shadow cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#D49B37]" />
                    <span>{scanning ? 'جارِ الفحص...' : 'بدء المسح الآن'}</span>
                  </button>
                </div>
              )}

              {method === 'upload' && (
                <div className="bg-white rounded-xl p-4 border-2 border-dashed border-[#D49B37]/60 text-center space-y-2 shadow-sm">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center mx-auto text-[#C68A28]">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0C261B]">
                      {uploadedFileName ? `تم اختيار: ${uploadedFileName}` : 'اسحب وأفلت صورة الرمز هنا أو تصفح'}
                    </p>
                    <p className="text-[10px] text-[#7D9087] mt-0.5">
                      JPG، PNG، WEBP
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#0C261B] hover:bg-[#143B2B] text-white text-[11px] font-bold px-4 py-2 rounded-lg shadow cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D49B37]" />
                    <span>اختيار صورة من الجهاز</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sample Codes Helper Bar */}
            <div className="flex flex-wrap items-center justify-start gap-1.5 mt-4 text-[11px]">
              <span className="font-bold text-[#0C261B] flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-[#C68A28]" />
                رموز تجريبية:
              </span>
              {sampleCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setInputCode(code);
                    handleVerify(code);
                  }}
                  className="px-2 py-0.5 bg-white border border-[#D5C7B0] hover:border-[#C68A28] hover:text-[#C68A28] text-[#0C261B] rounded-md font-mono text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Where do I find the code link */}
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

        {/* 2. Trust Features Strip (4 Columns Bar) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-[#EAE1D2]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[#EAE1D2]">
            
            {/* 1. 100% أصلي ومضمون */}
            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#E7F3EE] border border-[#1E6B56]/30 flex items-center justify-center text-[#1E6B56] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">
                  100% أصلي ومضمون
                </h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">
                  نضمن لك جودة وأصالة كل منتج
                </p>
              </div>
            </div>

            {/* 2. مصدر موثوق */}
            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#FAF0DC] border border-[#D49B37]/30 flex items-center justify-center text-[#C68A28] shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">
                  مصدر موثوق
                </h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">
                  منتجاتنا من أفضل المناحل المختارة
                </p>
              </div>
            </div>

            {/* 3. مختبر ومعتمد */}
            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#FAF0DC] border border-[#D49B37]/30 flex items-center justify-center text-[#C68A28] shrink-0">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">
                  مختبر ومعتمد
                </h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">
                  تم اختباره وفق أعلى المعايير
                </p>
              </div>
            </div>

            {/* 4. طبيعي بالكامل */}
            <div className="flex items-center gap-3.5 p-3 sm:p-4 text-right">
              <div className="w-12 h-12 rounded-xl bg-[#E7F3EE] border border-[#1E6B56]/30 flex items-center justify-center text-[#1E6B56] shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0C261B]">
                  طبيعي بالكامل
                </h4>
                <p className="text-xs text-[#7A8C85] mt-0.5">
                  بدون إضافات أو مواد حافظة
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* 3. Bottom Guide / Verification Results Explanations */}
        <div ref={guideRef} className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-[#EAE1D2]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            
            {/* Right: Where do I find verification code? (Span 4) */}
            <div className="lg:col-span-4 flex flex-col items-start text-right border-b lg:border-b-0 lg:border-l lg:border-[#EAE1D2] pb-6 lg:pb-0 lg:pl-8">
              <h3 className="text-lg sm:text-xl font-extrabold text-[#0C261B] mb-2">
                أين أجد رمز التحقق؟
              </h3>
              <p className="text-xs sm:text-sm text-[#61746C] leading-relaxed mb-6">
                ستجد رمز التحقق (QR) أو كود مكون من أحرف وأرقام على الملصق الجانبي للمنتج أو أسفل العبوة.
              </p>

              {/* Jar Illustration with Arrow to QR Tag */}
              <div className="w-full flex justify-center mt-auto">
                <div className="relative p-4 bg-[#FAF6EE] rounded-2xl border border-[#EAE1D2] flex items-center justify-center max-w-[220px]">
                  {/* Jar Vector representation */}
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

            {/* Left: What does the verification result mean? (Span 8) */}
            <div className="lg:col-span-8 flex flex-col text-right">
              
              <div className="flex items-center gap-2 mb-6">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0C261B]">
                  ماذا تعني نتيجة التحقق؟
                </h3>
                <div className="w-10 h-0.5 bg-[#D49B37] rounded-full" />
              </div>

              {/* 3 Result Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. تم التحقق مسبقًا (Amber Warning) */}
                <div className="bg-[#FFFDF7] rounded-2xl p-4 sm:p-5 border border-[#F2DEB5] flex flex-col items-center text-center shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-[#E59819] text-white flex items-center justify-center mb-3 shadow-sm">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#0C261B] mb-2">
                    تم التحقق مسبقًا
                  </h4>
                  <p className="text-xs text-[#7A8C85] leading-relaxed mb-1">
                    تم التحقق من هذا الرمز مسبقًا في:
                  </p>
                  <span className="text-xs font-bold text-[#0C261B] font-mono mb-2" dir="ltr">
                    22 مايو 2024 - 14:35
                  </span>
                  <p className="text-[11px] text-[#A3B8B0] leading-relaxed mt-auto pt-2 border-t border-[#F5EAD4] w-full">
                    إذا لم تكن أنت من قام بالتحقق، يرجى التواصل معنا.
                  </p>
                </div>

                {/* 2. منتج أصلي (Green Success) */}
                <div className="bg-[#F6FAF8] rounded-2xl p-4 sm:p-5 border border-[#BCE1D4] flex flex-col items-center text-center shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-[#1E6B56] text-white flex items-center justify-center mb-3 shadow-sm">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#0C261B] mb-2">
                    منتج أصلي
                  </h4>
                  <p className="text-xs font-bold text-[#1E6B56] leading-relaxed mb-1">
                    تهانينا! المنتج أصلي 100%
                  </p>
                  <p className="text-xs text-[#5C7269] leading-relaxed mt-auto pt-2 border-t border-[#D7EFE6] w-full">
                    شكرًا لثقتك في كنوز العافية.
                  </p>
                </div>

                {/* 3. منتج غير أصلي (Red Danger) */}
                <div className="bg-[#FDF3F2] rounded-2xl p-4 sm:p-5 border border-[#F5C4BF] flex flex-col items-center text-center shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-[#DC3545] text-white flex items-center justify-center mb-3 shadow-sm">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#DC3545] mb-2">
                    منتج غير أصلي
                  </h4>
                  <p className="text-xs text-[#6F4744] leading-relaxed mb-3">
                    رمز التحقق غير صحيح أو تم استخدامه من قبل. نرجو التواصل معنا فورًا.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateContact) {
                        onNavigateContact();
                      } else {
                        window.location.href = 'tel:+966501234567';
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DC3545] hover:text-[#B02A37] mt-auto pt-2 border-t border-[#F8D7D4] w-full justify-center cursor-pointer transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصل بنا</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
