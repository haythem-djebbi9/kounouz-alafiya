import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Lock, ShieldCheck } from 'lucide-react';
import { Btn, EmptyBlock, Field, InlineError, SelectInput, StatusPill, TextArea, TextInput } from './ui';
import type { Tone } from './ui';
import { useRegisterReferenceSample, useUpdateReferenceSampleStatus } from './hooks';
import { ApiError } from '../../lib/api';
import { dateLocale } from '../../i18n';
import type { PortalSampleDetail } from './types';
import type { ReferenceSampleStatus } from '../../lib/api-types';

const STATUS_TONE: Record<ReferenceSampleStatus, Tone> = {
  STORED: 'green',
  USED_FOR_RETEST: 'amber',
  DISPOSED: 'neutral',
};

// Transitions autorisées côté serveur (REF-04) : une portion détruite ne
// revient jamais en conservation.
const NEXT_STATUSES: Record<ReferenceSampleStatus, ReferenceSampleStatus[]> = {
  STORED: ['USED_FOR_RETEST', 'DISPOSED'],
  USED_FOR_RETEST: ['STORED', 'DISPOSED'],
  DISPOSED: [],
};

/**
 * Échantillon de référence conservé par Kounouz (REF-01 à REF-04).
 *
 * Pièce exigée avant toute décision VÉRIFIÉ : l'écran de décision la signale
 * comme manquante tant qu'elle n'est pas enregistrée ici. Donnée strictement
 * interne, jamais exposée au consommateur.
 */
export const ReferenceSamplePanel: React.FC<{ sample: PortalSampleDetail }> = ({ sample }) => {
  const { t, i18n } = useTranslation(['verifier', 'common']);
  const register = useRegisterReferenceSample();
  const updateStatus = useUpdateReferenceSampleStatus();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    storageLocation: '',
    storageConditions: '',
    retentionPeriod: '24 mois',
    condition: '',
  });
  const [nextStatus, setNextStatus] = useState<ReferenceSampleStatus | ''>('');
  const [reason, setReason] = useState('');

  const reference = sample.referenceSample;
  const canRegister = !reference && !!sample.seal && sample.status !== 'ISSUE';

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  if (reference) {
    const status = (reference.status ?? 'STORED') as ReferenceSampleStatus;
    const options = NEXT_STATUSES[status];
    return (
      <div className="space-y-3">
        {error && <InlineError message={error} />}
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#17693F]" />
          <span className="font-mono font-bold text-[#0C261B]">{reference.referenceCode}</span>
          <StatusPill tone={STATUS_TONE[status]} label={t(`verifier:reference.status.${status}`)} />
        </div>
        <dl className="text-xs space-y-1.5">
          <Line label={t('verifier:reference.storageLocation')} value={reference.storageLocation} />
          <Line label={t('verifier:reference.storageConditions')} value={reference.storageConditions} />
          <Line label={t('verifier:reference.retentionPeriod')} value={reference.retentionPeriod} />
          <Line label={t('verifier:reference.condition')} value={reference.condition} />
          <Line
            label={t('verifier:reference.storedAt')}
            value={new Date(reference.storedAt).toLocaleString(dateLocale(i18n.language), {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />
        </dl>
        <p className="flex items-start gap-1.5 text-[11px] text-gray-500">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-px" />
          {t('verifier:reference.internalNotice')}
        </p>

        {options.length > 0 && (
          <div className="rounded-lg border border-[#EAE1D2] bg-[#FAF6EE] p-3 space-y-2">
            <Field label={t('verifier:reference.changeStatus')}>
              <SelectInput value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ReferenceSampleStatus)}>
                <option value="">—</option>
                {options.map((s) => (
                  <option key={s} value={s}>
                    {t(`verifier:reference.status.${s}`)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('verifier:reference.reason')} required hint={t('verifier:reference.reasonHint')}>
              <TextArea value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <Btn
                size="sm"
                variant="secondary"
                isLoading={updateStatus.isPending}
                disabled={!nextStatus || reason.trim().length < 5}
                onClick={() =>
                  run(async () => {
                    await updateStatus.mutateAsync({ sampleId: sample.id, status: nextStatus as ReferenceSampleStatus, reason });
                    setNextStatus('');
                    setReason('');
                  })
                }
              >
                <Archive className="w-3.5 h-3.5" />
                {t('common:actions.confirm')}
              </Btn>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!canRegister) {
    return (
      <EmptyBlock
        icon={<Lock className="w-8 h-8" />}
        title={t('verifier:reference.notYet')}
        description={sample.status === 'ISSUE' ? t('verifier:reference.blockedIssue') : t('verifier:reference.needsSeal')}
      />
    );
  }

  const valid =
    form.storageLocation.trim().length >= 2 &&
    form.storageConditions.trim().length >= 2 &&
    form.retentionPeriod.trim().length >= 1;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void run(() => register.mutateAsync({ sampleId: sample.id, ...form }));
      }}
    >
      {error && <InlineError message={error} />}
      <p className="text-xs text-gray-600">{t('verifier:reference.explanation')}</p>
      <Field label={t('verifier:reference.storageLocation')} required>
        <TextInput
          value={form.storageLocation}
          placeholder={t('verifier:reference.storageLocationPlaceholder')}
          onChange={(e) => setForm((f) => ({ ...f, storageLocation: e.target.value }))}
        />
      </Field>
      <Field label={t('verifier:reference.storageConditions')} required>
        <TextInput
          value={form.storageConditions}
          placeholder={t('verifier:reference.storageConditionsPlaceholder')}
          onChange={(e) => setForm((f) => ({ ...f, storageConditions: e.target.value }))}
        />
      </Field>
      <Field label={t('verifier:reference.retentionPeriod')} required>
        <TextInput
          value={form.retentionPeriod}
          onChange={(e) => setForm((f) => ({ ...f, retentionPeriod: e.target.value }))}
        />
      </Field>
      <Field label={t('verifier:reference.condition')}>
        <TextArea
          value={form.condition}
          placeholder={t('verifier:reference.conditionPlaceholder')}
          onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
        />
      </Field>
      <div className="flex justify-end">
        <Btn type="submit" size="sm" isLoading={register.isPending} disabled={!valid}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('verifier:reference.register')}
        </Btn>
      </div>
    </form>
  );
};

const Line: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-[#F4F1EA] py-1 last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className="text-[#0C261B] font-semibold text-end">{value || '—'}</dd>
  </div>
);
