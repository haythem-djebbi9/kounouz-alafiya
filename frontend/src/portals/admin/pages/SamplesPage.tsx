import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminSamples } from '../hooks/useSamplesAndSeals';
import { Card, StatusBadge, EmptyState } from '../../../design-system';

export const SamplesPage: React.FC = () => {
  const { data: samples, isLoading } = useAdminSamples();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-6">العينات</h1>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (samples ?? []).length === 0 && (
        <Card>
          <EmptyState title="لا توجد عينات مسجلة بعد" />
        </Card>
      )}

      <div className="space-y-3">
        {(samples ?? []).map((s) => (
          <Link key={s.id} to={`/admin/echantillons/${s.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">{s.request?.honeyType}</p>
                <p className="text-xs text-gray-400 truncate">
                  {s.request?.producer?.name} · {s.location} · جمعها {s.collectedBy?.name}
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
