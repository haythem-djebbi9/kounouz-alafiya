import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, QrCode } from 'lucide-react';

// Adresse inconnue de la vitrine. Avant, toute adresse affichait l'accueil :
// un moteur de recherche y voyait autant de pages en double, indexables.
// nginx renvoie en plus un vrai statut 404 (frontend/nginx.conf).
export const NotFoundSection: React.FC<{ onHome: () => void; onVerify: () => void }> = ({ onHome, onVerify }) => {
  const { t } = useTranslation(['common']);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <section className="max-w-xl mx-auto px-4 py-24 text-center">
      <Compass className="w-14 h-14 text-[#D49B37] mx-auto mb-5" aria-hidden="true" />
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] mb-3">{t('common:seo.notFound.title')}</h1>
      <p className="text-[#4F5F58] mb-8">{t('common:seo.notFound.description')}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onHome}
          className="w-full sm:w-auto rounded-xl bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm px-6 py-3 transition-colors"
        >
          {t('common:seo.notFound.home')}
        </button>
        <button
          type="button"
          onClick={onVerify}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#D49B37] text-[#96661A] font-bold text-sm px-6 py-3 hover:bg-white transition-colors"
        >
          <QrCode className="w-4 h-4" aria-hidden="true" />
          {t('common:seo.notFound.verify')}
        </button>
      </div>
    </section>
  );
};
