import React from 'react';
import { 
  X, MapPin, Truck, ClipboardCheck, ArrowRight, ShieldCheck, 
  CreditCard, QrCode, AlertCircle, Loader2 
} from 'lucide-react';
import { SupplierCartItem } from './StoreCartDrawer';

interface StoreCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: SupplierCartItem[];
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  setAddress: React.Dispatch<React.SetStateAction<{
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  }>>;
  shippingMethod: 'COMBINE' | 'PAC' | 'SEDEX' | 'FRENET';
  setShippingMethod: (method: 'COMBINE' | 'PAC' | 'SEDEX' | 'FRENET') => void;
  shippingQuotes: any[];
  shippingError: string | null;
  isQuotingShipping: boolean;
  selectedShippingService: any;
  setSelectedShippingService: (service: any) => void;
  hasFrenetToken: boolean;
  notes: string;
  setNotes: (notes: string) => void;
  cartTotals: {
    baseTotal: number;
    discount: number;
    finalTotal: number;
  };
  appliedCoupon: any | null;
  isProcessing: boolean;
  onSubmitOrder: (e: React.FormEvent) => void;
}

export const StoreCheckoutModal: React.FC<StoreCheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  address,
  setAddress,
  shippingMethod,
  setShippingMethod,
  shippingQuotes,
  shippingError,
  isQuotingShipping,
  selectedShippingService,
  setSelectedShippingService,
  hasFrenetToken,
  notes,
  setNotes,
  cartTotals,
  appliedCoupon,
  isProcessing,
  onSubmitOrder
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
              <ClipboardCheck size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-zinc-950">Finalizar Pedido</h2>
              <p className="text-xs text-zinc-500 font-medium">
                Confirme endereço de entrega e opção de envio
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

        {/* Form Body */}
        <form onSubmit={onSubmitOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Shipping Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
              <Truck size={14} className="text-zinc-600" />
              <span>1. Opções de Frete & Envio</span>
            </div>

            {hasFrenetToken ? (
              <div className="space-y-2">
                {isQuotingShipping ? (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-zinc-700" />
                    <span>Calculando opções de frete via Frenet...</span>
                  </div>
                ) : shippingError ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>{shippingError}</span>
                  </div>
                ) : shippingQuotes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {shippingQuotes.map((quote: any, idx) => {
                      const isSelected = shippingMethod === 'FRENET' && selectedShippingService?.ServiceCode === quote.ServiceCode;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setShippingMethod('FRENET');
                            setSelectedShippingService(quote);
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs">{quote.ServiceDescription}</span>
                            <span className="font-mono font-black text-xs">
                              R$ {Number(quote.ShippingPrice).toFixed(2)}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-1 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            Prazo: {quote.DeliveryTime} dias úteis
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Insira o CEP no formulário abaixo para calcular as tarifas de frete automaticamente.
                  </p>
                )}
              </div>
            ) : null}

            {/* Combine with Supplier option */}
            <button
              type="button"
              onClick={() => {
                setShippingMethod('COMBINE');
                setSelectedShippingService(null);
              }}
              className={`w-full p-3.5 rounded-2xl border text-left font-bold text-xs transition-all ${
                shippingMethod === 'COMBINE'
                  ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-800'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>Combinar frete diretamente com o fornecedor</span>
                <span className="text-[11px] font-mono uppercase">A combinar</span>
              </div>
            </button>
          </div>

          {/* Delivery Address */}
          <div className="space-y-3 pt-2 border-t border-zinc-200">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
              <MapPin size={14} className="text-zinc-600" />
              <span>2. Endereço de Entrega</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">Rua / Logradouro</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Paulista"
                  value={address.street}
                  onChange={(e) => setAddress((p) => ({ ...p, street: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">Número</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 1000"
                  value={address.number}
                  onChange={(e) => setAddress((p) => ({ ...p, number: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">Complemento</label>
                <input
                  type="text"
                  placeholder="Apto / Sala / Bloco"
                  value={address.complement}
                  onChange={(e) => setAddress((p) => ({ ...p, complement: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">Bairro</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bela Vista"
                  value={address.neighborhood}
                  onChange={(e) => setAddress((p) => ({ ...p, neighborhood: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">Cidade</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: São Paulo"
                  value={address.city}
                  onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">UF</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  placeholder="SP"
                  value={address.state}
                  onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 uppercase text-center outline-none focus:border-zinc-900 font-mono"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">CEP</label>
                <input
                  type="text"
                  required
                  placeholder="00000-000"
                  value={address.zipCode}
                  onChange={(e) => setAddress((p) => ({ ...p, zipCode: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-900 text-center outline-none focus:border-zinc-900 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2 border-t border-zinc-200">
            <label className="text-[11px] font-bold text-zinc-500 uppercase block">
              3. Observações para Despacho (Opcional)
            </label>
            <textarea
              placeholder="Instruções de entrega, horário de recebimento ou notas ao fornecedor..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 outline-none focus:border-zinc-900 h-20 resize-none leading-relaxed"
            />
          </div>

          {/* Financial Summary */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal dos Produtos ({cart.length} itens)</span>
              <span className="font-mono">R$ {cartTotals.baseTotal.toFixed(2)}</span>
            </div>
            {cartTotals.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Desconto ({appliedCoupon?.code})</span>
                <span className="font-mono">- R$ {cartTotals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>Frete</span>
              <span className="font-mono">
                {selectedShippingService?.ShippingPrice
                  ? `R$ ${Number(selectedShippingService.ShippingPrice).toFixed(2)}`
                  : 'A combinar'}
              </span>
            </div>
            <div className="flex justify-between text-zinc-950 font-black text-sm pt-2 border-t border-zinc-200">
              <span>Total Final</span>
              <span className="font-mono text-base font-black">
                R$ {cartTotals.finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Gerando Cobrança Asaas...</span>
              </>
            ) : (
              <>
                <span>Confirmar e Gerar Cobrança</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
