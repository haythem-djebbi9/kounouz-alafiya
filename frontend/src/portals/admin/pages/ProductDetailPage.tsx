import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Pencil } from 'lucide-react';
import { useAdminProductDetail, useUpdateProduct, useUpdateProductStatus } from '../hooks/useAdminProducts';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { useBatches } from '../hooks/useBatchesAndPackaging';
import { Card, Button, Input, Textarea, Select, Modal, StatusBadge, Alert, QRCodeDisplay } from '../../../design-system';
import { resolveFileUrl, ApiError } from '../../../lib/api';

export const ProductDetailPage: React.FC = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useAdminProductDetail(id);
  const { data: categories } = useAdminCategories();
  const { data: batches } = useBatches();
  const updateProduct = useUpdateProduct();
  const updateStatus = useUpdateProductStatus();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ categorieId: '', nom: '', description: '', prix: '', stock: '', gamme: '', batchId: '', images: '' });

  useEffect(() => {
    if (product) {
      setForm({
        categorieId: product.categorieId,
        nom: product.nom,
        description: product.description ?? '',
        prix: product.prix,
        stock: String(product.stock),
        gamme: product.gamme ?? '',
        batchId: product.batchId ?? '',
        images: product.images.join(', '),
      });
    }
  }, [product]);

  if (isLoading || !product) {
    return <p className="text-sm text-gray-400">{t('common:status.loading')}</p>;
  }

  const flatCategories = (categories ?? []).flatMap((c) => [c, ...(c.children ?? [])]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        categorieId: form.categorieId,
        nom: form.nom,
        description: form.description || undefined,
        prix: Number(form.prix),
        stock: Number(form.stock),
        gamme: form.gamme || undefined,
        batchId: form.batchId || undefined,
        images: form.images ? form.images.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      setIsEditOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:productDetail.saveError'));
    }
  };

  const changeStatus = async (statut: 'PUBLIE' | 'RUPTURE' | 'SUSPENDU') => {
    setError('');
    try {
      await updateStatus.mutateAsync({ id: product.id, statut });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin:productDetail.statusUpdateError'));
    }
  };

  return (
    <div className="max-w-3xl">
      <Link to="/admin/produits" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0C261B] mb-4">
        <ArrowRight className="w-4 h-4" />
        {t('admin:productDetail.backToProducts')}
      </Link>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#0C261B]">{product.nom}</h1>
        <StatusBadge kind="product" status={product.statut} />
      </div>
      <p className="text-gray-500 mb-6">{product.categorie?.nom}</p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {/* Aperçu de la fiche produit, tel qu'il apparaîtra au client */}
          <Card>
            {product.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {product.images.map((img) => (
                  <img key={img} src={resolveFileUrl(img)} alt={product.nom} className="w-full aspect-square object-cover rounded-lg border border-[#EAE1D2]" />
                ))}
              </div>
            )}
            <p className="text-2xl font-bold text-[#D49B37] mb-2">{product.prix} {t('admin:units.currency')}</p>
            {product.description && <p className="text-sm text-gray-600 mb-3">{product.description}</p>}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {product.gamme && <span>{t('admin:productDetail.range')}: {product.gamme}</span>}
              <span>{t('admin:products.stock')}: {product.stock}</span>
            </div>
          </Card>

          {product.batch && (
            <Card>
              <p className="text-xs text-gray-500 mb-1">{t('admin:productDetail.linkedBatch')}</p>
              <p className="font-mono font-bold text-sm text-[#0C261B]">{product.batch.batchCode}</p>
              <StatusBadge kind="batch" status={product.batch.status} className="mt-2" />
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="w-4 h-4" />
              {t('common:actions.edit')}
            </Button>
            {product.statut === 'BROUILLON' && (
              <Button onClick={() => changeStatus('PUBLIE')} isLoading={updateStatus.isPending}>
                {t('admin:productDetail.publish')}
              </Button>
            )}
            {product.statut === 'PUBLIE' && (
              <>
                <Button variant="outline" onClick={() => changeStatus('RUPTURE')} isLoading={updateStatus.isPending}>
                  {t('admin:productDetail.markOutOfStock')}
                </Button>
                <Button variant="danger" onClick={() => changeStatus('SUSPENDU')} isLoading={updateStatus.isPending}>
                  {t('admin:productDetail.suspend')}
                </Button>
              </>
            )}
            {(product.statut === 'RUPTURE' || product.statut === 'SUSPENDU') && (
              <Button onClick={() => changeStatus('PUBLIE')} isLoading={updateStatus.isPending}>
                {t('admin:productDetail.republish')}
              </Button>
            )}
          </div>
        </div>

        <div>
          {product.qrCode ? (
            <Card className="flex flex-col items-center">
              <p className="text-xs text-gray-500 mb-3">{t('admin:productDetail.qrCode')}</p>
              <QRCodeDisplay qrId={product.qrCode.qrId} code={product.qrCode.qrCode} size={140} />
            </Card>
          ) : (
            <Card className="text-center text-sm text-gray-400">
              {t('admin:productDetail.qrCodePending')}
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={t('admin:productDetail.editTitle')} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('admin:products.productName')} required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          <Select label={t('admin:nav.categories')} required value={form.categorieId} onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))}>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </Select>
          <Textarea label={t('admin:requestDetail.description')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('admin:products.price')} type="number" min={0} step={0.01} required value={form.prix} onChange={(e) => setForm((f) => ({ ...f, prix: e.target.value }))} />
            <Input label={t('admin:products.stock')} type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
          </div>
          <Input label={t('admin:productDetail.range')} value={form.gamme} onChange={(e) => setForm((f) => ({ ...f, gamme: e.target.value }))} />
          <Select
            label={t('admin:productDetail.linkedBatch')}
            value={form.batchId}
            onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
            disabled={product.statut !== 'BROUILLON'}
          >
            <option value="">{t('admin:products.noBatch')}</option>
            {(batches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.batchCode} — {b.honeyType} ({b.status})</option>
            ))}
          </Select>
          {product.statut !== 'BROUILLON' && (
            <p className="text-xs text-gray-400 -mt-2">{t('admin:productDetail.cannotChangeBatch')}</p>
          )}
          <Input label={t('admin:productDetail.imageUrls')} value={form.images} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))} />
          <Button type="submit" fullWidth isLoading={updateProduct.isPending}>
            {t('admin:productDetail.saveChanges')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
