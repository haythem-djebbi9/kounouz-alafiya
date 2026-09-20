import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, CheckCircle2 } from 'lucide-react';
import { useBatches, usePackagings, useCreatePackaging, useCompletePackaging } from '../hooks/useBatchesAndPackaging';
import { Card, Button, Input, Select, Modal, StatusBadge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';

export const PackagingPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchParams] = useSearchParams();
  const { data: batches } = useBatches();
  const { data: packagings, isLoading } = usePackagings();
  const createPackaging = useCreatePackaging();
  const completePackaging = useCompletePackaging();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const eligibleBatches = useMemo(() => (batches ?? []).filter((b) => b.status === 'CREATED'), [batches]);

  const [form, setForm] = useState({
    batchId: searchParams.get('batchId') ?? '',
    packageType: 'Pot en verre',
    size: '500g',
    labelDesign: '',
    productionDate: new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createPackaging.mutateAsync({
        batchId: form.batchId,
        packageType: form.packageType,
        size: form.size,
        labelDesign: form.labelDesign || undefined,
        productionDate: new Date(form.productionDate).toISOString(),
      });
      setForm({ batchId: '', packageType: 'Pot en verre', size: '500g', labelDesign: '', productionDate: new Date().toISOString().slice(0, 10) });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:packaging.createError'));
    }
  };

  const handleComplete = async (id: string) => {
    setError('');
    try {
      await completePackaging.mutateAsync(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:packaging.completeError'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0C261B]">{t('admin:nav.packaging')}</h1>
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleBatches.length === 0}>
          <Plus className="w-4 h-4" />
          {t('admin:packaging.new')}
        </Button>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {eligibleBatches.length === 0 && (
        <Alert tone="info" className="mb-4">{t('admin:packaging.noEligibleBatches')}</Alert>
      )}

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (packagings ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:packaging.empty')} />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {(packagings ?? []).map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm text-[#0C261B]">{p.batch?.batchCode}</p>
              <StatusBadge kind="packaging" status={p.status} />
            </div>
            <p className="text-xs text-gray-400 mb-3">{p.packageType} · {p.size}</p>
            {p.status === 'IN_PROGRESS' && (
              <Button size="sm" variant="outline" onClick={() => handleComplete(p.id)} isLoading={completePackaging.isPending}>
                <CheckCircle2 className="w-4 h-4" />
                {t('admin:packaging.complete')}
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('admin:packaging.new')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label={t('admin:nav.batches')} required value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}>
            <option value="">{t('admin:packaging.selectBatch')}</option>
            {eligibleBatches.map((b) => (
              <option key={b.id} value={b.id}>{b.batchCode} — {b.honeyType}</option>
            ))}
          </Select>
          <Input label={t('admin:packaging.packageType')} required value={form.packageType} onChange={(e) => setForm((f) => ({ ...f, packageType: e.target.value }))} />
          <Input label={t('admin:packaging.size')} required value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} />
          <Input
            label={t('admin:packaging.labelDesign')}
            value={form.labelDesign}
            onChange={(e) => setForm((f) => ({ ...f, labelDesign: e.target.value }))}
          />
          <Input
            label={t('admin:packaging.productionDate')}
            type="date"
            required
            value={form.productionDate}
            onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))}
          />
          <Button type="submit" fullWidth isLoading={createPackaging.isPending}>
            {t('common:actions.save')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
