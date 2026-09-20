import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { Modal } from '../../../design-system';
import { Btn, EmptyBlock, InlineError, LoadingBlock, PageHeader } from '../../verifier/ui';
import { useCustodySamples } from '../hooks';
import { SealForm } from '../SealForm';
import { SampleStatusPill, SectionCard } from '../ui';
import type { CustodyListItem } from '../types';
import { formatDateTime } from '../utils';

/** Enregistrement des scellés sécurisés sur les échantillons prélevés. */
export const SealsPage: React.FC = () => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const [params] = useSearchParams();
  const { data = [], isLoading, isError } = useCustodySamples();
  const [selectedId, setSelectedId] = useState<string | null>(params.get('echantillon'));

  const toSeal = data.filter((s) => s.status === 'COLLECTED' && !s.seal);
  const sealed = data.filter((s) => s.seal).slice(0, 12);
  const selected = data.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader title={t('seals.title')} subtitle={t('seals.subtitle')} />

      {isLoading && <LoadingBlock label={t('common.loading')} />}
      {isError && <InlineError message={t('common.loadError')} />}

      {!isLoading && (
        <SectionCard title={t('seals.pending', { count: toSeal.length })} icon={<ShieldAlert className="w-5 h-5 text-[#D49B37]" />}>
          {toSeal.length === 0 ? (
            <EmptyBlock icon={<ShieldCheck className="w-8 h-8" />} title={t('seals.pendingEmpty')} />
          ) : (
            <ul className="divide-y divide-[#F1EDE3]">
              {toSeal.map((sample) => (
                <li key={sample.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
                  <SampleLine sample={sample} locale={locale} />
                  <Btn onClick={() => setSelectedId(sample.id)} className="min-h-[44px] shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                    {t('seals.register')}
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {sealed.length > 0 && (
        <SectionCard title={t('seals.registered')} icon={<ShieldCheck className="w-5 h-5 text-[#17693F]" />}>
          <ul className="divide-y divide-[#F1EDE3]">
            {sealed.map((sample) => (
              <li key={sample.id}>
                <Link to={`/agent/tracabilite/${sample.id}`} className="flex items-center gap-3 py-3 hover:bg-[#FAF6EE] -mx-2 px-2 rounded-lg">
                  <SampleLine sample={sample} locale={locale} />
                  <span className="font-mono text-sm text-[#0C261B] hidden sm:block">{sample.seal?.sealCode}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {selected && (
        <Modal
          isOpen
          onClose={() => setSelectedId(null)}
          title={t('seals.modalTitle', { code: selected.sampleCode ?? '' })}
          maxWidth="max-w-3xl"
        >
          <SealForm sampleId={selected.id} onDone={() => setSelectedId(null)} onCancel={() => setSelectedId(null)} />
        </Modal>
      )}
    </div>
  );
};

const SampleLine: React.FC<{ sample: CustodyListItem; locale: string }> = ({ sample, locale }) => (
  <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-sm font-bold text-[#0C261B]">{sample.sampleCode ?? '—'}</span>
      <SampleStatusPill status={sample.status} />
    </div>
    <p className="text-sm text-gray-600 truncate">
      {sample.request.producer.name} · {sample.honeyType ?? sample.request.honeyType}
    </p>
    <p className="text-xs text-gray-400">{formatDateTime(sample.collectionDate, locale)}</p>
  </div>
);
