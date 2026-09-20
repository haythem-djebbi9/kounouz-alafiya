import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarPlus, ChevronRight, Clock, Inbox, MapPin } from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { ApiError } from '../../../lib/api';
import { Modal } from '../../../design-system';
import { Btn, EmptyBlock, Field, InlineError, LoadingBlock, PageHeader, SearchBox, Tabs, TextInput } from '../../verifier/ui';
import { useAssignments, useAvailableCollections, useClaimCollection } from '../hooks';
import { AssignmentStatusPill, PriorityPill } from '../ui';
import type { AgentRequest, AssignmentScope } from '../types';
import { combineDateTime, formatDate, formatTime, toDateInput } from '../utils';

type TabKey = AssignmentScope | 'AVAILABLE';
const TABS: TabKey[] = ['TODAY', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'ALL', 'AVAILABLE'];

export const AssignmentsPage: React.FC = () => {
  const { t } = useTranslation('agent');
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as TabKey) ? params.get('tab') : 'ACTIVE') as TabKey;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title={t('assignments.title')} subtitle={t('assignments.subtitle')} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
          <Tabs<TabKey>
            variant="underline"
            tabs={TABS.map((key) => ({ key, label: t(`assignments.tabs.${key}`) }))}
            active={tab}
            onChange={setTab}
          />
        </div>
        {tab !== 'AVAILABLE' && (
          <SearchBox value={search} onChange={setSearch} placeholder={t('assignments.searchPlaceholder')} className="md:w-72" />
        )}
      </div>

      {tab === 'AVAILABLE' ? <AvailableList /> : <AssignmentList scope={tab} search={debounced} />}
    </div>
  );
};

const AssignmentList: React.FC<{ scope: AssignmentScope; search: string }> = ({ scope, search }) => {
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const { data = [], isLoading, isError } = useAssignments(scope, search);

  if (isLoading) return <LoadingBlock label={t('common.loading')} />;
  if (isError) return <InlineError message={t('common.loadError')} />;
  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#EAE1D2] rounded-xl">
        <EmptyBlock icon={<Inbox className="w-8 h-8" />} title={t(`assignments.empty.${scope}`)} description={t('assignments.emptyHint')} />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((a) => (
        <li key={a.id}>
          <Link
            to={`/agent/missions/${a.id}`}
            className="block bg-white border border-[#EAE1D2] rounded-xl p-4 hover:border-[#D49B37] transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-500">{a.assignmentCode}</p>
                <p className="text-base font-bold text-[#0C261B] truncate">
                  {a.request.producer.name} · {a.request.honeyType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {a.priority !== 'NORMAL' && <PriorityPill priority={a.priority} />}
                <AssignmentStatusPill status={a.status} overdue={a.isOverdue} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-[#17693F]" />
                {formatDate(a.scheduledDate, locale)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#17693F]" />
                {a.timeWindowStart && a.timeWindowEnd
                  ? `${a.timeWindowStart} – ${a.timeWindowEnd}`
                  : formatTime(a.scheduledDate, locale)}
              </span>
              <span className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#17693F] shrink-0" />
                <span className="truncate">{a.request.collectionLocation}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 ms-auto rtl:rotate-180" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** Pool partagé : demandes acceptées qu'aucun agent n'a encore planifiées. */
const AvailableList: React.FC = () => {
  const { t } = useTranslation('agent');
  const { data = [], isLoading, isError } = useAvailableCollections();
  const [selected, setSelected] = useState<AgentRequest | null>(null);

  if (isLoading) return <LoadingBlock label={t('common.loading')} />;
  if (isError) return <InlineError message={t('common.loadError')} />;

  return (
    <>
      <p className="text-sm text-gray-500 mb-3">{t('assignments.available.hint')}</p>
      {data.length === 0 ? (
        <div className="bg-white border border-[#EAE1D2] rounded-xl">
          <EmptyBlock icon={<Inbox className="w-8 h-8" />} title={t('assignments.available.empty')} />
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((request) => (
            <li key={request.id} className="bg-white border border-[#EAE1D2] rounded-xl p-4 flex flex-col gap-3">
              <div>
                <p className="text-xs font-bold text-gray-500">{request.requestCode ?? '—'}</p>
                <p className="text-base font-bold text-[#0C261B]">{request.honeyType}</p>
                <p className="text-sm text-gray-600">
                  {request.producer.name} · {request.producer.farmName}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-4 h-4 text-[#17693F]" />
                  {request.collectionLocation}
                </p>
              </div>
              <Btn onClick={() => setSelected(request)} className="self-start">
                <CalendarPlus className="w-4 h-4" />
                {t('assignments.available.plan')}
              </Btn>
            </li>
          ))}
        </ul>
      )}
      {selected && <ClaimModal request={selected} onClose={() => setSelected(null)} />}
    </>
  );
};

const ClaimModal: React.FC<{ request: AgentRequest; onClose: () => void }> = ({ request, onClose }) => {
  const { t } = useTranslation('agent');
  const navigate = useNavigate();
  const claim = useClaimCollection();
  const [date, setDate] = useState(toDateInput(new Date()));
  const [from, setFrom] = useState('08:00');
  const [to, setTo] = useState('12:00');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (from >= to) {
      setError(t('schedule.windowError'));
      return;
    }
    try {
      const assignment = await claim.mutateAsync({
        requestId: request.id,
        scheduledDate: combineDateTime(date, from),
        timeWindowStart: from,
        timeWindowEnd: to,
      });
      navigate(`/agent/missions/${assignment.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('assignments.available.modalTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {t('assignments.available.modalBody', { honey: request.honeyType, producer: request.producer.name })}
        </p>
        <Field label={t('schedule.date')} required>
          <TextInput type="date" value={date} min={toDateInput(new Date())} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('schedule.from')} required>
            <TextInput type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('schedule.to')} required>
            <TextInput type="time" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        {error && <InlineError message={error} />}
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Btn>
          <Btn onClick={submit} isLoading={claim.isPending} disabled={!date}>
            {t('assignments.available.confirm')}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
