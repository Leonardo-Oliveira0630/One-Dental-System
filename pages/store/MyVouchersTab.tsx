import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/firebaseService';
import { Sparkles, Ticket, Copy, Check, Search, RefreshCw, AlertCircle, Calendar, ShieldCheck, HelpCircle, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export function MyVouchersTab() {
    const { currentUser, allLaboratories } = useApp();
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'EXHAUSTED'>('ACTIVE');

    const handleSyncOldPurchases = async () => {
        if (!currentUser?.id) return;
        setSyncing(true);
        try {
            const res = await api.apiSyncStoreOrders({ clientId: currentUser.id });
            alert(`Sincronização concluída com sucesso! Vouchers gerados: ${res.vouchersGenerated || 0}. Seus combos e promoções antigos foram restaurados e estão disponíveis.`);
            await fetchVouchers();
        } catch (err: any) {
            console.error("Erro ao sincronizar pedidos:", err);
            alert("Erro ao sincronizar compras: " + (err.message || err));
        } finally {
            setSyncing(false);
        }
    };

    const fetchVouchers = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            const data = await api.apiGetAllMyVouchers(currentUser.id);
            // Sort by date newest first
            const sorted = (data || []).sort((a: any, b: any) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
            setVouchers(sorted);
        } catch (err) {
            console.error("Erro ao carregar vouchers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, [currentUser?.id]);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getLabName = (orgId: string) => {
        const lab = allLaboratories?.find((l: any) => l.id === orgId);
        return lab?.name || "Laboratório Parceiro";
    };

    const filteredVouchers = vouchers.filter(v => {
        const matchesSearch = 
            v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.jobTypeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.promotionName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
            filterStatus === 'ALL' ||
            (filterStatus === 'ACTIVE' && v.remainingQuantity > 0 && v.status !== 'EXHAUSTED') ||
            (filterStatus === 'EXHAUSTED' && (v.remainingQuantity <= 0 || v.status === 'EXHAUSTED'));

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Ticket className="text-indigo-600" size={28} /> Meus Vouchers de Serviço
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Gerencie e acompanhe o saldo dos seus pacotes de serviços pré-pagos e combos promocionais.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={handleSyncOldPurchases}
                        disabled={loading || syncing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-all disabled:opacity-50 shadow-sm"
                        title="Sincronizar e resgatar compras confirmadas no Asaas"
                    >
                        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} /> Sincronizar Compras
                    </button>
                    <button 
                        onClick={fetchVouchers}
                        disabled={loading || syncing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Buscar por código, serviço ou promoção..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>
                
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
                    {(['ACTIVE', 'EXHAUSTED', 'ALL'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                filterStatus === status 
                                ? 'bg-white text-indigo-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {status === 'ACTIVE' ? 'Ativos' : status === 'EXHAUSTED' ? 'Utilizados' : 'Todos'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <RefreshCw size={40} className="animate-spin text-indigo-600" />
                    <p className="text-slate-500 font-bold text-sm">Carregando seus vouchers...</p>
                </div>
            ) : filteredVouchers.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center max-w-lg mx-auto shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Ticket size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-2">Nenhum voucher encontrado</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        {searchTerm ? "Nenhum resultado corresponde aos termos da sua busca." : "Você ainda não possui vouchers de combos contratados ou ativos no momento."}
                    </p>
                    {!searchTerm && (
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            Compre combos e pacotes promocionais na Loja Virtual de Prótese para gerar vouchers de serviços pré-pagos automáticos!
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVouchers.map((v) => {
                        const isExhausted = v.remainingQuantity <= 0 || v.status === 'EXHAUSTED';
                        const progressPercent = Math.min(100, Math.max(0, (v.remainingQuantity / v.initialQuantity) * 100));
                        
                        return (
                            <motion.div
                                key={v.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-white rounded-3xl border shadow-sm relative overflow-hidden flex flex-col justify-between transition-all group ${
                                    isExhausted 
                                    ? 'border-slate-150 opacity-75' 
                                    : 'border-slate-100 hover:border-indigo-200 hover:shadow-md'
                                }`}
                            >
                                {/* Ticket cutout decorative side circles */}
                                <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-100 -translate-y-1/2 z-10" />
                                <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-100 -translate-y-1/2 z-10" />

                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Combo / Campanha</span>
                                            <h4 className="font-extrabold text-slate-800 text-base line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                                {v.promotionName || v.jobTypeName}
                                            </h4>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            isExhausted 
                                            ? 'bg-slate-100 text-slate-500' 
                                            : 'bg-green-50 text-green-700 border border-green-100'
                                        }`}>
                                            {isExhausted ? 'Utilizado' : 'Ativo'}
                                        </span>
                                    </div>

                                    {/* Voucher Code Area */}
                                    <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Código do Voucher</span>
                                            <span className="font-mono font-black text-sm text-slate-700 tracking-wider">
                                                {v.code}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(v.code, v.id)}
                                            className="p-2 bg-white hover:bg-slate-100 border border-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
                                            title="Copiar Código"
                                        >
                                            {copiedId === v.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                        </button>
                                    </div>

                                    {/* Service and Lab information */}
                                    <div className="space-y-2.5 pt-1 text-xs">
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                                                <ShieldCheck size={12} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-medium">Serviço Exclusivo</span>
                                                <span className="font-bold text-slate-700">{v.jobTypeName}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                                                <AlertCircle size={12} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-medium">Laboratório Emissor</span>
                                                <span className="font-bold text-slate-700">{getLabName(v.organizationId)}</span>
                                            </div>
                                        </div>

                                        {v.applyToAllVariations === false && v.promoVariationOptionName && (
                                            <div className="flex items-start gap-2">
                                                <div className="w-5 h-5 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 shrink-0 mt-0.5">
                                                    <Tag size={12} />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-pink-500 block font-black uppercase tracking-wider">Variação Exclusiva</span>
                                                    <span className="font-bold text-slate-700">{v.promoVariationOptionName}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom quantity bar */}
                                <div className="border-t border-dashed border-slate-150 p-6 bg-slate-50/50 space-y-3">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500">Quantidade de Serviços</span>
                                        <span className="text-slate-800">
                                            <span className="text-indigo-600 text-sm font-black">{v.remainingQuantity}</span> / {v.initialQuantity} restantes
                                        </span>
                                    </div>
                                    
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${isExhausted ? 'bg-slate-300' : 'bg-indigo-600'}`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* User instructions box */}
            <div className="bg-slate-100/55 p-5 rounded-3xl border border-slate-200/50 flex gap-4 items-start max-w-4xl">
                <HelpCircle className="text-indigo-500 shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-extrabold text-slate-800">Como utilizar seus vouchers no checkout?</p>
                    <p>
                        1. Ao criar um pedido na Loja Virtual para um paciente, certifique-se de que o laboratório é o mesmo emissor do voucher.<br />
                        2. No carrinho, adicione o código do seu voucher correspondente ao tipo do serviço.<br />
                        3. O valor do serviço associado será totalmente zerado até o limite do saldo do voucher. Se houver outros itens no carrinho, apenas eles serão cobrados normalmente.<br />
                        4. Caso o carrinho contenha apenas itens cobertos por vouchers com saldo disponível, o pedido será enviado diretamente ao laboratório sem necessidade de passar pela tela de pagamento!
                    </p>
                </div>
            </div>
        </div>
    );
}
