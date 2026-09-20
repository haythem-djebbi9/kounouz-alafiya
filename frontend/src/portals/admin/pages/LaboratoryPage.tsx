import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { dateLocale } from '../../../i18n';

type Tab = 'labs' | 'analyses' | 'reference';

export const LaboratoryPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [tab, setTab] = useState<Tab>('analyses');

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0C261B] mb-4">{t('admin:nav.laboratory')}</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton active={tab === 'analyses'} onClick={() => setTab('analyses')} icon={<FlaskConical className="w-4 h-4" />}>
          {t('admin:laboratory.tabs.analyses')}
        </TabButton>
        <TabButton active={tab === 'labs'} onClick={() => setTab('labs')} icon={<Building2 className="w-4 h-4" />}>
          {t('admin:laboratory.tabs.labs')}
        </TabButton>
        <TabButton active={tab === 'reference'} onClick={() => setTab('reference')} icon={<Archive className="w-4 h-4" />}>
          {t('admin:laboratory.tabs.reference')}
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
  const { t } = useTranslation(['admin', 'common']);
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
      setError(err instanceof ApiError ? err.message : t('admin:laboratory.labs.createError'));
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('admin:laboratory.labs.new')}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (labs ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:laboratory.labs.empty')} />
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

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('admin:laboratory.labs.new')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input label={t('admin:laboratory.labs.name')} required value={form.name} onChange={update('name')} />
          <Input label={t('admin:laboratory.labs.accreditationNo')} required value={form.accreditationNo} onChange={update('accreditationNo')} />
          <Input label={t('admin:laboratory.labs.country')} required value={form.country} onChange={update('country')} />
          <Input label={t('admin:laboratory.labs.contactInfo')} required value={form.contactInfo} onChange={update('contactInfo')} />
          <Button type="submit" fullWidth isLoading={createLab.isPending}>
            {t('common:actions.save')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

// --- Analyses de laboratoire --------------------------------------------

const RESULT_FIELD_KEYS = [
  { key: 'humidite_pct', i18nKey: 'humidity', placeholder: '16.5' },
  { key: 'ph', i18nKey: 'ph', placeholder: '3.9' },
  { key: 'hmf_mg_kg', i18nKey: 'hmf', placeholder: '8' },
  { key: 'sucres_reducteurs_pct', i18nKey: 'reducingSugars', placeholder: '78' },
  { key: 'proline_mg_kg', i18nKey: 'proline', placeholder: '300' },
  { key: 'pollen_dominant', i18nKey: 'dominantPollen', placeholder: 'Ziziphus lotus' },
  { key: 'pesticides', i18nKey: 'pesticides', placeholderKey: 'notDetected' },
  { key: 'antibiotiques', i18nKey: 'antibiotics', placeholderKey: 'notDetected' },
] as const;

const AnalysesTab: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { data: analyses, isLoading } = useLabAnalyses();
  const { data: samples } = useAdminSamples();
  const { data: labs } = useLaboratories();
  const createAnalysis = useCreateLabAnalysis();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const eligibleSamples = (samples ?? []).filter((s) => s.status === 'RECEIVED_AT_LAB');

  const resultFields = RESULT_FIELD_KEYS.map((field) => ({
    key: field.key,
    label: t(`admin:laboratory.resultFields.${field.i18nKey}`),
    placeholder: 'placeholderKey' in field ? t(`admin:laboratory.${field.placeholderKey}`) : field.placeholder,
  }));

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
      setError(err instanceof ApiError ? err.message : t('admin:laboratory.analyses.createError'));
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleSamples.length === 0}>
          <Plus className="w-4 h-4" />
          {t('admin:laboratory.analyses.record')}
        </Button>
      </div>

      {eligibleSamples.length === 0 && (
        <Alert tone="info" className="mb-4">{t('admin:laboratory.analyses.noEligibleSamples')}</Alert>
      )}

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (analyses ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:laboratory.analyses.empty')} />
        </Card>
      )}

      <div className="space-y-3">
        {(analyses ?? []).map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0C261B]">{a.sample?.request?.honeyType ?? t('admin:laboratory.analyses.sampleFallback')}</p>
              <p className="text-xs text-gray-400">{a.laboratory?.name} · {new Date(a.analysisDate).toLocaleDateString(dateLocale(i18n.language))}</p>
            </div>
            <StatusBadge kind="labAnalysis" status={a.status} />
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('admin:laboratory.analyses.record')} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Select label={t('admin:laboratory.analyses.sample')} required value={form.sampleId} onChange={(e) => setForm((f) => ({ ...f, sampleId: e.target.value }))}>
            <option value="">{t('admin:laboratory.analyses.selectSample')}</option>
            {eligibleSamples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.request?.honeyType} — {s.request?.producer?.name}
              </option>
            ))}
          </Select>

          <Select label={t('admin:nav.laboratory')} required value={form.labId} onChange={(e) => setForm((f) => ({ ...f, labId: e.target.value }))}>
            <option value="">{t('admin:laboratory.analyses.selectLab')}</option>
            {(labs ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>

          <Input
            label={t('admin:laboratory.analyses.analysisDate')}
            type="date"
            required
            value={form.analysisDate}
            onChange={(e) => setForm((f) => ({ ...f, analysisDate: e.target.value }))}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            {resultFields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                value={results[field.key] ?? ''}
                onChange={(e) => setResults((r) => ({ ...r, [field.key]: e.target.value }))}
              />
            ))}
          </div>

          <Select label={t('admin:laboratory.analyses.conclusion')} required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))}>
            <option value="COMPLIANT">{t('admin:laboratory.analyses.conclusionCompliant')}</option>
            <option value="NON_COMPLIANT">{t('admin:laboratory.analyses.conclusionNonCompliant')}</option>
            <option value="PENDING">{t('admin:laboratory.analyses.conclusionPending')}</option>
          </Select>

          <Button type="submit" fullWidth isLoading={createAnalysis.isPending}>
            {t('admin:laboratory.analyses.saveResult')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

// --- Échantillons de référence -------------------------------------------

const ReferenceTab: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
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
      setError(err instanceof ApiError ? err.message : t('admin:laboratory.reference.createError'));
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setIsOpen(true)} disabled={eligibleSamples.length === 0}>
          <Plus className="w-4 h-4" />
          {t('admin:laboratory.reference.save')}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && (refs ?? []).length === 0 && (
        <Card>
          <EmptyState title={t('admin:laboratory.reference.empty')} />
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

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('admin:laboratory.reference.save')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Select label={t('admin:laboratory.analyses.sample')} required value={form.sampleId} onChange={(e) => setForm((f) => ({ ...f, sampleId: e.target.value }))}>
            <option value="">{t('admin:laboratory.analyses.selectSample')}</option>
            {eligibleSamples.map((s) => (
              <option key={s.id} value={s.id}>{s.request?.honeyType} — {s.request?.producer?.name}</option>
            ))}
          </Select>
          <Input label={t('admin:laboratory.reference.storageLocation')} required value={form.storageLocation} onChange={update('storageLocation')} />
          <Input label={t('admin:laboratory.reference.storageConditions')} required value={form.storageConditions} onChange={update('storageConditions')} />
          <Input label={t('admin:laboratory.reference.retentionPeriod')} required value={form.retentionPeriod} onChange={update('retentionPeriod')} />
          <Button type="submit" fullWidth isLoading={createRef.isPending}>
            {t('common:actions.save')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
