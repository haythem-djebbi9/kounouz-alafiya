import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  Leaf,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Thermometer,
  Truck,
  Utensils,
  Warehouse,
} from 'lucide-react';
import { usePriceFormatter } from '../lib/format-price';
import { usePublicProduct, type PublicLabParameter } from '../lib/marketplace-hooks';
import { FREE_SHIPPING_THRESHOLD, isShippingFree } from '../lib/shop-rules';
import { SITE_CONTACT } from '../lib/site-contact';
import { Product } from '../types';
import { ProductCard } from './shop/ProductCard';

interface ProductDetailPageProps {
  /** null pendant le chargement du catalogue ou si le produit n'existe pas. */
  product: Product | null;
  loading: boolean;
  /** Catalogue complet, pour proposer d'autres produits en bas de page. */
  products: Product[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, weight: string, variantId?: string, unitPrice?: number) => void;
  onSelectProduct: (product: Product) => void;
  onVerifyBatch: (product: Product) => void;
}

// Paramètre mis en avant dans l'encadré « résultat du laboratoire », par ordre
// de préférence : HMF (fraîcheur), puis humidité, puis proline, diastase.
const HIGHLIGHT_KEYS = ['hmf_mg_kg', 'hmf', 'humidite_pct', 'moisture', 'proline_mg_kg', 'diastase'];

const TABS = ['composition', 'usage', 'storage', 'safety'] as const;
type TabKey = (typeof TABS)[number];
const TAB_ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  composition: Leaf,
  usage: Utensils,
  storage: Thermometer,
  safety: ShieldCheck,
};

const FAQ_KEYS = ['crystallization', 'verify', 'storage', 'children'] as const;

const PASSED = new Set(['WITHIN_RANGE', 'NOT_DETECTED']);

