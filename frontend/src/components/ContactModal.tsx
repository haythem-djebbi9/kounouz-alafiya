import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Send,
  MessageCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Award,
  HeartHandshake,
  Headphones,
  Check
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [inquiryType, setInquiryType] = useState('استفسار عام');
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const inquiryTypes = [
    'استفسار عام',
    'طلب خاص / بالجملة',
    'التحقق من دفعة منتج',
    'استفسار عن الشحن والتوصيل',
    'اقتراحات وملاحظات',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
      setSent(false);
    }, 4000);
  };

  const faqs = [
    {
      q: 'كيف يمكنني التحقق من نقاء العسل ومصدر الدفعة؟',
      a: 'تحتوي كل عبوة من كنوز العافية على رمز QR فريد ورقم دفعة مطبوع. يمكنك استخدام خيار "التحقق من المنتج" في أعلى الموقع وإدخال الرمز لعرض شهادة الفحص المخبري الكاملة وموقع المنحل.',
    },
    {
      q: 'هل العسل لديكم خام وغير مبستر؟',
      a: 'نعم، جميع أنواع العسل لدينا تُفرز وتُعبأ بالطرق الباردة الطبيعية دون أي تعرض للحرارة العالية أو البسترة، مما يحفظ الإنزيمات النشطة والفوائد العلاجية كاملة.',
    },
    {
      q: 'ما هي مدة التوصيل وطرق الدفع المتاحة؟',
      a: 'يستغرق التوصيل من 1 إلى 3 أيام عمل داخل المملكة العربية السعودية وتونس. نوفر الدفع عند الاستلام، البطاقات الائتمانية، مدى، وApple Pay.',
    },
    {
      q: 'هل يوجد ضمان استرجاع في حال عدم الرضا؟',
      a: 'بالتأكيد، نقدم ضماناً ذهبياً 100% لاسترجاع أموالك خلال 14 يوماً من استلام الطلب إذا لم تكن راضياً عن جودة وطعم المنتج لأي سبب.',
    },
  ];

  return (
    <div id="contact-page" className="bg-[#FAF6EE] min-h-screen pb-16 text-right" dir="rtl">
      
      {/* 1. Creative Hero Banner with Nature/Beekeeper Background & Official Logo */}
      <div
        className="relative bg-[#0C261B] text-white py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-xl bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/beekeeper.jpg')",
          backgroundPosition: 'center 35%',
        }}
      >
        {/* Dark Emerald & Honey Overlay for premium look and high contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C261B]/90 via-[#0C261B]/80 to-[#0C261B]/95 backdrop-blur-[2px] pointer-events-none" />
        <div className="absolute inset-0 bg-honeycomb-dark opacity-20 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center flex flex-col items-center">
          
          {/* Official Brand Logo with Glowing Halo */}
          <div className="relative mb-6 p-4 rounded-3xl bg-[#0C261B]/80 border-2 border-[#D49B37]/50 shadow-2xl backdrop-blur-md">
            <img
              src="/images/knozafialogo-removebg-preview.png"
              alt="شعار كنوز العافية"
              className="h-20 sm:h-24 md:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(212,155,55,0.4)]"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#163D32]/90 border border-[#D49B37]/60 text-[#D49B37] text-xs sm:text-sm font-bold mb-4 shadow-md">
            <Sparkles className="w-4 h-4" />
            <span>نحن هنا دائماً لخدمتكم والإجابة عن كل استفسار</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#FAF6EE] mb-4 tracking-tight drop-shadow-md">
            تواصل مع فريق كنوز العافية
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[#D4E2DC] font-medium max-w-2xl leading-relaxed drop-shadow">
            سواء كان لديك استفسار عن فوائد العسل، طلب مخصص، أو ترغب في التحقق من دفعتك، خبراؤنا ومستشارونا مستعدون لمساعدتك بكل اهتمام.
          </p>

          {/* Quick Direct Actions in Hero */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
            <a
              href="https://wa.me/966501234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <MessageCircle className="w-5 h-5" />
              <span>محادثة واتساب فورية</span>
            </a>

            <a
              href="tel:+966501234567"
              className="inline-flex items-center gap-2.5 bg-[#D49B37] hover:bg-[#C68A28] text-[#0C261B] font-extrabold text-sm sm:text-base px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Phone className="w-5 h-5 text-[#0C261B]" />
              <span>اتصال هاتفي مباشر</span>
            </a>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-10 sm:space-y-12">
        
        {/* 2. Three Creative Highlight Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <div className="bg-white rounded-2xl p-5 border border-[#EAE1D2] shadow-sm flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-[#E7F3EE] text-[#1E6B56] border border-[#1E6B56]/30 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#0C261B]">دعم سريع ومخصص</h4>
              <p className="text-xs text-[#6F827B] mt-0.5">استجابة خلال أقل من ساعتين عمل</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#EAE1D2] shadow-sm flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-[#FAF0DC] text-[#C68A28] border border-[#D49B37]/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#0C261B]">استشارة خبراء المناحل</h4>
              <p className="text-xs text-[#6F827B] mt-0.5">نساعدك في اختيار النوع الأنسب لصحتك</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#EAE1D2] shadow-sm flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-[#E7F3EE] text-[#1E6B56] border border-[#1E6B56]/30 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#0C261B]">ضمان الجودة الذهبي</h4>
              <p className="text-xs text-[#6F827B] mt-0.5">ضمان استرجاع كامل بدون أي تعقيد</p>
            </div>
          </div>

        </div>

        {/* 3. Main Interactive Contact Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Contact Details Card with Honey Background & Details (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-[#0C261B] text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-[#234A3F] relative overflow-hidden">
              <div className="absolute inset-0 bg-honeycomb-dark opacity-20 pointer-events-none" />
              
              <div className="relative z-10 border-b border-[#234A3F] pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#163D32] border border-[#D49B37]/50 flex items-center justify-center text-[#D49B37]">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#FAF6EE]">
                    معلومات التواصل المباشر
                  </h3>
                </div>
                <p className="text-xs text-[#A3B8B0]">
                  يسر فريقنا الترحيب بكم في مقرنا أو استقبال اتصالاتكم
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm relative z-10">
                
                {/* Phone */}
                <a
                  href="tel:+966501234567"
                  className="flex items-start gap-3.5 p-3 rounded-xl bg-[#163D32]/60 hover:bg-[#163D32] border border-[#D49B37]/20 transition-colors group"
                >
                  <div className="p-2.5 rounded-lg bg-[#0C261B] text-[#D49B37] shrink-0 border border-[#D49B37]/30 group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[#A3B8B0] block text-xs">خدمة العملاء والاتصال المباشر</span>
                    <span className="font-bold text-white font-mono text-sm sm:text-base block mt-0.5" dir="ltr">
                      +966 50 123 4567
                    </span>
                  </div>
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/966501234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3.5 p-3 rounded-xl bg-[#163D32]/60 hover:bg-[#163D32] border border-[#25D366]/30 transition-colors group"
                >
                  <div className="p-2.5 rounded-lg bg-[#0C261B] text-[#25D366] shrink-0 border border-[#25D366]/40 group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[#A3B8B0] block text-xs">محادثة واتساب سريعة</span>
                    <span className="font-bold text-white font-mono text-sm sm:text-base block mt-0.5" dir="ltr">
                      +966 50 123 4567
                    </span>
                  </div>
                </a>

                {/* Email */}
                <a
                  href="mailto:info@kunuzalafiya.com"
                  className="flex items-start gap-3.5 p-3 rounded-xl bg-[#163D32]/60 hover:bg-[#163D32] border border-[#D49B37]/20 transition-colors group"
                >
                  <div className="p-2.5 rounded-lg bg-[#0C261B] text-[#D49B37] shrink-0 border border-[#D49B37]/30 group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[#A3B8B0] block text-xs">البريد الإلكتروني الرسمي</span>
                    <span className="font-bold text-white text-sm sm:text-base block mt-0.5 font-mono">
                      info@kunuzalafiya.com
                    </span>
                  </div>
                </a>

                {/* Location */}
                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-[#163D32]/60 border border-[#D49B37]/20">
                  <div className="p-2.5 rounded-lg bg-[#0C261B] text-[#D49B37] shrink-0 border border-[#D49B37]/30">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[#A3B8B0] block text-xs">المقر والمستودع الرئيسي</span>
                    <span className="font-bold text-white text-sm block mt-0.5 leading-relaxed">
                      طريق الملك فهد، الرياض، المملكة العربية السعودية
                    </span>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-3.5 p-3 rounded-xl bg-[#163D32]/60 border border-[#D49B37]/20">
                  <div className="p-2.5 rounded-lg bg-[#0C261B] text-[#D49B37] shrink-0 border border-[#D49B37]/30">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[#A3B8B0] block text-xs">أوقات العمل واستقبال الطلبات</span>
                    <span className="font-bold text-white text-sm block mt-0.5">
                      يومياً من 9:00 صباحاً حتى 10:00 مساءً
                    </span>
                  </div>
                </div>

              </div>

              {/* Honey Jar Guarantee Visual at bottom of card */}
              <div className="relative rounded-2xl overflow-hidden border border-[#D49B37]/40 bg-[#163D32] p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-[#D49B37] font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>عسل طبيعي أصلي ومفحوص مخبرياً 100%</span>
                </div>
                <p className="text-[11px] text-[#A3B8B0]">
                  جميع منتجاتنا خاضعة لشهادات فحص دورية لضمان أعلى مستويات النقاء.
                </p>
              </div>

            </div>

          </div>

          {/* Contact Form with Custom Request Type Chips (Span 7) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-[#EAE1D2] shadow-sm">
            
            <div className="border-b border-[#EAE1D2] pb-4 mb-6">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0C261B] mb-1">
                أرسل لنا استفسارك أو طلبك
              </h3>
              <p className="text-xs sm:text-sm text-[#6F827B]">
                اختر نوع الاستفسار واملأ البيانات، وسنتواصل معك في أسرع وقت.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Inquiry Type Chips */}
              <div>
                <label className="text-xs font-bold text-[#0C261B] block mb-2">
                  نوع الاستفسار أو الطلب
                </label>
                <div className="flex flex-wrap gap-2">
                  {inquiryTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInquiryType(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        inquiryType === type
                          ? 'bg-[#0C261B] text-[#D49B37] border border-[#D49B37] shadow-sm'
                          : 'bg-[#FAF6EE] text-[#576B64] border border-[#EAE1D2] hover:bg-[#EFEAE0]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0C261B] block mb-1.5">
                    الاسم الكريم *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد المنصور"
                    className="w-full px-4 py-3 rounded-xl border border-[#D5C7B0] bg-[#FAF6EE]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D49B37] focus:bg-white text-[#0C261B] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0C261B] block mb-1.5">
                    رقم الجوال *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-[#D5C7B0] bg-[#FAF6EE]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D49B37] focus:bg-white text-[#0C261B] transition-colors"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Email and Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0C261B] block mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#D5C7B0] bg-[#FAF6EE]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D49B37] focus:bg-white text-[#0C261B] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0C261B] block mb-1.5">
                    عنوان الرسالة
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="موضوع الرسالة..."
                    className="w-full px-4 py-3 rounded-xl border border-[#D5C7B0] bg-[#FAF6EE]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D49B37] focus:bg-white text-[#0C261B] transition-colors"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-[#0C261B] block mb-1.5">
                  نص الرسالة أو تفاصيل الطلب *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب استفسارك بالتفصيل وسنسعد بخدمتك..."
                  className="w-full px-4 py-3 rounded-xl border border-[#D5C7B0] bg-[#FAF6EE]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D49B37] focus:bg-white text-[#0C261B] transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2.5 bg-[#0C261B] hover:bg-[#15473A] text-white font-bold text-sm sm:text-base py-3.5 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01]"
              >
                <span>إرسال الرسالة الآن</span>
                <Send className="w-4 h-4 text-[#D49B37]" />
              </button>

              {sent && (
                <div className="p-4 bg-[#E7F3EE] border border-[#1E6B56] rounded-2xl text-xs sm:text-sm font-bold text-[#1E6B56] text-center animate-fadeIn flex items-center justify-center gap-2.5 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>تم إرسال رسالتك بنجاح! سيتواصل معك أحد مستشارينا خلال ساعات قليلة.</span>
                </div>
              )}

            </form>

          </div>

        </div>

        {/* 4. Creative FAQs Accordion Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE1D2] shadow-sm">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAF6EE] border border-[#D49B37]/40 text-[#C68A28] text-xs font-bold mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>إجابات سريعة</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] mb-2">
              الأسئلة الأكثر شيوعاً
            </h3>
            <p className="text-xs sm:text-sm text-[#6F827B]">
              جمعنا لك إجابات مفصلة حول كيفية التحقق من العسل، نقائه، طرق الشحن والضمان الذهبي.
            </p>
          </div>

          <div className="space-y-3.5 max-w-3xl mx-auto">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all ${
                    isOpen
                      ? 'border-[#D49B37] bg-[#FAF6EE]/40 shadow-xs'
                      : 'border-[#EAE1D2] bg-white hover:border-[#D49B37]/50'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-right flex items-center justify-between font-bold text-sm sm:text-base text-[#0C261B] cursor-pointer"
                  >
                    <span className="leading-relaxed">{faq.q}</span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-3 transition-colors ${
                        isOpen ? 'bg-[#D49B37] text-white' : 'bg-[#FAF6EE] text-[#0C261B]'
                      }`}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[#576B64] leading-relaxed border-t border-[#EAE1D2]/80 pt-3.5 animate-fadeIn">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
