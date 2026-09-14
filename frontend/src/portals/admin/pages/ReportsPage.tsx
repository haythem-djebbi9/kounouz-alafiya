import React, { useState } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { useOperationsSummary, useByProducerReport, useAntiFraudStats, downloadReport } from '../hooks/useReports';
import { Card, Button, Badge, Alert } from '../../../design-system';

export const ReportsPage: React.FC = () => {
  const { data: summary } = useOperationsSummary();
  const { data: byProducer } = useByProducerReport();
  const { data: antiFraud } = useAntiFraudStats();
  const [error, setError] = useState('');

  const handleDownload = async (path: string, filename: string) => {
    setError('');
    try {
      await downloadReport(path, filename);
    } catch {
      setError('تعذر تحميل التقرير.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-6">التقارير</h1>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0C261B]">التقرير التشغيلي</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleDownload('/reports/operations/export?format=csv', 'rapport-operations.csv')}>
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleDownload('/reports/operations/export?format=pdf', 'rapport-operations.pdf')}>
              <Download className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </div>
        {summary && (
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">معدل التحقق</p>
              <p className="font-bold text-[#0C261B] text-lg">{Math.round(summary.verificationRate * 100)}%</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">منتجات منشورة</p>
              <p className="font-bold text-[#0C261B] text-lg">{summary.totals.publishedProducts}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">منتجون موثّقون</p>
              <p className="font-bold text-[#0C261B] text-lg">{summary.totals.verifiedProducers} / {summary.totals.producers}</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0C261B]">حسب المنتج</h2>
          <Button size="sm" variant="outline" onClick={() => handleDownload('/reports/by-producer/export', 'rapport-producteurs.csv')}>
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
        <div className="space-y-2">
          {(byProducer ?? []).map((row) => (
            <div key={row.producerId} className="flex items-center justify-between text-sm py-2 border-b border-[#EAE1D2] last:border-0">
              <div>
                <p className="font-semibold text-[#0C261B]">{row.name}</p>
                <p className="text-xs text-gray-400">{row.farmName}</p>
              </div>
              <div className="text-left text-xs text-gray-500">
                <p>{row.totalRequests} طلبات · {row.verifiedCount} متحقق منها</p>
                <p>{row.totalBatchedKg} كغ في الدفعات</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold text-[#0C261B] mb-4">مكافحة الاحتيال</h2>
        {antiFraud && (
          <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500 mb-1">إجمالي المسح</p>
              <p className="font-bold text-[#0C261B] text-lg">{antiFraud.totalScans}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">مسح مشبوه</p>
              <p className="font-bold text-rose-600 text-lg">{antiFraud.flaggedScans}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">نسبة الاشتباه</p>
              <p className="font-bold text-[#0C261B] text-lg">{Math.round(antiFraud.flaggedRate * 100)}%</p>
            </div>
          </div>
        )}
        {antiFraud && antiFraud.topFlaggedProducts.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">المنتجات الأكثر اشتباهاً</p>
            <div className="space-y-2">
              {antiFraud.topFlaggedProducts.map((p) => (
                <div key={p.productId} className="flex items-center justify-between text-sm">
                  <span>{p.nom}</span>
                  <Badge tone="red" icon={<AlertTriangle className="w-3.5 h-3.5" />}>{p.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
