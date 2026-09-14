import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';
import { roleHomePath } from '../lib/role-routing';
import { Button, Input, Alert } from '../design-system';
import { Logo } from '../components/Logo';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(from ?? roleHomePath(user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError('تعذر تسجيل الدخول حالياً. حاول مرة أخرى.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center bg-[#FAF6EE] px-4 py-10">
      <Link to="/" className="mb-8">
        <Logo compact />
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-[#EAE1D2] p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#0C261B] mb-1 text-center">تسجيل الدخول</h1>
        <p className="text-sm text-gray-500 text-center mb-6">أدخل بياناتك للوصول إلى حسابك</p>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="البريد الإلكتروني"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
          />
          <Input
            label="كلمة المرور"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            دخول
          </Button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          ليس لديك حساب؟{' '}
          <Link to="/inscription/producteur" className="font-bold text-[#D49B37] hover:text-[#C68A28]">
            سجّل كمنتج
          </Link>
        </p>
      </div>
    </div>
  );
};
