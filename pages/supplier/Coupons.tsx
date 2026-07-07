import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Ticket, Check, X } from 'lucide-react';
import { SupplierCoupon } from '../../types';
import { addDoc, collection, doc, deleteDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

export const SupplierCoupons = () => {
  const { currentUser, currentOrg, productCatalogItems } = useApp();
  const [coupons, setCoupons] = useState<SupplierCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(0);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>([]);
  
  // Products filter
  const myProducts = productCatalogItems?.filter(p => p.organizationId === currentOrg?.id) || [];

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    
    try {
      setSaving(true);
      
      const newCoupon = {
        organizationId: currentOrg.id,
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUses: maxUses === '' ? null : Number(maxUses),
        usedCount: 0,
        active: true,
        applicableProductIds: applicableProductIds.length > 0 ? applicableProductIds : null
      };

      await addDoc(collection(db, 'supplierCoupons'), newCoupon);
      
      setIsModalOpen(false);
      setCode('');
      setDiscountValue(0);
      setMaxUses('');
      setApplicableProductIds([]);
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

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-50 text-slate-900 min-h-screen overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Cupons</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e gerencie cupons de desconto para sua loja</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={18} /> Novo Cupom
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-slate-500">Carregando cupons...</p>
        ) : coupons.length === 0 ? (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <Ticket className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">Nenhum cupom criado</h3>
            <p className="text-slate-500 mt-1">Crie seu primeiro cupom de desconto para atrair clientes.</p>
          </div>
        ) : (
          coupons.map(coupon => (
            <div key={coupon.id} className="bg-white border border-slate-200 rounded-2xl p-6 relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-indigo-600" />
                  <span className="font-mono text-lg font-bold text-slate-800">{coupon.code}</span>
                </div>
                <button
                  onClick={() => toggleActive(coupon)}
                  className={`px-2 py-1 text-xs font-medium rounded-md \${coupon.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                >
                  {coupon.active ? 'Ativo' : 'Inativo'}
                </button>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-3xl font-bold text-slate-900">
                  {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue.toFixed(2)}`}
                  <span className="text-sm font-normal text-slate-500 ml-1">desconto</span>
                </p>
                <p className="text-sm text-slate-500">Usos: {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : '(Ilimitado)'}</p>
                {coupon.applicableProductIds && coupon.applicableProductIds.length > 0 && (
                  <p className="text-xs text-indigo-600 bg-indigo-400/10 px-2 py-1 rounded inline-block">
                    Válido para {coupon.applicableProductIds.length} produto(s)
                  </p>
                )}
              </div>

              <button
                onClick={() => deleteCoupon(coupon.id)}
                className="absolute top-4 right-4 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold">Novo Cupom</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código do Cupom</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 uppercase"
                  placeholder="EX: VERAO20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900"
                  >
                    <option value="PERCENTAGE">Porcentagem (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Usos (Opcional)</label>
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900"
                  placeholder="Ex: 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Produtos Específicos (Opcional)</label>
                <p className="text-xs text-slate-500 mb-2">Se não selecionar nenhum, o cupom será válido para toda a loja.</p>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {myProducts.map(product => (
                    <label key={product.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applicableProductIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setApplicableProductIds([...applicableProductIds, product.id]);
                          } else {
                            setApplicableProductIds(applicableProductIds.filter(id => id !== product.id));
                          }
                        }}
                        className="rounded border-slate-300 bg-slate-100 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-white"
                      />
                      <span className="text-sm text-slate-700 truncate">{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
