import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../../../types';
import { ProductReviews } from '../ProductReviews';
import { 
  X, ShoppingBag, Plus, Minus, Check, Building2, Package, 
  Sparkles, Layers, ShieldCheck, Truck, ChevronDown, ChevronUp, Share2,
  MessageSquare
} from 'lucide-react';

interface StoreProductDetailModalProps {
  product: InventoryItem | null;
  supplierName: string;
  onClose: () => void;
  onAddToCart: (
    product: InventoryItem, 
    customVar?: any, 
    selectedOptions?: any[], 
    quantity?: number
  ) => void;
  onShareProduct?: (product: InventoryItem) => void;
  onOpenChat?: (product: InventoryItem) => void;
}

export const StoreProductDetailModal: React.FC<StoreProductDetailModalProps> = ({
  product,
  supplierName,
  onClose,
  onAddToCart,
  onShareProduct,
  onOpenChat
}) => {
  if (!product) return null;

  const [activeImage, setActiveImage] = useState<string>(product.imageUrl || '');
  const [selectedVariation, setSelectedVariation] = useState<any>(
    product.variations && product.variations.length > 0 ? product.variations[0] : null
  );
  const [selectedOptions, setSelectedOptions] = useState<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceModifier: number;
  }[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showSpecs, setShowSpecs] = useState(true);
  const [showShippingInfo, setShowShippingInfo] = useState(false);

  useEffect(() => {
    if (product) {
      setActiveImage(product.imageUrl || '');
      if (product.variations && product.variations.length > 0) {
        setSelectedVariation(product.variations[0]);
        if (product.variations[0].imageUrl) {
          setActiveImage(product.variations[0].imageUrl);
        }
      } else {
        setSelectedVariation(null);
      }
      setSelectedOptions([]);
      setQuantity(1);
    }
  }, [product]);

  const allImages = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.imageUrls || []),
    ...(product.variations?.map(v => v.imageUrl).filter(Boolean) as string[] || [])
  ].filter((v, i, a) => a.indexOf(v) === i);

  const basePrice = (product.isPromotion && product.promotionalPrice)
    ? product.promotionalPrice
    : product.sellPrice;

  const varPriceModifier = selectedVariation?.priceModifier || 0;
  const optionsPriceModifier = selectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0);
  const unitPrice = basePrice + varPriceModifier + optionsPriceModifier;
  const totalPrice = unitPrice * quantity;

  const availableStock = selectedVariation 
    ? (selectedVariation.currentStock ?? product.currentStock ?? 999) 
    : (product.currentStock ?? 999);

  const isOutOfStock = availableStock <= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-[#131B2A] rounded-3xl border border-zinc-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-zinc-900 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-slate-800 bg-zinc-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-600 text-white font-mono text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={12} /> {supplierName}
            </span>
            {product.code && (
              <span className="text-xs text-zinc-400 dark:text-slate-400 font-mono">
                REF: {product.code}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onShareProduct && (
              <button
                type="button"
                onClick={() => onShareProduct(product)}
                className="p-2 text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-slate-800 rounded-xl transition-all"
                title="Compartilhar Produto"
              >
                <Share2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Layout */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Image Gallery Viewport */}
            <div className="space-y-4">
              <div className="relative aspect-square w-full rounded-2xl bg-zinc-100 dark:bg-slate-850 border border-zinc-200/80 dark:border-slate-800 overflow-hidden flex items-center justify-center group">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=600';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-slate-400 gap-2">
                    <Package size={64} strokeWidth={1} />
                    <span className="text-xs font-mono uppercase">Sem Imagem</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden bg-zinc-50 dark:bg-slate-800 shrink-0 transition-all ${
                        activeImage === img
                          ? 'border-blue-600 ring-2 ring-blue-500/20'
                          : 'border-zinc-200 dark:border-slate-700 hover:border-zinc-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Badges */}
              <div className="p-4 bg-zinc-50 dark:bg-slate-850 rounded-2xl border border-zinc-200/70 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-slate-300 font-medium">
                  <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                  <span>Garantia de procedência oficial do fornecedor</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-slate-300 font-medium">
                  <Truck size={16} className="text-blue-500 shrink-0" />
                  <span>Envio direto do estoque da distribuidora</span>
                </div>
              </div>
            </div>

            {/* Right Column: Product Config & Purchase */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-snug">
                  {product.name}
                </h1>
                
                {/* Price Display */}
                <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                  {product.isPromotion && product.promotionalPrice && product.sellPrice > product.promotionalPrice && (
                    <span className="text-sm text-zinc-400 dark:text-slate-400 line-through font-mono">
                      R$ {product.sellPrice.toFixed(2)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-zinc-600 dark:text-slate-400 font-mono">R$</span>
                    <span className="text-3xl font-black text-zinc-950 dark:text-white font-mono tracking-tight">
                      {unitPrice.toFixed(2)}
                    </span>
                  </div>
                  {quantity > 1 && (
                    <span className="text-xs text-zinc-500 dark:text-slate-400 font-mono font-medium">
                      (Total: R$ {totalPrice.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>

              {/* Combo Contents */}
              {product.isCombo && product.comboItems && product.comboItems.length > 0 && (
                <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                    Itens Inclusos neste Combo:
                  </span>
                  <div className="space-y-1.5">
                    {product.comboItems.map((c, i) => (
                      <div key={i} className="flex justify-between items-center text-xs text-purple-950 dark:text-purple-200 font-medium">
                        <span>• {c.name}</span>
                        <span className="font-mono font-bold bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-md">
                          {c.quantity}x un
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variations (Legacy Single-Group) */}
              {product.variations && product.variations.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-slate-400 uppercase tracking-wider block">
                    Selecione a Opção:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.map((v, i) => {
                      const isSelected = selectedVariation?.id === v.id;
                      return (
                        <button
                          key={v.id || i}
                          type="button"
                          onClick={() => {
                            setSelectedVariation(v);
                            if (v.imageUrl) setActiveImage(v.imageUrl);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                              : 'border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 hover:border-zinc-300'
                          }`}
                        >
                          <span>{v.name}</span>
                          {v.priceModifier !== 0 && (
                            <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-zinc-500 dark:text-slate-400'}`}>
                              {v.priceModifier > 0 ? `+R$ ${v.priceModifier.toFixed(2)}` : `-R$ ${Math.abs(v.priceModifier).toFixed(2)}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variation Groups (New Model) */}
              {product.variationGroups && product.variationGroups.length > 0 && (
                <div className="space-y-4">
                  {product.variationGroups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <label className="text-xs font-bold text-zinc-600 dark:text-slate-400 uppercase tracking-wider block">
                        {group.name} {group.selectionType === 'MULTIPLE' ? '(Múltipla Escolha)' : ''}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((opt) => {
                          const isSelected = selectedOptions.some(
                            (o) => o.groupId === group.id && o.optionId === opt.id
                          );
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (opt.imageUrl) setActiveImage(opt.imageUrl);
                                setSelectedOptions((prev) => {
                                  if (group.selectionType === 'SINGLE') {
                                    const filtered = prev.filter((o) => o.groupId !== group.id);
                                    return [
                                      ...filtered,
                                      {
                                        groupId: group.id,
                                        groupName: group.name,
                                        optionId: opt.id,
                                        optionName: opt.name,
                                        priceModifier: opt.priceModifier
                                      }
                                    ];
                                  } else {
                                    if (isSelected) {
                                      return prev.filter(
                                        (o) => !(o.groupId === group.id && o.optionId === opt.id)
                                      );
                                    } else {
                                      return [
                                        ...prev,
                                        {
                                          groupId: group.id,
                                          groupName: group.name,
                                          optionId: opt.id,
                                          optionName: opt.name,
                                          priceModifier: opt.priceModifier
                                        }
                                      ];
                                    }
                                  }
                                });
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                  : 'border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-zinc-800 dark:text-slate-200 hover:border-zinc-300'
                              }`}
                            >
                              <span>{opt.name}</span>
                              {opt.priceModifier > 0 && (
                                <span className="ml-1 text-[10px] opacity-80">
                                  (+R$ {opt.priceModifier.toFixed(2)})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity Stepper & Stock */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600 dark:text-slate-400 uppercase tracking-wider">
                    Quantidade
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-slate-400 font-mono">
                    Disponível: {availableStock} un
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl p-1">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 flex items-center justify-center text-zinc-700 dark:text-slate-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-sm text-zinc-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= availableStock}
                      onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                      className="w-8 h-8 flex items-center justify-center text-zinc-700 dark:text-slate-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {onOpenChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenChat(product);
                      }}
                      className="p-3.5 bg-zinc-100 dark:bg-slate-800 hover:bg-zinc-200 dark:hover:bg-slate-700 text-zinc-900 dark:text-slate-100 font-bold rounded-2xl transition-all border border-zinc-200 dark:border-slate-700 flex items-center justify-center gap-1.5 text-xs shrink-0"
                      title="Tirar dúvidas com o fornecedor"
                    >
                      <MessageSquare size={16} />
                      <span className="hidden sm:inline">Dúvidas?</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      onAddToCart(product, selectedVariation, selectedOptions, quantity);
                      onClose();
                    }}
                    className="flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-slate-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingBag size={18} />
                    <span>{isOutOfStock ? 'Produto Esgotado' : 'Adicionar ao Carrinho'}</span>
                  </button>
                </div>
              </div>

              {/* Accordion: Description & Specifications */}
              <div className="border-t border-zinc-200 dark:border-slate-800 pt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowSpecs(!showSpecs)}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider"
                >
                  <span>Descrição & Especificações</span>
                  {showSpecs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showSpecs && (
                  <div className="text-xs text-zinc-600 dark:text-slate-300 leading-relaxed space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                    <p>{product.description || 'Nenhum detalhe adicional informado.'}</p>
                    {product.categoryId && (
                      <p className="font-mono text-[11px] text-zinc-400 dark:text-slate-400">
                        Categoria ID: {product.categoryId}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Reviews Component */}
              <div className="border-t border-zinc-200 dark:border-slate-800 pt-4">
                <ProductReviews productId={product.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
