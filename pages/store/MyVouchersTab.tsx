import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/firebaseService';
import { Sparkles, Ticket, Copy, Check, Search, RefreshCw, AlertCircle, Calendar, ShieldCheck, HelpCircle, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export function MyVouchersTab() {
    const { t } = useTranslation();
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
            alert(t('store.syncPurchasesSuccess', { count: res.vouchersGenerated || 0, defaultValue: `Sincronização concluída com sucesso! Vouchers gerados: ${res.vouchersGenerated || 0}. Seus combos e promoções antigos foram restaurados e estão disponíveis.` }));
            await fetchVouchers();
        } catch (err: any) {
            console.error("Erro ao sincronizar pedidos:", err);
            alert(t('store.syncPurchasesError', 'Erro ao sincronizar compras: ') + (err.message || err));
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
        return lab?.name || t('store.partnerLabFallback', 'Laboratório Parceiro');
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
        <div className="p-4 md:p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2A] p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Ticket className="text-indigo-600 dark:text-blue-400" size={28} /> {t('store.myServiceVouchersTitle', 'Meus Vouchers de Serviço')}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {t('store.myVouchersSubtitle', 'Gerencie e acompanhe o saldo dos seus pacotes de serviços pré-pagos e combos promocionais.')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={handleSyncOldPurchases}
                        disabled={loading || syncing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-black bg-indigo-50 dark:bg-blue-950/40 hover:bg-indigo-100 dark:hover:bg-blue-900/60 text-indigo-700 dark:text-blue-300 border border-indigo-200 dark:border-blue-800/60 rounded-xl transition-all disabled:opacity-50 shadow-sm"
                        title={t('store.syncPurchasesTooltip', 'Sincronizar e resgatar compras confirmadas no Asaas')}
                    >
                        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} /> {t('store.syncPurchases', 'Sincronizar Compras')}
                    </button>
                    <button 
                        onClick={fetchVouchers}
                        disabled={loading || syncing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {t('common.refresh', 'Atualizar')}
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input 
                        type="text"
                        placeholder={t('store.searchVoucherPlaceholder', 'Buscar por código, serviço ou promoção...')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>
                
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full md:w-auto">
                    {(['ACTIVE', 'EXHAUSTED', 'ALL'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                filterStatus === status 
                                ? 'bg-white dark:bg-[#131B2A] text-indigo-700 dark:text-blue-400 shadow-sm' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {status === 'ACTIVE' ? t('store.filterActive', 'Ativos') : status === 'EXHAUSTED' ? t('store.filterUsed', 'Utilizados') : t('store.filterAll', 'Todos')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <RefreshCw size={40} className="animate-spin text-indigo-600 dark:text-blue-400" />
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">{t('store.loadingVouchers', 'Carregando seus vouchers...')}</p>
                </div>
            ) : filteredVouchers.length === 0 ? (
                <div className="bg-white dark:bg-[#131B2A] rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center max-w-lg mx-auto shadow-sm transition-colors">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                        <Ticket size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">{t('store.noVouchersFound', 'Nenhum voucher encontrado')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                        {searchTerm ? t('store.noVouchersMatchSearch', 'Nenhum resultado corresponde aos termos da sua busca.') : t('store.noVouchersOwned', 'Você ainda não possui vouchers de combos contratados ou ativos no momento.')}
                    </p>
                    {!searchTerm && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                            {t('store.buyCombosTip', 'Compre combos e pacotes promocionais na Loja Virtual de Prótese para gerar vouchers de serviços pré-pagos automáticos!')}
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:p-6">
                    {filteredVouchers.map((v) => {
                        const isExhausted = v.remainingQuantity <= 0 || v.status === 'EXHAUSTED';
                        const progressPercent = Math.min(100, Math.max(0, (v.remainingQuantity / v.initialQuantity) * 100));
                        
                        return (
                            <motion.div
                                key={v.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-white dark:bg-[#131B2A] rounded-3xl border shadow-sm relative overflow-hidden flex flex-col justify-between transition-all group ${
                                    isExhausted 
                                    ? 'border-slate-150 dark:border-slate-800 opacity-75' 
                                    : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-blue-700/60 hover:shadow-md'
                                }`}
                            >
                                {/* Ticket cutout decorative side circles */}
                                <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-slate-50 dark:bg-[#0B0F17] border-r border-slate-100 dark:border-slate-800 -translate-y-1/2 z-10" />
                                <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-slate-50 dark:bg-[#0B0F17] border-l border-slate-100 dark:border-slate-800 -translate-y-1/2 z-10" />

                                <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">{t('store.comboCampaign', 'Combo / Campanha')}</span>
                                            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-blue-400 transition-colors">
                                                {v.promotionName || v.jobTypeName}
                                            </h4>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            isExhausted 
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' 
                                            : 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800/60'
                                        }`}>
                                            {isExhausted ? t('store.voucherUsed', 'Utilizado') : t('store.voucherActive', 'Ativo')}
                                        </span>
                                    </div>

                                    {/* Voucher Code Area */}
                                    <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">{t('store.voucherCodeLabel', 'Código do Voucher')}</span>
                                            <span className="font-mono font-black text-sm text-slate-700 dark:text-slate-200 tracking-wider">
                                                {v.code}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(v.code, v.id)}
                                            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-blue-400 transition-all shadow-sm"
                                            title={t('store.copyCode', 'Copiar Código')}
                                        >
                                            {copiedId === v.id ? <Check size={16} className="text-green-600 dark:text-green-400" /> : <Copy size={16} />}
                                        </button>
                                    </div>

                                    {/* Service and Lab information */}
                                    <div className="space-y-2.5 pt-1 text-xs">
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-blue-950/50 flex items-center justify-center text-indigo-600 dark:text-blue-400 shrink-0 mt-0.5">
                                                <ShieldCheck size={12} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">{t('store.exclusiveService', 'Serviço Exclusivo')}</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{v.jobTypeName}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                                                <AlertCircle size={12} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">{t('store.issuerLab', 'Laboratório Emissor')}</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{getLabName(v.organizationId)}</span>
                                            </div>
                                        </div>

                                        {v.applyToAllVariations === false && v.promoVariationOptionName && (
                                            <div className="flex items-start gap-2">
                                                <div className="w-5 h-5 rounded-lg bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0 mt-0.5">
                                                    <Tag size={12} />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-pink-500 dark:text-pink-400 block font-black uppercase tracking-wider">{t('store.exclusiveVariation', 'Variação Exclusiva')}</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{v.promoVariationOptionName}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom quantity bar */}
                                <div className="border-t border-dashed border-slate-150 dark:border-slate-800 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500 dark:text-slate-400">{t('store.servicesQuantity', 'Quantidade de Serviços')}</span>
                                        <span className="text-slate-800 dark:text-slate-200">
                                            <span className="text-indigo-600 dark:text-blue-400 text-sm font-black">{v.remainingQuantity}</span> / {v.initialQuantity} {t('store.remainingPlural', 'restantes')}
                                        </span>
                                    </div>
                                    
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${isExhausted ? 'bg-slate-300 dark:bg-slate-600' : 'bg-indigo-600 dark:bg-blue-600'}`}
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
            <div className="bg-slate-100/55 dark:bg-[#131B2A] p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800 flex gap-4 items-start max-w-4xl transition-colors">
                <HelpCircle className="text-indigo-500 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-extrabold text-slate-800 dark:text-slate-100">{t('store.howToUseVouchersTitle', 'Como utilizar seus vouchers no checkout?')}</p>
                    <p>
                        {t('store.howToUseVouchersStep1', '1. Ao criar um pedido na Loja Virtual para um paciente, certifique-se de que o laboratório é o mesmo emissor do voucher.')}<br />
                        {t('store.howToUseVouchersStep2', '2. No carrinho, adicione o código do seu voucher correspondente ao tipo do serviço.')}<br />
                        {t('store.howToUseVouchersStep3', '3. O valor do serviço associado será totalmente zerado até o limite do saldo do voucher. Se houver outros itens no carrinho, apenas eles serão cobrados normalmente.')}<br />
                        {t('store.howToUseVouchersStep4', '4. Caso o carrinho contenha apenas itens cobertos por vouchers com saldo disponível, o pedido será enviado diretamente ao laboratório sem necessidade de passar pela tela de pagamento!')}
                    </p>
                </div>
            </div>
        </div>
    );
}

