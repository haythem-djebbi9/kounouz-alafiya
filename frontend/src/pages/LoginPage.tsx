import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth-context';
import { ApiError, NetworkError } from '../lib/api';
import { postLoginPath } from '../lib/role-routing';
import { Button, Input, Alert } from '../design-system';
import { Logo } from '../components/Logo';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth']);
  const { login, completeTwoFactorLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const from = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (twoFactorToken) {
        const user = await completeTwoFactorLogin(twoFactorToken, code);
        navigate(postLoginPath(user.role, from), { replace: true });
        return;
      }
      const result = await login(email, password);
      if (result.twoFactorToken) {
        setTwoFactorToken(result.twoFactorToken);
        return;
      }
      navigate(postLoginPath(result.user.role, from), { replace: true });
    } catch (err) {
      if (twoFactorToken && err instanceof ApiError && err.status === 401) {
        setError(t('auth:twoFactor.invalidCode'));
      } else if (err instanceof NetworkError) {
        setError(t('auth:login.networkError'));
      } else if (err instanceof ApiError && err.status === 401) {
        setError(t('auth:login.invalidCredentials'));
      } else {
        setError(t('auth:login.errorRetry'));
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
        <h1 className="text-xl font-bold text-[#0C261B] mb-1 text-center">{t('auth:login.formTitle')}</h1>
        <p className="text-sm text-gray-500 text-center mb-6">{t('auth:login.formSubtitle')}</p>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}

        {twoFactorToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">{t('auth:twoFactor.prompt')}</p>
            <Input
              label={t('auth:twoFactor.codeLabel')}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="text-center tracking-[0.4em] font-bold"
            />
            <Button type="submit" fullWidth isLoading={isSubmitting} disabled={code.length !== 6}>
              {t('auth:twoFactor.submit')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setTwoFactorToken(null);
                setCode('');
                setError('');
              }}
              className="w-full text-sm font-bold text-[#D49B37] hover:text-[#C68A28]"
            >
              {t('auth:twoFactor.back')}
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('auth:login.emailLabel')}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
          />
          <Input
            label={t('auth:login.passwordLabel')}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            {t('auth:login.submitCta')}
          </Button>
        </form>
        )}

        <p className="text-sm text-gray-500 text-center mt-6">{t('auth:login.noAccount')}</p>
        <div className="flex flex-col items-center gap-1.5 mt-2">
          <Link to="/inscription/client" className="text-sm font-bold text-[#D49B37] hover:text-[#C68A28]">
            {t('auth:login.registerConsumerLink')}
          </Link>
          <Link to="/inscription/producteur" className="text-sm font-bold text-[#D49B37] hover:text-[#C68A28]">
            {t('auth:login.registerProducerLink')}
          </Link>
        </div>
      </div>
    </div>
  );
};
