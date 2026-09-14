import React, { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, MapPin, Calendar, Package } from 'lucide-react';
import { useSampleDetail, useApplySeal, useMarkInTransit } from './hooks';
import { Card, StatusBadge, Alert, Button } from '../../design-system';
import { resolveFileUrl, ApiError } from '../../lib/api';

export const SampleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: sample, isLoading } = useSampleDetail(id);
  const applySeal = useApplySeal();
  const markInTransit = useMarkInTransit();
  const [error, setError] = useState('');

  if (isLoading) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  if (!sample) {
    return <Alert tone="error">لم يتم العثور على هذه العينة.</Alert>;
  }

  const handleSeal = async () => {
    setError('');
    try {
      await applySeal.mutateAsync(sample.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تطبيق الختم.');
    }
  };

  const handleInTransit = async () => {
    setError('');
    try {
      await markInTransit.mutateAsync(sample.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تحديث الحالة.');
    }
  };

  return (
    <div>
      <Link to="/agent" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        العودة إلى مهامي
      </Link>

      {searchParams.get('collecte') && (
        <Alert tone="success" className="mb-6">تم تسجيل العينة بنجاح. لا تنسَ تطبيق الختم الأمني.</Alert>
      )}
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#0C261B]">{sample.request?.honeyType ?? 'عينة'}</h1>
        <StatusBadge kind="sample" status={sample.status} />
      </div>
      <p className="text-gray-500 mb-6">{sample.request?.producer?.farmName}</p>

      <Card className="mb-4 space-y-3">
        <InfoRow icon={<MapPin className="w-4 h-4" />} label="مكان الجمع" value={sample.location} />
        <InfoRow
          icon={<Calendar className="w-4 h-4" />}
          label="تاريخ الجمع"
          value={new Date(sample.collectionDate).toLocaleString('ar-TN')}
        />
        <InfoRow icon={<Package className="w-4 h-4" />} label="الكمية" value={`${sample.quantity} كغ`} />
      </Card>

      {sample.photos.length > 0 && (
        <Card className="mb-4">
          <p className="text-sm font-bold text-[#0C261B] mb-3">صور الإثبات</p>
          <div className="grid grid-cols-3 gap-2">
            {sample.photos.map((url) => (
              <img
                key={url}
                src={resolveFileUrl(url)}
                alt="صورة إثبات"
                className="w-full aspect-square object-cover rounded-lg border border-[#EAE1D2]"
              />
            ))}
          </div>
        </Card>
      )}

      {sample.seal && (
        <Card className="mb-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
            <ShieldCheck className="w-4 h-4" />
            مختومة
          </div>
          <p className="text-xs text-gray-500 font-mono">{sample.seal.sealCode}</p>
        </Card>
      )}

      {sample.status === 'COLLECTED' && (
        <Button fullWidth onClick={handleSeal} isLoading={applySeal.isPending}>
          <ShieldCheck className="w-4 h-4" />
          تطبيق الختم الأمني
        </Button>
      )}

      {sample.status === 'SEALED' && (
        <Button fullWidth onClick={handleInTransit} isLoading={markInTransit.isPending}>
          <Truck className="w-4 h-4" />
          بدء النقل إلى المخبر
        </Button>
      )}

      {sample.status === 'IN_TRANSIT' && (
        <Alert tone="info">العينة في طريقها إلى المخبر.</Alert>
      )}

      {(sample.status === 'RECEIVED_AT_LAB' || sample.status === 'ANALYZED') && (
        <Alert tone="success">استلم المخبر العينة. لا حاجة لأي إجراء إضافي من طرفك.</Alert>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-[#FAF6EE] text-[#D49B37] flex items-center justify-center shrink-0">{icon}</div>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-[#0C261B]">{value}</p>
    </div>
  </div>
);
