import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  ShieldCheck,
  Truck,
  User,
  PackageCheck,
  ClipboardList,
} from 'lucide-react';
import { dateLocale } from '../../../i18n';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { Modal } from '../../../design-system';
import { Breadcrumb, Btn, Field, InlineError, LoadingBlock, SelectInput, TextArea, TextInput } from '../../verifier/ui';
import { useAddCustodyEvent, useCustody, useGeolocation } from '../hooks';
import { MapView, type MapMarker } from '../MapView';
import { DefList, PhotoUploader, SampleStatusPill, SectionCard } from '../ui';
import type { AgentEventType, CustodyDetail, CustodyEvent } from '../types';
import { combineDateTime, formatCoords, formatDateTime, googleMapsLink, quantityInGrams, routeLink, toDateInput, toTimeInput } from '../utils';

const STATUS_ICONS = {
  COLLECTED: FlaskConical,
  SEALED: ShieldCheck,
  IN_TRANSIT: Truck,
  RECEIVED: Building2,
  RECEIVED_AT_LAB: FlaskConical,
  ANALYZED: PackageCheck,
  ISSUE: AlertTriangle,
} as const;

export const CustodyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('agent');
  const locale = dateLocale(i18n.language);
  const navigate = useNavigate();
  const { data: sample, isLoading, isError } = useCustody(id);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Par défaut, le détail montre la dernière étape réalisée.
  const lastDone = useMemo(() => {
    if (!sample) return null;
    const done = sample.steps.filter((s) => s.event);
    return done[done.length - 1]?.event ?? null;
  }, [sample]);

  useEffect(() => {
    if (lastDone && !selectedEventId) setSelectedEventId(lastDone.id);
  }, [lastDone, selectedEventId]);

  if (isLoading) return <LoadingBlock label={t('common.loading')} />;
  if (isError || !sample) return <InlineError message={t('custody.notFound')} />;

  const selectedEvent = sample.events.find((e) => e.id === selectedEventId) ?? lastDone;
  const currentStepIndex = sample.steps.reduce((acc, step, index) => (step.event ? index : acc), -1);
  const StatusIcon = STATUS_ICONS[sample.status];
  const extraEvents = sample.events.filter((e) => e.type === 'LOCATION_UPDATE' || e.type === 'ISSUE');
  const canUpdate = sample.allowedEvents.length > 0;

  const producerPoint =
    sample.latitude !== null && sample.longitude !== null ? { latitude: sample.latitude, longitude: sample.longitude } : null;

  return (
    <div className="max-w-[1400px] mx-auto pb-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <Breadcrumb
            items={[
              { label: t('brand.role') },
              { label: t('nav.custody'), to: '/agent/tracabilite' },
              ...(sample.assignment ? [{ label: sample.assignment.assignmentCode, to: `/agent/missions/${sample.assignment.id}` }] : []),
              { label: t('custody.title') },
            ]}
          />
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0C261B]">{t('custody.title')}</h1>
          <p className="text-sm text-gray-500">{t('custody.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-[#BFE0CB] bg-[#F2F8F3] px-4 py-3 lg:min-w-[440px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">{t('custody.sampleId')}</p>
              <p className="text-lg font-extrabold text-[#0C261B] font-mono">{sample.sampleCode ?? '—'}</p>
            </div>
            <SampleStatusPill status={sample.status} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
            <div className="min-w-0">
              <p className="text-gray-500">{t('custody.producer')}</p>
              <p className="font-bold text-[#0C261B] truncate">{sample.request.producer.name}</p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500">{t('custody.honeyType')}</p>
              <p className="font-bold text-[#0C261B] truncate">{sample.honeyType ?? sample.request.honeyType}</p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500">{t('custody.sealNumber')}</p>
              <p className="font-bold text-[#0C261B] font-mono truncate">{sample.seal?.sealCode ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ligne 1 : fiche, statut, position */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <SectionCard className="lg:col-span-5" title={t('custody.sampleInfo')} icon={<ClipboardList className="w-5 h-5" />}>
          <div className="flex flex-col sm:flex-row gap-4">
            {sample.photos[0] ? (
              <img
                src={resolveFileUrl(sample.photos[0])}
                alt={t('photos.alt')}
                className="w-full sm:w-36 h-40 sm:h-36 object-cover rounded-lg border border-[#EAE1D2] shrink-0"
              />
            ) : (
              <div className="w-full sm:w-36 h-36 rounded-lg bg-[#F6F7F4] grid place-items-center text-gray-300 shrink-0">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DefList
                rows={[
                  { label: t('custody.sampleId'), value: sample.sampleCode },
                  { label: t('custody.producer'), value: sample.request.producer.name },
                  { label: t('custody.producerLocation'), value: sample.request.delegation ?? sample.request.collectionLocation },
                  { label: t('custody.honeyType'), value: sample.honeyType ?? sample.request.honeyType },
                  { label: t('custody.quantity'), value: `${quantityInGrams(sample.quantity)} g` },
                  { label: t('custody.sealNumber'), value: sample.seal?.sealCode ?? '—' },
                  { label: t('custody.collectionDate'), value: formatDateTime(sample.collectionDate, locale) },
                ]}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="lg:col-span-3" title={t('custody.currentStatus')} icon={<FileText className="w-5 h-5" />}>
          <div className="flex items-center gap-3">
            <span
              className={`w-14 h-14 rounded-xl grid place-items-center shrink-0 ${
                sample.status === 'ISSUE' ? 'bg-[#FDF2F2] text-[#B42323]' : 'bg-[#E8F5EC] text-[#17693F]'
              }`}
            >
              <StatusIcon className="w-7 h-7" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-[#0C261B]">{t(`custody.statusHeadline.${sample.status}`)}</p>
              <p className="text-xs text-gray-500">{t(`custody.statusDescription.${sample.status}`)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F1EDE3] text-xs">
            <div className="flex items-start gap-2 min-w-0">
              <Clock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-gray-500">{t('custody.since')}</p>
                <p className="font-bold text-[#0C261B]">{lastDone ? formatDateTime(lastDone.occurredAt, locale) : '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#17693F] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-gray-500">{t('custody.currentLocation')}</p>
                <p className="font-bold text-[#0C261B] break-words">{sample.currentLocation?.location ?? '—'}</p>
                {sample.currentLocation && (
                  <p className="text-gray-500 tabular-nums" dir="ltr">
                    {formatCoords(sample.currentLocation)}
                  </p>
                )}
              </div>
            </div>
          </div>
          {sample.currentLocation && (
            <a
              href={googleMapsLink(sample.currentLocation)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 ms-auto flex w-fit items-center gap-2 rounded-lg border border-[#EAE1D2] text-[#0C261B] text-sm font-bold px-3 min-h-[40px] hover:border-[#D49B37]"
            >
              <MapIcon className="w-4 h-4" />
              {t('custody.viewOnMap')}
            </a>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-4"
          title={t('custody.liveLocation')}
          icon={<MapPin className="w-5 h-5" />}
          actions={
            sample.route.length > 0 && (
              <a
                href={routeLink([...sample.route, sample.destination]) ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-[#1D4E89] hover:underline"
              >
                {t('common.viewFullMap')}
              </a>
            )
          }
        >
          <LiveMap sample={sample} producerPoint={producerPoint} />
        </SectionCard>
      </div>

      {/* Ligne 2 : chronologie et détail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        <SectionCard
          className="lg:col-span-8"
          title={t('custody.timeline')}
          icon={<ClipboardList className="w-5 h-5" />}
          actions={
            canUpdate && (
              <Btn size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4" />
                {t('custody.addEvent')}
              </Btn>
            )
          }
          bodyClassName="p-2 sm:p-4"
        >
          <ol className="relative">
            {sample.steps.map((step, index) => {
              const state = step.event ? (index === currentStepIndex ? 'current' : 'done') : 'pending';
              return (
                <TimelineRow
                  key={step.type}
                  type={step.type}
                  event={step.event}
                  state={state}
                  isLast={index === sample.steps.length - 1}
                  selected={!!step.event && step.event.id === selectedEvent?.id}
                  onSelect={() => step.event && setSelectedEventId(step.event.id)}
                  locale={locale}
                />
              );
            })}
          </ol>

          {extraEvents.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#F1EDE3]">
              <p className="px-2 text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">{t('custody.otherEvents')}</p>
              <ul>
                {extraEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      onClick={() => setSelectedEventId(event.id)}
                      className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 text-start ${
                        event.id === selectedEvent?.id ? 'bg-[#F2F8F3]' : 'hover:bg-[#FAF6EE]'
                      }`}
                    >
                      {event.type === 'ISSUE' ? (
                        <AlertTriangle className="w-4 h-4 text-[#B42323] shrink-0" />
                      ) : (
                        <LocateFixed className="w-4 h-4 text-[#3B7DD8] shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-[#0C261B] flex-1 min-w-0 truncate">
                        {t(`events.${event.type}.title`)}
                        {event.location ? ` — ${event.location}` : ''}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(event.occurredAt, locale)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard className="lg:col-span-4" title={t('custody.eventDetails')} icon={<Truck className="w-5 h-5" />}>
          {selectedEvent ? <EventDetails event={selectedEvent} locale={locale} /> : <p className="text-sm text-gray-400">{t('custody.selectEvent')}</p>}
        </SectionCard>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0C261B]/40 bg-white text-[#0C261B] text-sm font-bold px-6 min-h-[46px]"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        {canUpdate ? (
          <Btn className="min-h-[46px] px-6" onClick={() => setAddOpen(true)}>
            {t('custody.updateDeliveryStatus')}
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Btn>
        ) : sample.status === 'COLLECTED' && !sample.seal ? (
          <Link
            to={`/agent/scelles?echantillon=${sample.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0C261B] text-white text-sm font-bold px-6 min-h-[46px]"
          >
            <ShieldCheck className="w-4 h-4" />
            {t('seals.register')}
          </Link>
        ) : null}
      </div>

      {addOpen && <AddEventModal sample={sample} onClose={() => setAddOpen(false)} onAdded={(eventId) => setSelectedEventId(eventId)} />}
    </div>
  );
};

const LiveMap: React.FC<{ sample: CustodyDetail; producerPoint: { latitude: number; longitude: number } | null }> = ({
  sample,
  producerPoint,
}) => {
  const { t } = useTranslation('agent');
  const delivered = ['RECEIVED', 'RECEIVED_AT_LAB', 'ANALYZED'].includes(sample.status);
  const markers: MapMarker[] = [];
  if (producerPoint) markers.push({ position: producerPoint, kind: 'pin', title: sample.request.producer.name });
  markers.push({ position: sample.destination, kind: 'destination', title: sample.destination.name });
  if (sample.currentLocation && !delivered) {
    markers.push({ position: sample.currentLocation, kind: 'truck', title: sample.currentLocation.location ?? t('custody.currentLocation') });
  }

  const travelled = sample.route.map(({ latitude, longitude }) => ({ latitude, longitude }));
  const last = travelled[travelled.length - 1];
  return (
    <MapView
      className="h-56 lg:h-[230px]"
      markers={markers}
      paths={[
        ...(travelled.length > 1 ? [{ points: travelled, color: '#17693F', followRoads: true }] : []),
        ...(last && !delivered ? [{ points: [last, sample.destination], color: '#17693F', dashed: true }] : []),
      ]}
    />
  );
};

const TimelineRow: React.FC<{
  type: string;
  event: CustodyEvent | null;
  state: 'done' | 'current' | 'pending';
  isLast: boolean;
  selected: boolean;
  onSelect: () => void;
  locale: string;
}> = ({ type, event, state, isLast, selected, onSelect, locale }) => {
  const { t } = useTranslation('agent');
  const handler = event ? handlerOf(event, t) : null;

  return (
    <li className="relative">
      {!isLast && (
        <span aria-hidden className={`absolute start-[21px] sm:start-[25px] top-10 bottom-0 w-0.5 ${state === 'pending' ? 'bg-[#DCE3DD]' : 'bg-[#17693F]'}`} />
      )}
      <button
        onClick={onSelect}
        disabled={!event}
        className={`relative w-full grid grid-cols-[36px_minmax(0,1fr)_auto] md:grid-cols-[36px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_56px_16px] items-center gap-2 md:gap-3 rounded-lg px-1 sm:px-2 py-2.5 text-start disabled:cursor-default ${
          selected ? 'bg-[#F2F8F3]' : event ? 'hover:bg-[#FAF6EE]' : ''
        }`}
      >
        <span
          className={`w-9 h-9 rounded-full grid place-items-center ${
            state === 'done'
              ? 'bg-[#17693F] text-white'
              : state === 'current'
                ? 'bg-[#0C261B] text-white ring-4 ring-[#E8F5EC]'
                : 'bg-[#EEF1ED] text-[#9AA69F]'
          }`}
        >
          {state === 'done' ? <Check className="w-4 h-4" /> : state === 'current' ? <Truck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        </span>

        <span className="min-w-0">
          <span className={`block text-sm font-bold ${state === 'pending' ? 'text-gray-500' : 'text-[#0C261B]'}`}>
            {t(`events.${type}.title`)}
          </span>
          <span className="block text-xs text-gray-500 truncate">{t(`events.${type}.hint`)}</span>
        </span>

        {/* Téléphone : date seule */}
        <span className="md:hidden text-xs text-gray-500 text-end">
          {event ? formatDateTime(event.occurredAt, locale) : t('custody.pending')}
        </span>

        <span className="hidden md:block text-xs text-gray-600">
          {event ? formatDateTime(event.occurredAt, locale) : t('custody.pending')}
        </span>
        <span className="hidden md:flex items-start gap-1.5 text-xs min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          {handler ? (
            <span className="min-w-0">
              <span className="block font-semibold text-[#0C261B] truncate">{handler.name}</span>
              <span className="block text-gray-500 truncate">{handler.role}</span>
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </span>
        <span className="hidden md:flex items-start gap-1.5 text-xs min-w-0">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          {event?.location || event?.latitude !== null && event?.latitude !== undefined ? (
            <span className="min-w-0">
              <span className="block font-semibold text-[#0C261B] truncate">{event.location ?? '—'}</span>
              {event.latitude !== null && (
                <span className="block text-gray-500 tabular-nums truncate" dir="ltr">
                  {formatCoords({ latitude: event.latitude, longitude: event.longitude! })}
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </span>
        <span className="hidden md:block">
          {event?.evidenceUrl ? (
            <img src={resolveFileUrl(event.evidenceUrl)} alt="" className="w-14 h-10 object-cover rounded border border-[#EAE1D2]" />
          ) : null}
        </span>
        <span className="hidden md:block">{event && <ChevronRight className="w-4 h-4 text-gray-400 rtl:rotate-180" />}</span>
      </button>
    </li>
  );
};

function handlerOf(event: CustodyEvent, t: (key: string) => string) {
  if (event.handlerName) return { name: event.handlerName, role: t('custody.roles.TRANSPORT') };
  if (!event.user) return null;
  return { name: event.user.name, role: t(`custody.roles.${event.user.role}`) };
}

const EventDetails: React.FC<{ event: CustodyEvent; locale: string }> = ({ event, locale }) => {
  const { t } = useTranslation('agent');
  const handler = handlerOf(event, t);
  const rows = [
    { icon: FileText, label: t('custody.detail.event'), value: t(`events.${event.type}.title`) },
    { icon: CalendarDays, label: t('custody.detail.dateTime'), value: formatDateTime(event.occurredAt, locale) },
    { icon: User, label: t('custody.detail.handledBy'), value: handler ? `${handler.name} (${handler.role})` : '—' },
    {
      icon: MapPin,
      label: t('custody.detail.location'),
      value: (
        <>
          {event.location ?? '—'}
          {event.latitude !== null && event.longitude !== null && (
            <span className="block text-xs text-gray-500 tabular-nums" dir="ltr">
              {formatCoords({ latitude: event.latitude, longitude: event.longitude })}
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[20px_110px_minmax(0,1fr)] gap-2 text-sm">
          <row.icon className="w-4 h-4 text-gray-400 mt-0.5" />
          <span className="text-gray-500">{row.label}</span>
          <span className="font-semibold text-[#0C261B] break-words">{row.value}</span>
        </div>
      ))}
      <div className="grid grid-cols-[20px_110px_minmax(0,1fr)] gap-2 text-sm">
        <ImageIcon className="w-4 h-4 text-gray-400 mt-0.5" />
        <span className="text-gray-500">{t('custody.detail.proof')}</span>
        {event.evidenceUrl ? (
          <a href={resolveFileUrl(event.evidenceUrl)} target="_blank" rel="noreferrer">
            <img src={resolveFileUrl(event.evidenceUrl)} alt="" className="w-full max-w-[180px] h-24 object-cover rounded-lg border border-[#EAE1D2]" />
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>
      <div className="grid grid-cols-[20px_110px_minmax(0,1fr)] gap-2 text-sm">
        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
        <span className="text-gray-500">{t('custody.detail.notes')}</span>
        <span className="text-[#0C261B] whitespace-pre-line break-words">{event.note ?? '—'}</span>
      </div>
      {event.latitude !== null && event.longitude !== null && (
        <a
          href={googleMapsLink({ latitude: event.latitude, longitude: event.longitude })}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1D4E89] hover:underline"
        >
          <Navigation className="w-4 h-4" />
          {t('common.openInMaps')}
        </a>
      )}
    </div>
  );
};

const AddEventModal: React.FC<{ sample: CustodyDetail; onClose: () => void; onAdded: (eventId: string) => void }> = ({
  sample,
  onClose,
  onAdded,
}) => {
  const { t } = useTranslation('agent');
  const add = useAddCustodyEvent(sample.id);
  const geo = useGeolocation(true);
  const defaultType = sample.allowedEvents.find((e) => e !== 'ISSUE') ?? sample.allowedEvents[0];
  const lastHandler = [...sample.events].reverse().find((e) => e.handlerName)?.handlerName ?? '';
  const now = new Date();

  const [type, setType] = useState<AgentEventType>(defaultType);
  const [handlerName, setHandlerName] = useState(lastHandler);
  const [date, setDate] = useState(toDateInput(now));
  const [time, setTime] = useState(toTimeInput(now));
  const [location, setLocation] = useState('');
  const [useGps, setUseGps] = useState(true);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');

  const position = useGps && geo.state.status === 'ready' ? geo.state.position : null;
  const needsHandler = type === 'RELEASED_FOR_TRANSPORT';
  const valid =
    (!needsHandler || handlerName.trim().length >= 2) &&
    (type !== 'LOCATION_UPDATE' || !!position || location.trim().length > 0) &&
    (type !== 'ISSUE' || note.trim().length >= 5);

  const submit = async () => {
    setError('');
    const occurredAt = combineDateTime(date, time);
    if (new Date(occurredAt).getTime() > Date.now() + 5 * 60_000) {
      setError(t('addEvent.futureError'));
      return;
    }
    try {
      const result = await add.mutateAsync({
        type,
        occurredAt,
        handlerName: type === 'ISSUE' ? undefined : handlerName.trim() || undefined,
        location: location.trim() || undefined,
        latitude: position?.latitude,
        longitude: position?.longitude,
        note: note.trim() || undefined,
        evidenceUrl: photos[0],
      });
      const created = result.events[result.events.length - 1];
      const latest = [...result.events].filter((e) => e.type === type).pop() ?? created;
      if (latest) onAdded(latest.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.saveError'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('addEvent.title')} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <Field label={t('addEvent.type')} required>
          <SelectInput value={type} onChange={(e) => setType(e.target.value as AgentEventType)}>
            {sample.allowedEvents.map((option) => (
              <option key={option} value={option}>
                {t(`events.${option}.title`)}
              </option>
            ))}
          </SelectInput>
          <p className="text-[11px] text-gray-500 mt-1">{t(`addEvent.help.${type}`)}</p>
        </Field>

        {type !== 'ISSUE' && (
          <Field label={t('addEvent.handler')} required={needsHandler} hint={t('addEvent.handlerHint')}>
            <TextInput value={handlerName} onChange={(e) => setHandlerName(e.target.value)} placeholder={t('addEvent.handlerPlaceholder')} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('addEvent.date')} required>
            <TextInput type="date" value={date} max={toDateInput(new Date())} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('addEvent.time')} required>
            <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <Field label={t('addEvent.location')} required={type === 'LOCATION_UPDATE' && !position}>
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('addEvent.locationPlaceholder')} />
        </Field>

        <label className="flex items-center gap-3 rounded-lg bg-[#F6F7F4] px-3 py-2 text-sm">
          <input type="checkbox" checked={useGps} onChange={(e) => setUseGps(e.target.checked)} className="w-4 h-4 accent-[#17693F]" />
          <span className="flex-1">
            {t('addEvent.attachGps')}
            <span className="block text-xs text-gray-500" dir={position ? 'ltr' : undefined}>
              {geo.state.status === 'locating'
                ? t('gps.locating')
                : geo.state.status === 'ready'
                  ? `${formatCoords(geo.state.position)} · ${t('gps.accuracy', { meters: geo.state.position.accuracy })}`
                  : geo.state.status === 'error'
                    ? t(`gps.errors.${geo.state.reason}`)
                    : ''}
            </span>
          </span>
          {geo.state.status === 'locating' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <button type="button" onClick={geo.locate} className="text-xs font-bold text-[#1D4E89]">
              {t('gps.refresh')}
            </button>
          )}
        </label>

        <Field label={t('addEvent.note')} required={type === 'ISSUE'}>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={t(`addEvent.notePlaceholder.${type === 'ISSUE' ? 'issue' : 'default'}`)} />
        </Field>

        <div>
          <p className="text-xs font-bold text-[#0C261B] mb-1.5">{t('addEvent.proof')}</p>
          <PhotoUploader photos={photos} onChange={setPhotos} max={1} compact />
        </div>

        {error && <InlineError message={error} />}

        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Btn>
          <Btn onClick={submit} disabled={!valid} isLoading={add.isPending} variant={type === 'ISSUE' ? 'danger' : 'primary'}>
            {t('addEvent.submit')}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
