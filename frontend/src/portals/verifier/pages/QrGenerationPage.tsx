import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Download, Info, QrCode, Sparkles } from 'lucide-react';
import {
  downloadQrGeneration,
  useGenerateQrCodes,
  useQrGenerations,
  useQrImage,
  useQrQueue,
} from '../commerce-hooks';
import { BATCH_STATUS_TONE, PRODUCT_STATUS_TONE, QR_STATUS_TONE } from '../status-map';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  Field,
  InlineError,
  LoadingBlock,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  Stepper,
  Table,
  Td,
  TextInput,
  Th,
} from '../ui';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { QrGeneration, QrOptions, QrQueueItem, StepState } from '../types';

const QR_TYPES = ['PRODUCT_VERIFICATION', 'BATCH_TRACKING', 'INTERNAL'];
const QR_FORMATS = ['DYNAMIC', 'STATIC'];
const LANGUAGES = ['MULTI', 'AR', 'FR', 'EN'];
const TEMPLATES = ['KOUNOUZ_STANDARD', 'KOUNOUZ_PREMIUM', 'MINIMAL'];

const OPTION_KEYS: (keyof QrOptions)[] = [
  'includeBatchNumber',
  'includeSecurityFeatures',
  'addSerialNumber',
  'enableTracking',
];

