
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Edit, Trash2, MapPin, Layers, X } from 'lucide-react';
import * as api from '../../services/firebaseService';
import { Sector } from '../../types';

export const SectorsTab = () => {
  const { sectors, addSector, updateSector, deleteSector, currentOrg } = useApp();
  const [newSectorName, setNewSectorName] = useState('');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [newStageInputs, setNewStageInputs] = useState<Record<string, string>>({});

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectorName.trim()) {
      await addSector(newSectorName.trim());
      setNewSectorName('');
    }
  };

  const handleUpdateSector = async () => {
    if (!editingSector || !currentOrg) return;
    await api.apiUpdateSector(currentOrg.id, editingSector.id, { name: editingSector.name });
    setEditingSector(null);
  };

  const handleAddStage = async (sectorId: string, currentStages: string[] = []) => {
    const stageName = (newStageInputs[sectorId] || '').trim();
    if (!stageName) return;
    if (currentStages.includes(stageName)) {
      alert('Esta etapa já está cadastrada para este setor.');
      return;
    }
    const updatedStages = [...currentStages, stageName];
    if (updateSector) {
      await updateSector(sectorId, { stages: updatedStages });
    } else if (currentOrg) {
      await api.apiUpdateSector(currentOrg.id, sectorId, { stages: updatedStages });
    }
    setNewStageInputs(prev => ({ ...prev, [sectorId]: '' }));
  };

  const handleRemoveStage = async (sectorId: string, stageToRemove: string, currentStages: string[] = []) => {
    const updatedStages = currentStages.filter(st => st !== stageToRemove);
    if (updateSector) {
      await updateSector(sectorId, { stages: updatedStages });
    } else if (currentOrg) {
      await api.apiUpdateSector(currentOrg.id, sectorId, { stages: updatedStages });
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Novo Setor de Produção</h3>
        <form onSubmit={handleAddSector} className="flex gap-2">
          <input 
            value={newSectorName} 
            onChange={e => setNewSectorName(e.target.value)} 
            placeholder="Ex: Cerâmica, Gesso, Aplicação..." 
            className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
            <Plus size={20}/>
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map(s => {
          const stages = s.stages || [];
          return (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><MapPin size={20}/></div>
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
                      <span className="font-black text-slate-800 text-base">{s.name}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingSector(s)} title="Editar nome do setor" className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                      <Edit size={16}/>
                    </button>
                    <button onClick={() => deleteSector(s.id)} title="Excluir setor" className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>

                {/* Sub-categorias: Etapas do Setor */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Layers size={13} className="text-blue-500" />
                      Etapas ({stages.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {stages.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Nenhuma etapa cadastrada</span>
                    ) : (
                      stages.map((st, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                          {st}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveStage(s.id, st, stages)}
                            className="text-blue-400 hover:text-red-500 transition-colors ml-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Formulário para Adicionar Etapa */}
                  <div className="flex gap-1.5 mt-2">
                    <input 
                      type="text" 
                      placeholder="+ Nova etapa..."
                      value={newStageInputs[s.id] || ''}
                      onChange={e => setNewStageInputs({ ...newStageInputs, [s.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStage(s.id, stages);
                        }
                      }}
                      className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleAddStage(s.id, stages)}
                      className="px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-xs transition-colors flex items-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
