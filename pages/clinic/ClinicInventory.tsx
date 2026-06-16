import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryCategory, InventoryItem } from '../../types';
import { Package, Plus, Trash2, Edit2, Search, X, Layers, Box, Tag, Info, Check, Save, ArrowLeft, ChevronDown, User as UserIcon } from 'lucide-react';

export const ClinicInventory = () => {
    const { 
        inventoryCategories, inventoryItems, 
        addInventoryCategory, updateInventoryCategory, deleteInventoryCategory,
        addInventoryItem, updateInventoryItem, deleteInventoryItem,
        clinicDentists, currentUser 
    } = useApp();

    const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATEGORIES'>('ITEMS');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeOwnerGroup, setActiveOwnerGroup] = useState<string | null>(null);
    const [dentistSearch, setDentistSearch] = useState('');
    const [showDentistDropdown, setShowDentistDropdown] = useState(false);
    
    // Auth & Permissions
    const canManageInstance = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'CLIENT';

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

    const filteredCategories = inventoryCategories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Group all items by owner (dentist in clinic or CLINIC general)
    const itemGroups = React.useMemo(() => {
        const groups: Record<string, InventoryItem[]> = { 'CLINIC': [] };
        inventoryItems.forEach(item => {
            const owner = item.dentistOwnerId || 'CLINIC';
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
        if (!id || id === 'CLINIC') return 'Estoque Geral da Clínica';
        const d = clinicDentists.find(x => x.id === id);
        return d ? d.name : 'Desconhecido';
    };

    const ownerOptions = Object.keys(itemGroups).map(key => {
        return {
            id: key,
            name: getDentistName(key === 'CLINIC' ? null : key),
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
            const ownerId = activeOwnerGroup && activeOwnerGroup !== 'CLINIC' ? activeOwnerGroup : '';
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

    const handleSelectDentist = (dentistId: string | null, name: string) => {
        setItemForm({ ...itemForm, dentistOwnerId: dentistId || '' });
        setDentistSearch(name);
        setShowDentistDropdown(false);
    };

    const activeDentistSuggestions = React.useMemo(() => {
        const term = dentistSearch.toLowerCase();
        return clinicDentists.filter(c => c.name.toLowerCase().includes(term)).slice(0, 10);
    }, [dentistSearch, clinicDentists]);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                        <Package className="text-teal-600" /> GESTÃO DE ESTOQUE E INSUMOS
                    </h1>
                    <p className="text-slate-500 mt-1">Monitore e gerencie insumos clínicos, materiais restauradores, EPIs e instrumentos da clínica.</p>
                </div>
            </div>

            <div className="flex gap-4 border-b border-slate-200">
                <button 
                  onClick={() => setActiveTab('ITEMS')}
                  className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 ${activeTab === 'ITEMS' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  INSUMOS & PRODUTOS
                </button>
                <button 
                  onClick={() => setActiveTab('CATEGORIES')}
                  className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 ${activeTab === 'CATEGORIES' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
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
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                    />
                </div>
                {activeTab === 'ITEMS' && canManageInstance && (
                    <button onClick={() => openItemModal()} className="px-6 py-3 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 shadow-md flex items-center gap-2 whitespace-nowrap text-sm">
                        <Plus size={20} /> Novo Insumo
                    </button>
                )}
                {activeTab === 'CATEGORIES' && canManageInstance && (
                    <button onClick={() => openCatModal()} className="px-6 py-3 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 shadow-md flex items-center gap-2 whitespace-nowrap text-sm">
                        <Plus size={20} /> Nova Categoria
                    </button>
                )}
            </div>

            {activeTab === 'CATEGORIES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCategories.map(cat => (
                        <div key={cat.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-teal-50 rounded-2xl">
                                    <Layers className="text-teal-600" size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canManageInstance && <button onClick={() => openCatModal(cat)} className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Edit2 size={16}/></button>}
                                    {canManageInstance && <button onClick={() => deleteInventoryCategory(cat.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>}
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-800">{cat.name}</h3>
                            <div className="mt-2 inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full w-fit uppercase">
                                TIPO: {cat.type}
                            </div>
                        </div>
                    ))}
                    {filteredCategories.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-100 italic">
                            Nenhuma categoria cadastrada para a clínica de forma manual.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ITEMS' && (
                <>
                    {activeOwnerGroup === null ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {ownerOptions.map(owner => (
                                <div key={owner.id} onClick={() => setActiveOwnerGroup(owner.id)} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col group hover:shadow-md hover:border-teal-200 transition-all cursor-pointer">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-4 rounded-2xl ${owner.id === 'CLINIC' ? 'bg-teal-50 text-teal-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {owner.id === 'CLINIC' ? <Box size={32} /> : <UserIcon size={32} />}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 line-clamp-2">{owner.name}</h3>
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                            <Package size={12}/> {owner.itemCount} Itens
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {ownerOptions.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-100 italic">
                                    Não há produtos ou insumos inseridos no estoque da clínica.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 bg-slate-50/50 border-b border-slate-150 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setActiveOwnerGroup(null)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                                        <ArrowLeft size={18} className="text-slate-600" />
                                    </button>
                                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        {activeOwnerGroup === 'CLINIC' ? <Box className="text-teal-600"/> : <UserIcon className="text-orange-600"/>}
                                        {getDentistName(activeOwnerGroup === 'CLINIC' ? null : activeOwnerGroup)}
                                    </h2>
                                </div>
                                <div className="text-xs font-black text-slate-500 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 uppercase tracking-tight">
                                    {filteredItems.length} Produtos
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="p-6">Insumo / Especialidade</th>
                                            <th className="p-6">Categoria</th>
                                            <th className="p-6 text-right">Estoque</th>
                                            <th className="p-6 text-right">Preço de Custo</th>
                                            <th className="p-6 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredItems.map(item => {
                                            const cat = inventoryCategories.find(c => c.id === item.categoryId);
                                            const isLowStock = item.currentStock <= item.minStock;
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-slate-800 text-sm leading-tight">{item.name}</div>
                                                            {item.code && <span className="text-[9px] font-black bg-slate-100 text-slate-500 py-0.5 px-2 rounded uppercase tracking-wider">{item.code}</span>}
                                                        </div>
                                                        {item.description && <div className="text-xs text-slate-400 mt-1 truncate max-w-[250px]">{item.description}</div>}
                                                        <div className="text-[9px] font-black bg-slate-100 text-slate-500 inline-block px-2 py-0.5 rounded mt-1.5 uppercase tracking-wide">{item.type}</div>
                                                    </td>
                                                    <td className="p-6 font-bold text-xs text-slate-500 uppercase">{cat?.name || 'Geral'}</td>
                                                    <td className="p-6 text-right">
                                                        <div className={`inline-flex items-center px-3 py-1 rounded-full font-black text-xs ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-teal-50 text-teal-700 border border-teal-100'}`}>
                                                            {item.currentStock} {isLowStock && '(FALTA)'}
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right font-black text-slate-800">
                                                        {item.costPrice > 0 ? (
                                                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.costPrice)
                                                        ) : (
                                                            <span className="text-slate-400 font-normal">--</span>
                                                        )}
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {canManageInstance && <button onClick={() => openItemModal(item)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit2 size={18}/></button>}
                                                            {canManageInstance && <button onClick={() => deleteInventoryItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredItems.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-20 text-center text-slate-400 italic">
                                                    Nenhum produto cadastrado nesta categoria de estoque.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Category Modal */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={saveCat} className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button type="button" onClick={() => setIsCatModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors">
                            <X size={20}/>
                        </button>
                        <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">{editingCatId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome da Categoria</label>
                                <input required type="text" value={catForm.name || ''} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-bold text-sm" placeholder="Ex: Anestésicos, Descartáveis..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Insumo</label>
                                <select required value={catForm.type || 'MATERIAL'} onChange={e => setCatForm({...catForm, type: e.target.value as any})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none appearance-none font-bold text-sm bg-white">
                                    <option value="MATERIAL">Material de Consumo</option>
                                    <option value="SUPPLY">Instrumental</option>
                                    <option value="MACHINERY">Equipamentos</option>
                                    <option value="IMPLANT">Implantes / Ortodontia</option>
                                    <option value="OTHER">Outros</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl hover:bg-teal-700 hover:shadow-teal-100 flex justify-center items-center gap-2 text-sm tracking-wide">
                                <Save size={20}/> SALVAR CATEGORIA
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={saveItem} className="bg-white rounded-[32px] p-8 max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <button type="button" onClick={() => setIsItemModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors">
                            <X size={20}/>
                        </button>
                        <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">{editingItemId ? 'Editar Item' : 'Cadastrar novo Item'}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Insumo</label>
                                        <input required type="text" value={itemForm.name || ''} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-bold text-sm" placeholder="Ex: Cloridrato de Mepivacaína 2%" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Código (SKU)</label>
                                        <input type="text" value={itemForm.code || ''} onChange={e => setItemForm({...itemForm, code: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none uppercase font-bold text-sm" placeholder="Ex: ANE-MEP-01" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição / Instruções (Opcional)</label>
                                    <textarea value={itemForm.description || ''} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none min-h-[80px] font-medium text-sm text-slate-700" placeholder="Ex: Controlar temperatura ambiente..." />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria de Estoque</label>
                                <select required value={itemForm.categoryId || ''} onChange={e => {
                                    const cat = inventoryCategories.find(c => c.id === e.target.value);
                                    setItemForm({...itemForm, categoryId: e.target.value, type: cat ? cat.type : 'MATERIAL'});
                                }} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none appearance-none font-bold text-sm bg-white">
                                    <option value="" disabled>Selecione uma categoria</option>
                                    {inventoryCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Resp. Técnico / Destinatário (Opcional)</label>
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
                                        className="w-full pl-10 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-bold text-sm" 
                                        placeholder="Pesquisar dentista clínico..."
                                    />
                                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                {showDentistDropdown && (
                                    <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                                        <button 
                                            type="button"
                                            onClick={() => handleSelectDentist(null, 'Estoque Geral da Clínica')}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100"
                                        >
                                            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Box size={16}/></div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">Estoque Geral da Clínica</div>
                                                <div className="text-xs text-slate-500">Acessível a todos</div>
                                            </div>
                                        </button>
                                        {activeDentistSuggestions.map(d => (
                                            <button 
                                                key={d.id}
                                                type="button"
                                                onClick={() => handleSelectDentist(d.id, d.name)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                                            >
                                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><UserIcon size={16}/></div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{d.name}</div>
                                                    <div className="text-xs text-slate-500">Uso preferencial do profissional</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Estoque Atual</label>
                                <input required type="number" step="1" value={itemForm.currentStock || 0} onChange={e => setItemForm({...itemForm, currentStock: Number(e.target.value)})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-black text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Estoque Mínimo (Alerta de Falta)</label>
                                <input required type="number" step="1" value={itemForm.minStock || 0} onChange={e => setItemForm({...itemForm, minStock: Number(e.target.value)})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-black text-sm" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Custo de Aquisição Unitário (R$)</label>
                                <input required type="number" step="0.01" value={itemForm.costPrice || 0} onChange={e => setItemForm({...itemForm, costPrice: Number(e.target.value)})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-black text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Preço Consumado / Cobrança Paciente (R$)</label>
                                <input required type="number" step="0.01" value={itemForm.sellPrice || 0} onChange={e => setItemForm({...itemForm, sellPrice: Number(e.target.value)})} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-black text-sm" />
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl hover:bg-teal-700 hover:shadow-teal-100 flex justify-center items-center gap-2 text-sm tracking-wide">
                                <Save size={20}/> {editingItemId ? 'ATUALIZAR CONTEÚDO' : 'CADASTRAR INSUMO NO ESTOQUE'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
