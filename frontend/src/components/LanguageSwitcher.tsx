import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, persistLanguage, type SupportedLanguage } from '../i18n';
import { useAuth } from '../lib/auth-context';

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact, className }) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const currentLang = i18n.language as SupportedLanguage;

  const handleSelect = async (lang: SupportedLanguage) => {
    setOpen(false);
    if (lang === currentLang) return;
    persistLanguage(lang);
    await i18n.changeLanguage(lang);
    if (isAuthenticated) {
      try {
        await updateProfile({ language: lang });
      } catch {
        // best-effort : l'interface reste dans la nouvelle langue même si la
        // synchronisation avec le compte échoue (ex: hors-ligne).
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[#0C261B] hover:bg-[#FAF6EE] text-xs font-bold min-h-[40px]"
        aria-label={t('language.label')}
      >
        <Globe className="w-4 h-4" />
        {!compact && <span>{t(`language.${currentLang}`)}</span>}
      </button>

      {open && (
        <div className="absolute end-0 mt-1 w-40 bg-white border border-[#EAE1D2] rounded-xl shadow-lg z-50 overflow-hidden">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold text-[#0C261B] hover:bg-[#FAF6EE] text-start"
            >
              {t(`language.${lang}`)}
              {lang === currentLang && <Check className="w-4 h-4 text-[#0C261B]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
