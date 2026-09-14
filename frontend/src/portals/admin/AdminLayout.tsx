import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  FileText,
  TestTube,
  ShieldCheck,
  FlaskConical,
  BadgeCheck,
  Layers,
  PackageCheck,
  ShoppingBag,
  FolderTree,
  QrCode,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/Logo';
import type { Role } from '../../lib/api-types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'لوحة التحكم', icon: LayoutGrid, end: true },
  { to: '/admin/producteurs', label: 'المنتجون', icon: Users },
  { to: '/admin/demandes', label: 'الطلبات', icon: FileText },
  { to: '/admin/echantillons', label: 'العينات', icon: TestTube },
  { to: '/admin/scelles', label: 'الأختام', icon: ShieldCheck },
  { to: '/admin/laboratoire', label: 'المخبر', icon: FlaskConical },
  { to: '/admin/verification', label: 'التحقق', icon: BadgeCheck },
  { to: '/admin/lots', label: 'الدفعات', icon: Layers },
  { to: '/admin/emballage', label: 'التعبئة', icon: PackageCheck },
  { to: '/admin/produits', label: 'المنتجات', icon: ShoppingBag },
  { to: '/admin/categories', label: 'الفئات', icon: FolderTree },
  { to: '/admin/qr-codes', label: 'رموز QR', icon: QrCode },
  { to: '/admin/rapports', label: 'التقارير', icon: BarChart3 },
  { to: '/admin/equipe', label: 'الفريق والمستخدمون', icon: UserCog, roles: ['ADMIN'] },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF6EE] flex flex-col lg:flex-row">
      <header className="lg:hidden flex items-center justify-between bg-white border-b border-[#EAE1D2] px-4 py-3 sticky top-0 z-30">
        <Logo compact />
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 rounded-lg text-[#0C261B] hover:bg-[#FAF6EE] min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="القائمة"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <nav
        className={`${menuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0 bg-white border-e border-[#EAE1D2] lg:min-h-screen lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto`}
      >
        <div className="hidden lg:flex items-center px-6 py-6 border-b border-[#EAE1D2]">
          <Link to="/">
            <Logo compact />
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-[#EAE1D2]">
          <p className="text-sm font-bold text-[#0C261B]">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.role === 'ADMIN' ? 'مسؤول' : 'فريق التحقق'}</p>
        </div>

        <div className="p-3 space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors min-h-[44px] ${
                  isActive ? 'bg-[#0C261B] text-white' : 'text-[#0C261B] hover:bg-[#FAF6EE]'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors min-h-[44px]"
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
