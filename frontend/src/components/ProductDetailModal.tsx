import React, { useState } from 'react';
import { Product } from '../types';
import {
  X,
  Star,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  ShoppingCart,
  QrCode,
  MapPin,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, weight: string) => void;
  onVerifyBatch: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onVerifyBatch,
}) => {
  const [selectedWeight, setSelectedWeight] = useState('500g');
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!product) return null;

  const weights = ['250g', '500g', '1kg'];

  const handleAdd = () => {
    onAddToCart(product, quantity, selectedWeight);
    setAddedSuccess(true);
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#D49B37', '#0C261B'],
      });
    } catch {
      // safe
    }
    setTimeout(() => {
      setAddedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C261B]/75 backdrop-blur-sm animate-fadeIn">
      <div
        id="product-detail-modal"
        className="relative w-full max-w-2xl bg-[#FAF6EE] rounded-2xl shadow-2xl border-2 border-[#EAE1D2] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/90 text-[#0C261B] hover:bg-white shadow-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-right">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Product Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#EAE1D2] shadow-sm">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-[#0C261B] text-white text-[11px] font-bold px-2.5 py-1 rounded-md border border-[#D49B37]/50">
                {product.purity}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#8C7A60] block mb-1">
                  {product.categoryLabel}
                </span>
                <h2 className="text-2xl font-extrabold text-[#0C261B] mb-1">
                  {product.name}
                </h2>
                <p className="text-xs text-[#6F827B] font-medium mb-3">
                  {product.subtitle}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-1.5 text-[#D49B37] mb-4">
                  {[...Array(product.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#D49B37]" />
                  ))}
                  <span className="text-xs font-mono text-[#8C7A60] mr-1">
                    ({product.reviewsCount} تقييم معتمد)
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-black text-[#0C261B]">
                    {product.price} ر.س
                  </span>
                  {product.oldPrice && (
                    <span className="text-sm font-semibold text-[#A0AFA9] line-through">
                      {product.oldPrice} ر.س
                    </span>
                  )}
                </div>

                {/* Origin */}
                <div className="flex items-center gap-1.5 text-xs text-[#576B64] mb-4">
                  <MapPin className="w-4 h-4 text-[#D49B37] shrink-0" />
                  <span>المصدر: {product.origin}</span>
                </div>
              </div>

              {/* Weight Selector */}
              <div>
                <span className="text-xs font-bold text-[#0C261B] block mb-2">
                  اختر الحجم:
                </span>
                <div className="flex gap-2">
                  {weights.map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeight(w)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedWeight === w
                          ? 'bg-[#0C261B] text-white border-2 border-[#0C261B]'
                          : 'bg-white text-[#0C261B] border border-[#EAE1D2] hover:bg-[#F2EAE0]'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Description & Benefits */}
          <div className="space-y-3 pt-4 border-t border-[#EAE1D2]">
            <h4 className="text-sm font-extrabold text-[#0C261B]">وصف المنتج:</h4>
            <p className="text-xs sm:text-sm text-[#576B64] leading-relaxed">
              {product.description}
            </p>

            <div className="bg-white p-3.5 rounded-xl border border-[#EAE1D2] space-y-2 mt-2">
              <span className="text-xs font-bold text-[#0C261B] block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D49B37]" />
                أبرز الفوائد والخصائص:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#576B64]">
                {product.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#1E6B56] shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Batch Verification Shortcut */}
          <div className="bg-[#FAF0DC] rounded-xl p-3.5 border border-[#D49B37]/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-[#D49B37]" />
              <div>
                <span className="text-xs font-bold text-[#0C261B] block">
                  رمز الدفعة الحالي: {product.batchCode}
                </span>
                <span className="text-[10px] text-[#7A8C85]">
                  مفحوص ومسجل في سجلات الجودة والمناحل
                </span>
              </div>
            </div>

            <button
              onClick={() => onVerifyBatch(product)}
              className="text-xs font-bold text-[#0C261B] bg-white hover:bg-[#FAF6EE] px-3 py-1.5 rounded-lg border border-[#D49B37] transition-colors cursor-pointer"
            >
              عرض الشهادة
            </button>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="bg-[#EAE1D2] px-6 py-4 border-t border-[#D5C7B0] flex items-center justify-between shrink-0">
          
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-[#D5C7B0]">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-1 text-[#0C261B] hover:text-[#D49B37] cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm font-mono w-5 text-center text-[#0C261B]">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="p-1 text-[#0C261B] hover:text-[#D49B37] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAdd}
            disabled={addedSuccess}
            className={`inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-lg shadow-sm transition-all cursor-pointer ${
              addedSuccess
                ? 'bg-[#1E6B56] text-white'
                : 'bg-[#0C261B] hover:bg-[#15473A] text-white'
            }`}
          >
            {addedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>تمت الإضافة للسلة!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 text-[#D49B37]" />
                <span>إضافة إلى السلة • {(product.price * quantity)} ر.س</span>
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};
