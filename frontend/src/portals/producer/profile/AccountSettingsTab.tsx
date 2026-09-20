import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Check,
  CircleCheck,
  Circle,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  Megaphone,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  ShoppingCart,
} from 'lucide-react';
import { Modal } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../i18n';
import {
  useNotificationPreferences,
  useToggleNotificationPreference,
  type NotificationType,
} from '../../../lib/notification-hooks';
import {
  useChangeEmail,
  useDeleteAccount,
  useDisableTwoFactor,
  useEnableTwoFactor,
  useSetupTwoFactor,
  useUpdateMyProfile,
} from '../hooks';
import { PAYMENT_METHODS } from '../constants';
import { Btn, Field, NAVY, Notice, Panel, SelectInput, TextInput, Toggle } from '../ui';
import { formatDate } from '../utils';
import type { ProducerProfile } from '../types';

const NOTIFICATION_GROUPS: { key: string; icon: React.ReactNode; types: NotificationType[] }[] = [
  { key: 'account', icon: <UserRound className="w-4.5 h-4.5" />, types: ['DOCUMENT_REVIEWED', 'SUPPORT_TICKET_UPDATE'] },
  {
    key: 'verification',
    icon: <FlaskConical className="w-4.5 h-4.5" />,
    types: ['REQUEST_ACCEPTED', 'SAMPLE_RECEIVED', 'ANALYSIS_COMPLETED', 'VERIFICATION_RESULT', 'BATCH_CREATED'],
  },
  { key: 'sales', icon: <ShoppingCart className="w-4.5 h-4.5" />, types: ['PRODUCT_PUBLISHED', 'NEW_ORDER', 'PAYOUT_PAID'] },
];

