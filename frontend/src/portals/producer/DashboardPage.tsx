import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Package, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useMyRequests, useMyProducts } from './hooks';
import { Card, Button, StatusBadge, EmptyState } from '../../design-system';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: requests, isLoading: loadingRequests } = useMyRequests();
  const { data: products } = useMyProducts();

  const recentRequests = (requests ?? []).slice(0, 3);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">مرحباً، {user?.name}</h1>
      <p className="text-gray-500 mb-6">تابع حالة طلباتك ومنتجاتك من هنا.</p>

      {/* Actions principales — 2 maximum, per la règle "simplicité" */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link to="/producteur/demandes/nouvelle" className="block">
          <Card className="hover:border-[#D49B37] transition-colors h-full flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#0C261B] text-white flex items-center justify-center shrink-0">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-[#0C261B]">تحقق من عسلي</p>
              <p className="text-sm text-gray-500">أرسل طلب تحقق جديد</p>
            </div>
          </Card>
        </Link>

        <Link to="/producteur/produits" className="block">
          <Card className="hover:border-[#D49B37] transition-colors h-full flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#D49B37] text-white flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-[#0C261B]">منتجاتي المنشورة</p>
              <p className="text-sm text-gray-500">{products?.length ?? 0} منتج منشور</p>
            </div>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0C261B]">آخر الطلبات</h2>
          <Link to="/producteur/demandes" className="text-sm font-bold text-[#D49B37] hover:text-[#C68A28] flex items-center gap-1">
            عرض الكل
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingRequests && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}

        {!loadingRequests && recentRequests.length === 0 && (
          <EmptyState
            title="لا توجد طلبات بعد"
            description="أرسل أول طلب تحقق لعسلك لتبدأ رحلة التتبع."
            actionLabel="طلب جديد"
            onAction={() => navigate('/producteur/demandes/nouvelle')}
          />
        )}

        <ul className="divide-y divide-[#EAE1D2]">
          {recentRequests.map((req) => (
            <li key={req.id}>
              <Link
                to={`/producteur/demandes/${req.id}`}
                className="flex items-center justify-between py-3 hover:bg-[#FAF6EE] -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="font-bold text-sm text-[#0C261B]">{req.honeyType}</p>
                  <p className="text-xs text-gray-400">{req.collectionLocation}</p>
                </div>
                <StatusBadge kind="request" status={req.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/producteur/demandes/nouvelle')}>
          <PlusCircle className="w-4 h-4" />
          طلب تحقق جديد
        </Button>
      </div>
    </div>
  );
};
