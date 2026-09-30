import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useTranslation } from 'react-i18next';
import { usePriceFormatter } from '../lib/format-price';
import { usePublicBlogPosts } from '../lib/blog';
import { Product } from '../types';
import { BlogCard, BlogCardSkeleton } from './blog/BlogCard';
import { ForwardArrow } from './home/ui';
import {
  Heart,
  Star,
  Truck,
  ShieldCheck,
  Headphones,
  Banknote,
  Sparkles,
  Layers,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Check,
  QrCode,
  Award,
  Package,
  Droplets,
  X,
} from 'lucide-react';

export interface CategoryFilter {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ProductsPageProps {
  products: Product[];
  categories: CategoryFilter[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenArticle: (slug: string) => void;
  onShowBlog: () => void;
  onVerifyProduct: () => void;
}

// Livraison offerte au-delà de ce montant (même règle que le panier et l'API).
const FREE_SHIPPING_THRESHOLD = 200;

type SortKey = 'featured' | 'bestseller' | 'price-asc' | 'price-desc';

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  categories,
  onSelectProduct,
  onAddToCart,
  onOpenArticle,
  onShowBlog,
  onVerifyProduct,
}) => {
  const { t } = useTranslation(['marketplace', 'common']);
  const formatPrice = usePriceFormatter();
  const { data: posts, isLoading: postsLoading } = usePublicBlogPosts(3);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('featured');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    switch (sortBy) {
      case 'bestseller':
        result = [...result].sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
      case 'price-asc':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Produit présenté dans l'encadré du haut : le plus cher du catalogue, en
  // général le miel le plus rare (sedra).
  const showcase = useMemo(() => [...products].sort((a, b) => b.price - a.price)[0], [products]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    confetti({
      particleCount: 30,
      spread: 55,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ['#D49B37', '#E8B958', '#1E6B56', '#FAF6EE', '#0C261B'],
      shapes: ['circle'],
      scalar: 0.85,
    });

    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  const pills = [
    { key: 'lab', icon: <ShieldCheck className="w-4 h-4 text-[#1E6B56]" /> },
    { key: 'natural', icon: <Award className="w-4 h-4 text-[#D49B37]" /> },
    { key: 'delivery', icon: <Truck className="w-4 h-4 text-[#1E6B56]" /> },
    { key: 'cod', icon: <Banknote className="w-4 h-4 text-[#D49B37]" /> },
  ];

  const perks = [
    { key: 'shipping', icon: <Truck className="w-6 h-6" />, text: t('shop.perks.shipping.text', { amount: formatPrice(FREE_SHIPPING_THRESHOLD) }) },
    { key: 'lab', icon: <ShieldCheck className="w-6 h-6" />, text: t('shop.perks.lab.text') },
    { key: 'cod', icon: <Banknote className="w-6 h-6" />, text: t('shop.perks.cod.text') },
    { key: 'support', icon: <Headphones className="w-6 h-6" />, text: t('shop.perks.support.text') },
  ];

  const journey = [
    { key: 'origin', icon: <Droplets className="w-6 h-6" /> },
    { key: 'harvest', icon: <Layers className="w-6 h-6" /> },
    { key: 'lab', icon: <ShieldCheck className="w-6 h-6" /> },
    { key: 'qr', icon: <Sparkles className="w-6 h-6" /> },
  ];

  return (
    <div id="products-page" className="relative min-h-screen py-8 sm:py-14 overflow-hidden bg-[#FAF6EE]">
      {/* Fond : panorama de montagne, alvéoles et halos dorés */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/images/jabal.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.22,
        }}
      />
      <div className="fixed inset-0 bg-honeycomb-pattern opacity-40 pointer-events-none z-0" />
      <div className="fixed top-0 end-10 w-[650px] h-[650px] bg-[#D49B37]/15 rounded-full blur-3xl pointer-events-none -translate-y-1/3 z-0" />
      <div className="fixed top-1/2 start-0 w-[550px] h-[550px] bg-[#1E6B56]/10 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* En-tête de la boutique */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-br from-white/95 via-white/85 to-[#FAF4E6]/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 lg:p-12 shadow-2xl border border-[#D49B37]/35 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
            <div className="lg:col-span-8 space-y-6 text-start">
              <div className="inline-flex items-center gap-2.5 bg-[#FAF6EE] border border-[#D49B37]/50 text-[#966718] text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-full">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D49B37] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D49B37]"></span>
                </span>
                <Sparkles className="w-4 h-4 text-[#D49B37]" />
                <span>{t('shop.badge')}</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0C261B] tracking-tight leading-tight">
                  {t('shop.title')}
                </h1>
                <p className="text-base sm:text-lg text-[#576B64] font-medium leading-relaxed max-w-2xl">{t('shop.subtitle')}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                {pills.map((pill) => (
                  <div
                    key={pill.key}
                    className="inline-flex items-center gap-1.5 bg-white/80 border border-[#EAE1D2] text-[#0C261B] text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap"
                  >
                    {pill.icon}
                    <span>{t(`shop.pills.${pill.key}`)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 relative flex items-center max-w-2xl">
                <Search className="w-5 h-5 text-[#D49B37] absolute start-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('shop.searchPlaceholder')}
                  className="w-full py-4 ps-12 pe-12 rounded-2xl bg-white/95 text-[#0C261B] text-sm sm:text-base placeholder:text-[#8C9E97] border-2 border-[#D49B37]/30 focus:border-[#D49B37] focus:outline-none focus:ring-4 focus:ring-[#D49B37]/15 shadow-md font-medium transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute end-4 p-1 rounded-full text-[#8C9E97] hover:text-[#0C261B] hover:bg-gray-100 transition-colors"
                    aria-label={t('shop.clearSearch')}
                    title={t('shop.clearSearch')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {showcase && (
              <div className="lg:col-span-4 flex justify-center items-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04, rotate: 1 }}
                  className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-3xl bg-gradient-to-b from-[#FAF6EE] to-white p-6 shadow-xl border border-[#D49B37]/40 flex flex-col items-center justify-center text-center group cursor-pointer"
                  onClick={() => onSelectProduct(showcase)}
                >
                  <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-[#D49B37]/40 animate-spin-slow pointer-events-none" />
                  <div className="relative w-40 h-40 mb-3 drop-shadow-2xl">
                    <img
                      src={showcase.image}
                      alt={showcase.name}
                      decoding="async"
                      className="w-full h-full object-contain rounded-2xl transform group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute -top-2 -end-2 bg-[#D49B37] text-white p-2 rounded-full shadow-lg border-2 border-white">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-[#C68A28] uppercase tracking-wider">{t('shop.showcase.eyebrow')}</span>
                    <h3 className="text-base font-bold text-[#0C261B]">{showcase.name}</h3>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-[#1E6B56] bg-[#E8F4F0] px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t('shop.showcase.verified')}</span>
                    </div>
                  </div>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Rubriques, nombre de résultats et tri */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              const count = cat.id === 'all' ? products.length : products.filter((p) => p.category === cat.id).length;
              return (
                <motion.button
                  key={cat.id}
                  id={`filter-pill-${cat.id}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#0C261B] text-white shadow-md ring-2 ring-[#D49B37]/40'
                      : 'bg-white text-[#0C261B] hover:bg-[#EFE7D7] border border-[#EAE1D2]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D49B37]' : 'text-[#8C7A60]'}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[11px] px-1.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-[#174636] text-[#D49B37]' : 'bg-[#FAF6EE] text-[#6F827B]'
                    }`}
                  >
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE1D2]">
            <div className="text-xs sm:text-sm text-[#576B64] font-semibold flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#D49B37]" />
              <span>{t('shop.results', { count: filteredAndSortedProducts.length })}</span>
              {searchQuery && (
                <span className="text-[11px] text-[#C68A28] bg-[#FAF6EE] px-2 py-0.5 rounded-md border border-[#EAE1D2]">
                  {t('shop.searchFor', { query: searchQuery })}
                </span>
              )}
            </div>
            <label className="flex items-center gap-2">
              <span className="text-xs text-[#576B64] font-bold whitespace-nowrap">{t('shop.sortBy')}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="bg-[#FAF6EE] border border-[#D5C7B0] text-[#0C261B] text-xs sm:text-sm font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#D49B37] cursor-pointer"
              >
                <option value="featured">{t('shop.sort.featured')}</option>
                <option value="bestseller">{t('shop.sort.bestseller')}</option>
                <option value="price-asc">{t('shop.sort.priceAsc')}</option>
                <option value="price-desc">{t('shop.sort.priceDesc')}</option>
              </select>
            </label>
          </div>
        </div>

        {/* Grille des produits */}
        {filteredAndSortedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#EAE1D2] space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center mx-auto text-[#D49B37]">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#0C261B]">{t('shop.empty.title')}</h3>
            <p className="text-xs text-[#6F827B]">{t('shop.empty.text')}</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-2 bg-[#0C261B] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer hover:bg-[#174636]"
            >
              {t('shop.empty.reset')}
            </button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedProducts.map((product, idx) => {
                const isFav = !!favorites[product.id];
                const isJustAdded = !!addedItemIds[product.id];
                const discountPercentage = product.oldPrice
                  ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                  : 0;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.3) }}
                    whileHover={{ y: -6 }}
                    key={product.id}
                    id={`catalog-card-${product.id}`}
                    onClick={() => onSelectProduct(product)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-[#EAE1D2] hover:border-[#D49B37]/60 flex flex-col justify-between cursor-pointer relative"
                  >
                    <div className="relative aspect-[4/3.4] overflow-hidden bg-[#FAF6EE]">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 start-2.5 flex flex-col gap-1.5 items-start">
                        {discountPercentage > 0 && (
                          <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                            {t('shop.badges.discount', { percent: discountPercentage })}
                          </span>
                        )}
                        {product.isBestSeller && (
                          <span className="bg-[#0C261B] text-[#D49B37] text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm border border-[#D49B37]/40">
                            {t('shop.badges.bestseller')}
                          </span>
                        )}
                        {product.isNew && (
                          <span className="bg-[#1E6B56] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                            {t('shop.badges.new')}
                          </span>
                        )}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => toggleFavorite(product.id, e)}
                        aria-label={t('shop.favorite')}
                        aria-pressed={isFav}
                        className="absolute top-2.5 end-2.5 p-2 rounded-full bg-white/90 hover:bg-white shadow-md text-[#0C261B] transition-colors cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-rose-500 text-rose-500' : 'text-[#8C7A60]'}`} />
                      </motion.button>

                      {product.weight && (
                        <div className="absolute bottom-2.5 start-2.5 bg-[#0C261B]/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                          {product.weight}
                        </div>
                      )}
                      <div className="absolute bottom-2.5 end-2.5 bg-white/95 text-[#1E6B56] text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm border border-[#1E6B56]/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#1E6B56]" />
                        <span>{t('shop.badges.labVerified')}</span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-grow justify-between text-start">
                      <div>
                        <p className="text-[11px] text-[#C68A28] font-extrabold mb-1">{product.categoryLabel}</p>
                        <h3 className="text-base sm:text-lg font-bold text-[#0C261B] mb-1 group-hover:text-[#C68A28] transition-colors leading-snug">
                          {product.name}
                        </h3>
                        <p className="text-xs text-[#6F827B] font-medium line-clamp-2 mb-3 leading-relaxed">{product.description}</p>

                        {/* Aucune note inventée : les étoiles n'apparaissent qu'avec de vrais avis. */}
                        {product.reviewsCount > 0 && (
                          <div className="flex items-center gap-1 mb-3 text-[#D49B37]">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(product.rating) ? 'fill-[#D49B37]' : ''}`} />
                            ))}
                            <span className="text-[11px] text-[#8C7A60] ms-1">{t('shop.reviews', { count: product.reviewsCount })}</span>
                          </div>
                        )}

                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-lg sm:text-xl font-extrabold text-[#0C261B]">{formatPrice(product.price)}</span>
                          {product.oldPrice && (
                            <span className="text-xs text-[#8C9E97] line-through font-medium">{formatPrice(product.oldPrice)}</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#EAE1D2]">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => handleQuickAdd(product, e)}
                          className={`w-full inline-flex items-center justify-center gap-2 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm ${
                            isJustAdded ? 'bg-[#1E6B56] text-white ring-2 ring-[#D49B37]' : 'bg-[#0C261B] hover:bg-[#15473A] text-white'
                          }`}
                        >
                          {isJustAdded ? <Check className="w-4 h-4 text-[#D49B37]" /> : <ShoppingBag className="w-4 h-4 text-[#D49B37]" />}
                          <span>{isJustAdded ? t('shop.added') : t('shop.addToCart')}</span>
                        </motion.button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProduct(product);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#0C261B] font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer border border-[#EAE1D2]"
                          >
                            <span>{t('shop.details')}</span>
                            <ForwardArrow className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyProduct();
                            }}
                            title={t('shop.verifyTitle')}
                            className="inline-flex items-center justify-center gap-1 bg-white hover:bg-[#E7F3EE] text-[#1E6B56] font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer border border-[#1E6B56]/30"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#1E6B56]" />
                            <span>{t('shop.verify')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Engagements de la boutique */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 p-6 sm:p-8 bg-white rounded-3xl border border-[#EAE1D2] text-center shadow-sm">
          {perks.map((perk) => (
            <div key={perk.key} className="flex flex-col items-center p-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center text-[#D49B37] mb-3">
                {perk.icon}
              </div>
              <h4 className="text-sm font-bold text-[#0C261B] mb-1">{t(`shop.perks.${perk.key}.title`)}</h4>
              <p className="text-xs text-[#6F827B]">{perk.text}</p>
            </div>
          ))}
        </div>

        {/* Parcours qualité */}
        <div
          className="rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl border border-[#234A3F] bg-cover bg-no-repeat min-h-[360px] flex items-center"
          style={{ backgroundImage: "url('/images/beekeeper.webp')", backgroundPosition: 'center 30%' }}
        >
          <div className="absolute inset-0 bg-[#0C261B]/75 sm:bg-[#0C261B]/70 pointer-events-none" />
          <div className="w-full relative z-10 text-start">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FAF6EE] mb-2 drop-shadow-md">{t('shop.journey.title')}</h2>
              <p className="text-xs sm:text-sm md:text-base text-[#D4E2DC] font-medium leading-relaxed">{t('shop.journey.subtitle')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {journey.map((step) => (
                <div
                  key={step.key}
                  className="flex flex-col items-center sm:items-start text-center sm:text-start bg-[#0C261B]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/10 sm:border-0"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0C261B]/90 border border-[#D49B37]/60 flex items-center justify-center text-[#D49B37] mb-3 shadow-lg">
                    {step.icon}
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1">{t(`shop.journey.steps.${step.key}.title`)}</h4>
                  <p className="text-[11px] sm:text-xs text-[#D4E2DC] leading-relaxed">{t(`shop.journey.steps.${step.key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Derniers articles du blog */}
        {(postsLoading || (posts && posts.length > 0)) && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B]">{t('shop.blog.title')}</h2>
                <p className="text-xs sm:text-sm text-[#6F827B] mt-1">{t('shop.blog.subtitle')}</p>
              </div>
              <button
                onClick={onShowBlog}
                className="text-xs sm:text-sm font-bold text-[#C68A28] hover:text-[#0C261B] flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <span>{t('marketplace:blog.allArticles')}</span>
                <ForwardArrow className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {postsLoading && [0, 1, 2].map((i) => <BlogCardSkeleton key={i} />)}
              {posts?.map((post) => (
                <BlogCard key={post.id} post={post} onOpen={onOpenArticle} />
              ))}
            </div>
          </div>
        )}

        {/* Invitation à vérifier un pot */}
        <div className="relative bg-[#0C261B] text-white rounded-3xl p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl border border-[#234A3F]">
          <div className="absolute inset-0 bg-honeycomb-dark opacity-20 pointer-events-none" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-10 items-center relative z-10">
            <div className="md:col-span-7 lg:col-span-8 text-start flex flex-col items-start">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FAF6EE] mb-2 leading-tight">{t('shop.verifyCta.title')}</h3>
              <p className="text-xs sm:text-sm md:text-base text-[#A3B8B0] mb-6 max-w-xl leading-relaxed">{t('shop.verifyCta.text')}</p>
              <button
                onClick={onVerifyProduct}
                className="inline-flex items-center justify-center gap-2 bg-[#D49B37] hover:bg-[#C68A28] text-[#0C261B] font-bold text-sm px-7 py-3 rounded-xl transition-colors cursor-pointer shadow-lg whitespace-nowrap"
              >
                <QrCode className="w-4 h-4" />
                <span>{t('shop.verifyCta.button')}</span>
              </button>
            </div>
            <div className="md:col-span-5 lg:col-span-4 flex justify-center md:justify-end">
              <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#D49B37] bg-white">
                <img src="/images/scan.webp" alt="" loading="lazy" decoding="async" className="w-full h-full object-cover object-center" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
