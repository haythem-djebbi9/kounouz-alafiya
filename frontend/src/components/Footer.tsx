import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { PageView } from '../types';
import { SITE_CONTACT } from '../lib/site-contact';
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
  const { t } = useTranslation(['marketplace', 'common']);
  return (
    <footer id="main-footer" className="bg-[#081E18] text-[#FAF6EE] pt-14 pb-8 border-t border-[#1C4A3E] relative overflow-hidden">
      {/* Background Honeycomb Subtle Detail */}
      <div className="absolute inset-0 bg-honeycomb-dark opacity-15 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 text-start">
          
          {/* Col 1: Brand & Bio (Span 4) */}
          <div className="lg:col-span-4 space-y-4">
            <Logo variant="gold" onClick={() => onNavigate('home')} />
            
            <p className="text-xs sm:text-sm text-[#A3B8B0] leading-relaxed max-w-sm mt-3">
              {t('marketplace:footer.bio')}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('marketplace:footer.social.instagram')}
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#D49B37] hover:text-[#081E18] flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('marketplace:footer.social.facebook')}
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#D49B37] hover:text-[#081E18] flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('marketplace:footer.social.twitter')}
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#D49B37] hover:text-[#081E18] flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${SITE_CONTACT.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('marketplace:footer.social.whatsapp')}
                className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#25D366] hover:text-white flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Products Links (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-[#E5AC44] uppercase tracking-wider">
              {t('marketplace:footer.productsHeading')}
            </h4>
            <ul className="space-y-2 text-xs text-[#A3B8B0]">
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:footer.products.honey')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:footer.products.poles')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:footer.products.royalJelly')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:footer.products.gifts')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:footer.products.all')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Navigation Links (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-bold text-[#E5AC44] uppercase tracking-wider">
              {t('marketplace:footer.browseHeading')}
            </h4>
            <ul className="space-y-2 text-xs text-[#A3B8B0]">
              <li>
                <button
                  onClick={() => onNavigate('story')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:nav.story')}
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenVerify}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:nav.verify')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:footer.blog')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#E5AC44] transition-colors cursor-pointer"
                >
                  {t('marketplace:nav.contact')}
                </button>
              </li>
              <li>
                <Link to="/guide" className="hover:text-[#E5AC44] transition-colors cursor-pointer">
                  {t('marketplace:footer.guide')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Info (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-[#E5AC44] uppercase tracking-wider">
              {t('marketplace:nav.contact')}
            </h4>
            <div className="space-y-2.5 text-xs text-[#A3B8B0]">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D49B37] shrink-0" />
                <a href={`tel:${SITE_CONTACT.phoneDisplay.replace(/\s/g, '')}`} dir="ltr" className="font-mono text-white font-bold hover:text-[#E5AC44]">{SITE_CONTACT.phoneDisplay}</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D49B37] shrink-0" />
                <a href={`mailto:${SITE_CONTACT.email}`} className="text-white hover:text-[#E5AC44]">{SITE_CONTACT.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" />
                <span>{t('marketplace:footer.address')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Policies */}
        <div className="pt-8 border-t border-[#1C4A3E] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A8F87]">
          <div>
            {t('marketplace:footer.copyright', { year: new Date().getFullYear() })}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert(t('marketplace:footer.privacyAlert')); }} className="hover:text-[#E5AC44] transition-colors">
              {t('marketplace:footer.privacyPolicy')}
            </a>
            <span>|</span>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert(t('marketplace:footer.termsAlert')); }} className="hover:text-[#E5AC44] transition-colors">
              {t('marketplace:footer.termsPolicy')}
            </a>
            <span>|</span>
            <a href="#returns" onClick={(e) => { e.preventDefault(); alert(t('marketplace:footer.returnsAlert')); }} className="hover:text-[#E5AC44] transition-colors">
              {t('marketplace:footer.returnsPolicy')}
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
