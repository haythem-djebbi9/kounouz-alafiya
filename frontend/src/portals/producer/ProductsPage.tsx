import React from 'react';
import { useMyProducts } from './hooks';
import { Card, EmptyState, QRCodeDisplay, StatusBadge } from '../../design-system';
import { Package } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { data: products, isLoading } = useMyProducts();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">منتجاتي المنشورة</h1>
      <p className="text-gray-500 mb-6">المنتجات النهائية التي تحمل توقيع كنوز العافية وتصل إلى الزبائن.</p>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}

      {!isLoading && (products ?? []).length === 0 && (
        <Card>
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="لا توجد منتجات منشورة بعد"
            description="بمجرد أن يتحقق فريقنا من دفعة عسلك ويتم تعبئتها، ستظهر منتجاتك هنا."
          />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {(products ?? []).map((product) => (
          <Card key={product.id} className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#0C261B]">{product.nom}</p>
              <p className="text-xs text-gray-400 mb-2">{product.categorie.nom}</p>
              <StatusBadge kind="product" status={product.statut} />
              <p className="text-sm font-bold text-[#D49B37] mt-2">{product.prix} د.ت</p>
            </div>
            {product.qrCode && (
              <QRCodeDisplay qrId={product.qrCode.qrId} code={product.qrCode.qrCode} size={110} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
