import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Check, MapPin, Plus, ShieldCheck, QrCode, FlaskConical } from 'lucide-react';
import type { Product } from '../../types';
import { usePriceFormatter } from '../../lib/format-price';

interface ProductCardProps {
  product: Product;
  index?: number;
  onSelect: () => void;
  onAdd: () => void;
}

// Carte produit de la vitrine : photo, provenance, nom, accroche, prix au
// format et ajout rapide. Au survol (écrans à souris), les points clés du
// produit apparaissent sur la photo — uniquement des faits réels du lot.
export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0, onSelect, onAdd }) => {
  const { t } = useTranslation('marketplace');
  const formatPrice = usePriceFormatter();
  const [added, setAdded] = useState(false);
  const soldOut = !!product.variants?.length && product.variants.every((v) => v.stock <= 0);

  const keyPoints = [
    { icon: FlaskConical, text: t('marketplace:card.points.lab') },
    product.producerLocation && { icon: MapPin, text: t('marketplace:card.points.origin', { origin: product.producerLocation }) },
    product.batchCode && { icon: QrCode, text: t('marketplace:card.points.batch', { code: product.batchCode }) },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soldOut) return;
    onAdd();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <motion.article
      id={`product-card-${product.id}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.08, 0.32), ease: 'easeOut' }}
      onClick={onSelect}
      className="group relative flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-[#EAE1D2] hover:border-[#D49B37]/70 shadow-sm hover:shadow-xl hover:shadow-[#0C261B]/10 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 cursor-pointer text-start"
    >
      <div className="relative aspect-[4/3.6] overflow-hidden bg-[#F6F1EB]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <span className="absolute top-3 start-3 inline-flex items-center gap-1 bg-white/95 text-[#1E6B56] text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm border border-[#1E6B56]/15">
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('marketplace:card.labVerified')}
        </span>
        {product.weight && (
          <span className="absolute top-3 end-3 bg-[#0C261B]/85 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            {product.weight}
          </span>
        )}

        {/* Points clés au survol (souris uniquement) */}
        {keyPoints.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden [@media(hover:hover)]:block translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
            <div className="bg-gradient-to-t from-[#0C261B] via-[#0C261B]/95 to-[#0C261B]/80 px-4 pt-4 pb-3">
              <p className="text-[11px] font-extrabold text-[#E5AC44] mb-2">{t('marketplace:card.keyPoints')}</p>
              <ul className="space-y-1.5">
                {keyPoints.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-xs font-semibold text-white/95 leading-snug">
                    <Icon className="w-3.5 h-3.5 text-[#E5AC44] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
          <span className="text-[#C68A28] truncate">{product.categoryLabel}</span>
          {product.producerLocation && (
            <span className="inline-flex items-center gap-1 text-[#6F827B] truncate">
              <MapPin className="w-3 h-3 text-[#D49B37] shrink-0" />
              <span className="truncate">{product.producerLocation}</span>
            </span>
          )}
        </div>

        <h3 className="mt-1.5 text-base sm:text-lg font-extrabold text-[#0C261B] leading-snug line-clamp-2 group-hover:text-[#96661A] transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1.5 text-xs sm:text-[13px] text-[#5E6F68] leading-relaxed line-clamp-2">{product.description}</p>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between gap-3">
          <p className="leading-none">
            <span className="text-xl sm:text-2xl font-extrabold text-[#0C261B]">{formatPrice(product.price)}</span>
            {product.weight && <span className="ms-1.5 text-xs font-semibold text-[#8C7A60]">/ {product.weight}</span>}
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleAdd}
            disabled={soldOut}
            aria-label={soldOut ? t('marketplace:productDetail.soldOut') : t('marketplace:productDetail.addToCartCta')}
            title={soldOut ? t('marketplace:productDetail.soldOut') : t('marketplace:productDetail.addToCartCta')}
            className={`shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center shadow-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              added ? 'bg-emerald-600 text-white' : 'bg-[#0C261B] text-[#E5AC44] hover:bg-[#D49B37] hover:text-[#0C261B]'
            }`}
          >
            {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-[#EAE1D2] animate-pulse">
    <div className="aspect-[4/3.6] bg-[#EFE7D9]" />
    <div className="p-5 space-y-3">
      <div className="h-3 w-1/3 bg-[#F3ECE0] rounded" />
      <div className="h-5 w-3/4 bg-[#EFE7D9] rounded" />
      <div className="h-3 w-full bg-[#F3ECE0] rounded" />
      <div className="flex justify-between items-end pt-3">
        <div className="h-7 w-1/3 bg-[#EFE7D9] rounded" />
        <div className="h-11 w-11 bg-[#EFE7D9] rounded-full" />
      </div>
    </div>
  </div>
);
