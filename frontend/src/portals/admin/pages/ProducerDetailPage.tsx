import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useProducer } from '../hooks/useProducers';
import { useAdminRequests } from '../hooks/useRequests';
import { Card, Badge, StatusBadge, EmptyState } from '../../../design-system';

export const ProducerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: producer, isLoading } = useProducer(id);
  const { data: requests } = useAdminRequests();

  if (isLoading || !producer) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  const producerRequests = (requests ?? []).filter((r) => r.producerId === producer.id);

  return (
    <div className="max-w-3xl">
      <Link to="/admin/producteurs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        العودة إلى المنتجين
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#0C261B]">{producer.name}</h1>
        {producer.isVerified && (
          <Badge tone="green" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            موثّق
          </Badge>
        )}
      </div>
      <p className="text-gray-500 mb-6">{producer.farmName} · {producer.location}</p>

      {producer.description && (
        <Card className="mb-6 bg-[#FAF6EE]/60">
          <p className="text-sm text-gray-600">{producer.description}</p>
        </Card>
      )}

      <h2 className="font-bold text-[#0C261B] mb-3">طلبات التحقق</h2>
      {producerRequests.length === 0 && (
        <Card>
          <EmptyState title="لا توجد طلبات لهذا المنتج" />
        </Card>
      )}
      <div className="space-y-3">
        {producerRequests.map((req) => (
          <Link key={req.id} to={`/admin/demandes/${req.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[#0C261B] truncate">{req.honeyType}</p>
                <p className="text-xs text-gray-400">{req.collectionLocation}</p>
              </div>
              <StatusBadge kind="request" status={req.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
