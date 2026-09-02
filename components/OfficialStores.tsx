import React from 'react';

interface Supplier {
  id: string;
  name: string;
  logoUrl?: string;
  storeSettings?: { profilePhotoUrl?: string };
}

interface OfficialStoresProps {
  suppliers: Supplier[];
  onStoreClick?: (supplierId: string) => void;
}

export const OfficialStores = ({ suppliers, onStoreClick }: OfficialStoresProps) => {
  return (
    <section style={{ paddingTop: '0px', paddingBottom: '0px' }} className="bg-white px-4 sm:px-6 md:px-8 py-0 space-y-4">
      <div className="text-center space-y-2 pt-2">
        <h2 className="text-sm md:text-base font-extrabold tracking-widest text-slate-800 uppercase flex items-center justify-center gap-1.5">
          <span className="text-blue-600 text-lg">✧</span> LOJAS OFICIAIS <span className="text-blue-600 text-lg">✧</span>
        </h2>
      </div>

      <div style={{ paddingTop: '0px', paddingBottom: '0px' }} className="flex gap-4 overflow-x-auto py-0 w-full px-2 items-center justify-start sm:justify-center">
        {suppliers.map((supplier) => (
          <button 
            key={supplier.id} 
            onClick={() => onStoreClick && onStoreClick(supplier.id)}
            className="flex flex-col items-center gap-2.5 flex-shrink-0 group cursor-pointer"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 group-hover:border-blue-600 group-hover:shadow-md transition-all overflow-hidden">
               {(supplier.storeSettings?.profilePhotoUrl || supplier.logoUrl) ? (
                 <img src={supplier.storeSettings?.profilePhotoUrl || supplier.logoUrl} alt={supplier.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
               ) : (
                 <span className="text-slate-600 group-hover:text-blue-600 font-black text-xl transition-colors">{supplier.name.slice(0, 2).toUpperCase()}</span>
               )}
            </div>
            <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{supplier.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
