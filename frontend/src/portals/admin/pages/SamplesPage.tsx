import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminSamples } from '../hooks/useSamplesAndSeals';
import { Card, StatusBadge, EmptyState } from '../../../design-system';

export const SamplesPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { data: samples, isLoading } = useAdminSamples();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-6">{t('admin:nav.samples')}</h1>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (samples ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:samples.empty')} />
        </Card>
      )}

      <div className="space-y-3">
        {(samples ?? []).map((s) => (
          <Link key={s.id} to={`/admin/echantillons/${s.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">{s.request?.honeyType}</p>
                <p className="text-xs text-gray-400 truncate">
                  {s.request?.producer?.name} · {s.location} · {t('admin:samples.collectedBy', { name: s.collectedBy?.name })}
                </p>
              </div>
              <StatusBadge kind="sample" status={s.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
