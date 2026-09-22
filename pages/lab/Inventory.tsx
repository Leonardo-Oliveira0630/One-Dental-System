import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { InventoryCategory, InventoryItem, InventoryItemType } from '../../types';
import { Package, Plus, Trash2, Edit2, Search, X, Layers, Box, Tag, Key, Info, Check, Save, ArrowLeft, ChevronDown, User as UserIcon, Sparkles, Upload, FileText } from 'lucide-react';

export const Inventory = () => {
    const { t } = useTranslation();
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
    
    // New Stock & Bulk Operations State
    const [emptyStocks, setEmptyStocks] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [moveToOwnerId, setMoveToOwnerId] = useState('');
    const [showMoveDentistDropdown, setShowMoveDentistDropdown] = useState(false);
    const [moveDentistSearch, setMoveDentistSearch] = useState('');
    
    const [showCreateStockModal, setShowCreateStockModal] = useState(false);
    const [newStockOwnerId, setNewStockOwnerId] = useState('');
    const [showNewStockDentistDropdown, setShowNewStockDentistDropdown] = useState(false);
    const [newStockDentistSearch, setNewStockDentistSearch] = useState('');
    
    const [showDeleteStockModal, setShowDeleteStockModal] = useState(false);
    const [deleteStockId, setDeleteStockId] = useState<string | null>(null);

    React.useEffect(() => {
        setIsSelectionMode(false);
        setSelectedItems([]);
    }, [activeOwnerGroup, activeTab]);
    
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
    const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
    
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

                        // Garante que o item importado também vai para o banco de produtos base do lab
                        try {
                            const itemCodeTrim = (item.code || '').trim().toLowerCase();
                            const itemNameTrim = (item.name || '').trim().toLowerCase();
                            const exists = (productCatalogItems || []).some(p => 
                                (itemCodeTrim && p.code && p.code.trim().toLowerCase() === itemCodeTrim) ||
                                (itemNameTrim && p.name && p.name.trim().toLowerCase() === itemNameTrim)
                            );
                            if (!exists) {
                                await addProductCatalogItem({
                                    name: item.name || 'Sem Nome',
                                    code: item.code || '',
                                    description: item.description || '',
                                    type: 'MATERIAL',
                                    categoryId: finalCategoryId,
                                    costPrice: Number(item.costPrice) || 0,
                                    sellPrice: Number(item.sellPrice) || 0,
                                } as any);
                            }
                        } catch (errSync) {
                            console.warn("Erro ao sincronizar catálogo no import:", errSync);
                        }
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

    // Banco unificado de produtos do lab (Banco de Produtos Base + Itens de todos os estoques)
    const labDatabaseProducts = React.useMemo(() => {
        const list: Array<{
            id: string;
            name: string;
            code: string;
            description: string;
            categoryId: string;
            type: InventoryItemType;
            costPrice: number;
            sellPrice: number;
        }> = [];

        const seen = new Set<string>();

        // 1. Produtos do Banco de Produtos Base do Lab
        (productCatalogItems || []).forEach(p => {
            const code = (p.code || '').trim();
            const name = (p.name || '').trim();
            const key = `${code.toLowerCase()}::${name.toLowerCase()}`;
            if (!seen.has(key) && (name || code)) {
                seen.add(key);
                list.push({
                    id: p.id,
                    name,
                    code,
                    description: p.description || '',
                    categoryId: p.categoryId || '',
                    type: p.type || 'MATERIAL',
                    costPrice: Number(p.costPrice) || 0,
                    sellPrice: Number(p.sellPrice) || 0,
                });
            }
        });

        // 2. Itens cadastrados em qualquer estoque do laboratório
        (inventoryItems || []).forEach(i => {
            const code = (i.code || '').trim();
            const name = (i.name || '').trim();
            const key = `${code.toLowerCase()}::${name.toLowerCase()}`;
            if (!seen.has(key) && (name || code)) {
                seen.add(key);
                list.push({
                    id: i.id,
                    name,
                    code,
                    description: i.description || '',
                    categoryId: i.categoryId || '',
                    type: i.type || 'MATERIAL',
                    costPrice: Number(i.costPrice) || 0,
                    sellPrice: Number(i.sellPrice) || 0,
                });
            }
        });

        return list;
    }, [productCatalogItems, inventoryItems]);

    // Sugestões filtradas para autocomplete com busca inteligente por SKU ou Nome
    const filteredCatalogSuggestions = React.useMemo(() => {
        const skuQ = (itemForm.code || '').trim().toLowerCase();
        const nameQ = (itemForm.name || '').trim().toLowerCase();

        // Se o usuário digitou SKU:
        if (skuQ) {
            // Se o usuário digitou o SKU completo exatamente igual a um item cadastrado:
            const exactSkuMatches = labDatabaseProducts.filter(p => p.code && p.code.trim().toLowerCase() === skuQ);
            if (exactSkuMatches.length > 0) {
                // Aparece somente a opção correspondente a esse SKU exato
                return exactSkuMatches;
            }
            // Ao ir digitando o SKU, vão aparecendo as opções correspondentes que contenham esse SKU
            const partialSkuMatches = labDatabaseProducts.filter(p => p.code && p.code.trim().toLowerCase().includes(skuQ));
            if (partialSkuMatches.length > 0) {
                return partialSkuMatches.slice(0, 15);
            }
        }

        // Se o usuário está digitando no campo Nome:
        if (nameQ) {
            return labDatabaseProducts.filter(p => 
                p.name.toLowerCase().includes(nameQ) || 
                (p.code && p.code.toLowerCase().includes(nameQ))
            ).slice(0, 15);
        }

        // Padrão: primeiras opções do banco
        return labDatabaseProducts.slice(0, 10);
    }, [itemForm.code, itemForm.name, labDatabaseProducts]);

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

    const ownerOptions = React.useMemo(() => {
        const keys = Array.from(new Set([...Object.keys(itemGroups), ...emptyStocks]));
        if (!keys.includes('LAB')) keys.unshift('LAB');
        
        return keys.map(key => {
            return {
                id: key,
                name: getDentistName(key === 'LAB' ? null : key),
                itemCount: itemGroups[key]?.length || 0
            };
        }).filter(opt => opt.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [itemGroups, emptyStocks, searchQuery, clients]);

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
        setShowCatalogSuggestions(false);
        setShowSkuSuggestions(false);
        if (item) {
            setEditingItemId(item.id);
            setItemForm({ ...item, dentistOwnerId: item.dentistOwnerId || '' });
            setDentistSearch(getDentistName(item.dentistOwnerId));
        } else {
            setEditingItemId(null);
            const ownerId = activeOwnerGroup && activeOwnerGroup !== 'LAB' ? activeOwnerGroup : '';
            setItemForm({
                name: '', code: '', description: '', type: 'MATERIAL', categoryId: '', currentStock: 0, minStock: 0, costPrice: 0, sellPrice: 0, dentistOwnerId: ownerId
            });
            setDentistSearch(ownerId ? getDentistName(ownerId) : '');
        }
        setIsItemModalOpen(true);
    };

    const handleSelectCatalogItem = (catItem: {
        name: string;
        code?: string;
        description?: string;
        categoryId?: string;
        type?: InventoryItemType;
        costPrice?: number;
        sellPrice?: number;
    }) => {
        setItemForm(prev => ({
            ...prev,
            name: catItem.name || prev.name,
            code: catItem.code || prev.code || '',
            description: catItem.description !== undefined ? catItem.description : prev.description,
            categoryId: catItem.categoryId || prev.categoryId,
            type: catItem.type || prev.type || 'MATERIAL',
            costPrice: catItem.costPrice !== undefined ? catItem.costPrice : prev.costPrice,
            sellPrice: catItem.sellPrice !== undefined ? catItem.sellPrice : prev.sellPrice,
        }));
        setShowCatalogSuggestions(false);
        setShowSkuSuggestions(false);
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

        // Garante que todo item cadastrado vai para o banco de dados de produtos do laboratório
        try {
            const itemCodeTrim = (itemForm.code || '').trim().toLowerCase();
            const itemNameTrim = (itemForm.name || '').trim().toLowerCase();
            const existsInCatalog = (productCatalogItems || []).some(p => 
                (itemCodeTrim && p.code && p.code.trim().toLowerCase() === itemCodeTrim) ||
                (itemNameTrim && p.name && p.name.trim().toLowerCase() === itemNameTrim)
            );

            if (!existsInCatalog) {
                await addProductCatalogItem({
                    name: itemForm.name.trim(),
                    code: itemForm.code?.trim() || '',
                    description: itemForm.description || '',
                    categoryId: itemForm.categoryId,
                    type: itemForm.type || 'MATERIAL',
                    costPrice: Number(itemForm.costPrice) || 0,
                    sellPrice: Number(itemForm.sellPrice) || 0,
                } as any);
            }
        } catch (syncErr) {
            console.warn("Erro ao sincronizar produto no banco de produtos do lab:", syncErr);
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

    const handleBulkMove = async () => {
        if (!moveToOwnerId || selectedItems.length === 0) return;
        const targetOwner = moveToOwnerId === 'LAB' ? null : moveToOwnerId;
        
        for (const itemId of selectedItems) {
            const item = inventoryItems.find(i => i.id === itemId);
            if (item) {
                await updateInventoryItem(itemId, { ...item, dentistOwnerId: targetOwner } as any);
            }
        }
        
        if (targetOwner && !itemGroups[targetOwner] && !emptyStocks.includes(targetOwner)) {
            setEmptyStocks(prev => [...prev, targetOwner]);
        } else if (moveToOwnerId === 'LAB' && !emptyStocks.includes('LAB')) {
            setEmptyStocks(prev => [...prev, 'LAB']);
        }
        
        setShowMoveModal(false);
        setIsSelectionMode(false);
        setSelectedItems([]);
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        for (const itemId of selectedItems) {
            await deleteInventoryItem(itemId);
        }
        setShowDeleteConfirmModal(false);
        setIsSelectionMode(false);
        setSelectedItems([]);
    };

    const handleCreateStock = () => {
        if (!newStockOwnerId) return;
        const targetOwner = newStockOwnerId === 'LAB' ? 'LAB' : newStockOwnerId;
        if (!emptyStocks.includes(targetOwner) && !itemGroups[targetOwner]) {
            setEmptyStocks(prev => [...prev, targetOwner]);
        }
        setShowCreateStockModal(false);
        setNewStockOwnerId('');
        setNewStockDentistSearch('');
        setActiveOwnerGroup(targetOwner);
    };

    const handleDeleteStock = async () => {
        if (!deleteStockId) return;
        
        // Remove all items in this stock
        const itemsToDelete = itemGroups[deleteStockId] || [];
        for (const item of itemsToDelete) {
            await deleteInventoryItem(item.id);
        }

        // Remove from emptyStocks if it's there
        setEmptyStocks(prev => prev.filter(id => id !== deleteStockId));
        
        setShowDeleteStockModal(false);
        setDeleteStockId(null);
        if (activeOwnerGroup === deleteStockId) {
            setActiveOwnerGroup(null);
        }
    };

    const openDeleteStockConfirm = (stockId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteStockId(stockId);
        setShowDeleteStockModal(true);
    };

    return (
        <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-8 max-w-7xl mx-auto space-y-6 pb-32 w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight flex-wrap">
                        <Package className="text-indigo-600 shrink-0" /> <span className="break-words min-w-0 flex-1">{t("inventory.title", "CONTROLE DE ESTOQUE E INVENTÁRIO")}</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base break-words">{t("inventory.subtitle", "Gerencie produtos, categorias, insumos, maquinários e implantes do laboratório.")}</p>
                </div>
            </div>

            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button 
                  onClick={() => setActiveTab('ITEMS')}
                  className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${activeTab === 'ITEMS' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {t("inventory.tabItems", "PRODUTOS & INSUMOS")}
                </button>
                <button 
                  onClick={() => setActiveTab('CATEGORIES')}
                  className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${activeTab === 'CATEGORIES' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {t("inventory.tabCategories", "CATEGORIAS")}
                </button>
                <button 
                  onClick={() => setActiveTab('CATALOG')}
                  className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${activeTab === 'CATALOG' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {t("inventory.tabCatalog", "BANCO DE PRODUTOS")}
                </button>
            </div>

            <div className="flex flex-col xl:flex-row xl:items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder={
                            activeTab === 'ITEMS' && activeOwnerGroup 
                                ? t("inventory.searchItemsPlaceholder", "Buscar por nome do item ou código SKU...") 
                                : activeTab === 'ITEMS' && !activeOwnerGroup
                                ? t("inventory.searchStocksPlaceholder", "Buscar estoque por nome do dentista/laboratório ou itens...")
                                : t("inventory.searchPlaceholder", "Buscar...")
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                    />
                    {searchQuery && (
                        <button 
                            type="button" 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                            title={t("common.clear", "Limpar")}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-4 w-full xl:w-auto">
                    {(activeTab === 'ITEMS' || activeTab === 'CATALOG') && canCreate && (
                        <button onClick={() => setIsBulkModalOpen(true)} className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-emerald-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-emerald-700 shadow-md flex items-center gap-2">
                            <Sparkles size={20} /> {t("inventory.smartImport", "Importação Inteligente")}
                        </button>
                    )}
                    {activeTab === 'ITEMS' && canCreate && activeOwnerGroup === null && (
                        <button onClick={() => setShowCreateStockModal(true)} className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-amber-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-amber-700 shadow-md flex items-center gap-2">
                            <Layers size={20} /> {t("inventory.createStock", "Criar Estoque")}
                        </button>
                    )}
                    {activeTab === 'ITEMS' && canCreate && (
                        <button onClick={() => openItemModal()} className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2">
                            <Plus size={20} /> {t("inventory.newProduct", "Novo Produto")}
                        </button>
                    )}
                    {activeTab === 'CATEGORIES' && canCreate && (
                        <button onClick={() => openCatModal()} className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2">
                            <Plus size={20} /> {t("inventory.newCategory", "Nova Categoria")}
                        </button>
                    )}
                    {activeTab === 'CATALOG' && canCreate && (
                        <button onClick={() => openCatalogModal()} className="w-full sm:flex-1 xl:w-auto justify-center px-4 sm:px-6 py-3 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2">
                            <Plus size={20} /> {t("inventory.newBaseProduct", "Novo Produto Base")}
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'CATALOG' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t("inventory.baseProduct", "Produto Base")}</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t("inventory.category", "Categoria")}</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t("inventory.costSell", "Custo / Venda")}</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest w-24">{t("common.actions", "Ações")}</th>
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
                                    <td colSpan={4} className="p-12 text-center text-slate-500">{t("inventory.noBaseProduct", "Nenhum produto base encontrado.")}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'CATEGORIES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:p-6">
                    {filteredCategories.map(cat => (
                        <div key={cat.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 rounded-xl">
                                    <Layers className="text-indigo-600" size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canEdit && <button onClick={() => openCatModal(cat)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Edit2 size={16}/></button>}
                                    {canDelete && <button onClick={() => deleteInventoryCategory(cat.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>}
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 break-words">{cat.name}</h3>
                            <div className="mt-2 inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                {t("inventory.typeLabel", "TIPO")}: {cat.type}
                            </div>
                        </div>
                    ))}
                    {filteredCategories.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                            {t("inventory.noCategoriesFound", "Nenhuma categoria encontrada.")}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ITEMS' && (
                <>
                    {activeOwnerGroup === null ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:p-6">
                            {ownerOptions.map(owner => (
                                <div key={owner.id} onClick={() => setActiveOwnerGroup(owner.id)} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col group hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-4 rounded-2xl ${owner.id === 'LAB' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {owner.id === 'LAB' ? <Box size={32} /> : <UserIcon size={32} />}
                                        </div>
                                        {canDelete && (
                                            <button 
                                                onClick={(e) => openDeleteStockConfirm(owner.id, e)} 
                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title={t("inventory.deleteStockTooltip", "Excluir Estoque")}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 line-clamp-2">{owner.name}</h3>
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                            <Package size={12}/> {t("inventory.productsCount", { count: owner.itemCount, defaultValue: `${owner.itemCount} Produtos` })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {ownerOptions.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
                                    {t("inventory.noStockSourcesFound", "Nenhuma fonte de estoque encontrada.")}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setActiveOwnerGroup(null)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                                        <ArrowLeft size={18} className="text-slate-600" />
                                    </button>
                                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 flex-1 min-w-0 break-words">
                                        {activeOwnerGroup === 'LAB' ? <Box className="text-indigo-600"/> : <UserIcon className="text-amber-600"/>}
                                        {getDentistName(activeOwnerGroup === 'LAB' ? null : activeOwnerGroup)}
                                    </h2>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
                                    <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hidden sm:block">
                                        {t("inventory.productsCount", { count: filteredItems.length, defaultValue: `${filteredItems.length} Produtos` })}
                                    </div>
                                    {isSelectionMode && selectedItems.length > 0 && (
                                        <>
                                            <button 
                                                onClick={() => setShowMoveModal(true)}
                                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
                                            >
                                                {t("inventory.moveItems", { count: selectedItems.length, defaultValue: `Mover (${selectedItems.length})` })}
                                            </button>
                                            <button 
                                                onClick={() => setShowDeleteConfirmModal(true)}
                                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow hover:bg-red-700 transition-colors flex items-center gap-2"
                                            >
                                                <Trash2 size={14} /> {t("inventory.deleteItems", { count: selectedItems.length, defaultValue: `Excluir (${selectedItems.length})` })}
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setIsSelectionMode(!isSelectionMode);
                                            if (isSelectionMode) setSelectedItems([]);
                                        }}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-2 ${isSelectionMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <Check size={14} /> {isSelectionMode ? t("inventory.cancelSelection", "Cancelar Seleção") : t("inventory.select", "Selecionar")}
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        {isSelectionMode && (
                                            <th className="p-4 w-12">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedItems(filteredItems.map(i => i.id));
                                                        else setSelectedItems([]);
                                                    }}
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </th>
                                        )}
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t("inventory.product", "Produto")}</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t("inventory.category", "Categoria")}</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">{t("inventory.stock", "Estoque")}</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">{t("inventory.salePrice", "Preço Venda")}</th>
                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">{t("common.actions", "Ações")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map(item => {
                                        const cat = inventoryCategories.find(c => c.id === item.categoryId);
                                        const isLowStock = item.currentStock <= item.minStock;
                                        return (
                                            <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedItems.includes(item.id) ? 'bg-indigo-50/30' : ''}`}>
                                                {isSelectionMode && (
                                                    <td className="p-4">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedItems.includes(item.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedItems(prev => [...prev, item.id]);
                                                                else setSelectedItems(prev => prev.filter(id => id !== item.id));
                                                            }}
                                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </td>
                                                )}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-slate-800">{item.name}</div>
                                                        {item.code && <span className="text-[10px] font-black bg-slate-100 text-slate-500 py-0.5 px-1.5 rounded uppercase tracking-wider">{item.code}</span>}
                                                    </div>
                                                    {item.description && <div className="text-xs text-slate-500 mt-1 truncate max-w-[250px]">{item.description}</div>}
                                                    <div className="text-[10px] bg-slate-100 text-slate-500 inline-block px-2 py-0.5 rounded mt-1">{item.type}</div>
                                                </td>
                                                <td className="p-4 font-medium text-slate-600">{cat?.name || t("inventory.unknown", "Desconhecida")}</td>
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
                                                {t("inventory.noProductsFound", "Nenhum produto encontrado.")}
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

            {/* Catalog Modal */}
            {isCatalogModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <form onSubmit={saveCatalogItem} className="bg-white rounded-3xl p-4 sm:p-8 max-w-2xl w-full shadow-2xl relative my-auto">
                        <button type="button" onClick={() => setIsCatalogModalOpen(false)} className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingCatalogId ? t("inventory.editBaseProduct", "Editar Produto Base") : t("inventory.newBaseProduct", "Novo Produto Base")}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.productName", "Nome do Produto")}</label>
                                <input required type="text" value={catalogForm.name || ''} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.skuCode", "SKU / Código")}</label>
                                <input type="text" value={catalogForm.code || ''} onChange={e => setCatalogForm({...catalogForm, code: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.category", "Categoria")}</label>
                                <select required value={catalogForm.categoryId || ''} onChange={e => setCatalogForm({...catalogForm, categoryId: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="" disabled>{t("common.select", "Selecione...")}</option>
                                    {inventoryCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.type", "Tipo")}</label>
                                <select required value={catalogForm.type || 'MATERIAL'} onChange={e => setCatalogForm({...catalogForm, type: e.target.value as any})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="MATERIAL">{t("inventory.typeMaterial", "Insumo/Material")}</option>
                                    <option value="EQUIPMENT">{t("inventory.typeEquipment", "Equipamento/Ferramenta")}</option>
                                    <option value="IMPLANT">{t("inventory.typeImplant", "Implante")}</option>
                                    <option value="SERVICE">{t("inventory.typeService", "Serviço Terceirizado")}</option>
                                </select>
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.descriptionOptional", "Descrição (Opcional)")}</label>
                                <textarea value={catalogForm.description || ''} onChange={e => setCatalogForm({...catalogForm, description: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.unitCost", "Custo Unitário (R$)")}</label>
                                <input required type="number" step="0.01" min="0" value={catalogForm.costPrice || ''} onChange={e => setCatalogForm({...catalogForm, costPrice: parseFloat(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.salePrice", "Preço de Venda (R$)")}</label>
                                <input required type="number" step="0.01" min="0" value={catalogForm.sellPrice || ''} onChange={e => setCatalogForm({...catalogForm, sellPrice: parseFloat(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsCatalogModalOpen(false)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">{t("common.cancel", "Cancelar")}</button>
                            <button type="submit" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                <Save size={20}/> {t("common.save", "Salvar")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Category Modal */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={saveCat} className="bg-white rounded-3xl p-4 sm:p-8 max-w-md w-full shadow-2xl relative">
                        <button type="button" onClick={() => setIsCatModalOpen(false)} className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingCatId ? t("inventory.editCategory", "Editar Categoria") : t("inventory.newCategory", "Nova Categoria")}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.categoryName", "Nome da Categoria")}</label>
                                <input required type="text" value={catForm.name || ''} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.type", "Tipo")}</label>
                                <select required value={catForm.type || 'MATERIAL'} onChange={e => setCatForm({...catForm, type: e.target.value as any})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="MATERIAL">{t("inventory.materialGeneral", "Material Geral")}</option>
                                    <option value="SUPPLY">{t("inventory.supply", "Insumo")}</option>
                                    <option value="MACHINERY">{t("inventory.machinery", "Maquinário")}</option>
                                    <option value="IMPLANT">{t("inventory.implantComponent", "Implante / Componente")}</option>
                                    <option value="OTHER">{t("inventory.other", "Outros")}</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 flex justify-center items-center gap-2">
                                <Save size={20}/> {t("inventory.saveCategory", "SALVAR CATEGORIA")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={saveItem} className="bg-white rounded-3xl p-4 sm:p-8 max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button type="button" onClick={() => setIsItemModalOpen(false)} className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingItemId ? t("inventory.editProduct", "Editar Produto") : t("inventory.newProduct", "Novo Produto")}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                            <div className="md:col-span-2 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Campo Código SKU com autocomplete inteligente */}
                                    <div className="md:col-span-1 relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                                            <span>{t("inventory.itemSkuCode", "Código do Item (SKU)")}</span>
                                            {itemForm.code && (
                                                <span className="text-[10px] text-indigo-600 font-semibold lowercase">
                                                    {filteredCatalogSuggestions.length === 1 && (filteredCatalogSuggestions[0].code || '').toLowerCase() === itemForm.code.trim().toLowerCase() ? "✓ SKU exato" : "busca por SKU"}
                                                </span>
                                            )}
                                        </label>
                                        <input 
                                            type="text" 
                                            value={itemForm.code || ''} 
                                            onChange={e => {
                                                setItemForm({...itemForm, code: e.target.value});
                                                setShowSkuSuggestions(true);
                                                setShowCatalogSuggestions(true);
                                            }} 
                                            onFocus={() => {
                                                setShowSkuSuggestions(true);
                                                if (itemForm.code) setShowCatalogSuggestions(true);
                                            }}
                                            onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 250)}
                                            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono font-bold" 
                                            placeholder="Ex: TIT-HEX-001" 
                                        />

                                        {/* SKU Dropdown Suggestions */}
                                        {showSkuSuggestions && !editingItemId && itemForm.code && filteredCatalogSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                                <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 text-[10px] font-bold text-indigo-800 flex items-center justify-between">
                                                    <span>Opções por SKU ({filteredCatalogSuggestions.length})</span>
                                                </div>
                                                {filteredCatalogSuggestions.map(catItem => (
                                                    <div 
                                                        key={catItem.id}
                                                        onClick={() => handleSelectCatalogItem(catItem)}
                                                        className="p-3 hover:bg-indigo-50/60 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-100/70 px-1.5 py-0.5 rounded">
                                                                {catItem.code || 'S/ SKU'}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-medium">
                                                                {(catItem.sellPrice || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                                            </span>
                                                        </div>
                                                        <div className="font-bold text-slate-800 text-xs mt-1 truncate">{catItem.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Campo Nome com Autocomplete */}
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                                            <span>{t("inventory.productName", "Nome do Produto")}</span>
                                            {itemForm.code && (
                                                <span className="text-[10px] text-indigo-500 font-normal">
                                                    sugestões por SKU ativas
                                                </span>
                                            )}
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={itemForm.name || ''} 
                                            onChange={e => {
                                                setItemForm({...itemForm, name: e.target.value});
                                                setShowCatalogSuggestions(true);
                                            }}
                                            onFocus={() => setShowCatalogSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowCatalogSuggestions(false), 250)}
                                            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder={t("inventory.productNamePlaceholder", "Ex: Componente Titânio Hexágono Externo")} 
                                        />
                                        
                                        {/* Catalog Autocomplete Dropdown */}
                                        {showCatalogSuggestions && !editingItemId && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                                {itemForm.code && (
                                                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                                                        <span>Correspondência para SKU: <strong className="text-indigo-600 font-mono">{itemForm.code}</strong></span>
                                                        <span className="text-[10px] text-slate-400">{filteredCatalogSuggestions.length} encontrado(s)</span>
                                                    </div>
                                                )}
                                                {filteredCatalogSuggestions.map(catItem => (
                                                    <div 
                                                        key={catItem.id}
                                                        onClick={() => handleSelectCatalogItem(catItem)}
                                                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-bold text-slate-800">{catItem.name}</div>
                                                            {catItem.code && (
                                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono font-bold shrink-0">
                                                                    SKU: {catItem.code}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                                            {catItem.type && <span className="capitalize">{catItem.type.toLowerCase()}</span>}
                                                            <span>• {(catItem.sellPrice || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredCatalogSuggestions.length === 0 && (
                                                    <div className="p-3 text-xs text-slate-500 text-center">{t("inventory.noBaseProduct", "Nenhum produto base encontrado.")}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.descriptionOptional", "Descrição (Opcional)")}</label>
                                    <textarea value={itemForm.description || ''} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]" placeholder={t("inventory.descriptionPlaceholder", "Informações adicionais...")} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.category", "Categoria")}</label>
                                <select required value={itemForm.categoryId || ''} onChange={e => {
                                    const cat = inventoryCategories.find(c => c.id === e.target.value);
                                    setItemForm({...itemForm, categoryId: e.target.value, type: cat ? cat.type : 'MATERIAL'});
                                }} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="" disabled>{t("inventory.selectCategory", "Selecione uma categoria")}</option>
                                    {inventoryCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.ownerImplants", "Proprietário (Especial Implantes)")}</label>
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
                                        placeholder={t("inventory.searchOwnerPlaceholder", "Buscar laboratório ou cliente...")}
                                    />
                                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                {showDentistDropdown && (
                                    <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                                        <button 
                                            type="button"
                                            onClick={() => handleSelectDentist(null, t("inventory.labGeneral", "Laboratório (Geral)"))}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100"
                                        >
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Box size={16}/></div>
                                            <div>
                                                <div className="font-bold text-slate-800">{t("inventory.labGeneral", "Laboratório (Geral)")}</div>
                                                <div className="text-xs text-slate-500">{t("inventory.labStock", "Estoque do próprio laboratório")}</div>
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
                                                    <div className="text-xs text-slate-500">{t("inventory.clientSpecialStock", "Estoque Especial do Cliente")}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[10px] mt-2 text-amber-600 font-medium">{t("inventory.isolatedStockInfo", "Você pode criar um estoque isolado de itens de clientes.")}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.currentStock", "Estoque Atual")}</label>
                                <input required type="number" step="1" value={itemForm.currentStock || 0} onChange={e => setItemForm({...itemForm, currentStock: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.minStock", "Estoque Mínimo")}</label>
                                <input required type="number" step="1" value={itemForm.minStock || 0} onChange={e => setItemForm({...itemForm, minStock: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.unitCost", "Custo Unitário (R$)")}</label>
                                <input required type="number" step="0.01" value={itemForm.costPrice || 0} onChange={e => setItemForm({...itemForm, costPrice: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("inventory.extraChargePrice", "Preço de Venda / Cobrança Extra (R$)")}</label>
                                <input required type="number" step="0.01" value={itemForm.sellPrice || 0} onChange={e => setItemForm({...itemForm, sellPrice: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <p className="text-[10px] mt-2 text-slate-500">{t("inventory.extraChargeHelp", "Valor cobrado a mais na OS quando este item é utilizado.")}</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 flex justify-center items-center gap-2">
                                <Save size={20}/> {editingItemId ? t("inventory.updateProductBtn", "ATUALIZAR PRODUTO") : t("inventory.registerProductBtn", "CADASTRAR PRODUTO NO ESTOQUE")}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {/* Bulk Import Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl p-4 sm:p-8 max-w-3xl w-full shadow-2xl relative my-auto">
                        <button type="button" onClick={() => setIsBulkModalOpen(false)} className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors">
                            <X size={20}/>
                        </button>
                        <h2 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-2">
                            <Upload className="text-emerald-500" />
                            {t("inventory.bulkImportTitle", "Importação em Massa")}
                        </h2>
                        <p className="text-slate-500 mb-6 text-sm">
                            {t("inventory.bulkImportSubtitle", "Importe e registre produtos em massa a partir de planilhas de estoque (.xlsx, .csv). O sistema fará a leitura linha por linha.")}
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                            <span className="text-xs font-black text-amber-700 uppercase tracking-wider block mb-2">{t("inventory.mandatoryColumnOrder", "Ordem Obrigatória das Colunas")}</span>
                            <div className="text-xs text-amber-800 space-y-1">
                                <p>{t("inventory.columnOrderIntro", "Para que a importação funcione corretamente, sua planilha DEVE seguir exatamente a ordem de colunas abaixo (da esquerda para direita):")}</p>
                                <ol className="list-decimal pl-4 mt-2 font-mono font-bold">
                                    <li>{t("inventory.colSku", "Código (SKU)")}</li>
                                    <li>{t("inventory.colProduct", "Produto (Nome do Item) - Obrigatório")}</li>
                                    <li>{t("inventory.category", "Categoria")}</li>
                                    <li>{t("inventory.currentStock", "Estoque Atual")}</li>
                                    <li>{t("inventory.colAvgCost", "Custo Médio (Custo de compra)")}</li>
                                    <li>{t("inventory.colTotalSales", "Valor Total de Vendas (Coluna ignorada, mas deve existir)")}</li>
                                    <li>{t("inventory.salePrice", "Preço de Venda")}</li>
                                    <li>{t("inventory.minStock", "Estoque Mínimo")}</li>
                                    <li>{t("inventory.colDescription", "Descrição")}</li>
                                </ol>
                                <p className="mt-2 text-[10px]">{t("inventory.columnOrderNote", "* Obs: A primeira linha pode conter os cabeçalhos. Os valores em dinheiro (ex: R$15,00) serão convertidos automaticamente.")}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">{t("inventory.importDestination", "Destino da Importação")}</span>
                            <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="font-bold text-slate-800 text-sm">
                                    {activeTab === 'CATALOG' ? t("inventory.destCatalog", "Banco de Produtos Base (Catálogo)") : t("inventory.destStock", "Estoque / Insumos do Laboratório")}
                                </span>
                            </div>
                        </div>

                        {/* File Upload / Drag & Drop Zone */}
                        <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/10 rounded-2xl p-4 sm:p-8 text-center cursor-pointer transition-all mb-6 relative group"
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
                                    <p className="font-black text-slate-800 text-base">{t("inventory.dragDropPrompt", "Arraste seu arquivo ou clique para selecionar")}</p>
                                    <p className="text-xs text-slate-500 mt-1">{t("inventory.dragDropSub", "Suporta planilhas Excel (.xlsx, .xls) ou arquivos formatados (.csv, .tsv)")}</p>
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
                                        <div className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">{t("inventory.readyForImport", "Pronto para importação de dados")}</div>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setUploadedFile(null)} 
                                    className="p-1.5 hover:bg-emerald-200/50 text-emerald-700 rounded-full transition-colors"
                                    title={t("inventory.removeFile", "Remover arquivo")}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        {/* Text / CSV Manual Area */}
                        {!uploadedFile && (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("inventory.extractedTextLabel", "Texto Extraído ou Copiado")}</label>
                                    {bulkText && (
                                        <button 
                                            type="button" 
                                            onClick={() => setBulkText('')} 
                                            className="text-xs text-rose-500 font-bold hover:underline"
                                        >
                                            {t("inventory.clearText", "Limpar Texto")}
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    placeholder={t("inventory.pastePlaceholder", "Caso prefira, você também pode colar dados copiados de uma planilha ou digitar uma lista livre aqui...")}
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
                                {t("common.cancel", "Cancelar")}
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
                                        {t("inventory.analyzingRegistering", "Analisando e Cadastrando...")}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20}/> {t("inventory.startImport", "Iniciar Importação")}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Move Modal */}
            {showMoveModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <ArrowLeft className="text-blue-600" /> {t("inventory.moveItemsTitle", "Mover Itens")}
                            </h2>
                            <button onClick={() => setShowMoveModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm font-medium text-slate-600">
                                {t("inventory.moveDestinationPrompt", { count: selectedItems.length, defaultValue: `Para qual estoque deseja mover os ${selectedItems.length} itens selecionados?` })}
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{t("inventory.destinationLabel", "Destino")}</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={moveDentistSearch}
                                        onChange={(e) => {
                                            setMoveDentistSearch(e.target.value);
                                            setShowMoveDentistDropdown(true);
                                            if (!e.target.value) setMoveToOwnerId('');
                                        }}
                                        onFocus={() => setShowMoveDentistDropdown(true)}
                                        placeholder={t("inventory.searchStockPlaceholder", "Digite para buscar estoque/cliente...")}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    {showMoveDentistDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            <div 
                                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 font-bold text-blue-700 flex items-center gap-2"
                                                onClick={() => {
                                                    setMoveToOwnerId('LAB');
                                                    setMoveDentistSearch(t("inventory.labGeneral", "Laboratório (Geral)"));
                                                    setShowMoveDentistDropdown(false);
                                                }}
                                            >
                                                <Box size={16} /> {t("inventory.labGeneral", "Laboratório (Geral)")}
                                            </div>
                                            {clients.filter(c => c.name.toLowerCase().includes(moveDentistSearch.toLowerCase()) || (c.clinicName && c.clinicName.toLowerCase().includes(moveDentistSearch.toLowerCase()))).slice(0, 10).map(client => (
                                                <div 
                                                    key={client.id}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                    onClick={() => {
                                                        setMoveToOwnerId(client.id);
                                                        setMoveDentistSearch(client.clinicName || client.name);
                                                        setShowMoveDentistDropdown(false);
                                                    }}
                                                >
                                                    <div className="font-bold text-slate-800">{client.clinicName || client.name}</div>
                                                    {client.clinicName && <div className="text-xs text-slate-500">{client.name}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowMoveModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">{t("common.cancel", "Cancelar")}</button>
                            <button onClick={handleBulkMove} disabled={!moveToOwnerId} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">{t("inventory.moveItemsBtn", "Mover Itens")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirm Modal */}
            {showDeleteConfirmModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">{t("inventory.confirmDeleteTitle", "Confirmar Exclusão")}</h2>
                            <p className="text-slate-600 font-medium">{t("inventory.confirmDeleteMsg", { count: selectedItems.length, defaultValue: `Tem certeza que deseja excluir os ${selectedItems.length} itens selecionados? Esta ação não pode ser desfeita.` })}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirmModal(false)} className="flex-1 px-5 py-3 font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">{t("common.cancel", "Cancelar")}</button>
                            <button onClick={handleBulkDelete} className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all">{t("inventory.deleteAllBtn", "Excluir Tudo")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Stock Modal */}
            {showCreateStockModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Layers className="text-amber-600" /> {t("inventory.createStockTitle", "Criar Novo Estoque")}
                            </h2>
                            <button onClick={() => setShowCreateStockModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm font-medium text-slate-600">
                                {t("inventory.createStockPrompt", "Selecione de quem será este estoque (Geral do laboratório ou de um cliente específico).")}
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{t("inventory.stockOwnerLabel", "Proprietário do Estoque")}</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={newStockDentistSearch}
                                        onChange={(e) => {
                                            setNewStockDentistSearch(e.target.value);
                                            setShowNewStockDentistDropdown(true);
                                            if (!e.target.value) setNewStockOwnerId('');
                                        }}
                                        onFocus={() => setShowNewStockDentistDropdown(true)}
                                        placeholder={t("inventory.searchPlaceholder", "Buscar...")}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    />
                                    {showNewStockDentistDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            <div 
                                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 font-bold text-indigo-700 flex items-center gap-2"
                                                onClick={() => {
                                                    setNewStockOwnerId('LAB');
                                                    setNewStockDentistSearch(t("inventory.labGeneral", "Laboratório (Geral)"));
                                                    setShowNewStockDentistDropdown(false);
                                                }}
                                            >
                                                <Box size={16} /> {t("inventory.labGeneral", "Laboratório (Geral)")}
                                            </div>
                                            {clients.filter(c => c.name.toLowerCase().includes(newStockDentistSearch.toLowerCase()) || (c.clinicName && c.clinicName.toLowerCase().includes(newStockDentistSearch.toLowerCase()))).slice(0, 10).map(client => (
                                                <div 
                                                    key={client.id}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                    onClick={() => {
                                                        setNewStockOwnerId(client.id);
                                                        setNewStockDentistSearch(client.clinicName || client.name);
                                                        setShowNewStockDentistDropdown(false);
                                                    }}
                                                >
                                                    <div className="font-bold text-slate-800">{client.clinicName || client.name}</div>
                                                    {client.clinicName && <div className="text-xs text-slate-500">{client.name}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowCreateStockModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">{t("common.cancel", "Cancelar")}</button>
                            <button onClick={handleCreateStock} disabled={!newStockOwnerId} className="px-5 py-2.5 bg-amber-600 text-white font-bold rounded-xl shadow-lg hover:bg-amber-700 transition-all disabled:opacity-50">{t("inventory.createStockBtn", "Criar Estoque")}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Stock Confirm Modal */}
            {showDeleteStockModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">{t("inventory.deleteStockTitle", "Excluir Estoque")}</h2>
                            <p className="text-slate-600 font-medium">{t("inventory.deleteStockWarning", { count: itemGroups[deleteStockId || '']?.length || 0, defaultValue: `Tem certeza que deseja excluir este estoque completo? Todos os ${itemGroups[deleteStockId || '']?.length || 0} itens dentro dele serão apagados permanentemente.` })}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowDeleteStockModal(false)} className="flex-1 px-5 py-3 font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">{t("common.cancel", "Cancelar")}</button>
                            <button onClick={handleDeleteStock} className="flex-1 px-5 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all">{t("inventory.deleteStockBtn", "Excluir Estoque")}</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
