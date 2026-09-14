import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutGrid, FileText, Package, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/Logo';
import { NotificationBell } from '../../components/NotificationBell';

const NAV_ITEMS = [
  { to: '/producteur', label: 'لوحة التحكم', icon: LayoutGrid, end: true },
  { to: '/producteur/demandes', label: 'طلباتي', icon: FileText },
  { to: '/producteur/produits', label: 'منتجاتي', icon: Package },
  { to: '/producteur/profil', label: 'ملفي الشخصي', icon: User },
];

export const ProducerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF6EE] flex flex-col lg:flex-row">
      {/* Barre mobile */}
      <header className="lg:hidden flex items-center justify-between bg-white border-b border-[#EAE1D2] px-4 py-3 sticky top-0 z-30">
        <Logo compact />
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg text-[#0C261B] hover:bg-[#FAF6EE] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="القائمة"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Navigation latérale (desktop) / déroulante (mobile) */}
      <nav
        className={`${menuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0 bg-white border-e border-[#EAE1D2] lg:min-h-screen`}
      >
        <div className="hidden lg:flex items-center justify-between px-6 py-6 border-b border-[#EAE1D2]">
          <Link to="/">
            <Logo compact />
          </Link>
          <NotificationBell />
        </div>

        <div className="px-4 py-4 border-b border-[#EAE1D2]">
          <p className="text-sm font-bold text-[#0C261B]">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.producer?.farmName}</p>
        </div>

        <div className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors min-h-[44px] ${
                  isActive ? 'bg-[#0C261B] text-white' : 'text-[#0C261B] hover:bg-[#FAF6EE]'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors min-h-[44px]"
          >
            <LogOut className="w-4.5 h-4.5" />
            تسجيل الخروج
          </button>
        </div>
      </nav>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
