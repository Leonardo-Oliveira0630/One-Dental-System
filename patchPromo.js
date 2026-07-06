import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const promoCode = `
      {!activeSupplierOrg?.storeSettings?.layoutBlocks && rankedProducts.filter(p => p.isPromotion).length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="text-orange-500" size={24} />
            <h2 className="text-2xl font-bold text-slate-800">Ofertas em Destaque</h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
            {rankedProducts.filter(p => p.isPromotion).map(p => (
              <div 
                key={p.id} 
                onClick={() => openProductDetail(p)}
                className="snap-start min-w-[240px] w-[240px] flex-shrink-0 bg-gradient-to-br from-orange-50 to-white border border-orange-200 hover:border-orange-500 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all cursor-pointer relative shadow-sm hover:shadow-md"
              >
                <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Promoção
                </div>
                <div className="p-3 space-y-3">
                  <div className="aspect-square bg-white border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-slate-300 stroke-1" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors">{p.name}</h3>
                  </div>
                </div>
                <div className="p-3 pt-0 mt-auto">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-slate-400 line-through">R$ {p.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xl font-black text-orange-600 font-mono tracking-tight leading-none">
                      <span className="text-xs font-bold mr-1">R$</span>
                      {(p.promotionalPrice || p.sellPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSupplierOrg && activeSupplierOrg.storeSettings?.layoutBlocks ? (
`;

content = content.replace("{activeSupplierOrg && activeSupplierOrg.storeSettings?.layoutBlocks ? (", promoCode);

fs.writeFileSync(filePath, content);
