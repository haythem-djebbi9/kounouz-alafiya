import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePriceFormatter } from '../lib/format-price';
import { CartItem, cartLineKey } from '../types';
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
import { api, ApiError, NetworkError, newIdempotencyKey } from '../lib/api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  // Identifiant de ligne : produit + format (voir cartLineKey).
  onUpdateQuantity: (lineKey: string, quantity: number) => void;
  onRemoveItem: (lineKey: string) => void;
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
  const { t } = useTranslation('marketplace');
  const formatPrice = usePriceFormatter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [customer, setCustomer] = useState({ customerName: '', customerPhone: '', customerEmail: '', city: '', shippingAddress: '' });
  // Une clé par commande : réutilisée si l'envoi est rejoué, renouvelée dès
  // que le contenu du panier change (c'est alors une autre commande).
  const [checkoutKey, setCheckoutKey] = useState(() => newIdempotencyKey());
  const cartSignature = items.map((item) => `${cartLineKey(item)}x${item.quantity}`).join('|');
  useEffect(() => {
    setCheckoutKey(newIdempotencyKey());
  }, [cartSignature]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + (item.unitPrice ?? item.product.price) * item.quantity,
    0
  );
  const shipping = subtotal > 200 || items.length === 0 ? 0 : 25;
  const total = subtotal + shipping;

  // Commande réelle (POST /orders) : le backend revalide prix, stock et
  // statut publié, calcule la commission Kounouz et notifie les producteurs.
  const handleCheckout = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!showForm) {
      setShowForm(true);
      return;
    }
    setCheckoutError('');
    setIsCheckingOut(true);
    try {
      const order = await api.post<{ orderNumber: string }>(
        '/orders',
        {
          customerName: customer.customerName,
          customerPhone: customer.customerPhone,
          customerEmail: customer.customerEmail || undefined,
          city: customer.city,
          shippingAddress: customer.shippingAddress,
          // Vente au niveau du SKU : le format choisi est transmis.
          items: items.map((item) => ({
            productId: item.product.id,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
        // Une commande envoyée deux fois (double clic, réseau lent) n'est
        // enregistrée qu'une seule fois.
        { skipAuth: true, idempotencyKey: checkoutKey },
      );
      setOrderNumber(order.orderNumber);
    } catch (err) {
      setIsCheckingOut(false);
      setCheckoutError(
        err instanceof NetworkError
          ? t('marketplace:cart.form.networkError')
          : err instanceof ApiError
            ? err.message
            : t('marketplace:cart.form.error'),
      );
      return;
    }

    setIsCheckingOut(false);
    setOrderComplete(true);
    setShowForm(false);
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
    }, 4000);
  };

  const field = (key: keyof typeof customer, label: string, type = 'text', required = true) => (
    <label className="block">
      <span className="block text-[11px] font-bold text-[#0C261B] mb-1">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={customer[key]}
        onChange={(e) => setCustomer((c) => ({ ...c, [key]: e.target.value }))}
        className="w-full px-3 py-2 text-sm bg-white border border-[#EAE1D2] rounded-lg outline-none focus:border-[#D49B37]"
      />
    </label>
  );

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
                <h3 className="text-base font-bold text-[#FAF6EE]">{t('marketplace:cart.title')}</h3>
                <span className="text-xs text-[#A3B8B0]">{t('marketplace:cart.itemsCount', { count: items.length })}</span>
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
                  {t('marketplace:cart.orderSuccessTitle')}
                </h4>
                <p className="text-xs text-[#576B64] max-w-xs mx-auto leading-relaxed">
                  {t('marketplace:cart.orderSuccessMessage')}
                </p>
                <div className="p-3 bg-white rounded-xl border border-[#D49B37] text-xs font-mono font-bold text-[#0C261B] inline-block">
                  {t('marketplace:cart.form.orderNumber', { number: orderNumber })}
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-[#D5C7B0] mx-auto" />
                <p className="text-sm font-bold text-[#0C261B]">{t('marketplace:cart.emptyTitle')}</p>
                <p className="text-xs text-[#8C7A60]">
                  {t('marketplace:cart.emptyMessage')}
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={cartLineKey(item)}
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
                        onClick={() => onRemoveItem(cartLineKey(item))}
                        className="text-[#A0AFA9] hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[11px] text-[#8C7A60] block mb-2">
                      {t('marketplace:cart.sizeLabel', { weight: item.selectedWeight })}
                    </span>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0C261B]">
                        {formatPrice((item.unitPrice ?? item.product.price) * item.quantity)}
                      </span>

                      {/* Quantity Modifier */}
                      <div className="flex items-center gap-2 bg-[#FAF6EE] px-2 py-0.5 rounded-lg border border-[#EAE1D2]">
                        <button
                          onClick={() =>
                            onUpdateQuantity(cartLineKey(item), item.quantity - 1)
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
                            onUpdateQuantity(cartLineKey(item), item.quantity + 1)
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
                  <span>{t('marketplace:cart.subtotal')}</span>
                  <span className="font-mono font-bold text-[#0C261B]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#6F827B]">
                  <span>{t('marketplace:cart.shipping')}</span>
                  <span className="font-mono font-bold text-[#0C261B]">
                    {shipping === 0 ? t('marketplace:cart.free') : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#0C261B] pt-2 border-t border-[#F2EAE0]">
                  <span>{t('marketplace:cart.total')}</span>
                  <span className="font-mono text-base text-[#C68A28]">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#1E6B56] bg-[#E7F3EE] p-2 rounded-lg">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{t('marketplace:cart.guarantee')}</span>
              </div>

              {showForm && (
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-2.5">
                  <p className="text-xs font-bold text-[#0C261B]">{t('marketplace:cart.form.title')}</p>
                  {field('customerName', t('marketplace:cart.form.name'))}
                  {field('customerPhone', t('marketplace:cart.form.phone'), 'tel')}
                  {field('customerEmail', t('marketplace:cart.form.email'), 'email', false)}
                  {field('city', t('marketplace:cart.form.city'))}
                  {field('shippingAddress', t('marketplace:cart.form.address'))}
                </form>
              )}
              {checkoutError && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{checkoutError}</p>
              )}

              <button
                type={showForm ? 'submit' : 'button'}
                form={showForm ? 'checkout-form' : undefined}
                onClick={showForm ? undefined : () => void handleCheckout()}
                disabled={isCheckingOut}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#0C261B] hover:bg-[#15473A] text-white font-bold text-sm py-3.5 rounded-lg shadow-md transition-all cursor-pointer"
              >
                {isCheckingOut ? (
                  <span>{t('marketplace:cart.processing')}</span>
                ) : (
                  <>
                    <span>{showForm ? t('marketplace:cart.form.confirm') : t('marketplace:cart.checkout')}</span>
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
