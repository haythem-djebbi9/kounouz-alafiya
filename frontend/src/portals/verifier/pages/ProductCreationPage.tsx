import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Download,
  ArrowRight,
  BadgeCheck,
  FileText,
  Images,
  Save,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  useActivateProduct,
  useBatchProducts,
  useDeleteProductDocument,
  useProductQueue,
  useSaveProduct,
  useUploadProductDocument,
  useUploadProductImage,
  type ProductInput,
} from '../commerce-hooks';
import { useAdminCategories } from '../../admin/hooks/useAdminCategories';
import { BATCH_STATUS_TONE, PRODUCT_STATUS_TONE } from '../status-map';
import {
  Breadcrumb,
  Btn,
  EmptyBlock,
  Field,
  InlineError,
  LoadingBlock,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  Stepper,
  TextArea,
  TextInput,
} from '../ui';
import { ApiError, resolveFileUrl } from '../../../lib/api';
import { downloadProductDocument } from '../hooks';
import { VariantsPanel } from '../VariantsPanel';
import type { BatchProduct, ProductQueueItem, StepState } from '../types';

export const ProductCreationPage: React.FC = () => {
  const { t } = useTranslation(['verifier', 'common']);
  const [params, setParams] = useSearchParams();
  const [batchId, setBatchId] = useState<string | null>(params.get('batch'));

  const queue = useProductQueue();
  const products = useBatchProducts(batchId ?? undefined);

  useEffect(() => {
    if (!batchId && queue.data && queue.data.length > 0) {
      setBatchId(queue.data[0].id);
    }
  }, [queue.data, batchId]);

  const select = (id: string) => {
    setBatchId(id);
    setParams({ batch: id }, { replace: true });
  };

  const batch = queue.data?.find((item) => item.id === batchId) ?? null;
  const product = products.data?.[0] ?? null;

  return (
    <div>
      <Breadcrumb items={[{ label: t('verifier:brand.role') }, { label: t('verifier:product.title') }]} />
      <PageHeader title={t('verifier:product.title')} subtitle={t('verifier:product.subtitle')} />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <Panel title={t('verifier:product.queue')} bodyClassName="p-0">
            {queue.isLoading && <LoadingBlock label={t('common:status.loading')} />}
            {queue.data?.length === 0 && (
              <EmptyBlock
                title={t('verifier:product.queueEmpty')}
                description={t('verifier:product.queueEmptyHint')}
              />
            )}
            <ul className="divide-y divide-[#F1EDE3] max-h-[70vh] overflow-y-auto">
              {(queue.data ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => select(item.id)}
                    className={`w-full text-start px-3 py-2.5 transition-colors ${
                      batchId === item.id ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF6EE]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0C261B]">{item.batchCode}</span>
                      <StatusPill
                        className="ms-auto"
                        tone={BATCH_STATUS_TONE[item.status]}
                        label={t(`verifier:status.batch.${item.status}`)}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {item.verification.request.producer.name} · {item.honeyType}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="xl:col-span-9">
          {!batch && (
            <Panel>
              <EmptyBlock title={t('verifier:product.selectPrompt')} icon={<ShoppingBag className="w-8 h-8" />} />
            </Panel>
          )}
          {batch && products.isLoading && (
            <Panel>
              <LoadingBlock label={t('common:status.loading')} />
            </Panel>
          )}
          {batch && products.data && (
            <ProductWorkbench key={`${batch.id}-${product?.id ?? 'new'}`} batch={batch} product={product} />
          )}
        </div>
      </div>
    </div>
  );
};

// --- Poste de travail produit ------------------------------------------------

const ProductWorkbench: React.FC<{ batch: ProductQueueItem; product: BatchProduct | null }> = ({
  batch,
  product,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const { data: categories } = useAdminCategories();
  const save = useSaveProduct();
  const activate = useActivateProduct();
  const uploadImage = useUploadProductImage();
  const uploadDocument = useUploadProductDocument();
  const deleteDocument = useDeleteProductDocument();

  const [error, setError] = useState('');
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(product?.tags ?? [batch.honeyType]);

  const flatCategories = useMemo(() => {
    // L'arborescence est aplatie : le produit se range sur une feuille comme
    // sur une racine, et la liste reste lisible dans un simple select.
    // L'API renvoie toutes les catégories à plat, enfants inclus dans chaque
    // parent : on part des racines seulement et on ignore un id déjà vu, pour
    // ne pas lister deux fois une sous-catégorie.
    const seen = new Set<string>();
    const flatten = (items: typeof categories, depth = 0): { id: string; label: string }[] =>
      (items ?? []).flatMap((item) => {
        if (seen.has(item.id)) return [];
        seen.add(item.id);
        return [
          { id: item.id, label: `${'— '.repeat(depth)}${item.nom}` },
          ...flatten(item.children, depth + 1),
        ];
      });
    const roots = (categories ?? []).filter((item) => !item.parentId);
    return flatten(roots.length > 0 ? roots : categories);
  }, [categories]);

  const [form, setForm] = useState({
    categorieId: product?.categorie?.id ?? '',
    nom: product?.nom ?? `Kounouz ${batch.honeyType}`,
    description:
      product?.description ??
      t('verifier:product.defaultDescription', {
        honeyType: batch.honeyType.toLowerCase(),
        origin: batch.origin ?? 'Tunisie',
      }),
    prix: product ? String(product.prix) : '',
    stock: product ? String(product.stock) : '0',
    netWeightG: product?.netWeightG ? String(product.netWeightG) : '500',
    ingredients: product?.ingredients ?? t('verifier:product.defaultIngredients'),
    storageInstructions: product?.storageInstructions ?? t('verifier:product.defaultStorage'),
    shelfLife: product?.shelfLife ?? '2 ans',
  });

  // Première catégorie proposée par défaut : un produit sans catégorie ne peut
  // pas être créé, autant éviter une erreur de saisie évitable.
  useEffect(() => {
    if (!form.categorieId && flatCategories.length > 0) {
      setForm((f) => ({ ...f, categorieId: flatCategories[0].id }));
    }
  }, [flatCategories, form.categorieId]);

  const published = product?.statut === 'PUBLIE';
  const qrCount = product?._count?.qrCodes ?? 0;

  const steps: { label: string; state: StepState }[] = [
    { label: t('verifier:chainSteps.verification'), state: 'DONE' },
    { label: t('verifier:chainSteps.packaging'), state: 'DONE' },
    { label: t('verifier:chainSteps.product'), state: product ? 'DONE' : 'CURRENT' },
    {
      label: t('verifier:chainSteps.qr'),
      state: qrCount > 0 ? 'DONE' : product ? 'CURRENT' : 'TODO',
    },
    { label: t('verifier:chainSteps.market'), state: published ? 'DONE' : 'TODO' },
    { label: t('verifier:chainSteps.complete'), state: published ? 'DONE' : 'TODO' },
  ];

  const buildInput = (): ProductInput => ({
    categorieId: form.categorieId,
    nom: form.nom,
    description: form.description || undefined,
    prix: Number(form.prix),
    stock: Number(form.stock) || 0,
    netWeightG: form.netWeightG ? Number(form.netWeightG) : undefined,
    ingredients: form.ingredients || undefined,
    storageInstructions: form.storageInstructions || undefined,
    shelfLife: form.shelfLife || undefined,
    tags,
    images,
  });

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => save.mutateAsync({ id: product?.id, batchId: batch.id, input: buildInput() }));
  };

  const onImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await run(async () => {
      const { url } = await uploadImage.mutateAsync(file);
      setImages((current) => [...current, url]);
    });
    event.target.value = '';
  };

  const onDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !product) return;
    await run(() => uploadDocument.mutateAsync({ id: product.id, file }));
    event.target.value = '';
  };

  const addTag = () => {
    const value = tagInput.trim();
    if (!value || tags.includes(value)) return;
    setTags((current) => [...current, value]);
    setTagInput('');
  };

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="font-mono text-base font-extrabold text-[#0C261B]">{batch.batchCode}</h2>
          {product && (
            <StatusPill
              tone={PRODUCT_STATUS_TONE[product.statut]}
              label={t(`verifier:status.product.${product.statut}`)}
            />
          )}
          <span className="ms-auto text-xs text-gray-500">
            {t('verifier:product.qrGenerated', { count: qrCount })}
          </span>
        </div>
        <Stepper steps={steps} currentLabel={t('verifier:progress.current')} />
      </Panel>

      {error && <InlineError message={error} />}

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-12">
        {/* 1. Source */}
        <Panel className="lg:col-span-4" title={t('verifier:product.sourceInfo')}>
          <dl className="space-y-1.5 text-xs">
            <Row label={t('verifier:table.batchId')} value={batch.batchCode} mono />
            <Row label={t('verifier:table.producer')} value={batch.verification.request.producer.name} />
            <Row label={t('verifier:fields.honeyType')} value={batch.honeyType} />
            <Row label={t('verifier:fields.origin')} value={batch.origin} />
            <Row label={t('verifier:fields.harvestSeason')} value={batch.harvestSeason} />
            <Row label={t('verifier:fields.quantity')} value={`${batch.quantityKg} kg`} />
            <Row
              label={t('verifier:packaging.packageType')}
              value={
                batch.packaging ? `${batch.packaging.packageType} — ${batch.packaging.size}` : null
              }
            />
          </dl>
          <div className="mt-3 rounded-lg border border-[#BFE0CB] bg-[#E8F5EC] p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#17693F]">
              <BadgeCheck className="w-3.5 h-3.5" />
              {t('verifier:status.verification.VERIFIED')}
            </p>
          </div>
        </Panel>

        {/* 2. Fiche produit */}
        <Panel className="lg:col-span-5" title={t('verifier:product.details')}>
          <div className="space-y-3">
            <Field label={t('verifier:product.name')} required>
              <TextInput
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                required
                disabled={published}
              />
            </Field>
            <Field label={t('verifier:product.description')} required>
              <TextArea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={published}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('verifier:product.netWeight')} required hint="g">
                <TextInput
                  type="number"
                  min="1"
                  value={form.netWeightG}
                  onChange={(e) => setForm((f) => ({ ...f, netWeightG: e.target.value }))}
                  disabled={published}
                />
              </Field>
              <Field
                label={product ? t('verifier:variants.fromPrice') : t('verifier:product.price')}
                required
                hint={product ? t('verifier:variants.derivedHint') : t('verifier:variants.defaultPriceHint')}
              >
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.prix}
                  onChange={(e) => setForm((f) => ({ ...f, prix: e.target.value }))}
                  required
                  // Après création, prix et stock sont déduits des SKU.
                  disabled={published || !!product}
                />
              </Field>
              <Field label={t('verifier:product.category')} required>
                <SelectInput
                  value={form.categorieId}
                  onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))}
                  required
                  disabled={published}
                >
                  {flatCategories.map((categorie) => (
                    <option key={categorie.id} value={categorie.id}>
                      {categorie.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field
                label={product ? t('verifier:variants.totalStock') : t('verifier:product.stock')}
                hint={product ? t('verifier:variants.derivedHint') : undefined}
              >
                <TextInput
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  disabled={published || !!product}
                />
              </Field>
            </div>
            <Field label={t('verifier:product.ingredients')} required>
              <TextInput
                value={form.ingredients}
                onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                disabled={published}
              />
            </Field>
            <Field label={t('verifier:product.storage')}>
              <TextInput
                value={form.storageInstructions}
                onChange={(e) => setForm((f) => ({ ...f, storageInstructions: e.target.value }))}
                disabled={published}
              />
            </Field>
            <Field label={t('verifier:product.shelfLife')}>
              <TextInput
                value={form.shelfLife}
                onChange={(e) => setForm((f) => ({ ...f, shelfLife: e.target.value }))}
                disabled={published}
              />
            </Field>

            <Field label={t('verifier:product.tags')}>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs rounded-full bg-[#F1F3F0] px-2 py-0.5 text-[#0C261B]"
                  >
                    {tag}
                    {!published && (
                      <button
                        type="button"
                        onClick={() => setTags((current) => current.filter((x) => x !== tag))}
                        aria-label={t('common:actions.delete')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {!published && (
                <div className="flex gap-2">
                  <TextInput
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder={t('verifier:product.tagPlaceholder')}
                  />
                  <Btn type="button" size="sm" variant="secondary" onClick={addTag}>
                    {t('common:actions.add')}
                  </Btn>
                </div>
              )}
            </Field>
          </div>
        </Panel>

        {/* 3. Aperçu et actions */}
        <div className="lg:col-span-3 space-y-4">
          <Panel title={t('verifier:product.preview')}>
            <div className="rounded-lg border border-[#EAE1D2] overflow-hidden">
              {images[0] ? (
                <img src={resolveFileUrl(images[0])} alt="" className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square grid place-items-center bg-[#FAF6EE] text-[#C6CFC8]">
                  <ShoppingBag className="w-10 h-10" />
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-bold text-[#0C261B]">{form.nom}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{batch.origin ?? 'Tunisie'}</p>
                <ul className="mt-2 space-y-1 text-[11px] text-gray-600">
                  <li>{batch.honeyType}</li>
                  <li>{form.netWeightG ? `${form.netWeightG} g` : '—'}</li>
                  <li className="text-[#17693F] font-semibold">
                    {t('verifier:product.verifiedLabTested')}
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-3">
              <Btn type="submit" size="sm" isLoading={save.isPending} disabled={published}>
                <Save className="w-3.5 h-3.5" />
                {product ? t('common:actions.save') : t('verifier:actions.createProduct')}
              </Btn>

              {product && qrCount === 0 && (
                <Link to={`/verificateur/qr?product=${product.id}`}>
                  <Btn type="button" variant="secondary" size="sm" className="w-full">
                    {t('verifier:actions.generateQr')}
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Btn>
                </Link>
              )}

              {product && qrCount > 0 && !published && (
                <Btn
                  type="button"
                  variant="success"
                  size="sm"
                  isLoading={activate.isPending}
                  onClick={() => run(() => activate.mutateAsync(product.id))}
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {t('verifier:actions.activateProduct')}
                </Btn>
              )}

              {published && (
                <p className="text-xs font-semibold text-[#17693F] bg-[#E8F5EC] rounded-lg px-3 py-2 text-center">
                  {t('verifier:product.published')}
                </p>
              )}
            </div>
          </Panel>

          {product && (
            <VariantsPanel
              productId={product.id}
              variants={product.variants ?? []}
              locked={product.statut === 'ARCHIVE'}
            />
          )}

          <Panel title={t('verifier:product.images')}>
            <div className="grid grid-cols-3 gap-2">
              {images.map((image) => (
                <div key={image} className="relative">
                  <img
                    src={resolveFileUrl(image)}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover border border-[#EAE1D2]"
                  />
                  {!published && (
                    <button
                      type="button"
                      onClick={() => setImages((current) => current.filter((x) => x !== image))}
                      className="absolute top-1 end-1 p-0.5 rounded-full bg-white/90 text-[#B42323]"
                      aria-label={t('common:actions.delete')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {!published && (
                <label className="aspect-square grid place-items-center rounded-lg border border-dashed border-[#EAE1D2] cursor-pointer hover:border-[#D49B37] text-[#9AA69F]">
                  <Images className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={onImage} />
                </label>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">{t('verifier:product.imagesHint')}</p>
          </Panel>

          {product && (
            <Panel title={t('verifier:product.documents')}>
              <ul className="space-y-1.5">
                {(product.documents ?? []).length === 0 && (
                  <li className="text-xs text-gray-400">{t('verifier:product.noDocuments')}</li>
                )}
                {(product.documents ?? []).map((doc) => (
                  <li key={doc.id} className="flex items-center gap-2 text-xs">
                    <FileText className="w-3.5 h-3.5 text-[#B42323] shrink-0" />
                    <span className="truncate flex-1 text-[#0C261B]">{doc.fileName}</span>
                    <span className="text-gray-400">{(doc.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => run(() => downloadProductDocument(doc))}
                      className="p-1 rounded text-gray-400 hover:text-[#0C261B]"
                      aria-label={t('common:actions.download')}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {!published && (
                      <button
                        type="button"
                        onClick={() => run(() => deleteDocument.mutateAsync(doc.id))}
                        className="p-1 rounded text-gray-400 hover:text-[#B42323]"
                        aria-label={t('common:actions.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {!published && (
                <label className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#EAE1D2] px-3 py-2 text-xs font-bold text-[#0C261B] cursor-pointer hover:border-[#D49B37]">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadDocument.isPending ? t('common:status.loading') : t('verifier:actions.uploadDocument')}
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={onDocument} />
                </label>
              )}
            </Panel>
          )}
        </div>
      </form>
    </div>
  );
};

const Row: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-[#F4F1EA] last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className={`text-[#0C261B] font-semibold text-end truncate ${mono ? 'font-mono' : ''}`}>
      {value || '—'}
    </dd>
  </div>
);
