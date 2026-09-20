import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Product } from '../types';
import { Eye, ShoppingCart, ShieldCheck, MapPin, Check, PackageOpen } from 'lucide-react';
import { usePriceFormatter } from '../lib/format-price';
import { SectionHeading, ForwardArrow } from './home/ui';

interface DiscoverTreasuresProps {
  products: Product[];
  loading?: boolean;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onViewAll: () => void;
}

const HOME_LIMIT = 4;

export const DiscoverTreasures: React.FC<DiscoverTreasuresProps> = ({
  products,
  loading,
  onSelectProduct,
  onAddToCart,
  onViewAll,
}) => {
  const { t } = useTranslation('marketplace');
  const displayProducts = products.slice(0, HOME_LIMIT);

  return (
    <section id="discover-treasures" className="relative py-16 sm:py-24 bg-[#FAF6EE] scroll-mt-20">
      <div className="absolute inset-0 bg-honeycomb-pattern opacity-60 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('marketplace:home.products.eyebrow')}
          title={t('marketplace:discover.title')}
          subtitle={t('marketplace:home.products.subtitle')}
        />

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {loading && products.length === 0
            ? Array.from({ length: HOME_LIMIT }).map((_, i) => <ProductSkeleton key={i} />)
            : displayProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  onSelect={() => onSelectProduct(product)}
                  onAdd={() => onAddToCart(product)}
                />
              ))}
        </div>

        {!loading && products.length === 0 && (
          <div className="mt-10 flex flex-col items-center text-center text-[#576B64]">
            <PackageOpen className="w-10 h-10 text-[#D49B37] mb-2" />
            <p className="font-semibold">{t('marketplace:home.products.empty')}</p>
          </div>
        )}

        {products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-2.5 bg-white hover:bg-[#0C261B] text-[#0C261B] hover:text-white border-2 border-[#0C261B] font-bold px-7 py-3 rounded-xl transition-colors cursor-pointer group"
            >
              {t('marketplace:home.products.viewAll', { count: products.length })}
              <ForwardArrow />
            </button>
            <p className="text-xs text-[#6F827B]">{t('marketplace:home.products.priceNote')}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

const ProductCard: React.FC<{
  product: Product;
  index: number;
  onSelect: () => void;
  onAdd: () => void;
}> = ({ product, index, onSelect, onAdd }) => {
  const { t } = useTranslation('marketplace');
  const formatPrice = usePriceFormatter();
  const [added, setAdded] = useState(false);
  const soldOut = !!product.variants?.length && product.variants.every((v) => v.stock <= 0);

  const handleAdd = () => {
    onAdd();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <motion.article
      id={`product-card-${product.id}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{ y: -6 }}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-[#EAE1D2] hover:border-[#D49B37]/70 shadow-sm hover:shadow-xl hover:shadow-[#0C261B]/10 transition-[border-color,box-shadow] duration-300"
    >
      <button
        type="button"
        onClick={onSelect}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F6F1EB] cursor-pointer"
        aria-label={t('marketplace:discover.previewAria')}
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* reflet au survol */}
        <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        <span className="absolute top-3 start-3 inline-flex items-center gap-1 bg-emerald-700/95 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('marketplace:home.products.verifiedBadge')}
        </span>
        <span className="absolute top-3 end-3 bg-white/90 backdrop-blur-sm text-[#0C261B] text-[11px] font-bold px-2.5 py-1 rounded-full">
          {product.categoryLabel}
        </span>
        <span className="absolute bottom-3 end-3 inline-flex items-center gap-1 bg-[#0C261B]/85 text-white text-xs font-semibold px-3 py-1.5 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <Eye className="w-3.5 h-3.5" />
          {t('marketplace:home.products.quickView')}
        </span>
      </button>

      <div className="flex flex-col flex-grow p-4 sm:p-5 text-start">
        <h3 className="text-base sm:text-lg font-bold text-[#0C261B] leading-snug line-clamp-2 group-hover:text-[#96661A] transition-colors">
          {product.name}
        </h3>
        {product.producerLocation && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm text-[#6F827B]">
            <MapPin className="w-3.5 h-3.5 text-[#D49B37] shrink-0" />
            <span className="truncate">{product.producerLocation}</span>
          </p>
        )}

        <div className="mt-4 mb-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#8C7A60]">{product.weight}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0C261B] leading-none mt-0.5">
              {formatPrice(product.price)}
            </p>
          </div>
          {product.batchCode && (
            <span dir="ltr" className="text-[10px] font-mono text-[#8C9E97] bg-[#FAF6EE] px-2 py-1 rounded-md border border-[#EAE1D2]">
              {product.batchCode}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-[#EAE1D2] flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={handleAdd}
            disabled={soldOut}
            className={`relative flex-1 inline-flex items-center justify-center gap-2 font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              added ? 'bg-emerald-600 text-white' : 'bg-[#0C261B] hover:bg-[#D49B37] hover:text-[#0C261B] text-white'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={added ? 'added' : 'add'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-2"
              >
                {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                {soldOut
                  ? t('marketplace:productDetail.soldOut')
                  : added
                    ? t('marketplace:home.products.added')
                    : t('marketplace:productDetail.addToCartCta')}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <button
            type="button"
            onClick={onSelect}
            aria-label={t('marketplace:discover.discoverProduct')}
            title={t('marketplace:discover.discoverProduct')}
            className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-xl border border-[#EAE1D2] text-[#0C261B] hover:border-[#D49B37] hover:text-[#96661A] transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
};

const ProductSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-[#EAE1D2] animate-pulse">
    <div className="aspect-[4/3] bg-[#EFE7D9]" />
    <div className="p-5 space-y-3">
      <div className="h-4 w-3/4 bg-[#EFE7D9] rounded" />
      <div className="h-3 w-1/2 bg-[#F3ECE0] rounded" />
      <div className="h-6 w-1/3 bg-[#EFE7D9] rounded mt-4" />
      <div className="h-10 w-full bg-[#F3ECE0] rounded-xl mt-4" />
    </div>
  </div>
);
