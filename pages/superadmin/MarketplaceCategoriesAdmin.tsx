import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MarketplaceCategory } from '../../types';
import { Plus, Trash2, Save, Loader2, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';

// For simplicity, a recursive render component
const CategoryTree = ({ items, level = 0, onUpdate }: { items: MarketplaceCategory[], level?: number, onUpdate: (items: MarketplaceCategory[]) => void }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const handleNameChange = (id: string, name: string) => {
        onUpdate(items.map(it => it.id === id ? { ...it, name } : it));
    };

    const handleDelete = (id: string) => {
        onUpdate(items.filter(it => it.id !== id));
    };

    const handleAddChild = (parentId: string) => {
        onUpdate(items.map(it => {
            if (it.id === parentId) {
                const newChild: MarketplaceCategory = { id: Date.now().toString(), name: 'Nova Subcategoria' };
                return { ...it, subcategories: [...(it.subcategories || []), newChild] };
            }
            return it;
        }));
        setExpanded(prev => ({ ...prev, [parentId]: true }));
    };

    const handleChildUpdate = (parentId: string, newChildren: MarketplaceCategory[]) => {
        onUpdate(items.map(it => it.id === parentId ? { ...it, subcategories: newChildren } : it));
    };

    return (
        <div className="space-y-2">
            {items.map(item => (
                <div key={item.id} className="space-y-2">
                    <div className={`flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white shadow-sm`} style={{ marginLeft: `${level * 24}px` }}>
                        {level < 2 ? (
                            <button onClick={() => toggleExpand(item.id)} className="p-1 text-slate-400 hover:text-slate-700">
                                {(item.subcategories?.length || 0) > 0 ? (expanded[item.id] ? <ChevronDown size={18}/> : <ChevronRight size={18}/>) : <span className="w-[18px] inline-block"/>}
                            </button>
                        ) : (
                            <span className="w-[26px] inline-block" />
                        )}
                        
                        <input 
                            value={item.name}
                            onChange={e => handleNameChange(item.id, e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 px-2 py-1 rounded"
                        />
                        
                        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                            {level < 2 && (
                                <button onClick={() => handleAddChild(item.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg tooltip" title="Adicionar Subcategoria">
                                    <Plus size={16} />
                                </button>
                            )}
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg tooltip" title="Excluir">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {expanded[item.id] && item.subcategories && (
                        <CategoryTree items={item.subcategories} level={level + 1} onUpdate={(newC) => handleChildUpdate(item.id, newC)} />
                    )}
                </div>
            ))}
        </div>
    );
};

export const MarketplaceCategoriesAdmin = () => {
    const { globalSettings, updateGlobalSettings } = useApp();
    const [categories, setCategories] = useState<MarketplaceCategory[]>(globalSettings?.marketplaceCategories || []);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddRoot = () => {
        setCategories([...categories, { id: Date.now().toString(), name: 'Nova Categoria' }]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateGlobalSettings({ marketplaceCategories: categories });
            alert("Categorias salvas com sucesso!");
        } catch (e) {
            alert("Erro ao salvar categorias.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Categorias do Marketplace</h1>
                    <p className="text-slate-500">Crie a árvore padrão de categorias (até 3 níveis) para organizar os produtos dos fornecedores.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar Alterações
                </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <div className="mb-6 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Estrutura de Categorias</h3>
                    <button onClick={handleAddRoot} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-100 transition-all flex items-center gap-2 text-sm">
                        <Plus size={16} /> Nova Categoria Principal
                    </button>
                </div>

                {categories.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                        Nenhuma categoria cadastrada.
                    </div>
                ) : (
                    <CategoryTree items={categories} onUpdate={setCategories} />
                )}
            </div>
        </div>
    );
};
