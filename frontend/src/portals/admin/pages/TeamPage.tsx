import React, { useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { useTeamUsers, useCreateStaff, useSetUserActive } from '../hooks/useTeam';
import { Card, Button, Input, Select, Modal, Badge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import type { Role } from '../../../lib/api-types';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'مسؤول',
  VERIFICATION_TEAM: 'فريق التحقق',
  FIELD_AGENT: 'عون ميداني',
  PRODUCER: 'منتج',
  CONSUMER: 'مستهلك',
};

export const TeamPage: React.FC = () => {
  const { data: users, isLoading } = useTeamUsers();
  const createStaff = useCreateStaff();
  const setActive = useSetUserActive();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VERIFICATION_TEAM' as 'ADMIN' | 'VERIFICATION_TEAM' | 'FIELD_AGENT' });

  const staffUsers = (users ?? []).filter((u) => u.role !== 'PRODUCER' && u.role !== 'CONSUMER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createStaff.mutateAsync(form);
      setForm({ name: '', email: '', password: '', role: 'VERIFICATION_TEAM' });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر إنشاء الحساب.');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await setActive.mutateAsync({ id, isActive: !current });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0C261B]">الفريق والمستخدمون</h1>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4" />
          حساب جديد
        </Button>
      </div>
      <p className="text-gray-500 mb-6">حسابات المسؤولين، فريق التحقق، والأعوان الميدانيين.</p>

      {isLoading && <p className="text-sm text-gray-400">جارٍ التحميل...</p>}
      {!isLoading && staffUsers.length === 0 && (
        <Card>
          <EmptyState title="لا يوجد أعضاء فريق بعد" />
        </Card>
      )}

      <div className="space-y-3">
        {staffUsers.map((u) => (
          <Card key={u.id} className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0C261B]">{u.name}</p>
              <p className="text-xs text-gray-400">{u.email} · {ROLE_LABELS[u.role]}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'نشط' : 'موقوف'}</Badge>
              <button
                onClick={() => toggleActive(u.id, u.isActive)}
                className={`p-2 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center ${
                  u.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                }`}
                aria-label={u.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="حساب داخلي جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input label="الاسم الكامل" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="البريد الإلكتروني" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="كلمة المرور" type="password" minLength={8} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <Select label="الدور" required value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}>
            <option value="VERIFICATION_TEAM">فريق التحقق</option>
            <option value="FIELD_AGENT">عون ميداني</option>
            <option value="ADMIN">مسؤول</option>
          </Select>
          <Button type="submit" fullWidth isLoading={createStaff.isPending}>
            إنشاء الحساب
          </Button>
        </form>
      </Modal>
    </div>
  );
};
