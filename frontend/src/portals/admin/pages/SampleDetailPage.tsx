import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, MapPin, Calendar, Package, ShieldCheck } from 'lucide-react';
import { useAdminSampleDetail, useMarkReceivedAtLab } from '../hooks/useSamplesAndSeals';
import { Card, StatusBadge, Button, Alert } from '../../../design-system';
import { resolveFileUrl, ApiError } from '../../../lib/api';

export const SampleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: sample, isLoading } = useAdminSampleDetail(id);
  const markReceived = useMarkReceivedAtLab();
  const [error, setError] = useState('');

  if (isLoading || !sample) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  const handleReceive = async () => {
    setError('');
    try {
      await markReceived.mutateAsync(sample.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تحديث الحالة.');
    }
  };

  return (
    <div className="max-w-2xl">
      <Link to="/admin/echantillons" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        العودة إلى العينات
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#0C261B]">{sample.request?.honeyType}</h1>
        <StatusBadge kind="sample" status={sample.status} />
      </div>
      <p className="text-gray-500 mb-6">{sample.request?.producer?.name}</p>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

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
              <img key={url} src={resolveFileUrl(url)} alt="صورة إثبات" className="w-full aspect-square object-cover rounded-lg border border-[#EAE1D2]" />
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

      {sample.status === 'IN_TRANSIT' && (
        <Button onClick={handleReceive} isLoading={markReceived.isPending}>
          تأكيد استلام العينة في المخبر
        </Button>
      )}

      {sample.labAnalyses && sample.labAnalyses.length > 0 && (
        <Card className="mt-4">
          <p className="text-sm font-bold text-[#0C261B] mb-2">التحليل المخبري</p>
          {sample.labAnalyses.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-500">{new Date(a.analysisDate).toLocaleDateString('ar-TN')}</span>
              <StatusBadge kind="labAnalysis" status={a.status} />
            </div>
          ))}
        </Card>
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
