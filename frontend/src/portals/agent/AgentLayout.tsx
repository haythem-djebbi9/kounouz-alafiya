import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/Logo';

// Portail mobile-first : un seul écran principal (مهامي) + sous-pages de
// détail. Pas de barre latérale complexe — l'agent terrain travaille
// essentiellement depuis son téléphone, une tâche à la fois.
export const AgentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF6EE]">
      <header className="bg-white border-b border-[#EAE1D2] px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <Link to="/agent">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#0C261B] hidden sm:inline">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-lg text-rose-600 hover:bg-rose-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
