import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Breadcrumb, NAVY } from '../ui';
import { presetRange } from '../utils';
import type { DateRange, RangePreset } from '../utils';

export type SalesSection = 'dashboard' | 'history' | 'earnings' | 'settlements';

const LINKS: { key: SalesSection; to: string }[] = [
  { key: 'dashboard', to: '/producteur/ventes' },
  { key: 'history', to: '/producteur/ventes/historique' },
  { key: 'earnings', to: '/producteur/ventes/gains' },
  { key: 'settlements', to: '/producteur/ventes/reglements' },
];

// En-tête partagé des pages "Ventes & gains" : fil d'Ariane, titre, sous-menu.
export const SalesShell: React.FC<{
  section: SalesSection;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ section, actions, children }) => {
  const { t } = useTranslation('producer');
  return (
    <div>
      <Breadcrumb
        items={[{ label: t('nav.sales'), to: '/producteur/ventes' }, { label: t(`sales.sections.${section}.title`) }]}
        className="mb-2"
      />
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className={`text-2xl sm:text-[32px] leading-tight font-extrabold ${NAVY}`}>{t(`sales.sections.${section}.title`)}</h1>
          <p className="text-sm sm:text-base text-[#27315F] mt-1">{t(`sales.sections.${section}.subtitle`)}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-[#E6E8E3] mb-5" aria-label={t('nav.sales')}>
        {LINKS.map((link) => (
          <NavLink
            key={link.key}
            to={link.to}
            end
            className={({ isActive }) =>
              `px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors ${
                isActive ? 'border-[#0B4A2F] text-[#14215B]' : 'border-transparent text-gray-600 hover:text-[#14215B]'
              }`
            }
          >
            {t(`sales.sections.${link.key}.tab`)}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
};

export function useRangeState(initial: Exclude<RangePreset, 'CUSTOM'> = 'THIS_MONTH') {
  const [state, setState] = useState<{ preset: RangePreset; range: DateRange }>(() => ({
    preset: initial,
    range: presetRange(initial),
  }));
  return {
    preset: state.preset,
    range: state.range,
    onChange: (preset: RangePreset, range: DateRange) => setState({ preset, range }),
  };
}
