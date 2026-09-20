import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, Star } from 'lucide-react';
import { useCreateFarm, useMyFarms, useUpdateFarm } from '../hooks';
import { GOVERNORATES, governorateLabel } from '../constants';
import { Btn, ErrorBlock, Field, LoadingBlock, NAVY, Notice, Panel, SelectInput, TextInput, ToneBadge } from '../ui';
import { ApiError } from '../../../lib/api';

/**
 * Ruchers du producteur (ERD : un producteur exploite un ou plusieurs
 * ruchers). Chaque demande de vérification est rattachée à l'un d'eux ; un
 * rucher déjà cité par une demande n'est jamais supprimé, seulement désactivé.
 */
export const FarmsTab: React.FC = () => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const { data: farms, isLoading, isError } = useMyFarms();
  const create = useCreateFarm();
  const update = useUpdateFarm();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ name: '', governorate: '', delegation: '', hivesCount: '', beekeepingMethod: '' });

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setNotice(null);
    try {
      await fn();
      setNotice({ tone: 'success', text: success });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : t('common:status.error') });
    }
  };

  if (isLoading) return <LoadingBlock />;
  if (isError || !farms) return <ErrorBlock />;

  return (
    <div className="space-y-4">
      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <Panel
        title={t('producer:farms.title')}
        action={
          !adding && (
            <Btn size="sm" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" />
              {t('producer:farms.add')}
            </Btn>
          )
        }
      >
        <p className="text-sm text-gray-600 mb-4">{t('producer:farms.intro')}</p>

        <ul className="grid md:grid-cols-2 gap-3">
          {farms.map((farm) => (
            <li
              key={farm.id}
              className={`rounded-xl border p-4 ${farm.isActive ? 'border-[#E1E5DF] bg-white' : 'border-dashed border-gray-300 bg-gray-50'}`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-[#D49B37] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${NAVY}`}>{farm.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{farm.farmCode}</p>
                </div>
                {farm.isPrimary && (
                  <ToneBadge tone="gold" icon={<Star className="w-3.5 h-3.5" />}>
                    {t('producer:farms.primary')}
                  </ToneBadge>
                )}
                {!farm.isActive && <ToneBadge tone="gray">{t('producer:farms.inactive')}</ToneBadge>}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-gray-500">{t('producer:farms.location')}</dt>
                  <dd className="font-semibold text-[#14215B]">
                    {[farm.delegation, farm.governorate ? governorateLabel(farm.governorate, i18n.language) : null]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('producer:farms.hives')}</dt>
                  <dd className="font-semibold text-[#14215B]">{farm.hivesCount ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('producer:farms.requests')}</dt>
                  <dd className="font-semibold text-[#14215B]">{farm._count?.verificationRequests ?? 0}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {!farm.isPrimary && farm.isActive && (
                  <Btn
                    size="sm"
                    variant="outline"
                    loading={update.isPending && update.variables?.id === farm.id}
                    onClick={() => run(() => update.mutateAsync({ id: farm.id, isPrimary: true }), t('producer:farms.primarySet'))}
                  >
                    {t('producer:farms.makePrimary')}
                  </Btn>
                )}
                {!farm.isPrimary && (
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(
                        () => update.mutateAsync({ id: farm.id, isActive: !farm.isActive }),
                        farm.isActive ? t('producer:farms.deactivated') : t('producer:farms.reactivated'),
                      )
                    }
                  >
                    {farm.isActive ? t('producer:farms.deactivate') : t('producer:farms.reactivate')}
                  </Btn>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {adding && (
        <Panel title={t('producer:farms.newTitle')}>
          <form
            className="grid sm:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await create.mutateAsync({
                  name: form.name.trim(),
                  governorate: form.governorate || undefined,
                  delegation: form.delegation.trim() || undefined,
                  hivesCount: form.hivesCount ? Number(form.hivesCount) : undefined,
                  beekeepingMethod: form.beekeepingMethod.trim() || undefined,
                });
                setAdding(false);
                setForm({ name: '', governorate: '', delegation: '', hivesCount: '', beekeepingMethod: '' });
              }, t('producer:farms.created'));
            }}
          >
            <Field label={t('producer:farms.name')} required className="sm:col-span-2">
              <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} />
            </Field>
            <Field label={t('producer:farms.governorate')}>
              <SelectInput
                value={form.governorate}
                onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value, delegation: '' }))}
              >
                <option value="">—</option>
                {GOVERNORATES.map((g) => (
                  <option key={g.name} value={g.name}>
                    {governorateLabel(g.name, i18n.language)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('producer:farms.delegation')}>
              <SelectInput
                value={form.delegation}
                disabled={!form.governorate}
                onChange={(e) => setForm((f) => ({ ...f, delegation: e.target.value }))}
              >
                <option value="">—</option>
                {(GOVERNORATES.find((g) => g.name === form.governorate)?.delegations ?? []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('producer:farms.hives')}>
              <TextInput
                type="number"
                min="0"
                value={form.hivesCount}
                onChange={(e) => setForm((f) => ({ ...f, hivesCount: e.target.value }))}
              />
            </Field>
            <Field label={t('producer:farms.method')}>
              <TextInput value={form.beekeepingMethod} onChange={(e) => setForm((f) => ({ ...f, beekeepingMethod: e.target.value }))} />
            </Field>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Btn type="button" variant="ghost" onClick={() => setAdding(false)}>
                {t('common:actions.cancel')}
              </Btn>
              <Btn type="submit" loading={create.isPending} disabled={form.name.trim().length < 2}>
                {t('common:actions.save')}
              </Btn>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
};
