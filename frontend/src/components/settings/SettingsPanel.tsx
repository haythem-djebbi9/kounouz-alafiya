import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, Input, Button, Alert } from '../../design-system';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n';
import {
  NOTIFICATION_TYPES,
  useNotificationPreferences,
  useToggleNotificationPreference,
} from '../../lib/notification-hooks';

export const SettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { user, updateProfile, changePassword } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [accountErr, setAccountErr] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountErr(null);
    setAccountMsg(null);
    setSavingAccount(true);
    try {
      await updateProfile({ name });
      setAccountMsg(t('settings:account.saveSuccess'));
    } catch (err) {
      setAccountErr(err instanceof ApiError ? err.message : t('common:status.error'));
    } finally {
      setSavingAccount(false);
    }
  };

  const handleLanguageSelect = async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    try {
      await updateProfile({ language: lang });
    } catch {
      // best-effort
    }
  };

  const { data: preferences } = useNotificationPreferences();
  const toggleMutation = useToggleNotificationPreference();
  const mutedTypes = new Set(preferences?.mutedTypes ?? []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErr(null);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordErr(t('settings:security.mismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordMsg(t('settings:security.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordErr(err instanceof ApiError ? err.message : t('common:status.error'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#0C261B]">{t('settings:title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:account.heading')}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <Input
            label={t('settings:account.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label={t('settings:account.emailLabel')}
            value={user?.email ?? ''}
            disabled
            hint={t('settings:account.emailHint')}
          />
          {accountMsg && <Alert tone="success">{accountMsg}</Alert>}
          {accountErr && <Alert tone="error">{accountErr}</Alert>}
          <Button type="submit" isLoading={savingAccount}>
            {t('common:actions.save')}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:language.heading')}</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = i18n.language === lang;
            return (
              <button
                key={lang}
                onClick={() => handleLanguageSelect(lang)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                  active
                    ? 'bg-[#0C261B] border-[#0C261B] text-white'
                    : 'bg-white border-[#EAE1D2] text-[#0C261B] hover:border-[#D49B37]'
                }`}
              >
                {active && <Check className="w-4 h-4" />}
                {t(`common:language.${lang}`)}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:notifications.heading')}</CardTitle>
          <p className="text-sm text-gray-500 mt-1">{t('settings:notifications.description')}</p>
        </CardHeader>
        <div className="space-y-1">
          {NOTIFICATION_TYPES.map((type) => {
            const enabled = !mutedTypes.has(type);
            return (
              <div key={type} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#EAE1D2] last:border-b-0">
                <span className="text-sm font-semibold text-[#0C261B]">{t(`settings:notifications.types.${type}`)}</span>
                <button
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggleMutation.mutate({ type, enabled: !enabled })}
                  className={`w-11 h-6 rounded-full transition-colors shrink-0 flex items-center px-0.5 ${
                    enabled ? 'bg-[#0C261B] justify-end' : 'bg-gray-300 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 bg-white rounded-full shadow" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:security.heading')}</CardTitle>
        </CardHeader>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label={t('settings:security.currentPassword')}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label={t('settings:security.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label={t('settings:security.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
          {passwordMsg && <Alert tone="success">{passwordMsg}</Alert>}
          {passwordErr && <Alert tone="error">{passwordErr}</Alert>}
          <Button type="submit" isLoading={savingPassword}>
            {t('settings:security.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
};
