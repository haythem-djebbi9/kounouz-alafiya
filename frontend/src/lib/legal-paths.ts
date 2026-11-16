// Adresses des pages légales. À part de LegalPage.tsx : le pied de page en a
// besoin sur toutes les pages, sans embarquer la page elle-même, chargée à
// la demande.
export type LegalDoc = 'privacy' | 'terms' | 'returns';

export const LEGAL_PATHS: Record<LegalDoc, string> = {
  privacy: '/confidentialite',
  terms: '/conditions',
  returns: '/retours',
};
