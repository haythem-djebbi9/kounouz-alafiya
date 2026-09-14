import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronLeft, ClipboardList } from 'lucide-react';
import { usePendingCollections, useMySamples } from './hooks';
import { Card, StatusBadge, EmptyState } from '../../design-system';
import { useAuth } from '../../lib/auth-context';

export const TasksHomePage: React.FC = () => {
  const { user } = useAuth();
  const { data: pending, isLoading: loadingPending } = usePendingCollections();
  const { data: samples, isLoading: loadingSamples } = useMySamples();

  const inProgress = (samples ?? []).filter((s) => s.status !== 'ANALYZED');

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">مرحباً، {user?.name}</h1>
      <p className="text-gray-500 mb-6">مهامك الميدانية لليوم.</p>

      <section className="mb-8">
        <h2 className="font-bold text-[#0C261B] mb-3">طلبات بانتظار الجمع</h2>

        {loadingPending && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}

        {!loadingPending && (pending ?? []).length === 0 && (
          <Card>
            <EmptyState
              icon={<ClipboardList className="w-6 h-6" />}
              title="لا توجد طلبات بانتظار الجمع حالياً"
              description="ستظهر هنا الطلبات المقبولة التي تحتاج إلى جمع عينة."
            />
          </Card>
        )}

        <div className="space-y-3">
          {(pending ?? []).map((req) => (
            <Link key={req.id} to={`/agent/collectes/nouvelle?requestId=${req.id}`}>
              <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#0C261B] truncate">{req.honeyType}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {req.collectionLocation} · {req.producer?.farmName}
                  </p>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-[#0C261B] mb-3">عيناتي قيد التنفيذ</h2>

        {loadingSamples && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}

        {!loadingSamples && inProgress.length === 0 && (
          <Card>
            <EmptyState title="لا توجد عينات قيد التنفيذ" description="العينات التي تجمعها ستظهر هنا حتى تصل إلى المخبر." />
          </Card>
        )}

        <div className="space-y-3">
          {inProgress.map((sample) => (
            <Link key={sample.id} to={`/agent/echantillons/${sample.id}`}>
              <Card className="hover:border-[#D49B37] transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#0C261B] truncate">{sample.request?.honeyType}</p>
                  <p className="text-xs text-gray-400 truncate">{sample.location}</p>
                </div>
                <StatusBadge kind="sample" status={sample.status} />
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
