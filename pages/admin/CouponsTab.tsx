import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Ticket, HelpCircle, Calendar, Users, Percent, DollarSign, Trash2, ShieldAlert, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { LabCoupon } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export const CouponsTab = () => {
    const { labCoupons, addLabCoupon, updateLabCoupon, deleteLabCoupon } = useApp();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form settings State
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState<number>(10);
    const [validUntil, setValidUntil] = useState('');
    const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
    const [errorMsg, setErrorMsg] = useState('');

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        
        if (!code.trim()) {
            setErrorMsg('Por favor, informe o código do cupom.');
            return;
        }

        if (discountValue <= 0) {
            setErrorMsg('O valor do desconto de ser maior que zero.');
            return;
        }

        try {
            await addLabCoupon({
                code: code.trim().toUpperCase(),
                discountType,
                discountValue,
                validUntil: validUntil || undefined,
                maxUses: maxUses || undefined,
                active: true
            });
            
            // Reset state
            setCode('');
            setDiscountType('PERCENTAGE');
            setDiscountValue(10);
            setValidUntil('');
            setMaxUses(undefined);
            setShowCreateModal(false);
        } catch (err) {
            setErrorMsg('Erro ao salvar o novo cupom.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteLabCoupon(id);
            setDeletingId(null);
        } catch (err) {
            alert('Erro ao excluir cupom.');
        }
    };

    const handleToggleActive = async (coupon: LabCoupon) => {
        try {
            await updateLabCoupon(coupon.id, { active: !coupon.active });
        } catch (err) {
            alert('Erro ao atualizar status do cupom.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                        <Ticket size={24} className="text-indigo-600" /> Cupons de Desconto
                    </h3>
                    <p className="text-slate-500 text-sm font-medium mt-1">Crie códigos promocionais exclusivos para fidelizar seus dentistas parceiros.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-150 transition-all cursor-pointer"
                >
                    <Plus size={16} /> NOVO CUPOM
                </button>
            </div>

            {/* List block */}
            {labCoupons.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 border border-slate-100/50">
                        <Ticket size={32} />
                    </div>
                    <h4 className="text-lg font-black text-slate-800 tracking-tight">Nenhum cupom ativo no momento</h4>
                    <p className="text-slate-500 font-medium text-sm max-w-sm mt-1 leading-relaxed">
                        Que tal incentivar novos pedidos criando o seu primeiro cupom? Clique no botão acima para começar!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {labCoupons.map((coupon) => (
                        <div 
                            key={coupon.id} 
                            className={`bg-white p-6 rounded-[28px] border shadow-sm transition-all relative ${coupon.active ? 'border-indigo-100 hover:border-indigo-300' : 'border-slate-200/60 opacity-75'}`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-base tracking-widest text-slate-900 bg-slate-100 border border-slate-200/50 px-3 py-1 rounded-xl">
                                            {coupon.code}
                                        </span>
                                        <button 
                                            onClick={() => handleToggleActive(coupon)}
                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                            title={coupon.active ? "Desativar cupom" : "Ativar cupom"}
                                        >
                                            {coupon.active ? (
                                                <ToggleRight size={32} className="text-indigo-600 cursor-pointer" />
                                            ) : (
                                                <ToggleLeft size={32} className="text-slate-400 cursor-pointer" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                                        Ativo para Loja Virtual
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setDeletingId(coupon.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="mt-6 pt-5 border-t border-slate-50 grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Benefício</span>
                                    <span className="font-bold text-slate-800 text-sm">
                                        {coupon.discountType === 'PERCENTAGE' ? (
                                            <span className="flex items-center gap-1"><Percent size={14} className="text-emerald-500" /> {coupon.discountValue}% OFF</span>
                                        ) : (
                                            <span className="flex items-center gap-1"><DollarSign size={14} className="text-emerald-500" /> R$ {coupon.discountValue.toFixed(2)} OFF</span>
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Usos Realizados</span>
                                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                        <Users size={14} className="text-indigo-400" /> {coupon.usedCount || 0} {coupon.maxUses ? `/ ${coupon.maxUses}` : '(sem limite)'}
                                    </span>
                                </div>
                                {coupon.validUntil && (
                                    <div className="col-span-2 pt-2">
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Validade</span>
                                        <span className="font-bold text-slate-600 text-xs flex items-center gap-1">
                                            <Calendar size={14} className="text-slate-400" /> Até {new Date(coupon.validUntil).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Popup */}
            <AnimatePresence>
                {deletingId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }} 
                            className="bg-white p-8 rounded-[32px] max-w-sm w-full shadow-2xl text-center space-y-6"
                        >
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                                <ShieldAlert size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Excluir Cupom?</h3>
                                <p className="text-slate-500 font-medium text-sm mt-1 leading-relaxed">
                                    Tem certeza que deseja excluir permanentemente este cupom promocional? Dentistas não poderão mais aplicá-lo.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleDelete(deletingId)}
                                    className="px-5 py-3.5 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all text-xs"
                                >
                                    Excluir
                                </button>
                                <button 
                                    onClick={() => setDeletingId(null)}
                                    className="px-5 py-3.5 bg-slate-100 text-slate-800 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Coupon Drawer */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                        >
                            <div className="p-6 bg-slate-900 text-white flex justify-between items-center rounded-t-[32px]">
                                <div className="flex items-center gap-2">
                                    <Ticket size={20} className="text-indigo-400" />
                                    <h3 className="font-black text-lg tracking-tight">Novo Cupom de Desconto</h3>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-colors text-xs font-bold font-mono">FECHAR</button>
                            </div>
                            
                            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
                                {errorMsg && (
                                    <p className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
                                        <AlertCircle size={14} /> {errorMsg}
                                    </p>
                                )}

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">Código do Cupom</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="EX: BLACKFRIDAY15" 
                                        value={code}
                                        onChange={e => setCode(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold tracking-widest text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 font-medium block mt-1">Este será o código digitado pelos dentistas no checkout.</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">Tipo Desconto</label>
                                        <select 
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as any)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="PERCENTAGE">Porcentagem (%)</option>
                                            <option value="FIXED">Valor Fixo (R$)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">Valor Desconto</label>
                                        <input 
                                            required
                                            type="number" 
                                            step="any"
                                            value={discountValue}
                                            onChange={e => setDiscountValue(Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">Limite de Usos</label>
                                        <input 
                                            type="number" 
                                            placeholder="Sem limite"
                                            value={maxUses || ''}
                                            onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">Data Validade</label>
                                        <input 
                                            type="date" 
                                            value={validUntil}
                                            onChange={e => setValidUntil(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all text-xs tracking-wider uppercase mt-4"
                                >
                                    CRIAR CUPOM PROMOCIONAL
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
