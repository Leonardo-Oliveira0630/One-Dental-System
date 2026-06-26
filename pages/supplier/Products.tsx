import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryItem, InventoryItemType } from '../../types';
import { smartCompress } from '../../services/compressionService';
import { 
  Package, Plus, Trash2, Edit2, Search, X, Box, Tag, 
  Info, Check, Save, Image, Eye, EyeOff, Loader2, Sparkles, Layers, RefreshCw,
  Folder, ToggleLeft, ToggleRight, Type, PercentCircle, AlertCircle, ClipboardCheck
} from 'lucide-react';

export const SupplierProducts = () => {
  const { 
    inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem, inventoryCategories, currentUser
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PRODUCTS' | 'COMBOS'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Outer form state
  const [form, setForm] = useState<Partial<InventoryItem>>({
    name: '',
    code: '',
    description: '',
    type: 'MATERIAL',
    categoryId: '',
    currentStock: 0,
    minStock: 2,
    costPrice: 0,
    sellPrice: 0,
    isVisibleInStore: true,
    imageUrl: '',
    imageUrls: [],
    variations: [],
    isCombo: false,
    comboItems: []
  });

  // Local helper states for multiple dynamic builders
  const [tempImageUrl, setTempImageUrl] = useState('');
  
  const [varName, setVarName] = useState('');
  const [varPriceMod, setVarPriceMod] = useState(0);
  const [varImageUrl, setVarImageUrl] = useState('');
  const [varStock, setVarStock] = useState(10);

  const [comboProdId, setComboProdId] = useState('');
  const [comboQty, setComboQty] = useState(1);

  const filteredItems = (inventoryItems || []).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (filterType === 'PRODUCTS') return !item.isCombo;
    if (filterType === 'COMBOS') return !!item.isCombo;
    return true;
  });

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await smartCompress(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setForm(prev => ({ ...prev, imageUrl: evt.target?.result as string }));
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar imagem.');
    }
  };

  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await smartCompress(files[i]);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressed);
        });
        newUrls.push(base64);
      }
      setForm(prev => ({
        ...prev,
        imageUrls: [...(prev.imageUrls || []), ...newUrls]
      }));
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar fotos adicionais.');
    }
  };

  const handleVariationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await smartCompress(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setVarImageUrl(evt.target?.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar imagem.');
    }
  };

  const handleAddNewCategoryInline = async () => {
    const name = prompt('Informe o nome da nova categoria de insumos:');
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    const newCat = {
      id: `cat_${Date.now()}`,
      name: cleanName,
      type: 'MATERIAL'
    };
    try {
      const orgId = inventoryItems?.[0]?.organizationId || currentUser?.organizationId || '';
      if (!orgId) {
        alert('Erro: ID do fornecedor não localizado.');
        return;
      }
      const { apiAddInventoryCategory } = await import('../../services/firebaseService');
      await apiAddInventoryCategory(orgId, newCat);
      setForm(prev => ({ ...prev, categoryId: newCat.id }));
      alert('Categoria criada com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar categoria.');
    }
  };

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItemId(item.id);
      setForm({
        ...item,
        imageUrls: item.imageUrls || [],
        variations: item.variations || [],
        variationGroups: item.variationGroups || [],
        isCombo: !!item.isCombo,
        comboItems: item.comboItems || []
      });
    } else {
      setEditingItemId(null);
      setForm({
        name: '',
        code: `PROD-${Date.now().toString().substring(8)}`,
        description: '',
        type: 'MATERIAL',
        currentStock: 10,
        minStock: 2,
        costPrice: 0,
        sellPrice: 0,
        isVisibleInStore: true,
        imageUrl: '',
        imageUrls: [],
        variations: [],
        variationGroups: [],
        isCombo: false,
        comboItems: []
      });
    }
    // Clean assistant states
    setTempImageUrl('');
    setVarName('');
    setVarPriceMod(0);
    setVarImageUrl('');
    setVarStock(10);
    setComboProdId('');
    setComboQty(1);
    
    setIsModalOpen(true);
  };

  const openComboModal = () => {
    openModal();
    setForm(prev => ({
      ...prev,
      isCombo: true,
      code: `COMBO-${Date.now().toString().substring(8)}`
    }));
  };

  const handleAddImageUrl = () => {
    if (!tempImageUrl.trim()) return;
    const current = form.imageUrls || [];
    setForm(prev => ({
      ...prev,
      imageUrls: [...current, tempImageUrl.trim()]
    }));
    setTempImageUrl('');
  };

  const handleRemoveImageUrl = (index: number) => {
    setForm(prev => ({
      ...prev,
      imageUrls: (prev.imageUrls || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleAddVariation = () => {
    if (!varName.trim()) {
      alert('Informe o nome/opção da variação (Ex: Cor: Vermelho ou Voltagem: 220v)');
      return;
    }
    const newVar = {
      id: `var_${Date.now()}`,
      name: varName.trim(),
      priceModifier: Number(varPriceMod || 0),
      imageUrl: varImageUrl.trim() || undefined,
      currentStock: Number(varStock || 0)
    };
    setForm(prev => ({
      ...prev,
      variations: [...(prev.variations || []), newVar]
    }));
    // reset
    setVarName('');
    setVarPriceMod(0);
    setVarImageUrl('');
    setVarStock(10);
  };

  const handleRemoveVariation = (id: string) => {
    setForm(prev => ({
      ...prev,
      variations: (prev.variations || []).filter(v => v.id !== id)
    }));
  };

  // --- Group Variation Handlers (Supplier Customization) ---
  const addGroup = () => {
    const list = form.variationGroups || [];
    const newGroup = {
      id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: `Novo Grupo ${list.length + 1}`,
      selectionType: 'SINGLE' as 'SINGLE' | 'MULTIPLE' | 'TEXT',
      options: [] as any[]
    };
    setForm(prev => ({
      ...prev,
      variationGroups: [...(prev.variationGroups || []), newGroup]
    }));
  };

  const updateGroup = (groupId: string, updates: any) => {
    setForm(prev => {
      const groups = prev.variationGroups || [];
      const updated = groups.map(g => g.id === groupId ? { ...g, ...updates } : g);
      return { ...prev, variationGroups: updated };
    });
  };

  const deleteGroup = (groupId: string) => {
    setForm(prev => ({
      ...prev,
      variationGroups: (prev.variationGroups || []).filter(g => g.id !== groupId)
    }));
  };

  const addOption = (groupId: string) => {
    const newOption = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: 'Nova Opção',
      priceModifier: 0,
      disablesOptions: [] as string[],
      isDiscountExempt: false,
      imageUrl: ''
    };
    setForm(prev => {
      const groups = prev.variationGroups || [];
      const updated = groups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: [...(g.options || []), newOption]
          };
        }
        return g;
      });
      return { ...prev, variationGroups: updated };
    });
  };

  const updateOption = (groupId: string, optionId: string, updates: any) => {
    setForm(prev => {
      const groups = prev.variationGroups || [];
      const updated = groups.map(g => {
        if (g.id === groupId) {
          const updatedOptions = (g.options || []).map((o: any) => 
            o.id === optionId ? { ...o, ...updates } : o
          );
          return { ...g, options: updatedOptions };
        }
        return g;
      });
      return { ...prev, variationGroups: updated };
    });
  };

  const deleteOption = (groupId: string, optionId: string) => {
    setForm(prev => {
      const groups = prev.variationGroups || [];
      const updated = groups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: (g.options || []).filter((o: any) => o.id !== optionId)
          };
        }
        return g;
      });
      return { ...prev, variationGroups: updated };
    });
  };

  const handleOptionImageUpload = async (groupId: string, optionId: string, file: File) => {
    try {
      const compressed = await smartCompress(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        updateOption(groupId, optionId, { imageUrl: base64 });
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar foto da variação.');
    }
  };

  const cycleSelectionType = (current: 'SINGLE' | 'MULTIPLE' | 'TEXT') => {
    if (current === 'SINGLE') return 'MULTIPLE';
    if (current === 'MULTIPLE') return 'TEXT';
    return 'SINGLE';
  };

  const getSelectionTypeLabel = (type: 'SINGLE' | 'MULTIPLE' | 'TEXT') => {
    if (type === 'SINGLE') return 'Seleção Única';
    if (type === 'MULTIPLE') return 'Seleção Múltipla';
    return 'Campo de Texto Livre';
  };

  const handleAddComboItem = () => {
    if (!comboProdId) {
      alert('Selecione um produto para o Combo');
      return;
    }
    const prod = inventoryItems.find(i => i.id === comboProdId);
    if (!prod) return;

    const newComboItem = {
      productId: prod.id,
      name: prod.name,
      quantity: Number(comboQty || 1)
    };

    setForm(prev => {
      const exists = (prev.comboItems || []).find(c => c.productId === prod.id);
      if (exists) {
        return {
          ...prev,
          comboItems: (prev.comboItems || []).map(c => 
            c.productId === prod.id ? { ...c, quantity: c.quantity + newComboItem.quantity } : c
          )
        };
      }
      return {
        ...prev,
        comboItems: [...(prev.comboItems || []), newComboItem]
      };
    });
    setComboProdId('');
    setComboQty(1);
  };

  const handleRemoveComboItem = (prodId: string) => {
    setForm(prev => ({
      ...prev,
      comboItems: (prev.comboItems || []).filter(c => c.productId !== prodId)
    }));
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      alert('Por favor informe o nome do produto.');
      return;
    }
    
    const payload = {
      name: form.name,
      code: form.code || '',
      description: form.description || '',
      type: (form.type || 'MATERIAL') as InventoryItemType,
      categoryId: form.categoryId || '',
      category: form.categoryId ? (inventoryCategories.find(c => c.id === form.categoryId)?.name || 'Outros') : '',
      currentStock: Number(form.currentStock || 0),
      minStock: Number(form.minStock || 0),
      costPrice: Number(form.costPrice || 0),
      sellPrice: Number(form.sellPrice || 0),
      isVisibleInStore: form.isVisibleInStore !== false,
      imageUrl: form.imageUrl || '',
      imageUrls: form.imageUrls || [],
      variations: form.variations || [],
      variationGroups: form.isCombo ? [] : (form.variationGroups || []),
      isCombo: !!form.isCombo,
      comboItems: form.isCombo ? (form.comboItems || []) : [],
      targetAudience: form.targetAudience || 'BOTH'
    };

    try {
      if (editingItemId) {
        await updateInventoryItem(editingItemId, payload);
        alert('Produto atualizado com sucesso!');
      } else {
        await addInventoryItem(payload as any);
        alert('Produto cadastrado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteInventoryItem(id);
        alert('Produto removido com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir produto.');
      }
    }
  };

  const handleShareStore = () => {
    if (!currentUser?.organizationId) return;
    const shareUrl = `http://labprox.com.br/#/store-suppliers?supplierId=${currentUser.organizationId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link da loja copiado para a área de transferência!');
  };

  const handleShareProduct = (productId: string) => {
    if (!currentUser?.organizationId) return;
    const shareUrl = `http://labprox.com.br/#/store-suppliers?supplierId=${currentUser.organizationId}&productId=${productId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Link do produto copiado para a área de transferência!');
  };

  return (
    <main id="supplier-products" className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadastro de Produtos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Efetue o controle e exponha fotos adicionais, variações inteligentes ou crie combos.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleShareStore}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold p-3 px-5 rounded-xl transition-all shadow-lg flex items-center gap-2 self-start"
          >
            <ClipboardCheck size={18} /> Copiar Link da Loja
          </button>
          
          <button
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 px-5 rounded-xl transition-all shadow-lg shadow-indigo-950/40 flex items-center gap-2 self-start"
          >
            <Plus size={18} /> Novo Produto
          </button>
          
          <button
            onClick={openComboModal}
            className="bg-purple-650 bg-purple-600 hover:bg-purple-500 text-white font-bold p-3 px-5 rounded-xl transition-all shadow-lg shadow-purple-950/40 flex items-center gap-2 self-start"
          >
            <Layers size={18} /> Novo Combo
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por nome, código ou descrição..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-650"
          />
        </div>

        {/* Filter Type Options */}
        <div className="flex bg-slate-955 bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ALL' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos os Itens
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PRODUCTS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'PRODUCTS' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Apenas Produtos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('COMBOS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'COMBOS' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Apenas Combos
          </button>
        </div>
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <Package className="w-12 h-12 mx-auto stroke-1" />
            <p className="text-sm">Nenhum produto cadastrado até o momento.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-indigo-500/50 transition-all">
              {/* Product Preview Header */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-850"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-600">
                        <Package size={20} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-slate-500 text-[10px] font-mono">{item.code || 'S/ CÓDIGO'}</span>
                        {item.isCombo && (
                          <span className="bg-purple-500/15 text-purple-400 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <Layers size={8} /> Combo
                          </span>
                        )}
                        {item.variations && item.variations.length > 0 && (
                          <span className="bg-orange-500/15 text-orange-400 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <Sparkles size={8} /> {item.variations.length} Opções
                          </span>
                        )}
                        {item.variationGroups && item.variationGroups.length > 0 && (
                          <span className="bg-orange-500/15 text-orange-400 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <Plus size={8} /> {item.variationGroups.length} Atributos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    item.isVisibleInStore 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.isVisibleInStore ? <Eye size={10} /> : <EyeOff size={10} />}
                    {item.isVisibleInStore ? 'Exposto' : 'Oculto'}
                  </span>
                </div>

                <p className="text-slate-400 text-xs line-clamp-2 h-8">
                  {item.description || 'Nenhuma descrição informada para este produto.'}
                </p>

                {/* Sub components inside combo */}
                {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
                  <div className="bg-slate-950/70 border border-slate-850 p-2.5 rounded-xl space-y-1.5">
                    <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">Produtos inclusos no Combo:</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {item.comboItems.map((c, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] text-slate-300 font-mono">
                          <span className="truncate max-w-[80%]">• {c.name}</span>
                          <span className="text-indigo-400 font-bold">x {c.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock tracker */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-center">
                    <p className="text-[10px] text-slate-500 font-mono uppercase">EM ESTOQUE</p>
                    <p className={`text-md font-bold font-mono mt-1 ${
                      item.currentStock <= item.minStock ? 'text-red-400' : 'text-slate-250'
                    }`}>
                      {item.currentStock} un
                    </p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-center">
                    <p className="text-[10px] text-slate-500 font-mono uppercase">PREÇO VENDA</p>
                    <p className="text-md font-bold font-mono mt-1 text-teal-400">
                      R$ {item.sellPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-950/45 border-t border-slate-850 flex items-center justify-end gap-2">
                <button
                  onClick={() => openModal(item)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg transition-all"
                  title="Editar Produto"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                  title="remover Produto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Package className="text-indigo-400" />
                {editingItemId ? 'Editar Produto / Combo' : 'Cadastrar Novo Produto / Combo'}
              </h3>
              <div className="flex items-center gap-3">
                {editingItemId && (
                  <button
                    type="button"
                    onClick={() => handleShareProduct(editingItemId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <ClipboardCheck size={14} /> Copiar Link
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={saveItem} className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SECTION A: BASE PRODUCT REGISTRATION */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-400 pb-1 border-b border-slate-800">1. Informações Básicas</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Produto ou Combo</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ex: Resina Restauradora Z350 ou Combo Insumos Ortodônticos"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código / SKU</label>
                      <input
                        type="text"
                        value={form.code}
                        onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        placeholder="Ex: RES-001"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase">Foto Principal URL</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            id="prod-main-image-upload"
                            className="hidden"
                            onChange={handleMainImageUpload}
                          />
                          <label
                            htmlFor="prod-main-image-upload"
                            className="cursor-pointer text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-0.5"
                          >
                            <Sparkles size={10} className="text-orange-400" /> Upload
                          </label>
                        </div>
                      </div>
                      <input
                        type="url"
                        value={form.imageUrl}
                        onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Ex: https://link.com/imagem.jpg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Público Alvo</label>
                    <select
                      value={form.targetAudience || 'BOTH'}
                      onChange={e => setForm(prev => ({ ...prev, targetAudience: e.target.value as 'DENTIST' | 'LAB' | 'BOTH' }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="DENTIST">Dentistas</option>
                      <option value="LAB">Laboratório de Prótese</option>
                      <option value="BOTH">Ambos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição Comercial</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-355 text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 h-16 resize-none"
                      placeholder="Mais detalhes sobre o produto..."
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Categoria de Insumo</label>
                      <button
                        type="button"
                        onClick={handleAddNewCategoryInline}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        + Nova Categoria
                      </button>
                    </div>
                    <select
                      value={form.categoryId || ''}
                      onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Selecione uma categoria...</option>
                      {inventoryCategories && inventoryCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Estoque Total</label>
                      <input
                        type="number"
                        min={0}
                        value={form.currentStock}
                        onChange={e => setForm(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Alerta Mínimo</label>
                      <input
                        type="number"
                        min={0}
                        value={form.minStock}
                        onChange={e => setForm(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço Custo (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.costPrice}
                        onChange={e => setForm(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço Venda (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.sellPrice}
                        onChange={e => setForm(prev => ({ ...prev, sellPrice: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border border-slate-850 p-3 bg-slate-950/40 rounded-xl">
                    <div className="flex items-center gap-2">
                      <input
                        id="isVisibleInStore"
                        type="checkbox"
                        checked={form.isVisibleInStore !== false}
                        onChange={e => setForm(prev => ({ ...prev, isVisibleInStore: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="isVisibleInStore" className="text-xs font-bold text-slate-300 cursor-pointer leading-tight">
                        Expor este item na vitrine online
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="isCombo"
                        type="checkbox"
                        checked={form.isCombo === true}
                        onChange={e => setForm(prev => ({ ...prev, isCombo: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="isCombo" className="text-xs font-bold text-purple-400 cursor-pointer leading-tight">
                        Este produto é um Combo de múltiplos produtos
                      </label>
                    </div>
                  </div>

                </div>

                {/* SECTION B: MULTIPLE PHOTOS & SETUPS (RIGHT COLUMN) */}
                <div className="space-y-6">
                  
                  {/* MULTIPLE PHOTOS LIST */}
                  <div className="space-y-3.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-400 pb-1 border-b border-slate-800">2. Galeria de Fotos Adicionais</h4>
                    
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Ex: https://dominio.com/foto2.jpg"
                        value={tempImageUrl}
                        onChange={e => setTempImageUrl(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        id="prod-gallery-image-upload"
                        className="hidden"
                        onChange={handleAdditionalImageUpload}
                      />
                      <label
                        htmlFor="prod-gallery-image-upload"
                        className="cursor-pointer px-3 bg-slate-800 hover:bg-slate-750 border border-slate-800 text-slate-300 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sparkles size={11} className="text-orange-400" /> Upload
                      </label>
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-555 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                      >
                        Inserir URL
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {form.imageUrls && form.imageUrls.map((url, idx) => (
                        <div key={idx} className="relative w-14 h-14 bg-slate-950 rounded-lg overflow-hidden border border-slate-850 group">
                          <img src={url} alt={`Imagem ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImageUrl(idx)}
                            className="absolute inset-0 bg-red-650/80 bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {(!form.imageUrls || form.imageUrls.length === 0) && (
                        <p className="text-[10px] text-slate-500 italic">Nenhuma foto secundária para exibição.</p>
                      )}
                    </div>
                  </div>

                  {/* COMBO SYSTEM REGISTRATION */}
                  {form.isCombo && (
                    <div className="bg-purple-950/20 border-2 border-purple-900/30 p-4 rounded-2xl space-y-3.5 animate-in slide-in-from-right duration-350">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-purple-400">3. Composição de Itens do Combo</h4>
                      
                      <div className="flex gap-2 items-center">
                        <select
                          value={comboProdId}
                          onChange={e => setComboProdId(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Selecione um Produto...</option>
                          {inventoryItems.filter(i => i.id !== editingItemId && !i.isCombo).map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={comboQty}
                          onChange={e => setComboQty(Number(e.target.value))}
                          className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 text-center"
                        />
                        <button
                          type="button"
                          onClick={handleAddComboItem}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-550 text-white font-bold rounded-xl text-xs"
                        >
                          Unir
                        </button>
                      </div>

                      <div className="divide-y divide-slate-850">
                        {form.comboItems && form.comboItems.map((c, idx) => (
                          <div key={idx} className="py-2.5 flex justify-between items-center text-xs font-mono">
                            <span className="truncate max-w-[70%] text-slate-300">{c.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400 font-bold">x {c.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveComboItem(c.productId)}
                                className="text-slate-500 hover:text-red-400"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!form.comboItems || form.comboItems.length === 0) && (
                          <p className="text-[10px] text-slate-500 italic py-2">Componha adicionando itens acima.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DYNAMIC VARIATION GROUPS (Matched with Prosthesis/Lab System) */}
                  {!form.isCombo && (
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-orange-400">3. Grupos de Atributos e Variações</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Crie grupos (ex: "Tamanho", "Cor") com opções e regras de desabilitação inteligente.</p>
                        </div>
                        <button
                          type="button"
                          onClick={addGroup}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all"
                        >
                          <Plus size={14} /> Novo Grupo
                        </button>
                      </div>

                      {(!form.variationGroups || form.variationGroups.length === 0) ? (
                        <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                          Nenhum grupo de variação cadastrado. Clique em "Novo Grupo" para começar.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(form.variationGroups || []).map(group => (
                            <div key={group.id} className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-4">
                              {/* Group Header */}
                              <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                                <div className="flex items-center gap-2 flex-1 max-w-[65%]">
                                  <Folder size={16} className="text-orange-400" />
                                  <input
                                    value={group.name}
                                    onChange={e => updateGroup(group.id, { name: e.target.value })}
                                    className="font-bold text-xs text-slate-200 bg-transparent hover:bg-slate-900 focus:bg-slate-950 border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 outline-none w-full"
                                    placeholder="Ex: Cor ou Tamanho"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateGroup(group.id, { selectionType: cycleSelectionType(group.selectionType) })}
                                    className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded hover:bg-slate-800"
                                    title="Mudar tipo de seleção"
                                  >
                                    {group.selectionType === 'SINGLE' && <ToggleLeft size={13} />}
                                    {group.selectionType === 'MULTIPLE' && <ToggleRight size={13} />}
                                    {group.selectionType === 'TEXT' && <Type size={13} />}
                                    <span>{getSelectionTypeLabel(group.selectionType)}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteGroup(group.id)}
                                    className="text-slate-500 hover:text-red-400 p-1"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Options Box */}
                              <div className="space-y-3">
                                {(group.options || []).map(option => (
                                  <div key={option.id} className="bg-slate-950 p-3 rounded-lg border border-slate-900 space-y-3">
                                    <div className="grid grid-cols-12 gap-2.5 items-end">
                                      <div className="col-span-12 sm:col-span-5">
                                        <label className="text-[9px] text-slate-500 font-bold block mb-1">
                                          {group.selectionType === 'TEXT' ? 'Rótulo do Campo (ex: Cor)' : 'Nome da Opção'}
                                        </label>
                                        <input
                                          value={option.name}
                                          onChange={e => updateOption(group.id, option.id, { name: e.target.value })}
                                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                                          placeholder={group.selectionType === 'TEXT' ? "Ex: Especifique a cor" : "Ex: A2 ou C15"}
                                        />
                                      </div>
                                      <div className="col-span-6 sm:col-span-3">
                                        <label className="text-[9px] text-slate-500 font-bold block mb-1">Preço Adicional (R$)</label>
                                        <div className="relative">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">R$</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={option.priceModifier}
                                            onChange={e => updateOption(group.id, option.id, { priceModifier: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 text-right pr-2.5 pl-7"
                                          />
                                        </div>
                                      </div>
                                      <div className="col-span-6 sm:col-span-3 flex flex-col items-center">
                                        <label className="text-[9px] text-slate-500 font-bold block mb-1">Isento de Desconto</label>
                                        <button
                                          type="button"
                                          onClick={() => updateOption(group.id, option.id, { isDiscountExempt: !option.isDiscountExempt })}
                                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all flex items-center justify-center gap-1 w-full ${
                                            option.isDiscountExempt 
                                              ? 'bg-orange-950/50 border-orange-850 text-orange-400' 
                                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                                          }`}
                                          title={option.isDiscountExempt ? 'Valor fixo (não aceita descontos)' : 'Valor descontável'}
                                        >
                                          <PercentCircle size={14} />
                                          <span className="text-[9px] font-bold">{option.isDiscountExempt ? 'Ativo' : 'Inativo'}</span>
                                        </button>
                                      </div>
                                      <div className="col-span-12 sm:col-span-1 flex justify-end pb-1.5">
                                        <button
                                          type="button"
                                          onClick={() => deleteOption(group.id, option.id)}
                                          className="text-slate-500 hover:text-red-400 p-1"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* PHOTO FOR VARIATION */}
                                    <div className="pt-2 border-t border-slate-900 flex flex-col sm:flex-row gap-2 items-center">
                                      <div className="flex-1 w-full">
                                        <label className="text-[9px] text-slate-500 font-bold block mb-1">Foto da Variação (URL ou Upload)</label>
                                        <div className="flex gap-1.5 items-center">
                                          <input
                                            type="url"
                                            placeholder="URL da Imagem para esta variação"
                                            value={option.imageUrl || ''}
                                            onChange={e => updateOption(group.id, option.id, { imageUrl: e.target.value })}
                                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650"
                                          />
                                          <input
                                            type="file"
                                            accept="image/*"
                                            id={`file-upload-${group.id}-${option.id}`}
                                            className="hidden"
                                            onChange={e => {
                                              const file = e.target.files?.[0];
                                              if (file) handleOptionImageUpload(group.id, option.id, file);
                                            }}
                                          />
                                          <label
                                            htmlFor={`file-upload-${group.id}-${option.id}`}
                                            className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5 whitespace-nowrap"
                                          >
                                            <Sparkles size={11} className="text-orange-400" /> Upload
                                          </label>
                                        </div>
                                      </div>
                                      {option.imageUrl && (
                                        <div className="relative shrink-0 w-11 h-11 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden group hover:border-slate-700">
                                          <img
                                            src={option.imageUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => updateOption(group.id, option.id, { imageUrl: '' })}
                                            className="absolute top-0 right-0 bg-red-600/80 hover:bg-red-600 text-white rounded-bl p-0.5"
                                          >
                                            <X size={8} />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* CONDITIONAL DISABLING CONSTRAINTS */}
                                    <div className="pt-2 pl-1">
                                      <label className="text-[9px] text-slate-500 font-bold block mb-1 flex items-center gap-1">
                                        <AlertCircle size={10} className="text-orange-400" />
                                        Se esta opção for escolhida, DESABILITAR as seguintes opções:
                                      </label>
                                      <div className="w-full border border-slate-900 rounded bg-slate-950 max-h-24 overflow-y-auto p-2 scrollbar-thin">
                                        {form.variationGroups && form.variationGroups.filter((g: any) => g.id !== group.id).length === 0 && (
                                          <p className="text-[9px] text-slate-600 italic p-1">Adicione outros grupos de atributos para configurar dependências de desabilitação.</p>
                                        )}
                                        {form.variationGroups && form.variationGroups.filter((g: any) => g.id !== group.id).map((otherGroup: any) => (
                                          <div key={otherGroup.id} className="mb-2">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{otherGroup.name}</p>
                                            <div className="flex flex-wrap gap-1.5 pl-1">
                                              {(otherGroup.options || []).map((otherOption: any) => {
                                                const isChecked = (option.disablesOptions || []).includes(otherOption.id);
                                                return (
                                                  <label key={otherOption.id} className="flex items-center gap-1.5 cursor-pointer bg-slate-900 hover:bg-slate-850 rounded px-2 py-1 text-[10px] text-slate-300">
                                                    <input
                                                      type="checkbox"
                                                      checked={isChecked}
                                                      onChange={() => {
                                                        const current = option.disablesOptions || [];
                                                        const newList = isChecked
                                                          ? current.filter((id: string) => id !== otherOption.id)
                                                          : [...current, otherOption.id];
                                                        updateOption(group.id, option.id, { disablesOptions: newList });
                                                      }}
                                                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3 h-3 bg-slate-950"
                                                    />
                                                    <span>{otherOption.name}</span>
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

                                <button
                                  type="button"
                                  onClick={() => addOption(group.id)}
                                  className="w-full text-[11px] text-center py-2 bg-slate-900 text-slate-300 hover:bg-slate-850 hover:text-white rounded-lg border border-slate-800 font-bold transition-all"
                                >
                                  + Adicionar Opção
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

              {/* SAVE & ACTION CLUMP */}
              <div className="pt-4 border-t border-slate-850 flex justify-end gap-3 bg-slate-950/20 px-6 py-4 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg text-xs"
                >
                  Salvar Informações
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </main>
  );
};
