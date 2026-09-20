import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Boxes,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FlaskConical,
  Globe,
  Mail,
  MapPin,
  Microscope,
  PauseCircle,
  Pencil,
  Phone,
  PlayCircle,
  Plus,
  Timer,
  Trash2,
  UserRound,
  XCircle,
  Building2,
  TestTube,
} from 'lucide-react';
import {
  downloadCsv,
  useAddAccreditation,
  useAdminLaboratories,
  useAdminLaboratory,
  useCreateLaboratory,
  useRemoveAccreditation,
  useSetLaboratoryStatus,
  useUpdateLaboratory,
  type AdminLaboratory,
  type LaboratoriesQuery,
  type LaboratoryDetail,
  type LaboratoryInput,
  type LaboratoryStatus,
} from '../api';
import {
  Button,
  Card,
  Chip,
  Delta,
  Dialog,
  EmptyRow,
  ErrorState,
  Field,
  Flag,
  InfoRow,
  Input,
  PageTitle,
  Pager,
  Pill,
  RowMenu,
  Select,
  SidePanel,
  StatTile,
  TableShell,
  Td,
  TextArea,
  Th,
  Toast,
  UnderlineTabs,
  errorMessage,
  useToast,
} from '../ui';
import { ACTION_TYPE_STYLE, LAB_STATUS_TONE, describeAction } from '../labels';
import { countryName, formatDate, formatNumber, formatPercent, formatRelative, initials } from '../format';
import { SearchField } from '../SearchField';

type TabKey = 'ALL' | LaboratoryStatus;
const TABS: TabKey[] = ['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED'];

