
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PriceTable, JobType } from '../../types';
import { Plus, Table, Edit2, Trash2, Save, X, Search, DollarSign, Layers } from 'lucide-react';

export const PriceTables = () => {
    const { jobTypes, priceTables, addPriceTable, updatePriceTable, deletePriceTable, currentUser } = useApp();
    
    const hasPerm = (perm: string) => {
        if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') return true;
        return (currentUser?.permissions as string[])?.includes(perm) || false;
    };

    if (!hasPerm('catalog:prices_view')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <Table size={48} className="mb-4 opacity-20" />
                <h2 className="text-xl font-black uppercase tracking-widest">Acesso Negado</h2>
                <p className="text-sm">Você não tem permissão para gerenciar tabelas de preços.</p>
            </div>
        );
    }
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<PriceTable | null>(null);
    const [tableName, setTableName] = useState('');
    const [prices, setPrices] = useState<Record<string, { basePrice: number, variations: Record<string, number> }>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const openCreateModal = () => {
        setEditingTable(null);
        setTableName('');
        const initialPrices: Record<string, any> = {};
        jobTypes.forEach(jt => {
            initialPrices[jt.id] = {
                basePrice: jt.basePrice,
                variations: {}
            };
            jt.variationGroups.forEach(group => {
                group.options.forEach(opt => {
                    initialPrices[jt.id].variations[opt.id] = opt.priceModifier;
                });
            });
        });
        setPrices(initialPrices);
        setIsModalOpen(true);
    };

    const openEditModal = (table: PriceTable) => {
        setEditingTable(table);
        setTableName(table.name);
        
        const currentPrices: Record<string, any> = {};
        jobTypes.forEach(jt => {
            const tableData = table.prices[jt.id] || { basePrice: jt.basePrice, variations: {} };
            currentPrices[jt.id] = {
                basePrice: tableData.basePrice ?? jt.basePrice,
                variations: { ...tableData.variations }
            };
            // Ensure all current variations are at least present
            jt.variationGroups.forEach(group => {
                group.options.forEach(opt => {
                    if (currentPrices[jt.id].variations[opt.id] === undefined) {
                        currentPrices[jt.id].variations[opt.id] = opt.priceModifier;
                    }
                });
            });
        });

        setPrices(currentPrices);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!tableName.trim()) return alert("Dê um nome para a tabela");
        
        try {
            if (editingTable) {
                await updatePriceTable(editingTable.id, { name: tableName, prices: prices as any });
            } else {
                await addPriceTable({ name: tableName, prices: prices as any });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar tabela de preços");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Deseja realmente excluir esta tabela de preços?")) {
            await deletePriceTable(id);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tabelas de Preços</h1>
                    <p className="text-slate-500 text-sm">Gerencie múltiplos níveis de preços para seus serviços.</p>
                </div>
                <button 
                    onClick={openCreateModal}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase text-xs"
                >
                    <Plus size={20} /> Nova Tabela
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {priceTables.map(table => (
                    <div key={table.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <Table size={24} />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(table)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(table.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-black text-slate-800 text-lg uppercase mb-1">{table.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{Object.keys(table.prices).length} Serviços Customizados</p>
                        
                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Criado em: {new Date(table.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editingTable ? 'Editar Tabela' : 'Nova Tabela de Preços'}</h3>
                                <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">Configure o valor base e variações para cada serviço</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600">
                                <X size={28}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome da Tabela</label>
                                <input 
                                    value={tableName}
                                    onChange={e => setTableName(e.target.value)}
                                    placeholder="Ex: Tabela Convênio A, Tabela Especial 2024..."
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all shadow-inner"
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                        <Layers size={18} className="text-blue-500" /> Configuração de Preços
                                    </h4>
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            placeholder="Filtrar serviços..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs font-bold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {jobTypes.filter(jt => jt.name.toLowerCase().includes(searchTerm.toLowerCase())).map(jt => {
                                        const tablePrice = prices[jt.id] || { basePrice: jt.basePrice, variations: {} };
                                        return (
                                            <div key={jt.id} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm hover:border-blue-100 transition-all">
                                                <div className="p-6 bg-slate-50/50 flex justify-between items-center border-b border-slate-50">
                                                    <div>
                                                        <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{jt.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preço Original: R$ {jt.basePrice.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Preço Tabela (R$)</span>
                                                        <input 
                                                            type="number"
                                                            value={tablePrice.basePrice}
                                                            onChange={e => setPrices(prev => ({
                                                                ...prev,
                                                                [jt.id]: { ...tablePrice, basePrice: parseFloat(e.target.value) || 0 }
                                                            }))}
                                                            className="w-32 px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-right outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {jt.variationGroups.length > 0 && (
                                                    <div className="p-6 bg-white space-y-4">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Variações / Adicionais</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                            {jt.variationGroups.map(group => (
                                                                <div key={group.id} className="space-y-3">
                                                                    <p className="text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full inline-block">{group.name}</p>
                                                                    <div className="space-y-2">
                                                                        {group.options.map(opt => (
                                                                            <div key={opt.id} className="flex items-center justify-between text-xs px-2 group/opt">
                                                                                <span className="text-slate-500 font-bold">{opt.name}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[9px] text-slate-300 font-bold">R$</span>
                                                                                    <input 
                                                                                        type="number"
                                                                                        value={tablePrice.variations[opt.id] ?? opt.priceModifier}
                                                                                        onChange={e => setPrices(prev => {
                                                                                            const newVariations = { ...tablePrice.variations };
                                                                                            newVariations[opt.id] = parseFloat(e.target.value) || 0;
                                                                                            return {
                                                                                                ...prev,
                                                                                                [jt.id]: { ...tablePrice, variations: newVariations }
                                                                                            };
                                                                                        })}
                                                                                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md font-bold text-right outline-none focus:bg-white focus:border-blue-400 transition-all"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t bg-slate-50 flex justify-end gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 font-black text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-2xl transition-all uppercase text-xs">Cancelar</button>
                            <button 
                                onClick={handleSave}
                                className="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 uppercase text-xs"
                            >
                                <Save size={20} /> Salvar Tabela
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
