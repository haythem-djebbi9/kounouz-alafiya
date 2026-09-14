import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCreateRequest } from './hooks';
import { Button, Input, Textarea, Alert } from '../../design-system';
import { ApiError } from '../../lib/api';

const STEPS = ['نوع العسل', 'مكان وكمية الجمع', 'مراجعة الطلب'];

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const createRequest = useCreateRequest();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    honeyType: '',
    description: '',
    collectionLocation: '',
    quantity: '',
  });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const canGoNext = () => {
    if (step === 0) return form.honeyType.trim().length > 0;
    if (step === 1) return form.collectionLocation.trim().length > 0 && Number(form.quantity) > 0;
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    setError('');
    try {
      const created = await createRequest.mutateAsync({
        honeyType: form.honeyType,
        description: form.description || undefined,
        collectionLocation: form.collectionLocation,
        quantity: Number(form.quantity),
      });
      navigate(`/producteur/demandes/${created.id}?envoye=1`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('تعذر إرسال الطلب. حاول مرة أخرى.');
      }
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">طلب تحقق جديد</h1>
      <p className="text-gray-500 mb-6">خطوة {step + 1} من {STEPS.length} — {STEPS[step]}</p>

      {/* Barre de progression */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= step ? 'bg-[#D49B37]' : 'bg-[#EAE1D2]'}`}
          />
        ))}
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {step === 0 && (
        <div className="space-y-4">
          <Input
            label="ما نوع العسل؟"
            required
            autoFocus
            value={form.honeyType}
            onChange={update('honeyType')}
            placeholder="مثال: عسل السدر"
          />
          <Textarea
            label="وصف إضافي (اختياري)"
            value={form.description}
            onChange={update('description')}
            placeholder="أي تفاصيل تريد إضافتها عن هذه الدفعة"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="أين تم جمع العسل؟"
            required
            autoFocus
            value={form.collectionLocation}
            onChange={update('collectionLocation')}
            placeholder="مثال: الكاف، تونس"
          />
          <Input
            label="الكمية التقريبية (كغ)"
            type="number"
            min={0.1}
            step={0.1}
            required
            value={form.quantity}
            onChange={update('quantity')}
            placeholder="مثال: 20"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#EAE1D2] divide-y divide-[#EAE1D2] overflow-hidden">
            <SummaryRow label="نوع العسل" value={form.honeyType} />
            {form.description && <SummaryRow label="الوصف" value={form.description} />}
            <SummaryRow label="مكان الجمع" value={form.collectionLocation} />
            <SummaryRow label="الكمية" value={`${form.quantity} كغ`} />
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#D49B37]" />
            سيتم الرد على طلبك خلال 48 ساعة.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowRight className="w-4 h-4" />
            السابق
          </Button>
        ) : (
          <span />
        )}

        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canGoNext()}>
            التالي
            <ArrowLeft className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={createRequest.isPending}>
            إرسال الطلب
          </Button>
        )}
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-bold text-[#0C261B]">{value}</span>
  </div>
);
