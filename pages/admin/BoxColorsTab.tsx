
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Box, Palette, X } from 'lucide-react';
import { getContrastColor } from '../../services/mockData';

export const BoxColorsTab = () => {
  const { boxColors, addBoxColor, deleteBoxColor } = useApp();
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#3b82f6');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !hex) return;
    await addBoxColor({ name, hex });
    setName('');
    setHex('#3b82f6');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">Cores das Caixas</h3>
        {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg">
                <Plus size={20}/> Nova Cor
            </button>
        )}
      </div>

      {isAdding && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Configurar Nova Cor</h4>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-red-500"><X size={18}/></button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nome da Cor (Ex: Azul Turquesa)</label>
                    <input 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Nome da cor" 
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Seletor Hexadecimal</label>
                    <div className="flex gap-2">
                        <input 
                            type="color"
                            value={hex}
                            onChange={e => setHex(e.target.value)}
                            className="w-12 h-10 border-0 p-0 rounded-lg cursor-pointer overflow-hidden shadow-sm"
                        />
                        <input 
                            value={hex} 
                            onChange={e => setHex(e.target.value)} 
                            placeholder="#000000" 
                            required
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm" 
                        />
                    </div>
                </div>
                <button type="submit" className="md:col-span-3 py-2 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md flex items-center justify-center gap-2">
                    <Plus size={18}/> ADICIONAR
                </button>
              </form>
          </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {boxColors.map(color => (
          <div key={color.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm group">
            <div className="flex items-center gap-4">
                <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner border border-black/10"
                    style={{ backgroundColor: color.hex, color: getContrastColor(color.hex) }}
                >
                    <Box size={20}/>
                </div>
                <div>
                    <p className="font-bold text-slate-800">{color.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{color.hex}</p>
                </div>
            </div>
            <button 
                onClick={() => deleteBoxColor(color.id)}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 size={18}/>
            </button>
          </div>
        ))}
        {boxColors.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 italic">
                Nenhuma cor personalizada cadastrada.
            </div>
        )}
      </div>
    </div>
  );
};
