import React from 'react';
import { InventoryItem } from '../../../types';
import { Package, Building2, Plus, Sparkles, Layers } from 'lucide-react';

interface StoreProductCardProps {
  product: InventoryItem;
  supplierName: string;
  onOpenDetail: (product: InventoryItem) => void;
  onAddToCart?: (product: InventoryItem) => void;
}

export const StoreProductCard: React.FC<StoreProductCardProps> = ({
  product,
  supplierName,
  onOpenDetail
}) => {
  const isPromo = Boolean(
    product.isPromotion || 
    (product.promotionalPrice && product.promotionalPrice < product.sellPrice) ||
    product.isCombo
  );

  const displayPrice = isPromo && product.promotionalPrice 
    ? product.promotionalPrice 
    : product.sellPrice;

  const discountPercent = isPromo && product.promotionalPrice && product.sellPrice > 0
    ? Math.round(((product.sellPrice - product.promotionalPrice) / product.sellPrice) * 100)
    : 0;

  return (
    <div 
      onClick={() => onOpenDetail(product)}
      className="group relative flex flex-col justify-between bg-white rounded-2xl border border-zinc-200/80 hover:border-zinc-900/40 p-3.5 sm:p-4 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-950/5 cursor-pointer"
    >
      <div className="space-y-3">
        {/* Product Image Container */}
        <div className="relative aspect-square w-full rounded-xl bg-zinc-100/70 border border-zinc-200/60 overflow-hidden flex items-center justify-center">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=400';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-400 gap-1">
              <Package size={36} strokeWidth={1.2} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Sem Imagem</span>
            </div>
          )}

          {/* Floating Badges (Top-Left) */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {discountPercent > 0 && (
              <span className="px-2 py-0.5 bg-rose-600 text-white font-bold font-mono text-[10px] rounded-md shadow-xs uppercase tracking-wider">
                -{discountPercent}%
              </span>
            )}
            {product.isCombo && (
              <span className="px-2 py-0.5 bg-purple-600 text-white font-bold font-mono text-[10px] rounded-md shadow-xs uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} /> Combo
              </span>
            )}
          </div>

          {/* Supplier badge (Top-Right) */}
          {supplierName && (
            <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md border border-zinc-200/80 px-2 py-0.5 rounded-lg text-[10px] font-medium text-zinc-700 flex items-center gap-1 shadow-xs max-w-[120px] truncate">
              <Building2 size={10} className="text-zinc-500 shrink-0" />
              <span className="truncate">{supplierName}</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-1.5 pt-0.5">
          {product.variations && product.variations.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
              <Layers size={12} />
              <span>{product.variations.length} opções disponíveis</span>
            </div>
          )}

          <h3 className="font-bold text-sm text-zinc-900 leading-snug line-clamp-2 group-hover:text-zinc-700 transition-colors">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
      </div>

      {/* Price & Action Section */}
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
        <div>
          {isPromo && product.promotionalPrice && product.sellPrice > product.promotionalPrice && (
            <span className="block text-[11px] text-zinc-400 line-through font-mono">
              R$ {product.sellPrice.toFixed(2)}
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-zinc-500 font-mono">R$</span>
            <span className="text-base font-extrabold text-zinc-950 font-mono tracking-tight">
              {displayPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(product);
          }}
          className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} />
          <span>Comprar</span>
        </button>
      </div>
    </div>
  );
};
