import React from 'react';
import { Logo } from './Logo';
import { PageView } from '../types';
import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Twitter,
  MessageCircle
} from 'lucide-react';

interface FooterProps {
  onNavigate: (page: PageView) => void;
  onOpenVerify: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenVerify }) => {
  return (
    <footer id="main-footer" className="bg-[#081E18] text-[#FAF6EE] pt-14 pb-8 border-t border-[#1C4A3E] relative overflow-hidden">
      {/* Background Honeycomb Subtle Detail */}
      <div className="absolute inset-0 bg-honeycomb-dark opacity-15 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 text-right">
          
          {/* Col 1: Brand & Bio (Span 4) */}
          <div className="lg:col-span-4 space-y-4">
            <Logo variant="gold" onClick={() => onNavigate('home')} />
            
            <p className="text-xs sm:text-sm text-[#A3B8B0] leading-relaxed max-w-sm mt-3">
              منتجات طبيعية مختارة بعناية تمنحك الأفضل من الطبيعة التي تمنحك الثقة. عسل نقي 100% قابل للتحقق من المصدر والفحص المخبري.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="إنستغرام"
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#D49B37] hover:text-[#081E18] flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="فيسبوك"
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#D49B37] hover:text-[#081E18] flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تويتر / إكس"
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#D49B37] hover:text-[#081E18] flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/966501234567"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="واتساب"
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#25D366] hover:text-white flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Products Links (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-[#E5AC44] uppercase tracking-wider">
              منتجاتنا
            </h4>
            <ul className="space-y-2 text-xs text-[#A3B8B0]">
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  العسل الطبيعي
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  أعواد العافية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  غذاء ملكات النحل
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  الهدايا والمجموعات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  جميع المنتجات
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Navigation Links (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-bold text-[#E5AC44] uppercase tracking-wider">
              تصفح
            </h4>
            <ul className="space-y-2 text-xs text-[#A3B8B0]">
              <li>
                <button
                  onClick={() => onNavigate('story')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  قصتنا
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenVerify}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  التحقق من المنتج
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  المدونة والنصائح
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  تواصل معنا
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Info (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-[#E5AC44] uppercase tracking-wider">
              تواصل معنا
            </h4>
            <div className="space-y-2.5 text-xs text-[#A3B8B0]">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D49B37] shrink-0" />
                <span dir="ltr" className="font-mono text-white font-bold">+966 50 123 4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D49B37] shrink-0" />
                <span className="text-white">info@kunuzalafiya.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" />
                <span>المملكة العربية السعودية • تونس</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Policies */}
        <div className="pt-8 border-t border-[#1C4A3E] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A8F87]">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} كنوز العافية.
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('سياسة الخصوصية: نلتزم بأعلى معايير حماية بيانات عملائنا.'); }} className="hover:text-[#E5AC44] transition-colors">
              سياسة الخصوصية
            </a>
            <span>|</span>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('الشروط والأحكام: جميع التعاملات خاضعة للأنظمة التجارية المعتمدة.'); }} className="hover:text-[#E5AC44] transition-colors">
              الشروط والأحكام
            </a>
            <span>|</span>
            <a href="#returns" onClick={(e) => { e.preventDefault(); alert('سياسة الاسترجاع: ضمان ذهبي 100% لاسترجاع المنتج خلال 14 يوماً.'); }} className="hover:text-[#E5AC44] transition-colors">
              سياسة الاسترجاع
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
