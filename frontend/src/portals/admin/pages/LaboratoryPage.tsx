import React, { useState } from 'react';
import { Plus, FlaskConical, Archive, Building2 } from 'lucide-react';
import {
  useLaboratories,
  useCreateLaboratory,
  useLabAnalyses,
  useCreateLabAnalysis,
  useReferenceSamples,
  useCreateReferenceSample,
} from '../hooks/useLaboratory';
import { useAdminSamples } from '../hooks/useSamplesAndSeals';
import { Card, Button, Input, Textarea, Select, Modal, StatusBadge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';

type Tab = 'labs' | 'analyses' | 'reference';

export const LaboratoryPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('analyses');

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-4">المخبر</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton active={tab === 'analyses'} onClick={() => setTab('analyses')} icon={<FlaskConical className="w-4 h-4" />}>
          التحاليل
        </TabButton>
        <TabButton active={tab === 'labs'} onClick={() => setTab('labs')} icon={<Building2 className="w-4 h-4" />}>
          المخابر
        </TabButton>
        <TabButton active={tab === 'reference'} onClick={() => setTab('reference')} icon={<Archive className="w-4 h-4" />}>
          العينات المرجعية
        </TabButton>
      </div>

      {tab === 'analyses' && <AnalysesTab />}
      {tab === 'labs' && <LabsTab />}
      {tab === 'reference' && <ReferenceTab />}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }> = ({
  active,
  onClick,
  icon,
  children,
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors min-h-[40px] ${
      active ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:border-[#D49B37]'
    }`}
  >
    {icon}
    {children}
  </button>
);

// --- Laboratoires ------------------------------------------------------

const LabsTab: React.FC = () => {
  const { data: labs, isLoading } = useLaboratories();
  const createLab = useCreateLaboratory();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', accreditationNo: '', country: '', contactInfo: '' });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createLab.mutateAsync(form);
      setForm({ name: '', accreditationNo: '', country: '', contactInfo: '' });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر إضافة المخبر.');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4" />
          مخبر جديد
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (labs ?? []).length === 0 && (
        <Card>
          <EmptyState title="لا توجد مخابر مسجلة بعد" />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {(labs ?? []).map((lab) => (
          <Card key={lab.id}>
            <p className="font-bold text-[#0C261B]">{lab.name}</p>
            <p className="text-xs text-gray-400">{lab.country} · {lab.accreditationNo}</p>
            <p className="text-xs text-gray-400 mt-1">{lab.contactInfo}</p>
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="مخبر جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input label="اسم المخبر" required value={form.name} onChange={update('name')} />
          <Input label="رقم الاعتماد" required value={form.accreditationNo} onChange={update('accreditationNo')} />
          <Input label="البلد" required value={form.country} onChange={update('country')} />
          <Input label="معلومات التواصل" required value={form.contactInfo} onChange={update('contactInfo')} />
          <Button type="submit" fullWidth isLoading={createLab.isPending}>
            حفظ
          </Button>
        </form>
      </Modal>
    </div>
  );
};

// --- Analyses de laboratoire --------------------------------------------

const RESULT_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'humidite_pct', label: 'نسبة الرطوبة (%)', placeholder: '16.5' },
  { key: 'ph', label: 'الحموضة (pH)', placeholder: '3.9' },
  { key: 'hmf_mg_kg', label: 'HMF (مغ/كغ)', placeholder: '8' },
  { key: 'sucres_reducteurs_pct', label: 'السكريات المختزلة (%)', placeholder: '78' },
  { key: 'proline_mg_kg', label: 'البرولين (مغ/كغ)', placeholder: '300' },
  { key: 'pollen_dominant', label: 'حبوب اللقاح السائدة', placeholder: 'Ziziphus lotus' },
  { key: 'pesticides', label: 'المبيدات', placeholder: 'غير مكتشفة' },
  { key: 'antibiotiques', label: 'المضادات الحيوية', placeholder: 'غير مكتشفة' },
];

const AnalysesTab: React.FC = () => {
  const { data: analyses, isLoading } = useLabAnalyses();
  const { data: samples } = useAdminSamples();
  const { data: labs } = useLaboratories();
  const createAnalysis = useCreateLabAnalysis();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const eligibleSamples = (samples ?? []).filter((s) => s.status === 'RECEIVED_AT_LAB');

  const [form, setForm] = useState({
    sampleId: '',
    labId: '',
    analysisDate: new Date().toISOString().slice(0, 10),
    status: 'COMPLIANT' as 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING',
  });
  const [results, setResults] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createAnalysis.mutateAsync({
        sampleId: form.sampleId,
        labId: form.labId,
        analysisDate: new Date(form.analysisDate).toISOString(),
        status: form.status,
        results,
      });
      setForm({ sampleId: '', labId: '', analysisDate: new Date().toISOString().slice(0, 10), status: 'COMPLIANT' });
      setResults({});
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تسجيل التحليل.');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleSamples.length === 0}>
          <Plus className="w-4 h-4" />
          تسجيل نتيجة تحليل
        </Button>
      </div>

      {eligibleSamples.length === 0 && (
        <Alert tone="info" className="mb-4">لا توجد عينات مستلمة بالمخبر بانتظار التحليل حالياً.</Alert>
      )}

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (analyses ?? []).length === 0 && (
        <Card>
          <EmptyState title="لا توجد تحاليل مسجلة بعد" />
        </Card>
      )}

      <div className="space-y-3">
        {(analyses ?? []).map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0C261B]">{a.sample?.request?.honeyType ?? 'عينة'}</p>
              <p className="text-xs text-gray-400">{a.laboratory?.name} · {new Date(a.analysisDate).toLocaleDateString('ar-TN')}</p>
            </div>
            <StatusBadge kind="labAnalysis" status={a.status} />
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="تسجيل نتيجة تحليل" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Select label="العينة" required value={form.sampleId} onChange={(e) => setForm((f) => ({ ...f, sampleId: e.target.value }))}>
            <option value="">اختر عينة</option>
            {eligibleSamples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.request?.honeyType} — {s.request?.producer?.name}
              </option>
            ))}
          </Select>

          <Select label="المخبر" required value={form.labId} onChange={(e) => setForm((f) => ({ ...f, labId: e.target.value }))}>
            <option value="">اختر مخبراً</option>
            {(labs ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>

          <Input
            label="تاريخ التحليل"
            type="date"
            required
            value={form.analysisDate}
            onChange={(e) => setForm((f) => ({ ...f, analysisDate: e.target.value }))}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            {RESULT_FIELDS.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                value={results[field.key] ?? ''}
                onChange={(e) => setResults((r) => ({ ...r, [field.key]: e.target.value }))}
              />
            ))}
          </div>

          <Select label="الخلاصة" required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))}>
            <option value="COMPLIANT">مطابقة</option>
            <option value="NON_COMPLIANT">غير مطابقة</option>
            <option value="PENDING">بانتظار المراجعة</option>
          </Select>

          <Button type="submit" fullWidth isLoading={createAnalysis.isPending}>
            حفظ النتيجة
          </Button>
        </form>
      </Modal>
    </div>
  );
};

// --- Échantillons de référence -------------------------------------------

const ReferenceTab: React.FC = () => {
  const { data: refs, isLoading } = useReferenceSamples();
  const { data: samples } = useAdminSamples();
  const createRef = useCreateReferenceSample();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const eligibleSamples = (samples ?? []).filter((s) => s.status === 'ANALYZED' && !s.referenceSample);

  const [form, setForm] = useState({ sampleId: '', storageLocation: '', storageConditions: '', retentionPeriod: '24 mois' });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createRef.mutateAsync(form);
      setForm({ sampleId: '', storageLocation: '', storageConditions: '', retentionPeriod: '24 mois' });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر حفظ العينة المرجعية.');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleSamples.length === 0}>
          <Plus className="w-4 h-4" />
          حفظ عينة مرجعية
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && (refs ?? []).length === 0 && (
        <Card>
          <EmptyState title="لا توجد عينات مرجعية محفوظة بعد" />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {(refs ?? []).map((r) => (
          <Card key={r.id}>
            <p className="font-mono font-bold text-sm text-[#0C261B]">{r.referenceCode}</p>
            <p className="text-xs text-gray-400 mt-1">{r.storageLocation}</p>
            <p className="text-xs text-gray-400">{r.storageConditions} · {r.retentionPeriod}</p>
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="حفظ عينة مرجعية">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Select label="العينة" required value={form.sampleId} onChange={(e) => setForm((f) => ({ ...f, sampleId: e.target.value }))}>
            <option value="">اختر عينة</option>
            {eligibleSamples.map((s) => (
              <option key={s.id} value={s.id}>{s.request?.honeyType} — {s.request?.producer?.name}</option>
            ))}
          </Select>
          <Input label="مكان التخزين" required value={form.storageLocation} onChange={update('storageLocation')} />
          <Input label="ظروف التخزين" required value={form.storageConditions} onChange={update('storageConditions')} />
          <Input label="مدة الاحتفاظ" required value={form.retentionPeriod} onChange={update('retentionPeriod')} />
          <Button type="submit" fullWidth isLoading={createRef.isPending}>
            حفظ
          </Button>
        </form>
      </Modal>
    </div>
  );
};
