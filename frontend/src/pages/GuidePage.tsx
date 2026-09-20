import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Sprout, MapPinned, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { Logo } from '../components/Logo';
import { Card } from '../design-system';

type RoleTab = 'consumer' | 'producer' | 'agent' | 'admin';

const TABS: { key: RoleTab; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'consumer', icon: ShoppingBag },
  { key: 'producer', icon: Sprout },
  { key: 'agent', icon: MapPinned },
  { key: 'admin', icon: ShieldCheck },
];

export const GuidePage: React.FC = () => {
  const { t } = useTranslation(['guide', 'common']);
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<RoleTab>('consumer');

  const steps = t(`guide:${activeTab}.steps`, { returnObjects: true }) as { title: string; body: string }[];

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/" className="inline-block mb-6">
          <Logo compact />
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#0C261B] mb-1">{t('guide:title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('guide:intro')}</p>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-[#EAE1D2] pb-4">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                activeTab === key ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:bg-[#FAF6EE]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(`guide:tabs.${key}`)}
            </button>
          ))}
        </div>

        <h2 className="text-lg font-bold text-[#0C261B] mb-4">{t(`guide:${activeTab}.heading`)}</h2>

        <ol className="space-y-3 mb-8">
          {steps.map((step, i) => (
            <li key={i}>
              <Card className="flex gap-4">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[#0C261B] text-white font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-[#0C261B] mb-0.5">{step.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-lg border border-[#D5C7B0] text-sm font-bold text-[#0C261B] hover:bg-white transition-colors"
          >
            {t('guide:backHome')}
          </Link>
          {!isAuthenticated && (
            <Link
              to="/connexion"
              className="px-5 py-2.5 rounded-lg bg-[#0C261B] text-white text-sm font-bold hover:bg-[#143B2B] transition-colors"
            >
              {t('guide:loginCta')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
