import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { useAdminSeals } from '../hooks/useSamplesAndSeals';
import { Card, Badge, EmptyState } from '../../../design-system';
import { dateLocale } from '../../../i18n';

export const SealsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { data: seals, isLoading } = useAdminSeals();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">{t('admin:seals.heading')}</h1>
      <p className="text-gray-500 mb-6">{t('admin:seals.subtitle')}</p>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (seals ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:seals.empty')} />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {(seals ?? []).map((seal) => (
          <Card key={seal.id} className="flex items-center justify-between">
            <div>
              <p className="font-mono font-bold text-sm text-[#0C261B]">{seal.sealCode}</p>
              <p className="text-xs text-gray-400">{new Date(seal.sealedAt).toLocaleString(dateLocale(i18n.language))}</p>
            </div>
            <Badge tone={seal.status === 'INTACT' ? 'green' : 'red'} icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              {seal.status === 'INTACT' ? t('admin:seals.intact') : t('admin:seals.broken')}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
};
