import React from 'react';
import { Organization } from '../../../types';
import { 
  Building2, MapPin, Star, Share2, CheckCircle2, 
  Package, ChevronLeft, ArrowRight, ShieldCheck, Sparkles 
} from 'lucide-react';

interface StoreHeroBannerProps {
  supplierOrg: Organization | null;
  bannerIndex: number;
  onPrevBanner?: () => void;
  onNextBanner?: () => void;
  onShareStore?: () => void;
  onBackToAllStores?: () => void;
  productCount: number;
}

export const StoreHeroBanner: React.FC<StoreHeroBannerProps> = ({
  supplierOrg,
  bannerIndex,
  onShareStore,
  onBackToAllStores,
  productCount
}) => {
  if (!supplierOrg) return null;

  const banners = supplierOrg.storeSettings?.banners || [];
  const currentBanner = banners[bannerIndex];

  return (
    <div className="w-full bg-white border-b border-zinc-200/80">
      {/* Supplier Top Brand Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBackToAllStores && (
            <button
              type="button"
              onClick={onBackToAllStores}
              className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
              title="Voltar para Todos os Fornecedores"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Brand Logo Avatar */}
          <div className="relative w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
            {supplierOrg.storeSettings?.profilePhotoUrl || supplierOrg.logoUrl ? (
              <img
                src={supplierOrg.storeSettings?.profilePhotoUrl || supplierOrg.logoUrl}
                alt={supplierOrg.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 size={24} className="text-zinc-600" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-extrabold text-lg text-zinc-950 tracking-tight">
                {supplierOrg.name}
              </h1>
              <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
              {(supplierOrg.city || supplierOrg.state) && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-zinc-400" />
                  {supplierOrg.city ? `${supplierOrg.city} - ${supplierOrg.state || ''}` : supplierOrg.state}
                </span>
              )}
              {supplierOrg.ratingAverage && (
                <span className="flex items-center gap-1 font-bold text-amber-600">
                  <Star size={12} className="fill-amber-500 text-amber-500" />
                  {supplierOrg.ratingAverage.toFixed(1)}
                </span>
              )}
              <span className="text-zinc-400">•</span>
              <span className="font-mono text-zinc-600">{productCount} produtos</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {onShareStore && (
            <button
              type="button"
              onClick={onShareStore}
              className="px-3.5 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Share2 size={13} />
              <span>Compartilhar Loja</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner Visual Viewport */}
      {banners.length > 0 && currentBanner?.imageUrl ? (
        <div className="relative w-full aspect-[21/9] max-h-[360px] bg-zinc-900 overflow-hidden">
          <img
            src={currentBanner.imageUrl}
            alt={currentBanner.title || supplierOrg.name}
            className="w-full h-full object-cover opacity-90 transition-opacity duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/30 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white">
            <div className="max-w-2xl space-y-2">
              <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-md font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                Destaque Oficial
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {currentBanner.title || supplierOrg.name}
              </h2>
              {currentBanner.subtitle && (
                <p className="text-xs sm:text-sm text-zinc-200 line-clamp-2 max-w-xl font-normal">
                  {currentBanner.subtitle}
                </p>
              )}
              {currentBanner.buttonText && (
                <div className="pt-2">
                  <a
                    href={currentBanner.buttonLink || '#'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-950 hover:bg-zinc-100 font-extrabold text-xs rounded-xl transition-all shadow-lg"
                  >
                    <span>{currentBanner.buttonText}</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : supplierOrg.storeSettings?.catchphrase ? (
        <div className="bg-zinc-900 text-white px-6 py-8 text-center space-y-1">
          <p className="text-sm sm:text-base font-bold text-zinc-100 max-w-xl mx-auto">
            "{supplierOrg.storeSettings.catchphrase}"
          </p>
          <p className="text-xs text-zinc-400 font-mono">Loja Verificada Labprox</p>
        </div>
      ) : null}
    </div>
  );
};
