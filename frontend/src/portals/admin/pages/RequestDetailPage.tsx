import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { useAdminRequestDetail, useUpdateRequestStatus } from '../hooks/useRequests';
import { Card, StatusBadge, Button, Alert } from '../../../design-system';
import { ApiError } from '../../../lib/api';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request, isLoading } = useAdminRequestDetail(id);
  const updateStatus = useUpdateRequestStatus();
  const [error, setError] = useState('');

  if (isLoading || !request) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  const decide = async (status: 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED') => {
    setError('');
    try {
      await updateStatus.mutateAsync({ id: request.id, status });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تحديث حالة الطلب.');
    }
  };

  const sample = request.samples?.[0];

  return (
    <div className="max-w-2xl">
      <Link to="/admin/demandes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        العودة إلى الطلبات
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#0C261B]">{request.honeyType}</h1>
        <StatusBadge kind="request" status={request.status} />
      </div>
      <p className="text-gray-500 mb-6">
        <Link to={`/admin/producteurs/${request.producerId}`} className="hover:text-[#D49B37] font-semibold">
          {request.producer?.name}
        </Link>{' '}
        · {request.producer?.farmName}
      </p>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <Card className="mb-6 space-y-2">
        <Row label="مكان الجمع" value={request.collectionLocation} />
        <Row label="الكمية" value={`${request.quantity} كغ`} />
        {request.description && <Row label="الوصف" value={request.description} />}
        <Row label="تاريخ الطلب" value={new Date(request.createdAt).toLocaleDateString('ar-TN')} />
      </Card>

      {(request.status === 'NEW' || request.status === 'IN_REVIEW') && (
        <div className="flex flex-wrap gap-3 mb-6">
          {request.status === 'NEW' && (
            <Button variant="outline" onClick={() => decide('IN_REVIEW')} isLoading={updateStatus.isPending}>
              وضع قيد المراجعة
            </Button>
          )}
          <Button onClick={() => decide('ACCEPTED')} isLoading={updateStatus.isPending}>
            <Check className="w-4 h-4" />
            قبول الطلب
          </Button>
          <Button variant="danger" onClick={() => decide('REJECTED')} isLoading={updateStatus.isPending}>
            <X className="w-4 h-4" />
            رفض الطلب
          </Button>
        </div>
      )}

      {sample && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#0C261B]">العينة المرتبطة</p>
              <p className="text-xs text-gray-400">{sample.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge kind="sample" status={sample.status} />
              <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/echantillons/${sample.id}`)}>
                عرض
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-bold text-[#0C261B]">{value}</span>
  </div>
);
