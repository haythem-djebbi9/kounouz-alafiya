import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { HelpSupportPanel } from '../../components/support/HelpSupportPanel';

const TABS = ['help', 'faq', 'contact', 'tickets'] as const;
type HelpTab = (typeof TABS)[number];

// L'onglet peut être ciblé depuis le portail (ex: "Contacter le support").
export const HelpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('tab') as HelpTab | null;
  const initialTab = requested && TABS.includes(requested) ? requested : 'help';
  return (
    <div className="bg-white rounded-xl border border-[#E6E8E3] p-4 sm:p-6">
      <HelpSupportPanel key={initialTab} initialTab={initialTab} />
    </div>
  );
};
