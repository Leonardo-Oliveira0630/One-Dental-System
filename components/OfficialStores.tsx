import React from 'react';

interface Supplier {
  id: string;
  name: string;
  logoUrl?: string;
}

interface OfficialStoresProps {
  suppliers: Supplier[];
}

export const OfficialStores = ({ suppliers }: OfficialStoresProps) => {
  return (
    <section className="bg-white p-6 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-sm md:text-base font-extrabold tracking-widest text-slate-800 uppercase flex items-center justify-center gap-1.5">
          <span className="text-orange-500 text-lg">✧</span> LOJAS OFICIAIS <span className="text-orange-500 text-lg">✧</span>
        </h2>
      </div>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto py-2 w-full px-2 items-center justify-start sm:justify-center">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="flex flex-col items-center gap-2.5 flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
               {supplier.logoUrl ? (
                 <img src={supplier.logoUrl} alt={supplier.name} className="w-16 h-16 object-contain rounded-full" />
               ) : (
                 <span className="text-slate-600 font-black text-xl">{supplier.name.slice(0, 2).toUpperCase()}</span>
               )}
            </div>
            <span className="text-[11px] font-bold text-slate-600">{supplier.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
