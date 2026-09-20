import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { Panel } from './ui';
import type { EvidenceItem } from './types';

/**
 * Pièces du dossier exigées avant décision (VER-02).
 *
 * Tant qu'une pièce requise manque, le choix VÉRIFIÉ reste désactivé — et le
 * serveur le refuserait de toute façon : l'écran ne propose jamais une action
 * que l'API rejettera.
 */
export const EvidencePanel: React.FC<{ items: EvidenceItem[] }> = ({ items }) => {
  const { t } = useTranslation('verifier');
  const missing = items.filter((i) => i.requiredForVerified && !i.ok).length;

  return (
    <Panel title={t('evidence.title')}>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-xs">
            {item.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#17693F]" />
            ) : (
              <CircleAlert className="w-4 h-4 shrink-0 text-[#B42323]" />
            )}
            <span className="min-w-0">
              <span className="block font-bold text-[#0C261B]">{t(`evidence.items.${item.key}`)}</span>
              <span className={item.ok ? 'text-gray-500' : 'text-[#B42323]'}>{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p
        className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
          missing === 0 ? 'bg-[#E8F5EC] text-[#17693F]' : 'bg-[#FDF2F2] text-[#B42323]'
        }`}
      >
        {missing === 0 ? t('evidence.complete') : t('evidence.incomplete', { count: missing })}
      </p>
    </Panel>
  );
};
