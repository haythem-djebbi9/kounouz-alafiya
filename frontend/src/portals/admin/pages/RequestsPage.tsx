import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminRequests } from '../hooks/useRequests';
import { Card, StatusBadge, EmptyState } from '../../../design-system';
import type { VerificationRequestStatus } from '../../../lib/api-types';

const TABS: { value: VerificationRequestStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'الكل' },
  { value: 'NEW', label: 'جديدة' },
  { value: 'IN_REVIEW', label: 'قيد المراجعة' },
  { value: 'ACCEPTED', label: 'مقبولة' },
  { value: 'REJECTED', label: 'مرفوضة' },
];

export const RequestsPage: React.FC = () => {
  const [tab, setTab] = useState<VerificationRequestStatus | 'ALL'>('ALL');
  const { data: requests, isLoading } = useAdminRequests(tab === 'ALL' ? undefined : tab);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-4">طلبات التحقق</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors min-h-[40px] ${
              tab === t.value ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:border-[#D49B37]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (requests ?? []).length === 0 && (
        <Card>
          <EmptyState title="لا توجد طلبات في هذه الفئة" />
        </Card>
      )}

      <div className="space-y-3">
        {(requests ?? []).map((req) => (
          <Link key={req.id} to={`/admin/demandes/${req.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">{req.honeyType}</p>
                <p className="text-xs text-gray-400 truncate">
                  {req.producer?.name} · {req.collectionLocation} · {req.quantity} كغ
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
