import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SITE_CONTACT } from '../lib/site-contact';
import { usePageMeta } from '../lib/page-meta';
import { LEGAL_PATHS, type LegalDoc } from '../lib/legal-paths';


// Libellés des liens, repris du pied de page de la vitrine.
const FOOTER_LABELS: Record<LegalDoc, string> = {
  privacy: 'marketplace:footer.privacyPolicy',
  terms: 'marketplace:footer.termsPolicy',
  returns: 'marketplace:footer.returnsPolicy',
};

interface LegalSection {
  heading: string;
  body: string[];
  list: string[];
}

// L'adresse de contact est injectée ici plutôt que dans les traductions : elle
// change en un seul endroit (site-contact.ts) pour les trois langues.
const withEmail = (text: string) => text.split('{{email}}').join(SITE_CONTACT.email);

export const LegalPage: React.FC<{ doc: LegalDoc }> = ({ doc }) => {
  const { t } = useTranslation(['legal', 'marketplace']);
  const sections = t(`legal:${doc}.sections`, { returnObjects: true, email: SITE_CONTACT.email }) as LegalSection[];
  const others = (Object.keys(LEGAL_PATHS) as LegalDoc[]).filter((d) => d !== doc);

  usePageMeta(t(`legal:${doc}.title`), t(`legal:${doc}.intro`));

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [doc]);

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white border-b border-[#EAE1D2] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" aria-label={t('legal:backHome')}>
            <Logo compact />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#96661A] hover:text-[#C68A28]">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            {t('legal:backHome')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] mb-2">{t(`legal:${doc}.title`)}</h1>
        <p className="text-xs text-gray-500 mb-6">{t('legal:updated')}</p>
        <p className="text-base text-[#3F524B] leading-relaxed mb-8">{withEmail(t(`legal:${doc}.intro`))}</p>

        <div className="space-y-8">
          {Array.isArray(sections) &&
            sections.map((section, index) => (
              <section key={section.heading} aria-labelledby={`legal-${doc}-${index}`}>
                <h2 id={`legal-${doc}-${index}`} className="text-lg font-bold text-[#0C261B] mb-3">
                  {index + 1}. {section.heading}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm text-[#3F524B] leading-relaxed mb-3">
                    {withEmail(paragraph)}
                  </p>
                ))}
                {section.list.length > 0 && (
                  <ul className="list-disc ps-5 space-y-2 text-sm text-[#3F524B] leading-relaxed marker:text-[#D49B37]">
                    {section.list.map((item) => (
                      <li key={item}>{withEmail(item)}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
        </div>

        <div className="mt-12 rounded-2xl border border-[#EAE1D2] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <a href={`mailto:${SITE_CONTACT.email}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#0C261B] hover:text-[#C68A28]">
            <Mail className="w-4 h-4 text-[#D49B37]" aria-hidden="true" />
            <span dir="ltr">{SITE_CONTACT.email}</span>
          </a>
          <nav aria-label={t('legal:otherDocs')} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-500">{t('legal:otherDocs')} :</span>
            {others.map((other) => (
              <Link key={other} to={LEGAL_PATHS[other]} className="font-bold text-[#96661A] hover:text-[#C68A28]">
                {t(FOOTER_LABELS[other])}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
};

// Une page par document : le routeur charge les pages sans leur passer de
// props (lazyPage).
export const PrivacyPage: React.FC = () => <LegalPage doc="privacy" />;
export const TermsPage: React.FC = () => <LegalPage doc="terms" />;
export const ReturnsPage: React.FC = () => <LegalPage doc="returns" />;
