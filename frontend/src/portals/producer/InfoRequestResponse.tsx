import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquareReply } from 'lucide-react';
import { useMyFarms, useRespondInfoRequest } from './hooks';
import { Btn, Field, InfoCard, SelectInput, TextArea, TextInput } from './ui';
import { ApiError } from '../../lib/api';
import type { ProducerRequest } from './types';

/**
 * Réponse du producteur à une demande d'informations de Kounouz.
 *
 * Machine à états : MORE_INFO -> (le producteur répond) -> revue. Seuls des
 * champs appartenant au producteur sont modifiables (VR-06) ; la réponse est
 * versée au dossier et la demande repart en revue.
 */
export const InfoRequestResponse: React.FC<{ request: ProducerRequest }> = ({ request }) => {
  const { t } = useTranslation(['producer', 'common']);
  const respond = useRespondInfoRequest();
  const { data: farms = [] } = useMyFarms();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    message: '',
    quantity: '',
    hivesCount: '',
    description: request.description ?? '',
    farmId: request.farmId ?? '',
  });

  const submit = async () => {
    setError('');
    try {
      await respond.mutateAsync({
        id: request.id,
        input: {
          message: form.message.trim(),
          description: form.description.trim() || undefined,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          hivesCount: form.hivesCount ? Number(form.hivesCount) : undefined,
          farmId: form.farmId && form.farmId !== request.farmId ? form.farmId : undefined,
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common:status.error'));
    }
  };

  return (
    <InfoCard tone="gold" icon={<MessageSquareReply className="w-5 h-5 text-[#8A5A12]" />} title={t('producer:infoRequest.title')}>
      {request.infoRequested && (
        <p className="mb-3">
          <span className="font-semibold">{t('producer:infoRequest.question')}</span> « {request.infoRequested} »
        </p>
      )}
      <div className="space-y-3">
        <Field label={t('producer:infoRequest.answer')} required>
          <TextArea
            value={form.message}
            maxLength={2000}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </Field>
        <p className="text-xs text-gray-600">{t('producer:infoRequest.optionalFields')}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t('producer:infoRequest.quantity')}>
            <TextInput
              type="number"
              min="0"
              step="0.1"
              placeholder={String(request.quantity)}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </Field>
          <Field label={t('producer:infoRequest.hives')}>
            <TextInput
              type="number"
              min="0"
              placeholder={request.hivesCount ? String(request.hivesCount) : ''}
              value={form.hivesCount}
              onChange={(e) => setForm((f) => ({ ...f, hivesCount: e.target.value }))}
            />
          </Field>
          {farms.length > 1 && (
            <Field label={t('producer:infoRequest.farm')} className="sm:col-span-2">
              <SelectInput value={form.farmId} onChange={(e) => setForm((f) => ({ ...f, farmId: e.target.value }))}>
                {farms
                  .filter((farm) => farm.isActive)
                  .map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} — {farm.farmCode}
                    </option>
                  ))}
              </SelectInput>
            </Field>
          )}
          <Field label={t('producer:infoRequest.description')} className="sm:col-span-2">
            <TextArea
              value={form.description}
              maxLength={500}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
        </div>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        <div className="flex justify-end">
          <Btn loading={respond.isPending} disabled={form.message.trim().length < 3} onClick={submit}>
            {t('producer:infoRequest.send')}
          </Btn>
        </div>
      </div>
    </InfoCard>
  );
};
