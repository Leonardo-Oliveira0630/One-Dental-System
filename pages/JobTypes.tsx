
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobType, VariationGroup, VariationOption } from '../types';
import { Plus, Edit2, Trash2, X, Save, Layers, Package, Tag, AlertCircle, Folder, ToggleLeft, ToggleRight, List, Type } from 'lucide-react';

type Tab = 'BASIC' | 'VARIATIONS';

// Helper to generate Firestore-compatible IDs (alphanumeric)
const generateFirestoreId = (prefix: string) => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

export const JobTypes = () => {
  const { jobTypes, addJobType, updateJobType, deleteJobType } = useApp();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('BASIC');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setCategory('');
    setBasePrice(0);
    setVariationGroups([]);
    setIsEditing(false);
    setEditingId(null);
    setActiveTab('BASIC');
  };

  const handleEdit = (type: JobType) => {
    setIsEditing(true);
    setEditingId(type.id);
    setName(type.name);
    setCategory(type.category);
    setBasePrice(type.basePrice);
    setVariationGroups(type.variationGroups || []);
    setActiveTab('BASIC');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
        alert("Preencha o nome e a categoria.");
        return;
    }
    
    setIsSaving(true);
    try {
      if (isEditing && editingId) {
          await updateJobType(editingId, { name, category, basePrice, variationGroups });
      } else {
          const newType: Omit<JobType, 'id'> = {
              name, category, basePrice, variationGroups
          };
          await addJobType(newType);
      }
      resetForm();
    } catch (error) {
        console.error("Failed to save Job Type:", error);
        alert("Falha ao salvar o tipo de trabalho. Verifique se você tem permissão ou está conectado a um laboratório.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Variation Group & Option Handlers ---

  const addGroup = () => {
      const newGroup: VariationGroup = {
          id: generateFirestoreId('group'),
          name: `Novo Grupo ${variationGroups.length + 1}`,
          selectionType: 'SINGLE',
          options: []
      };
      setVariationGroups([...variationGroups, newGroup]);
  };

  const updateGroup = (groupId: string, updates: Partial<VariationGroup>) => {
      setVariationGroups(groups => groups.map(g => g.id === groupId ? { ...g, ...updates } : g));
  };

  const deleteGroup = (groupId: string) => {
      setVariationGroups(groups => groups.filter(g => g.id !== groupId));
  };

  const addOption = (groupId: string) => {
      const newOption: VariationOption = {
          id: generateFirestoreId('opt'),
          name: 'Nova Opção',
          priceModifier: 0,
          disablesOptions: []
      };
      // FIX: Ensure options array exists with fallback to []
      const group = variationGroups.find(g => g.id === groupId);
      const currentOptions = group?.options || []; 
      
      updateGroup(groupId, { options: [...currentOptions, newOption] });
  };
  
  const updateOption = (groupId: string, optionId: string, updates: Partial<VariationOption>) => {
      const group = variationGroups.find(g => g.id === groupId);
      if (!group) return;
      // FIX: Ensure options array exists
      const currentOptions = group.options || [];
      const updatedOptions = currentOptions.map(o => o.id === optionId ? { ...o, ...updates } : o);
      updateGroup(groupId, { options: updatedOptions });
  };

  const deleteOption = (groupId: string, optionId: string) => {
      const group = variationGroups.find(g => g.id === groupId);
      if (!group) return;
      // FIX: Ensure options array exists
      const currentOptions = group.options || [];
      updateGroup(groupId, { options: currentOptions.filter(o => o.id !== optionId) });
  };

  const cycleSelectionType = (current: string): 'SINGLE' | 'MULTIPLE' | 'TEXT' => {
      if (current === 'SINGLE') return 'MULTIPLE';
      if (current === 'MULTIPLE') return 'TEXT';
      return 'SINGLE';
  };

  const getSelectionTypeLabel = (type: string) => {
      switch(type) {
          case 'SINGLE': return 'Seleção Única (Radio)';
          case 'MULTIPLE': return 'Múltipla Escolha (Check)';
          case 'TEXT': return 'Campo de Texto (Input)';
          default: return type;
      }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ... (Header remains the same) ... */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Catálogo de Serviços</h1>
            <p className="text-slate-500">Gerencie tipos de próteses, preços e suas variações.</p>
        </div>
        {isEditing && (
            <button 
                onClick={resetForm}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2"
            >
                <Plus size={18} /> Novo Serviço
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: List */}
        <div className="space-y-4 lg:col-span-1 order-2 lg:order-1">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Serviços Cadastrados</h3>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {jobTypes.map(type => (
                    <div 
                        key={type.id} 
                        onClick={() => handleEdit(type)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            editingId === type.id 
                                ? 'bg-blue-50 border-blue-400 shadow-md' 
                                : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className={`font-bold ${editingId === type.id ? 'text-blue-800' : 'text-slate-800'}`}>
                                {type.name}
                            </h3>
                            {editingId !== type.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteJobType(type.id); }} 
                                    className="text-slate-300 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold uppercase">{type.category}</span>
                            <span className="font-bold text-slate-700">R$ {type.basePrice.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                            <Layers size={12} />
                            {type.variationGroups.length} grupos
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Column: Editor Form */}
        <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {/* Header / Tabs */}
                <div className="bg-slate-50 border-b border-slate-200 flex">
                    <button
                        onClick={() => setActiveTab('BASIC')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'BASIC' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Package size={18} /> Dados Gerais
                    </button>
                    <button
                        onClick={() => setActiveTab('VARIATIONS')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'VARIATIONS' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Layers size={18} /> Grupos & Variações
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
                            {variationGroups.length}
                        </span>
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6">
                    {activeTab === 'BASIC' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                             <h2 className="text-xl font-bold text-slate-800">
                                {isEditing ? `Editando: ${name}` : 'Novo Tipo de Trabalho'}
                            </h2>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Serviço</label>
                                <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                                <input value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Preço Base (R$)</label>
                                <input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(parseFloat(e.target.value))} required className="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                            </div>
                        </div>
                    )}
                    
                    {/* --- NEW VARIATIONS TAB --- */}
                    {activeTab === 'VARIATIONS' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Configurar Variações</h2>
                                <button type="button" onClick={addGroup} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200">
                                    <Plus size={16} /> Novo Grupo
                                </button>
                            </div>
                            
                            {variationGroups.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                    Clique em "Novo Grupo" para começar.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {variationGroups.map(group => (
                                        <div key={group.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            {/* Group Header */}
                                            <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Folder size={18} className="text-indigo-500" />
                                                    <input 
                                                        value={group.name}
                                                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                                                        className="font-bold text-lg text-slate-800 bg-transparent focus:bg-white rounded p-1 outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                     <button 
                                                        type="button" 
                                                        onClick={() => updateGroup(group.id, { selectionType: cycleSelectionType(group.selectionType) })} 
                                                        className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors" 
                                                        title="Mudar tipo de seleção"
                                                     >
                                                        {group.selectionType === 'SINGLE' && <ToggleLeft size={16} />}
                                                        {group.selectionType === 'MULTIPLE' && <ToggleRight size={16} />}
                                                        {group.selectionType === 'TEXT' && <Type size={16} />}
                                                        {getSelectionTypeLabel(group.selectionType)}
                                                    </button>
                                                    <button type="button" onClick={() => deleteGroup(group.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            {/* Options within group */}
                                            <div className="space-y-3">
                                                {(group.options || []).map(option => (
                                                    <div key={option.id} className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
                                                        <div className="grid grid-cols-12 gap-2 items-end">
                                                            <div className="col-span-12 sm:col-span-7">
                                                                <label className="text-[10px] text-slate-500 font-bold block">
                                                                    {group.selectionType === 'TEXT' ? 'Rótulo do Campo (ex: Cor)' : 'Nome da Opção'}
                                                                </label>
                                                                <input value={option.name} onChange={e => updateOption(group.id, option.id, { name: e.target.value })} className="w-full p-2 text-sm rounded bg-slate-50 focus:bg-white outline-none focus:ring-1 ring-slate-200 focus:ring-indigo-400" placeholder={group.selectionType === 'TEXT' ? "Ex: Especifique a cor" : "Ex: Zircônia Translúcida"} />
                                                            </div>
                                                            <div className="col-span-8 sm:col-span-4">
                                                                <label className="text-[10px] text-slate-500 font-bold block">Acréscimo (R$)</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={option.priceModifier} 
                                                                        onChange={e => updateOption(group.id, option.id, { priceModifier: parseFloat(e.target.value) || 0 })} 
                                                                        className="w-full p-2 text-sm rounded bg-slate-50 focus:bg-white outline-none focus:ring-1 ring-slate-200 focus:ring-indigo-400 text-right pr-3 pl-8" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="col-span-4 sm:col-span-1 flex justify-end">
                                                                <button type="button" onClick={() => deleteOption(group.id, option.id)} className="text-slate-300 hover:text-red-500 p-2"><X size={16} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="pl-1">
                                                            <label className="text-[10px] text-slate-500 font-bold block mb-1 flex items-center gap-1">
                                                                <AlertCircle size={10} className="text-orange-500" />
                                                                Se esta opção for escolhida, DESABILITAR as seguintes opções:
                                                            </label>
                                                            
                                                            {/* SUBSTITUIÇÃO DO SELECT POR CHECKBOXES */}
                                                            <div className="w-full border rounded bg-slate-50 max-h-32 overflow-y-auto p-2">
                                                                {variationGroups.filter(g => g.id !== group.id).length === 0 && (
                                                                    <p className="text-[10px] text-slate-400 italic p-1">Crie outros grupos para condicionar.</p>
                                                                )}
                                                                {variationGroups.filter(g => g.id !== group.id).map(otherGroup => (
                                                                    <div key={otherGroup.id} className="mb-2">
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 sticky top-0 bg-slate-50">{otherGroup.name}</p>
                                                                        <div className="space-y-1 pl-1">
                                                                            {(otherGroup.options || []).map(otherOption => {
                                                                                const isChecked = (option.disablesOptions || []).includes(otherOption.id);
                                                                                return (
                                                                                    <label key={otherOption.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 rounded p-1">
                                                                                        <input 
                                                                                            type="checkbox" 
                                                                                            checked={isChecked}
                                                                                            onChange={() => {
                                                                                                const current = option.disablesOptions || [];
                                                                                                const newList = isChecked 
                                                                                                    ? current.filter(id => id !== otherOption.id) 
                                                                                                    : [...current, otherOption.id];
                                                                                                updateOption(group.id, option.id, { disablesOptions: newList });
                                                                                            }}
                                                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                                                                        />
                                                                                        <span className="text-xs text-slate-700">{otherOption.name}</span>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addOption(group.id)} className="w-full text-xs text-center py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 font-bold">
                                                    + Adicionar {group.selectionType === 'TEXT' ? 'Campo' : 'Opção'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                         {isEditing && (
                            <button 
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium"
                            >
                                Cancelar
                            </button>
                        )}
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={20} />
                            {isSaving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