const PASSWORD_RULES: { key: string; test: (v: string) => boolean }[] = [
  { key: 'length', test: (v) => v.length >= 8 },
  { key: 'upper', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', test: (v) => /[a-z]/.test(v) },
  { key: 'number', test: (v) => /[0-9]/.test(v) },
  { key: 'special', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

type Feedback = { tone: 'success' | 'error'; text: string } | null;
const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export const AccountSettingsTab: React.FC<{ profile: ProducerProfile }> = ({ profile }) => {
  const { t, i18n } = useTranslation(['producer', 'common']);
  const lang = i18n.language;
  const { user, changePassword, updateProfile } = useAuth();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [modal, setModal] = useState<'email' | 'phone' | '2fa-enable' | '2fa-disable' | 'delete' | null>(null);

  // --- Mot de passe
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);
  const pwdValid = PASSWORD_RULES.every((r) => r.test(pwd.next)) && pwd.next === pwd.confirm && pwd.current.length > 0;

  const submitPassword = async () => {
    setFeedback(null);
    setSavingPwd(true);
    try {
      await changePassword({ currentPassword: pwd.current, newPassword: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      setFeedback({ tone: 'success', text: t('producer:account.password.success') });
    } catch (err) {
      setFeedback({ tone: 'error', text: errorText(err, t('common:status.error')) });
    } finally {
      setSavingPwd(false);
    }
  };

  // --- Langue
  const changeLanguage = async (next: SupportedLanguage) => {
    await i18n.changeLanguage(next);
    try {
      await updateProfile({ language: next });
    } catch {
      // best-effort : l'interface reste dans la langue choisie
    }
  };

  // --- Notifications
  const { data: prefs } = useNotificationPreferences();
  const toggle = useToggleNotificationPreference();
  const muted = new Set(prefs?.mutedTypes ?? []);
  const groupEnabled = (types: NotificationType[]) => types.some((type) => !muted.has(type));
  const setGroup = async (types: NotificationType[], enabled: boolean) => {
    for (const type of types) {
      if (muted.has(type) === enabled) {
        await toggle.mutateAsync({ type, enabled });
      }
    }
  };

  // --- Règlements
  const update = useUpdateMyProfile();
  const [payment, setPayment] = useState({
    paymentMethod: profile.paymentMethod ?? '',
    bankName: profile.bankName ?? '',
    iban: profile.iban ?? '',
  });
  const savePayment = async () => {
    setFeedback(null);
    try {
      await update.mutateAsync({
        paymentMethod: payment.paymentMethod || undefined,
        bankName: payment.bankName,
        ...(payment.iban ? { iban: payment.iban.toUpperCase() } : {}),
      });
      setFeedback({ tone: 'success', text: t('producer:account.payment.saved') });
    } catch (err) {
      setFeedback({ tone: 'error', text: errorText(err, t('common:status.error')) });
    }
  };

  const passwordField = (key: 'current' | 'next' | 'confirm', label: string, placeholder: string) => (
    <Field label={label}>
      <TextInput
        type={showPwd[key] ? 'text' : 'password'}
        value={pwd[key]}
        onChange={(e) => setPwd((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        autoComplete={key === 'current' ? 'current-password' : 'new-password'}
        trailing={
          <button type="button" onClick={() => setShowPwd((s) => ({ ...s, [key]: !s[key] }))} aria-label={t('producer:account.password.toggle')}>
            {showPwd[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />
    </Field>
  );

  const securityRow = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#EEF0EC] last:border-b-0 text-sm">
      <span className="flex items-center gap-2.5 text-[#374151]">{icon}{label}</span>
      <span className="text-end">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {feedback && <Notice tone={feedback.tone} onClose={() => setFeedback(null)}>{feedback.text}</Notice>}

      <div className="grid md:grid-cols-[2fr_1fr] gap-4">
        <div className="relative overflow-hidden rounded-xl border border-[#DCEAE0] bg-[#EEF4EE] min-h-[110px]">
          <img src="/images/beekeeper.jpg" alt="" className="absolute inset-y-0 end-0 w-1/2 h-full object-cover object-left hidden sm:block" />
          <div className="absolute inset-y-0 end-0 w-1/2 bg-gradient-to-r rtl:bg-gradient-to-l from-[#EEF4EE] to-transparent hidden sm:block" />
          <div className="relative flex items-center gap-4 p-5">
            <span className="w-14 h-14 rounded-full bg-[#0B4A2F] text-white flex items-center justify-center shrink-0">
              <Settings className="w-7 h-7" />
            </span>
            <div>
              <p className={`text-lg font-bold ${NAVY}`}>{t('producer:account.bannerTitle')}</p>
              <p className="text-sm text-[#374151]">{t('producer:account.bannerBody')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#F5E5C2] bg-[#FFF3DA] p-5">
          <ShieldCheck className="w-10 h-10 text-[#D08C1A] shrink-0" />
          <div>
            <p className={`font-bold ${NAVY}`}>{t('producer:account.secureTitle')}</p>
            <p className="text-sm text-[#374151]">{t('producer:account.secureBody')}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="space-y-4">
          <Panel title={t('producer:account.login.title')} subtitle={t('producer:account.login.subtitle')} icon={<Mail className="w-5 h-5" />}>
            <div className="space-y-3">
              <Field label={t('producer:profile.personal.email')}>
                <div className="flex gap-2">
                  <TextInput value={user?.email ?? ''} disabled dir="ltr" className="flex-1" />
                  <Btn variant="outline" size="sm" className="min-h-[42px] min-w-[90px]" onClick={() => setModal('email')}>{t('producer:account.change')}</Btn>
                </div>
              </Field>
              <Field label={t('producer:profile.personal.phone')}>
                <div className="flex gap-2">
                  <TextInput value={profile.phone ?? t('producer:account.notSet')} disabled dir="ltr" leading={<span aria-hidden>🇹🇳</span>} className="flex-1" />
                  <Btn variant="outline" size="sm" className="min-h-[42px] min-w-[90px]" onClick={() => setModal('phone')}>{t('producer:account.change')}</Btn>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title={t('producer:account.password.title')} subtitle={t('producer:account.password.subtitle')} icon={<Lock className="w-5 h-5" />}>
            <div className="grid md:grid-cols-[1fr_220px] gap-4">
              <div className="space-y-3">
                {passwordField('current', t('producer:account.password.current'), t('producer:account.password.currentPlaceholder'))}
                {passwordField('next', t('producer:account.password.new'), t('producer:account.password.newPlaceholder'))}
                {passwordField('confirm', t('producer:account.password.confirm'), t('producer:account.password.confirmPlaceholder'))}
                {pwd.confirm && pwd.next !== pwd.confirm && <p className="text-xs font-semibold text-rose-600">{t('producer:account.password.mismatch')}</p>}
              </div>
              <div className="rounded-lg bg-[#F4F6F3] p-4 flex flex-col">
                <p className={`text-sm font-bold mb-2 ${NAVY}`}>{t('producer:account.password.requirements')}</p>
                <ul className="space-y-1.5 flex-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(pwd.next);
                    return (
                      <li key={rule.key} className={`flex items-center gap-2 text-xs ${ok ? 'text-[#17693F]' : 'text-gray-600'}`}>
                        {ok ? <CircleCheck className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        {t(`producer:account.password.rules.${rule.key}`)}
                      </li>
                    );
                  })}
                </ul>
                <Btn className="w-full mt-3" disabled={!pwdValid} loading={savingPwd} onClick={() => void submitPassword()}>
                  {t('producer:account.password.submit')}
                </Btn>
              </div>
            </div>
          </Panel>

          <Panel title={t('producer:account.language.title')} subtitle={t('producer:account.language.subtitle')} icon={<Globe className="w-5 h-5" />}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('producer:account.language.language')}>
                <SelectInput value={lang} onChange={(e) => void changeLanguage(e.target.value as SupportedLanguage)}>
                  {SUPPORTED_LANGUAGES.map((l) => <option key={l} value={l}>{t(`common:language.${l}`)}</option>)}
                </SelectInput>
              </Field>
              <Field label={t('producer:account.language.timezone')} hint={t('producer:account.language.timezoneHint')}>
                <TextInput value="(GMT+1) Tunis" disabled dir="ltr" />
              </Field>
            </div>
          </Panel>

          <Panel title={t('producer:account.payment.title')} subtitle={t('producer:account.payment.subtitle')} icon={<Landmark className="w-5 h-5" />}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('producer:account.payment.method')}>
                <SelectInput value={payment.paymentMethod} onChange={(e) => setPayment((p) => ({ ...p, paymentMethod: e.target.value }))}>
                  <option value="">{t('producer:common.select')}</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`producer:options.payment.${m}`)}</option>)}
                </SelectInput>
              </Field>
              <Field label={t('producer:account.payment.bank')}>
                <TextInput value={payment.bankName} onChange={(e) => setPayment((p) => ({ ...p, bankName: e.target.value }))} placeholder="BIAT" />
              </Field>
              <Field label={t('producer:account.payment.iban')} className="sm:col-span-2" hint={t('producer:account.payment.ibanHint')}>
                <TextInput value={payment.iban} onChange={(e) => setPayment((p) => ({ ...p, iban: e.target.value }))} placeholder="TN59 0000 0000 0000 0000 0000" dir="ltr" />
              </Field>
            </div>
            <div className="flex justify-end mt-4">
              <Btn variant="gold" onClick={() => void savePayment()} loading={update.isPending}>{t('producer:profile.saveChanges')}</Btn>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={t('producer:account.security.title')} subtitle={t('producer:account.security.subtitle')} icon={<ShieldCheck className="w-5 h-5" />}>
            {securityRow(<Mail className="w-4 h-4" />, t('producer:account.security.email'), <span className="text-xs font-semibold text-[#14215B] break-all">{user?.email}</span>)}
            {securityRow(
              <Smartphone className="w-4 h-4" />,
              t('producer:account.security.phone'),
              profile.phone ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#17693F]"><CircleCheck className="w-4 h-4" />{t('producer:account.security.provided')}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Circle className="w-4 h-4" />{t('producer:account.notSet')}</span>
              ),
            )}
            {securityRow(
              <KeyRound className="w-4 h-4" />,
              t('producer:account.security.password'),
              <span className="text-xs text-gray-600">
                {user?.passwordChangedAt
                  ? t('producer:account.security.lastChanged', { date: formatDate(user.passwordChangedAt, lang) })
                  : t('producer:account.security.neverChanged')}
              </span>,
            )}
            {securityRow(
              <Lock className="w-4 h-4" />,
              t('producer:account.security.twoFactor'),
              user?.twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#17693F]"><CircleCheck className="w-4 h-4" />{t('producer:account.security.enabled')}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Circle className="w-4 h-4" />{t('producer:account.security.notEnabled')}</span>
              ),
            )}
            {user?.twoFactorEnabled ? (
              <Btn variant="danger" className="w-full mt-3" onClick={() => setModal('2fa-disable')}>{t('producer:account.twoFactor.disable')}</Btn>
            ) : (
              <Btn className="w-full mt-3" onClick={() => setModal('2fa-enable')}>
                <ShieldCheck className="w-4 h-4" />
                {t('producer:account.twoFactor.enable')}
              </Btn>
            )}
          </Panel>

          <Panel title={t('producer:account.notifications.title')} subtitle={t('producer:account.notifications.subtitle')} icon={<Bell className="w-5 h-5" />}>
            {NOTIFICATION_GROUPS.map((group) => (
              <div key={group.key} className="flex items-center justify-between gap-3 py-3 border-b border-[#EEF0EC] last:border-b-0">
                <span className="flex items-start gap-2.5">
                  <span className="text-[#14215B] mt-0.5">{group.icon}</span>
                  <span>
                    <span className={`block text-sm font-semibold ${NAVY}`}>{t(`producer:account.notifications.groups.${group.key}.title`)}</span>
                    <span className="block text-xs text-gray-500">{t(`producer:account.notifications.groups.${group.key}.body`)}</span>
                  </span>
                </span>
                <Toggle
                  checked={groupEnabled(group.types)}
                  onChange={(enabled) => void setGroup(group.types, enabled)}
                  disabled={toggle.isPending}
                  label={t(`producer:account.notifications.groups.${group.key}.title`)}
                />
              </div>
            ))}
            <p className="flex items-start gap-2 text-xs text-gray-500 mt-3">
              <Megaphone className="w-4 h-4 shrink-0" />
              {t('producer:account.notifications.inAppOnly')}
            </p>
          </Panel>

          <Panel title={t('producer:account.actions.title')} icon={<Trash2 className="w-5 h-5 text-rose-600" />}>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <p className="text-sm font-bold text-rose-700">{t('producer:account.actions.deleteTitle')}</p>
                <p className="text-xs text-rose-700/80">{t('producer:account.actions.deleteBody')}</p>
              </div>
              <Btn variant="danger" size="sm" onClick={() => setModal('delete')} className="shrink-0">{t('producer:account.actions.deleteCta')}</Btn>
            </div>
          </Panel>
        </div>
      </div>

      <ChangeEmailModal open={modal === 'email'} onClose={() => setModal(null)} onDone={(text) => setFeedback({ tone: 'success', text })} />
      <ChangePhoneModal open={modal === 'phone'} onClose={() => setModal(null)} profile={profile} onDone={(text) => setFeedback({ tone: 'success', text })} />
      {modal === '2fa-enable' && <EnableTwoFactorModal onClose={() => setModal(null)} onDone={(text) => setFeedback({ tone: 'success', text })} />}
      <DisableTwoFactorModal open={modal === '2fa-disable'} onClose={() => setModal(null)} onDone={(text) => setFeedback({ tone: 'success', text })} />
      <DeleteAccountModal open={modal === 'delete'} onClose={() => setModal(null)} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Fenêtres de confirmation
// ---------------------------------------------------------------------------

const ChangeEmailModal: React.FC<{ open: boolean; onClose: () => void; onDone: (msg: string) => void }> = ({ open, onClose, onDone }) => {
  const { t } = useTranslation(['producer', 'common']);
  const changeEmail = useChangeEmail();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await changeEmail.mutateAsync({ newEmail, currentPassword: password });
      onDone(t('producer:account.emailModal.success'));
      setNewEmail('');
      setPassword('');
      onClose();
    } catch (err) {
      setError(errorText(err, t('common:status.error')));
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('producer:account.emailModal.title')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label={t('producer:account.emailModal.newEmail')} required>
          <TextInput type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} dir="ltr" autoComplete="email" />
        </Field>
        <Field label={t('producer:account.password.current')} required hint={t('producer:account.emailModal.hint')}>
          <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Btn>
          <Btn type="submit" loading={changeEmail.isPending}>{t('common:actions.confirm')}</Btn>
        </div>
      </form>
    </Modal>
  );
};

