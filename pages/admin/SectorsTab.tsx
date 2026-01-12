
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import * as api from '../../services/firebaseService';
import { Sector } from '../../types';

export const SectorsTab = () => {
  const { sectors, addSector, deleteSector, currentOrg } = useApp();
  const [newSectorName, setNewSectorName] = useState('');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectorName.trim()) {
      await addSector(newSectorName.trim());
      setNewSectorName('');
    }
  };

  const handleUpdateSector = async () => {
    if (!editingSector || !currentOrg) return;
    await api.apiUpdateSector(currentOrg.id, editingSector.id, editingSector.name);
    setEditingSector(null);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Novo Setor de Produção</h3>
        <form onSubmit={handleAddSector} className="flex gap-2">
          <input 
            value={newSectorName} 
            onChange={e => setNewSectorName(e.target.value)} 
            placeholder="Ex: Cerâmica, Gesso..." 
            className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
            <Plus size={20}/>
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MapPin size={20}/></div>
              {editingSector?.id === s.id ? (
                <input 
                  value={editingSector.name} 
                  onChange={e => setEditingSector({...editingSector, name: e.target.value})} 
                  className="border-b-2 border-blue-500 outline-none px-1 font-bold text-slate-700 bg-transparent" 
                  autoFocus 
                  onBlur={handleUpdateSector} 
                  onKeyDown={e => e.key === 'Enter' && handleUpdateSector()} 
                />
              ) : (
                <span className="font-bold text-slate-700">{s.name}</span>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => setEditingSector(s)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <Edit size={16}/>
              </button>
              <button onClick={() => deleteSector(s.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
