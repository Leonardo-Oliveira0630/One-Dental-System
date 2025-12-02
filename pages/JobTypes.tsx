import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobType, JobVariation } from '../types';
import { Plus, Edit2, Trash2, X, Save, Layers, Package, Tag, AlertCircle } from 'lucide-react';

type Tab = 'BASIC' | 'VARIATIONS';

export const JobTypes = () => {
  const { jobTypes, addJobType, updateJobType, deleteJobType } = useApp();
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('BASIC');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [variations, setVariations] = useState<JobVariation[]>([]);

  // Variation Input State
  const [varName, setVarName] = useState('');
  const [varPrice, setVarPrice] = useState(0);
  const [varGroup, setVarGroup] = useState('');

  const resetForm = () => {
    setName('');
    setCategory('');
    setBasePrice(0);
    setVariations([]);
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
    setVariations(type.variations || []);
    setActiveTab('BASIC');
  };

  const handleAddVariation = () => {
    if (!varName) return;
    const newVar: JobVariation = {
        id: Math.random().toString(),
        name: varName,
        priceModifier: varPrice,
        group: varGroup || undefined
    };
    setVariations([...variations, newVar]);
    setVarName('');
    setVarPrice(0);
    setVarGroup('');
  };

  const handleRemoveVariation = (id: string) => {
    setVariations(variations.filter(v => v.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
        alert("Preencha o nome e a categoria.");
        return;
    }

    if (isEditing && editingId) {
        updateJobType(editingId, { name, category, basePrice, variations });
    } else {
        const newType: JobType = {
            id: Math.random().toString(),
            name,
            category,
            basePrice,
            variations
        };
        addJobType(newType);
    }
    resetForm();
  };

  return (
    <div className="space-y-6 pb-12">
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
                            {type.variations.length} variações
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
                        <Layers size={18} /> <span className="hidden sm:inline">Variações</span>
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">
                            {variations.length}
                        </span>
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6">
                    
                    {/* Tab: Basic Data */}
                    {activeTab === 'BASIC' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-800">
                                {isEditing ? `Editando: ${name}` : 'Novo Tipo de Trabalho'}
                            </h2>
                            
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Serviço</label>
                                    <input 
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                                        placeholder="Ex: Coroa de Zircônia"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                                        <input 
                                            required
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Ex: Prótese Fixa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Preço Base (R$)</label>
                                        <input 
                                            required
                                            type="number"
                                            value={basePrice}
                                            onChange={e => setBasePrice(parseFloat(e.target.value))}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-800">
                                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                                <p>Cadastre aqui o valor base. Adicionais como "Urgência" ou "Metal Precioso" devem ser configurados na aba <strong>Variações</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* Tab: Variations */}
                    {activeTab === 'VARIATIONS' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Gerenciar Adicionais</h2>
                            </div>

                            {/* Add New Variation */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Adicionar Nova Variação</h3>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-5">
                                        <label className="text-xs text-slate-500 mb-1 block">Nome</label>
                                        <input 
                                            value={varName}
                                            onChange={e => setVarName(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Ex: Taxa de Urgência"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:col-span-3 w-full">
                                        <div className="md:col-span-3">
                                            <label className="text-xs text-slate-500 mb-1 block">Valor (+R$)</label>
                                            <input 
                                                type="number"
                                                value={varPrice}
                                                onChange={e => setVarPrice(parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-xs text-slate-500 mb-1 block">Grupo</label>
                                        <div className="relative">
                                            <Tag size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                                            <input 
                                                value={varGroup}
                                                onChange={e => setVarGroup(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Ex: Cor"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-1">
                                        <button 
                                            type="button"
                                            onClick={handleAddVariation}
                                            disabled={!varName}
                                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    * Itens com o mesmo nome de "Grupo" (ex: "Cor") funcionarão como botões de rádio (seleção única).
                                </p>
                            </div>

                            {/* List Variations */}
                            <div className="space-y-2">
                                {variations.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                        Nenhuma variação cadastrada para este serviço.
                                    </div>
                                ) : (
                                    variations.map(v => (
                                        <div key={v.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <Layers size={14} />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 block">{v.name}</span>
                                                    {v.group && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit"><Tag size={8}/> {v.group}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`font-mono font-bold ${v.priceModifier > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                    {v.priceModifier > 0 ? `+ R$ ${v.priceModifier.toFixed(2)}` : 'Grátis'}
                                                </span>
                                                <button type="button" onClick={() => handleRemoveVariation(v.id)} className="text-slate-300 hover:text-red-500 p-1">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
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
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] flex items-center gap-2"
                        >
                            <Save size={20} />
                            {isEditing ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};