export const QrGenerationPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();
  const [productId, setProductId] = useState<string | null>(params.get('product'));

  const queue = useQrQueue();

  // Le lien « Générer les QR » depuis un lot arrive avec ?batch= : on
  // sélectionne alors le produit rattaché à ce lot.
  useEffect(() => {
    if (productId || !queue.data || queue.data.length === 0) return;
    const batchParam = params.get('batch');
    const match = batchParam
      ? queue.data.find((item) => item.batch?.id === batchParam)
      : queue.data[0];
    if (match) setProductId(match.id);
  }, [queue.data, productId, params]);

  const select = (id: string) => {
    setProductId(id);
    setParams({ product: id }, { replace: true });
  };

  const product = queue.data?.find((item) => item.id === productId) ?? null;
  const locale = dateLocale(i18n.language);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t('verifier:brand.role') },
          { label: t('verifier:qr.title'), to: '/verificateur/qr' },
          { label: t('verifier:qr.generationTitle') },
        ]}
      />
      <PageHeader
        title={t('verifier:qr.generationTitle')}
        subtitle={t('verifier:qr.generationSubtitle')}
        actions={
          <Link to="/verificateur/qr/gestion">
            <Btn variant="secondary">
              <QrCode className="w-4 h-4" />
              {t('verifier:qr.managementTitle')}
            </Btn>
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <Panel title={t('verifier:qr.queue')} bodyClassName="p-0">
            {queue.isLoading && <LoadingBlock label={t('common:status.loading')} />}
            {queue.data?.length === 0 && (
              <EmptyBlock
                title={t('verifier:qr.queueEmpty')}
                description={t('verifier:qr.queueEmptyHint')}
              />
            )}
            <ul className="divide-y divide-[#F1EDE3] max-h-[70vh] overflow-y-auto">
              {(queue.data ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => select(item.id)}
                    className={`w-full text-start px-3 py-2.5 transition-colors ${
                      productId === item.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0C261B] truncate">{item.nom}</span>
                      <StatusPill
                        className="ms-auto"
                        tone={PRODUCT_STATUS_TONE[item.statut]}
                        label={t(`verifier:status.product.${item.statut}`)}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                      {item.batch?.batchCode} · {item._count.qrCodes} QR
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="xl:col-span-9">
          {!product && (
            <Panel>
              <EmptyBlock title={t('verifier:qr.selectPrompt')} icon={<QrCode className="w-8 h-8" />} />
            </Panel>
          )}
          {product && <GenerationWorkbench key={product.id} product={product} locale={locale} />}
        </div>
      </div>
    </div>
  );
};

// --- Poste de génération ------------------------------------------------------

const GenerationWorkbench: React.FC<{ product: QrQueueItem; locale: string }> = ({
  product,
  locale,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const generate = useGenerateQrCodes();
  const generations = useQrGenerations(product.batch?.id);
  const [error, setError] = useState('');
  const [lastGeneration, setLastGeneration] = useState<QrGeneration | null>(null);

  const [form, setForm] = useState({
    quantity: '1000',
    qrType: QR_TYPES[0],
    qrFormat: QR_FORMATS[0],
    destinationUrl: '',
    language: LANGUAGES[0],
    template: TEMPLATES[0],
  });
  const [options, setOptions] = useState<QrOptions>({
    includeBatchNumber: true,
    includeSecurityFeatures: true,
    addSerialNumber: true,
    enableTracking: true,
  });

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const published = product.statut === 'PUBLIE';
  const hasCodes = product._count.qrCodes > 0;

  const steps: { label: string; state: StepState }[] = [
    { label: t('verifier:chainSteps.verification'), state: 'DONE' },
    { label: t('verifier:chainSteps.packaging'), state: 'DONE' },
    { label: t('verifier:chainSteps.product'), state: 'DONE' },
    { label: t('verifier:chainSteps.qr'), state: hasCodes ? 'DONE' : 'CURRENT' },
    { label: t('verifier:chainSteps.market'), state: published ? 'DONE' : hasCodes ? 'CURRENT' : 'TODO' },
    { label: t('verifier:chainSteps.complete'), state: published ? 'DONE' : 'TODO' },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await generate.mutateAsync({
        productId: product.id,
        quantity: Number(form.quantity),
        qrType: form.qrType,
        qrFormat: form.qrFormat,
        destinationUrl: form.destinationUrl || undefined,
        language: form.language,
        template: form.template,
        options,
      });
      setLastGeneration(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const sample = lastGeneration?.qrCodes?.[0];

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="text-base font-extrabold text-[#0C261B]">{product.nom}</h2>
          <StatusPill
            tone={PRODUCT_STATUS_TONE[product.statut]}
            label={t(`verifier:status.product.${product.statut}`)}
          />
          <span className="ms-auto text-xs text-gray-500 tabular-nums">
            {t('verifier:qr.totalGenerated', { count: product._count.qrCodes })}
          </span>
        </div>
        <Stepper steps={steps} currentLabel={t('verifier:progress.current')} />
      </Panel>

      {error && <InlineError message={error} />}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* 1. Produit et lot */}
        <Panel className="lg:col-span-4" title={t('verifier:qr.productInfo')}>
          <dl className="space-y-1.5 text-xs">
            <Row label={t('verifier:product.name')} value={product.nom} />
            <Row label={t('verifier:table.batchId')} value={product.batch?.batchCode} mono />
            <Row label={t('verifier:fields.honeyType')} value={product.batch?.honeyType} />
            <Row
              label={t('verifier:packaging.packageType')}
              value={
                product.batch?.packaging
                  ? `${product.batch.packaging.packageType} — ${product.batch.packaging.size}`
                  : null
              }
            />
            <Row
              label={t('verifier:product.netWeight')}
              value={product.netWeightG ? `${product.netWeightG} g` : null}
            />
            <Row
              label={t('verifier:fields.productionDate')}
              value={formatDate(product.batch?.productionDate ?? null)}
            />
            <Row
              label={t('verifier:fields.expiryDate')}
              value={formatDate(product.batch?.expiryDate ?? null)}
            />
          </dl>
          {product.batch && (
            <div className="mt-3">
              <StatusPill
                tone={BATCH_STATUS_TONE[product.batch.status]}
                label={t(`verifier:status.batch.${product.batch.status}`)}
              />
            </div>
          )}
        </Panel>

        {/* 2. Réglages */}
        <Panel className="lg:col-span-4" title={t('verifier:qr.settings')}>
          <form onSubmit={submit} className="space-y-3">
            <Field label={t('verifier:qr.quantity')} required hint={t('verifier:qr.quantityHint')}>
              <TextInput
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
            </Field>
            <Field label={t('verifier:qr.type')}>
              <SelectInput
                value={form.qrType}
                onChange={(e) => setForm((f) => ({ ...f, qrType: e.target.value }))}
              >
                {QR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`verifier:qr.types.${type}`)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('verifier:qr.format')} hint={t('verifier:qr.formatHint')}>
              <SelectInput
                value={form.qrFormat}
                onChange={(e) => setForm((f) => ({ ...f, qrFormat: e.target.value }))}
              >
                {QR_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {t(`verifier:qr.formats.${format}`)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('verifier:qr.destination')} hint={t('verifier:qr.destinationHint')}>
              <TextInput
                value={form.destinationUrl}
                onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
                placeholder="https://kounouzalafiya.tn/verify"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('verifier:qr.language')}>
                <SelectInput
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {t(`verifier:qr.languages.${language}`)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label={t('verifier:qr.template')}>
                <SelectInput
                  value={form.template}
                  onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
                >
                  {TEMPLATES.map((template) => (
                    <option key={template} value={template}>
                      {t(`verifier:qr.templates.${template}`)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <fieldset className="space-y-1.5 pt-1">
              {OPTION_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-xs text-[#0C261B]">
                  <input
                    type="checkbox"
                    checked={!!options[key]}
                    onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                    className="accent-[#D49B37]"
                  />
                  {t(`verifier:qr.options.${key}`)}
                </label>
              ))}
            </fieldset>

            <Btn type="submit" size="sm" isLoading={generate.isPending} className="w-full">
              <Sparkles className="w-3.5 h-3.5" />
              {t('verifier:actions.generateCodes')}
            </Btn>
          </form>
        </Panel>

        {/* 3. Aperçu */}
        <Panel className="lg:col-span-4" title={t('verifier:qr.preview')}>
          {!sample && (
            <EmptyBlock
              title={t('verifier:qr.noPreview')}
              description={t('verifier:qr.noPreviewHint')}
              icon={<QrCode className="w-8 h-8" />}
            />
          )}
          {sample && (
            <>
              <div className="rounded-lg border border-[#BFE0CB] bg-[#E8F5EC] p-2.5 mb-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#17693F]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('verifier:qr.ready')}
                </p>
                <p className="text-[11px] text-gray-600 mt-0.5">{t('verifier:qr.readyHint')}</p>
              </div>
              <QrPreview qrId={sample.qrId} serial={sample.serialNumber} />
              {lastGeneration && (
                <Btn
                  variant="secondary"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => void downloadQrGeneration(lastGeneration.id)}
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('verifier:actions.exportCodes')}
                </Btn>
              )}
            </>
          )}
        </Panel>
      </div>

      {/* Campagnes du lot */}
      <Panel title={t('verifier:qr.generations')} bodyClassName="p-0">
        {generations.data?.length === 0 && <EmptyBlock title={t('verifier:qr.noGenerations')} />}
        {generations.data && generations.data.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>{t('verifier:table.date')}</Th>
                <Th>{t('verifier:qr.quantity')}</Th>
                <Th>{t('verifier:qr.template')}</Th>
                <Th>{t('verifier:qr.language')}</Th>
                <Th>{t('verifier:table.producer')}</Th>
                <Th className="text-end">{t('verifier:table.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {generations.data.map((generation) => (
                <tr key={generation.id} className="hover:bg-[#FAF6EE]/60">
                  <Td className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(generation.createdAt)}
                  </Td>
                  <Td className="text-xs text-[#0C261B] tabular-nums font-semibold">
                    {generation._count?.qrCodes ?? generation.quantity}
                  </Td>
                  <Td className="text-xs text-gray-600">
                    {t(`verifier:qr.templates.${generation.template}`, generation.template)}
                  </Td>
                  <Td className="text-xs text-gray-600">
                    {t(`verifier:qr.languages.${generation.language}`, generation.language)}
                  </Td>
                  <Td className="text-xs text-gray-500">{generation.createdBy?.name ?? '—'}</Td>
                  <Td className="text-end">
                    <button
                      onClick={() => void downloadQrGeneration(generation.id)}
                      className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37]"
                    >
                      {t('common:actions.download')}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {hasCodes && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-[#EAE1D2] bg-white p-4">
          <Info className="w-4 h-4 text-[#3B7DD8] shrink-0" />
          <p className="text-xs text-gray-600 flex-1">{t('verifier:qr.nextStep')}</p>
          <Link to="/verificateur/qr/gestion">
            <Btn size="sm">
              {t('verifier:qr.managementTitle')}
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Btn>
          </Link>
        </div>
      )}
    </div>
  );
};

/** Aperçu de l'image d'un QR, chargée derrière l'authentification. */
export const QrPreview: React.FC<{ qrId: string; serial?: string | null; size?: number }> = ({
  qrId,
  serial,
  size = 160,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const { data: url, isLoading } = useQrImage(qrId);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-lg border border-[#EAE1D2] bg-white grid place-items-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {isLoading && <span className="text-[11px] text-gray-400">{t('common:status.loading')}</span>}
        {url && <img src={url} alt="" className="w-full h-full object-contain" />}
      </div>
      {serial && <p className="font-mono text-[11px] text-gray-600">{serial}</p>}
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
