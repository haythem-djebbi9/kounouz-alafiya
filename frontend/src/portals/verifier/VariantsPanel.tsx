import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save } from 'lucide-react';
import { Btn, InlineError, Panel, StatusPill, TextInput } from './ui';
import { useAddProductVariant, useUpdateProductVariant } from './commerce-hooks';
import { ApiError } from '../../lib/api';
import type { ProductVariant } from '../../lib/api-types';

/**
 * Formats vendus (SKU) d'un produit (§12 Ventes, PRD-03).
 *
 * Chaque format de pot a son prix et son stock : les ventes, les gains
 * producteur et les QR se rattachent au SKU. Les SKU sont créés à partir des
 * unités emballées ; le vérificateur ajuste ici le prix de chaque format.
 */
export const VariantsPanel: React.FC<{ productId: string; variants: ProductVariant[]; locked: boolean }> = ({
  productId,
  variants,
  locked,
}) => {
  const { t } = useTranslation(['verifier', 'common']);
  const update = useUpdateProductVariant();
  const add = useAddProductVariant();
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { price: string; stock: string }>>({});
  const [adding, setAdding] = useState({ packageSize: '', price: '', stock: '0' });

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('verifier:errors.generic'));
    }
  };

  const draftOf = (v: ProductVariant) => drafts[v.id] ?? { price: String(v.price), stock: String(v.stock) };
  const changed = (v: ProductVariant) => {
    const d = draftOf(v);
    return Number(d.price) !== Number(v.price) || Number(d.stock) !== v.stock;
  };

  return (
    <Panel title={t('verifier:variants.title')}>
      {error && <InlineError message={error} />}
      <p className="text-[11px] text-gray-500 mb-2">{t('verifier:variants.hint')}</p>
      <div className="space-y-2">
        {variants.map((v) => {
          const d = draftOf(v);
          const active = v.status === 'ACTIVE';
          return (
            <div key={v.id} className="rounded-lg border border-[#EAE1D2] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-[#0C261B]">{v.packageSize}</span>
                <span className="font-mono text-[10px] text-gray-400">{v.sku}</span>
                <StatusPill
                  tone={active ? 'green' : 'neutral'}
                  label={t(`verifier:variants.status.${v.status}`)}
                  className="ms-auto"
                />
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <label className="text-[11px] text-gray-500">
                  {t('verifier:variants.price')}
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={d.price}
                    disabled={locked}
                    onChange={(e) => setDrafts((all) => ({ ...all, [v.id]: { ...d, price: e.target.value } }))}
                  />
                </label>
                <label className="text-[11px] text-gray-500">
                  {t('verifier:variants.stock')}
                  <TextInput
                    type="number"
                    min="0"
                    value={d.stock}
                    disabled={locked}
                    onChange={(e) => setDrafts((all) => ({ ...all, [v.id]: { ...d, stock: e.target.value } }))}
                  />
                </label>
                <div className="flex gap-1">
                  <Btn
                    size="sm"
                    variant="secondary"
                    disabled={locked || !changed(v)}
                    isLoading={update.isPending && update.variables?.variantId === v.id}
                    onClick={() =>
                      run(() =>
                        update.mutateAsync({ variantId: v.id, price: Number(d.price), stock: Number(d.stock) }),
                      )
                    }
                    aria-label={t('common:actions.save')}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={locked}
                    onClick={() =>
                      run(() =>
                        update.mutateAsync({ variantId: v.id, status: active ? 'INACTIVE' : 'ACTIVE' }),
                      )
                    }
                  >
                    {active ? t('verifier:variants.deactivate') : t('verifier:variants.activate')}
                  </Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!locked && (
        <div className="mt-3 rounded-lg border border-dashed border-[#D49B37] p-2.5">
          <p className="text-xs font-bold text-[#0C261B] mb-2">{t('verifier:variants.add')}</p>
          <div className="grid grid-cols-3 gap-2">
            <TextInput
              placeholder={t('verifier:variants.sizePlaceholder')}
              value={adding.packageSize}
              onChange={(e) => setAdding((a) => ({ ...a, packageSize: e.target.value }))}
            />
            <TextInput
              type="number"
              min="0"
              step="0.01"
              placeholder={t('verifier:variants.price')}
              value={adding.price}
              onChange={(e) => setAdding((a) => ({ ...a, price: e.target.value }))}
            />
            <TextInput
              type="number"
              min="0"
              placeholder={t('verifier:variants.stock')}
              value={adding.stock}
              onChange={(e) => setAdding((a) => ({ ...a, stock: e.target.value }))}
            />
          </div>
          <div className="flex justify-end mt-2">
            <Btn
              size="sm"
              disabled={!adding.packageSize.trim() || adding.price === ''}
              isLoading={add.isPending}
              onClick={() =>
                run(async () => {
                  await add.mutateAsync({
                    productId,
                    packageSize: adding.packageSize.trim(),
                    price: Number(adding.price),
                    stock: Number(adding.stock) || 0,
                  });
                  setAdding({ packageSize: '', price: '', stock: '0' });
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              {t('verifier:variants.addButton')}
            </Btn>
          </div>
        </div>
      )}
    </Panel>
  );
};
