import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Truck, XCircle } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { dateLocale } from '../../i18n';
import { Btn, Field, InlineError, SelectInput, StatusPill, TextArea, TextInput, type Tone } from './ui';

type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

interface FieldAgentOption {
  id: string;
  name: string;
  email: string;
  _count: { collectionAssignments: number };
}

interface RequestAssignment {
  id: string;
  assignmentCode: string;
  status: AssignmentStatus;
  scheduledDate: string;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  priority: Priority;
  sampleId: string | null;
  agent: { id: string; name: string };
}

const STATUS_TONE: Record<AssignmentStatus, Tone> = {
  PENDING: 'blue',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'neutral',
};

const PRIORITIES: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/**
 * Planification de la visite de collecte d'une demande acceptée : choix de
 * l'agent terrain, date, créneau, priorité et consignes.
 */
export const CollectionAssignmentPanel: React.FC<{ requestId: string; requestStatus: string }> = ({
  requestId,
  requestStatus,
}) => {
  const { t, i18n } = useTranslation('verifier');
  const locale = dateLocale(i18n.language);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const assignments = useQuery({
    queryKey: ['verifier', 'collection-assignments', requestId],
    queryFn: () => api.get<RequestAssignment[]>(`/collection-assignments?requestId=${requestId}`),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['verifier'] }),
      queryClient.invalidateQueries({ queryKey: ['field-agent'] }),
    ]);

  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/collection-assignments/${id}/cancel`),
    onSuccess: invalidate,
  });

  const active = assignments.data?.find((a) => a.status !== 'CANCELLED');
  const canPlan = !active && ['ACCEPTED', 'COLLECTION_SCHEDULED'].includes(requestStatus);

  if (assignments.isLoading) return null;
  if (!active && !canPlan) return null;

  return (
    <div className="rounded-xl border border-[#C3D8F0] bg-[#F5F9FE] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-[#1D4E89]" />
        <p className="text-sm font-bold text-[#0C261B]">{t('collectionAssignment.heading')}</p>
      </div>

      {error && <InlineError message={error} />}

      {active ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-xs font-bold text-[#0C261B]">{active.assignmentCode}</span>
          <StatusPill tone={STATUS_TONE[active.status]} label={t(`collectionAssignment.status.${active.status}`)} />
          <span className="text-gray-600">
            {active.agent.name} ·{' '}
            {new Date(active.scheduledDate).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
            {active.timeWindowStart && ` · ${active.timeWindowStart}–${active.timeWindowEnd ?? ''}`}
          </span>
          {!active.sampleId && active.status !== 'COMPLETED' && (
            <Btn
              size="sm"
              variant="danger"
              className="ms-auto"
              isLoading={cancel.isPending}
              onClick={async () => {
                setError('');
                try {
                  await cancel.mutateAsync(active.id);
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : t('errors.generic'));
                }
              }}
            >
              <XCircle className="w-3.5 h-3.5" />
              {t('collectionAssignment.cancel')}
            </Btn>
          )}
        </div>
      ) : formOpen ? (
        <AssignmentForm requestId={requestId} onDone={() => setFormOpen(false)} onInvalidate={invalidate} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-gray-600 flex-1 min-w-[12rem]">{t('collectionAssignment.notPlanned')}</p>
          <Btn size="sm" onClick={() => setFormOpen(true)}>
            <CalendarClock className="w-3.5 h-3.5" />
            {t('collectionAssignment.plan')}
          </Btn>
        </div>
      )}
    </div>
  );
};

const AssignmentForm: React.FC<{ requestId: string; onDone: () => void; onInvalidate: () => Promise<unknown> }> = ({
  requestId,
  onDone,
  onInvalidate,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const agents = useQuery({
    queryKey: ['verifier', 'field-agents'],
    queryFn: () => api.get<FieldAgentOption[]>('/collection-assignments/agents'),
  });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');

  const [form, setForm] = useState({
    agentId: '',
    date: `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
    from: '08:00',
    to: '12:00',
    priority: 'NORMAL' as Priority,
    expectedQuantityGrams: '500',
    numberOfSamples: '1',
    specialInstructions: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.post('/collection-assignments', {
        requestId,
        agentId: form.agentId,
        scheduledDate: new Date(`${form.date}T${form.from}:00`).toISOString(),
        timeWindowStart: form.from,
        timeWindowEnd: form.to,
        priority: form.priority,
        expectedQuantityGrams: Number(form.expectedQuantityGrams),
        numberOfSamples: Number(form.numberOfSamples),
        specialInstructions: form.specialInstructions.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: onInvalidate,
  });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    setError('');
    if (form.from >= form.to) {
      setError(t('verifier:collectionAssignment.windowError'));
      return;
    }
    try {
      await create.mutateAsync();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('verifier:collectionAssignment.agent')} required className="sm:col-span-2">
          <SelectInput value={form.agentId} onChange={update('agentId')}>
            <option value="">{t('verifier:collectionAssignment.chooseAgent')}</option>
            {agents.data?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} — {t('verifier:collectionAssignment.activeCount', { count: agent._count.collectionAssignments })}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t('verifier:collectionAssignment.date')} required>
          <TextInput type="date" value={form.date} onChange={update('date')} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('verifier:collectionAssignment.from')} required>
            <TextInput type="time" value={form.from} onChange={update('from')} />
          </Field>
          <Field label={t('verifier:collectionAssignment.to')} required>
            <TextInput type="time" value={form.to} onChange={update('to')} />
          </Field>
        </div>
        <Field label={t('verifier:collectionAssignment.priority')}>
          <SelectInput value={form.priority} onChange={update('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`verifier:collectionAssignment.priorities.${p}`)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('verifier:collectionAssignment.quantity')}>
            <TextInput type="number" min={50} max={10000} value={form.expectedQuantityGrams} onChange={update('expectedQuantityGrams')} />
          </Field>
          <Field label={t('verifier:collectionAssignment.samples')}>
            <TextInput type="number" min={1} max={20} value={form.numberOfSamples} onChange={update('numberOfSamples')} />
          </Field>
        </div>
        <Field label={t('verifier:collectionAssignment.instructions')} className="sm:col-span-2">
          <TextArea value={form.specialInstructions} onChange={update('specialInstructions')} maxLength={1000} className="min-h-[60px]" />
        </Field>
        <Field label={t('verifier:collectionAssignment.notes')} className="sm:col-span-2">
          <TextArea value={form.notes} onChange={update('notes')} maxLength={1000} className="min-h-[60px]" />
        </Field>
      </div>
      {error && <InlineError message={error} />}
      <div className="flex justify-end gap-2">
        <Btn size="sm" variant="secondary" onClick={onDone}>
          {t('common:actions.cancel')}
        </Btn>
        <Btn size="sm" onClick={submit} isLoading={create.isPending} disabled={!form.agentId || !form.date}>
          {t('verifier:collectionAssignment.submit')}
        </Btn>
      </div>
    </div>
  );
};
