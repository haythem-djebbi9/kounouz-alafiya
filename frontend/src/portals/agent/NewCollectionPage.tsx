import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Camera, X, Loader2 } from 'lucide-react';
import { useRequestDetailForAgent, useCreateSample, useUploadSamplePhoto } from './hooks';
import { Button, Input, Alert, Card } from '../../design-system';
import { resolveFileUrl, ApiError } from '../../lib/api';

const STEPS = ['تفاصيل الجمع', 'صور إثبات', 'مراجعة'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 16);
}

export const NewCollectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') ?? undefined;
  const navigate = useNavigate();

  const { data: request, isLoading: loadingRequest } = useRequestDetailForAgent(requestId);
  const createSample = useCreateSample();
  const uploadPhoto = useUploadSamplePhoto();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ collectionDate: todayIso(), location: '', quantity: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (request) {
      setForm((f) => ({ ...f, location: request.collectionLocation }));
    }
  }, [request]);

  if (!requestId) {
    return (
      <Alert tone="error">
        لم يتم تحديد طلب للجمع. ارجع إلى الرئيسية واختر طلباً من قائمة الانتظار.
      </Alert>
    );
  }

  if (loadingRequest) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const canGoNext = () => {
    if (step === 0) return form.location.trim().length > 0 && Number(form.quantity) > 0;
    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setIsUploading(true);
    setError('');
    try {
      for (const file of files) {
        const res = await uploadPhoto.mutateAsync(file);
        setPhotos((p) => [...p, res.url]);
      }
    } catch {
      setError('تعذر رفع الصورة. حاول مرة أخرى.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (url: string) => setPhotos((p) => p.filter((x) => x !== url));

  const handleSubmit = async () => {
    setError('');
    try {
      const sample = await createSample.mutateAsync({
        requestId,
        collectionDate: new Date(form.collectionDate).toISOString(),
        location: form.location,
        quantity: Number(form.quantity),
        photos,
      });
      navigate(`/agent/echantillons/${sample.id}?collecte=1`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تسجيل العينة. حاول مرة أخرى.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-1">تسجيل جمع عينة</h1>
      <p className="text-gray-500 mb-6">
        خطوة {step + 1} من {STEPS.length} — {STEPS[step]}
      </p>

      <div className="flex gap-1.5 mb-6">
        {STEPS.map((_, idx) => (
          <div key={idx} className={`h-1.5 flex-1 rounded-full ${idx <= step ? 'bg-[#D49B37]' : 'bg-[#EAE1D2]'}`} />
        ))}
      </div>

      {request && (
        <Card className="mb-6 bg-[#FAF6EE]/60">
          <p className="font-bold text-[#0C261B]">{request.honeyType}</p>
          <p className="text-xs text-gray-500">{request.producer?.farmName} · {request.producer?.name}</p>
        </Card>
      )}

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {step === 0 && (
        <div className="space-y-4">
          <Input
            label="تاريخ ووقت الجمع"
            type="datetime-local"
            required
            value={form.collectionDate}
            onChange={update('collectionDate')}
          />
          <Input label="مكان الجمع" required value={form.location} onChange={update('location')} />
          <Input
            label="الكمية المأخوذة (كغ)"
            type="number"
            min={0.1}
            step={0.1}
            required
            value={form.quantity}
            onChange={update('quantity')}
            placeholder="مثال: 0.5"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#D49B37]/50 rounded-xl py-8 cursor-pointer hover:bg-[#FAF6EE] transition-colors">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-[#D49B37] animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-[#D49B37]" />
            )}
            <span className="text-sm font-bold text-[#0C261B]">إضافة صورة</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFileChange} disabled={isUploading} />
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <div key={url} className="relative">
                  <img src={resolveFileUrl(url)} alt="صورة إثبات" className="w-full aspect-square object-cover rounded-lg border border-[#EAE1D2]" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                    aria-label="حذف الصورة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">الصور اختيارية، لكنها تساعد فريق التحقق.</p>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl border border-[#EAE1D2] divide-y divide-[#EAE1D2] overflow-hidden">
          <SummaryRow label="مكان الجمع" value={form.location} />
          <SummaryRow label="الكمية" value={`${form.quantity} كغ`} />
          <SummaryRow label="عدد الصور" value={String(photos.length)} />
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowRight className="w-4 h-4" />
            السابق
          </Button>
        ) : (
          <Link to="/agent" className="text-sm text-gray-400 hover:text-[#0C261B] self-center">
            إلغاء
          </Link>
        )}

        {step < STEPS.length - 1 ? (
          <Button onClick={() => canGoNext() && setStep((s) => s + 1)} disabled={!canGoNext()}>
            التالي
            <ArrowLeft className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={createSample.isPending}>
            تسجيل العينة
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
