import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminRequests } from '../hooks/useRequests';
import { Card, StatusBadge, EmptyState } from '../../../design-system';
import type { VerificationRequestStatus } from '../../../lib/api-types';

const TAB_VALUES: (VerificationRequestStatus | 'ALL')[] = ['ALL', 'NEW', 'IN_REVIEW', 'ACCEPTED', 'REJECTED'];

export const RequestsPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [tab, setTab] = useState<VerificationRequestStatus | 'ALL'>('ALL');
  const { data: requests, isLoading } = useAdminRequests(tab === 'ALL' ? undefined : tab);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-4">{t('admin:requests.heading')}</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TAB_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors min-h-[40px] ${
              tab === value ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:border-[#D49B37]'
            }`}
          >
            {t(`admin:requests.tabs.${value}`)}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (requests ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:requests.empty')} />
        </Card>
      )}

      <div className="space-y-3">
        {(requests ?? []).map((req) => (
          <Link key={req.id} to={`/admin/demandes/${req.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">{req.honeyType}</p>
                <p className="text-xs text-gray-400 truncate">
                  {req.producer?.name} · {req.collectionLocation} · {req.quantity} {t('admin:units.kg')}
                </p>
              </div>
              <StatusBadge kind="request" status={req.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