export const LaboratoriesManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [accreditation, setAccreditation] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<AdminLaboratory | 'new' | null>(null);
  const [statusChange, setStatusChange] = useState<{ lab: AdminLaboratory; status: LaboratoryStatus } | null>(null);
  const selectedId = params.get('lab');

  useEffect(() => setPage(1), [tab, search, country, accreditation, pageSize]);

  const query: LaboratoriesQuery = { page, pageSize, search, status: tab, country, accreditation };
  const { data, isError, refetch } = useAdminLaboratories(query);
  // Les indicateurs sont globaux : renvoyés à l'identique quels que soient les filtres.
  const kpis = data?.kpis;

  const openLab = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('lab', id);
    else next.delete('lab');
    setParams(next, { replace: true });
  };

  const exportCsv = async () => {
    try {
      await downloadCsv('/admin/laboratories/export', { search, status: tab, country, accreditation }, `laboratoires-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      toast.error(t('states.exportFailed'));
    }
  };

  const statusActions = (lab: AdminLaboratory) => [
    { label: t('actions.approve'), icon: <CheckCircle2 className="w-4 h-4" />, hidden: lab.status !== 'PENDING', onClick: () => setStatusChange({ lab, status: 'ACTIVE' }) },
    { label: t('actions.suspend'), icon: <PauseCircle className="w-4 h-4" />, danger: true, hidden: lab.status === 'SUSPENDED', onClick: () => setStatusChange({ lab, status: 'SUSPENDED' }) },
    { label: t('actions.reactivate'), icon: <PlayCircle className="w-4 h-4" />, hidden: lab.status !== 'SUSPENDED', onClick: () => setStatusChange({ lab, status: 'ACTIVE' }) },
  ];

  const tabCount = (key: TabKey) =>
    !kpis ? undefined : key === 'ALL' ? kpis.total.total : key === 'ACTIVE' ? kpis.active.total : key === 'PENDING' ? kpis.pending.total : kpis.suspended.total;

  return (
    <div className="space-y-5">
      <PageTitle
        title={t('labs.title')}
        subtitle={t('labs.subtitle')}
        actions={
          <>
            <Link to="/admin/laboratoire">
              <Button variant="secondary" icon={<Microscope className="w-4 h-4" />}>
                {t('labs.analysesLink')}
              </Button>
            </Link>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setEditing('new')}>
              {t('labs.addLab')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
        <StatTile icon={<FlaskConical className="w-5 h-5" />} label={t('labs.kpi.total')} value={kpis ? formatNumber(kpis.total.total, lang) : '—'} footer={<Delta value={kpis?.total.delta} label={t('shared.vsLastYear')} />} active={tab === 'ALL'} onClick={() => setTab('ALL')} />
        <StatTile icon={<CheckCircle2 className="w-5 h-5" />} label={t('labs.kpi.active')} value={kpis ? formatNumber(kpis.active.total, lang) : '—'} footer={<span className="text-xs font-bold text-[#17693F]">{formatPercent(kpis?.active.share, lang, 0)}</span>} active={tab === 'ACTIVE'} onClick={() => setTab('ACTIVE')} />
        <StatTile icon={<Clock3 className="w-5 h-5" />} tone="amber" label={t('labs.kpi.pending')} value={kpis ? formatNumber(kpis.pending.total, lang) : '—'} footer={<span className="text-xs font-bold text-[#B7791F]">{formatPercent(kpis?.pending.share, lang, 0)}</span>} active={tab === 'PENDING'} onClick={() => setTab('PENDING')} />
        <StatTile icon={<XCircle className="w-5 h-5" />} tone="red" label={t('labs.kpi.suspended')} value={kpis ? formatNumber(kpis.suspended.total, lang) : '—'} footer={<span className="text-xs font-bold text-[#C7452F]">{formatPercent(kpis?.suspended.share, lang, 0)}</span>} active={tab === 'SUSPENDED'} onClick={() => setTab('SUSPENDED')} />
        <StatTile
          icon={<Globe className="w-5 h-5" />}
          tone="blue"
          label={t('labs.kpi.countries')}
          value={kpis ? formatNumber(kpis.countries.length, lang) : '—'}
          footer={<span className="text-xs text-[#6B7A71] truncate block">{kpis?.countries.join(', ')}</span>}
        />
      </div>

      <Card bodyClassName="p-0">
        <div className="px-4 pt-2">
          <UnderlineTabs tabs={TABS.map((key) => ({ key, label: t(`labs.tabs.${key}`), count: tabCount(key) }))} active={tab} onChange={setTab} />
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchField value={search} onChange={setSearch} placeholder={t('labs.searchPlaceholder')} className="flex-1 min-w-[220px]" />
          <Select value={tab} onChange={(e) => setTab(e.target.value as TabKey)} className="w-40" label={t('shared.status')}>
            <option value="ALL">{t('shared.allStatuses')}</option>
            {(['ACTIVE', 'PENDING', 'SUSPENDED'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`enums.labStatus.${s}`)}
              </option>
            ))}
          </Select>
          <Select value={country} onChange={(e) => setCountry(e.target.value)} className="w-40" label={t('shared.country')}>
            <option value="">{t('shared.allCountries')}</option>
            {(data?.filters.countries ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={accreditation} onChange={(e) => setAccreditation(e.target.value)} className="w-48" label={t('labs.columns.accreditations')}>
            <option value="">{t('labs.allAccreditations')}</option>
            {(data?.filters.accreditations ?? []).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCsv}>
            {t('actions.export')}
          </Button>
        </div>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>{t('labs.columns.laboratory')}</Th>
                  <Th>{t('labs.columns.location')}</Th>
                  <Th>{t('labs.columns.accreditations')}</Th>
                  <Th>{t('labs.columns.status')}</Th>
                  <Th className="text-end">{t('labs.columns.samples')}</Th>
                  <Th>{t('labs.columns.joined')}</Th>
                  <Th className="text-end">{t('table.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {data?.items.length === 0 && <EmptyRow colSpan={8} message={t('labs.empty')} />}
                {data?.items.map((lab, index) => (
                  <tr key={lab.id} className={`cursor-pointer ${selectedId === lab.id ? 'bg-[#F3F8F4]' : 'hover:bg-[#FBF9F4]'}`} onClick={() => openLab(lab.id)}>
                    <Td className="text-[#7C8A82] tabular-nums">{formatNumber((page - 1) * pageSize + index + 1, lang)}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <LabLogo lab={lab} size={36} />
                        <div className="min-w-0">
                          <p className="font-bold text-[#0C261B] truncate">{lab.name}</p>
                          <p className="text-xs text-[#6B7A71] truncate">{lab.email ?? '—'}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <Flag code={lab.countryCode} />
                        <span>
                          <span className="block">{lab.city ?? '—'}</span>
                          <span className="block text-xs text-[#7C8A82]">{countryName(lab.countryCode, lang, lab.country)}</span>
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {lab.accreditations.length === 0 ? <span className="text-[#9AA69F]">—</span> : lab.accreditations.map((a) => <Chip key={a.id} className={a.state === 'EXPIRED' ? 'line-through opacity-60' : ''}>{a.name}</Chip>)}
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={LAB_STATUS_TONE[lab.status]}>{t(`enums.labStatus.${lab.status}`)}</Pill>
                    </Td>
                    <Td className="text-end tabular-nums font-semibold">{formatNumber(lab.samplesAnalyzed ?? 0, lang)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(lab.createdAt, lang)}</Td>
                    <Td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        label={t('table.actions')}
                        items={[
                          { label: t('actions.viewDetails'), icon: <Eye className="w-4 h-4" />, onClick: () => openLab(lab.id) },
                          { label: t('actions.edit'), icon: <Pencil className="w-4 h-4" />, onClick: () => setEditing(lab) },
                          ...statusActions(lab),
                        ]}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            {data && <Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} onPageSize={setPageSize} />}
          </>
        )}
      </Card>

      <LaboratoryPanel
        labId={selectedId}
        onClose={() => openLab(null)}
        onEdit={(lab) => setEditing(lab)}
        onStatus={(lab, status) => setStatusChange({ lab, status })}
        onToast={(message, tone) => (tone === 'error' ? toast.error(message) : toast.success(message))}
      />

      {editing && (
        <LaboratoryFormDialog
          lab={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={(message, id) => {
            setEditing(null);
            toast.success(message);
            if (id) openLab(id);
          }}
        />
      )}
      {statusChange && (
        <LabStatusDialog
          lab={statusChange.lab}
          status={statusChange.status}
          onClose={() => setStatusChange(null)}
          onDone={() => {
            setStatusChange(null);
            toast.success(t('labs.toasts.statusChanged'));
          }}
        />
      )}
      <Toast message={toast.toast?.message ?? null} tone={toast.toast?.tone} onClose={toast.clear} />
    </div>
  );
};

const LabLogo: React.FC<{ lab: Pick<AdminLaboratory, 'name' | 'logoUrl'>; size?: number }> = ({ lab, size = 36 }) => (
  <span
    className="rounded-xl bg-[#E3F2E8] text-[#17693F] grid place-items-center font-extrabold shrink-0 border border-[#CFE6D6] overflow-hidden"
    style={{ width: size, height: size, fontSize: size * 0.34 }}
    aria-hidden
  >
    {lab.logoUrl ? <img src={lab.logoUrl} alt="" className="w-full h-full object-cover" /> : initials(lab.name)}
  </span>
);

type PanelTab = 'overview' | 'contact' | 'accreditations' | 'activity' | 'notes';

const LaboratoryPanel: React.FC<{
  labId: string | null;
  onClose: () => void;
  onEdit: (lab: AdminLaboratory) => void;
  onStatus: (lab: AdminLaboratory, status: LaboratoryStatus) => void;
  onToast: (message: string, tone?: 'error') => void;
}> = ({ labId, onClose, onEdit, onStatus, onToast }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const [tab, setTab] = useState<PanelTab>('overview');
  const [months, setMonths] = useState(12);
  const [addingAccreditation, setAddingAccreditation] = useState(false);
  const { data: lab, isLoading } = useAdminLaboratory(labId, months);

  useEffect(() => setTab('overview'), [labId]);

  return (
    <SidePanel
      open={!!labId}
      onClose={onClose}
      width="sm:max-w-[480px]"
      title={lab?.name ?? t('labs.panel.title')}
      footer={
        lab && (
          <div className="flex flex-wrap gap-2 justify-end">
            {lab.status === 'PENDING' && (
              <Button size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => onStatus(lab, 'ACTIVE')}>
                {t('actions.approve')}
              </Button>
            )}
            {lab.status === 'SUSPENDED' ? (
              <Button size="sm" variant="secondary" icon={<PlayCircle className="w-4 h-4" />} onClick={() => onStatus(lab, 'ACTIVE')}>
                {t('actions.reactivate')}
              </Button>
            ) : (
              <Button size="sm" variant="danger" icon={<PauseCircle className="w-4 h-4" />} onClick={() => onStatus(lab, 'SUSPENDED')}>
                {t('actions.suspend')}
              </Button>
            )}
          </div>
        )
      }
    >
      {isLoading && !lab && <p className="p-5 text-sm text-gray-400">{t('states.loading')}</p>}
      {lab && (
        <div>
          <div className="relative h-24 bg-gradient-to-r from-[#0A3B27] to-[#17693F] overflow-hidden">
            <FlaskConical className="absolute -end-4 -top-4 w-32 h-32 text-white/10" />
            <div className="absolute top-3 end-3">
              <Pill tone={LAB_STATUS_TONE[lab.status]}>{t(`enums.labStatus.${lab.status}`)}</Pill>
            </div>
          </div>
          <div className="px-5 -mt-8 flex items-end gap-3">
            <span className="bg-white rounded-2xl p-1 shadow">
              <LabLogo lab={lab} size={60} />
            </span>
            <div className="pb-1 min-w-0">
              <p className="text-lg font-extrabold text-[#0C261B] truncate">{lab.name}</p>
              <p className="text-xs text-[#6B7A71] truncate">{lab.tagline ?? t('labs.panel.noTagline')}</p>
            </div>
          </div>

          <div className="px-5 mt-3">
            <UnderlineTabs
              tabs={(['overview', 'contact', 'accreditations', 'activity', 'notes'] as PanelTab[]).map((key) => ({ key, label: t(`labs.panel.tabs.${key}`) }))}
              active={tab}
              onChange={setTab}
            />
          </div>

          <div className="p-5 space-y-5">
            {tab === 'overview' && (
              <>
                <PanelSection title={t('labs.panel.basicInfo')} action={<Button size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => onEdit(lab)}>{t('actions.edit')}</Button>}>
                  <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label={t('labs.fields.name')}>{lab.name}</InfoRow>
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label={t('labs.fields.email')}>{lab.email ?? '—'}</InfoRow>
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label={t('labs.fields.phone')}>{lab.phone ?? '—'}</InfoRow>
                  <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label={t('labs.fields.location')}>
                    <span className="inline-flex items-center gap-1.5">
                      <Flag code={lab.countryCode} />
                      {[lab.city, countryName(lab.countryCode, lang, lab.country)].filter(Boolean).join(', ')}
                    </span>
                  </InfoRow>
                  <InfoRow label={t('labs.fields.address')}>{lab.address ?? '—'}</InfoRow>
                  <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label={t('labs.fields.website')}>
                    {lab.website ? <WebsiteLink url={lab.website} /> : '—'}
                  </InfoRow>
                </PanelSection>

                <PanelSection title={t('labs.panel.accreditations')} action={<Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddingAccreditation(true)}>{t('actions.add')}</Button>}>
                  <AccreditationList lab={lab} onToast={onToast} compact />
                </PanelSection>

                <PanelSection
                  title={t('labs.panel.statistics')}
                  action={
                    <Select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-40" label={t('labs.panel.statistics')}>
                      <option value={1}>{t('labs.panel.period.1')}</option>
                      <option value={12}>{t('labs.panel.period.12')}</option>
                      <option value={0}>{t('labs.panel.period.0')}</option>
                    </Select>
                  }
                >
                  <LabStats lab={lab} />
                </PanelSection>

                <PanelSection title={t('labs.panel.recentActivity')} action={<button onClick={() => setTab('activity')} className="text-xs font-bold text-[#17693F] hover:underline">{t('actions.viewAll')}</button>}>
                  <ActivityList logs={lab.recentActivity.slice(0, 3)} />
                </PanelSection>
              </>
            )}

            {tab === 'contact' && (
              <PanelSection title={t('labs.panel.tabs.contact')} action={<Button size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => onEdit(lab)}>{t('actions.edit')}</Button>}>
                <InfoRow icon={<UserRound className="w-3.5 h-3.5" />} label={t('labs.fields.contactName')}>{lab.contactName ?? '—'}</InfoRow>
                <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label={t('labs.fields.email')}>
                  {lab.email ? <a href={`mailto:${lab.email}`} className="text-[#17693F] hover:underline">{lab.email}</a> : '—'}
                </InfoRow>
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label={t('labs.fields.phone')}>
                  {lab.phone ? <a href={`tel:${lab.phone.replace(/\s/g, '')}`} className="text-[#17693F] hover:underline">{lab.phone}</a> : '—'}
                </InfoRow>
                <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label={t('labs.fields.website')}>{lab.website ? <WebsiteLink url={lab.website} /> : '—'}</InfoRow>
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label={t('labs.fields.address')}>{lab.address ?? '—'}</InfoRow>
                <InfoRow icon={<Award className="w-3.5 h-3.5" />} label={t('labs.fields.accreditationNo')}>{lab.accreditationNo}</InfoRow>
              </PanelSection>
            )}

            {tab === 'accreditations' && (
              <PanelSection title={t('labs.panel.accreditations')} action={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddingAccreditation(true)}>{t('actions.add')}</Button>}>
                <AccreditationList lab={lab} onToast={onToast} />
              </PanelSection>
            )}

            {tab === 'activity' && (
              <PanelSection
                title={t('labs.panel.tabs.activity')}
                action={
                  <Link to={`/admin/journal?entity=${lab.id}`} className="text-xs font-bold text-[#17693F] hover:underline">
                    {t('actions.viewTrail')}
                  </Link>
                }
              >
                <ActivityList logs={lab.recentActivity} />
              </PanelSection>
            )}

            {tab === 'notes' && <NotesEditor lab={lab} onToast={onToast} />}
          </div>
        </div>
      )}
      {lab && addingAccreditation && (
        <AccreditationDialog
          labId={lab.id}
          onClose={() => setAddingAccreditation(false)}
          onDone={() => {
            setAddingAccreditation(false);
            onToast(t('labs.toasts.accreditationAdded'));
          }}
        />
      )}
    </SidePanel>
  );
};

const PanelSection: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <section className="border border-[#EFE9DD] rounded-xl p-3.5">
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className="text-sm font-bold text-[#0C261B]">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const WebsiteLink: React.FC<{ url: string }> = ({ url }) => {
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-[#17693F] hover:underline break-all">
      {url}
    </a>
  );
};

const LabStats: React.FC<{ lab: LaboratoryDetail }> = ({ lab }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const s = lab.stats;
  const tiles = [
    { key: 'samples', icon: <TestTube className="w-4 h-4" />, value: formatNumber(s.samples.value, lang), delta: s.samples.delta },
    { key: 'batches', icon: <Boxes className="w-4 h-4" />, value: formatNumber(s.batches.value, lang), delta: s.batches.delta },
    { key: 'verified', icon: <CheckCircle2 className="w-4 h-4" />, value: formatNumber(s.verified.value, lang), delta: s.verified.delta, extra: formatPercent(s.verified.rate, lang, 0) },
    {
      key: 'avgTime',
      icon: <Timer className="w-4 h-4" />,
      value: s.avgTurnaroundDays.value === null ? '—' : t('shared.days', { days: formatNumber(s.avgTurnaroundDays.value, lang, 1) }),
      delta: s.avgTurnaroundDays.delta,
      invert: true,
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {tiles.map((tile) => (
        <div key={tile.key} className="rounded-xl bg-[#F6F9F6] border border-[#E3EEE6] p-2.5 text-center">
          <span className="w-7 h-7 mx-auto rounded-lg bg-white text-[#17693F] grid place-items-center">{tile.icon}</span>
          <p className="text-[11px] text-[#6B7A71] mt-1">{t(`labs.stats.${tile.key}`)}</p>
          <p className="text-lg font-extrabold text-[#0C261B] tabular-nums leading-tight">{tile.value}</p>
          {tile.extra && <p className="text-[11px] font-bold text-[#17693F]">{tile.extra}</p>}
          {s.months > 0 && <Delta value={tile.delta} invert={tile.invert} className="justify-center" />}
        </div>
      ))}
    </div>
  );
};

const ActivityList: React.FC<{ logs: LaboratoryDetail['recentActivity'] }> = ({ logs }) => {
  const { t, i18n } = useTranslation('console');
  if (logs.length === 0) return <p className="text-sm text-gray-400">{t('states.noData')}</p>;
  return (
    <ul className="space-y-2.5">
      {logs.map((log) => {
        const style = ACTION_TYPE_STYLE[log.actionType ?? 'UPDATE'];
        return (
          <li key={log.id} className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: style.tone === 'red' ? '#C7452F' : style.tone === 'blue' ? '#2A78D6' : '#17693F' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#0C261B]">{describeAction(t, log)}</p>
              <p className="text-xs text-[#7C8A82] truncate">
                {[log.details, log.user?.name].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className="text-[11px] text-[#7C8A82] whitespace-nowrap">{formatRelative(log.createdAt, i18n.language)}</span>
          </li>
        );
      })}
    </ul>
  );
};

const AccreditationList: React.FC<{ lab: LaboratoryDetail; onToast: (message: string, tone?: 'error') => void; compact?: boolean }> = ({ lab, onToast, compact }) => {
  const { t, i18n } = useTranslation('console');
  const remove = useRemoveAccreditation();
  if (lab.accreditations.length === 0) return <p className="text-sm text-gray-400">{t('labs.panel.noAccreditations')}</p>;
  return (
    <ul className="space-y-2">
      {lab.accreditations.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-lg border border-[#EFE9DD] px-3 py-2">
          <span className="w-9 h-9 rounded-lg bg-[#FBF1DE] text-[#B7791F] grid place-items-center shrink-0">
            <Award className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[#0C261B] truncate">
              {a.name}
              {a.issuingBody && <span className="font-normal text-[#6B7A71]"> · {a.issuingBody}</span>}
            </p>
            <p className="text-xs text-[#7C8A82] truncate">
              {a.validUntil ? t('labs.panel.validUntil', { date: formatDate(a.validUntil, i18n.language) }) : t('labs.panel.noExpiry')}
              {!compact && a.certificateNumber ? ` · ${a.certificateNumber}` : ''}
            </p>
          </div>
          <Pill tone={a.state === 'VALID' ? 'green' : 'red'}>{t(`labs.accreditationState.${a.state}`)}</Pill>
          {!compact && (
            <button
              onClick={async () => {
                if (!window.confirm(t('labs.panel.confirmRemove', { name: a.name }))) return;
                try {
                  await remove.mutateAsync({ labId: lab.id, id: a.id });
                  onToast(t('labs.toasts.accreditationRemoved'));
                } catch (err) {
                  onToast(errorMessage(err, t('states.saveFailed')), 'error');
                }
              }}
              className="p-1.5 rounded-lg text-[#9AA69F] hover:text-[#B42323] hover:bg-[#FDF2F2]"
              aria-label={t('actions.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

const NotesEditor: React.FC<{ lab: LaboratoryDetail; onToast: (message: string, tone?: 'error') => void }> = ({ lab, onToast }) => {
  const { t } = useTranslation('console');
  const update = useUpdateLaboratory();
  const [notes, setNotes] = useState(lab.notes ?? '');
  useEffect(() => setNotes(lab.notes ?? ''), [lab.notes]);
  return (
    <section className="space-y-2">
      <Field label={t('labs.panel.tabs.notes')} hint={t('labs.panel.notesHint')}>
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} maxLength={4000} />
      </Field>
      <div className="flex justify-end">
        <Button
          size="sm"
          loading={update.isPending}
          disabled={notes === (lab.notes ?? '')}
          onClick={async () => {
            try {
              await update.mutateAsync({ id: lab.id, notes });
              onToast(t('labs.toasts.notesSaved'));
            } catch (err) {
              onToast(errorMessage(err, t('states.saveFailed')), 'error');
            }
          }}
        >
          {t('actions.save')}
        </Button>
      </div>
    </section>
  );
};

const LaboratoryFormDialog: React.FC<{ lab: AdminLaboratory | null; onClose: () => void; onDone: (message: string, id?: string) => void }> = ({ lab, onClose, onDone }) => {
  const { t } = useTranslation('console');
  const create = useCreateLaboratory();
  const update = useUpdateLaboratory();
  const [form, setForm] = useState<LaboratoryInput>({
    name: lab?.name ?? '',
    tagline: lab?.tagline ?? '',
    country: lab?.country ?? 'Tunisie',
    city: lab?.city ?? '',
    address: lab?.address ?? '',
    email: lab?.email ?? '',
    phone: lab?.phone ?? '',
    website: lab?.website ?? '',
    contactName: lab?.contactName ?? '',
    accreditationNo: lab?.accreditationNo && lab.accreditationNo !== '—' ? lab.accreditationNo : '',
    status: 'PENDING',
  });
  const [error, setError] = useState('');
  const set = (key: keyof LaboratoryInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });
  const valid = (form.name ?? '').trim().length >= 2 && (form.country ?? '').trim().length >= 2 && (!form.email || /.+@.+\..+/.test(form.email));

  const submit = async () => {
    setError('');
    const payload = Object.fromEntries(Object.entries(form).filter(([key, value]) => (lab ? key !== 'status' : true) && (value !== '' || lab))) as LaboratoryInput;
    try {
      if (lab) {
        await update.mutateAsync({ id: lab.id, ...payload });
        onDone(t('labs.toasts.updated'));
      } else {
        const created = await create.mutateAsync(payload);
        onDone(t('labs.toasts.created'), created.id);
      }
    } catch (err) {
      setError(errorMessage(err, t('states.saveFailed')));
    }
  };

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={lab ? t('labs.form.editTitle') : t('labs.form.createTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button loading={create.isPending || update.isPending} disabled={!valid} onClick={submit}>
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t('labs.fields.name')} required>
          <Input value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label={t('labs.fields.tagline')}>
          <Input value={form.tagline ?? ''} onChange={set('tagline')} />
        </Field>
        <Field label={t('labs.fields.email')}>
          <Input type="email" value={form.email ?? ''} onChange={set('email')} />
        </Field>
        <Field label={t('labs.fields.phone')}>
          <Input value={form.phone ?? ''} onChange={set('phone')} />
        </Field>
        <Field label={t('labs.fields.city')}>
          <Input value={form.city ?? ''} onChange={set('city')} />
        </Field>
        <Field label={t('shared.country')} required>
          <Input value={form.country ?? ''} onChange={set('country')} />
        </Field>
        <Field label={t('labs.fields.address')} className="sm:col-span-2">
          <Input value={form.address ?? ''} onChange={set('address')} />
        </Field>
        <Field label={t('labs.fields.website')}>
          <Input value={form.website ?? ''} onChange={set('website')} placeholder="www.example.tn" />
        </Field>
        <Field label={t('labs.fields.contactName')}>
          <Input value={form.contactName ?? ''} onChange={set('contactName')} />
        </Field>
        <Field label={t('labs.fields.accreditationNo')}>
          <Input value={form.accreditationNo ?? ''} onChange={set('accreditationNo')} />
        </Field>
        {!lab && (
          <Field label={t('shared.status')} hint={t('labs.form.statusHint')}>
            <Select value={form.status} onChange={set('status')}>
              <option value="PENDING">{t('enums.labStatus.PENDING')}</option>
              <option value="ACTIVE">{t('enums.labStatus.ACTIVE')}</option>
            </Select>
          </Field>
        )}
        {error && <p className="sm:col-span-2 text-xs font-semibold text-[#B42323] bg-[#FDF2F2] border border-[#F3CFCF] rounded-lg px-3 py-2">{error}</p>}
      </div>
    </Dialog>
  );
};

const AccreditationDialog: React.FC<{ labId: string; onClose: () => void; onDone: () => void }> = ({ labId, onClose, onDone }) => {
  const { t } = useTranslation('console');
  const add = useAddAccreditation();
  const [form, setForm] = useState({ name: '', issuingBody: '', certificateNumber: '', validUntil: '' });
  const [error, setError] = useState('');
  return (
    <Dialog
      open
      size="sm"
      onClose={onClose}
      title={t('labs.accreditationForm.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            loading={add.isPending}
            disabled={form.name.trim().length < 2}
            onClick={async () => {
              try {
                await add.mutateAsync({
                  labId,
                  name: form.name.trim(),
                  issuingBody: form.issuingBody.trim() || undefined,
                  certificateNumber: form.certificateNumber.trim() || undefined,
                  validUntil: form.validUntil || undefined,
                });
                onDone();
              } catch (err) {
                setError(errorMessage(err, t('states.saveFailed')));
              }
            }}
          >
            {t('actions.add')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('labs.accreditationForm.name')} required hint={t('labs.accreditationForm.nameHint')}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} list="accreditation-names" autoFocus />
          <datalist id="accreditation-names">
            {['ISO 17025', 'ISO 9001', 'TUNAC', 'COFRAC', 'ILAC'].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field label={t('labs.accreditationForm.issuingBody')}>
          <Input value={form.issuingBody} onChange={(e) => setForm({ ...form, issuingBody: e.target.value })} />
        </Field>
        <Field label={t('labs.accreditationForm.certificateNumber')}>
          <Input value={form.certificateNumber} onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })} />
        </Field>
        <Field label={t('labs.accreditationForm.validUntil')}>
          <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
        </Field>
        {error && <p className="text-xs font-semibold text-[#B42323]">{error}</p>}
      </div>
    </Dialog>
  );
};

const LabStatusDialog: React.FC<{ lab: AdminLaboratory; status: LaboratoryStatus; onClose: () => void; onDone: () => void }> = ({ lab, status, onClose, onDone }) => {
  const { t } = useTranslation('console');
  const mutation = useSetLaboratoryStatus();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const key = status === 'SUSPENDED' ? 'suspend' : lab.status === 'PENDING' ? 'approve' : 'reactivate';
  return (
    <Dialog
      open
      size="sm"
      onClose={onClose}
      title={t(`labs.statusDialog.${key}.title`, { name: lab.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant={status === 'SUSPENDED' ? 'danger' : 'primary'}
            loading={mutation.isPending}
            onClick={async () => {
              try {
                await mutation.mutateAsync({ id: lab.id, status, note: note.trim() || undefined });
                onDone();
              } catch (err) {
                setError(errorMessage(err, t('states.saveFailed')));
              }
            }}
          >
            {t('actions.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#3F4A44] mb-3">{t(`labs.statusDialog.${key}.text`)}</p>
      <Field label={t('shared.noteOptional')}>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
      {error && <p className="text-xs font-semibold text-[#B42323] mt-2">{error}</p>}
    </Dialog>
  );
};
