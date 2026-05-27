import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryCategory, InventoryItem, InventoryItemType } from '../../types';
import { Package, Plus, Trash2, Edit2, Search, X, Layers, Box, Tag, Key, Info, Check, Save, ArrowLeft, ChevronDown, User as UserIcon } from 'lucide-react';

export const Inventory = () => {
    const { 
        inventoryCategories, inventoryItems, 
        addInventoryCategory, updateInventoryCategory, deleteInventoryCategory,
        addInventoryItem, updateInventoryItem, deleteInventoryItem,
        manualDentists, allUsers, currentUser 
    } = useApp();

    const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATEGORIES'>('ITEMS');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeOwnerGroup, setActiveOwnerGroup] = useState<string | null>(null);
    const [dentistSearch, setDentistSearch] = useState('');
    const [showDentistDropdown, setShowDentistDropdown] = useState(false);
    
    // Auth & Permissions
    const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
    const canCreate = isAdmin || currentUser?.permissions?.includes('inventory:create');
    const canEdit = isAdmin || currentUser?.permissions?.includes('inventory:edit');
    const canDelete = isAdmin || currentUser?.permissions?.includes('inventory:delete');

    // Category Modal
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [catForm, setCatForm] = useState<Partial<InventoryCategory>>({ name: '', type: 'MATERIAL' });

    // Item Modal
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({
        name: '', description: '', type: 'MATERIAL', categoryId: '', currentStock: 0, minStock: 0, costPrice: 0, sellPrice: 0, dentistOwnerId: ''
    });

    const clients = React.useMemo(() => {
        return [
            ...manualDentists, 
            ...(allUsers || []).filter(u => u.role === 'CLIENT')
        ];
    }, [manualDentists, allUsers]);

    const filteredCategories = inventoryCategories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Group all items by owner
    const itemGroups = React.useMemo(() => {
        const groups: Record<string, InventoryItem[]> = { 'LAB': [] };
        inventoryItems.forEach(item => {
            const owner = item.dentistOwnerId || 'LAB';
            if (!groups[owner]) groups[owner] = [];
            groups[owner].push(item);
        });
        return groups;
    }, [inventoryItems]);

    const filteredItems = React.useMemo(() => {
        if (!activeOwnerGroup) return [];
        const items = itemGroups[activeOwnerGroup] || [];
        return items.filter(i => 
            i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (i.code && i.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (i.description && i.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (inventoryCategories.find(c => c.id === i.categoryId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [activeOwnerGroup, itemGroups, searchQuery, inventoryCategories]);

    const getDentistName = (id?: string | null) => {
        if (!id) return 'Laboratório (Geral)';
        const d = clients.find(x => x.id === id);
        return d ? (d.clinicName || d.name) : 'Desconhecido';
    };

    const ownerOptions = Object.keys(itemGroups).map(key => {
        return {
            id: key,
            name: getDentistName(key === 'LAB' ? null : key),
            itemCount: itemGroups[key].length
        };
    }).filter(opt => opt.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const openCatModal = (cat?: InventoryCategory) => {
        if (cat) {
            setEditingCatId(cat.id);
            setCatForm(cat);
        } else {
            setEditingCatId(null);
            setCatForm({ name: '', type: 'MATERIAL' });
        }
        setIsCatModalOpen(true);
    };

    const saveCat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catForm.name || !catForm.type) return;
        if (editingCatId) {
            await updateInventoryCategory(editingCatId, catForm);
        } else {
            await addInventoryCategory(catForm as any);
        }
        setIsCatModalOpen(false);
    };

    const openItemModal = (item?: InventoryItem) => {
        if (item) {
            setEditingItemId(item.id);
            setItemForm({ ...item, dentistOwnerId: item.dentistOwnerId || '' });
            setDentistSearch(getDentistName(item.dentistOwnerId));
        } else {
            setEditingItemId(null);
            const ownerId = activeOwnerGroup && activeOwnerGroup !== 'LAB' ? activeOwnerGroup : '';
            setItemForm({
                name: '', description: '', type: 'MATERIAL', categoryId: '', currentStock: 0, minStock: 0, costPrice: 0, sellPrice: 0, dentistOwnerId: ownerId
            });
            setDentistSearch(ownerId ? getDentistName(ownerId) : '');
        }
        setIsItemModalOpen(true);
    };

    const saveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemForm.name || !itemForm.type || !itemForm.categoryId) return;
        const data = {
            ...itemForm,
            dentistOwnerId: itemForm.dentistOwnerId || null,
        };
        if (editingItemId) {
            await updateInventoryItem(editingItemId, data);
        } else {
            await addInventoryItem(data as any);
        }
        setIsItemModalOpen(false);
    };

    const handleSelectDentist = (dentistId: string | null, dentistName: string) => {
        setItemForm({ ...itemForm, dentistOwnerId: dentistId || '' });
        setDentistSearch(dentistName);
        setShowDentistDropdown(false);
    };

    const activeDentistSuggestions = React.useMemo(() => {
        const term = dentistSearch.toLowerCase();
        return clients.filter(c => c.name.toLowerCase().includes(term) || (c.clinicName && c.clinicName.toLowerCase().includes(term))).slice(0, 10);
    }, [dentistSearch, clients]);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                        <Package className="text-indigo-600" /> CONTROLE DE ESTOQUE E INVENTÁRIO
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie produtos, categorias, insumos, maquinários e implantes do laboratório.</p>
                </div>
            </div>

            <div className="flex gap-4 border-b border-slate-200">
                <button 
                  onClick={() => setActiveTab('ITEMS')}
                  className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 ${activeTab === 'ITEMS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  PRODUTOS & INSUMOS
                </button>
                <button 
                  onClick={() => setActiveTab('CATEGORIES')}
                  className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 ${activeTab === 'CATEGORIES' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  CATEGORIAS
                </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>
                {activeTab === 'ITEMS' && canCreate && (
                    <button onClick={() => openItemModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Novo Produto
                    </button>
                )}
                {activeTab === 'CATEGORIES' && canCreate && (
                    <button onClick={() => openCatModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Nova Categoria
                    </button>
                )}
            </div>

            {activeTab === 'CATEGORIES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCategories.map(cat => (
                        <div key={cat.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 rounded-xl">
                                    <Layers className="text-indigo-600" size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canEdit && <button onClick={() => openCatModal(cat)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Edit2 size={16}/></button>}
                                    {canDelete && <button onClick={() => deleteInventoryCategory(cat.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>}
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-800">{cat.name}</h3>
                            <div className="mt-2 inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                TIPO: {cat.type}
                            </div>
                        </div>
                    ))}
                    {filteredCategories.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                            Nenhuma categoria encontrada.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ITEMS' && (
                <>
                    {activeOwnerGroup === null ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {ownerOptions.map(owner => (
                                <div key={owner.id} onClick={() => setActiveOwnerGroup(owner.id)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col group hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-4 rounded-2xl ${owner.id === 'LAB' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {owner.id === 'LAB' ? <Box size={32} /> : <UserIcon size={32} />}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 line-clamp-2">{owner.name}</h3>
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                            <Package size={12}/> {owner.itemCount} Produtos
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {ownerOptions.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                                    Nenhuma fonte de estoque encontrada.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setActiveOwnerGroup(null)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                                        <ArrowLeft size={18} className="text-slate-600" />
                                    </button>
                                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        {activeOwnerGroup === 'LAB' ? <Box className="text-indigo-600"/> : <UserIcon className="text-amber-600"/>}
                                        {getDentistName(activeOwnerGroup === 'LAB' ? null : activeOwnerGroup)}
                                    </h2>
                                </div>
                                <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                    {filteredItems.length} Produtos
                                </div>
                            </div>
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Produto</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Estoque</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Preço Venda</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map(item => {
                                        const cat = inventoryCategories.find(c => c.id === item.categoryId);
                                        const isLowStock = item.currentStock <= item.minStock;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-slate-800">{item.name}</div>
                                                        {item.code && <span className="text-[10px] font-black bg-slate-100 text-slate-500 py-0.5 px-1.5 rounded uppercase tracking-wider">{item.code}</span>}
                                                    </div>
                                                    {item.description && <div className="text-xs text-slate-500 mt-1 truncate max-w-[250px]">{item.description}</div>}
                                                    <div className="text-[10px] bg-slate-100 text-slate-500 inline-block px-2 py-0.5 rounded mt-1">{item.type}</div>
                                                </td>
                                                <td className="p-4 font-medium text-slate-600">{cat?.name || 'Desconhecida'}</td>
                                                <td className="p-4 text-right">
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full font-black text-sm ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                                        {item.currentStock}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-bold text-slate-800">
                                                    {item.sellPrice > 0 ? (
                                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.sellPrice)
                                                    ) : (
                                                        <span className="text-slate-400">R$ 0,00</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {canEdit && <button onClick={() => openItemModal(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={18}/></button>}
                                                        {canDelete && <button onClick={() => deleteInventoryItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredItems.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-slate-500">
                                                Nenhum produto encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Category Modal */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={saveCat} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                        <button type="button" onClick={() => setIsCatModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingCatId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome da Categoria</label>
                                <input required type="text" value={catForm.name || ''} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo</label>
                                <select required value={catForm.type || 'MATERIAL'} onChange={e => setCatForm({...catForm, type: e.target.value as any})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="MATERIAL">Material Geral</option>
                                    <option value="SUPPLY">Insumo</option>
                                    <option value="MACHINERY">Maquinário</option>
                                    <option value="IMPLANT">Implante / Componente</option>
                                    <option value="OTHER">Outros</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 flex justify-center items-center gap-2">
                                <Save size={20}/> SALVAR CATEGORIA
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={saveItem} className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button type="button" onClick={() => setIsItemModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingItemId ? 'Editar Produto' : 'Novo Produto'}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Produto</label>
                                        <input required type="text" value={itemForm.name || ''} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Componente Titânio Hexágono Externo" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Código do Item (SKU)</label>
                                        <input type="text" value={itemForm.code || ''} onChange={e => setItemForm({...itemForm, code: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase" placeholder="Ex: TIT-HEX-001" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição (Opcional)</label>
                                    <textarea value={itemForm.description || ''} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]" placeholder="Informações adicionais..." />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
                                <select required value={itemForm.categoryId || ''} onChange={e => {
                                    const cat = inventoryCategories.find(c => c.id === e.target.value);
                                    setItemForm({...itemForm, categoryId: e.target.value, type: cat ? cat.type : 'MATERIAL'});
                                }} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="" disabled>Selecione uma categoria</option>
                                    {inventoryCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Proprietário (Especial Implantes)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Search size={16} />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={dentistSearch}
                                        onFocus={() => setShowDentistDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowDentistDropdown(false), 200)}
                                        onChange={e => {
                                            setDentistSearch(e.target.value);
                                            setShowDentistDropdown(true);
                                            if (e.target.value === '') {
                                                setItemForm({ ...itemForm, dentistOwnerId: '' });
                                            }
                                        }}
                                        className="w-full pl-10 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="Buscar laboratório ou cliente..."
                                    />
                                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                {showDentistDropdown && (
                                    <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                                        <button 
                                            type="button"
                                            onClick={() => handleSelectDentist(null, 'Laboratório (Geral)')}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100"
                                        >
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Box size={16}/></div>
                                            <div>
                                                <div className="font-bold text-slate-800">Laboratório (Geral)</div>
                                                <div className="text-xs text-slate-500">Estoque do próprio laboratório</div>
                                            </div>
                                        </button>
                                        {activeDentistSuggestions.map(d => (
                                            <button 
                                                key={d.id}
                                                type="button"
                                                onClick={() => handleSelectDentist(d.id, d.clinicName || d.name)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                                            >
                                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><UserIcon size={16}/></div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{d.clinicName || d.name}</div>
                                                    <div className="text-xs text-slate-500">Estoque Especial do Cliente</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[10px] mt-2 text-amber-600 font-medium">Você pode criar um estoque isolado de itens de clientes.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estoque Atual</label>
                                <input required type="number" step="0.01" value={itemForm.currentStock || 0} onChange={e => setItemForm({...itemForm, currentStock: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estoque Mínimo</label>
                                <input required type="number" step="0.01" value={itemForm.minStock || 0} onChange={e => setItemForm({...itemForm, minStock: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Custo Unitário (R$)</label>
                                <input required type="number" step="0.01" value={itemForm.costPrice || 0} onChange={e => setItemForm({...itemForm, costPrice: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço de Venda / Cobrança Extra (R$)</label>
                                <input required type="number" step="0.01" value={itemForm.sellPrice || 0} onChange={e => setItemForm({...itemForm, sellPrice: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <p className="text-[10px] mt-2 text-slate-500">Valor cobrado a mais na OS quando este item é utilizado.</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 flex justify-center items-center gap-2">
                                <Save size={20}/> {editingItemId ? 'ATUALIZAR PRODUTO' : 'CADASTRAR PRODUTO NO ESTOQUE'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
