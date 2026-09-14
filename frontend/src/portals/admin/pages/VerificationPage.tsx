import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAdminVerifications, useCreateVerification } from '../hooks/useVerifications';
import { useAdminSamples } from '../hooks/useSamplesAndSeals';
import { Card, Button, Select, Textarea, Modal, StatusBadge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import type { VerificationStatus } from '../../../lib/api-types';

export const VerificationPage: React.FC = () => {
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
      setError(err instanceof ApiError ? err.message : 'تعذر تسجيل القرار.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0C261B]">قرارات التحقق</h1>
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleSamples.length === 0}>
          <Plus className="w-4 h-4" />
          قرار جديد
        </Button>
      </div>

      {eligibleSamples.length === 0 && (
        <Alert tone="info" className="mb-4">لا توجد عينات محللة بانتظار قرار التحقق حالياً.</Alert>
      )}

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (verifications ?? []).length === 0 && (
        <Card>
          <EmptyState title="لم يتم اتخاذ أي قرار تحقق بعد" />
        </Card>
      )}

      <div className="space-y-3">
        {(verifications ?? []).map((v) => (
          <Card key={v.id}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-[#0C261B]">{v.request?.honeyType}</p>
              <StatusBadge kind="verification" status={v.status} />
            </div>
            <p className="text-xs text-gray-400">{v.request?.producer?.name} · قرار {v.decidedBy?.name}</p>
            {v.notes && <p className="text-sm text-gray-600 mt-2">{v.notes}</p>}
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="قرار تحقق جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Select label="العينة" required value={selectedSampleId} onChange={(e) => setSelectedSampleId(e.target.value)}>
            <option value="">اختر عينة محلَّلة</option>
            {eligibleSamples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.request?.honeyType} — {s.request?.producer?.name}
              </option>
            ))}
          </Select>

          {analysis && (
            <Card className="bg-[#FAF6EE]/60">
              <p className="text-xs text-gray-500 mb-1">خلاصة التحليل المخبري</p>
              <StatusBadge kind="labAnalysis" status={analysis.status} />
              {analysis.status === 'NON_COMPLIANT' && (
                <p className="text-xs text-rose-600 font-semibold mt-2">
                  لا يمكن اعتبار العينة "متحقق منها" لأن التحليل غير مطابق — يمكنك فقط اختيار "غير مطابق".
                </p>
              )}
            </Card>
          )}

          <Select label="القرار" required value={status} onChange={(e) => setStatus(e.target.value as VerificationStatus)}>
            <option value="VERIFIED" disabled={analysis?.status === 'NON_COMPLIANT'}>
              تم التحقق ✅
            </option>
            <option value="NOT_VERIFIED">غير مطابق</option>
          </Select>

          <Textarea label="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <Button type="submit" fullWidth isLoading={createVerification.isPending} disabled={!selectedSampleId}>
            تأكيد القرار
          </Button>
        </form>
      </Modal>
    </div>
  );
};
