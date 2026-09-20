import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  Download,
  Eye,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react';
import type { Role } from '../../../../lib/api-types';
import { useAuth } from '../../../../lib/auth-context';
import {
  downloadCsv,
  useAdminUser,
  useAdminUsers,
  useCreateUser,
  useResetUserPassword,
  useSetUserStatus,
  useUpdateUser,
  type AdminUser,
  type StaffRole,
  type UsersQuery,
} from '../api';
import {
  Avatar,
  Button,
  Card,
  Delta,
  Dialog,
  EmptyRow,
  ErrorState,
  Field,
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
  UnderlineTabs,
  errorMessage,
  useToast,
} from '../ui';
import { ACTION_TYPE_STYLE, ROLE_TONE, describeAction } from '../labels';
import { formatDate, formatDateTime, formatNumber, formatRelative, formatTime } from '../format';
import { SearchField } from '../SearchField';

type TabKey = 'ALL' | Role;
const TABS: TabKey[] = ['ALL', 'PRODUCER', 'VERIFICATION_TEAM', 'FIELD_AGENT', 'ADMIN', 'CONSUMER'];
const STAFF_ROLES: StaffRole[] = ['ADMIN', 'VERIFICATION_TEAM', 'FIELD_AGENT'];
const isStaff = (role: Role): role is StaffRole => (STAFF_ROLES as Role[]).includes(role);

