import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowRight,
  Columns3,
  Download,
  Eye,
  FileText,
  Globe,
  History,
  Layers,
  Monitor,
  ShieldAlert,
  SlidersHorizontal,
  Timer,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  downloadCsv,
  useAuditLog,
  useAuditLogs,
  useAuditStats,
  type ActionType,
  type AuditLogEntry,
  type AuditQuery,
  type AuditStatus,
} from '../api';
import {
  Avatar,
  Button,
  Card,
  DateRangePicker,
  Delta,
  EmptyRow,
  ErrorState,
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
  Th,
  Toast,
  defaultRange,
  useClickOutside,
  useToast,
  type DateRange,
} from '../ui';
import { ACTION_TYPE_STYLE, AUDIT_STATUS_TONE, ROLE_TONE, describeAction, entityLink, formatMetaValue, moduleLabel } from '../labels';
import { formatDate, formatDateTime, formatDuration, formatNumber, formatTime } from '../format';
import { SearchField } from '../SearchField';

const COLUMNS = ['date', 'user', 'action', 'module', 'details', 'ip', 'status'] as const;
type Column = (typeof COLUMNS)[number];

export const AuditLogPage: React.FC = () => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [module, setModule] = useState('');
  const [actionType, setActionType] = useState<ActionType | 'ALL'>('ALL');
  const [userId, setUserId] = useState(params.get('user') ?? '');
  const [status, setStatus] = useState<AuditStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [entityId, setEntityId] = useState(params.get('entity') ?? '');
  const [moreFilters, setMoreFilters] = useState(!!params.get('entity'));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Column[]>([]);

  useEffect(() => setPage(1), [range, module, actionType, userId, status, search, entityId, pageSize]);

  const period = { from: range.from, to: range.to };
  const stats = useAuditStats(period);
  // Une trace d'entité se lit sans borne de dates, sauf si l'utilisateur en choisit.
  const query: AuditQuery = { ...(entityId ? {} : period), page, pageSize, module, actionType, userId, status, search, entityId };
  const logs = useAuditLogs(query);

  const show = (column: Column) => !hidden.includes(column);
  const exportCsv = async () => {
    try {
      await downloadCsv('/admin/audit-logs/export', { ...query, page: undefined, pageSize: undefined }, `journal-audit-${range.to}.csv`);
    } catch {
      toast.error(t('states.exportFailed'));
    }
  };

  const clearEntity = () => {
    setEntityId('');
    const next = new URLSearchParams(params);
    next.delete('entity');
    setParams(next, { replace: true });
  };

  const s = stats.data;

  return (
    <div className="space-y-5">
      <PageTitle title={t('audit.title')} subtitle={t('audit.subtitle')} actions={<DateRangePicker value={range} onChange={setRange} />} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile icon={<FileText className="w-5 h-5" />} label={t('audit.kpi.totalLogs')} value={s ? formatNumber(s.totalLogs.total, lang) : '—'} footer={<Delta value={s?.totalLogs.delta} label={t('shared.vsPreviousPeriod')} />} />
        <StatTile icon={<Users className="w-5 h-5" />} tone="blue" label={t('audit.kpi.activeUsers')} value={s ? formatNumber(s.activeUsers.total, lang) : '—'} footer={<Delta value={s?.activeUsers.delta} label={t('shared.vsPreviousPeriod')} />} />
        <StatTile
          icon={<ShieldAlert className="w-5 h-5" />}
          tone="amber"
          label={t('audit.kpi.securityAlerts')}
          value={s ? formatNumber(s.securityAlerts.total, lang) : '—'}
          footer={<Delta value={s?.securityAlerts.delta} invert label={t('shared.vsPreviousPeriod')} />}
          active={status === 'FAILED'}
          onClick={() => setStatus(status === 'FAILED' ? 'ALL' : 'FAILED')}
        />
        <StatTile
          icon={<Timer className="w-5 h-5" />}
          label={t('audit.kpi.uptime')}
          value={s ? formatDuration(s.uptime.seconds, lang) : '—'}
          footer={<span className="text-xs text-[#6B7A71]">{s ? t('audit.kpi.uptimeSince', { date: formatDateTime(s.uptime.since, lang) }) : ''}</span>}
        />
      </div>

      <Card bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Select value={module} onChange={(e) => setModule(e.target.value)} className="w-40" label={t('audit.columns.module')}>
            <option value="">{t('audit.allModules')}</option>
            {(s?.filters.modules ?? []).map((m) => (
              <option key={m} value={m}>
                {moduleLabel(t, m)}
              </option>
            ))}
          </Select>
          <Select value={actionType} onChange={(e) => setActionType(e.target.value as ActionType | 'ALL')} className="w-40" label={t('audit.columns.action')}>
            <option value="ALL">{t('audit.allActions')}</option>
            {(s?.filters.actionTypes ?? []).map((a) => (
              <option key={a} value={a}>
                {t(`enums.actionType.${a}`)}
              </option>
            ))}
          </Select>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-44" label={t('audit.columns.user')}>
            <option value="">{t('audit.allUsers')}</option>
            {(s?.filters.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as AuditStatus | 'ALL')} className="w-36" label={t('shared.status')}>
            <option value="ALL">{t('shared.allStatuses')}</option>
            {(['SUCCESS', 'FAILED', 'WARNING'] as const).map((st) => (
              <option key={st} value={st}>
                {t(`enums.auditStatus.${st}`)}
              </option>
            ))}
          </Select>
          <SearchField value={search} onChange={setSearch} placeholder={t('audit.searchPlaceholder')} className="flex-1 min-w-[200px]" />
          <Button variant="secondary" icon={<SlidersHorizontal className="w-4 h-4" />} onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters}>
            {t(moreFilters ? 'actions.lessFilters' : 'actions.moreFilters')}
          </Button>
          <ColumnsMenu hidden={hidden} onChange={setHidden} />
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCsv}>
            {t('actions.export')}
          </Button>
          {moreFilters && (
            <div className="w-full flex flex-wrap items-center gap-2 pt-1">
              <div className="relative w-80 max-w-full">
                <Input value={entityId} onChange={(e) => setEntityId(e.target.value.trim())} placeholder={t('audit.entityPlaceholder')} aria-label={t('audit.entityPlaceholder')} />
                {entityId && (
                  <button onClick={clearEntity} className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0C261B]" aria-label={t('actions.clearFilters')}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {entityId && <Pill tone="blue">{t('audit.trailMode')}</Pill>}
            </div>
          )}
        </div>

        {logs.isError ? (
          <ErrorState onRetry={() => logs.refetch()} />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  {show('date') && <Th>{t('audit.columns.date')}</Th>}
                  {show('user') && <Th>{t('audit.columns.user')}</Th>}
                  {show('action') && <Th>{t('audit.columns.action')}</Th>}
                  {show('module') && <Th>{t('audit.columns.module')}</Th>}
                  {show('details') && <Th>{t('audit.columns.details')}</Th>}
                  {show('ip') && <Th>{t('audit.columns.ip')}</Th>}
                  {show('status') && <Th>{t('audit.columns.status')}</Th>}
                  <Th className="text-end">{t('table.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {logs.data?.items.length === 0 && <EmptyRow colSpan={9} message={t('audit.empty')} />}
                {logs.data?.items.map((log, index) => {
                  const style = ACTION_TYPE_STYLE[log.actionType ?? 'UPDATE'];
                  const link = entityLink(log.entite, log.entiteId);
                  return (
                    <tr key={log.id} className={`cursor-pointer ${selected === log.id ? 'bg-[#F3F8F4]' : 'hover:bg-[#FBF9F4]'}`} onClick={() => setSelected(log.id)}>
                      <Td className="text-[#7C8A82] tabular-nums">{formatNumber((page - 1) * pageSize + index + 1, lang)}</Td>
                      {show('date') && (
                        <Td className="whitespace-nowrap">
                          <p>{formatDate(log.createdAt, lang)}</p>
                          <p className="text-xs text-[#7C8A82]">{formatTime(log.createdAt, lang)}</p>
                        </Td>
                      )}
                      {show('user') && (
                        <Td>
                          <ActorCell log={log} />
                        </Td>
                      )}
                      {show('action') && (
                        <Td>
                          <Pill tone={style.tone} icon={<style.icon className="w-3 h-3" />}>
                            {t(`enums.actionType.${log.actionType ?? 'UPDATE'}`)}
                          </Pill>
                        </Td>
                      )}
                      {show('module') && (
                        <Td className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#7C8A82]" />
                            {moduleLabel(t, log.module)}
                          </span>
                        </Td>
                      )}
                      {show('details') && (
                        <Td className="max-w-[280px]">
                          <p className="font-semibold text-[#0C261B] truncate">{describeAction(t, log)}</p>
                          <p className="text-xs text-[#6B7A71] truncate">{log.details ?? '—'}</p>
                        </Td>
                      )}
                      {show('ip') && <Td className="font-mono text-xs whitespace-nowrap">{log.ipAddress ?? '—'}</Td>}
                      {show('status') && (
                        <Td>
                          <Pill tone={AUDIT_STATUS_TONE[log.status]}>{t(`enums.auditStatus.${log.status}`)}</Pill>
                        </Td>
                      )}
                      <Td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <RowMenu
                          label={t('table.actions')}
                          items={[
                            { label: t('actions.viewDetails'), icon: <Eye className="w-4 h-4" />, onClick: () => setSelected(log.id) },
                            {
                              label: t('actions.viewTrail'),
                              icon: <History className="w-4 h-4" />,
                              hidden: !log.entiteId || log.entiteId === '-',
                              onClick: () => {
                                setEntityId(log.entiteId);
                                setMoreFilters(true);
                              },
                            },
                            {
                              label: t('audit.filterUser'),
                              icon: <UserRound className="w-4 h-4" />,
                              hidden: !log.userId,
                              onClick: () => setUserId(log.userId ?? ''),
                            },
                            ...(link ? [{ label: t('audit.openEntity'), icon: <ArrowRight className="w-4 h-4 rtl:rotate-180" />, onClick: () => navigate(link) }] : []),
                          ]}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            {logs.data && <Pager page={page} pageSize={pageSize} total={logs.data.total} onPage={setPage} onPageSize={setPageSize} sizes={[15, 25, 50, 100]} />}
          </>
        )}
      </Card>

      <LogDetailPanel
        id={selected}
        onClose={() => setSelected(null)}
        onTrail={(id) => {
          setEntityId(id);
          setMoreFilters(true);
          setSelected(null);
        }}
      />
      <Toast message={toast.toast?.message ?? null} tone={toast.toast?.tone} onClose={toast.clear} />
    </div>
  );
};

const ActorCell: React.FC<{ log: AuditLogEntry }> = ({ log }) => {
  const { t } = useTranslation('console');
  if (!log.user) {
    const unknown = log.action === 'LOGIN_FAILED';
    return (
      <div className="flex items-center gap-2.5 min-w-[160px]">
        <span className="w-8 h-8 rounded-full bg-[#EEF1ED] text-[#5B6B62] grid place-items-center">
          {unknown ? <ShieldAlert className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </span>
        <div>
          <p className="font-bold text-[#0C261B]">{t(unknown ? 'shared.unknown' : 'shared.system')}</p>
          <p className="text-xs text-[#6B7A71]">{t(unknown ? 'audit.anonymous' : 'audit.automated')}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 min-w-[170px]">
      <Avatar name={log.user.name} src={log.user.producer?.avatarUrl} size={32} />
      <div className="min-w-0">
        <p className="font-bold text-[#0C261B] truncate">{log.user.name}</p>
        <p className="text-xs text-[#6B7A71] truncate">{t(`roles.${log.user.role}`)}</p>
      </div>
    </div>
  );
};

const ColumnsMenu: React.FC<{ hidden: Column[]; onChange: (hidden: Column[]) => void }> = ({ hidden, onChange }) => {
  const { t } = useTranslation('console');
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" icon={<Columns3 className="w-4 h-4" />} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {t('actions.columns')}
      </Button>
      {open && (
        <div className="absolute end-0 mt-1 w-52 bg-white border border-[#EAE1D2] rounded-xl shadow-lg p-2 z-40">
          {COLUMNS.map((column) => (
            <label key={column} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#FAF6EE] text-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#17693F]"
                checked={!hidden.includes(column)}
                onChange={(e) => onChange(e.target.checked ? hidden.filter((c) => c !== column) : [...hidden, column])}
              />
              {t(`audit.columns.${column}`)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const LogDetailPanel: React.FC<{ id: string | null; onClose: () => void; onTrail: (entityId: string) => void }> = ({ id, onClose, onTrail }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const { data: log, isLoading } = useAuditLog(id);
  const style = ACTION_TYPE_STYLE[log?.actionType ?? 'UPDATE'];
  const link = log ? entityLink(log.entite, log.entiteId) : null;
  const meta = log?.metadata;

  return (
    <SidePanel open={!!id} onClose={onClose} title={t('audit.detail.title')}>
      {isLoading && <p className="p-5 text-sm text-gray-400">{t('states.loading')}</p>}
      {log && (
        <div className="p-5 space-y-5">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-[#E3F2E8] text-[#17693F] grid place-items-center shrink-0">
              <style.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-[#0C261B]">{describeAction(t, log)}</p>
              <p className="text-xs text-[#6B7A71]">{log.details ?? log.action}</p>
            </div>
          </div>

          <div>
            <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label={t('audit.columns.date')}>{formatDateTime(log.createdAt, lang)}</InfoRow>
            <InfoRow icon={<UserRound className="w-3.5 h-3.5" />} label={t('audit.columns.user')}>
              {log.user ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar name={log.user.name} size={22} />
                  <span>
                    {log.user.name}
                    <span className="ms-1.5">
                      <Pill tone={ROLE_TONE[log.user.role]} dot={false}>{t(`roles.${log.user.role}`)}</Pill>
                    </span>
                  </span>
                </span>
              ) : (
                t('shared.system')
              )}
            </InfoRow>
            <InfoRow label={t('audit.columns.action')}>
              <Pill tone={style.tone} icon={<style.icon className="w-3 h-3" />}>{t(`enums.actionType.${log.actionType ?? 'UPDATE'}`)}</Pill>
            </InfoRow>
            <InfoRow icon={<Layers className="w-3.5 h-3.5" />} label={t('audit.columns.module')}>{moduleLabel(t, log.module)}</InfoRow>
            <InfoRow label={t('audit.detail.reference')}>
              <span className="font-mono text-xs break-all">
                {log.entite} · {log.entiteId}
              </span>
            </InfoRow>
            <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label={t('audit.columns.ip')}>
              <span className="font-mono text-xs">{log.ipAddress ?? '—'}</span>
            </InfoRow>
            <InfoRow icon={<Monitor className="w-3.5 h-3.5" />} label={t('audit.detail.userAgent')}>
              <span className="text-xs font-normal text-[#3F4A44] break-words">{log.userAgent ?? '—'}</span>
            </InfoRow>
            <InfoRow label={t('audit.columns.status')}>
              <Pill tone={AUDIT_STATUS_TONE[log.status]}>{t(`enums.auditStatus.${log.status}`)}</Pill>
            </InfoRow>
          </div>

          <section className="border border-[#EFE9DD] rounded-xl p-3.5">
            <h3 className="text-sm font-bold text-[#0C261B] mb-2">{t('audit.detail.changes')}</h3>
            {meta && (meta.field || meta.oldValue !== undefined || meta.newValue !== undefined || meta.notes) ? (
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[13px]">
                <dt className="text-[#6B7A71]">{t('audit.detail.field')}</dt>
                <dd className="font-semibold text-[#0C261B]">{meta.field ?? '—'}</dd>
                <dt className="text-[#6B7A71]">{t('audit.detail.oldValue')}</dt>
                <dd className="font-mono text-xs whitespace-pre-wrap text-[#3F4A44]">{formatMetaValue(meta.oldValue)}</dd>
                <dt className="text-[#6B7A71]">{t('audit.detail.newValue')}</dt>
                <dd className="font-mono text-xs whitespace-pre-wrap text-[#0C261B]">{formatMetaValue(meta.newValue)}</dd>
                {meta.notes && (
                  <>
                    <dt className="text-[#6B7A71]">{t('audit.detail.notes')}</dt>
                    <dd className="text-[#0C261B]">{meta.notes}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-400">{t('audit.detail.noChanges')}</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-bold text-[#0C261B] mb-2">{t('audit.detail.relatedLinks')}</h3>
            <ul className="space-y-1">
              {link && (
                <li>
                  <Link to={link} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-[#17693F] font-semibold hover:bg-[#F3F8F4]">
                    {t('audit.detail.openEntity', { entity: t(`enums.entity.${log.entite}`, { defaultValue: log.entite }) })}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </li>
              )}
              {log.user && (
                <li>
                  <Link to={`/admin/utilisateurs?user=${log.user.id}`} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-[#17693F] font-semibold hover:bg-[#F3F8F4]">
                    {t('audit.detail.openUser')}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </li>
              )}
              {log.trailCount > 1 && (
                <li>
                  <button onClick={() => onTrail(log.entiteId)} className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-[#17693F] font-semibold hover:bg-[#F3F8F4]">
                    {t('audit.detail.viewTrail', { n: formatNumber(log.trailCount, lang) })}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </li>
              )}
              {!link && !log.user && log.trailCount <= 1 && <li className="text-sm text-gray-400">{t('audit.detail.noLinks')}</li>}
            </ul>
          </section>
        </div>
      )}
    </SidePanel>
  );
};
