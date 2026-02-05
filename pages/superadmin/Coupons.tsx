
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Coupon } from '../../types';
import { Plus, Trash2, Edit2, Ticket, Percent, Clock, CheckCircle, XCircle, Loader2, Save } from 'lucide-react';

export const Coupons = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon, allPlans } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<Coupon['discountType']>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [active, setActive] = useState(true);
  const [applicablePlans, setApplicablePlans] = useState<string[]>([]);

  const resetForm = () => {
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(0);
    setValidUntil('');
    setMaxUses('');
    setActive(true);
    setApplicablePlans([]);
    setIsEditing(false);
  };

  const handleEdit = (c: Coupon) => {
    setIsEditing(true);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setValidUntil(c.validUntil ? new Date(c.validUntil).toISOString().split('T')[0] : '');
    setMaxUses(c.maxUses || '');
    setActive(c.active);
    setApplicablePlans(c.applicablePlans || []);
  };

  const togglePlan = (planId: string) => {
      setApplicablePlans(prev => 
          prev.includes(planId) ? prev.filter(id => id !== planId) : [...prev, planId]
      );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    setIsSaving(true);

    try {
        let expirationDate: Date | null = null;
        if (validUntil) {
            expirationDate = new Date(validUntil);
            expirationDate.setHours(23, 59, 59, 999);
        }

        // Criar objeto base e remover campos opcionais se vazios
        const couponData: any = {
            id: code.toUpperCase().trim(),
            code: code.toUpperCase().trim(),
            discountType,
            discountValue: Number(discountValue),
            usedCount: isEditing ? (coupons.find(c => c.code === code.toUpperCase())?.usedCount || 0) : 0,
            active: Boolean(active)
        };

        // Adicionar campos opcionais apenas se tiverem valor (Firebase não aceita undefined)
        if (expirationDate) couponData.validUntil = expirationDate;
        if (maxUses !== '' && maxUses !== null) couponData.maxUses = Number(maxUses);
        if (applicablePlans.length > 0) couponData.applicablePlans = applicablePlans;

        if (isEditing) {
            await updateCoupon(couponData.code, couponData);
        } else {
            // Verificar se já existe
            if (coupons.some(c => c.code === couponData.code)) {
                alert("Já existe um cupom com este código.");
                setIsSaving(false);
                return;
            }
            await addCoupon(couponData);
        }
        
        alert(isEditing ? "Cupom atualizado!" : "Cupom criado com sucesso!");
        resetForm();
    } catch (err: any) {
        console.error("Erro ao salvar cupom:", err);
        alert("Falha ao salvar cupom: " + (err.message || "Erro desconhecido"));
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão de Cupons</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Cupons Ativos no Sistema
                    </div>
                    <div className="divide-y divide-slate-100">
                        {coupons.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">Nenhum cupom cadastrado.</div>
                        ) : (
                            coupons.map(coupon => (
                                <div key={coupon.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs shadow-sm">
                                            {coupon.discountType === 'PERCENTAGE' ? '%' : 'R$'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono font-black text-lg text-slate-800 tracking-tighter">{coupon.code}</span>
                                                {coupon.active ? (
                                                    <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Ativo</span>
                                                ) : (
                                                    <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Inativo</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 font-bold uppercase tracking-tight">
                                                <span className="flex items-center gap-1 text-blue-600">
                                                    <Ticket size={12}/> 
                                                    {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : 
                                                     coupon.discountType === 'FIXED' ? `R$ ${coupon.discountValue} OFF` : 
                                                     coupon.discountType === 'TRIAL_EXT' ? `+${coupon.discountValue} Dias Trial` : 'VIP'}
                                                </span>
                                                {coupon.validUntil && (
                                                    <span className="flex items-center gap-1 text-orange-600">
                                                        <Clock size={12}/> Expira {new Date(coupon.validUntil).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <span className="text-slate-400">Usos: {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                         <button onClick={() => handleEdit(coupon)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18}/></button>
                                         <button onClick={() => { if(window.confirm('Excluir este cupom?')) deleteCoupon(coupon.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 h-fit sticky top-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        {isEditing ? <Edit2 size={20}/> : <Plus size={20}/>}
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Código Promocional</label>
                        <input 
                            value={code} 
                            onChange={e => setCode(e.target.value)} 
                            disabled={isEditing} 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" 
                            placeholder="EX: BLACKFRIDAY50"
                            required 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Desconto</label>
                            <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none">
                                <option value="PERCENTAGE">Porcentagem (%)</option>
                                <option value="FIXED">Valor Fixo (R$)</option>
                                <option value="TRIAL_EXT">Dias de Teste (+)</option>
                                <option value="FREE_FOREVER">Gratuito (VIP)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor do Benefício</label>
                            <input 
                                type="number" 
                                value={discountValue} 
                                onChange={e => setDiscountValue(Number(e.target.value))} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" 
                                required 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Expira em (Opcional)</label>
                            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Limite Usos (Opcional)</label>
                            <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" placeholder="Sem limite" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Válido para Planos</label>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl no-scrollbar">
                            {allPlans.map(plan => (
                                <label key={plan.id} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${applicablePlans.includes(plan.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}>
                                        {applicablePlans.includes(plan.id) && <CheckCircle size={14} className="text-white"/>}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden"
                                        checked={applicablePlans.includes(plan.id)}
                                        onChange={() => togglePlan(plan.id)}
                                    />
                                    <span className="text-xs font-bold text-slate-600 uppercase">{plan.name}</span>
                                </label>
                            ))}
                            {allPlans.length === 0 && <p className="text-[10px] text-slate-400 italic">Nenhum plano cadastrado.</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 py-2">
                        <button 
                            type="button" 
                            onClick={() => setActive(!active)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Cupom Ativo no Checkout</span>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        {isEditing && <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>}
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                            {isEditing ? 'ATUALIZAR CUPOM' : 'CRIAR CUPOM'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};