export const UsersRolesPage: React.FC = () => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [lastLogin, setLastLogin] = useState('ALL');
  const [sort, setSort] = useState('RECENT');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState<AdminUser | null>(null);
  const selectedId = params.get('user');

  useEffect(() => setPage(1), [tab, search, status, lastLogin, sort, pageSize]);

  const query: UsersQuery = { page, pageSize, search, role: tab, status, lastLogin, sort };
  const { data, isError, refetch, isFetching } = useAdminUsers(query);

  const openUser = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('user', id);
    else next.delete('user');
    setParams(next, { replace: true });
  };

  const stats = data?.stats;
  const tiles: { key: TabKey; icon: React.ReactNode; tone: 'green' | 'gold' | 'violet' | 'blue' | 'red' | 'neutral' }[] = [
    { key: 'ALL', icon: <UsersRound className="w-5 h-5" />, tone: 'green' },
    { key: 'PRODUCER', icon: <Users className="w-5 h-5" />, tone: 'gold' },
    { key: 'VERIFICATION_TEAM', icon: <ShieldCheck className="w-5 h-5" />, tone: 'violet' },
    { key: 'FIELD_AGENT', icon: <Truck className="w-5 h-5" />, tone: 'blue' },
    { key: 'ADMIN', icon: <UserCog className="w-5 h-5" />, tone: 'red' },
    { key: 'CONSUMER', icon: <ShoppingBag className="w-5 h-5" />, tone: 'neutral' },
  ];

  const exportCsv = async () => {
    try {
      await downloadCsv('/admin/users/export', { search, role: tab, status, lastLogin }, `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      toast.error(t('states.exportFailed'));
    }
  };

  return (
    <div className="space-y-5">
      <PageTitle
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setEditing('new')}>
            {t('users.addUser')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
        {tiles.map((tile) => (
          <StatTile
            key={tile.key}
            icon={tile.icon}
            tone={tile.tone}
            label={t(`users.tiles.${tile.key}`)}
            value={stats ? formatNumber(stats[tile.key].total, lang) : '—'}
            footer={<Delta value={stats?.[tile.key].delta} label={t('shared.vsLastMonth')} />}
            active={tab === tile.key}
            onClick={() => setTab(tile.key)}
          />
        ))}
      </div>

      <Card bodyClassName="p-0">
        <div className="px-4 pt-2">
          <UnderlineTabs
            tabs={TABS.map((key) => ({ key, label: t(`users.tabs.${key}`), count: stats?.[key].total }))}
            active={tab}
            onChange={setTab}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchField value={search} onChange={setSearch} placeholder={t('users.searchPlaceholder')} className="flex-1 min-w-[220px]" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-40" label={t('shared.status')}>
            <option value="ALL">{t('shared.allStatuses')}</option>
            <option value="ACTIVE">{t('users.status.ACTIVE')}</option>
            <option value="INACTIVE">{t('users.status.INACTIVE')}</option>
          </Select>
          <Select value={lastLogin} onChange={(e) => setLastLogin(e.target.value)} className="w-48" label={t('users.lastLogin')}>
            <option value="ALL">{t('users.lastLoginFilter.ALL')}</option>
            {['LAST_7_DAYS', 'LAST_30_DAYS', 'OVER_30_DAYS', 'NEVER'].map((key) => (
              <option key={key} value={key}>
                {t(`users.lastLoginFilter.${key}`)}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-44" label={t('shared.sort')}>
            {['RECENT', 'NAME', 'LAST_LOGIN'].map((key) => (
              <option key={key} value={key}>
                {t(`users.sort.${key}`)}
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
          <div className={isFetching && !data ? 'opacity-60' : ''}>
            <TableShell>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>{t('users.columns.user')}</Th>
                  <Th>{t('users.columns.role')}</Th>
                  <Th>{t('users.columns.organization')}</Th>
                  <Th>{t('users.columns.location')}</Th>
                  <Th>{t('users.columns.status')}</Th>
                  <Th>{t('users.columns.lastLogin')}</Th>
                  <Th className="text-end">{t('table.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {data?.items.length === 0 && <EmptyRow colSpan={8} message={t('users.empty')} />}
                {data?.items.map((user, index) => (
                  <tr key={user.id} className="hover:bg-[#FBF9F4] cursor-pointer" onClick={() => openUser(user.id)}>
                    <Td className="text-[#7C8A82] tabular-nums">{formatNumber((page - 1) * pageSize + index + 1, lang)}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <Avatar name={user.name} src={user.avatarUrl} size={34} />
                        <div className="min-w-0">
                          <p className="font-bold text-[#0C261B] truncate">{user.name}</p>
                          <p className="text-xs text-[#6B7A71] truncate">{user.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={ROLE_TONE[user.role]} dot={false}>
                        {t(`roles.${user.role}`)}
                      </Pill>
                    </Td>
                    <Td className="whitespace-nowrap">{user.organization ?? '—'}</Td>
                    <Td className="whitespace-nowrap">
                      {user.displayLocation ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#7C8A82]" />
                          {user.displayLocation}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <Pill tone={user.isActive ? 'green' : 'neutral'}>{t(`users.status.${user.isActive ? 'ACTIVE' : 'INACTIVE'}`)}</Pill>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {user.lastLoginAt ? (
                        <>
                          <p>{formatDate(user.lastLoginAt, lang)}</p>
                          <p className="text-xs text-[#7C8A82]">{formatTime(user.lastLoginAt, lang)}</p>
                        </>
                      ) : (
                        <span className="text-[#9AA69F]">{t('users.neverLoggedIn')}</span>
                      )}
                    </Td>
                    <Td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        label={t('table.actions')}
                        items={[
                          { label: t('actions.viewDetails'), icon: <Eye className="w-4 h-4" />, onClick: () => openUser(user.id) },
                          { label: t('actions.edit'), icon: <Pencil className="w-4 h-4" />, onClick: () => setEditing(user) },
                          { label: t('actions.resetPassword'), icon: <KeyRound className="w-4 h-4" />, onClick: () => setResetting(user) },
                          {
                            label: t(user.isActive ? 'actions.deactivate' : 'actions.activate'),
                            icon: <Power className="w-4 h-4" />,
                            danger: user.isActive,
                            hidden: user.id === me?.id,
                            onClick: () => setToggling(user),
                          },
                        ]}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            {data && <Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} onPageSize={setPageSize} />}
          </div>
        )}
      </Card>

      <UserDrawer
        userId={selectedId}
        onClose={() => openUser(null)}
        onEdit={(user) => setEditing(user)}
        onReset={(user) => setResetting(user)}
        onToggle={(user) => setToggling(user)}
        currentUserId={me?.id}
      />

      {editing && (
        <UserFormDialog
          user={editing === 'new' ? null : editing}
          currentUserId={me?.id}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null);
            toast.success(message);
          }}
        />
      )}
      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onDone={() => {
            setResetting(null);
            toast.success(t('users.toasts.passwordReset'));
          }}
        />
      )}
      {toggling && (
        <ToggleStatusDialog
          user={toggling}
          onClose={() => setToggling(null)}
          onDone={(message) => {
            setToggling(null);
            toast.success(message);
          }}
          onError={(message) => toast.error(message)}
        />
      )}
      <Toast message={toast.toast?.message ?? null} tone={toast.toast?.tone} onClose={toast.clear} />
    </div>
  );
};

const UserDrawer: React.FC<{
  userId: string | null;
  onClose: () => void;
  onEdit: (user: AdminUser) => void;
  onReset: (user: AdminUser) => void;
  onToggle: (user: AdminUser) => void;
  currentUserId?: string;
}> = ({ userId, onClose, onEdit, onReset, onToggle, currentUserId }) => {
  const { t, i18n } = useTranslation('console');
  const lang = i18n.language;
  const { data: user, isLoading } = useAdminUser(userId);

  return (
    <SidePanel
      open={!!userId}
      onClose={onClose}
      title={t('users.drawer.title')}
      footer={
        user && (
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" size="sm" icon={<KeyRound className="w-4 h-4" />} onClick={() => onReset(user)}>
              {t('actions.resetPassword')}
            </Button>
            {user.id !== currentUserId && (
              <Button variant={user.isActive ? 'danger' : 'secondary'} size="sm" icon={<Power className="w-4 h-4" />} onClick={() => onToggle(user)}>
                {t(user.isActive ? 'actions.deactivate' : 'actions.activate')}
              </Button>
            )}
            <Button size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => onEdit(user)}>
              {t('actions.edit')}
            </Button>
          </div>
        )
      }
    >
      {isLoading && <p className="p-5 text-sm text-gray-400">{t('states.loading')}</p>}
      {user && (
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size={56} />
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-[#0C261B] truncate">{user.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Pill tone={ROLE_TONE[user.role]} dot={false}>
                  {t(`roles.${user.role}`)}
                </Pill>
                <Pill tone={user.isActive ? 'green' : 'neutral'}>{t(`users.status.${user.isActive ? 'ACTIVE' : 'INACTIVE'}`)}</Pill>
                {user.twoFactorEnabled && (
                  <Pill tone="blue" icon={<BadgeCheck className="w-3 h-3" />}>
                    {t('users.twoFactor')}
                  </Pill>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#9AA69F] mb-1">{t('users.drawer.information')}</p>
            <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label={t('users.fields.email')}>
              {user.email}
            </InfoRow>
            <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label={t('users.fields.phone')}>
              {user.phone ?? '—'}
            </InfoRow>
            <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label={t('users.fields.location')}>
              {user.displayLocation ?? '—'}
            </InfoRow>
            <InfoRow icon={<Users className="w-3.5 h-3.5" />} label={t('users.columns.organization')}>
              {user.producer ? <Link to={`/admin/producteurs/${user.producer.id}`} className="text-[#17693F] hover:underline">{user.organization}</Link> : (user.organization ?? '—')}
            </InfoRow>
            <InfoRow label={t('users.fields.createdAt')}>{formatDate(user.createdAt, lang)}</InfoRow>
            <InfoRow label={t('users.columns.lastLogin')}>{user.lastLoginAt ? formatDateTime(user.lastLoginAt, lang) : t('users.neverLoggedIn')}</InfoRow>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#9AA69F]">
                {t('users.drawer.activity')} · {formatNumber(user.activityCount, lang)}
              </p>
              <Link to={`/admin/journal?user=${user.id}`} className="text-xs font-bold text-[#17693F] hover:underline">
                {t('actions.viewAll')}
              </Link>
            </div>
            {user.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400">{t('states.noData')}</p>
            ) : (
              <ul className="space-y-2">
                {user.recentActivity.map((log) => {
                  const style = ACTION_TYPE_STYLE[log.actionType ?? 'UPDATE'];
                  return (
                    <li key={log.id} className="flex items-start gap-2.5">
                      <style.icon className="w-4 h-4 text-[#17693F] mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#0C261B] truncate">{describeAction(t, log)}</p>
                        <p className="text-xs text-[#7C8A82] truncate">
                          {formatRelative(log.createdAt, lang)}
                          {log.ipAddress ? ` · ${log.ipAddress}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </SidePanel>
  );
};

const UserFormDialog: React.FC<{
  user: AdminUser | null;
  currentUserId?: string;
  onClose: () => void;
  onDone: (message: string) => void;
}> = ({ user, currentUserId, onClose, onDone }) => {
  const { t } = useTranslation('console');
  const create = useCreateUser();
  const update = useUpdateUser();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user && isStaff(user.role) ? user.role : 'VERIFICATION_TEAM') as StaffRole,
    phone: user?.phone ?? '',
    location: user?.location ?? '',
  });
  const [error, setError] = useState('');
  const canChangeRole = !user || (isStaff(user.role) && user.id !== currentUserId);
  const pending = create.isPending || update.isPending;

  const valid = useMemo(
    () => form.name.trim().length >= 2 && (user || (/.+@.+\..+/.test(form.email) && form.password.length >= 8)),
    [form, user],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          name: form.name,
          phone: form.phone,
          location: form.location,
          ...(canChangeRole ? { role: form.role } : {}),
        });
        onDone(t('users.toasts.updated'));
      } else {
        await create.mutateAsync({ ...form, email: form.email.trim() });
        onDone(t('users.toasts.created'));
      }
    } catch (err) {
      setError(errorMessage(err, t('states.saveFailed')));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={user ? t('users.form.editTitle') : t('users.form.createTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form="user-form" loading={pending} disabled={!valid}>
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
        <Field label={t('users.fields.name')} required className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label={t('users.fields.email')} required={!user} className="sm:col-span-2">
          <Input type="email" value={form.email} disabled={!!user} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        {!user && (
          <Field label={t('users.fields.password')} required hint={t('users.form.passwordHint')} className="sm:col-span-2">
            <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
        )}
        <Field label={t('users.fields.role')} required hint={!canChangeRole ? t('users.form.roleLocked') : undefined} className="sm:col-span-2">
          {canChangeRole ? (
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </Select>
          ) : (
            <Input value={user ? t(`roles.${user.role}`) : ''} disabled />
          )}
        </Field>
        <Field label={t('users.fields.phone')}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={t('users.fields.location')}>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
        {!user && <p className="sm:col-span-2 text-xs text-[#6B7A71]">{t('users.form.staffOnly')}</p>}
        {error && <p className="sm:col-span-2 text-xs font-semibold text-[#B42323] bg-[#FDF2F2] border border-[#F3CFCF] rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Dialog>
  );
};

const ResetPasswordDialog: React.FC<{ user: AdminUser; onClose: () => void; onDone: () => void }> = ({ user, onClose, onDone }) => {
  const { t } = useTranslation('console');
  const reset = useResetUserPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const valid = password.length >= 8 && password === confirm;

  return (
    <Dialog
      open
      size="sm"
      onClose={onClose}
      title={t('users.reset.title', { name: user.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            loading={reset.isPending}
            disabled={!valid}
            onClick={async () => {
              try {
                await reset.mutateAsync({ id: user.id, password });
                onDone();
              } catch (err) {
                setError(errorMessage(err, t('states.saveFailed')));
              }
            }}
          >
            {t('actions.resetPassword')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#3F4A44] mb-3">{t('users.reset.description')}</p>
      <div className="space-y-3">
        <Field label={t('users.fields.newPassword')} hint={t('users.form.passwordHint')}>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label={t('users.fields.confirmPassword')} error={confirm && confirm !== password ? t('users.reset.mismatch') : undefined}>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="text-xs font-semibold text-[#B42323]">{error}</p>}
      </div>
    </Dialog>
  );
};

const ToggleStatusDialog: React.FC<{
  user: AdminUser;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}> = ({ user, onClose, onDone, onError }) => {
  const { t } = useTranslation('console');
  const setStatus = useSetUserStatus();
  const deactivate = user.isActive;
  return (
    <Dialog
      open
      size="sm"
      onClose={onClose}
      title={t(deactivate ? 'users.toggle.deactivateTitle' : 'users.toggle.activateTitle', { name: user.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant={deactivate ? 'danger' : 'primary'}
            loading={setStatus.isPending}
            onClick={async () => {
              try {
                await setStatus.mutateAsync({ id: user.id, isActive: !deactivate });
                onDone(t(deactivate ? 'users.toasts.deactivated' : 'users.toasts.activated'));
              } catch (err) {
                onClose();
                onError(errorMessage(err, t('states.saveFailed')));
              }
            }}
          >
            {t(deactivate ? 'actions.deactivate' : 'actions.activate')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#3F4A44]">{t(deactivate ? 'users.toggle.deactivateText' : 'users.toggle.activateText')}</p>
    </Dialog>
  );
};
