import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import type { SocialNetwork } from '../lib/site-contact';

// lucide-react n'a ni le logo de X (l'ancien oiseau de Twitter serait
// daté) ni celui de TikTok : on les dessine à la même échelle que ses icônes.
const XLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
  </svg>
);

const TikTokLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3.1c-1.4.1-2.6-.3-3.9-1.1v5.9c0 3.6-2.6 6.3-6.2 6.3-3.6 0-6.4-2.9-6-6.6.3-3 2.9-5.4 6.2-5.3v3.2c-1.6-.3-3 .7-3.1 2.2-.1 1.5 1 2.8 2.6 2.8 1.6 0 2.8-1.1 2.8-3V3h3.7Z" />
  </svg>
);

export const SocialIcon: React.FC<{ network: SocialNetwork; className?: string }> = ({ network, className }) => {
  switch (network) {
    case 'facebook':
      return <Facebook className={className} aria-hidden="true" />;
    case 'instagram':
      return <Instagram className={className} aria-hidden="true" />;
    case 'x':
      return <XLogo className={className} />;
    case 'tiktok':
      return <TikTokLogo className={className} />;
  }
};

/** Nom affiché du réseau, pour l'étiquette accessible du lien. */
export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
};
