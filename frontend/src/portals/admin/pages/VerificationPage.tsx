import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useAdminVerifications, useCreateVerification } from '../hooks/useVerifications';
import { useAdminSamples } from '../hooks/useSamplesAndSeals';
import { Card, Button, Select, Textarea, Modal, StatusBadge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import type { VerificationStatus } from '../../../lib/api-types';

export const VerificationPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { data: verifications, isLoading } = useAdminVerifications();
  const { data: samples } = useAdminSamples();
  const createVerification = useCreateVerification();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const decidedSampleIds = useMemo(() => new Set((verifications ?? []).map((v) => v.sampleId)), [verifications]);

  const eligibleSamples = (samples ?? []).filter(
    (s) => s.status === 'ANALYZED' && s.labAnalyses && s.labAnalyses.length > 0 && !decidedSampleIds.has(s.id),
  );

  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('VERIFIED');
  const [notes, setNotes] = useState('');

  const selectedSample = eligibleSamples.find((s) => s.id === selectedSampleId);
  const analysis = selectedSample?.labAnalyses?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedSample || !analysis) return;
    try {
      await createVerification.mutateAsync({
        requestId: selectedSample.requestId,
        sampleId: selectedSample.id,
        analysisId: analysis.id,
        status,
        notes: notes || undefined,
      });
      setSelectedSampleId('');
      setStatus('VERIFIED');
      setNotes('');
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:verification.createError'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0C261B]">{t('admin:verification.heading')}</h1>
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleSamples.length === 0}>
          <Plus className="w-4 h-4" />
          {t('admin:verification.new')}
        </Button>
      </div>

      {eligibleSamples.length === 0 && (
        <Alert tone="info" className="mb-4">{t('admin:verification.noEligibleSamples')}</Alert>
      )}

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (verifications ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:verification.empty')} />
        </Card>
      )}

      <div className="space-y-3">
        {(verifications ?? []).map((v) => (
          <Card key={v.id}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-[#0C261B]">{v.request?.honeyType}</p>
              <StatusBadge kind="verification" status={v.status} />
            </div>
            <p className="text-xs text-gray-400">{t('admin:verification.decidedBy', { producer: v.request?.producer?.name, name: v.decidedBy?.name })}</p>
            {v.notes && <p className="text-sm text-gray-600 mt-2">{v.notes}</p>}
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('admin:verification.new')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Select label={t('admin:laboratory.analyses.sample')} required value={selectedSampleId} onChange={(e) => setSelectedSampleId(e.target.value)}>
            <option value="">{t('admin:verification.selectAnalyzedSample')}</option>
            {eligibleSamples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.request?.honeyType} — {s.request?.producer?.name}
              </option>
            ))}
          </Select>

          {analysis && (
            <Card className="bg-[#FAF6EE]/60">
              <p className="text-xs text-gray-500 mb-1">{t('admin:verification.labAnalysisSummary')}</p>
              <StatusBadge kind="labAnalysis" status={analysis.status} />
              {analysis.status === 'NON_COMPLIANT' && (
                <p className="text-xs text-rose-600 font-semibold mt-2">
                  {t('admin:verification.nonCompliantWarning')}
                </p>
              )}
            </Card>
          )}

          <Select label={t('admin:verification.decision')} required value={status} onChange={(e) => setStatus(e.target.value as VerificationStatus)}>
            <option value="VERIFIED" disabled={analysis?.status === 'NON_COMPLIANT'}>
              {t('admin:verification.decisionVerified')}
            </option>
            <option value="NOT_VERIFIED">{t('admin:verification.decisionNotVerified')}</option>
          </Select>

          <Textarea label={t('admin:verification.notesOptional')} value={notes} onChange={(e) => setNotes(e.target.value)} />

          <Button type="submit" fullWidth isLoading={createVerification.isPending} disabled={!selectedSampleId}>
            {t('admin:verification.confirmDecision')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
