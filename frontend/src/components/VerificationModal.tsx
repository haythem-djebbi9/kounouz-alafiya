import React, { useState } from 'react';
import { VerificationBatch } from '../types';
import { VERIFICATION_BATCHES } from '../data/mockData';
import {
  X,
  ShieldCheck,
  Award,
  MapPin,
  Calendar,
  UserCheck,
  CheckCircle2,
  FileText,
  QrCode,
  Droplets,
  Share2,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBatch?: VerificationBatch | null;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  initialBatch,
}) => {
  const [selectedBatchCode, setSelectedBatchCode] = useState<string>(
    initialBatch?.batchCode || 'KZ-LUX-500'
  );
  const [activeTab, setActiveTab] = useState<'certificate' | 'scanner'>('certificate');
  const [scanning, setScanning] = useState(false);

  if (!isOpen) return null;

  const currentBatch =
    VERIFICATION_BATCHES[selectedBatchCode] ||
    initialBatch ||
    VERIFICATION_BATCHES['KZ-LUX-500'];

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#D49B37', '#0C261B', '#E5AC44'],
      });
    } catch {
      // safe fallback
    }
  };

  const handleSimulateScan = (code: string) => {
    setScanning(true);
    setTimeout(() => {
      setSelectedBatchCode(code);
      setScanning(false);
      setActiveTab('certificate');
      triggerConfetti();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn">
      <div
        id="verification-modal"
        className="relative w-full max-w-2xl bg-[#FAF6EE] rounded-2xl shadow-2xl border-2 border-[#D49B37]/60 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-[#0C261B] text-white px-6 py-4 flex items-center justify-between border-b border-[#D49B37]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#163D32] text-[#D49B37] border border-[#D49B37]/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-right">
              <h3 className="text-base sm:text-lg font-bold text-[#FAF6EE]">
                نظام التحقق وتتبع الجودة
              </h3>
              <p className="text-xs text-[#A3B8B0]">
                شهادة الفحص المخبري المعتمد لكل قطرة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#A3B8B0] hover:text-white hover:bg-[#163D32] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#EAE1D2] px-6 py-2 flex items-center gap-2 border-b border-[#D5C7B0] shrink-0">
          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'certificate'
                ? 'bg-[#0C261B] text-white shadow-sm'
                : 'text-[#0C261B] hover:bg-[#FAF6EE]'
            }`}
          >
            شهادة الفحص المخبري
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'scanner'
                ? 'bg-[#0C261B] text-white shadow-sm'
                : 'text-[#0C261B] hover:bg-[#FAF6EE]'
            }`}
          >
            ماسح الباركود السريع
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-right">
          
          {activeTab === 'scanner' ? (
            /* Scanner Simulation View */
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="relative w-64 h-64 bg-[#0C261B] rounded-2xl p-4 border-2 border-dashed border-[#D49B37] flex flex-col items-center justify-center overflow-hidden">
                {scanning && (
                  <div className="absolute inset-x-0 h-1 bg-[#D49B37] shadow-[0_0_15px_#D49B37] animate-bounce top-1/2" />
                )}
                <QrCode className="w-28 h-28 text-[#D49B37] opacity-80" />
                <p className="text-xs text-[#FAF6EE] mt-3 font-medium">
                  {scanning ? 'جارِ قراءة الباركود وفحص السجلات...' : 'وجه الكاميرا نحو رمز QR على العبوة'}
                </p>
              </div>

              <div className="w-full max-w-sm">
                <span className="text-xs font-bold text-[#0C261B] block mb-2">
                  أو اختر دفعة لاختبار النظام:
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {Object.keys(VERIFICATION_BATCHES).map((code) => (
                    <button
                      key={code}
                      onClick={() => handleSimulateScan(code)}
                      disabled={scanning}
                      className="px-3 py-1.5 bg-white border border-[#D49B37] hover:bg-[#D49B37] hover:text-white rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer text-[#0C261B]"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Official Laboratory Certificate View */
            <div className="space-y-6">
              
              {/* Purity Stamp Banner */}
              <div className="bg-[#E7F3EE] border-2 border-[#1E6B56] rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-[#1E6B56] shrink-0" />
                  <div>
                    <div className="text-sm font-extrabold text-[#0C261B]">
                      تم التحقق مخبرياً • منتج أصلي 100%
                    </div>
                    <div className="text-xs text-[#44665B]">
                      رقم الترخيص المخبري: {currentBatch.labCertificateNo}
                    </div>
                  </div>
                </div>

                <div className="text-center px-3 py-1 bg-[#1E6B56] text-white rounded-lg font-mono font-bold text-xs shrink-0">
                  {currentBatch.status.toUpperCase()}
                </div>
              </div>

              {/* Product & Batch Summary Card */}
              <div className="bg-white rounded-xl p-4 border border-[#EAE1D2] shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#F2EAE0] pb-2.5">
                  <span className="text-xs font-bold text-[#8C7A60]">اسم المنتج:</span>
                  <span className="text-sm font-extrabold text-[#0C261B]">{currentBatch.productName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#8C7A60] block font-medium">رقم الدفعة (Batch):</span>
                    <span className="font-mono font-bold text-[#0C261B] text-sm">{currentBatch.batchCode}</span>
                  </div>
                  <div>
                    <span className="text-[#8C7A60] block font-medium">تاريخ الحصاد:</span>
                    <span className="font-bold text-[#0C261B]">{currentBatch.harvestDate}</span>
                  </div>
                  <div>
                    <span className="text-[#8C7A60] block font-medium">تاريخ الفحص المخبري:</span>
                    <span className="font-bold text-[#0C261B]">{currentBatch.testDate}</span>
                  </div>
                  <div>
                    <span className="text-[#8C7A60] block font-medium">صالح حتى:</span>
                    <span className="font-bold text-[#0C261B]">{currentBatch.expiryDate}</span>
                  </div>
                </div>
              </div>

              {/* Lab Metrics Matrix */}
              <div>
                <h4 className="text-xs font-extrabold text-[#0C261B] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#D49B37]" />
                  نتائج التحليل المخبري الدقيق
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  {/* Purity */}
                  <div className="bg-white p-3 rounded-xl border border-[#EAE1D2] text-center shadow-sm">
                    <span className="text-[10px] text-[#7E8F88] font-bold block">نسبة النقاء</span>
                    <span className="text-xl font-black text-[#1E6B56] font-mono">{currentBatch.purityScore}%</span>
                    <span className="text-[9px] text-[#8C7A60] block mt-0.5">معيار ممتاز</span>
                  </div>

                  {/* Moisture */}
                  <div className="bg-white p-3 rounded-xl border border-[#EAE1D2] text-center shadow-sm">
                    <span className="text-[10px] text-[#7E8F88] font-bold block">نسبة الرطوبة</span>
                    <span className="text-xl font-black text-[#0C261B] font-mono">{currentBatch.moisturePercentage}%</span>
                    <span className="text-[9px] text-[#1E6B56] block mt-0.5">مثالية (&lt;18%)</span>
                  </div>

                  {/* Natural Sugars */}
                  <div className="bg-white p-3 rounded-xl border border-[#EAE1D2] text-center shadow-sm">
                    <span className="text-[10px] text-[#7E8F88] font-bold block">الفركتوز والغلوكوز</span>
                    <span className="text-xl font-black text-[#0C261B] font-mono">{currentBatch.fructoseGlucosePercentage}%</span>
                    <span className="text-[9px] text-[#8C7A60] block mt-0.5">طبيعي 100%</span>
                  </div>

                  {/* HMF */}
                  <div className="bg-white p-3 rounded-xl border border-[#EAE1D2] text-center shadow-sm">
                    <span className="text-[10px] text-[#7E8F88] font-bold block">مؤشر الطزاجة (HMF)</span>
                    <span className="text-xl font-black text-[#D49B37] font-mono">{currentBatch.hmfScore} mg</span>
                    <span className="text-[9px] text-[#1E6B56] block mt-0.5">طازج جداً</span>
                  </div>

                </div>
              </div>

              {/* Geographic Origin & Beekeeper Info */}
              <div className="bg-[#FAF0DC] rounded-xl p-4 border border-[#D49B37]/40 space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#D49B37] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0C261B] block">الموقع الجغرافي للمنحل:</span>
                    <span className="text-[#576B64]">{currentBatch.origin} — {currentBatch.location}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-[#E8D9C0]">
                  <UserCheck className="w-4 h-4 text-[#D49B37] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0C261B] block">النحال المسؤول:</span>
                    <span className="text-[#576B64]">{currentBatch.beekeeper}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-[#E8D9C0]">
                  <Droplets className="w-4 h-4 text-[#D49B37] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0C261B] block">فحص حبوب اللقاح النباتي:</span>
                    <span className="text-[#576B64]">{currentBatch.pollenAnalysis}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#EAE1D2] px-6 py-3 border-t border-[#D5C7B0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('تم نسخ رابط الشهادة للمشاركة!')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0C261B] text-xs font-bold border border-[#D5C7B0] hover:bg-[#FAF6EE] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#D49B37]" />
              <span>مشاركة</span>
            </button>
            <button
              onClick={() => alert('تم بدء تنزيل شهادة الفحص بصيغة PDF الرسمية.')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0C261B] text-xs font-bold border border-[#D5C7B0] hover:bg-[#FAF6EE] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#D49B37]" />
              <span>تحميل الشهادة</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#0C261B] text-white text-xs font-bold rounded-lg hover:bg-[#16473A] cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
