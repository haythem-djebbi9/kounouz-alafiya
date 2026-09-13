import React, { useState } from 'react';
import { CartItem } from '../types';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckoutSuccess: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckoutSuccess,
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = subtotal > 200 || items.length === 0 ? 0 : 25;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setOrderComplete(true);
      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D49B37', '#0C261B'],
        });
      } catch {
        // safe
      }
      setTimeout(() => {
        onCheckoutSuccess();
        setOrderComplete(false);
        onClose();
      }, 2500);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#0C261B]/75 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-[#FAF6EE] shadow-2xl border-r border-[#EAE1D2] flex flex-col justify-between text-right animate-slideLeft">
          
          {/* Header */}
          <div className="p-5 bg-[#0C261B] text-white flex items-center justify-between border-b border-[#D49B37]/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#163D32] text-[#D49B37]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#FAF6EE]">سلة المشتريات</h3>
                <span className="text-xs text-[#A3B8B0]">({items.length} منتجات مضافة)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#A3B8B0] hover:text-white hover:bg-[#163D32] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex-grow overflow-y-auto space-y-4">
            {orderComplete ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-[#1E6B56] mx-auto animate-bounce" />
                <h4 className="text-xl font-extrabold text-[#0C261B]">
                  تم استلام طلبك بنجاح!
                </h4>
                <p className="text-xs text-[#576B64] max-w-xs mx-auto leading-relaxed">
                  شكراً لثقتك في كنوز العافية. سيتم تجهيز طلبك وتوصيله مع شهادات الفحص المخبري المعتمدة.
                </p>
                <div className="p-3 bg-white rounded-xl border border-[#D49B37] text-xs font-mono font-bold text-[#0C261B] inline-block">
                  رقم الطلب: #KZ-2025-9481
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-[#D5C7B0] mx-auto" />
                <p className="text-sm font-bold text-[#0C261B]">سلة التسوق فارغة</p>
                <p className="text-xs text-[#8C7A60]">
                  تصفح منتجاتنا وأضف عسلك المفضل للاستمتاع بالطعم الأصيل.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-white rounded-xl p-3.5 border border-[#EAE1D2] shadow-sm flex items-center gap-3"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-lg object-cover border border-[#EAE1D2] shrink-0"
                  />

                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-bold text-[#0C261B]">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-[#A0AFA9] hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[11px] text-[#8C7A60] block mb-2">
                      الحجم: {item.selectedWeight}
                    </span>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0C261B]">
                        {item.product.price * item.quantity} ر.س
                      </span>

                      {/* Quantity Modifier */}
                      <div className="flex items-center gap-2 bg-[#FAF6EE] px-2 py-0.5 rounded-lg border border-[#EAE1D2]">
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity - 1)
                          }
                          className="text-[#0C261B] hover:text-[#D49B37] p-0.5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold font-mono w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="text-[#0C261B] hover:text-[#D49B37] p-0.5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary */}
          {items.length > 0 && !orderComplete && (
            <div className="p-5 bg-white border-t border-[#EAE1D2] space-y-3 shrink-0">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6F827B]">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono font-bold text-[#0C261B]">{subtotal} ر.س</span>
                </div>
                <div className="flex justify-between text-[#6F827B]">
                  <span>التوصيل السريع:</span>
                  <span className="font-mono font-bold text-[#0C261B]">
                    {shipping === 0 ? 'مجاناً' : `${shipping} ر.س`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#0C261B] pt-2 border-t border-[#F2EAE0]">
                  <span>الإجمالي:</span>
                  <span className="font-mono text-base text-[#C68A28]">{total} ر.س</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#1E6B56] bg-[#E7F3EE] p-2 rounded-lg">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>جميع المنتجات تشمل شهادة الفحص المخبري وضمان الاسترجاع.</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#15473A] text-white font-bold text-sm py-3.5 rounded-lg shadow-md transition-all cursor-pointer"
              >
                {isCheckingOut ? (
                  <span>جارِ معالجة وتأكيد الطلب...</span>
                ) : (
                  <>
                    <span>إتمام الطلب والدفع</span>
                    <ArrowLeft className="w-4 h-4 text-[#D49B37]" />
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
