import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, EyeOff } from 'lucide-react';
import {
  useAdminCategories,
  useCreateCategorie,
  useUpdateCategorie,
  useDeleteCategorie,
} from '../hooks/useAdminCategories';
import { Card, Button, Input, Textarea, Select, Modal, Badge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import type { Categorie } from '../../../lib/api-types';

const EMPTY_FORM = { nom: '', description: '', imageUrl: '', ordre: 0, parentId: '', actif: true };

export const CategoriesPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { data: categories, isLoading } = useAdminCategories();
  const createCategorie = useCreateCategorie();
  const updateCategorie = useUpdateCategorie();
  const deleteCategorie = useDeleteCategorie();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Categorie | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const rootCategories = (categories ?? []).filter((c) => !c.parentId);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setIsOpen(true);
  };

  const openEdit = (c: Categorie) => {
    setEditing(c);
    setForm({
      nom: c.nom,
      description: c.description ?? '',
      imageUrl: c.imageUrl ?? '',
      ordre: c.ordre,
      parentId: c.parentId ?? '',
      actif: c.actif,
    });
    setError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      nom: form.nom,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      ordre: Number(form.ordre),
      parentId: form.parentId || undefined,
      actif: form.actif,
    };
    try {
      if (editing) {
        await updateCategorie.mutateAsync({ id: editing.id, ...payload });
      } else {
        await createCategorie.mutateAsync(payload);
      }
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:categories.saveError'));
    }
  };

  const handleDelete = async (c: Categorie) => {
    setError('');
    try {
      await deleteCategorie.mutateAsync(c.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:categories.deleteError'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0C261B]">{t('admin:nav.categories')}</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          {t('admin:categories.new')}
        </Button>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && rootCategories.length === 0 && (
        <Card>
          <EmptyState title={t('admin:categories.empty')} />
        </Card>
      )}

      <div className="space-y-3">
        {rootCategories.map((cat) => (
          <Card key={cat.id}>
            <CategoryRow categorie={cat} onEdit={openEdit} onDelete={handleDelete} />
            {(cat.children ?? []).length > 0 && (
              <div className="mt-3 ps-6 border-s-2 border-[#EAE1D2] space-y-3">
                {cat.children!.map((child) => (
                  <CategoryRow key={child.id} categorie={child} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? t('admin:categories.edit') : t('admin:categories.new')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('admin:categories.name')} required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          <Textarea label={t('admin:categories.descriptionOptional')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input label={t('admin:categories.imageUrlOptional')} value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          <Select
            label={t('admin:categories.parentOptional')}
            value={form.parentId}
            onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
          >
            <option value="">{t('admin:categories.rootCategory')}</option>
            {(categories ?? [])
              .filter((c) => !c.parentId && c.id !== editing?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
          </Select>
          <Input
            label={t('admin:categories.displayOrder')}
            type="number"
            value={form.ordre}
            onChange={(e) => setForm((f) => ({ ...f, ordre: Number(e.target.value) }))}
          />
          <label className="flex items-center gap-2 text-sm font-bold text-[#0C261B]">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
              className="w-4 h-4"
            />
            {t('admin:categories.activeLabel')}
          </label>
          <Button type="submit" fullWidth isLoading={createCategorie.isPending || updateCategorie.isPending}>
            {t('common:actions.save')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

const CategoryRow: React.FC<{ categorie: Categorie; onEdit: (c: Categorie) => void; onDelete: (c: Categorie) => void }> = ({
  categorie,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <p className="font-bold text-[#0C261B] truncate">{categorie.nom}</p>
        {!categorie.actif && (
          <Badge tone="gray" icon={<EyeOff className="w-3 h-3" />}>
            {t('admin:categories.inactive')}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(categorie)}
          className="p-2 rounded-lg text-gray-400 hover:bg-[#FAF6EE] hover:text-[#0C261B] min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label={t('common:actions.edit')}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(categorie)}
          className="p-2 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label={t('common:actions.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
