import React, { useState } from 'react';
import { QrCode as QrCodeIcon, AlertTriangle } from 'lucide-react';
import { useAdminQrCodes, useQrCodeScans } from '../hooks/useAdminQrCodes';
import { Card, Badge, Modal, EmptyState } from '../../../design-system';
import type { QrCode } from '../../../lib/api-types';

export const QrCodesPage: React.FC = () => {
  const { data: qrCodes, isLoading } = useAdminQrCodes();
  const [selected, setSelected] = useState<QrCode | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-6">رموز QR</h1>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (qrCodes ?? []).length === 0 && (
        <Card>
          <EmptyState icon={<QrCodeIcon className="w-6 h-6" />} title="لا توجد رموز QR بعد" description="يتم إنشاؤها تلقائياً عند نشر أول منتج." />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(qrCodes ?? []).map((qr) => (
          <button key={qr.id} onClick={() => setSelected(qr)} className="text-right">
            <Card className="hover:border-[#D49B37] transition-colors h-full">
              <p className="font-bold text-[#0C261B] truncate mb-1">{qr.product?.nom}</p>
              <p className="font-mono text-xs text-gray-400 mb-2">{qr.qrCode}</p>
              <div className="flex items-center justify-between">
                <Badge tone={qr.isActive ? 'green' : 'gray'}>{qr.isActive ? 'نشط' : 'غير نشط'}</Badge>
                <span className="text-xs text-gray-400">{qr._count?.scans ?? 0} مسح</span>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <ScansModal qrCode={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

const ScansModal: React.FC<{ qrCode: QrCode | null; onClose: () => void }> = ({ qrCode, onClose }) => {
  const { data: scans, isLoading } = useQrCodeScans(qrCode?.qrId);

  return (
    <Modal isOpen={!!qrCode} onClose={onClose} title={`سجل المسح — ${qrCode?.product?.nom ?? ''}`} maxWidth="max-w-xl">
      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (scans ?? []).length === 0 && <p className="text-sm text-gray-400">لا توجد عمليات مسح بعد.</p>}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {(scans ?? []).map((scan) => (
          <div key={scan.id} className="flex items-center justify-between py-2 border-b border-[#EAE1D2] last:border-0">
            <div>
              <p className="text-sm font-semibold text-[#0C261B]">{scan.country ?? 'غير معروف'}</p>
              <p className="text-xs text-gray-400">{new Date(scan.scannedAt).toLocaleString('ar-TN')}</p>
            </div>
            {scan.flagged && (
              <Badge tone="red" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                مشبوه
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};
