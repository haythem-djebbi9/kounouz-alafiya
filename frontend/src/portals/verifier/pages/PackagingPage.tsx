import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Package, Plus, Save, Trash2 } from 'lucide-react';
import {
  useCompletePackaging,
  useDeletePackagingUnit,
  usePackaging,
  usePackagingQueue,
  useSavePackaging,
  useSavePackagingUnit,
} from '../commerce-hooks';
import { BATCH_STATUS_TONE, PACKAGING_STATUS_TONE } from '../status-map';
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
  TextArea,
  TextInput,
  Th,
} from '../ui';
import { Modal } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import { dateLocale } from '../../../i18n';
import type { PackagingDetail, PackagingStatus, PackagingUnit, StepState } from '../types';

const PACKAGE_TYPES = ['Pot en verre', 'Bocal premium', 'Pot plastique', 'Sachet'];
const UNIT_SIZES = ['250 g', '500 g', '1 kg'];

export const PackagingPage: React.FC = () => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();
  const [batchId, setBatchId] = useState<string | null>(params.get('batch'));

  const queue = usePackagingQueue();
  const packaging = usePackaging(batchId ?? undefined);

  useEffect(() => {
    if (!batchId && queue.data && queue.data.length > 0) {
      setBatchId(queue.data[0].id);
    }
  }, [queue.data, batchId]);

  const select = (id: string) => {
    setBatchId(id);
    setParams({ batch: id }, { replace: true });
  };

  const locale = dateLocale(i18n.language);
  const current = queue.data?.find((item) => item.id === batchId) ?? null;

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:packaging.title') }]} />
      <PageHeader title={t('verifier:packaging.title')} subtitle={t('verifier:packaging.subtitle')} />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <Panel title={t('verifier:packaging.queue')} bodyClassName="p-0">
            {queue.isLoading && <LoadingBlock label={t('common:status.loading')} />}
            {queue.data?.length === 0 && <EmptyBlock title={t('verifier:packaging.queueEmpty')} />}
            <ul className="divide-y divide-[#F1EDE3] max-h-[70vh] overflow-y-auto">
              {(queue.data ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => select(item.id)}
                    className={`w-full text-start px-3 py-2.5 transition-colors ${
                      batchId === item.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0C261B]">{item.batchCode}</span>
                      <StatusPill
                        className="ms-auto"
                        tone={BATCH_STATUS_TONE[item.status]}
                        label={t(`verifier:status.batch.${item.status}`)}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {item.verification.request.producer.name} · {item.honeyType}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="xl:col-span-9">
          {!batchId && (
            <Panel>
              <EmptyBlock title={t('verifier:packaging.selectPrompt')} icon={<Package className="w-8 h-8" />} />
            </Panel>
          )}
          {batchId && packaging.isLoading && (
            <Panel>
              <LoadingBlock label={t('common:status.loading')} />
            </Panel>
          )}
          {batchId && packaging.isError && (
            <PackagingForm
              batchId={batchId}
              batchCode={current?.batchCode ?? ''}
              existing={null}
              locale={locale}
            />
          )}
          {packaging.data && (
            <PackagingWorkbench
              key={packaging.data.id}
              batchId={batchId as string}
              batchCode={current?.batchCode ?? ''}
              packaging={packaging.data}
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// --- Ouverture / édition du dossier ----------------------------------------

const PackagingForm: React.FC<{
  batchId: string;
  batchCode: string;
  existing: PackagingDetail | null;
  locale: string;
  onDone?: () => void;
}> = ({ batchId, existing, onDone }) => {
  const { t } = useTranslation(['verifier', 'common']);
  const save = useSavePackaging();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    packageType: existing?.packageType ?? PACKAGE_TYPES[0],
    size: existing?.size ?? UNIT_SIZES[1],
    packagingLine: existing?.packagingLine ?? 'Kounouz Standard',
    unitsPlanned: existing?.unitsPlanned ? String(existing.unitsPlanned) : '1000',
    productionDate: (existing?.productionDate ?? new Date().toISOString()).slice(0, 10),
    expiryDate: existing?.expiryDate?.slice(0, 10) ?? '',
    notes: existing?.notes ?? '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await save.mutateAsync({
        batchId,
        packageType: form.packageType,
        size: form.size,
        packagingLine: form.packagingLine || undefined,
        unitsPlanned: form.unitsPlanned ? Number(form.unitsPlanned) : undefined,
        productionDate: new Date(form.productionDate).toISOString(),
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Panel title={existing ? t('verifier:packaging.details') : t('verifier:packaging.openTitle')}>
      {!existing && <p className="text-sm text-gray-600 mb-3">{t('verifier:packaging.openHint')}</p>}
      {error && <InlineError message={error} />}

      <form onSubmit={submit} className="space-y-3 mt-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('verifier:packaging.packageType')} required>
            <SelectInput
              value={form.packageType}
              onChange={(e) => setForm((f) => ({ ...f, packageType: e.target.value }))}
            >
              {PACKAGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t('verifier:packaging.unitSize')} required>
            <SelectInput value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}>
              {UNIT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t('verifier:packaging.unitsPlanned')} hint={t('verifier:packaging.unitsHint')}>
            <TextInput
              type="number"
              min="1"
              value={form.unitsPlanned}
              onChange={(e) => setForm((f) => ({ ...f, unitsPlanned: e.target.value }))}
            />
          </Field>
          <Field label={t('verifier:packaging.line')}>
            <TextInput
              value={form.packagingLine}
              onChange={(e) => setForm((f) => ({ ...f, packagingLine: e.target.value }))}
            />
          </Field>
          <Field label={t('verifier:packaging.date')} required>
            <TextInput
              type="date"
              value={form.productionDate}
              onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('verifier:fields.expiryDate')}>
            <TextInput
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
          </Field>
        </div>

        <Field label={t('verifier:packaging.notes')}>
          <TextArea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder={t('verifier:packaging.notesPlaceholder')}
          />
        </Field>

        <Btn type="submit" size="sm" isLoading={save.isPending}>
          <Save className="w-3.5 h-3.5" />
          {existing ? t('common:actions.save') : t('verifier:actions.openPackaging')}
        </Btn>
      </form>
    </Panel>
  );
};

// --- Poste de travail emballage ---------------------------------------------

const PackagingWorkbench: React.FC<{
  batchId: string;
  batchCode: string;
  packaging: PackagingDetail;
  locale: string;
}> = ({ batchId, batchCode, packaging, locale }) => {
  const { t } = useTranslation(['verifier', 'common']);
  const [error, setError] = useState('');
  const [unitModal, setUnitModal] = useState<PackagingUnit | 'new' | null>(null);

  const complete = useCompletePackaging();
  const deleteUnit = useDeletePackagingUnit();

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const locked = packaging.status === 'COMPLETED';

  // Étapes du parcours commercial, du point de vue de l'atelier (§14).
  const steps: { label: string; state: StepState }[] = [
    { label: t('verifier:chainSteps.verification'), state: 'DONE' },
    { label: t('verifier:chainSteps.packaging'), state: locked ? 'DONE' : 'CURRENT' },
    { label: t('verifier:chainSteps.product'), state: locked ? 'CURRENT' : 'TODO' },
    { label: t('verifier:chainSteps.qr'), state: 'TODO' },
    { label: t('verifier:chainSteps.market'), state: 'TODO' },
    { label: t('verifier:chainSteps.complete'), state: 'TODO' },
  ];

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="font-mono text-base font-extrabold text-[#0C261B]">{batchCode}</h2>
          <StatusPill
            tone={PACKAGING_STATUS_TONE[packaging.status]}
            label={t(`verifier:status.packaging.${packaging.status}`)}
          />
          <span className="ms-auto text-xs text-gray-500 tabular-nums">
            {t('verifier:packaging.progress', {
              done: packaging.progress.unitsCompleted,
              total: packaging.progress.unitsTotal,
            })}
          </span>
        </div>
        <Stepper steps={steps} currentLabel={t('verifier:progress.current')} />
      </Panel>

      {error && <InlineError message={error} />}

      <PackagingForm batchId={batchId} batchCode={batchCode} existing={packaging} locale={locale} />

      <Panel
        title={t('verifier:packaging.units')}
        bodyClassName="p-0"
        actions={
          !locked && (
            <Btn size="sm" variant="secondary" onClick={() => setUnitModal('new')}>
              <Plus className="w-3.5 h-3.5" />
              {t('verifier:actions.addUnit')}
            </Btn>
          )
        }
      >
        <Table>
          <thead>
            <tr>
              <Th>{t('verifier:packaging.unitId')}</Th>
              <Th>{t('verifier:packaging.unitSize')}</Th>
              <Th>{t('verifier:table.quantity')}</Th>
              <Th>{t('verifier:packaging.date')}</Th>
              <Th>{t('verifier:fields.expiryDate')}</Th>
              <Th>{t('verifier:table.status')}</Th>
              <Th className="text-end">{t('verifier:table.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {packaging.units.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyBlock
                    title={t('verifier:packaging.noUnits')}
                    description={t('verifier:packaging.noUnitsHint')}
                  />
                </td>
              </tr>
            )}
            {packaging.units.map((unit) => (
              <tr key={unit.id} className="hover:bg-[#FAF6EE]/60">
                <Td className="font-mono text-xs font-bold text-[#0C261B]">{unit.unitCode}</Td>
                <Td className="text-xs text-gray-600">{unit.unitSize}</Td>
                <Td className="text-xs text-gray-600 tabular-nums">{unit.quantity}</Td>
                <Td className="text-xs text-gray-500">{formatDate(unit.packagingDate)}</Td>
                <Td className="text-xs text-gray-500">{formatDate(unit.expiryDate)}</Td>
                <Td>
                  <StatusPill
                    tone={PACKAGING_STATUS_TONE[unit.status]}
                    label={t(`verifier:status.packaging.${unit.status}`)}
                  />
                </Td>
                <Td className="text-end">
                  {!locked && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setUnitModal(unit)}
                        className="text-xs font-bold text-[#0C261B] hover:text-[#D49B37] px-1"
                      >
                        {t('common:actions.edit')}
                      </button>
                      {unit.status !== 'COMPLETED' && (
                        <button
                          onClick={() => run(() => deleteUnit.mutateAsync(unit.id))}
                          className="p-1 rounded text-gray-400 hover:text-[#B42323]"
                          aria-label={t('common:actions.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-[#EAE1D2] bg-white p-4">
        <p className="text-xs text-gray-600 flex-1">
          {locked ? t('verifier:packaging.nextStepDone') : t('verifier:packaging.nextStep')}
        </p>
        {!locked && (
          <Btn
            variant="success"
            size="sm"
            isLoading={complete.isPending}
            onClick={() => run(() => complete.mutateAsync(batchId))}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('verifier:actions.completePackaging')}
          </Btn>
        )}
        {locked && (
          <Link to={`/verificateur/produits?batch=${batchId}`}>
            <Btn size="sm">
              {t('verifier:actions.proceedToProduct')}
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Btn>
          </Link>
        )}
      </div>

      {unitModal && (
        <UnitModal
          batchId={batchId}
          unit={unitModal === 'new' ? null : unitModal}
          onClose={() => setUnitModal(null)}
        />
      )}
    </div>
  );
};

// --- Unité de conditionnement ------------------------------------------------

const UnitModal: React.FC<{ batchId: string; unit: PackagingUnit | null; onClose: () => void }> = ({
  batchId,
  unit,
  onClose,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const save = useSavePackagingUnit();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    unitSize: unit?.unitSize ?? UNIT_SIZES[1],
    quantity: unit ? String(unit.quantity) : '',
    packagingDate: unit?.packagingDate?.slice(0, 10) ?? '',
    expiryDate: unit?.expiryDate?.slice(0, 10) ?? '',
    status: (unit?.status ?? 'PLANNED') as PackagingStatus,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await save.mutateAsync({
        batchId,
        unitId: unit?.id,
        unitSize: form.unitSize,
        quantity: Number(form.quantity),
        packagingDate: form.packagingDate ? new Date(form.packagingDate).toISOString() : undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        status: form.status,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={unit ? t('verifier:packaging.editUnit') : t('verifier:actions.addUnit')}
    >
      <form onSubmit={submit} className="space-y-3">
        {error && <InlineError message={error} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('verifier:packaging.unitSize')} required>
            <SelectInput
              value={form.unitSize}
              onChange={(e) => setForm((f) => ({ ...f, unitSize: e.target.value }))}
            >
              {UNIT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t('verifier:table.quantity')} required>
            <TextInput
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('verifier:packaging.date')}>
            <TextInput
              type="date"
              value={form.packagingDate}
              onChange={(e) => setForm((f) => ({ ...f, packagingDate: e.target.value }))}
            />
          </Field>
          <Field label={t('verifier:fields.expiryDate')}>
            <TextInput
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
          </Field>
        </div>

        <Field label={t('verifier:table.status')}>
          <SelectInput
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PackagingStatus }))}
          >
            <option value="PLANNED">{t('verifier:status.packaging.PLANNED')}</option>
            <option value="IN_PROGRESS">{t('verifier:status.packaging.IN_PROGRESS')}</option>
            <option value="COMPLETED">{t('verifier:status.packaging.COMPLETED')}</option>
          </SelectInput>
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </Btn>
          <Btn type="submit" isLoading={save.isPending}>
            {t('common:actions.save')}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};
