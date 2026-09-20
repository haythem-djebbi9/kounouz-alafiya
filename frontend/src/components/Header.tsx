import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { PageView } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../lib/auth-context';
import { roleHomePath } from '../lib/role-routing';
import { Search, User, LogIn, ShoppingBag, QrCode, Menu, X } from 'lucide-react';

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
  const { t } = useTranslation('marketplace');
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAccountClick = () => {
    if (!isAuthenticated || !user) {
      navigate('/connexion');
      return;
    }
    // Le panneau "حسابي" est pensé pour un client (commandes, aide, paramètres) ;
    // les autres rôles ont leur propre espace dédié, on les y envoie directement.
    if (user.role === 'CONSUMER') {
      onOpenAccount();
    } else {
      navigate(roleHomePath(user.role));
    }
  };

  const navItems: { label: string; page: PageView }[] = [
    { label: t('nav.help'), page: 'help' },
    { label: t('nav.contact'), page: 'contact' },
    { label: t('nav.verify'), page: 'verify' },
    { label: t('nav.story'), page: 'story' },
    { label: t('nav.shop'), page: 'products' },
    { label: t('nav.home'), page: 'home' },
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
          {/* Sur téléphone, logo compact : le panier et le menu doivent rester visibles. */}
          <div className="flex-shrink-0 flex items-center pr-2">
            <div className="sm:hidden">
              <Logo compact onClick={() => onNavigate('home')} />
            </div>
            <div className="hidden sm:block">
              <Logo onClick={() => onNavigate('home')} />
            </div>
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
          <div dir="ltr" className="flex items-center gap-1 sm:gap-3.5">

            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>

            {/* Search Icon */}
            <button
              id="header-search-btn"
              onClick={onOpenSearch}
              aria-label={t('actions.search')}
              className="p-2 text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-full hover:bg-[#EAE1D2]/50 cursor-pointer"
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Se connecter (visible, logged out only) */}
            {!isAuthenticated && (
              <button
                id="header-login-btn"
                onClick={() => navigate('/connexion')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-full hover:bg-[#EAE1D2]/50 cursor-pointer"
              >
                <LogIn className="w-4 h-4 stroke-[2]" />
                <span>{t('actions.login')}</span>
              </button>
            )}

            {/* Account Icon */}
            <button
              id="header-account-btn"
              onClick={handleAccountClick}
              aria-label={isAuthenticated ? t('actions.account') : t('actions.login')}
              className="hidden sm:inline-flex p-2 text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-full hover:bg-[#EAE1D2]/50 cursor-pointer"
            >
              <User className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Shopping Cart Icon with Badge */}
            <button
              id="header-cart-btn"
              onClick={onOpenCart}
              aria-label={t('actions.cart')}
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
              <span>{t('actions.verifyProduct')}</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#0C261B] hover:text-[#D19A44] transition-colors rounded-md"
              aria-label={t('actions.menu')}
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
                className={`w-full text-start py-2.5 px-3 rounded-lg font-bold text-base transition-colors flex items-center justify-between ${
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

          <div className="pt-3 border-t border-[#EAE1D2] space-y-2">
            <div className="flex items-center justify-between gap-3 sm:hidden">
              <LanguageSwitcher />
              {isAuthenticated && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleAccountClick();
                  }}
                  className="inline-flex items-center gap-2 bg-white text-[#0C261B] px-4 py-2.5 rounded-lg font-bold text-sm border border-[#D5C7B0]"
                >
                  <User className="w-4 h-4" />
                  <span>{t('actions.account')}</span>
                </button>
              )}
            </div>
            {!isAuthenticated && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/connexion');
                }}
                className="w-full flex items-center justify-center gap-2 bg-white text-[#0C261B] py-3 rounded-lg font-bold text-sm border border-[#D5C7B0]"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('actions.login')}</span>
              </button>
            )}
            <button
              onClick={() => {
                onOpenVerify();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#0C261B] text-white py-3 rounded-lg font-bold text-sm border border-[#D19A44]/70"
            >
              <QrCode className="w-4 h-4 text-[#D19A44]" />
              <span>{t('actions.verifyProductMobile')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
