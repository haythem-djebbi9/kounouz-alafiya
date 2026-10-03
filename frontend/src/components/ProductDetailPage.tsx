import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePriceFormatter } from '../lib/format-price';
import { Product } from '../types';
import { ArrowLeft, Star, Check, Plus, Minus, ShoppingCart, QrCode, MapPin, Sparkles, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProductDetailPageProps {
  /** null pendant le chargement du catalogue ou si le produit n'existe pas. */
  product: Product | null;
  loading: boolean;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, weight: string, variantId?: string, unitPrice?: number) => void;
  onVerifyBatch: (product: Product) => void;
}

// Fiche produit en page entière (/produit/<id>), partageable par son adresse.
export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  loading,
  onBack,
  onAddToCart,
  onVerifyBatch,
}) => {
  const { t } = useTranslation('marketplace');
  const formatPrice = usePriceFormatter();
  const [selectedWeight, setSelectedWeight] = useState(product?.weight ?? '');
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    setSelectedWeight(product?.weight ?? '');
    setQuantity(1);
    setAddedSuccess(false);
  }, [product?.id, product?.weight]);

  const backButton = (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-2 text-sm font-bold text-[#0C261B] hover:text-[#C68A28] cursor-pointer"
    >
      <ArrowLeft aria-hidden className="w-4 h-4 rtl:rotate-180" />
      <span>{t('marketplace:productDetail.back')}</span>
    </button>
  );

  if (!product) {
    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {backButton}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
            <div className="aspect-square rounded-2xl bg-[#EFE7D7]" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-[#EFE7D7] rounded" />
              <div className="h-5 w-1/2 bg-[#F1EBDF] rounded" />
              <div className="h-10 w-1/3 bg-[#EFE7D7] rounded" />
            </div>
          </div>
        ) : (
          <p className="mt-10 text-center text-[#6F7F78]">{t('marketplace:productDetail.notFound')}</p>
        )}
      </section>
    );
  }

  // Formats réellement en vente (SKU). Les anciennes fiches sans SKU gardent
  // leur format unique.
  const variants = product.variants ?? [];
  const selectedVariant = variants.find((v) => v.packageSize === selectedWeight) ?? variants[0];
  const weights = variants.length > 0 ? variants.map((v) => v.packageSize) : [product.weight].filter(Boolean);
  const unitPrice = selectedVariant ? selectedVariant.price : product.price;
  const available = selectedVariant ? selectedVariant.stock : Infinity;
  const outOfStock = available <= 0;

  const handleAdd = () => {
    if (outOfStock) return;
    onAddToCart(
      product,
      Math.min(quantity, available),
      selectedVariant?.packageSize ?? selectedWeight,
      selectedVariant?.id,
      unitPrice,
    );
    setAddedSuccess(true);
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ['#D49B37', '#0C261B'] });
    } catch {
      // effet décoratif uniquement
    }
    setTimeout(() => setAddedSuccess(false), 1500);
  };

  return (
    <section id="product-detail-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-start">
      {backButton}

      <div className="mt-6 bg-white rounded-2xl border border-[#EAE1D2] shadow-sm p-5 sm:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-[#FAF6EE] border border-[#EAE1D2]">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            {product.purity && (
              <div className="absolute top-3 start-3 bg-[#0C261B] text-white text-[11px] font-bold px-2.5 py-1 rounded-md border border-[#D49B37]/50">
                {product.purity}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-bold text-[#8C7A60] block mb-1">{product.categoryLabel}</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B] leading-snug mb-1">{product.name}</h1>
              {product.subtitle && <p className="text-sm text-[#5E6F68] font-medium">{product.subtitle}</p>}
            </div>

            <div className="flex items-center gap-1.5 text-[#D49B37]">
              {[...Array(product.rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#D49B37]" />
              ))}
              <span className="text-xs text-[#8C7A60]">
                {t('marketplace:productDetail.reviewsCount', { count: product.reviewsCount })}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-[#0C261B]">{formatPrice(unitPrice)}</span>
              {product.oldPrice && (
                <span className="text-sm font-semibold text-[#A0AFA9] line-through">{formatPrice(product.oldPrice)}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-[#4F5F58]">
              <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" />
              <span>{t('marketplace:productDetail.originLabel', { origin: product.origin })}</span>
            </div>

            {weights.length > 0 && (
              <div>
                <span className="text-sm font-bold text-[#0C261B] block mb-2">
                  {t('marketplace:productDetail.chooseSizeLabel')}
                </span>
                <div className="flex gap-2">
                  {weights.map((w) => {
                    const variant = variants.find((v) => v.packageSize === w);
                    const soldOut = variant ? variant.stock <= 0 : false;
                    const active = (selectedVariant?.packageSize ?? selectedWeight) === w;
                    return (
                      <button
                        key={w}
                        onClick={() => {
                          setSelectedWeight(w);
                          setQuantity(1);
                        }}
                        disabled={soldOut}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          active
                            ? 'bg-[#0C261B] text-white border-2 border-[#0C261B]'
                            : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:bg-[#F2EAE0]'
                        }`}
                      >
                        <span className="block">{w}</span>
                        {soldOut && (
                          <span className={`block text-[11px] font-semibold ${active ? 'text-white/80' : 'text-[#8C7A60]'}`}>
                            {t('marketplace:productDetail.soldOut')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-3 bg-[#FAF6EE] px-3 py-2 rounded-lg border border-[#D5C7B0]">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="-"
                  className="p-1 text-[#0C261B] hover:text-[#D49B37] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm w-5 text-center text-[#0C261B]">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(q + 1, available))}
                  aria-label="+"
                  className="p-1 text-[#0C261B] hover:text-[#D49B37] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAdd}
                disabled={addedSuccess || outOfStock}
                className={`flex-1 inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-lg shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed ${
                  addedSuccess ? 'bg-[#1E6B56] text-white' : 'bg-[#0C261B] hover:bg-[#15473A] text-white disabled:opacity-50'
                }`}
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t('marketplace:productDetail.addedToCart')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 text-[#D49B37]" />
                    <span>{outOfStock ? t('marketplace:productDetail.soldOut') : t('marketplace:productDetail.addToCartCta')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-[#EAE1D2]">
          <h2 className="text-base font-extrabold text-[#0C261B]">{t('marketplace:productDetail.descriptionTitle')}</h2>
          <p className="text-sm sm:text-base text-[#3F524B] leading-relaxed">{product.description}</p>

          {product.benefits.length > 0 && (
            <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#EAE1D2] space-y-2 mt-2">
              <span className="text-sm font-bold text-[#0C261B] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D49B37]" />
                {t('marketplace:productDetail.benefitsTitle')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#3F524B]">
                {product.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#1E6B56] shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p role="note" className="flex gap-2.5 items-start rounded-xl border border-[#E8C98A] bg-[#FFF6E5] p-4 text-sm font-semibold leading-relaxed text-[#6B4410]">
            <AlertTriangle className="w-5 h-5 text-[#C68A28] shrink-0 mt-0.5" />
            <span>{t('marketplace:productDetail.healthNotice')}</span>
          </p>
        </div>

        {product.batchCode && (
          <div className="bg-[#FAF0DC] rounded-xl p-4 border border-[#D49B37]/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-[#D49B37] shrink-0" />
              <div>
                <span className="text-sm font-bold text-[#0C261B] block">
                  {t('marketplace:productDetail.batchCodeLabel', { code: product.batchCode })}
                </span>
                <span className="text-xs text-[#5E6F68]">{t('marketplace:productDetail.batchVerifiedNote')}</span>
              </div>
            </div>
            <button
              onClick={() => onVerifyBatch(product)}
              className="text-xs font-bold text-[#0C261B] bg-white hover:bg-[#FAF6EE] px-3 py-2 rounded-lg border border-[#D49B37] transition-colors cursor-pointer shrink-0"
            >
              {t('marketplace:productDetail.viewCertificate')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
