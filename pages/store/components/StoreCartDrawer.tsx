import React from 'react';
import { InventoryItem } from '../../../types';
import { 
  X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, 
  Check, Sparkles, ShieldCheck, Tag, Building2 
} from 'lucide-react';

export interface SupplierCartItem {
  id: string;
  product: InventoryItem;
  quantity: number;
  variation?: {
    id: string;
    name: string;
    priceModifier: number;
    imageUrl?: string;
  };
  selectedOptions?: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceModifier: number;
  }[];
  selectedTeeth?: string[];
}

interface StoreCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: SupplierCartItem[];
  getSupplierName: (orgId: string) => string;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  cartTotals: {
    baseTotal: number;
    discount: number;
    finalTotal: number;
  };
  couponCodeInput: string;
  setCouponCodeInput: (code: string) => void;
  appliedCoupon: any | null;
  setAppliedCoupon: (coupon: any | null) => void;
  couponError: string;
  checkingCoupon: boolean;
  handleApplyCoupon: () => void;
  onProceedToCheckout: () => void;
}

export const StoreCartDrawer: React.FC<StoreCartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  getSupplierName,
  updateQuantity,
  removeFromCart,
  cartTotals,
  couponCodeInput,
  setCouponCodeInput,
  appliedCoupon,
  setAppliedCoupon,
  couponError,
  checkingCoupon,
  handleApplyCoupon,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-zinc-950">Sua Cesta</h2>
              <p className="text-xs text-zinc-500 font-medium">
                {cart.length} {cart.length === 1 ? 'item adicionado' : 'itens adicionados'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                <ShoppingBag size={28} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-zinc-800 text-sm">Sua cesta está vazia</p>
                <p className="text-xs text-zinc-500 max-w-[240px]">
                  Explore o catálogo de fornecedores e adicione insumos ou equipamentos à sua cesta.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {cart.map((item) => {
                const isPromo = item.product.isPromotion && item.product.promotionalPrice;
                const baseItemPrice = isPromo ? item.product.promotionalPrice! : item.product.sellPrice;
                const varModifier = item.variation?.priceModifier || 0;
                const optsModifier = item.selectedOptions?.reduce((s, o) => s + o.priceModifier, 0) || 0;
                const unitPrice = baseItemPrice + varModifier + optsModifier;
                const itemTotal = unitPrice * item.quantity;
                const itemImg = item.variation?.imageUrl || item.product.imageUrl;

                return (
                  <div 
                    key={item.id}
                    className="p-4 bg-zinc-50/80 border border-zinc-200/80 rounded-2xl space-y-3 relative group"
                  >
                    <div className="flex gap-3.5 items-start">
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-white border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {itemImg ? (
                          <img 
                            src={itemImg} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ShoppingBag size={20} className="text-zinc-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-zinc-950 leading-snug line-clamp-2">
                            {item.product.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-zinc-400 hover:text-rose-600 p-1 transition-colors shrink-0"
                            title="Remover"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Variation tag */}
                        {item.variation && (
                          <span className="inline-block text-[11px] font-bold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                            Opção: {item.variation.name}
                          </span>
                        )}

                        {/* Selected options */}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.selectedOptions.map((opt) => (
                              <span key={opt.optionId} className="text-[10px] bg-white border border-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded">
                                {opt.groupName}: {opt.optionName}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono uppercase pt-0.5">
                          <Building2 size={10} />
                          <span>{getSupplierName(item.product.organizationId)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Item Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
                      <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-950"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold font-mono text-zinc-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-950"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black font-mono text-zinc-950">
                          R$ {itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer / Coupon & Checkout */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-zinc-200 bg-zinc-50/90 space-y-4">
            {/* Coupon Input */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-2.5 text-zinc-400" size={14} />
                  <input
                    type="text"
                    placeholder="CUPOM DE DESCONTO"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    disabled={appliedCoupon !== null}
                    className="w-full bg-white border border-zinc-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 uppercase placeholder-zinc-400 outline-none focus:border-zinc-900 disabled:opacity-50"
                  />
                </div>
                {!appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={checkingCoupon || !couponCodeInput.trim()}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    {checkingCoupon ? '...' : 'Aplicar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCodeInput('');
                    }}
                    className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-xl transition-all"
                  >
                    Remover
                  </button>
                )}
              </div>
              {couponError && <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>}
              {appliedCoupon && (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check size={12} /> Cupom {appliedCoupon.code} ativo!
                </p>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 text-xs text-zinc-600 pt-1 border-t border-zinc-200/80">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono">R$ {cartTotals.baseTotal.toFixed(2)}</span>
              </div>
              {cartTotals.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Desconto ({appliedCoupon?.code})</span>
                  <span className="font-mono">- R$ {cartTotals.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-950 font-bold text-base pt-2 border-t border-zinc-200">
                <span>Total Estimado</span>
                <span className="font-mono text-lg font-black">
                  R$ {cartTotals.finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Checkout */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>Prosseguir para Pagamento</span>
              <ArrowRight size={16} />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Checkout seguro integrado via Asaas & PIX</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
