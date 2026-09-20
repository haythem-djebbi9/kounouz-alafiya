import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Package,
  QrCode,
  ShoppingBag,
} from 'lucide-react';
import { useBatch, useBatchTimeline } from '../commerce-hooks';
import {
  BATCH_STATUS_TONE,
  LAB_ANALYSIS_TONE,
  LAB_TEST_TONE,
  PACKAGING_STATUS_TONE,
  PRODUCT_STATUS_TONE,
} from '../status-map';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  LoadingBlock,
  PageHeader,
  Panel,
  StatusPill,
  Table,
  Tabs,
  Td,
  Th,
} from '../ui';
import { dateLocale } from '../../../i18n';
import type { BatchTimelineStep } from '../types';

type DetailTab = 'overview' | 'traceability' | 'lab' | 'products' | 'notes';

export const BatchDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<DetailTab>('overview');

  const { data: batch, isLoading } = useBatch(id);
  const { data: timeline } = useBatchTimeline(id);

  const locale = dateLocale(i18n.language);
  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (isLoading) return <LoadingBlock label={t('common:status.loading')} />;
  if (!batch) return <EmptyBlock title={t('verifier:batches.notFound')} />;

  const verification = batch.verification;
  const analysis = verification?.analysis;
  const product = batch.products[0];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t('verifier:brand.role') },
          { label: t('verifier:batches.title'), to: '/verificateur/lots' },
          { label: batch.batchCode },
        ]}
      />
      <PageHeader
        title={t('verifier:batchDetail.title')}
        subtitle={t('verifier:batchDetail.subtitle')}
        actions={
          <>
            <Link to="/verificateur/lots">
              <Btn variant="ghost">
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                {t('common:actions.back')}
              </Btn>
            </Link>
            <StatusPill
              tone={BATCH_STATUS_TONE[batch.status]}
              label={t(`verifier:status.batch.${batch.status}`)}
            />
          </>
        }
      />

      {/* Bandeau produit */}
      <Panel className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">{t('verifier:table.batchId')}</p>
            <p className="font-mono text-base font-extrabold text-[#0C261B]">{batch.batchCode}</p>
            <p className="text-xs text-gray-500 mt-0.5">{batch.honeyType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('verifier:table.producer')}</p>
            <p className="text-sm font-bold text-[#0C261B]">
              {verification?.request?.producer?.name ?? '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{batch.origin ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('verifier:fields.quantity')}</p>
            <p className="text-sm font-bold text-[#0C261B] tabular-nums">{batch.quantityKg} kg</p>
            <p className="text-xs text-gray-500 mt-0.5">{batch.harvestSeason ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('verifier:fields.productionDate')}</p>
            <p className="text-sm font-bold text-[#0C261B]">{formatDate(batch.productionDate)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('verifier:fields.expiryDate')} : {formatDate(batch.expiryDate)}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <Tabs
            tabs={[
              { key: 'overview' as DetailTab, label: t('verifier:detailTabs.overview') },
              { key: 'traceability' as DetailTab, label: t('verifier:batchDetail.traceability') },
              { key: 'lab' as DetailTab, label: t('verifier:batchDetail.labResults') },
              {
                key: 'products' as DetailTab,
                label: t('verifier:batchDetail.products'),
                count: batch.products.length,
              },
              { key: 'notes' as DetailTab, label: t('verifier:detailTabs.notes') },
            ]}
            active={tab}
            onChange={setTab}
            variant="underline"
          />

          {tab === 'overview' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Panel title={t('verifier:batchDetail.productInfo')}>
                {product ? (
                  <dl className="space-y-1.5 text-xs">
                    <Row label={t('verifier:product.name')} value={product.nom} />
                    <Row label={t('verifier:fields.honeyType')} value={batch.honeyType} />
                    <Row
                      label={t('verifier:product.netWeight')}
                      value={product.netWeightG ? `${product.netWeightG} g` : null}
                    />
                    <Row label={t('verifier:product.category')} value={product.categorie?.nom} />
                    <Row label={t('verifier:product.ingredients')} value={product.ingredients} />
                    <Row label={t('verifier:product.storage')} value={product.storageInstructions} />
                    <Row label={t('verifier:product.shelfLife')} value={product.shelfLife} />
                  </dl>
                ) : (
                  <EmptyBlock
                    title={t('verifier:batchDetail.noProduct')}
                    description={t('verifier:batchDetail.noProductHint')}
                    icon={<ShoppingBag className="w-8 h-8" />}
                  />
                )}
              </Panel>

              <Panel title={t('verifier:batchDetail.batchInfo')}>
                <dl className="space-y-1.5 text-xs">
                  <Row label={t('verifier:table.batchId')} value={batch.batchCode} mono />
                  <Row
                    label={t('verifier:table.producer')}
                    value={verification?.request?.producer?.name}
                  />
                  <Row label={t('verifier:fields.honeyType')} value={batch.honeyType} />
                  <Row label={t('verifier:fields.quantity')} value={`${batch.quantityKg} kg`} />
                  <Row label={t('verifier:fields.productionDate')} value={formatDate(batch.productionDate)} />
                  <Row label={t('verifier:fields.expiryDate')} value={formatDate(batch.expiryDate)} />
                  <Row label={t('verifier:fields.origin')} value={batch.origin} />
                  <Row label={t('verifier:fields.qrGenerated')} value={String(batch._count.qrCodes)} />
                </dl>
              </Panel>

              <Panel title={t('verifier:batchDetail.quickActions')} className="sm:col-span-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link to={`/verificateur/emballage?batch=${batch.id}`}>
                    <Btn variant="secondary" size="sm" className="w-full justify-start">
                      <Package className="w-3.5 h-3.5" />
                      {t('verifier:actions.goToPackaging')}
                    </Btn>
                  </Link>
                  <Link to={`/verificateur/produits?batch=${batch.id}`}>
                    <Btn variant="secondary" size="sm" className="w-full justify-start">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {t('verifier:actions.goToProduct')}
                    </Btn>
                  </Link>
                  <Link to={`/verificateur/qr?batch=${batch.id}`}>
                    <Btn variant="secondary" size="sm" className="w-full justify-start">
                      <QrCode className="w-3.5 h-3.5" />
                      {t('verifier:actions.goToQr')}
                    </Btn>
                  </Link>
                  <Btn
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.print()}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {t('verifier:actions.printBatchReport')}
                  </Btn>
                </div>
              </Panel>
            </div>
          )}

          {tab === 'traceability' && (
            <Panel title={t('verifier:batchDetail.chain')}>
              {batch.packaging && (
                <div className="mb-4 rounded-lg border border-[#EAE1D2] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-3.5 h-3.5 text-[#D49B37]" />
                    <p className="text-xs font-bold text-[#0C261B]">
                      {t('verifier:batchDetail.packagingUnits')}
                    </p>
                    <StatusPill
                      className="ms-auto"
                      tone={PACKAGING_STATUS_TONE[batch.packaging.status]}
                      label={t(`verifier:status.packaging.${batch.packaging.status}`)}
                    />
                  </div>
                  <ul className="space-y-1">
                    {batch.packaging.units.map((unit) => (
                      <li key={unit.id} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-[#0C261B]">{unit.unitCode}</span>
                        <span className="text-gray-500">
                          {unit.unitSize} × {unit.quantity}
                        </span>
                        <StatusPill
                          className="ms-auto"
                          tone={PACKAGING_STATUS_TONE[unit.status]}
                          label={t(`verifier:status.packaging.${unit.status}`)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="space-y-1.5 text-xs">
                <Row
                  label={t('verifier:fields.requestId')}
                  value={verification?.request?.requestCode}
                  mono
                />
                <Row
                  label={t('verifier:fields.sampleId')}
                  value={verification?.sample?.sampleCode}
                  mono
                />
                <Row label={t('verifier:fields.sealCode')} value={verification?.sample?.seal?.sealCode} mono />
                <Row label={t('verifier:fields.analysisCode')} value={analysis?.analysisCode} mono />
                <Row label={t('verifier:fields.verificationId')} value={verification?.verificationCode} mono />
                <Row label={t('verifier:table.batchId')} value={batch.batchCode} mono />
                {product && <Row label={t('verifier:product.name')} value={product.nom} />}
              </dl>
            </Panel>
          )}

          {tab === 'lab' && (
            <Panel title={t('verifier:batchDetail.labResults')} bodyClassName="p-0">
              {!analysis && <EmptyBlock title={t('verifier:batchDetail.noAnalysis')} />}
              {analysis && (
                <Table>
                  <thead>
                    <tr>
                      <Th>{t('verifier:table.parameter')}</Th>
                      <Th>{t('verifier:table.result')}</Th>
                      <Th>{t('verifier:table.unit')}</Th>
                      <Th>{t('verifier:table.status')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.testResults.map((result) => (
                      <tr key={result.id}>
                        <Td className="text-xs text-[#0C261B] font-semibold">
                          {t(`verifier:parameters.${result.parameterKey}`)}
                        </Td>
                        <Td className="text-xs text-gray-700">{result.value ?? '—'}</Td>
                        <Td className="text-xs text-gray-500">{result.unit ?? '—'}</Td>
                        <Td>
                          <StatusPill
                            tone={LAB_TEST_TONE[result.status]}
                            label={t(`verifier:testStatus.${result.status}`)}
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          )}

          {tab === 'products' && (
            <Panel title={t('verifier:batchDetail.products')} bodyClassName="p-0">
              {batch.products.length === 0 && <EmptyBlock title={t('verifier:batchDetail.noProduct')} />}
              <ul className="divide-y divide-[#F1EDE3]">
                {batch.products.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-sm text-[#0C261B] truncate flex-1">{item.nom}</span>
                    <span className="text-xs text-gray-500 tabular-nums">{item.prix} DT</span>
                    <StatusPill
                      tone={PRODUCT_STATUS_TONE[item.statut]}
                      label={t(`verifier:status.product.${item.statut}`)}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {tab === 'notes' && (
            <Panel title={t('verifier:detailTabs.notes')}>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {batch.notes || t('verifier:batchDetail.noNotes')}
              </p>
              {batch.holdReason && (
                <div className="mt-3 rounded-lg border border-[#EFD9A8] bg-[#FDF6E7] p-3">
                  <p className="text-xs font-bold text-[#96661A]">{t('verifier:batches.holdReason')}</p>
                  <p className="text-sm text-[#96661A] mt-0.5">{batch.holdReason}</p>
                </div>
              )}
            </Panel>
          )}
        </div>

        {/* Synthèse de vérification */}
        <div className="lg:col-span-4 space-y-4">
          <Panel title={t('verifier:batchDetail.verificationSummary')}>
            <div
              className={`rounded-lg border p-3 ${
                analysis?.status === 'COMPLIANT'
                  ? 'border-[#BFE0CB] bg-[#E8F5EC]'
                  : 'border-[#EFD9A8] bg-[#FDF6E7]'
              }`}
            >
              <p className="flex items-center gap-1.5 text-sm font-bold text-[#0C261B]">
                <BadgeCheck className="w-4 h-4 text-[#17693F]" />
                {t('verifier:status.verification.VERIFIED')}
              </p>
              <p className="text-[11px] text-gray-600 mt-1">{t('verifier:batchDetail.verifiedHint')}</p>
            </div>

            <dl className="space-y-1.5 text-xs mt-3">
              <Row label={t('verifier:fields.verificationId')} value={verification?.verificationCode} mono />
              <Row label={t('verifier:fields.verifiedAt')} value={formatDate(verification?.verifiedAt)} />
              <Row label={t('verifier:fields.decidedBy')} value={verification?.decidedBy?.name} />
              {analysis && (
                <div className="flex items-center justify-between gap-2 py-1">
                  <dt className="text-gray-500">{t('verifier:fields.analysisCode')}</dt>
                  <dd>
                    <StatusPill
                      tone={LAB_ANALYSIS_TONE[analysis.status]}
                      label={t(`verifier:status.analysis.${analysis.status}`)}
                    />
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title={t('verifier:batchDetail.timeline')}>
            {!timeline && <LoadingBlock label={t('common:status.loading')} />}
            <ol className="space-y-0">
              {(timeline ?? []).map((entry, index, all) => {
                const done = !!entry.at;
                return (
                  <li key={entry.step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${
                          done ? 'bg-[#17693F] text-white' : 'bg-[#EEF0EC] text-[#9AA69F]'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      {index < all.length - 1 && (
                        <span
                          className={`w-0.5 flex-1 min-h-[20px] ${done ? 'bg-[#17693F]' : 'bg-[#EEF0EC]'}`}
                        />
                      )}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className={`text-sm ${done ? 'text-[#0C261B] font-semibold' : 'text-gray-400'}`}>
                        {t(`verifier:batchTimeline.${entry.step as BatchTimelineStep}`)}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatDate(entry.at)}
                        {entry.by ? ` · ${entry.by}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
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
