import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Product, Article } from '../types';
import { PRODUCTS, ARTICLES } from '../data/mockData';
import {
  Heart,
  Star,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Truck,
  ShieldCheck,
  Headphones,
  CreditCard,
  Send,
  Sparkles,
  Droplets,
  Package,
  Layers,
  Leaf,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Check,
  Tag,
  Flame,
  QrCode,
  Award
} from 'lucide-react';

interface ProductsPageProps {
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenArticle: (article: Article) => void;
  onVerifyProduct: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onSelectProduct,
  onAddToCart,
  onOpenArticle,
  onVerifyProduct,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'bestseller' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);

  const categories = [
    { id: 'all', label: 'كل المنتجات', icon: Layers },
    { id: 'honey', label: 'العسل الطبيعي', icon: Droplets },
    { id: 'sticks', label: 'أعواد العافية', icon: Flame },
    { id: 'royal-jelly', label: 'غذاء الملكات', icon: Sparkles },
    { id: 'propolis', label: 'البروبوليس (العكبر)', icon: Leaf },
    { id: 'pollen', label: 'حبوب اللقاح', icon: Tag },
    { id: 'bundles', label: 'باكجات وهدايا', icon: Package },
  ];

  const filteredAndSortedProducts = useMemo(() => {
    let result = PRODUCTS.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.benefits.some((b) => b.toLowerCase().includes(q)) ||
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
      case 'rating':
        result = [...result].sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
        break;
      case 'featured':
      default:
        // default order
        break;
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));

    // Trigger sweet honey confetti burst at click position
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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setTimeout(() => {
        setNewsletterEmail('');
        setSubscribed(false);
      }, 4000);
    }
  };

  const testimonials = [
    {
      name: 'سارة م.',
      role: 'زبونة من تونس',
      text: 'منتجات طبيعية 100% وطعم رائع. الأهم يمكن التحقق منها بسهولة من خلال رمز التتبع المخبري.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    },
    {
      name: 'عبدالله السعيد',
      role: 'عميل مميز - الرياض',
      text: 'عسل السدر لا يُعلى عليه. نقاء ورائحة أصيلة لم أجدها في أي متجر آخر، شكراً لكم.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
    {
      name: 'منى الشريف',
      role: 'زبونة دائمة - جدة',
      text: 'باكج العافية وصلني بتغليف راقي وفخم، استخدمت غذاء الملكات وشعرت بنشاط غير مسبوق.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    }
  ];

  return (
    <div 
      id="products-page" 
      className="relative min-h-screen py-8 sm:py-14 overflow-hidden bg-[#FAF6EE]" 
      dir="rtl"
    >
      {/* 1. Full-Page Fixed Mountain Panorama Background (Covering Entire Page) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/images/jabal.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.22,
        }}
      />

      {/* 2. Full-Page Fixed Honeycomb Texture Grid */}
      <div className="fixed inset-0 bg-honeycomb-pattern opacity-40 pointer-events-none z-0" />

      {/* 3. Ambient Golden & Emerald Radiant Glows */}
      <div className="fixed top-0 right-10 w-[650px] h-[650px] bg-[#D49B37]/15 rounded-full blur-3xl pointer-events-none -translate-y-1/3 z-0" />
      <div className="fixed top-1/2 left-0 w-[550px] h-[550px] bg-[#1E6B56]/10 rounded-full blur-3xl pointer-events-none -translate-x-1/4 z-0" />
      <div className="fixed bottom-0 right-1/4 w-[750px] h-[450px] bg-[#D49B37]/12 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        
        {/* Creative Open Hero Header: Floating Pavilion & Interactive Showcase (Replaces the Green Square) */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-br from-white/95 via-white/85 to-[#FAF4E6]/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 lg:p-12 shadow-2xl border border-[#D49B37]/35 overflow-hidden"
        >
          {/* Subtle Golden Honeycomb Aura inside Card */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D49B37]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1E6B56]/8 rounded-full blur-2xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
            
            {/* Right Column: Hero Typography, Benefits & Smart Search */}
            <div className="lg:col-span-8 space-y-6 text-right">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 bg-[#FAF6EE] border border-[#D49B37]/50 text-[#966718] text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-full shadow-xs">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D49B37] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D49B37]"></span>
                </span>
                <Sparkles className="w-4 h-4 text-[#D49B37]" />
                <span>المتجر الرسمي • قطفة المناحل الطبيعية 100%</span>
              </div>

              {/* Grand Title */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0C261B] tracking-tight leading-tight">
                  متجر كنوز النقاء والعافية
                </h1>
                <p className="text-base sm:text-lg text-[#576B64] font-medium leading-relaxed max-w-2xl">
                  مجموعتنا المختارة من أرقى أنواع العسل الجبلي الخام، غذاء الملكات، البروبوليس، وأعواد الطاقة مع شهادة فحص مخبري موثقة لكل عبوة.
                </p>
              </div>

              {/* 4 Floating Feature Pills */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                <div className="inline-flex items-center gap-1.5 bg-white/80 border border-[#EAE1D2] text-[#0C261B] text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-[#1E6B56]" />
                  <span>فحص مخبري موثق</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white/80 border border-[#EAE1D2] text-[#0C261B] text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs">
                  <Award className="w-4 h-4 text-[#D49B37]" />
                  <span>عسل جبلي خام 100%</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white/80 border border-[#EAE1D2] text-[#0C261B] text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs">
                  <Truck className="w-4 h-4 text-[#1E6B56]" />
                  <span>شحن سريع مبرد ومضمون</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white/80 border border-[#EAE1D2] text-[#0C261B] text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs">
                  <Star className="w-4 h-4 fill-[#D49B37] text-[#D49B37]" />
                  <span>تقييم 4.9 / 5 من عملائنا</span>
                </div>
              </div>

              {/* Creative Search Bar with Interactive Quick Filter Tags */}
              <div className="pt-2 space-y-3">
                <div className="relative flex items-center max-w-2xl group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن عسل السدر، غذاء ملكات، بروبوليس، عسل الكالبتوس..."
                    className="w-full px-5 py-4 pl-12 pr-12 rounded-2xl bg-white/95 text-[#0C261B] text-sm sm:text-base placeholder:text-[#8C9E97] border-2 border-[#D49B37]/30 focus:border-[#D49B37] focus:outline-none focus:ring-4 focus:ring-[#D49B37]/15 shadow-md font-medium transition-all"
                  />
                  <Search className="w-5 h-5 text-[#D49B37] absolute right-4 pointer-events-none" />
                  
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-4 p-1 rounded-full text-[#8C9E97] hover:text-[#0C261B] hover:bg-gray-100 transition-colors"
                      title="مسح البحث"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Popular Search Tags */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[#8C7A60] font-bold">الأكثر بحثاً:</span>
                  {[
                    { label: 'عسل سدر فاخر', query: 'سدر' },
                    { label: 'غذاء الملكات', query: 'غذاء الملكات' },
                    { label: 'بروبوليس نقي', query: 'بروبوليس' },
                    { label: 'أعواد عسل', query: 'أعواد' },
                    { label: 'باكج العافية', query: 'باكج' },
                  ].map((tag) => (
                    <button
                      key={tag.query}
                      onClick={() => setSearchQuery(tag.query)}
                      className="bg-[#FAF6EE] hover:bg-[#D49B37] hover:text-white text-[#0C261B] border border-[#D49B37]/30 font-semibold px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer"
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Left Column: Visual Showcase Badge (Honey Jar + Certified Shield) */}
            <div className="lg:col-span-4 flex justify-center items-center">
              <motion.div 
                whileHover={{ scale: 1.04, rotate: 1 }}
                className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-3xl bg-gradient-to-b from-[#FAF6EE] to-white p-6 shadow-xl border border-[#D49B37]/40 flex flex-col items-center justify-center text-center group cursor-pointer"
                onClick={() => onSelectProduct(PRODUCTS[0])}
              >
                {/* Glowing Aura Ring */}
                <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-[#D49B37]/40 animate-spin-slow pointer-events-none" />

                {/* Product Jar Image */}
                <div className="relative w-40 h-40 mb-3 drop-shadow-2xl">
                  <img
                    src="/images/sedre.png"
                    alt="عسل سدر طبيعي"
                    className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Floating Gold Medal */}
                  <div className="absolute -top-2 -right-2 bg-[#D49B37] text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Jar Details */}
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-[#C68A28] uppercase tracking-wider">
                    المنتج الأكثر طلباً
                  </span>
                  <h3 className="text-base font-bold text-[#0C261B]">
                    عسل السدر الجبلي الأصيل
                  </h3>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#1E6B56] bg-[#E8F4F0] px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>مفحوص مخبرياً بنسبة 100%</span>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </motion.div>

        {/* Category Pills & Filter / Sort Toolbar */}
        <div className="space-y-5">
          
          {/* Categories Row */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? PRODUCTS.length
                  : PRODUCTS.filter((p) => p.category === cat.id).length;

              return (
                <motion.button
                  key={cat.id}
                  id={`filter-pill-${cat.id}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shrink-0 shadow-xs ${
                    isActive
                      ? 'bg-[#0C261B] text-white shadow-md ring-2 ring-[#D49B37]/40'
                      : 'bg-white text-[#0C261B] hover:bg-[#EFE7D7] border border-[#EAE1D2]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D49B37]' : 'text-[#8C7A60]'}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-[#174636] text-[#D49B37]' : 'bg-[#FAF6EE] text-[#6F827B]'
                    }`}
                  >
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Controls Bar: Results Count & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE1D2] shadow-xs">
            <div className="text-xs sm:text-sm text-[#576B64] font-semibold flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#D49B37]" />
              <span>عرض <strong className="text-[#0C261B] font-bold">{filteredAndSortedProducts.length}</strong> منتج متوفر في المتجر</span>
              {searchQuery && (
                <span className="text-[11px] text-[#C68A28] bg-[#FAF6EE] px-2 py-0.5 rounded-md border border-[#EAE1D2]">
                  نتائج البحث عن: "{searchQuery}"
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#576B64] font-bold">الترتيب حسب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#FAF6EE] border border-[#D5C7B0] text-[#0C261B] text-xs sm:text-sm font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#D49B37] cursor-pointer"
              >
                <option value="featured">الأحدث والمميز</option>
                <option value="bestseller">الأكثر طلباً ومبيعاً</option>
                <option value="price-asc">السعر: من الأقل للأعلى</option>
                <option value="price-desc">السعر: من الأعلى للأقل</option>
                <option value="rating">التقييم الأعلى</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredAndSortedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#EAE1D2] space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center mx-auto text-[#D49B37]">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#0C261B]">لم يتم العثور على منتجات مطابقة</h3>
            <p className="text-xs text-[#6F827B]">جرّب البحث بكلمة أخرى أو تصفح كل المنتجات من خلال التبويبات أعلاه.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-2 bg-[#0C261B] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer hover:bg-[#174636]"
            >
              عرض كل المنتجات
            </button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
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
                    {/* Product Image & Wishlist & Badges */}
                    <div className="relative aspect-[4/3.4] overflow-hidden bg-[#FAF6EE]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
                      />

                      {/* Golden Shine sweep on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                      {/* Top Badges (Discount / Best Seller / New) */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-start">
                        {discountPercentage > 0 && (
                          <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                            خصم {discountPercentage}%
                          </span>
                        )}
                        {product.isBestSeller && (
                          <span className="bg-[#0C261B] text-[#D49B37] text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm border border-[#D49B37]/40">
                            الأكثر مبيعاً
                          </span>
                        )}
                        {product.isNew && (
                          <span className="bg-[#1E6B56] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                            جديد
                          </span>
                        )}
                      </div>

                      {/* Wishlist Button */}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => toggleFavorite(product.id, e)}
                        aria-label="إضافة للمفضلة"
                        className="absolute top-2.5 left-2.5 p-2 rounded-full bg-white/90 hover:bg-white shadow-md text-[#0C261B] transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isFav ? 'fill-rose-500 text-rose-500' : 'text-[#8C7A60]'
                          }`}
                        />
                      </motion.button>

                      {/* Weight / Size Badge */}
                      <div className="absolute bottom-2.5 right-2.5 bg-[#0C261B]/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                        {product.weight}
                      </div>

                      {/* Laboratory Verified Batch Pill */}
                      <div className="absolute bottom-2.5 left-2.5 bg-white/95 text-[#1E6B56] text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm border border-[#1E6B56]/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#1E6B56]" />
                        <span>مفحوص مخبرياً</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex flex-col flex-grow justify-between text-right">
                      <div>
                        {/* Subtitle / Category */}
                        <p className="text-[11px] text-[#C68A28] font-extrabold mb-1">
                          {product.categoryLabel}
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#0C261B] mb-1 group-hover:text-[#C68A28] transition-colors leading-snug">
                          {product.name}
                        </h3>
                        
                        <p className="text-xs text-[#6F827B] font-medium line-clamp-2 mb-3 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Star Rating */}
                        <div className="flex items-center gap-1 mb-3 text-[#D49B37]">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-[#D49B37]" />
                          ))}
                          <span className="text-[11px] font-mono text-[#8C7A60] mr-1">
                            ({product.reviewsCount} تقييم)
                          </span>
                        </div>

                        {/* Price Section */}
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-lg sm:text-xl font-extrabold text-[#0C261B]">
                            {product.price} ريال
                          </span>
                          {product.oldPrice && (
                            <span className="text-xs text-[#8C9E97] line-through font-medium">
                              {product.oldPrice} ريال
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons: Add to Cart + Details */}
                      <div className="space-y-2 pt-2 border-t border-[#EAE1D2]">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => handleQuickAdd(product, e)}
                          className={`w-full inline-flex items-center justify-center gap-2 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm ${
                            isJustAdded
                              ? 'bg-[#1E6B56] text-white ring-2 ring-[#D49B37]'
                              : 'bg-[#0C261B] hover:bg-[#15473A] text-white'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-4 h-4 text-[#D49B37]" />
                              <span>تمت الإضافة للسلة ✓</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-4 h-4 text-[#D49B37]" />
                              <span>أضف إلى السلة</span>
                            </>
                          )}
                        </motion.button>

                        <div className="flex items-center gap-2">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProduct(product);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#0C261B] font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer border border-[#EAE1D2]"
                          >
                            <span>عرض التفاصيل</span>
                            <ArrowLeft className="w-3 h-3" />
                          </motion.button>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerifyProduct();
                            }}
                            title="تحقق من شهادة الفحص المخبري"
                            className="inline-flex items-center justify-center gap-1 bg-white hover:bg-[#E7F3EE] text-[#1E6B56] font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer border border-[#1E6B56]/30"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#1E6B56]" />
                            <span>فحص</span>
                          </motion.button>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 4-Column Store Perks Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 p-6 sm:p-8 bg-white rounded-3xl border border-[#EAE1D2] text-center shadow-sm">
          
          <div className="flex flex-col items-center p-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center text-[#D49B37] mb-3 shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#0C261B] mb-1">شحن سريع ومجاني</h4>
            <p className="text-xs text-[#6F827B]">للطلبات فوق 200 ريال لجميع المدن</p>
          </div>

          <div className="flex flex-col items-center p-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center text-[#D49B37] mb-3 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#0C261B] mb-1">فحص مخبري معتمد</h4>
            <p className="text-xs text-[#6F827B]">رمز تحقق وشهادة نقاء مع كل عبوة</p>
          </div>

          <div className="flex flex-col items-center p-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center text-[#D49B37] mb-3 shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#0C261B] mb-1">دفع آمن ومتعدد</h4>
            <p className="text-xs text-[#6F827B]">مدى، فيزا، ماستركارد، تابي وتمارا</p>
          </div>

          <div className="flex flex-col items-center p-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#D49B37]/40 flex items-center justify-center text-[#D49B37] mb-3 shadow-xs">
              <Headphones className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#0C261B] mb-1">دعم متواصل 24/7</h4>
            <p className="text-xs text-[#6F827B]">فريق متخصص للإجابة عن استفساراتكم</p>
          </div>

        </div>

        {/* "رحلة الجودة في كل قطرة" Section with beekeeper.jpg background */}
        <div
          className="rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl border border-[#234A3F] bg-cover bg-center bg-no-repeat min-h-[360px] flex items-center"
          style={{
            backgroundImage: "url('/images/beekeeper.jpg')",
            backgroundPosition: "center 30%",
          }}
        >
          <div className="absolute inset-0 bg-[#0C261B]/75 sm:bg-[#0C261B]/70 backdrop-blur-[1px] pointer-events-none" />

          <div className="w-full relative z-10 text-right">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FAF6EE] mb-2 drop-shadow-md">
                رحلة الجودة في كل قطرة
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-[#D4E2DC] font-medium leading-relaxed drop-shadow">
                من الخلية النقية في أعالي الجبال إلى مائدتك، نلتزم بأعلى معايير الشفافية والدقة المخبرية.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <div className="flex flex-col items-center sm:items-start text-center sm:text-right bg-[#0C261B]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/10 sm:border-0 backdrop-blur-sm sm:backdrop-blur-none">
                <div className="w-12 h-12 rounded-xl bg-[#0C261B]/90 border border-[#D49B37]/60 flex items-center justify-center text-[#D49B37] mb-3 shadow-lg">
                  <Droplets className="w-6 h-6" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white mb-1 drop-shadow">من الطبيعة</h4>
                <p className="text-[11px] sm:text-xs text-[#D4E2DC] leading-relaxed">أفضل المراعي والمحميات الجبلية</p>
              </div>

              <div className="flex flex-col items-center sm:items-start text-center sm:text-right bg-[#0C261B]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/10 sm:border-0 backdrop-blur-sm sm:backdrop-blur-none">
                <div className="w-12 h-12 rounded-xl bg-[#0C261B]/90 border border-[#D49B37]/60 flex items-center justify-center text-[#D49B37] mb-3 shadow-lg">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white mb-1 drop-shadow">استخراج بعناية</h4>
                <p className="text-[11px] sm:text-xs text-[#D4E2DC] leading-relaxed">تعبئة باردة تحفظ الإنزيمات الحية</p>
              </div>

              <div className="flex flex-col items-center sm:items-start text-center sm:text-right bg-[#0C261B]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/10 sm:border-0 backdrop-blur-sm sm:backdrop-blur-none">
                <div className="w-12 h-12 rounded-xl bg-[#0C261B]/90 border border-[#D49B37]/60 flex items-center justify-center text-[#D49B37] mb-3 shadow-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white mb-1 drop-shadow">فحص مخبري</h4>
                <p className="text-[11px] sm:text-xs text-[#D4E2DC] leading-relaxed">تحليل كيميائي ومجهري شامل</p>
              </div>

              <div className="flex flex-col items-center sm:items-start text-center sm:text-right bg-[#0C261B]/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/10 sm:border-0 backdrop-blur-sm sm:backdrop-blur-none">
                <div className="w-12 h-12 rounded-xl bg-[#0C261B]/90 border border-[#D49B37]/60 flex items-center justify-center text-[#D49B37] mb-3 shadow-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white mb-1 drop-shadow">أصالة مضمونة</h4>
                <p className="text-[11px] sm:text-xs text-[#D4E2DC] leading-relaxed">رمز تحقق يضمن الأصالة 100%</p>
              </div>
            </div>
          </div>
        </div>

        {/* "ماذا يقول عملاؤنا؟" Testimonials Card Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE1D2] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0C261B]">
              ماذا يقول عملاؤنا عن متجرنا؟
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setActiveReviewIdx((prev) =>
                    prev === 0 ? testimonials.length - 1 : prev - 1
                  )
                }
                aria-label="التقييم السابق"
                className="w-8 h-8 rounded-full bg-[#FAF6EE] hover:bg-[#EFE6D5] flex items-center justify-center text-[#0C261B] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setActiveReviewIdx((prev) =>
                    (prev + 1) % testimonials.length
                  )
                }
                aria-label="التقييم التالي"
                className="w-8 h-8 rounded-full bg-[#FAF6EE] hover:bg-[#EFE6D5] flex items-center justify-center text-[#0C261B] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right bg-[#FAF6EE] p-5 rounded-2xl border border-[#EAE1D2]">
            <img
              src={testimonials[activeReviewIdx].avatar}
              alt={testimonials[activeReviewIdx].name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#D49B37] shadow-sm shrink-0"
            />
            <div className="flex-grow">
              <div className="flex items-center justify-center sm:justify-start gap-1 text-[#D49B37] mb-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D49B37]" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-[#0C261B] font-semibold leading-relaxed mb-2">
                "{testimonials[activeReviewIdx].text}"
              </p>
              <div className="text-xs font-bold text-[#8C7A60]">
                {testimonials[activeReviewIdx].name} • {testimonials[activeReviewIdx].role}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveReviewIdx(i)}
                aria-label={`تقييم رقم ${i + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeReviewIdx === i ? 'w-6 bg-[#D49B37]' : 'w-2 bg-[#D5C7B0]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* "مقالات ونصائح العافية" Section (3 Cards) */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B]">
                مقالات ونصائح العافية
              </h2>
              <p className="text-xs sm:text-sm text-[#6F827B] mt-1">
                معلومات علمية موثوقة حول فوائد منتجات الخلية وطرق استخدامها
              </p>
            </div>
            <button
              onClick={() => onOpenArticle(ARTICLES[0])}
              className="text-xs sm:text-sm font-bold text-[#C68A28] hover:text-[#0C261B] flex items-center gap-1 transition-colors"
            >
              <span>عرض كل المقالات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ARTICLES.slice(0, 3).map((art) => (
              <div
                key={art.id}
                onClick={() => onOpenArticle(art)}
                className="group bg-white rounded-2xl overflow-hidden border border-[#EAE1D2] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-[#FAF6EE]">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2 left-2 bg-[#0C261B]/90 text-[#FAF6EE] text-[10px] font-bold px-2 py-0.5 rounded">
                    {art.date}
                  </div>
                </div>
                <div className="p-4 flex flex-col justify-between flex-grow text-right">
                  <h3 className="text-base font-bold text-[#0C261B] group-hover:text-[#C68A28] transition-colors leading-snug mb-2">
                    {art.title}
                  </h3>
                  <p className="text-xs text-[#6F827B] line-clamp-2 leading-relaxed">
                    {art.snippet}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Subscription Banner */}
        <div className="relative bg-[#0C261B] text-white rounded-3xl p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl border border-[#234A3F]">
          <div className="absolute inset-0 bg-honeycomb-dark opacity-20 pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-10 items-center relative z-10">
            <div className="md:col-span-7 lg:col-span-8 text-right flex flex-col items-start">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FAF6EE] mb-2 leading-tight">
                كن أول من يعرف عروض وتخفيضات المتجر
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-[#A3B8B0] font-normal mb-6 max-w-xl leading-relaxed">
                اشترك في نشرتنا البريدية لتصلك أحدث المنتجات وكوبونات الخصم الحصرية ونصائح خبراء النحل.
              </p>

              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-lg">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                  className="w-full px-4 py-3 rounded-xl bg-white text-[#0C261B] text-sm focus:outline-none focus:ring-2 focus:ring-[#D49B37] shadow-inner"
                  dir="rtl"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-[#D49B37] hover:bg-[#C68A28] text-[#0C261B] font-bold text-sm px-7 py-3 rounded-xl transition-all duration-200 cursor-pointer shrink-0 shadow-lg hover:shadow-xl"
                >
                  <span>اشتراك</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {subscribed && (
                <p className="text-xs font-bold text-[#E5AC44] mt-3 animate-fadeIn">
                  ✓ شكراً لاشتراكك! ستصلك رسائلنا وأفضل العروض قريباً.
                </p>
              )}
            </div>

            <div className="md:col-span-5 lg:col-span-4 flex justify-center md:justify-end">
              <div className="relative w-full max-w-sm sm:max-w-xs md:max-w-full aspect-[4/3] sm:aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#D49B37] bg-white">
                <img
                  src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1000&q=95"
                  alt="عسل طبيعي نقي"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                  loading="eager"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

