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
    <section style={{ paddingTop: '0px', paddingBottom: '0px' }} className="bg-white dark:bg-[#131B2A] px-4 sm:px-6 md:px-8 py-0 space-y-4 transition-colors">
      <div className="text-center space-y-2 pt-2">
        <h2 className="text-sm md:text-base font-extrabold tracking-widest text-slate-800 dark:text-slate-100 uppercase flex items-center justify-center gap-1.5">
          <span className="text-blue-500 text-lg">✧</span> LOJAS OFICIAIS <span className="text-blue-500 text-lg">✧</span>
        </h2>
      </div>

      <div style={{ paddingTop: '0px', paddingBottom: '0px' }} className="flex gap-4 overflow-x-auto py-0 w-full px-2 items-center justify-start sm:justify-center">
        {suppliers.map((supplier) => (
          <button 
            key={supplier.id} 
            onClick={() => onStoreClick && onStoreClick(supplier.id)}
            className="flex flex-col items-center gap-2.5 flex-shrink-0 group cursor-pointer"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 dark:bg-slate-800/90 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 group-hover:border-blue-500 group-hover:shadow-md transition-all overflow-hidden shadow-xs">
               {(supplier.storeSettings?.profilePhotoUrl || supplier.logoUrl) ? (
                 <img src={supplier.storeSettings?.profilePhotoUrl || supplier.logoUrl} alt={supplier.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
               ) : (
                 <span className="text-slate-600 dark:text-slate-300 group-hover:text-blue-500 font-black text-xl transition-colors">{supplier.name.slice(0, 2).toUpperCase()}</span>
               )}
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{supplier.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
