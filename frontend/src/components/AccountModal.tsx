import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, User, LogOut, ShieldCheck, Inbox } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'تعذر تسجيل الدخول.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn">
      <div
        id="account-modal"
        className="w-full max-w-md bg-[#FAF6EE] rounded-2xl shadow-2xl border border-[#D49B37]/40 overflow-hidden flex flex-col max-h-[85vh] text-right"
      >
        <div className="bg-[#0C261B] text-white p-5 flex items-center justify-between border-b border-[#D49B37]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#163D32] border border-[#D49B37] flex items-center justify-center text-[#D49B37] font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{isAuthenticated ? user?.name : 'حسابي'}</h3>
              {isAuthenticated && <p className="text-xs text-[#A3B8B0]">{user?.email}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A3B8B0] hover:text-white hover:bg-[#163D32] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {isAuthenticated ? (
            <>
              <div className="bg-[#FAF0DC] p-3.5 rounded-xl border border-[#D49B37]/40 flex items-center gap-3 text-xs">
                <ShieldCheck className="w-5 h-5 text-[#D49B37] shrink-0" />
                <span className="text-[#576B64]">حساب موثّق لدى كنوز العافية.</span>
              </div>

              <div>
                <p className="text-xs font-bold text-[#0C261B] mb-2">سجل طلباتي</p>
                <div className="py-10 text-center bg-white rounded-xl border border-[#EAE1D2]">
                  <Inbox className="w-8 h-8 text-[#D5C7B0] mx-auto mb-2" />
                  <p className="text-xs text-[#8C7A60]">لا توجد طلبات سابقة بعد.</p>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              {error && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                  {error}
                </p>
              )}
              <div>
                <label className="text-xs font-bold text-[#0C261B] block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D5C7B0] focus:outline-none focus:ring-2 focus:ring-[#C68A28]"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0C261B] block mb-1">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D5C7B0] focus:outline-none focus:ring-2 focus:ring-[#C68A28]"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0C261B] hover:bg-[#143B2B] text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
              </button>
              <p className="text-xs text-center text-[#8C7A60]">
                ليس لديك حساب؟{' '}
                <Link to="/inscription/client" onClick={onClose} className="font-bold text-[#C68A28]">
                  أنشئ حساباً
                </Link>
              </p>
            </form>
          )}
        </div>

        <div className="bg-[#EAE1D2] p-4 border-t border-[#D5C7B0] flex items-center justify-between shrink-0">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0C261B] text-white text-xs font-bold rounded-lg hover:bg-[#16473A]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
