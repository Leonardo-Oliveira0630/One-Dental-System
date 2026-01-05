
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, ManualDentist } from '../../types';
import { Stethoscope, Building, Search, Loader2, ArrowRight, Tag, Percent, Save, X, DollarSign, Globe, HardDrive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dentists = () => {
    const { jobTypes, updateUser, allUsers, manualDentists, updateManualDentist } = useApp();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [selectedClient, setSelectedClient] = useState<{ id: string, name: string, isManual: boolean } | null>(null);
    const [globalDiscount, setGlobalDiscount] = useState<number>(0);
    const [customDiscounts, setCustomDiscounts] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Unifica usuários do sistema (role CLIENT) com dentistas manuais (internos)
    const combinedClients = useMemo(() => {
        const online = allUsers
            .filter(u => u.role === UserRole.CLIENT)
            .map(u => ({
                id: u.id,
                name: u.name,
                clinicName: u.clinicName,
                email: u.email,
                isManual: false,
                globalDiscountPercent: u.globalDiscountPercent || 0,
                customPrices: u.customPrices || [],
            }));

        const internal = manualDentists.map(d => ({
            id: d.id,
            name: d.name,
            clinicName: d.clinicName,
            email: d.email,
            isManual: true,
            globalDiscountPercent: d.globalDiscountPercent || 0,
            customPrices: d.customPrices || [],
        }));

        return [...online, ...internal].sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers, manualDentists]);

    const handleOpenPricing = (client: any) => {
        setSelectedClient({
            id: client.id,
            name: client.name,
            isManual: client.isManual
        });
        setGlobalDiscount(client.globalDiscountPercent || 0);
        
        const discounts: Record<string, number> = {};
        client.customPrices?.forEach((cp: any) => {
            if (cp.discountPercent !== undefined) {
                discounts[cp.jobTypeId] = cp.discountPercent;
            }
        });
        setCustomDiscounts(discounts);
    };

    const handleSavePricing = async () => {
        if (!selectedClient) return;
        setIsSaving(true);
        
        try {
            const customPrices = (Object.entries(customDiscounts) as [string, number][])
                .filter(([_, val]) => val > 0)
                .map(([jobTypeId, discountPercent]) => ({
                    jobTypeId,
                    discountPercent
                }));

            const updates = {
                globalDiscountPercent: globalDiscount,
                customPrices: customPrices
            };

            if (selectedClient.isManual) {
                await updateManualDentist(selectedClient.id, updates);
            } else {
                await updateUser(selectedClient.id, updates);
            }

            alert("Tabela de preços atualizada com sucesso!");
            setSelectedClient(null);
        } catch (error) {
            console.error("Erro ao salvar preços:", error);
            alert("Erro ao salvar preços.");
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = combinedClients.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (d.clinicName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão de Clientes</h1>
                    <p className="text-slate-500">Configure descontos personalizados para clientes Web e Internos.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, clínica ou email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(client => (
                    <div key={client.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${client.isManual ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                <Stethoscope size={28} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900 text-lg truncate" title={client.name}>{client.name}</h3>
                                    {client.isManual ? (
                                        <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                            <HardDrive size={10} /> INTERNO
                                        </span>
                                    ) : (
                                        <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                            <Globe size={10} /> WEB
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
                                <span className="text-slate-500">Preços Customizados:</span>
                                <span className="font-bold text-blue-600">{client.customPrices.length} itens</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button 
                                onClick={() => handleOpenPricing(client)}
                                className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Tag size={16} /> Tabela
                            </button>
                            <button 
                                onClick={() => navigate(`/jobs?dentist=${client.id}`)}
                                className="py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                Pedidos <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        Nenhum cliente encontrado.
                    </div>
                )}
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
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                <div className="flex items-center gap-3 mb-4 text-green-800">
                                    <Percent size={24} />
                                    <h4 className="font-black uppercase tracking-widest text-sm">Desconto Global em Tudo</h4>
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
                                    <DollarSign size={14}/> Descontos por Serviço Individual
                                </h4>
                                
                                <div className="space-y-3">
                                    {jobTypes.map(type => {
                                        const value = customDiscounts[type.id] || 0;
                                        return (
                                            <div key={type.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all">
                                                <div className="mb-2 sm:mb-0">
                                                    <p className="font-bold text-slate-800">{type.name}</p>
                                                    <p className="text-xs text-slate-400">Preço Padrão: R$ {type.basePrice.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Preço Final</p>
                                                        <p className="font-black text-blue-700">R$ {(type.basePrice * (1 - (value || globalDiscount) / 100)).toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max="100"
                                                            value={value || ''}
                                                            onChange={e => setCustomDiscounts(prev => ({ ...prev, [type.id]: parseInt(e.target.value) || 0 }))}
                                                            className="w-16 px-3 py-2 font-bold text-center outline-none"
                                                            placeholder="0"
                                                        />
                                                        <div className="bg-slate-100 px-3 py-2 border-l border-slate-200 text-slate-500 font-bold">%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
                            <button onClick={() => setSelectedClient(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
                            <button 
                                onClick={handleSavePricing}
                                disabled={isSaving}
                                className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                SALVAR TABELA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
