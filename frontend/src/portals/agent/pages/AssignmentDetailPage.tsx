import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Flag,
  Leaf,
  Mail,
  MapPin,
  Navigation,
  Phone,
  PlayCircle,
  Briefcase,
  User,
  Truck,
  CalendarClock,
} from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { Modal } from '../../../design-system';
import { Breadcrumb, Btn, Field, InlineError, LoadingBlock, TextArea, TextInput } from '../../verifier/ui';
import { useAssignment, useRescheduleAssignment, useStartAssignment, useUpdateEquipment } from '../hooks';
import { MapView } from '../MapView';
import { AssignmentStatusPill, Avatar, DefList, IconRow, PriorityPill, SectionCard } from '../ui';
import type { AssignmentDetail } from '../types';
import {
  combineDateTime,
  directionsLink,
  formatDate,
  formatDateTime,
  formatTime,
  googleMapsLink,
  PRIORITY_TONES,
  toDateInput,
} from '../utils';

export const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const navigate = useNavigate();
  const { data: assignment, isLoading, isError } = useAssignment(id);
  const start = useStartAssignment();
  const [profileOpen, setProfileOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return <LoadingBlock label={t('common.loading')} />;
  if (isError || !assignment) return <InlineError message={t('assignmentDetail.notFound')} />;

  const { request } = assignment;
  const { producer } = request;
  const nav = assignment.navigation;
  const isActive = assignment.status === 'PENDING' || assignment.status === 'IN_PROGRESS';
  const canReschedule = isActive && !assignment.sampleId;

  const handleStart = async () => {
    setError('');
    try {
      if (assignment.status === 'PENDING') await start.mutateAsync(assignment.id);
      navigate(`/agent/collecte/${assignment.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  const priorityColor = { neutral: 'text-gray-500', green: 'text-[#17693F]', amber: 'text-[#D49B37]', red: 'text-[#C7452F]', blue: '', violet: '' }[
    PRIORITY_TONES[assignment.priority]
  ];

  return (
    <div className="max-w-6xl mx-auto pb-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <Breadcrumb
            items={[
              { label: t('brand.role') },
              { label: t('nav.assignments'), to: '/agent/missions' },
              { label: assignment.assignmentCode },
            ]}
          />
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0C261B]">{t('assignmentDetail.title')}</h1>
          <p className="text-sm text-gray-500">{t('assignmentDetail.subtitle')}</p>
        </div>
        {nav.total > 0 && nav.index !== null && (
          <div className="flex items-center gap-2 self-start">
            <Btn variant="secondary" disabled={!nav.previousId} onClick={() => nav.previousId && navigate(`/agent/missions/${nav.previousId}`)}>
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              {t('common.previous')}
            </Btn>
            <span className="text-sm font-semibold text-gray-600 tabular-nums px-1">
              {nav.index} / {nav.total}
            </span>
            <Btn variant="secondary" disabled={!nav.nextId} onClick={() => nav.nextId && navigate(`/agent/missions/${nav.nextId}`)}>
              {t('common.next')}
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Btn>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-5">
        <div className="space-y-5 min-w-0">
          {/* Synthèse */}
          <section className="bg-white border border-[#EAE1D2] rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[#F2F8F3] border-b border-[#E1EEE4]">
              <h2 className="text-lg font-extrabold text-[#0C261B]">
                {t('assignmentDetail.assignment', { code: assignment.assignmentCode })}
              </h2>
              <AssignmentStatusPill status={assignment.status} overdue={assignment.isOverdue} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
              <IconRow icon={<CalendarDays className="w-5 h-5" />} label={t('assignmentDetail.scheduledDate')}>
                <span className="font-bold">{formatDate(assignment.scheduledDate, locale)}</span>
              </IconRow>
              <IconRow icon={<Clock className="w-5 h-5 text-[#3B7DD8]" />} label={t('assignmentDetail.preferredTime')}>
                <span className="font-bold tabular-nums">
                  {assignment.timeWindowStart && assignment.timeWindowEnd
                    ? `${assignment.timeWindowStart} – ${assignment.timeWindowEnd}`
                    : formatTime(assignment.scheduledDate, locale)}
                </span>
              </IconRow>
              <IconRow icon={<Flag className={`w-5 h-5 ${priorityColor}`} />} label={t('assignmentDetail.priority')}>
                <span className="font-bold">{t(`priority.${assignment.priority}`)}</span>
              </IconRow>
            </div>
          </section>

          {/* Producteur */}
          <SectionCard
            title={t('assignmentDetail.producerInfo')}
            icon={<User className="w-5 h-5" />}
            actions={
              <button onClick={() => setProfileOpen(true)} className="text-sm font-bold text-[#1D4E89] hover:underline inline-flex items-center gap-1">
                {t('assignmentDetail.viewProfile')}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            }
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <ProducerPhoto producer={producer} />
              <div className="min-w-0 space-y-2.5">
                <p className="text-lg font-extrabold text-[#0C261B]">{producer.name}</p>
                <IconRow icon={<MapPin className="w-4 h-4" />}>{request.collectionLocation}</IconRow>
                {producer.phone && (
                  <IconRow icon={<Phone className="w-4 h-4" />}>
                    <a href={`tel:${producer.phone.replace(/\s+/g, '')}`} className="hover:underline" dir="ltr">
                      {producer.phone}
                    </a>
                  </IconRow>
                )}
                <IconRow icon={<Mail className="w-4 h-4" />}>
                  <a href={`mailto:${producer.user.email}`} className="hover:underline break-all">
                    {producer.user.email}
                  </a>
                </IconRow>
                {(request.hivesCount ?? producer.hivesCount) !== null && (
                  <IconRow icon={<Box className="w-4 h-4" />}>
                    {t('assignmentDetail.hives', { count: request.hivesCount ?? producer.hivesCount ?? 0 })}
                  </IconRow>
                )}
                {request.beekeepingMethod && <IconRow icon={<Leaf className="w-4 h-4" />}>{request.beekeepingMethod}</IconRow>}
              </div>
            </div>
          </SectionCard>

          {/* Échantillon attendu */}
          <SectionCard title={t('assignmentDetail.sampleDetails')} icon={<FileText className="w-5 h-5" />}>
            <DefList
              rows={[
                { label: t('assignmentDetail.honeyType'), value: request.honeyType },
                {
                  label: t('assignmentDetail.expectedQuantity'),
                  value: t('assignmentDetail.perSample', { grams: assignment.expectedQuantityGrams }),
                },
                { label: t('assignmentDetail.numberOfSamples'), value: assignment.numberOfSamples },
                {
                  label: t('assignmentDetail.collectionMethod'),
                  value: assignment.harvestSource ? t(`harvestSource.${assignment.harvestSource}`) : '—',
                },
                { label: t('assignmentDetail.specialInstructions'), value: assignment.specialInstructions ?? '—' },
              ]}
            />
          </SectionCard>
        </div>

        <div className="space-y-5 min-w-0">
          {/* Localisation */}
          <SectionCard
            title={t('assignmentDetail.location')}
            icon={<MapPin className="w-5 h-5" />}
            actions={
              <a
                href={googleMapsLink(assignment.coordinates, request.collectionLocation)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-[#1D4E89] hover:underline inline-flex items-center gap-1"
              >
                {t('common.openInMaps')}
                <ArrowUpRight className="w-4 h-4" />
              </a>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_150px] gap-3">
              <MapView
                className="h-44"
                markers={assignment.coordinates ? [{ position: assignment.coordinates, kind: 'pin', title: request.collectionLocation }] : []}
                singleZoom={11}
                emptyLabel={t('assignmentDetail.noCoordinates')}
              />
              <div className="flex sm:flex-col gap-3">
                <div className="flex-1 rounded-lg bg-[#F6F7F4] p-3">
                  <p className="text-xs text-gray-500">{t('common.coordinates')}</p>
                  {assignment.coordinates ? (
                    <p className="text-sm font-bold text-[#0C261B] tabular-nums" dir="ltr">
                      {assignment.coordinates.latitude.toFixed(4)} N
                      <br />
                      {assignment.coordinates.longitude.toFixed(4)} E
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">—</p>
                  )}
                </div>
                <a
                  href={directionsLink(assignment.coordinates, request.collectionLocation)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-[#0C261B] text-[#0C261B] text-sm font-bold min-h-[44px] px-3 hover:bg-[#FAF6EE]"
                >
                  <Navigation className="w-4 h-4" />
                  {t('common.getDirections')}
                </a>
              </div>
            </div>
          </SectionCard>

          {/* Notes */}
          <SectionCard title={t('assignmentDetail.notes')} icon={<FileText className="w-5 h-5" />}>
            <p className="text-sm text-[#0C261B] whitespace-pre-line">{assignment.notes || t('assignmentDetail.noNotes')}</p>
            {assignment.rescheduleCount > 0 && (
              <p className="mt-3 text-xs rounded-lg bg-[#FDF6E7] text-[#96661A] px-3 py-2">
                {t('assignmentDetail.rescheduled', { count: assignment.rescheduleCount, reason: assignment.rescheduleReason ?? '' })}
              </p>
            )}
            {assignment.createdBy && (
              <p className="mt-2 text-xs text-gray-400">{t('assignmentDetail.assignedBy', { name: assignment.createdBy.name })}</p>
            )}
          </SectionCard>

          <EquipmentChecklist assignment={assignment} disabled={!isActive} />

          {assignment.status === 'COMPLETED' && assignment.completedAt && (
            <div className="rounded-xl border border-[#BFE0CB] bg-[#E8F5EC] p-4 text-sm text-[#17693F] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {t('assignmentDetail.completedOn', { date: formatDateTime(assignment.completedAt, locale) })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <InlineError message={error} />
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          to="/agent/missions"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0C261B]/40 text-[#0C261B] text-sm font-bold px-5 min-h-[46px] hover:bg-white"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          {t('assignmentDetail.backToAssignments')}
        </Link>
        <div className="flex flex-col sm:flex-row gap-3">
          {canReschedule && (
            <Btn variant="secondary" className="min-h-[46px] px-5" onClick={() => setRescheduleOpen(true)}>
              <CalendarClock className="w-4 h-4" />
              {t('assignmentDetail.reschedule')}
            </Btn>
          )}
          {isActive && (
            <Btn className="min-h-[46px] px-6" onClick={handleStart} isLoading={start.isPending}>
              <PlayCircle className="w-4 h-4" />
              {assignment.status === 'IN_PROGRESS' ? t('assignmentDetail.continueCollection') : t('assignmentDetail.startCollection')}
            </Btn>
          )}
          {assignment.sample && (
            <Link
              to={`/agent/tracabilite/${assignment.sample.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0C261B] text-white text-sm font-bold px-5 min-h-[46px]"
            >
              <Truck className="w-4 h-4" />
              {t('assignmentDetail.viewCustody')}
            </Link>
          )}
        </div>
      </div>

      {profileOpen && <ProducerProfileModal assignment={assignment} onClose={() => setProfileOpen(false)} />}
      {rescheduleOpen && <RescheduleModal assignment={assignment} onClose={() => setRescheduleOpen(false)} />}
    </div>
  );
};

