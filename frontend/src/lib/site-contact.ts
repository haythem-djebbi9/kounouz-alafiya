// Coordonnées publiques de Kounouz Alafiya (Tunisie) : pied de page, fiche
// produit, portail producteur et pages légales. Un seul endroit à mettre à
// jour.
//
// Rien n'est affiché qui n'ait été confirmé. Un faux numéro, ou une icône
// Facebook qui mène à facebook.com faute de compte, nuit davantage à la
// confiance qu'une absence : le téléphone (et WhatsApp, qui en dépend) et
// chaque réseau social apparaissent dès qu'on les renseigne ici.

export type SocialNetwork = 'facebook' | 'instagram' | 'x' | 'tiktok';

export interface SocialAccount {
  network: SocialNetwork;
  /** Adresse complète du compte officiel, ex. https://www.instagram.com/… */
  url: string;
  /** Identifiant affiché, ex. « @kounouzalafia ». */
  handle: string;
}

export const SITE_CONTACT: {
  /** Numéro affiché, ex. « +216 71 234 567 ». null : masqué (pas de faux numéro). */
  phoneDisplay: string | null;
  email: string;
  /** Comptes officiels confirmés uniquement. */
  social: SocialAccount[];
} = {
  phoneDisplay: null,
  // L'ancienne adresse était sur kunuzalafiya.com, un domaine qui n'existe
  // pas : tous les messages étaient rejetés. kounouzalafia.io, le domaine du
  // site, reçoit le courrier (serveurs Hostinger).
  email: 'contact@kounouzalafia.io',
  social: [],
};

/** Numéro au format wa.me (international, chiffres seuls), ou null sans téléphone. */
export function whatsappNumber(): string | null {
  return SITE_CONTACT.phoneDisplay ? SITE_CONTACT.phoneDisplay.replace(/\D/g, '') : null;
}

/** Compte officiel d'un réseau, s'il est renseigné. */
export function socialAccount(network: SocialNetwork): SocialAccount | undefined {
  return SITE_CONTACT.social.find((account) => account.network === network);
}