// Fiche produit en page entière (/produit/<id>), partageable par son adresse.
export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  loading,
  products,
  onBack,
  onAddToCart,
  onSelectProduct,
  onVerifyBatch,
}) => {
  const { t, i18n } = useTranslation(['marketplace', 'auth']);
  const formatPrice = usePriceFormatter();
  const { data: detail, isLoading: detailLoading } = usePublicProduct(product?.id);
  const report = detail?.labReport ?? null;
  const analysis = report?.analysis ?? null;

  const [selectedWeight, setSelectedWeight] = useState(product?.weight ?? '');
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('composition');
  const [openFaq, setOpenFaq] = useState<string | null>(FAQ_KEYS[0]);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const buyBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedWeight(product?.weight ?? '');
    setQuantity(1);
    setAddedSuccess(false);
    setActiveImage(0);
  }, [product?.id, product?.weight]);

  // Barre d'achat fixe dès que le bloc prix est sorti de l'écran par le haut.
  useEffect(() => {
    const el = buyBoxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product?.id]);

  const related = useMemo(() => {
    if (!product) return [];
    const others = products.filter((p) => p.id !== product.id);
    const sameCategory = others.filter((p) => p.category === product.category);
    return [...sameCategory, ...others.filter((p) => p.category !== product.category)].slice(0, 3);
  }, [products, product]);

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-TN' : i18n.language, { dateStyle: 'long' }),
    [i18n.language],
  );
  const formatDate = (value: string | null | undefined) => (value ? dateFormat.format(new Date(value)) : null);

  const paramLabel = (key: string) => t(`auth:publicVerify.resultLabels.${key}`, { defaultValue: key });
  const paramReference = (ref: string | null) =>
    ref ? t(`auth:publicVerify.referenceValues.${ref}`, { defaultValue: ref }) : null;

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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {backButton}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-10 animate-pulse">
            <div className="aspect-square rounded-3xl bg-[#EFE7D7]" />
            <div className="space-y-4">
              <div className="h-4 w-1/3 bg-[#F1EBDF] rounded" />
              <div className="h-10 w-3/4 bg-[#EFE7D7] rounded" />
              <div className="h-32 w-full bg-[#F1EBDF] rounded-2xl" />
              <div className="h-40 w-full bg-[#EFE7D7] rounded-2xl" />
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
  const sizeLabel = selectedVariant?.packageSize ?? product.weight;
  const available = selectedVariant ? selectedVariant.stock : Infinity;
  const outOfStock = available <= 0;
  const lineTotal = unitPrice * quantity;
  const freeShipping = isShippingFree(lineTotal);
  const images = product.images.length > 0 ? product.images : [product.image];

  const parameters = analysis?.parameters ?? [];
  const passedCount = parameters.filter((p) => PASSED.has(p.status)).length;
  const highlight: PublicLabParameter | undefined =
    HIGHLIGHT_KEYS.map((key) => parameters.find((p) => p.parameterKey === key && p.value)).find(Boolean) ??
    parameters.find((p) => p.value);

  const farmName = report?.producer?.farmName ?? product.farmName;
  const location = report?.producer?.location ?? product.producerLocation;
  const honeyType = report?.honeyType ?? product.honeyType;
  const pitch = product.description.split(/(?<=[.!؟?])\s/)[0] ?? '';

  const whyPoints = [
    analysis && t('marketplace:productPage.why.lab', { lab: analysis.laboratory.name, date: formatDate(analysis.analysisDate) }),
    parameters.length > 0 && t('marketplace:productPage.why.params', { passed: passedCount, total: parameters.length }),
    farmName && location && t('marketplace:productPage.why.farm', { farm: farmName, location }),
    product.batchCode && t('marketplace:productPage.why.batch', { code: product.batchCode }),
    t('marketplace:productPage.why.natural'),
  ].filter(Boolean) as string[];

  const chips = [
    location && { icon: MapPin, text: location },
    report?.harvestSeason && { icon: Leaf, text: t('marketplace:productPage.chips.harvest', { season: report.harvestSeason }) },
    honeyType && { icon: Warehouse, text: honeyType },
    analysis && { icon: FlaskConical, text: analysis.laboratory.name },
    product.batchCode && { icon: QrCode, text: product.batchCode, ltr: true },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; text: string; ltr?: boolean }[];

  const handleAdd = () => {
    if (outOfStock) return;
    onAddToCart(product, Math.min(quantity, available), sizeLabel, selectedVariant?.id, unitPrice);
    setAddedSuccess(true);
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ['#D49B37', '#0C261B'] });
    } catch {
      // effet décoratif uniquement
    }
    setTimeout(() => setAddedSuccess(false), 1500);
  };

  const scrollToLab = () => document.getElementById('lab-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const whatsappUrl = `https://wa.me/${SITE_CONTACT.whatsapp}?text=${encodeURIComponent(
    t('marketplace:productPage.whatsappMessage', { product: product.name }),
  )}`;

  const addButton = (extraClass = '') => (
    <button
      onClick={handleAdd}
      disabled={addedSuccess || outOfStock}
      className={`inline-flex items-center justify-center gap-2 font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-md transition-colors cursor-pointer disabled:cursor-not-allowed ${
        addedSuccess
          ? 'bg-[#1E6B56] text-white'
          : 'bg-gradient-to-b from-[#E5AC44] to-[#C68A28] hover:from-[#D49B37] hover:to-[#B8802A] text-[#0C261B] disabled:opacity-50'
      } ${extraClass}`}
    >
      {addedSuccess ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
      <span>
        {addedSuccess
          ? t('marketplace:productDetail.addedToCart')
          : outOfStock
            ? t('marketplace:productDetail.soldOut')
            : t('marketplace:productDetail.addToCartCta')}
      </span>
    </button>
  );

  return (
    <section id="product-detail-page" className="relative bg-[#FAF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-28">
        {backButton}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* ── Galerie (fixe pendant le défilement sur grand écran) ── */}
          <div className="lg:sticky lg:top-32 space-y-3">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-[#EAE1D2] shadow-sm">
              <AnimatePresence mode="wait">
                <motion.img
                  key={images[activeImage]}
                  src={images[activeImage]}
                  alt={product.name}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              <span className="absolute top-4 start-4 inline-flex items-center gap-1.5 bg-[#0C261B] text-white text-xs font-bold px-3 py-1.5 rounded-full border border-[#D49B37]/50 shadow">
                <ShieldCheck className="w-4 h-4 text-[#E5AC44]" />
                {product.purity}
              </span>
              {images.length > 1 && (
                <span className="absolute bottom-4 end-4 bg-white/90 text-[#0C261B] text-xs font-bold px-2.5 py-1 rounded-full">
                  {activeImage + 1} / {images.length}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`${i + 1}`}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors cursor-pointer ${
                      i === activeImage ? 'border-[#D49B37]' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Informations ── */}
          <div className="space-y-6 text-start">
            {/* En-tête */}
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="text-[#C68A28]">{product.categoryLabel}</span>
                {location && (
                  <>
                    <span className="text-[#D5C7B0]">•</span>
                    <span className="inline-flex items-center gap-1 text-[#5E6F68]">
                      <MapPin className="w-3.5 h-3.5 text-[#D49B37]" />
                      {location}
                    </span>
                  </>
                )}
                {sizeLabel && (
                  <span className="ms-auto rounded-md border border-[#D49B37]/50 px-2 py-0.5 text-[#96661A]">{sizeLabel}</span>
                )}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#0C261B] leading-tight">{product.name}</h1>
              {honeyType && honeyType !== product.name && (
                <p className="mt-1 text-lg font-semibold italic text-[#B8802A]">{honeyType}</p>
              )}
              {pitch && <p className="mt-3 text-base text-[#3F524B] leading-relaxed">{pitch}</p>}
            </div>

            {/* Encadré « résultat du laboratoire » */}
            {highlight ? (
              <div className="relative overflow-hidden rounded-2xl bg-[#0C261B] text-white p-5 sm:p-6 shadow-lg">
                <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-[#D49B37]/10 pointer-events-none" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#E5AC44]">
                      {t('marketplace:productPage.labCard.title', { lab: analysis?.laboratory.name })}
                    </p>
                    <p className="mt-2 flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold text-[#F3C766] leading-none" dir="ltr">
                        {highlight.value}
                      </span>
                      {highlight.unit && <span className="text-sm font-semibold text-white/80" dir="ltr">{highlight.unit}</span>}
                    </p>
                    <p className="mt-2 font-bold">{paramLabel(highlight.parameterKey)}</p>
                    {highlight.reference && (
                      <p className="mt-1 text-xs text-white/70">
                        {t('marketplace:productPage.labCard.reference')}{' '}
                        <bdi dir="ltr">{paramReference(highlight.reference)}</bdi>
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 w-12 h-12 rounded-2xl bg-[#D49B37]/15 border border-[#D49B37]/40 flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-[#E5AC44]" />
                  </span>
                </div>
                <div className="relative mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('marketplace:productPage.labCard.passed', { passed: passedCount, total: parameters.length })}
                  </span>
                  <button onClick={scrollToLab} className="text-sm font-bold text-[#E5AC44] hover:text-white underline underline-offset-4 cursor-pointer">
                    {t('marketplace:productPage.labCard.viewAll')}
                  </button>
                </div>
              </div>
            ) : (
              !detailLoading && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D49B37]/40 bg-white p-4">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0C261B]">
                    <ShieldCheck className="w-5 h-5 text-[#1E6B56]" />
                    {t('marketplace:productPage.labCard.fallback')}
                  </span>
                  <button
                    onClick={() => onVerifyBatch(product)}
                    className="shrink-0 text-xs font-bold text-[#0C261B] bg-[#FAF6EE] hover:bg-[#F1E8D6] px-3 py-2 rounded-lg border border-[#D49B37] cursor-pointer"
                  >
                    {t('marketplace:productDetail.viewCertificate')}
                  </button>
                </div>
              )
            )}

            {/* Bloc d'achat */}
            <div ref={buyBoxRef} className="rounded-2xl bg-white border border-[#EAE1D2] p-5 sm:p-6 shadow-sm space-y-4">
              <p className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#0C261B]">{formatPrice(unitPrice)}</span>
                {sizeLabel && <span className="text-sm font-semibold text-[#8C7A60]">/ {sizeLabel}</span>}
                {product.oldPrice && (
                  <span className="text-sm font-semibold text-[#A0AFA9] line-through">{formatPrice(product.oldPrice)}</span>
                )}
              </p>

              {weights.length > 1 && (
                <div>
                  <span className="text-sm font-bold text-[#0C261B] block mb-2">{t('marketplace:productDetail.chooseSizeLabel')}</span>
                  <div className="flex gap-2">
                    {weights.map((w) => {
                      const variant = variants.find((v) => v.packageSize === w);
                      const soldOut = variant ? variant.stock <= 0 : false;
                      const active = sizeLabel === w;
                      return (
                        <button
                          key={w}
                          onClick={() => {
                            setSelectedWeight(w);
                            setQuantity(1);
                          }}
                          disabled={soldOut}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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

              <p
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                  freeShipping ? 'bg-emerald-50 text-emerald-800' : 'bg-[#FFF6E5] text-[#7A4B0E]'
                }`}
              >
                <Truck className="w-4 h-4 shrink-0" />
                {freeShipping
                  ? t('marketplace:productPage.shipping.free')
                  : t('marketplace:productPage.shipping.remaining', {
                      amount: formatPrice(Math.max(0, FREE_SHIPPING_THRESHOLD - lineTotal)),
                    })}
              </p>

              <div className="flex items-stretch gap-3">
                <div className="flex items-center gap-3 bg-[#FAF6EE] px-3 rounded-xl border border-[#D5C7B0]">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="-"
                    className="p-1 text-[#0C261B] hover:text-[#D49B37] cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold w-5 text-center text-[#0C261B]">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(q + 1, available))}
                    aria-label="+"
                    className="p-1 text-[#0C261B] hover:text-[#D49B37] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {addButton('flex-1')}
              </div>

              <p className="flex items-center gap-2 text-sm text-[#3F524B]">
                <Truck className="w-4 h-4 text-[#1E6B56] shrink-0" />
                {t('marketplace:productPage.delivery')}
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-[#EAE1D2] py-3 text-sm font-bold text-[#0C261B] hover:border-[#25D366] hover:text-[#128C4B] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                {t('marketplace:productPage.question')}
              </a>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAE1D2] text-center">
                {[
                  { icon: Banknote, text: t('marketplace:productPage.trust.cod') },
                  { icon: FlaskConical, text: t('marketplace:productPage.trust.lab') },
                  { icon: QrCode, text: t('marketplace:productPage.trust.qr') },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex flex-col items-center gap-1.5 pt-2">
                    <Icon className="w-5 h-5 text-[#C68A28]" />
                    <span className="text-[11px] sm:text-xs font-semibold text-[#3F524B] leading-tight">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map(({ icon: Icon, text, ltr }) => (
                  <span
                    key={text}
                    dir={ltr ? 'ltr' : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE1D2] bg-white px-3 py-1.5 text-xs font-bold text-[#3F524B]"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#C68A28]" />
                    {text}
                  </span>
                ))}
              </div>
            )}

            {/* Pourquoi le choisir */}
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0C261B]">
                <span className="w-2 h-2 rounded-full bg-[#D49B37]" />
                {t('marketplace:productPage.why.title')}
              </h2>
              <ul className="mt-4 space-y-2">
                {whyPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 rounded-xl bg-white border border-[#EAE1D2] px-4 py-3">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-[#FAF0DC] text-[#C68A28] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-[#0C261B] leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
              {/* Le texte complet n'est repris que s'il va au-delà de l'accroche du haut. */}
              {product.description.trim().length > pitch.trim().length && (
                <p className="mt-4 text-[15px] text-[#3F524B] leading-8">{product.description}</p>
              )}
            </div>

            {/* Tous les détails (onglets) */}
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0C261B]">
                <span className="w-2 h-2 rounded-full bg-[#D49B37]" />
                {t('marketplace:productPage.tabs.title')}
              </h2>
              <div role="tablist" className="mt-4 flex flex-wrap gap-2">
                {TABS.map((key) => {
                  const Icon = TAB_ICONS[key];
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(key)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold border transition-colors cursor-pointer ${
                        active ? 'bg-[#D49B37] border-[#D49B37] text-[#0C261B]' : 'bg-white border-[#EAE1D2] text-[#3F524B] hover:border-[#D49B37]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t(`marketplace:productPage.tabs.${key}.label`)}
                    </button>
                  );
                })}
              </div>
              <div role="tabpanel" className="mt-3 rounded-2xl bg-white border border-[#EAE1D2] p-5 text-[15px] text-[#3F524B] leading-8">
                {activeTab === 'composition' && (
                  <p>{t('marketplace:productPage.tabs.composition.text', { honey: honeyType ?? product.name })}</p>
                )}
                {activeTab === 'usage' && <p>{t('marketplace:productPage.tabs.usage.text')}</p>}
                {activeTab === 'storage' && <p>{t('marketplace:productPage.tabs.storage.text')}</p>}
                {activeTab === 'safety' && (
                  <p className="flex gap-2.5 items-start font-semibold text-[#6B4410]">
                    <AlertTriangle className="w-5 h-5 text-[#C68A28] shrink-0 mt-1" />
                    <span>{t('marketplace:productDetail.healthNotice')}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Résultats du laboratoire ── */}
        {analysis && parameters.length > 0 && (
          <div id="lab-results" className="mt-16 scroll-mt-28 rounded-3xl bg-white border border-[#EAE1D2] p-5 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C261B]">{t('marketplace:productPage.lab.title')}</h2>
                <p className="mt-2 text-sm text-[#5E6F68]">
                  {analysis.laboratory.name}
                  {analysis.laboratory.accreditationNo && ` · ${t('marketplace:productPage.lab.accreditation', { number: analysis.laboratory.accreditationNo })}`}
                  {` · ${formatDate(analysis.analysisDate)}`}
                </p>
                {product.batchCode && (
                  <p className="mt-1 text-sm text-[#5E6F68]">
                    {t('marketplace:productPage.lab.batch')} <span dir="ltr" className="font-mono font-bold text-[#0C261B]">{product.batchCode}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => onVerifyBatch(product)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0C261B] hover:bg-[#143B2B] px-5 py-3 text-sm font-bold text-white cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#E5AC44]" />
                {t('marketplace:productPage.lab.verify')}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {parameters.map((param) => {
                const passed = PASSED.has(param.status);
                const reference = paramReference(param.reference);
                return (
                  <div key={param.parameterKey} className="flex items-center justify-between gap-4 rounded-2xl border border-[#EAE1D2] bg-[#FDFBF6] px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="font-bold text-[#0C261B]">{paramLabel(param.parameterKey)}</p>
                      {reference && (
                        <p className="text-xs text-[#6F7F78] mt-0.5">
                          {t('marketplace:productPage.lab.reference')} <bdi dir="ltr">{reference}</bdi>
                        </p>
                      )}
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-lg font-extrabold text-[#0C261B]" dir="ltr">
                        {param.value ?? '—'} {param.unit && <span className="text-xs font-semibold text-[#8C7A60]">{param.unit}</span>}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          passed ? 'text-emerald-700' : param.status === 'NOT_APPLICABLE' ? 'text-[#8C7A60]' : 'text-amber-700'
                        }`}
                      >
                        {passed && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {t(`marketplace:productPage.lab.status.${param.status}`)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Du rucher à votre table ── */}
        {farmName && (
          <div className="mt-10 rounded-3xl bg-[#0C261B] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#E5AC44]">{t('marketplace:productPage.producer.eyebrow')}</p>
              <p className="mt-1 text-2xl font-extrabold">{farmName}</p>
              {location && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/80">
                  <MapPin className="w-4 h-4 text-[#E5AC44]" />
                  {location}
                </p>
              )}
            </div>
            <p className="max-w-md text-sm text-white/80 leading-relaxed">{t('marketplace:productPage.producer.text')}</p>
          </div>
        )}

        {/* ── Questions fréquentes ── */}
        <div className="mt-16 max-w-3xl">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0C261B]">
            <span className="w-2 h-2 rounded-full bg-[#D49B37]" />
            {t('marketplace:productPage.faq.title')}
          </h2>
          <div className="mt-4 space-y-3">
            {FAQ_KEYS.map((key) => {
              const isOpen = openFaq === key;
              return (
                <div key={key} className={`rounded-2xl border transition-colors ${isOpen ? 'border-[#D49B37] bg-white' : 'border-[#EAE1D2] bg-white'}`}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start cursor-pointer"
                  >
                    <span className="font-bold text-[#0C261B]">{t(`marketplace:productPage.faq.${key}.q`)}</span>
                    <ChevronDown className={`w-5 h-5 text-[#C68A28] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && <p className="px-5 pb-5 text-[15px] text-[#3F524B] leading-relaxed">{t(`marketplace:productPage.faq.${key}.a`)}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Autres produits ── */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#0C261B]">
              <span className="w-2 h-2 rounded-full bg-[#D49B37]" />
              {t('marketplace:productPage.related')}
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p, idx) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  index={idx}
                  onSelect={() => onSelectProduct(p)}
                  onAdd={() => onAddToCart(p, 1, p.weight)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Barre d'achat fixe ── */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-0 inset-x-0 z-30 border-t border-[#EAE1D2] bg-white/95 backdrop-blur-md shadow-[0_-8px_24px_rgba(12,38,27,0.08)]"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
              <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#EAE1D2] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#0C261B] truncate">{product.name}</p>
                <p className="text-xs text-[#5E6F68]">
                  {formatPrice(unitPrice)}
                  {sizeLabel && ` / ${sizeLabel}`} · {t('marketplace:productPage.trust.cod')}
                </p>
              </div>
              {addButton('shrink-0 !py-3 !px-5')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
