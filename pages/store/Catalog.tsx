import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { JOB_TYPES } from '../../services/mockData';
import { Plus, Search, ShoppingBag } from 'lucide-react';

export const Catalog = () => {
  const { addToCart } = useApp();
  const [term, setTerm] = useState('');

  const products = JOB_TYPES.filter(t => t.name.toLowerCase().includes(term.toLowerCase()));

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Catálogo do Laboratório</h1>
                <p className="text-slate-500">Selecione as próteses para iniciar um novo pedido.</p>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Buscar produtos..."
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                />
            </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="h-40 bg-slate-100 flex items-center justify-center relative">
                        {/* Placeholder Image */}
                        <div className="text-slate-300">
                            <ShoppingBag size={48} />
                        </div>
                        <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors" />
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{product.category}</span>
                                <h3 className="font-bold text-slate-900 text-lg">{product.name}</h3>
                            </div>
                            <span className="font-bold text-slate-700">R$ {product.basePrice}</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">Alta qualidade em {product.name.toLowerCase()} produzida com tecnologia CAD/CAM.</p>
                        
                        <button 
                            onClick={() => addToCart(product)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                        >
                            <Plus size={18} />
                            Adicionar ao Pedido
                        </button>
                    </div>
                </div>
            ))}
       </div>
    </div>
  );
};