import React, { useEffect, useState } from 'react';
import { useMyProfile, useUpdateMyProfile } from './hooks';
import { Card, Input, Textarea, Button, Alert, Badge } from '../../design-system';
import { ShieldCheck } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { data: producer, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [form, setForm] = useState({ farmName: '', location: '', description: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (producer) {
      setForm({
        farmName: producer.farmName,
        location: producer.location,
        description: producer.description ?? '',
      });
    }
  }, [producer]);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile.mutateAsync(form);
    setSaved(true);
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0C261B]">ملفي الشخصي</h1>
        {producer?.isVerified && (
          <Badge tone="green" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            منتج موثّق
          </Badge>
        )}
      </div>

      <Card>
        {saved && <Alert tone="success" className="mb-4">تم حفظ التعديلات.</Alert>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="اسم المنحل / المزرعة" required value={form.farmName} onChange={update('farmName')} />
          <Input label="الموقع" required value={form.location} onChange={update('location')} />
          <Textarea
            label="نبذة عن المنحل (اختياري)"
            value={form.description}
            onChange={update('description')}
            placeholder="حدّثنا قليلاً عن مزرعتك وطريقة عملك"
          />
          <Button type="submit" isLoading={updateProfile.isPending}>
            حفظ التعديلات
          </Button>
        </form>
      </Card>
    </div>
  );
};
