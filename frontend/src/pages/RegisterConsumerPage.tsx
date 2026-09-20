import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';
import { Button, Input, Alert } from '../design-system';
import { Logo } from '../components/Logo';

export const RegisterConsumerPage: React.FC = () => {
  const { t } = useTranslation(['auth']);
  const { registerConsumer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', country: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await registerConsumer(form);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('auth:register.emailTaken'));
      } else {
        setError(t('auth:register.genericError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6EE] px-4 py-10">
      <Link to="/" className="mb-8">
        <Logo compact />
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-[#EAE1D2] p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#0C261B] mb-1 text-center">{t('auth:registerConsumer.title')}</h1>
        <p className="text-sm text-gray-500 text-center mb-6">{t('auth:registerConsumer.subtitle')}</p>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('auth:register.fullNameLabel')} required value={form.name} onChange={update('name')} />
          <Input
            label={t('auth:login.emailLabel')}
            type="email"
            required
            value={form.email}
            onChange={update('email')}
          />
          <Input
            label={t('auth:login.passwordLabel')}
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={update('password')}
            hint={t('auth:register.passwordHint')}
          />
          <Input label={t('auth:registerConsumer.countryLabel')} value={form.country} onChange={update('country')} />
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            {t('auth:register.submitButton')}
          </Button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          {t('auth:register.haveAccount')}{' '}
          <Link to="/connexion" className="font-bold text-[#D49B37] hover:text-[#C68A28]">
            {t('auth:register.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
};
