import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Ticket, Check, X, Edit2, Search, CheckSquare, Square, Tag, Box } from 'lucide-react';
import { SupplierCoupon } from '../../types';
import { addDoc, collection, doc, deleteDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

export const SupplierCoupons = () => {
  const { currentUser, currentOrg, inventoryItems, productCatalogItems } = useApp();
  const [coupons, setCoupons] = useState<SupplierCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<SupplierCoupon | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(0);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  // Products list from inventory items or fallback to product catalog
  const myProducts = useMemo(() => {
    if (inventoryItems && inventoryItems.length > 0) {
      return inventoryItems;
    }
    return (productCatalogItems?.filter(p => p.organizationId === currentOrg?.id) as any[]) || [];
  }, [inventoryItems, productCatalogItems, currentOrg?.id]);

  // Filtered products for modal selection
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return myProducts;
    const term = productSearch.toLowerCase();
    return myProducts.filter((p: any) => 
      p.name?.toLowerCase().includes(term) || 
      p.code?.toLowerCase().includes(term)
    );
  }, [myProducts, productSearch]);

  const fetchCoupons = async () => {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'supplierCoupons'), where('organizationId', '==', currentOrg.id));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupplierCoupon));
      setCoupons(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg) {
      fetchCoupons();
    }
  }, [currentOrg]);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(0);
    setMaxUses('');
    setApplicableProductIds([]);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: SupplierCoupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code || '');
    setDiscountType(coupon.discountType || 'PERCENTAGE');
    setDiscountValue(coupon.discountValue || 0);
    setMaxUses(coupon.maxUses ?? '');
    setApplicableProductIds(coupon.applicableProductIds || []);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    
    try {
      setSaving(true);
      
      const couponData = {
        organizationId: currentOrg.id,
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        maxUses: maxUses === '' ? null : Number(maxUses),
        active: editingCoupon ? editingCoupon.active : true,
        applicableProductIds: applicableProductIds.length > 0 ? applicableProductIds : null
      };

      if (editingCoupon) {
        await updateDoc(doc(db, 'supplierCoupons', editingCoupon.id), couponData);
      } else {
        await addDoc(collection(db, 'supplierCoupons'), {
          ...couponData,
          usedCount: 0
        });
      }
      
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cupom');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: SupplierCoupon) => {
    try {
      await updateDoc(doc(db, 'supplierCoupons', coupon.id), { active: !coupon.active });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cupom?')) return;
    try {
      await deleteDoc(doc(db, 'supplierCoupons', id));
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAllProducts = () => {
    setApplicableProductIds(myProducts.map((p: any) => p.id));
  };

  const handleClearSelectedProducts = () => {
    setApplicableProductIds([]);
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-50 text-slate-900 min-h-screen overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Meus Cupons</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e gerencie cupons de desconto para sua loja e produtos específicos</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus size={18} /> Novo Cupom
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-slate-500 col-span-full">Carregando cupons...</p>
        ) : coupons.length === 0 ? (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <Ticket className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">Nenhum cupom criado</h3>
            <p className="text-slate-500 mt-1">Crie seu primeiro cupom de desconto para atrair clientes.</p>
          </div>
        ) : (
          coupons.map(coupon => {
            const applicableProducts = (coupon.applicableProductIds || [])
              .map(id => myProducts.find((p: any) => p.id === id))
              .filter(Boolean);

            return (
              <div key={coupon.id} className="bg-white border border-slate-200 rounded-2xl p-6 relative group shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-lg font-bold text-slate-800 tracking-wider">{coupon.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {coupon.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-3xl font-extrabold text-slate-900">
                      {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue.toFixed(2)}`}
                      <span className="text-sm font-normal text-slate-500 ml-1.5">desconto</span>
                    </p>
                    <p className="text-xs font-medium text-slate-500">Usos: <span className="text-slate-800 font-semibold">{coupon.usedCount}</span> {coupon.maxUses ? `/ ${coupon.maxUses}` : '(Ilimitado)'}</p>
                    
                    {/* Applicable products tags */}
                    <div className="pt-2">
                      {coupon.applicableProductIds && coupon.applicableProductIds.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                            <Tag size={12} />
                            Válido para {coupon.applicableProductIds.length} produto(s)
                          </span>
                          {applicableProducts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                              {applicableProducts.map((p: any) => (
                                <span key={p.id} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                          <Box size={12} />
                          Válido para toda a loja
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => handleOpenEditModal(coupon)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar Cupom"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteCoupon(coupon.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Cupom"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingCoupon ? 'Editar Cupom' : 'Novo Cupom de Desconto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Código do Cupom *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="EX: VERAO20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Desconto *</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  >
                    <option value="PERCENTAGE">Porcentagem (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Valor *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Limite de Usos (Opcional)</label>
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Deixe em branco para ilimitado"
                />
              </div>

              {/* Product Selection Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">Produtos Específicos (Opcional)</label>
                    <p className="text-xs text-slate-500">
                      {applicableProductIds.length === 0 
                        ? 'Nenhum selecionado: o cupom será válido para TODOS os produtos.' 
                        : `${applicableProductIds.length} produto(s) selecionado(s).`}
                    </p>
                  </div>
                  {myProducts.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllProducts}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Selecionar Todos
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearSelectedProducts}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>

                {/* Product Search */}
                {myProducts.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Buscar produto por nome ou código..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {myProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 text-center">Nenhum produto cadastrado no seu catálogo/estoque.</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 text-center">Nenhum produto encontrado com "{productSearch}".</p>
                  ) : (
                    filteredProducts.map((product: any) => {
                      const isSelected = applicableProductIds.includes(product.id);
                      const priceDisplay = product.sellPrice ? `R$ ${Number(product.sellPrice).toFixed(2)}` : '';
                      const img = product.imageUrl || (product.imageUrls && product.imageUrls[0]);

                      return (
                        <label
                          key={product.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/80 border border-indigo-200' : 'hover:bg-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setApplicableProductIds([...applicableProductIds, product.id]);
                                } else {
                                  setApplicableProductIds(applicableProductIds.filter(id => id !== product.id));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {img && (
                              <img src={img} alt="" className="w-7 h-7 object-cover rounded-md border border-slate-200 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{product.name}</p>
                              {product.code && <p className="text-[10px] text-slate-400 font-mono">{product.code}</p>}
                            </div>
                          </div>
                          {priceDisplay && (
                            <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{priceDisplay}</span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? 'Salvando...' : editingCoupon ? 'Atualizar Cupom' : 'Salvar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
