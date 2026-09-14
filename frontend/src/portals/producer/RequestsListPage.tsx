import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ChevronLeft } from 'lucide-react';
import { useMyRequests } from './hooks';
import { Card, Button, StatusBadge, EmptyState } from '../../design-system';

export const RequestsListPage: React.FC = () => {
  const { data: requests, isLoading } = useMyRequests();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0C261B]">طلباتي</h1>
        <Link to="/producteur/demandes/nouvelle">
          <Button size="sm">
            <PlusCircle className="w-4 h-4" />
            طلب جديد
          </Button>
        </Link>
      </div>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}

      {!isLoading && (requests ?? []).length === 0 && (
        <Card>
          <EmptyState
            title="لا توجد طلبات لهذا الحساب"
            description="أرسل أول طلب تحقق لعسلك → طلب جديد"
          />
        </Card>
      )}

      <div className="space-y-3">
        {(requests ?? []).map((req) => (
          <Link key={req.id} to={`/producteur/demandes/${req.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">{req.honeyType}</p>
                <p className="text-xs text-gray-400 truncate">
                  {req.collectionLocation} · {new Date(req.createdAt).toLocaleDateString('ar-TN')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge kind="request" status={req.status} />
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