const ProducerPhoto: React.FC<{ producer: AssignmentDetail['request']['producer'] }> = ({ producer }) => {
  const photo = producer.avatarUrl ?? producer.farmPhotos[0];
  if (!photo) return <Avatar name={producer.name} className="w-28 h-28 sm:w-36 sm:h-36 text-2xl rounded-xl" />;
  return (
    <img
      src={resolveFileUrl(photo)}
      alt={producer.name}
      className="w-full sm:w-40 h-44 sm:h-40 object-cover rounded-xl border border-[#EAE1D2] shrink-0"
    />
  );
};

const EquipmentChecklist: React.FC<{ assignment: AssignmentDetail; disabled: boolean }> = ({ assignment, disabled }) => {
  const { t } = useTranslation('agent');
  const update = useUpdateEquipment(assignment.id);
  const checked = new Set<string>(update.variables ?? assignment.checkedEquipment);
  const allChecked = assignment.requiredEquipment.every((item) => checked.has(item));

  const toggle = (item: string) => {
    if (disabled) return;
    const next = new Set<string>(checked);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    update.mutate(Array.from(next));
  };

  return (
    <SectionCard
      title={t('assignmentDetail.equipment')}
      icon={<Briefcase className="w-5 h-5" />}
      actions={
        !disabled && (
          <button
            onClick={() => update.mutate(allChecked ? [] : assignment.requiredEquipment)}
            className="text-sm font-bold text-[#1D4E89] hover:underline"
          >
            {allChecked ? t('assignmentDetail.uncheckAll') : t('assignmentDetail.checkList')}
          </button>
        )
      }
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {assignment.requiredEquipment.map((item) => {
          const isChecked = checked.has(item);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={disabled}
                aria-pressed={isChecked}
                className="w-full flex items-center gap-2.5 py-2 text-sm text-start text-[#0C261B] disabled:cursor-default"
              >
                {isChecked ? (
                  <CheckCircle2 className="w-5 h-5 text-[#17693F] shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                )}
                {t(`equipment.${item}`, { defaultValue: item })}
              </button>
            </li>
          );
        })}
      </ul>
      {!allChecked && !disabled && <p className="mt-2 text-xs text-gray-500">{t('assignmentDetail.equipmentHint')}</p>}
    </SectionCard>
  );
};

const ProducerProfileModal: React.FC<{ assignment: AssignmentDetail; onClose: () => void }> = ({ assignment, onClose }) => {
  const { t } = useTranslation('agent');
  const { producer } = assignment.request;
  return (
    <Modal isOpen onClose={onClose} title={t('producerProfile.title')} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={producer.name} url={producer.avatarUrl} className="w-14 h-14 text-base" />
          <div>
            <p className="text-lg font-extrabold text-[#0C261B]">{producer.name}</p>
            <p className="text-sm text-gray-500">{producer.farmName}</p>
            {producer.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#17693F]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('producerProfile.verified')}
              </span>
            )}
          </div>
        </div>
        {producer.description && <p className="text-sm text-gray-600">{producer.description}</p>}
        <DefList
          rows={[
            { label: t('producerProfile.phone'), value: producer.phone ?? '—' },
            { label: t('producerProfile.email'), value: producer.user.email },
            {
              label: t('producerProfile.address'),
              value: [producer.farmAddress, producer.farmDelegation, producer.farmGovernorate].filter(Boolean).join(', ') || producer.location,
            },
            { label: t('producerProfile.hives'), value: producer.hivesCount ?? '—' },
            { label: t('producerProfile.flora'), value: producer.mainFlora.length ? producer.mainFlora.join(', ') : '—' },
            { label: t('producerProfile.practices'), value: assignment.request.beekeepingMethod ?? '—' },
            { label: t('producerProfile.hiveType'), value: assignment.request.hiveType ?? '—' },
          ]}
        />
        {producer.farmPhotos.length > 0 && (
          <div>
            <p className="text-sm font-bold text-[#0C261B] mb-2">{t('producerProfile.farmPhotos')}</p>
            <div className="grid grid-cols-3 gap-2">
              {producer.farmPhotos.map((url) => (
                <img key={url} src={resolveFileUrl(url)} alt="" className="aspect-square w-full object-cover rounded-lg border border-[#EAE1D2]" />
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {producer.phone && (
            <a
              href={`tel:${producer.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0C261B] text-white text-sm font-bold px-4 min-h-[42px]"
            >
              <Phone className="w-4 h-4" />
              {t('producerProfile.call')}
            </a>
          )}
          <a
            href={`mailto:${producer.user.email}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#EAE1D2] text-[#0C261B] text-sm font-bold px-4 min-h-[42px]"
          >
            <Mail className="w-4 h-4" />
            {t('producerProfile.sendEmail')}
          </a>
        </div>
      </div>
    </Modal>
  );
};

const RescheduleModal: React.FC<{ assignment: AssignmentDetail; onClose: () => void }> = ({ assignment, onClose }) => {
  const { t } = useTranslation('agent');
  const reschedule = useRescheduleAssignment(assignment.id);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(toDateInput(tomorrow));
  const [from, setFrom] = useState(assignment.timeWindowStart ?? '08:00');
  const [to, setTo] = useState(assignment.timeWindowEnd ?? '12:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (from >= to) {
      setError(t('schedule.windowError'));
      return;
    }
    try {
      await reschedule.mutateAsync({ scheduledDate: combineDateTime(date, from), timeWindowStart: from, timeWindowEnd: to, reason: reason.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('schedule.rescheduleTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t('schedule.rescheduleBody')}</p>
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
        <Field label={t('schedule.reason')} required>
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('schedule.reasonPlaceholder')} maxLength={500} />
        </Field>
        {error && <InlineError message={error} />}
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Btn>
          <Btn onClick={submit} isLoading={reschedule.isPending} disabled={!date || reason.trim().length < 3}>
            {t('schedule.confirm')}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
