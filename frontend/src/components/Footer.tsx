import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { PageView } from '../types';
import { SITE_CONTACT, whatsappNumber } from '../lib/site-contact';
import { SocialIcon, SOCIAL_LABELS } from './SocialIcon';
import { LEGAL_PATHS } from '../lib/legal-paths';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle
} from 'lucide-react';

interface FooterProps {
  onNavigate: (page: PageView) => void;
  onOpenVerify: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenVerify }) => {
  const { t } = useTranslation(['marketplace', 'common']);
  const whatsapp = whatsappNumber();
  // Seuls les comptes confirmés (site-contact.ts) sont affichés : une icône
  // qui mène à facebook.com faute de compte inquiète plus qu'elle ne rassure.
  const hasSocial = SITE_CONTACT.social.length > 0 || !!whatsapp;
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

            {hasSocial && (
              <div className="flex items-center gap-2.5 pt-2">
                {SITE_CONTACT.social.map((account) => (
                  <a
                    key={account.network}
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_LABELS[account.network]}
                    className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#D49B37] hover:text-[#081E18] flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
                  >
                    <SocialIcon network={account.network} className="w-4 h-4" />
                  </a>
                ))}
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('marketplace:footer.social.whatsapp')}
                    className="w-9 h-9 rounded-full bg-[#12362C] hover:bg-[#25D366] hover:text-white flex items-center justify-center text-[#FAF6EE] transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
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
                  onClick={() => onNavigate('blog')}
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
              {SITE_CONTACT.phoneDisplay && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#D49B37] shrink-0" aria-hidden="true" />
                  <a href={`tel:${SITE_CONTACT.phoneDisplay.replace(/\s/g, '')}`} dir="ltr" className="font-mono text-white font-bold hover:text-[#E5AC44]">{SITE_CONTACT.phoneDisplay}</a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D49B37] shrink-0" aria-hidden="true" />
                <a href={`mailto:${SITE_CONTACT.email}`} dir="ltr" className="text-white hover:text-[#E5AC44]">{SITE_CONTACT.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" aria-hidden="true" />
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
            <Link to={LEGAL_PATHS.privacy} className="hover:text-[#E5AC44] transition-colors">
              {t('marketplace:footer.privacyPolicy')}
            </Link>
            <span aria-hidden="true">|</span>
            <Link to={LEGAL_PATHS.terms} className="hover:text-[#E5AC44] transition-colors">
              {t('marketplace:footer.termsPolicy')}
            </Link>
            <span aria-hidden="true">|</span>
            <Link to={LEGAL_PATHS.returns} className="hover:text-[#E5AC44] transition-colors">
              {t('marketplace:footer.returnsPolicy')}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