const ChangePhoneModal: React.FC<{ open: boolean; onClose: () => void; profile: ProducerProfile; onDone: (msg: string) => void }> = ({ open, onClose, profile, onDone }) => {
  const { t } = useTranslation(['producer', 'common']);
  const update = useUpdateMyProfile();
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\+?[0-9\s-]{8,20}$/.test(phone)) {
      setError(t('producer:fields.errors.phone'));
      return;
    }
    try {
      await update.mutateAsync({ phone });
      onDone(t('producer:account.phoneModal.success'));
      onClose();
    } catch (err) {
      setError(errorText(err, t('common:status.error')));
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('producer:account.phoneModal.title')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label={t('producer:profile.personal.phone')} required>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 22 123 456" dir="ltr" inputMode="tel" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Btn>
          <Btn type="submit" loading={update.isPending}>{t('common:actions.save')}</Btn>
        </div>
      </form>
    </Modal>
  );
};

const EnableTwoFactorModal: React.FC<{ onClose: () => void; onDone: (msg: string) => void }> = ({ onClose, onDone }) => {
  const { t } = useTranslation(['producer', 'common']);
  const setup = useSetupTwoFactor();
  const enable = useEnableTwoFactor();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Un seul secret par ouverture : en StrictMode l'effet s'exécute deux fois,
  // et un second appel remplacerait le secret affiché dans le QR code.
  const started = React.useRef(false);
  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    setup.mutate(undefined, { onError: (err) => setError(errorText(err, t('common:status.error'))) });
  }, [setup, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await enable.mutateAsync(code);
      onDone(t('producer:account.twoFactor.enabledSuccess'));
      onClose();
    } catch (err) {
      setError(errorText(err, t('common:status.error')));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('producer:account.twoFactor.enableTitle')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <ol className="space-y-2 text-sm text-[#374151] list-decimal ps-5">
          <li>{t('producer:account.twoFactor.step1')}</li>
          <li>{t('producer:account.twoFactor.step2')}</li>
          <li>{t('producer:account.twoFactor.step3')}</li>
        </ol>
        {setup.data ? (
          <div className="flex flex-col items-center gap-2">
            <img src={setup.data.qrDataUrl} alt="QR" className="w-48 h-48 rounded-lg border border-[#E6E8E3]" />
            <p className="text-xs text-gray-500">{t('producer:account.twoFactor.manualKey')}</p>
            <code className="text-xs font-mono font-bold bg-[#F4F6F3] rounded px-2 py-1 break-all text-center" dir="ltr">{setup.data.secret}</code>
          </div>
        ) : (
          !error && <p className="text-sm text-gray-500 text-center">{t('common:status.loading')}</p>
        )}
        <Field label={t('producer:account.twoFactor.code')} required>
          <TextInput value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="text-center tracking-[0.4em] font-bold" dir="ltr" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Btn>
          <Btn type="submit" disabled={code.length !== 6 || !setup.data} loading={enable.isPending}>
            <Check className="w-4 h-4" />
            {t('producer:account.twoFactor.activate')}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};

