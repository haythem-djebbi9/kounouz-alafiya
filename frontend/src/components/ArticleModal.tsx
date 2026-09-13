import React from 'react';
import { Article } from '../types';
import { X, Calendar, Clock, Share2, Sparkles, CheckCircle2 } from 'lucide-react';

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({ article, onClose }) => {
  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn">
      <div
        id="article-modal"
        className="w-full max-w-2xl bg-[#FAF6EE] rounded-2xl shadow-2xl border border-[#D49B37]/40 overflow-hidden flex flex-col max-h-[90vh] text-right"
      >
        {/* Header Image */}
        <div className="relative aspect-[16/8] overflow-hidden bg-[#0C261B] shrink-0">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF6EE] via-transparent to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/90 text-[#0C261B] hover:bg-white shadow-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 right-6 bg-[#0C261B] text-white text-xs font-bold px-3 py-1 rounded-lg border border-[#D49B37]/50">
            {article.category}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          <div className="flex items-center gap-4 text-xs text-[#8C7A60] border-b border-[#EAE1D2] pb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#D49B37]" />
              {article.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#D49B37]" />
              {article.readTime}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-[#0C261B] leading-snug">
            {article.title}
          </h2>

          <p className="text-sm text-[#4A5E57] font-semibold leading-relaxed">
            {article.snippet}
          </p>

          <div className="space-y-3 text-xs sm:text-sm text-[#576B64] leading-relaxed pt-2">
            <p>
              يُعتبر العسل الطبيعي من أقدم وأعظم المعجزات الغذائية والعلاجية التي عرفتها البشرية. في كنوز العافية، نحرص على جني العسل بأحدث الطرق العلمية التي تضمن بقاء الإنزيمات النشطة والأحماض الأمينية دون أي معالجة حرارية تضر بجودته.
            </p>

            <div className="bg-white p-4 rounded-xl border border-[#EAE1D2] space-y-2 my-3">
              <h4 className="font-bold text-[#0C261B] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D49B37]" />
                أهم النصائح للاستفادة القصوى:
              </h4>
              <ul className="space-y-1.5 text-xs text-[#576B64]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B56] shrink-0" />
                  تناول ملعقة صباحاً على الريق مذابة في ماء فاتر لسرعة الامتصاص.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B56] shrink-0" />
                  استخدم الملاعق الخشبية أو الخزفية وتجنب الملاعق المعدنية لحفظ الخواص الإنزيمية.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B56] shrink-0" />
                  احفظ العسل في درجة حرارة الغرفة (20-25 مئوية) بعيداً عن أشعة الشمس المباشرة.
                </li>
              </ul>
            </div>

            <p>
              تذكر دائماً أن تتأكد من فحص رمز الدفعة (QR Code) على عبوتك للاطلاع على التقرير المخبري المعتمد ومصدر المنحل الجغرافي.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#EAE1D2] px-6 py-3 border-t border-[#D5C7B0] flex items-center justify-between shrink-0">
          <button
            onClick={() => alert('تم نسخ رابط المقال للمشاركة!')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0C261B] text-xs font-bold border border-[#D5C7B0] hover:bg-[#FAF6EE] cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#D49B37]" />
            <span>مشاركة المقال</span>
          </button>

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
