import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, PauseCircle, MapPin, Layers, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import { useVerify } from '../lib/marketplace-hooks';
import { resolveFileUrl, API_URL } from '../lib/api';
import { Logo } from '../components/Logo';

const RESULT_LABELS: Record<string, string> = {
  humidite_pct: 'نسبة الرطوبة',
  ph: 'الحموضة (pH)',
  hmf_mg_kg: 'HMF',
  sucres_reducteurs_pct: 'السكريات المختزلة',
  proline_mg_kg: 'البرولين',
  pollen_dominant: 'حبوب اللقاح السائدة',
  pesticides: 'المبيدات',
  antibiotiques: 'المضادات الحيوية',
};

export const PublicVerifyPage: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const { data, isLoading, isError } = useVerify(identifier);
  const [showDetails, setShowDetails] = useState(false);

  // Un scan doit se journaliser une seule fois par affichage.
  useEffect(() => {
    setShowDetails(false);
  }, [identifier]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white border-b border-[#EAE1D2] px-4 py-4 flex justify-center">
        <Link to="/">
          <Logo compact />
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 sm:py-10">
        {isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-[#D49B37] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">جارٍ التحقق...</p>
          </div>
        )}

        {isError && (
          <div className="bg-white rounded-2xl border border-[#EAE1D2] p-8 text-center">
            <PauseCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[#0C261B] mb-2">لم يتم العثور على هذا المنتج</h1>
            <p className="text-sm text-gray-500">
              تأكد من الرمز المدخل، أو امسح رمز QR المطبوع على المنتج مباشرة بكاميرا هاتفك.
            </p>
            <Link to="/" className="inline-block mt-5 text-sm font-bold text-[#D49B37] hover:text-[#C68A28]">
              العودة إلى الرئيسية
            </Link>
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* Statut — compréhensible en 3 secondes, sans jargon */}
            {data.displayStatus === 'VERIFIED' ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-center">
                <ShieldCheck className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
                <h1 className="text-xl font-extrabold text-emerald-800 mb-1">منتج موثّق ✅</h1>
                <p className="text-sm text-emerald-700">تم التحقق من هذا المنتج مخبرياً من قبل كنوز العافية</p>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center">
                <PauseCircle className="w-14 h-14 text-amber-600 mx-auto mb-3" />
                <h1 className="text-xl font-extrabold text-amber-800 mb-1">المنتج موقوف مؤقتاً ⏸️</h1>
                <p className="text-sm text-amber-700">هذا المنتج غير متاح حالياً للبيع أو التوزيع</p>
              </div>
            )}

            {/* Informations essentielles */}
            <div className="bg-white rounded-2xl border border-[#EAE1D2] overflow-hidden">
              {data.product.images[0] && (
                <img
                  src={resolveFileUrl(data.product.images[0])}
                  alt={data.product.nom}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-1">{data.product.categorie}</p>
                <h2 className="text-lg font-bold text-[#0C261B] mb-3">{data.product.nom}</h2>

                {data.producer && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" />
                    <span>{data.producer.farmName} · {data.producer.location}</span>
                  </div>
                )}
                {data.batch && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Layers className="w-4 h-4 text-[#D49B37] shrink-0" />
                    <span className="font-mono">{data.batch.batchCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Détails techniques — repliés par défaut */}
            {data.analysis && (
              <div className="bg-white rounded-2xl border border-[#EAE1D2] overflow-hidden">
                <button
                  onClick={() => setShowDetails((v) => !v)}
                  className="w-full flex items-center justify-between p-4 text-sm font-bold text-[#0C261B]"
                >
                  <span className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-[#D49B37]" />
                    نتائج الفحص المخبري
                  </span>
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showDetails && (
                  <div className="px-4 pb-4 space-y-2 text-sm border-t border-[#EAE1D2] pt-3">
                    <div className="flex justify-between text-gray-500">
                      <span>المخبر</span>
                      <span className="font-semibold text-[#0C261B]">{data.analysis.laboratory}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>تاريخ التحليل</span>
                      <span className="font-semibold text-[#0C261B]">
                        {new Date(data.analysis.analysisDate).toLocaleDateString('ar-TN')}
                      </span>
                    </div>
                    {Object.entries(data.analysis.results).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-gray-500">
                        <span>{RESULT_LABELS[key] ?? key}</span>
                        <span className="font-semibold text-[#0C261B]">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {data.verification?.notes && (
              <p className="text-xs text-gray-400 text-center px-4">{data.verification.notes}</p>
            )}

            <div className="text-center">
              <a
                href={`${API_URL}/verify/${data.qrId}/image`}
                className="text-xs text-gray-400 hover:text-[#D49B37]"
              >
                {data.qrCode}
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
