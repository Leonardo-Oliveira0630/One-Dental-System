import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryCategory, InventoryItem, InventoryItemType } from '../../types';
import { Package, Plus, Trash2, Edit2, Search, X, Layers, Box, Tag, Key, Info, Check, Save, ArrowLeft, ChevronDown, User as UserIcon, Sparkles, Upload, FileText } from 'lucide-react';

export const Inventory = () => {
    const { 
        inventoryCategories, inventoryItems, productCatalogItems,
        addInventoryCategory, updateInventoryCategory, deleteInventoryCategory,
        addInventoryItem, updateInventoryItem, deleteInventoryItem,
        addProductCatalogItem, updateProductCatalogItem, deleteProductCatalogItem,
        manualDentists, allUsers, currentUser, globalSettings 
    } = useApp();

    const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATEGORIES' | 'CATALOG'>('ITEMS');
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
    const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);
    
    // Bulk Import Logic
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [isParsingBulk, setIsParsingBulk] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<{ mimeType: string; b64Data: string; name: string } | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const name = file.name;
        const extension = name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            setIsParsingBulk(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const XLSX = await import('xlsx');
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    setBulkText(csv);
                    setUploadedFile(null); // Excel converted directly into editable CSV text
                    alert(`Arquivo Excel "${name}" lido e convertido em texto com sucesso!`);
                } catch (error) {
                    console.error("Erro ao ler Excel:", error);
                    alert("Erro ao ler arquivo Excel.");
                } finally {
                    setIsParsingBulk(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (extension === 'csv' || extension === 'tsv') {
            setIsParsingBulk(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                setBulkText(event.target?.result as string);
                setUploadedFile(null); // CSV/TSV converted directly to text
                alert(`Arquivo "${name}" carregado com sucesso como texto!`);
                setIsParsingBulk(false);
            };
            reader.readAsText(file);
        } else {
            alert("Tipo de arquivo não suportado. Escolha um arquivo .xlsx, .xls, .csv ou .tsv.");
        }
    };

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileChange(fakeEvent);
        }
    };

    const handleBulkImport = async () => {
        if (!bulkText.trim() && !uploadedFile) {
            alert("Por favor, cole um texto ou envie um arquivo para importar.");
            return;
        }
        setIsParsingBulk(true);
        try {
            const XLSX = await import('xlsx');
            let workbook;
            
            if (uploadedFile && uploadedFile.mimeType === 'application/pdf') {
                alert("A extração de PDF requer IA. Para usar a importação tradicional, envie uma planilha Excel (.xlsx) ou CSV.");
                setIsParsingBulk(false);
                return;
            }

            // Lê do texto (que pode ter sido colado, ou vindo do CSV extraído do Excel)
            workbook = XLSX.read(bulkText, { type: 'string' });
            
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            
            if (!rawData || rawData.length === 0) {
                alert("Nenhum dado encontrado.");
                setIsParsingBulk(false);
                return;
            }

            // Filtra linhas vazias
            const dataRows = rawData.filter(row => row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && cell !== ''));
            
            if (dataRows.length === 0) {
                alert("A tabela está vazia.");
                setIsParsingBulk(false);
                return;
            }

            // Verifica se a primeira linha é cabeçalho
            const firstRow = dataRows[0];
            const hasHeader = firstRow.some(cell => 
                typeof cell === 'string' && 
                (cell.toLowerCase().includes('código') || cell.toLowerCase().includes('produto') || cell.toLowerCase().includes('sku'))
            );

            const startIdx = hasHeader ? 1 : 0;
            const parsedItems = [];

            // Identificação dinâmica de colunas baseada no cabeçalho
            let idxCode = 0, idxName = 1, idxCat = 2, idxStock = 3, idxCost = 4, idxSell = 6, idxMinStock = 7, idxDesc = 8;

            if (hasHeader) {
                const h = firstRow.map(c => String(c || '').toLowerCase().trim());
                const findIdx = (keywords: string[]) => h.findIndex(col => keywords.some(k => col.includes(k)));
                
                const cIdx = findIdx(['código', 'codigo', 'sku']);
                if (cIdx !== -1) idxCode = cIdx;
                
                const nIdx = findIdx(['produto', 'nome do item', 'nome', 'item']);
                if (nIdx !== -1) idxName = nIdx;
                
                const catIdx = findIdx(['categoria', 'grupo']);
                if (catIdx !== -1) idxCat = catIdx;
                
                const stockIdx = findIdx(['estoque atual', 'estoque']);
                if (stockIdx !== -1 && !h[stockIdx].includes('mín')) idxStock = stockIdx;
                
                const costIdx = findIdx(['custo', 'custo médio']);
                if (costIdx !== -1) idxCost = costIdx;
                
                // Evitar "valor total de vendas", buscar "preço de venda" ou "valor de venda"
                const sellIdx = h.findIndex(col => (col.includes('venda') || col.includes('preço')) && !col.includes('total'));
                if (sellIdx !== -1) idxSell = sellIdx;
                
                const minIdx = findIdx(['estoque mín', 'estoque min', 'mínimo']);
                if (minIdx !== -1) idxMinStock = minIdx;

                const descIdx = findIdx(['descrição', 'detalhe']);
                if (descIdx !== -1) idxDesc = descIdx;
            } else if (activeTab === 'CATALOG') {
                // Se não tiver cabeçalho e for CATALOG, assumimos que não tem coluna de estoque.
                // Ajuste padrão esperado caso pule a coluna de estoque:
                // 0: Código, 1: Produto, 2: Categoria, 3: Custo, 4: Vendas Total, 5: Preço Venda, 6: Descrição
                idxStock = -1;
                idxMinStock = -1;
                idxCost = 3;
                idxSell = 5;
                idxDesc = 6;
            }

            for (let i = startIdx; i < dataRows.length; i++) {
                const row = dataRows[i];
                if (idxName !== -1 && !row[idxName]) continue; // Produto/Nome é obrigatório

                const parsePrice = (val: any) => {
                    if (typeof val === 'number') return val;
                    if (!val) return 0;
                    let str = String(val).replace(/R\$/g, '').trim();
                    if (str.includes(',')) {
                        str = str.replace(/\./g, '').replace(',', '.');
                    }
                    return Number(str) || 0;
                };

                const parseStock = (val: any) => {
                    if (typeof val === 'number') return Math.floor(val);
                    if (!val) return 0;
                    let str = String(val).trim();
                    if (str.includes(',')) {
                        str = str.split(',')[0]; // Ignora tudo após a vírgula para estoque
                    }
                    str = str.replace(/\./g, ''); // Remove separador de milhar
                    return parseInt(str, 10) || 0;
                };

                parsedItems.push({
                    code: idxCode !== -1 ? String(row[idxCode] || '').trim() : '',
                    name: idxName !== -1 ? String(row[idxName] || '').trim() : '',
                    category: idxCat !== -1 ? String(row[idxCat] || '').trim() : '',
                    currentStock: idxStock !== -1 ? parseStock(row[idxStock]) : 0,
                    costPrice: idxCost !== -1 ? parsePrice(row[idxCost]) : 0,
                    sellPrice: idxSell !== -1 ? parsePrice(row[idxSell]) : 0,
                    minStock: idxMinStock !== -1 ? parseStock(row[idxMinStock]) : 0,
                    description: idxDesc !== -1 ? String(row[idxDesc] || '').trim() : '',
                });
            }

            if (parsedItems.length > 0) {
                // Keep a local mapping of newly created categories to avoid double creation during the loop
                const tempCategoryMap: Record<string, string> = {};

                for (const item of parsedItems) {
                    let finalCategoryId = '';
                    const rawCategory = (item as any).category;

                    if (rawCategory && typeof rawCategory === 'string' && rawCategory.trim()) {
                        const normalizedCat = rawCategory.trim();
                        const lowerCat = normalizedCat.toLowerCase();

                        if (tempCategoryMap[lowerCat]) {
                            finalCategoryId = tempCategoryMap[lowerCat];
                        } else {
                            const existing = inventoryCategories.find(c => c.name.toLowerCase().trim() === lowerCat);
                            if (existing) {
                                finalCategoryId = existing.id;
                                tempCategoryMap[lowerCat] = finalCategoryId;
                            } else {
                                // Create new category dynamically and get ID
                                const newCatId = await addInventoryCategory({ name: normalizedCat, type: 'MATERIAL' });
                                if (newCatId) {
                                    finalCategoryId = newCatId;
                                    tempCategoryMap[lowerCat] = finalCategoryId;
                                }
                            }
                        }
                    }

                    if (activeTab === 'CATALOG') {
                        await addProductCatalogItem({
                            name: item.name || 'Sem Nome',
                            code: item.code || '',
                            description: item.description || '',
                            type: 'MATERIAL',
                            categoryId: finalCategoryId,
                            costPrice: Number(item.costPrice) || 0,
                            sellPrice: Number(item.sellPrice) || 0,
                        } as any);
                    } else if (activeTab === 'ITEMS') {
                        await addInventoryItem({
                            name: item.name || 'Sem Nome',
                            code: item.code || '',
                            description: item.description || '',
                            type: 'MATERIAL',
                            categoryId: finalCategoryId,
                            currentStock: Number(item.currentStock) || 0,
                            minStock: Number(item.minStock) || 0,
                            costPrice: Number(item.costPrice) || 0,
                            sellPrice: Number(item.sellPrice) || 0,
                            dentistOwnerId: activeOwnerGroup && activeOwnerGroup !== 'LAB' ? activeOwnerGroup : null,
                        } as any);
                    }
                }
                alert(`Sucesso! ${parsedItems.length} itens importados e cadastrados em massa.`);
                setIsBulkModalOpen(false);
                setBulkText('');
                setUploadedFile(null);
            } else {
                alert("Nenhum item válido encontrado na tabela.");
            }
        } catch (error) {
            console.error("Erro no import bulk:", error);
            alert("Erro ao realizar importação em massa.");
        } finally {
            setIsParsingBulk(false);
        }
    };

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

    // Catalog Item Modal
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
    const [catalogForm, setCatalogForm] = useState<Partial<import('../../types').ProductCatalogItem>>({
        name: '', description: '', code: '', type: 'MATERIAL', categoryId: '', costPrice: 0, sellPrice: 0
    });

    const filteredCatalogItems = productCatalogItems?.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (i.code && i.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.description && i.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    const openCatalogModal = (item?: import('../../types').ProductCatalogItem) => {
        if (item) {
            setEditingCatalogId(item.id);
            setCatalogForm(item);
        } else {
            setEditingCatalogId(null);
            setCatalogForm({
                name: '', description: '', code: '', type: 'MATERIAL', categoryId: '', costPrice: 0, sellPrice: 0
            });
        }
        setIsCatalogModalOpen(true);
    };

    const saveCatalogItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!catalogForm.name || !catalogForm.type) return;
        if (editingCatalogId) {
            await updateProductCatalogItem(editingCatalogId, catalogForm);
        } else {
            await addProductCatalogItem(catalogForm as any);
        }
        setIsCatalogModalOpen(false);
    };

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
                <button 
                  onClick={() => setActiveTab('CATALOG')}
                  className={`px-6 py-3 font-bold text-sm tracking-wide transition-all border-b-2 ${activeTab === 'CATALOG' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  BANCO DE PRODUTOS
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
                {(activeTab === 'ITEMS' || activeTab === 'CATALOG') && canCreate && (
                    <button onClick={() => setIsBulkModalOpen(true)} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Sparkles size={20} /> Importação Inteligente
                    </button>
                )}
                {activeTab === 'ITEMS' && canCreate && (
                    <button onClick={() => openItemModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Novo Produto no Estoque
                    </button>
                )}
                {activeTab === 'CATEGORIES' && canCreate && (
                    <button onClick={() => openCatModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Nova Categoria
                    </button>
                )}
                {activeTab === 'CATALOG' && canCreate && (
                    <button onClick={() => openCatalogModal()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2 whitespace-nowrap">
                        <Plus size={20} /> Novo Produto Base
                    </button>
                )}
            </div>

            {activeTab === 'CATALOG' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Produto Base</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Custo / Venda</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCatalogItems.map(item => {
                                const cat = inventoryCategories.find(c => c.id === item.categoryId);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{item.name}</div>
                                            {item.code && <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {item.code}</div>}
                                            <div className="text-xs text-slate-500 mt-0.5">{item.type}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {cat?.name || '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-slate-700">
                                                C: {(item.costPrice || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                            </div>
                                            <div className="text-sm font-bold text-emerald-600">
                                                V: {(item.sellPrice || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {canEdit && <button onClick={() => openCatalogModal(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16}/></button>}
                                                {canDelete && <button onClick={() => deleteProductCatalogItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCatalogItems.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-500">Nenhum produto base encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

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

            {/* Catalog Modal */}
            {isCatalogModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <form onSubmit={saveCatalogItem} className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative my-auto">
                        <button type="button" onClick={() => setIsCatalogModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingCatalogId ? 'Editar Produto Base' : 'Novo Produto Base'}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Produto</label>
                                <input required type="text" value={catalogForm.name || ''} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">SKU / Código</label>
                                <input type="text" value={catalogForm.code || ''} onChange={e => setCatalogForm({...catalogForm, code: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
                                <select required value={catalogForm.categoryId || ''} onChange={e => setCatalogForm({...catalogForm, categoryId: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="" disabled>Selecione...</option>
                                    {inventoryCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo</label>
                                <select required value={catalogForm.type || 'MATERIAL'} onChange={e => setCatalogForm({...catalogForm, type: e.target.value as any})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="MATERIAL">Insumo/Material</option>
                                    <option value="EQUIPMENT">Equipamento/Ferramenta</option>
                                    <option value="IMPLANT">Implante</option>
                                    <option value="SERVICE">Serviço Terceirizado</option>
                                </select>
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição (Opcional)</label>
                                <textarea value={catalogForm.description || ''} onChange={e => setCatalogForm({...catalogForm, description: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Custo Unitário (R$)</label>
                                <input required type="number" step="0.01" min="0" value={catalogForm.costPrice || ''} onChange={e => setCatalogForm({...catalogForm, costPrice: parseFloat(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço de Venda (R$)</label>
                                <input required type="number" step="0.01" min="0" value={catalogForm.sellPrice || ''} onChange={e => setCatalogForm({...catalogForm, sellPrice: parseFloat(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsCatalogModalOpen(false)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                            <button type="submit" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                <Save size={20}/> Salvar
                            </button>
                        </div>
                    </form>
                </div>
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
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Produto</label>
                                        <input 
                                            required type="text" 
                                            value={itemForm.name || ''} 
                                            onChange={e => {
                                                setItemForm({...itemForm, name: e.target.value});
                                                setShowCatalogSuggestions(true);
                                            }}
                                            onFocus={() => setShowCatalogSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowCatalogSuggestions(false), 200)}
                                            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="Ex: Componente Titânio Hexágono Externo" 
                                        />
                                        
                                        {/* Catalog Autocomplete Dropdown */}
                                        {showCatalogSuggestions && !editingItemId && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                                {productCatalogItems.filter(p => p.name.toLowerCase().includes((itemForm.name || '').toLowerCase())).slice(0, 10).map(catItem => (
                                                    <div 
                                                        key={catItem.id}
                                                        onClick={() => {
                                                            setItemForm({
                                                                ...itemForm,
                                                                name: catItem.name,
                                                                code: catItem.code || itemForm.code,
                                                                description: catItem.description || itemForm.description,
                                                                categoryId: catItem.categoryId || itemForm.categoryId,
                                                                type: catItem.type || itemForm.type,
                                                                costPrice: catItem.costPrice || itemForm.costPrice,
                                                                sellPrice: catItem.sellPrice || itemForm.sellPrice
                                                            });
                                                            setShowCatalogSuggestions(false);
                                                        }}
                                                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="font-bold text-slate-800">{catItem.name}</div>
                                                        <div className="text-xs text-slate-500 flex gap-2">
                                                            {catItem.code && <span>SKU: {catItem.code}</span>}
                                                            <span>• {(catItem.sellPrice || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {productCatalogItems.filter(p => p.name.toLowerCase().includes((itemForm.name || '').toLowerCase())).length === 0 && (
                                                    <div className="p-3 text-xs text-slate-500 text-center">Nenhum produto base encontrado.</div>
                                                )}
                                            </div>
                                        )}
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
                                <input required type="number" step="1" value={itemForm.currentStock || 0} onChange={e => setItemForm({...itemForm, currentStock: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estoque Mínimo</label>
                                <input required type="number" step="1" value={itemForm.minStock || 0} onChange={e => setItemForm({...itemForm, minStock: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
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
            {/* Bulk Import Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl relative my-auto">
                        <button type="button" onClick={() => setIsBulkModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-2">
                            <Upload className="text-emerald-500" />
                            Importação em Massa
                        </h2>
                        <p className="text-slate-500 mb-6 text-sm">
                            Importe e registre produtos em massa a partir de planilhas de estoque (.xlsx, .csv). O sistema fará a leitura linha por linha.
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                            <span className="text-xs font-black text-amber-700 uppercase tracking-wider block mb-2">Ordem Obrigatória das Colunas</span>
                            <div className="text-xs text-amber-800 space-y-1">
                                <p>Para que a importação funcione corretamente, sua planilha <strong>DEVE</strong> seguir exatamente a ordem de colunas abaixo (da esquerda para direita):</p>
                                <ol className="list-decimal pl-4 mt-2 font-mono font-bold">
                                    <li>Código (SKU)</li>
                                    <li>Produto (Nome do Item) - Obrigatório</li>
                                    <li>Categoria</li>
                                    <li>Estoque Atual</li>
                                    <li>Custo Médio (Custo de compra)</li>
                                    <li>Valor Total de Vendas (Coluna ignorada, mas deve existir)</li>
                                    <li>Preço de Venda</li>
                                    <li>Estoque Mínimo</li>
                                    <li>Descrição</li>
                                </ol>
                                <p className="mt-2 text-[10px]">* Obs: A primeira linha pode conter os cabeçalhos. Os valores em dinheiro (ex: R$15,00) serão convertidos automaticamente.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Destino da Importação</span>
                            <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="font-bold text-slate-800 text-sm">
                                    {activeTab === 'CATALOG' ? 'Banco de Produtos Base (Catálogo)' : 'Estoque / Insumos do Laboratório'}
                                </span>
                            </div>
                        </div>

                        {/* File Upload / Drag & Drop Zone */}
                        <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/10 rounded-2xl p-8 text-center cursor-pointer transition-all mb-6 relative group"
                            onClick={() => document.getElementById('bulk-file-input')?.click()}
                        >
                            <input 
                                id="bulk-file-input"
                                type="file"
                                accept=".xlsx,.xls,.csv,.tsv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Upload size={28} />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-base">Arraste seu arquivo ou clique para selecionar</p>
                                    <p className="text-xs text-slate-500 mt-1">Suporta planilhas Excel (.xlsx, .xls) ou arquivos formatados (.csv, .tsv)</p>
                                </div>
                            </div>
                        </div>

                        {/* Active File Badge */}
                        {uploadedFile && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6 flex items-center justify-between animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{uploadedFile.name}</div>
                                        <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Pronto para importação de dados</div>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setUploadedFile(null)} 
                                    className="p-1.5 hover:bg-emerald-200/50 text-emerald-700 rounded-full transition-colors"
                                    title="Remover arquivo"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        {/* Text / CSV Manual Area */}
                        {!uploadedFile && (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Texto Extraído ou Copiado</label>
                                    {bulkText && (
                                        <button 
                                            type="button" 
                                            onClick={() => setBulkText('')} 
                                            className="text-xs text-rose-500 font-bold hover:underline"
                                        >
                                            Limpar Texto
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    placeholder="Caso prefira, você também pode colar dados copiados de uma planilha ou digitar uma lista livre aqui..."
                                    className="w-full h-44 p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs whitespace-pre-wrap resize-none transition-all"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                            <button 
                                type="button" 
                                onClick={() => {
                                    setIsBulkModalOpen(false);
                                    setUploadedFile(null);
                                    setBulkText('');
                                }} 
                                className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                onClick={handleBulkImport}
                                disabled={isParsingBulk || (!bulkText.trim() && !uploadedFile)}
                                className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isParsingBulk ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Analisando e Cadastrando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20}/> Iniciar Importação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
