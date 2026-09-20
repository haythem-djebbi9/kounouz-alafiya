import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useBatches, useCreateBatch } from '../hooks/useBatchesAndPackaging';
import { useAdminVerifications } from '../hooks/useVerifications';
import { Card, Button, Input, Select, Modal, StatusBadge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';

export const BatchesPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { data: batches, isLoading } = useBatches();
  const { data: verifications } = useAdminVerifications();
  const createBatch = useCreateBatch();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const usedVerificationIds = useMemo(() => new Set((batches ?? []).map((b) => b.verificationId)), [batches]);
  const eligibleVerifications = (verifications ?? []).filter(
    (v) => v.status === 'VERIFIED' && !usedVerificationIds.has(v.id),
  );

  const [form, setForm] = useState({ verificationId: '', quantityKg: '', productionDate: new Date().toISOString().slice(0, 10) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createBatch.mutateAsync({
        verificationId: form.verificationId,
        quantityKg: Number(form.quantityKg),
        productionDate: new Date(form.productionDate).toISOString(),
      });
      setForm({ verificationId: '', quantityKg: '', productionDate: new Date().toISOString().slice(0, 10) });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:batches.createError'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0C261B]">{t('admin:nav.batches')}</h1>
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleVerifications.length === 0}>
          <Plus className="w-4 h-4" />
          {t('admin:batches.new')}
        </Button>
      </div>

      {eligibleVerifications.length === 0 && (
        <Alert tone="info" className="mb-4">{t('admin:batches.noEligibleVerifications')}</Alert>
      )}

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (batches ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:batches.empty')} />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {(batches ?? []).map((b) => (
          <Link key={b.id} to={`/admin/emballage?batchId=${b.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="font-mono font-bold text-sm text-[#0C261B]">{b.batchCode}</p>
                <StatusBadge kind="batch" status={b.status} />
              </div>
              <p className="text-xs text-gray-400">{b.honeyType} · {b.quantityKg} {t('admin:units.kg')}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('admin:batches.new')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Select
            label={t('admin:batches.verificationDecision')}
            required
            value={form.verificationId}
            onChange={(e) => setForm((f) => ({ ...f, verificationId: e.target.value }))}
          >
            <option value="">{t('admin:batches.selectVerifiedDecision')}</option>
            {eligibleVerifications.map((v) => (
              <option key={v.id} value={v.id}>
                {v.request?.honeyType} — {v.request?.producer?.name}
              </option>
            ))}
          </Select>
          <Input
            label={t('admin:batches.quantityKg')}
            type="number"
            min={0.1}
            step={0.1}
            required
            value={form.quantityKg}
            onChange={(e) => setForm((f) => ({ ...f, quantityKg: e.target.value }))}
          />
          <Input
            label={t('admin:batches.productionDate')}
            type="date"
            required
            value={form.productionDate}
            onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))}
          />
          <Button type="submit" fullWidth isLoading={createBatch.isPending}>
            {t('admin:batches.create')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
