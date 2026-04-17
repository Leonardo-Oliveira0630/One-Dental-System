
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, ManualDentist, Job, JobStatus } from '../../types';
import { Stethoscope, Building, Search, Loader2, ArrowRight, Tag, Percent, Save, X, DollarSign, Globe, HardDrive, UserCheck, Package, Table, FileText, Lock, Unlock, RefreshCw, Check, Calendar, ArrowUpCircle, ArrowDownCircle, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dentists = () => {
    const { jobTypes, updateUser, manualDentists, updateManualDentist, jobs, priceTables, allUsers, currentUser, billingBatches, generateBatchBoleto } = useApp();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'DEBT' | 'FINANCIAL_APPROVAL'>('ALL');

    const hasPerm = (perm: string) => {
        if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN) return true;
        return (currentUser?.permissions as string[])?.includes(perm) || false;
    };
    
    // Modal State
    const [selectedClient, setSelectedClient] = useState<{ id: string, name: string, isManual: boolean } | null>(null);
    const [globalDiscount, setGlobalDiscount] = useState<number>(0);
    const [priceTableId, setPriceTableId] = useState<string>('');
    const [isCustomPricing, setIsCustomPricing] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [billingLimit, setBillingLimit] = useState<number>(0);
    const [blockReason, setBlockReason] = useState<'DEBT' | 'FINANCIAL_APPROVAL' | ''>('');
    const [temporaryUnblockUntil, setTemporaryUnblockUntil] = useState<Date | null>(null);
    const [customPrices, setCustomPrices] = useState<any[]>([]);
    
    // Extrato State
    const [showStatement, setShowStatement] = useState(false);
    const [statementClient, setStatementClient] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // UNIFICAÇÃO DOS CLIENTES
    const combinedClients = useMemo(() => {
        const clientMap = new Map<string, any>();

        // 1. Adiciona os Dentistas Manuais (Offline) - Prioridade de Cadastro
        manualDentists.forEach(d => {
            clientMap.set(d.id, {
                id: d.id,
                name: d.name,
                clinicName: d.clinicName,
                email: d.email,
                isManual: true,
                globalDiscountPercent: d.globalDiscountPercent || 0,
                customPrices: d.customPrices || [],
                deliveryViaPost: d.deliveryViaPost || false,
                priceTableId: d.priceTableId || '',
                isCustomPricing: d.isCustomPricing || false,
                isBlocked: d.isBlocked || false,
                billingLimit: d.billingLimit || 0,
                blockReason: d.blockReason || '',
                temporaryUnblockUntil: d.temporaryUnblockUntil || null
            });
        });

        // 2. Adiciona os Dentistas Online (Web)
        allUsers.filter(u => u.role === UserRole.CLIENT).forEach(u => {
            if (!clientMap.has(u.id)) {
                clientMap.set(u.id, {
                    id: u.id,
                    name: u.name,
                    clinicName: u.clinicName || 'Cliente Web',
                    email: u.email, 
                    isManual: false,
                    globalDiscountPercent: u.globalDiscountPercent || 0, 
                    customPrices: u.customPrices || [],
                    deliveryViaPost: u.deliveryViaPost || false,
                    priceTableId: u.priceTableId || '',
                    isCustomPricing: u.isCustomPricing || false,
                    isBlocked: u.isBlocked || false,
                    billingLimit: u.billingLimit || 0,
                    blockReason: u.blockReason || '',
                    temporaryUnblockUntil: u.temporaryUnblockUntil || null
                });
            }
        });

        return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [manualDentists, allUsers]);

    const handleOpenPricing = (client: any) => {
        setSelectedClient({
            id: client.id,
            name: client.name,
            isManual: client.isManual
        });
        setGlobalDiscount(client.globalDiscountPercent || 0);
        setPriceTableId(client.priceTableId || '');
        setIsCustomPricing(client.isCustomPricing || false);
        setIsBlocked(client.isBlocked || false);
        setBillingLimit(client.billingLimit || 0);
        setBlockReason(client.blockReason || '');
        setTemporaryUnblockUntil(client.temporaryUnblockUntil ? new Date(client.temporaryUnblockUntil) : null);
        setCustomPrices(client.customPrices || []);
    };

    const handleSavePricing = async () => {
        if (!selectedClient) return;
        setIsSaving(true);
        
        try {
            const updates: any = {
                globalDiscountPercent: globalDiscount,
                customPrices: customPrices,
                isCustomPricing: isCustomPricing,
            };

            // STRICT PERMISSION CHECK
            if (hasPerm('catalog:prices_view')) {
                updates.priceTableId = priceTableId;
            }

            if (hasPerm('clients:block_manage')) {
                updates.isBlocked = isBlocked;
                updates.billingLimit = billingLimit;
                updates.blockReason = blockReason || null;
                updates.temporaryUnblockUntil = temporaryUnblockUntil;
            }

            if (selectedClient.isManual) {
                await updateManualDentist(selectedClient.id, updates);
            } else {
                await updateUser(selectedClient.id, updates);
            }

            alert("Client settings updated!");
            setSelectedClient(null);
        } catch (error) {
            console.error("Erro ao salvar preços:", error);
            alert("Erro ao salvar preços. Verifique suas permissões.");
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = useMemo(() => {
        return combinedClients.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (d.clinicName || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;

            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'ACTIVE') return !d.isBlocked;
            if (statusFilter === 'BLOCKED') return d.isBlocked;
            if (statusFilter === 'DEBT') return d.isBlocked && d.blockReason === 'DEBT';
            if (statusFilter === 'FINANCIAL_APPROVAL') return d.isBlocked && d.blockReason === 'FINANCIAL_APPROVAL';

            return true;
        });
    }, [combinedClients, searchTerm, statusFilter]);

    const statementData = useMemo(() => {
        if (!statementClient) return [];
        
        const clientJobs = jobs.filter(j => j.dentistId === statementClient.id && (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED));
        const clientBatches = billingBatches.filter(b => b.dentistId === statementClient.id && b.status === 'PAID');
        
        const history = [
            ...clientJobs.map(j => ({
                id: j.id,
                date: j.createdAt,
                type: 'DEBIT' as const,
                description: `Trabalho: ${j.patientName} (${j.osNumber || j.id})`,
                amount: j.totalValue || 0
            })),
            ...clientBatches.map(b => ({
                id: b.id,
                date: b.createdAt,
                type: 'PAYMENT' as const,
                description: `Pagamento Fatura: ${b.id}`,
                amount: b.totalAmount || 0
            }))
        ];
        
        return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [statementClient, jobs, billingBatches]);

    const currentBalance = useMemo(() => {
        const debits = statementData.filter(d => d.type === 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
        const payments = statementData.filter(d => d.type === 'PAYMENT').reduce((acc, curr) => acc + curr.amount, 0);
        return debits - payments;
    }, [statementData]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão de Clientes</h1>
                    <p className="text-slate-500">Administre as tabelas de preços de todos os seus dentistas.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Pesquisar por nome ou consultório..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                        >
                            <option value="ALL">Todos os Clientes</option>
                            <option value="ACTIVE">Clientes Ativos</option>
                            <option value="BLOCKED">Todos os Bloqueados</option>
                            <option value="DEBT">Por Inadimplência</option>
                            <option value="FINANCIAL_APPROVAL">Por Análise de Crédito</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(client => (
                    <div key={client.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden">
                        {client.deliveryViaPost && (
                          <div className="absolute top-4 right-4 bg-orange-100 text-orange-600 p-2 rounded-lg" title="Entrega via Correios">
                             <Package size={16} />
                          </div>
                        )}
                        
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${client.isManual ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                {client.isManual ? <HardDrive size={28} /> : <Globe size={28} />}
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900 text-lg truncate" title={client.name}>{client.name}</h3>
                                    {client.isManual ? (
                                        <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                            INTERNO
                                        </span>
                                    ) : (
                                        <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                            WEB
                                        </span>
                                    )}
                                    {client.isBlocked && (
                                        <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                            BLOQUEADO
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
                                    <Building size={14} className="shrink-0" />
                                    <span className="truncate">{client.clinicName || 'Consultório Particular'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 py-4 border-y border-slate-50">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Desconto Global:</span>
                                <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{client.globalDiscountPercent}%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Logística:</span>
                                <span className="font-bold text-slate-700">{client.deliveryViaPost ? 'Correios' : 'Entrega Direta'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button 
                                onClick={() => handleOpenPricing(client)}
                                className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-xs"
                            >
                                <Tag size={16} /> Tabela Preços
                            </button>
                            {hasPerm('clients:statement_view') && (
                              <button 
                                  onClick={() => {
                                      setStatementClient(client);
                                      setShowStatement(true);
                                  }}
                                  className="py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-100"
                              >
                                  <FileText size={16} /> Extrato
                              </button>
                            )}
                            {!hasPerm('clients:statement_view') && (
                              <button 
                                  onClick={() => navigate(`/jobs?dentist=${client.id}`)}
                                  className="py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-100"
                              >
                                  Trabalhos <ArrowRight size={16} />
                              </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL DE TABELA DE PREÇOS */}
            {selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Tabela de Preços: {selectedClient.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase">Personalize os descontos para este cliente</p>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {hasPerm('clients:block_manage') && (
                                    <div className="space-y-4">
                                        <div className={`p-4 rounded-xl border transition-all ${isBlocked ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    {isBlocked ? <Lock size={20} className="text-red-600" /> : <Unlock size={20} className="text-green-600" />}
                                                    <div>
                                                        <span className="text-sm font-black text-slate-800 uppercase block">Status: {isBlocked ? 'BLOQUEADO' : 'ATIVO'}</span>
                                                        <span className="text-[10px] font-medium text-slate-500 block leading-tight">Clientes bloqueados não podem criar novos trabalhos.</span>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={isBlocked} 
                                                        onChange={() => setIsBlocked(!isBlocked)}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                                </label>
                                            </div>

                                            {(isBlocked || blockReason) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Motivo do Bloqueio</label>
                                                        <select 
                                                            value={blockReason}
                                                            onChange={e => setBlockReason(e.target.value as any)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="">Selecione um motivo...</option>
                                                            <option value="DEBT">Inadimplência</option>
                                                            <option value="FINANCIAL_APPROVAL">Aguardando Aprovação Financeira</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Desbloqueio Temporário</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const tomorrow = new Date();
                                                                tomorrow.setHours(tomorrow.getHours() + 24);
                                                                setTemporaryUnblockUntil(tomorrow);
                                                                setIsBlocked(false);
                                                            }}
                                                            className="w-full px-3 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase hover:bg-amber-200 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <RefreshCw size={14} /> Liberar por 24h
                                                        </button>
                                                        {temporaryUnblockUntil && new Date(temporaryUnblockUntil) > new Date() && (
                                                            <p className="text-[9px] text-amber-600 font-bold mt-1 ml-1 flex items-center gap-1">
                                                                <Check size={10} /> Liberado até {new Date(temporaryUnblockUntil).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {hasPerm('catalog:prices_view') && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tabela de Preços Base</label>
                                        <select 
                                            value={priceTableId}
                                            onChange={e => setPriceTableId(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                        >
                                            <option value="">Tabela Padrão do Laboratório</option>
                                            {priceTables.map(table => (
                                                <option key={table.id} value={table.id}>{table.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-4">
                                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-black text-blue-800 uppercase">Tabela Personalizada</p>
                                            <p className="text-[10px] text-blue-600 font-bold">Ignora a tabela base e aplica descontos manuais</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={isCustomPricing}
                                                onChange={e => setIsCustomPricing(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {hasPerm('clients:block_manage') && (
                                        <div className="space-y-2">
                                            <div className={`p-4 rounded-xl border transition-all ${isBlocked ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className={`text-xs font-black uppercase ${isBlocked ? 'text-red-800' : 'text-slate-700'}`}>Status do Cliente</p>
                                                        <p className={`text-[10px] font-bold ${isBlocked ? 'text-red-600' : 'text-slate-400'}`}>{isBlocked ? 'CLIENTE BLOQUEADO' : 'CLIENTE ATIVO'}</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer" 
                                                            checked={isBlocked}
                                                            onChange={e => setIsBlocked(e.target.checked)}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                                    </label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Limite de Fatura (R$)</label>
                                                    <input 
                                                        type="number" 
                                                        value={billingLimit || ''}
                                                        onChange={e => setBillingLimit(parseFloat(e.target.value) || 0)}
                                                        placeholder="Ex: 5000"
                                                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-red-100">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">Motivo do Bloqueio</label>
                                                        <select 
                                                            value={blockReason}
                                                            onChange={e => setBlockReason(e.target.value as any)}
                                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                                        >
                                                            <option value="">Selecione um motivo...</option>
                                                            <option value="DEBT">Inadimplência</option>
                                                            <option value="FINANCIAL_APPROVAL">Aguardando Aprovação Financeira</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 px-1">Ação Rápida</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const tomorrow = new Date();
                                                                tomorrow.setHours(tomorrow.getHours() + 24);
                                                                setTemporaryUnblockUntil(tomorrow);
                                                                setIsBlocked(false);
                                                            }}
                                                            className="w-full px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase hover:bg-amber-200 transition-all flex items-center justify-center gap-1"
                                                        >
                                                            <Unlock size={12}/> Liberar por 24h
                                                        </button>
                                                        {temporaryUnblockUntil && new Date(temporaryUnblockUntil) > new Date() && (
                                                            <p className="text-[9px] text-amber-600 font-bold mt-1">
                                                                Liberado até {temporaryUnblockUntil.toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isCustomPricing ? (
                                <>
                                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                        <div className="flex items-center gap-3 mb-4 text-green-800">
                                            <Percent size={24} />
                                            <h4 className="font-black uppercase tracking-widest text-sm">Desconto Global Customizado</h4>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="50" 
                                                value={globalDiscount}
                                                onChange={e => setGlobalDiscount(parseInt(e.target.value))}
                                                className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                            />
                                            <span className="font-black text-2xl text-green-700 w-16 text-right">{globalDiscount}%</span>
                                        </div>
                                    </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <DollarSign size={14}/> Preços e Descontos Individuais
                                            </h4>
                                            
                                            <div className="space-y-3">
                                                {jobTypes.map(type => {
                                                    const cp = customPrices.find(p => p.jobTypeId === type.id);
                                                    const discountValue = cp?.discountPercent ?? (cp?.fixedPrice ? 0 : globalDiscount);
                                                    const finalPrice = cp?.fixedPrice ?? (type.basePrice * (1 - discountValue / 100));
                                                    
                                                    return (
                                                        <div key={type.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all">
                                                            <div className="mb-2 sm:mb-0">
                                                                <p className="font-bold text-slate-800">{type.name}</p>
                                                                <p className="text-xs text-slate-400">Preço Padrão: R$ {type.basePrice.toFixed(2)}</p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Preço Final</p>
                                                                    <p className="font-black text-blue-700">R$ {finalPrice.toFixed(2)}</p>
                                                                </div>
                                                                
                                                                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                                    <div className="flex items-center">
                                                                        <input 
                                                                            type="number" 
                                                                            value={cp?.discountPercent ?? ''}
                                                                            onChange={e => {
                                                                                const newPercent = parseInt(e.target.value) || 0;
                                                                                const newCustomPrices = [...customPrices];
                                                                                const idx = newCustomPrices.findIndex(p => p.jobTypeId === type.id);
                                                                                if (idx !== -1) {
                                                                                    newCustomPrices[idx] = { ...newCustomPrices[idx], discountPercent: newPercent, fixedPrice: undefined };
                                                                                    if (newPercent === 0 && !newCustomPrices[idx].fixedPrice) newCustomPrices.splice(idx, 1);
                                                                                } else if (newPercent > 0) {
                                                                                    newCustomPrices.push({ jobTypeId: type.id, discountPercent: newPercent });
                                                                                }
                                                                                setCustomPrices(newCustomPrices);
                                                                            }}
                                                                            className="w-14 px-2 py-2 font-bold text-center outline-none bg-transparent"
                                                                            placeholder="0"
                                                                        />
                                                                        <span className="px-1 text-[10px] font-bold text-slate-400 border-l">%</span>
                                                                    </div>
                                                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                                                    <div className="flex items-center">
                                                                        <span className="pl-2 pr-1 text-[10px] font-bold text-slate-400">R$</span>
                                                                        <input 
                                                                            type="number" 
                                                                            value={cp?.fixedPrice ?? ''}
                                                                            onChange={e => {
                                                                                const newFixed = parseFloat(e.target.value) || 0;
                                                                                const newCustomPrices = [...customPrices];
                                                                                const idx = newCustomPrices.findIndex(p => p.jobTypeId === type.id);
                                                                                if (idx !== -1) {
                                                                                    newCustomPrices[idx] = { ...newCustomPrices[idx], fixedPrice: newFixed, discountPercent: undefined };
                                                                                    if (newFixed === 0 && !newCustomPrices[idx].discountPercent) newCustomPrices.splice(idx, 1);
                                                                                } else if (newFixed > 0) {
                                                                                    newCustomPrices.push({ jobTypeId: type.id, fixedPrice: newFixed });
                                                                                }
                                                                                setCustomPrices(newCustomPrices);
                                                                            }}
                                                                            className="w-20 px-2 py-2 font-bold text-center outline-none bg-transparent"
                                                                            placeholder="Fixo"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                </>
                            ) : (
                                <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 text-center">
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <Table size={32} />
                                    </div>
                                    <p className="font-bold text-slate-600">Usando Tabela de Preços Base</p>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2">Os preços serão calculados automaticamente com base na tabela selecionada acima. Ative o modo personalizado se precisar de descontos específicos para este cliente.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
                            <button onClick={() => setSelectedClient(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
                            <button 
                                onClick={handleSavePricing}
                                disabled={isSaving}
                                className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                SALVAR TABELA
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL DE EXTRATO (STATEMENT) */}
            {showStatement && statementClient && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Extrato Financeiro</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase">{statementClient.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowStatement(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Devedor</p>
                                <p className={`text-2xl font-black ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Débitos</p>
                                <p className="text-2xl font-black text-slate-700">
                                    R$ {statementData.filter(d => d.type === 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pagos</p>
                                <p className="text-2xl font-black text-green-600">
                                    R$ {statementData.filter(d => d.type === 'PAYMENT').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Data</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Descrição</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {statementData.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-slate-400 font-bold italic">Nenhum registro encontrado.</td>
                                            </tr>
                                        ) : (
                                            statementData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-bold text-slate-600">
                                                        {new Date(item.date).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            {item.type === 'DEBIT' ? (
                                                                <ArrowDownCircle size={14} className="text-red-500" />
                                                            ) : (
                                                                <ArrowUpCircle size={14} className="text-green-500" />
                                                            )}
                                                            <span className="text-xs font-bold text-slate-800">{item.description}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs font-black text-right ${item.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                                                        {item.type === 'DEBIT' ? '-' : '+'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white rounded-b-3xl flex justify-between items-center gap-4">
                             <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase">
                                <Calendar size={14} /> Histórico Completo
                             </div>
                             <button 
                                onClick={async () => {
                                    const pendingJobIds = statementData
                                        .filter(item => item.type === 'DEBIT')
                                        .map(item => item.id);
                                    
                                    if (pendingJobIds.length === 0) {
                                        alert('Não há débitos pendentes para gerar boleto.');
                                        return;
                                    }

                                    try {
                                        const dueDate = new Date();
                                        dueDate.setDate(dueDate.getDate() + 5);
                                        await generateBatchBoleto(statementClient.id, pendingJobIds, dueDate);
                                        alert('Protocolo de boleto gerado com sucesso! Verifique a aba de faturamentos.');
                                    } catch (err) {
                                        console.error(err);
                                        alert('Erro ao gerar boleto. Verifique se o serviço está configurado.');
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                             >
                                <Receipt size={18} /> GERAR BOLETO
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
