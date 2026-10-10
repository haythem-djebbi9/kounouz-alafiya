import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Product } from '../types';
import { PackageOpen } from 'lucide-react';
import { SectionHeading, ForwardArrow } from './home/ui';
import { ProductCard, ProductCardSkeleton } from './shop/ProductCard';

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
            ? Array.from({ length: HOME_LIMIT }).map((_, i) => <ProductCardSkeleton key={i} />)
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
