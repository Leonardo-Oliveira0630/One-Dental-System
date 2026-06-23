import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryItem, InventoryItemType } from '../../types';
import { 
  Package, Plus, Trash2, Edit2, Search, X, Box, Tag, 
  Info, Check, Save, Image, Eye, EyeOff, Loader2 
} from 'lucide-react';

export const SupplierProducts = () => {
  const { 
    inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Partial<InventoryItem>>({
    name: '',
    code: '',
    description: '',
    type: 'MATERIAL',
    currentStock: 0,
    minStock: 2,
    costPrice: 0,
    sellPrice: 0,
    isVisibleInStore: true,
    imageUrl: ''
  });

  const filteredItems = (inventoryItems || []).filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItemId(item.id);
      setForm(item);
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
        imageUrl: ''
      });
    }
    setIsModalOpen(true);
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
      currentStock: Number(form.currentStock || 0),
      minStock: Number(form.minStock || 0),
      costPrice: Number(form.costPrice || 0),
      sellPrice: Number(form.sellPrice || 0),
      isVisibleInStore: form.isVisibleInStore !== false,
      imageUrl: form.imageUrl || ''
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

  return (
    <main id="supplier-products" className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadastro de Produtos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Efetue o controle de estoque de seus produtos vendidos na loja.</p>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 px-5 rounded-xl transition-all shadow-lg shadow-indigo-950/40 flex items-center gap-2 self-start"
        >
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por nome, código ou descrição..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-250 outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-600"
          />
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
                      <p className="text-slate-500 text-xs font-mono mt-0.5">{item.code || 'S/ CÓDIGO'}</p>
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
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Package className="text-indigo-400" />
                {editingItemId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Ex: Resina Restauradora Z350"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código / SKU</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                    placeholder="Ex: RES-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Imagem URL (Opcional)</label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Ex: https://link.com/imagem.jpg"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-350 outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-20 resize-none"
                    placeholder="Mais detalhes sobre o material, cor, etc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    min={0}
                    value={form.currentStock}
                    onChange={e => setForm(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minStock}
                    onChange={e => setForm(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.costPrice}
                    onChange={e => setForm(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.sellPrice}
                    onChange={e => setForm(prev => ({ ...prev, sellPrice: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  />
                </div>

                <div className="col-span-2 py-2 flex items-center gap-3">
                  <input
                    id="isVisibleInStore"
                    type="checkbox"
                    checked={form.isVisibleInStore !== false}
                    onChange={e => setForm(prev => ({ ...prev, isVisibleInStore: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-indigo-500"
                  />
                  <label htmlFor="isVisibleInStore" className="text-sm font-medium text-slate-300 cursor-pointer">
                    Expor este produto na Loja Online para compradores
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-950/40 text-sm"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
