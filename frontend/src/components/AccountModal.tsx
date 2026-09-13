import React, { useState } from 'react';
import { X, User, Package, MapPin, Heart, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  if (!isOpen) return null;

  const mockOrders = [
    {
      id: 'KZ-2025-9481',
      date: '14 مايو 2025',
      items: 'عسل طبيعي فاخر 500g (×2)، أعواد العافية (×1)',
      total: '415 ر.س',
      status: 'تم التوصيل',
      batchVerified: 'KZ-LUX-500',
    },
    {
      id: 'KZ-2025-8312',
      date: '02 أبريل 2025',
      items: 'باكج العافية للإهداء (×1)',
      total: '380 ر.س',
      status: 'تم التوصيل',
      batchVerified: 'KZ-BOX-2025',
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn">
      <div
        id="account-modal"
        className="w-full max-w-lg bg-[#FAF6EE] rounded-2xl shadow-2xl border border-[#D49B37]/40 overflow-hidden flex flex-col max-h-[85vh] text-right"
      >
        {/* Header */}
        <div className="bg-[#0C261B] text-white p-5 flex items-center justify-between border-b border-[#D49B37]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#163D32] border border-[#D49B37] flex items-center justify-center text-[#D49B37] font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">عبدالعزيز التميمي</h3>
              <p className="text-xs text-[#A3B8B0]">عضوية التميز • عميل موثق ⭐</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#A3B8B0] hover:text-white hover:bg-[#163D32] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-[#EAE1D2] px-5 py-2 flex items-center gap-2 border-b border-[#D5C7B0] shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-[#0C261B] text-white shadow-sm'
                : 'text-[#0C261B] hover:bg-[#FAF6EE]'
            }`}
          >
            الملف الشخصي
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-[#0C261B] text-white shadow-sm'
                : 'text-[#0C261B] hover:bg-[#FAF6EE]'
            }`}
          >
            سجل طلباتي ({mockOrders.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'profile' ? (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-[#EAE1D2] space-y-3">
                <div>
                  <span className="text-[#8C7A60] block font-medium">البريد الإلكتروني:</span>
                  <span className="font-bold text-[#0C261B] text-sm">abdulaziz@example.com</span>
                </div>
                <div>
                  <span className="text-[#8C7A60] block font-medium">رقم الجوال:</span>
                  <span className="font-bold text-[#0C261B] font-mono text-sm" dir="ltr">+966 50 123 4567</span>
                </div>
                <div>
                  <span className="text-[#8C7A60] block font-medium">عنوان التوصيل الافتراضي:</span>
                  <span className="font-bold text-[#0C261B]">حي النرجس، الرياض، المملكة العربية السعودية</span>
                </div>
              </div>

              <div className="bg-[#FAF0DC] p-3.5 rounded-xl border border-[#D49B37]/40 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#D49B37] shrink-0" />
                <div>
                  <span className="font-bold text-[#0C261B] block">برنامج ولاء عافية</span>
                  <span className="text-[#6F827B]">لديك 150 نقطة عافية مؤهلة للخصم في طلبك القادم.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {mockOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-4 rounded-xl border border-[#EAE1D2] shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-[#F2EAE0] pb-2">
                    <span className="font-mono font-bold text-[#0C261B]">#{order.id}</span>
                    <span className="text-[#1E6B56] font-bold bg-[#E7F3EE] px-2 py-0.5 rounded">
                      {order.status}
                    </span>
                  </div>

                  <p className="text-[#576B64] font-medium">{order.items}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F2EAE0] text-[11px]">
                    <span className="text-[#8C7A60]">{order.date}</span>
                    <span className="font-bold text-[#0C261B] font-mono">{order.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#EAE1D2] p-4 border-t border-[#D5C7B0] flex justify-end shrink-0">
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
