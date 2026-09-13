import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Article } from '../types';
import { ChevronRight, ChevronLeft, ArrowLeft, Instagram } from 'lucide-react';

interface FromWorldSectionProps {
  onOpenArticle: (article: Article) => void;
}

interface WorldStoryItem {
  id: string;
  title: string;
  image: string;
  article: Article;
}

export const FromWorldSection: React.FC<FromWorldSectionProps> = ({ onOpenArticle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Exact 4 items from the user's reference screenshot (ordered RTL)
  const stories: WorldStoryItem[] = [
    {
      id: 'story-1',
      title: 'ما الذي يجعل عسلنا مميزاً؟',
      image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=600&q=80',
      article: {
        id: 'art-4',
        title: 'ما الذي يجعل عسلنا مميزاً؟',
        date: '18 يونيو 2025',
        image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=600&q=80',
        readTime: '5 دقائق قراءة',
        snippet: 'من اختيار مواقع المناحل في المحميات الطبيعية البعيدة عن التلوث إلى أحدث تقنيات الفحص المخبري الدقيق.',
        category: 'قصتنا'
      }
    },
    {
      id: 'story-2',
      title: '• رحلتنا من الخلية إلى العبوة',
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
      article: {
        id: 'art-5',
        title: 'رحلتنا من الخلية إلى العبوة',
        date: '10 يونيو 2025',
        image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
        readTime: '4 دقائق قراءة',
        snippet: 'تعرف على الخطوات الدقيقة التي نتبعها في جني العسل وتعبئته بارداً بدون أي تعريض للحرارة لحفظ الإنزيمات.',
        category: 'الإنتاج'
      }
    },
    {
      id: 'story-3',
      title: '• كيف نتحقق من جودة كل دفعة لدينا',
      image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
      article: {
        id: 'art-6',
        title: 'كيف نتحقق من جودة كل دفعة لدينا؟',
        date: '01 يونيو 2025',
        image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
        readTime: '5 دقائق قراءة',
        snippet: 'نظرة داخل مختبراتنا المعتمدة، وكيف نقوم بإصدار رمز QR خاص بكل عبوة يحتوي على شهادة الفحص الكاملة.',
        category: 'الشفافية'
      }
    },
    {
      id: 'story-4',
      title: '• فوائد العسل الطبيعي للمناعة والطاقة',
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80',
      article: {
        id: 'art-1',
        title: 'فوائد العسل الطبيعي للمناعة والطاقة',
        date: '20 يوليو 2025',
        image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80',
        readTime: '4 دقائق قراءة',
        snippet: 'اكتشف كيف يمكن لملعقة واحدة من العسل الطبيعي يومياً أن تحدث فارقاً كبيراً في تعزيز مناعتك ومستويات طاقتك الحيوية.',
        category: 'صحة ومناعة'
      }
    }
  ];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % stories.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  return (
    <section id="from-world-section" className="py-14 sm:py-18 bg-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Centered Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-10"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0C261B] tracking-tight">
            من عالم كنوز العافية
          </h2>
        </motion.div>

        {/* Carousel / Cards Row with Side Navigation Arrows */}
        <div className="relative flex items-center justify-between gap-3 sm:gap-5 mb-10">
          
          {/* Right Arrow (RTL previous / right) */}
          <button
            onClick={handlePrev}
            aria-label="السابق"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[#D49B37]/80 bg-white/90 hover:bg-[#FAF6EE] text-[#C68A28] hover:text-[#0C261B] flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 cursor-pointer group"
          >
            <ChevronRight className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>

          {/* 4 Story Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
            {stories.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                onClick={() => onOpenArticle(item.article)}
                className="group cursor-pointer flex flex-col items-center text-center transition-all duration-300"
              >
                {/* Rounded Photo Frame */}
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-[#EAE1D2] group-hover:shadow-md group-hover:border-[#D49B37]/60 transition-all duration-300 bg-[#EAE1D2]/50">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Caption Title */}
                <h3 className="text-xs sm:text-sm font-bold text-[#0C261B] group-hover:text-[#C68A28] mt-3.5 px-1 leading-snug transition-colors">
                  {item.title}
                </h3>
              </motion.div>
            ))}
          </div>

          {/* Left Arrow (RTL next / left) */}
          <button
            onClick={handleNext}
            aria-label="التالي"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[#D49B37]/80 bg-white/90 hover:bg-[#FAF6EE] text-[#C68A28] hover:text-[#0C261B] flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 cursor-pointer group"
          >
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>

        </div>

        {/* Bottom Bar Container (Instagram + Show More button) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-[#EAE1D2] bg-white/70 backdrop-blur-sm px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            
            {/* Instagram Account */}
            <a
              href="https://instagram.com/kunuzalafiya"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-right hover:opacity-80 transition-opacity group"
            >
              <div className="w-11 h-11 rounded-xl border border-[#EAE1D2] bg-[#FAF6EE] flex items-center justify-center text-[#C68A28] group-hover:border-[#D49B37] group-hover:text-[#0C261B] transition-colors shadow-inner">
                <Instagram className="w-6 h-6" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#0C261B] block">تابعنا على إنستغرام</span>
                <span className="text-xs font-medium text-[#7E8F88] font-mono">@kunuzalafiya</span>
              </div>
            </a>

            {/* Show More Dark Green Button */}
            <button
              id="blog-show-more-btn"
              onClick={() => onOpenArticle(stories[0].article)}
              className="inline-flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm px-7 py-2.5 rounded-lg shadow-sm transition-all duration-200 cursor-pointer group"
            >
              <span>عرض المزيد</span>
              <ArrowLeft className="w-4 h-4 text-[#D49B37] transition-transform group-hover:-translate-x-1" />
            </button>

          </div>
        </motion.div>

      </div>
    </section>
  );
};

