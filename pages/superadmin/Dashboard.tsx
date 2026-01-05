
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Building, Crown, Users, Ticket, ArrowRight, Activity, Calendar, Settings, Percent, Save, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SuperAdminDashboard = () => {
    const { allOrganizations, allPlans, allUsers, coupons, globalSettings, updateGlobalSettings } = useApp();
    const navigate = useNavigate();

    // Settings Form State
    const [platformComm, setPlatformComm] = useState(globalSettings?.platformCommission || 5);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (globalSettings) setPlatformComm(globalSettings.platformCommission);
    }, [globalSettings]);

    // Stats
    const totalLabs = allOrganizations.filter(o => o.orgType === 'LAB').length;
    const totalClinics = allOrganizations.filter(o => o.orgType === 'CLINIC').length;

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateGlobalSettings({ platformCommission: platformComm });
            alert("Configurações salvas!");
        } catch (err) {
            alert("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">SaaS Command Center</h1>
                    <p className="text-slate-500">Visão global do ecossistema One Dental System.</p>
                </div>
                <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className="text-green-400" /> Sistema Online
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Building size={24} />
                        </div>
                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-full">TOTAL ORGS</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{allOrganizations.length}</h3>
                    <div className="flex gap-2 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                        <span>{totalLabs} Labs</span>
                        <span>•</span>
                        <span>{totalClinics} Clínicas</span>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <Crown size={24} />
                        </div>
                        <span className="text-[10px] font-black text-purple-500 bg-purple-50 px-2 py-1 rounded-full">PRODUTOS</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{allPlans.length}</h3>
                    <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase">Planos de Assinatura</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full">USUÁRIOS</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{allUsers.length}</h3>
                    <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase">Contas Ativas</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Ticket size={24} />
                        </div>
                        <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-full">OFERTAS</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{coupons.length}</h3>
                    <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase">Cupons Criados</p>
                </div>
            </div>

            {/* Global Settings Section */}
            <div className="bg-white rounded-3xl shadow-lg border-2 border-blue-50 overflow-hidden">
                <div className="p-6 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Settings className="text-blue-600" />
                        <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight">Configurações Globais da Plataforma</h2>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Aplica-se a todos os laboratórios</div>
                </div>
                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-sm font-black text-slate-700 uppercase flex items-center gap-2 mb-2">
                                    <Percent size={16} className="text-blue-500"/> Taxa de Split (Comissão do App)
                                </span>
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <input 
                                            type="number" 
                                            value={platformComm}
                                            onChange={e => setPlatformComm(parseFloat(e.target.value))}
                                            className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">%</span>
                                    </div>
                                    <button 
                                        onClick={handleSaveSettings}
                                        disabled={isSaving}
                                        className="px-8 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin"/> : <Save />}
                                        SALVAR
                                    </button>
                                </div>
                            </label>
                            <p className="text-xs text-slate-400 leading-relaxed italic">
                                * Esta taxa será deduzida automaticamente de cada venda realizada na Loja Virtual de qualquer laboratório cadastrado que utilize a Conta Digital ProTrack.
                            </p>
                        </div>

                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 space-y-3">
                            <h4 className="font-bold text-amber-800 flex items-center gap-2 text-sm uppercase">
                                <Info size={16}/> Configuração de Webhooks (Asaas)
                            </h4>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Para que o sistema funcione corretamente, acesse o painel do Asaas e configure a URL do seu Webhook assinando os eventos:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <span className="text-[10px] font-black bg-white/50 p-1.5 rounded border border-amber-200 text-amber-800">PAYMENT_RECEIVED</span>
                                <span className="text-[10px] font-black bg-white/50 p-1.5 rounded border border-amber-200 text-amber-800">PAYMENT_CONFIRMED</span>
                                <span className="text-[10px] font-black bg-white/50 p-1.5 rounded border border-amber-200 text-amber-800">PAYMENT_REFUNDED</span>
                                <span className="text-[10px] font-black bg-white/50 p-1.5 rounded border border-amber-200 text-amber-800">SUBSCRIPTION_DELETED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscribers Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Organizações Assinantes</h3>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Lista em Tempo Real</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-4">Organização</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Plano Atual</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Data Cadastro</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allOrganizations.map(org => (
                                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs">
                                                {org.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{org.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{org.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${org.orgType === 'CLINIC' ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                            {org.orgType === 'CLINIC' ? 'Clínica' : 'Laboratório'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                                            <span className="font-bold text-xs text-slate-600 uppercase">{org.planId}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${org.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {org.subscriptionStatus || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Calendar size={12} />
                                            {new Date(org.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                            <ArrowRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {allOrganizations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-slate-400 italic">Nenhum assinante encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
