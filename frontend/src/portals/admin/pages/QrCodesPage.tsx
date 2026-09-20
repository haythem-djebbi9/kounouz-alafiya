import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode as QrCodeIcon, AlertTriangle, Search, Copy, Check, Ban, RotateCcw } from 'lucide-react';
import { useAdminQrCodes, useQrCodeScans, useSetQrCodeActive } from '../hooks/useAdminQrCodes';
import { Card, Badge, Modal, EmptyState, QRCodeDisplay, Button } from '../../../design-system';
import type { QrCode } from '../../../lib/api-types';
import { dateLocale } from '../../../i18n';

export const QrCodesPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { data: qrCodes, isLoading } = useAdminQrCodes();
  const [selected, setSelected] = useState<QrCode | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = qrCodes ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (qr) => qr.product?.nom?.toLowerCase().includes(q) || qr.qrCode.toLowerCase().includes(q),
    );
  }, [qrCodes, search]);

  // Garde le détail ouvert synchronisé avec la liste après une mutation
  // (activer/suspendre) qui rafraîchit `qrCodes`.
  const selectedFresh = selected ? (filtered.find((qr) => qr.id === selected.id) ?? selected) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-6">{t('admin:nav.qrCodes')}</h1>

      {!isLoading && (qrCodes ?? []).length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin:qrCodes.searchPlaceholder')}
            className="w-full ps-9 pe-3 py-2.5 text-sm rounded-lg border border-[#EAE1D2] focus:outline-none focus:ring-2 focus:ring-[#C68A28] bg-white"
          />
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (qrCodes ?? []).length === 0 && (
        <Card>
          <EmptyState icon={<QrCodeIcon className="w-6 h-6" />} title={t('admin:qrCodes.empty')} description={t('admin:qrCodes.emptyDescription')} />
        </Card>
      )}
      {!isLoading && (qrCodes ?? []).length > 0 && filtered.length === 0 && (
        <Card>
          <EmptyState icon={<Search className="w-6 h-6" />} title={t('admin:qrCodes.noResults')} />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((qr) => (
          <button key={qr.id} onClick={() => setSelected(qr)} className="text-start">
            <Card className="hover:border-[#D49B37] transition-colors h-full">
              <p className="font-bold text-[#0C261B] truncate mb-1">{qr.product?.nom}</p>
              <p className="font-mono text-xs text-gray-400 mb-2">{qr.qrCode}</p>
              <div className="flex items-center justify-between">
                <Badge tone={qr.isActive ? 'green' : 'gray'}>{qr.isActive ? t('admin:qrCodes.active') : t('admin:qrCodes.inactive')}</Badge>
                <span className="text-xs text-gray-400">{t('admin:qrCodes.scanCount', { count: qr._count?.scans ?? 0 })}</span>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <QrCodeDetailModal qrCode={selectedFresh} onClose={() => setSelected(null)} />
    </div>
  );
};

const QrCodeDetailModal: React.FC<{ qrCode: QrCode | null; onClose: () => void }> = ({ qrCode, onClose }) => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { data: scans, isLoading } = useQrCodeScans(qrCode?.qrId);
  const setActive = useSetQrCodeActive();
  const [copied, setCopied] = useState(false);
  const [statusError, setStatusError] = useState(false);

  if (!qrCode) return null;

  const verifyUrl = `${window.location.origin}/verify/${qrCode.qrId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async () => {
    setStatusError(false);
    try {
      await setActive.mutateAsync({ qrId: qrCode.qrId, isActive: !qrCode.isActive });
    } catch {
      setStatusError(true);
    }
  };

  return (
    <Modal isOpen={!!qrCode} onClose={onClose} title={qrCode.product?.nom ?? ''} maxWidth="max-w-xl">
      <div className="flex flex-col sm:flex-row gap-5 mb-5">
        <div className="flex justify-center sm:justify-start shrink-0">
          <QRCodeDisplay qrId={qrCode.qrId} code={qrCode.qrCode} size={140} />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <Badge tone={qrCode.isActive ? 'green' : 'gray'}>
              {qrCode.isActive ? t('admin:qrCodes.active') : t('admin:qrCodes.inactive')}
            </Badge>
          </div>

          <div className="text-xs">
            <p className="text-gray-400 mb-0.5">{t('admin:qrCodes.qrIdLabel')}</p>
            <p className="font-mono text-[#0C261B] break-all">{qrCode.qrId}</p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-bold text-[#D49B37] hover:text-[#C68A28]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('admin:qrCodes.linkCopied') : t('admin:qrCodes.copyLink')}
          </button>

          <div className="pt-1">
            <Button
              variant={qrCode.isActive ? 'danger' : 'primary'}
              size="sm"
              onClick={handleToggleActive}
              isLoading={setActive.isPending}
            >
              {qrCode.isActive ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
              {qrCode.isActive ? t('admin:qrCodes.deactivate') : t('admin:qrCodes.activate')}
            </Button>
            {qrCode.isActive && (
              <p className="text-xs text-gray-400 mt-1.5">{t('admin:qrCodes.deactivateWarning')}</p>
            )}
            {statusError && (
              <p className="text-xs text-rose-600 mt-1.5">{t('admin:qrCodes.statusUpdateError')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[#EAE1D2] pt-4">
        <p className="text-xs font-bold text-[#0C261B] mb-2">{t('admin:qrCodes.scanHistory')}</p>
        {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
        {!isLoading && (scans ?? []).length === 0 && <p className="text-sm text-gray-400">{t('admin:qrCodes.noScans')}</p>}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {(scans ?? []).map((scan) => (
            <div key={scan.id} className="flex items-center justify-between py-2 border-b border-[#EAE1D2] last:border-0">
              <div>
                <p className="text-sm font-semibold text-[#0C261B]">{scan.country ?? t('admin:qrCodes.unknownCountry')}</p>
                <p className="text-xs text-gray-400">{new Date(scan.scannedAt).toLocaleString(dateLocale(i18n.language))}</p>
              </div>
              {scan.flagged && (
                <Badge tone="red" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                  {t('admin:qrCodes.flagged')}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
