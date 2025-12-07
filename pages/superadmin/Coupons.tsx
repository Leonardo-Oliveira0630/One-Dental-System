import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Coupon } from '../../types';
import { Plus, Trash2, Edit2, Ticket, Percent, Clock, CheckCircle, XCircle } from 'lucide-react';

export const Coupons = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon, allPlans } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<Coupon['discountType']>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(0);
    setValidUntil('');
    setMaxUses('');
    setActive(true);
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
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const couponData: Coupon = {
        id: code.toUpperCase(),
        code: code.toUpperCase(),
        discountType,
        discountValue,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        maxUses: maxUses === '' ? undefined : Number(maxUses),
        usedCount: 0, // Reset on new, keep on edit? Ideally merge
        active,
        applicablePlans: [] // All for now
    };

    try {
        if (isEditing) {
            // Update logic (preserve usedCount)
            await updateCoupon(code, { ...couponData, usedCount: coupons.find(c => c.code === code)?.usedCount || 0 });
        } else {
            await addCoupon(couponData);
        }
        resetForm();
    } catch (err) {
        alert("Erro ao salvar cupom.");
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Cupons</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List */}
            <div className="lg:col-span-2 space-y-4">
                {coupons.map(coupon => (
                    <div key={coupon.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-lg text-blue-600 bg-blue-50 px-2 rounded">{coupon.code}</span>
                                {coupon.active ? <CheckCircle size={14} className="text-green-500"/> : <XCircle size={14} className="text-red-500"/>}
                            </div>
                            <div className="text-sm text-slate-500 flex gap-4">
                                <span className="flex items-center gap-1"><Ticket size={14}/> {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : coupon.discountType === 'FIXED' ? `R$ ${coupon.discountValue} OFF` : `${coupon.discountValue} Dias Grátis`}</span>
                                {coupon.validUntil && <span className="flex items-center gap-1"><Clock size={14}/> Até {new Date(coupon.validUntil).toLocaleDateString()}</span>}
                                <span>Usos: {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => handleEdit(coupon)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg"><Edit2 size={18}/></button>
                             <button onClick={() => deleteCoupon(coupon.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Form */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 h-fit sticky top-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{isEditing ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código</label>
                        <input value={code} onChange={e => setCode(e.target.value)} disabled={isEditing} className="w-full px-3 py-2 border rounded-lg font-mono uppercase" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                            <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg bg-white">
                                <option value="PERCENTAGE">Porcentagem (%)</option>
                                <option value="FIXED">Valor Fixo (R$)</option>
                                <option value="TRIAL_EXT">Dias de Teste (+)</option>
                                <option value="FREE_FOREVER">Gratuito (VIP)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                            <input type="number" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Validade (Opcional)</label>
                        <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Limite de Usos (Opcional)</label>
                        <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} id="activeCheck" />
                        <label htmlFor="activeCheck" className="text-sm font-bold text-slate-700">Ativo</label>
                    </div>

                    <div className="flex gap-2 pt-4">
                        {isEditing && <button type="button" onClick={resetForm} className="flex-1 py-2 text-slate-500 bg-slate-100 rounded-lg">Cancelar</button>}
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">{isEditing ? 'Atualizar' : 'Criar'}</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};