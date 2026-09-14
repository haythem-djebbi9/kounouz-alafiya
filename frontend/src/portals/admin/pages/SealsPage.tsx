import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAdminSeals } from '../hooks/useSamplesAndSeals';
import { Card, Badge, EmptyState } from '../../../design-system';

export const SealsPage: React.FC = () => {
  const { data: seals, isLoading } = useAdminSeals();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">الأختام الأمنية</h1>
      <p className="text-gray-500 mb-6">سجل غير قابل للتعديل — كل ختم مرتبط بعينة واحدة بشكل نهائي.</p>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (seals ?? []).length === 0 && (
        <Card>
          <EmptyState title="لا توجد أختام مسجلة بعد" />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {(seals ?? []).map((seal) => (
          <Card key={seal.id} className="flex items-center justify-between">
            <div>
              <p className="font-mono font-bold text-sm text-[#0C261B]">{seal.sealCode}</p>
              <p className="text-xs text-gray-400">{new Date(seal.sealedAt).toLocaleString('ar-TN')}</p>
            </div>
            <Badge tone={seal.status === 'INTACT' ? 'green' : 'red'} icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              {seal.status === 'INTACT' ? 'سليم' : 'مكسور'}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
};
