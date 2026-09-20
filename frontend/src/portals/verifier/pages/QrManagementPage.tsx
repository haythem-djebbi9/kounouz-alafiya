import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Info,
  Power,
  QrCode,
  ScanLine,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  useBulkDeactivateQr,
  useQrCode,
  useQrCodes,
  useSetQrStatus,
  type QrFilters,
} from '../commerce-hooks';
import { QR_STATUS_TONE, BATCH_STATUS_TONE, PRODUCT_STATUS_TONE } from '../status-map';
import { QrPreview } from './QrGenerationPage';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  InlineError,
  KpiCard,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  SelectInput,
  StatusPill,
  Table,
  Td,
  TextInput,
  Th,
} from '../ui';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { QrCodeStatus } from '../types';

export const QrManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();

  const [filters, setFilters] = useState<QrFilters>({
    search: '',
    page: 1,
    pageSize: 10,
    batchId: params.get('batch') ?? undefined,
  });
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState('');

  const list = useQrCodes(filters);
  const detail = useQrCode(selectedQrId ?? undefined);
  const bulkDeactivate = useBulkDeactivateQr();

  useEffect(() => {
    if (!selectedQrId && list.data && list.data.items.length > 0) {
      setSelectedQrId(list.data.items[0].qrId);
    }
  }, [list.data, selectedQrId]);

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const stats = list.data?.stats;
  const pageIds = (list.data?.items ?? []).map((item) => item.qrId);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.includes(id));

  const resetFilters = () => {
    setFilters({ search: '', page: 1, pageSize: filters.pageSize });
    setParams({}, { replace: true });
  };

  const runBulk = async () => {
    setError('');
    try {
      await bulkDeactivate.mutateAsync(checked);
      setChecked([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t('verifier:brand.role') },
          { label: t('verifier:qr.title'), to: '/verificateur/qr' },
          { label: t('verifier:qr.managementTitle') },
        ]}
      />
      <PageHeader
        title={t('verifier:qr.managementTitle')}
        subtitle={t('verifier:qr.managementSubtitle')}
        actions={
          <Link to="/verificateur/qr">
            <Btn>
              <Sparkles className="w-4 h-4" />
              {t('verifier:actions.generateCodes')}
            </Btn>
          </Link>
        }
      />

      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4">
          <KpiCard
            label={t('verifier:qr.kpi.total')}
            value={stats.total}
            icon={<QrCode className="w-4 h-4" />}
            hint={t('verifier:qr.kpi.generated')}
          />
          <KpiCard
            label={t('verifier:qr.kpi.active')}
            value={stats.active}
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="green"
            hint={`${stats.percentages.active}%`}
            active={filters.status === 'ACTIVE'}
            onClick={() =>
              setFilters((f) => ({ ...f, status: f.status === 'ACTIVE' ? undefined : 'ACTIVE', page: 1 }))
            }
          />
          <KpiCard
            label={t('verifier:qr.kpi.scanned')}
            value={stats.scanned}
            icon={<ScanLine className="w-4 h-4" />}
            tone="amber"
            hint={`${stats.percentages.scanned}%`}
            active={filters.scanned === true}
            onClick={() =>
              setFilters((f) => ({ ...f, scanned: f.scanned ? undefined : true, page: 1 }))
            }
          />
          <KpiCard
            label={t('verifier:qr.kpi.deactivated')}
            value={stats.deactivated}
            icon={<XCircle className="w-4 h-4" />}
            tone="red"
            hint={`${stats.percentages.deactivated}%`}
            active={filters.status === 'DEACTIVATED'}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === 'DEACTIVATED' ? undefined : 'DEACTIVATED',
                page: 1,
              }))
            }
          />
          <KpiCard
            label={t('verifier:qr.kpi.products')}
            value={stats.products}
            icon={<Boxes className="w-4 h-4" />}
            tone="blue"
            hint={t('verifier:qr.kpi.acrossBatches')}
          />
        </div>
      )}

      {/* Filtres */}
      <Panel className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="lg:col-span-2">
            <SearchBox
              value={filters.search ?? ''}
              onChange={(search) => setFilters((f) => ({ ...f, search, page: 1 }))}
              placeholder={t('verifier:qr.searchPlaceholder')}
            />
          </div>
          <SelectInput
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: (e.target.value || undefined) as QrCodeStatus | undefined,
                page: 1,
              }))
            }
            className="text-xs"
          >
            <option value="">{t('verifier:qr.allStatuses')}</option>
            <option value="ACTIVE">{t('verifier:status.qr.ACTIVE')}</option>
            <option value="DEACTIVATED">{t('verifier:status.qr.DEACTIVATED')}</option>
          </SelectInput>
          <TextInput
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
            className="text-xs"
            aria-label={t('verifier:samples.from')}
          />
          <div className="flex gap-2">
            <TextInput
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
              className="text-xs"
              aria-label={t('verifier:samples.to')}
            />
            <Btn variant="ghost" size="sm" onClick={resetFilters}>
              {t('verifier:qr.resetFilters')}
            </Btn>
          </div>
        </div>
      </Panel>

      {error && <InlineError message={error} />}

      <div className="grid gap-4 xl:grid-cols-12 mt-4">
        <div className="xl:col-span-8">
          <Panel
            title={t('verifier:qr.list')}
            bodyClassName="p-0"
            actions={
              checked.length > 0 && (
                <Btn
                  variant="danger"
                  size="sm"
                  isLoading={bulkDeactivate.isPending}
                  onClick={runBulk}
                >
                  <Power className="w-3.5 h-3.5" />
                  {t('verifier:qr.bulkDeactivate', { count: checked.length })}
                </Btn>
              )
            }
          >
            {list.isLoading && <LoadingBlock label={t('common:status.loading')} />}

            {list.data && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th className="w-8">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) =>
                            setChecked(
                              e.target.checked
                                ? Array.from(new Set([...checked, ...pageIds]))
                                : checked.filter((id) => !pageIds.includes(id)),
                            )
                          }
                          className="accent-[#D49B37]"
                          aria-label={t('verifier:qr.selectAll')}
                        />
                      </Th>
                      <Th>{t('verifier:qr.serial')}</Th>
                      <Th>{t('verifier:table.product')}</Th>
                      <Th>{t('verifier:table.batchId')}</Th>
                      <Th>{t('verifier:table.status')}</Th>
                      <Th>{t('verifier:qr.scans')}</Th>
                      <Th>{t('verifier:qr.generatedAt')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <EmptyBlock title={t('verifier:qr.empty')} />
                        </td>
                      </tr>
                    )}
                    {list.data.items.map((code) => (
                      <tr
                        key={code.id}
                        onClick={() => setSelectedQrId(code.qrId)}
                        className={`cursor-pointer transition-colors ${
                          selectedQrId === code.qrId ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                        }`}
                      >
                        <Td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked.includes(code.qrId)}
                            onChange={(e) =>
                              setChecked((current) =>
                                e.target.checked
                                  ? [...current, code.qrId]
                                  : current.filter((id) => id !== code.qrId),
                              )
                            }
                            className="accent-[#D49B37]"
                            aria-label={code.serialNumber ?? code.qrCode}
                          />
                        </Td>
                        <Td className="font-mono text-xs font-bold text-[#0C261B]">
                          {code.serialNumber ?? code.qrCode}
                        </Td>
                        <Td className="text-xs text-gray-600 truncate max-w-[160px]">
                          {code.product?.nom ?? '—'}
                        </Td>
                        <Td className="font-mono text-xs text-gray-500">
                          {code.batch?.batchCode ?? '—'}
                        </Td>
                        <Td>
                          <StatusPill
                            tone={QR_STATUS_TONE[code.status]}
                            label={t(`verifier:status.qr.${code.status}`)}
                          />
                        </Td>
                        <Td className="text-xs text-gray-600 tabular-nums">{code._count.scans}</Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(code.createdAt)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Pagination
                  page={list.data.page}
                  pageCount={list.data.pageCount}
                  total={list.data.total}
                  pageSize={list.data.pageSize}
                  onChange={(page) => setFilters((f) => ({ ...f, page }))}
                  summary={(from, to, total) => t('verifier:pagination.summaryCodes', { from, to, total })}
                />
              </>
            )}
          </Panel>
        </div>

        {/* Détail */}
        <div className="xl:col-span-4">
          {!selectedQrId && (
            <Panel>
              <EmptyBlock title={t('verifier:qr.selectCode')} icon={<QrCode className="w-8 h-8" />} />
            </Panel>
          )}
          {detail.isLoading && (
            <Panel>
              <LoadingBlock label={t('common:status.loading')} />
            </Panel>
          )}
          {detail.data && (
            <QrDetailPanel
              key={detail.data.qrId}
              detail={detail.data}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// --- Détail d'un code -------------------------------------------------------

const QrDetailPanel: React.FC<{
  detail: NonNullable<ReturnType<typeof useQrCode>['data']>;
  formatDate: (value: string) => string;
  formatDateTime: (value: string) => string;
}> = ({ detail, formatDate, formatDateTime }) => {
  const { t } = useTranslation(['verifier', 'common']);
  const setStatus = useSetQrStatus();
  const [error, setError] = useState('');
  const [showScans, setShowScans] = useState(false);

  const active = detail.status === 'ACTIVE';

  const toggle = async () => {
    setError('');
    try {
      await setStatus.mutateAsync({
        qrId: detail.qrId,
        status: active ? 'DEACTIVATED' : 'ACTIVE',
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Panel title={t('verifier:qr.codeDetails')}>
      <div
        className={`rounded-lg border p-2.5 mb-3 ${
          active ? 'border-[#BFE0CB] bg-[#E8F5EC]' : 'border-[#F3CFCF] bg-[#FDF2F2]'
        }`}
      >
        <p className="flex items-center gap-1.5 text-xs font-bold text-[#0C261B]">
          {active ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#17693F]" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-[#B42323]" />
          )}
          {t(`verifier:status.qr.${detail.status}`)}
        </p>
        <p className="text-[11px] text-gray-600 mt-0.5">
          {active ? t('verifier:qr.activeHint') : t('verifier:qr.deactivatedHint')}
        </p>
      </div>

      <div className="flex justify-center mb-3">
        <QrPreview qrId={detail.qrId} serial={detail.serialNumber} size={140} />
      </div>

      {error && <InlineError message={error} />}

      <dl className="space-y-1.5 text-xs mt-3">
        <Row label={t('verifier:qr.serial')} value={detail.serialNumber ?? detail.qrCode} mono />
        <Row label={t('verifier:table.product')} value={detail.product?.nom} />
        <Row label={t('verifier:table.batchId')} value={detail.batch?.batchCode} mono />
        <Row label={t('verifier:qr.generatedAt')} value={formatDate(detail.createdAt)} />
        <Row label={t('verifier:qr.totalScans')} value={String(detail._count.scans)} />
        <Row
          label={t('verifier:qr.lastScan')}
          value={detail.scans[0] ? formatDateTime(detail.scans[0].scannedAt) : null}
        />
      </dl>

      <div className="flex items-center gap-2 mt-2 text-xs">
        <span className="text-gray-500 shrink-0">{t('verifier:qr.publicUrl')}</span>
        <a
          href={detail.publicUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[#0C261B] hover:text-[#D49B37] truncate font-mono"
        >
          {detail.publicUrl}
        </a>
      </div>

      {detail.product && detail.batch && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <StatusPill
            tone={PRODUCT_STATUS_TONE[detail.product.statut]}
            label={t(`verifier:status.product.${detail.product.statut}`)}
          />
          <StatusPill
            tone={BATCH_STATUS_TONE[detail.batch.status]}
            label={t(`verifier:status.batch.${detail.batch.status}`)}
          />
        </div>
      )}

      {showScans && detail.scans.length > 0 && (
        <ul className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {detail.scans.map((scan) => (
            <li key={scan.id} className="rounded-lg border border-[#EAE1D2] px-2.5 py-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-[#0C261B] font-semibold">
                  {scan.location ?? scan.country ?? '—'}
                </span>
                <span className="ms-auto text-gray-400">{formatDateTime(scan.scannedAt)}</span>
              </div>
              {scan.flagged && (
                <p className="text-[#B42323] font-semibold mt-0.5">{t('verifier:qr.flaggedScan')}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-[#EAE1D2]">
        <a href={detail.publicUrl} target="_blank" rel="noreferrer">
          <Btn variant="secondary" size="sm" className="w-full">
            <ExternalLink className="w-3.5 h-3.5" />
            {t('verifier:actions.viewPublicPage')}
          </Btn>
        </a>

        {detail._count.scans > 0 && (
          <Btn variant="secondary" size="sm" onClick={() => setShowScans((v) => !v)}>
            <BarChart3 className="w-3.5 h-3.5" />
            {showScans ? t('verifier:qr.hideScans') : t('verifier:qr.viewScans')}
          </Btn>
        )}

        <Btn
          variant={active ? 'danger' : 'success'}
          size="sm"
          isLoading={setStatus.isPending}
          onClick={toggle}
        >
          <Power className="w-3.5 h-3.5" />
          {active ? t('verifier:actions.deactivateQr') : t('verifier:actions.activateQr')}
        </Btn>
      </div>

      <div className="flex gap-2 mt-3 rounded-lg bg-[#FAF6EE] p-2.5">
        <Info className="w-3.5 h-3.5 text-[#3B7DD8] shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-600">
          <Trans i18nKey="verifier:qr.deactivationWarning" />
        </p>
      </div>
    </Panel>
  );
};

const Row: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F4F1EA] last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className={`text-[#0C261B] font-semibold text-end truncate ${mono ? 'font-mono' : ''}`}>
      {value || '—'}
    </dd>
  </div>
);
