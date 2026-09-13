import React, { useState } from 'react';
import { Logo } from './Logo';
import { PageView } from '../types';
import { Search, User, ShoppingBag, QrCode, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onOpenVerify: () => void;
  onOpenAccount: () => void;
  cartCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenSearch,
  onOpenCart,
  onOpenVerify,
  onOpenAccount,
  cartCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items: تواصل معنا, التحقق من المنتج, قصتنا, المتجر, الرئيسية
  const navItems: { label: string; page: PageView }[] = [
    { label: 'تواصل معنا', page: 'contact' },
    { label: 'التحقق من المنتج', page: 'verify' },
    { label: 'قصتنا', page: 'story' },
    { label: 'المتجر', page: 'products' },
    { label: 'الرئيسية', page: 'home' },
  ];

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 w-full bg-[#F6F1EB]/95 backdrop-blur-md border-b border-[#EAE1D2] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Force LTR order so Logo is on the Left, Nav is in Center, and Actions are on the Right */}
        <div dir="ltr" className="flex items-center justify-between h-24 sm:h-28">
          
          {/* Brand Logo on the LEFT (Enlarged & Prominent) */}
          <div className="flex-shrink-0 flex items-center pr-2">
            <Logo onClick={() => onNavigate('home')} />
          </div>

          {/* Navigation Links in the CENTER */}
          <nav id="desktop-navigation" dir="ltr" className="hidden md:flex items-center gap-6 lg:gap-8 xl:gap-10">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  id={`nav-link-${item.page}`}
                  onClick={() => onNavigate(item.page)}
                  className={`relative text-[15px] lg:text-[16.5px] font-semibold transition-colors py-2 group cursor-pointer ${
                    isActive
                      ? 'text-[#0C261B] font-bold'
                      : 'text-[#0C261B]/80 hover:text-[#D19A44]'
                  }`}
                >
                  {item.label}
                  {/* Active Indicator Underline (Gold) */}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#D19A44] rounded-full" />
                  )}
                  {!isActive && (
                    <span className="absolute -bottom-1 left-1/2 right-1/2 h-[2px] bg-[#D19A44]/50 rounded-full transition-all duration-300 group-hover:left-0 group-hover:right-0 opacity-0 group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Icons & Verification CTA Button on the RIGHT (Search, User, Cart, Button) */}
          <div dir="ltr" className="flex items-center gap-2 sm:gap-3.5">
            
            {/* Search Icon */}
            <button
              id="header-search-btn"
              onClick={onOpenSearch}
              aria-label="بحث"
              className="p-2 text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-full hover:bg-[#EAE1D2]/50 cursor-pointer"
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Account Icon */}
            <button
              id="header-account-btn"
              onClick={onOpenAccount}
              aria-label="حسابي"
              className="p-2 text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-full hover:bg-[#EAE1D2]/50 cursor-pointer"
            >
              <User className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Shopping Cart Icon with Badge */}
            <button
              id="header-cart-btn"
              onClick={onOpenCart}
              aria-label="سلة التسوق"
              className="relative p-2 text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-full hover:bg-[#EAE1D2]/50 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2]" />
              {cartCount > 0 && (
                <span
                  id="cart-badge-count"
                  className="absolute top-0.5 -right-0.5 bg-[#D19A44] text-white text-[11px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm"
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Verify CTA Button (Dark green with gold icon) */}
            <button
              id="header-verify-cta-btn"
              onClick={onOpenVerify}
              className="hidden sm:inline-flex items-center gap-2 bg-[#0C261B] hover:bg-[#143B2B] text-white text-xs lg:text-sm font-bold px-4 py-2.5 rounded-lg border border-[#D19A44]/40 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer group"
            >
              <QrCode className="w-4 h-4 text-[#D19A44] group-hover:scale-110 transition-transform" />
              <span>تحقق من منتجك</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-md"
              aria-label="فتح القائمة"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden border-t border-[#EAE1D2] bg-[#F6F1EB] px-4 pt-3 pb-6 space-y-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate(item.page);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-right py-2.5 px-3 rounded-lg font-bold text-base transition-colors flex items-center justify-between ${
                  isActive
                    ? 'bg-[#EAE1D2] text-[#D19A44]'
                    : 'text-[#0C261B] hover:bg-[#EDE5D8]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-[#D19A44]"></span>}
              </button>
            );
          })}

          <div className="pt-3 border-t border-[#EAE1D2]">
            <button
              onClick={() => {
                onOpenVerify();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#0C261B] text-white py-3 rounded-lg font-bold text-sm border border-[#D19A44]/70"
            >
              <QrCode className="w-4 h-4 text-[#D19A44]" />
              <span>تحقق من منتجك بالباركود</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