const DisableTwoFactorModal: React.FC<{ open: boolean; onClose: () => void; onDone: (msg: string) => void }> = ({ open, onClose, onDone }) => {
  const { t } = useTranslation(['producer', 'common']);
  const disable = useDisableTwoFactor();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await disable.mutateAsync({ currentPassword: password, code });
      onDone(t('producer:account.twoFactor.disabledSuccess'));
      setPassword('');
      setCode('');
      onClose();
    } catch (err) {
      setError(errorText(err, t('common:status.error')));
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('producer:account.twoFactor.disableTitle')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label={t('producer:account.password.current')} required>
          <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label={t('producer:account.twoFactor.code')} required>
          <TextInput value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="123456" dir="ltr" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Btn>
          <Btn type="submit" variant="danger" disabled={code.length !== 6 || !password} loading={disable.isPending}>{t('producer:account.twoFactor.disable')}</Btn>
        </div>
      </form>
    </Modal>
  );
};

const DeleteAccountModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useTranslation(['producer', 'common']);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const deleteAccount = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const keyword = t('producer:account.deleteModal.keyword');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await deleteAccount.mutateAsync({ currentPassword: password });
      window.alert(result.outcome === 'DEACTIVATED' ? t('producer:account.deleteModal.deactivated') : t('producer:account.deleteModal.deleted'));
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorText(err, t('common:status.error')));
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('producer:account.deleteModal.title')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <p className="text-sm text-[#374151]">{t('producer:account.deleteModal.body')}</p>
        <p className="text-sm text-[#374151] rounded-lg bg-[#FFF8EA] border border-[#F5E5C2] p-3">{t('producer:account.deleteModal.traceability')}</p>
        <Field label={t('producer:account.password.current')} required>
          <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label={t('producer:account.deleteModal.typeToConfirm', { keyword })} required>
          <TextInput value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="outline" onClick={onClose}>{t('common:actions.cancel')}</Btn>
          <Btn type="submit" variant="danger" disabled={!password || confirmText.trim() !== keyword} loading={deleteAccount.isPending}>
            <Trash2 className="w-4 h-4" />
            {t('producer:account.actions.deleteCta')}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};
