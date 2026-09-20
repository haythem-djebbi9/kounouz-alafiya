import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ChevronLeft } from 'lucide-react';
import { useProducers } from '../hooks/useProducers';
import { Card, Badge, EmptyState } from '../../../design-system';

export const ProducersPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { data: producers, isLoading } = useProducers();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-6">{t('admin:nav.producers')}</h1>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (producers ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:producers.empty')} />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {(producers ?? []).map((p) => (
          <Link key={p.id} to={`/admin/producteurs/${p.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">{p.name}</p>
                <p className="text-xs text-gray-400 truncate">{p.farmName} · {p.location}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.isVerified && (
                  <Badge tone="green" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                    {t('admin:producers.verifiedBadge')}
                  </Badge>
                )}
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
