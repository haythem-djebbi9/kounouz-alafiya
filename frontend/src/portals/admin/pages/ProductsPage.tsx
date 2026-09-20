import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { useAdminProducts, useCreateProduct } from '../hooks/useAdminProducts';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { useBatches } from '../hooks/useBatchesAndPackaging';
import { Card, Button, Input, Textarea, Select, Modal, StatusBadge, Alert, EmptyState } from '../../../design-system';
import { ApiError } from '../../../lib/api';
import type { ProductStatut } from '../../../lib/api-types';

const TAB_VALUES: (ProductStatut | 'ALL')[] = ['ALL', 'BROUILLON', 'PUBLIE', 'RUPTURE', 'SUSPENDU'];

const EMPTY_FORM = { categorieId: '', nom: '', description: '', prix: '', stock: '0', gamme: '', batchId: '', images: '' };

export const ProductsPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [tab, setTab] = useState<ProductStatut | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const { data: products, isLoading } = useAdminProducts(tab === 'ALL' ? undefined : tab);
  const { data: categories } = useAdminCategories();
  const { data: batches } = useBatches();
  const createProduct = useCreateProduct();

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const flatCategories = (categories ?? []).flatMap((c) => [c, ...(c.children ?? [])]);

  const filtered = (products ?? []).filter((p) => p.nom.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createProduct.mutateAsync({
        categorieId: form.categorieId,
        nom: form.nom,
        description: form.description || undefined,
        prix: Number(form.prix),
        stock: Number(form.stock),
        gamme: form.gamme || undefined,
        batchId: form.batchId || undefined,
        images: form.images ? form.images.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      setForm(EMPTY_FORM);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:products.createError'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0C261B]">{t('admin:nav.products')}</h1>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('admin:products.new')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {TAB_VALUES.map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors min-h-[40px] ${
                tab === value ? 'bg-[#0C261B] text-white' : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:border-[#D49B37]'
              }`}
            >
              {t(`admin:products.tabs.${value}`)}
            </button>
          ))}
        </div>
        <div className="relative sm:ms-auto sm:max-w-xs w-full">
          <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin:products.searchPlaceholder')}
            className="w-full ps-9 pe-3 py-2.5 text-sm border-2 border-[#EAE1D2] rounded-lg focus:border-[#D49B37] outline-none min-h-[40px]"
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-400">{t('common:status.loading')}</p>}
      {!isLoading && filtered.length === 0 && (
        <Card>
          <EmptyState title={t('admin:products.empty')} />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Link key={p.id} to={`/admin/produits/${p.id}`}>
            <Card className="hover:border-[#D49B37] transition-colors h-full">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-[#0C261B] truncate">{p.nom}</p>
                <StatusBadge kind="product" status={p.statut} />
              </div>
              <p className="text-xs text-gray-400 mb-2">{p.categorie?.nom}</p>
              <p className="text-sm font-bold text-[#D49B37]">{p.prix} {t('admin:units.currency')}</p>
              <p className="text-xs text-gray-400">{t('admin:products.stock')}: {p.stock}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('admin:products.new')} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input label={t('admin:products.productName')} required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          <Select
            label={t('admin:nav.categories')}
            required
            value={form.categorieId}
            onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))}
          >
            <option value="">{t('admin:products.selectCategory')}</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </Select>
          <Textarea label={t('admin:categories.descriptionOptional')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('admin:products.price')}
              type="number"
              min={0}
              step={0.01}
              required
              value={form.prix}
              onChange={(e) => setForm((f) => ({ ...f, prix: e.target.value }))}
            />
            <Input
              label={t('admin:products.stock')}
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            />
          </div>
          <Input label={t('admin:products.rangeOptional')} placeholder="Premium" value={form.gamme} onChange={(e) => setForm((f) => ({ ...f, gamme: e.target.value }))} />
          <Select
            label={t('admin:products.linkedBatch')}
            value={form.batchId}
            onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
          >
            <option value="">{t('admin:products.noBatch')}</option>
            {(batches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.batchCode} — {b.honeyType} ({b.status})</option>
            ))}
          </Select>
          <Input
            label={t('admin:products.imageUrls')}
            value={form.images}
            onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
            placeholder="/images/sedre.png, /images/beekeeper.jpg"
          />
          <Button type="submit" fullWidth isLoading={createProduct.isPending}>
            {t('admin:products.createAsDraft')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
