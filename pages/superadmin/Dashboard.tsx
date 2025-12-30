
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Building, Crown, Users, Ticket, ArrowRight, Activity, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SuperAdminDashboard = () => {
    const { allOrganizations, allPlans, allUsers, coupons } = useApp();
    const navigate = useNavigate();

    // Stats
    const totalLabs = allOrganizations.filter(o => o.orgType === 'LAB').length;
    const totalClinics = allOrganizations.filter(o => o.orgType === 'CLINIC').length;

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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                    onClick={() => navigate('/superadmin/plans')}
                    className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-3xl hover:bg-slate-800 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white/10 rounded-2xl"><Crown /></div>
                        <div className="text-left">
                            <p className="font-bold text-lg">Gerenciar Planos</p>
                            <p className="text-sm text-slate-400">Criar, editar e precificar planos.</p>
                        </div>
                    </div>
                    <ArrowRight className="text-slate-500 group-hover:translate-x-2 transition-transform" />
                </button>

                <button 
                    onClick={() => navigate('/superadmin/coupons')}
                    className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-3xl hover:border-amber-500 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Ticket /></div>
                        <div className="text-left">
                            <p className="font-bold text-lg text-slate-800">Gerenciar Cupons</p>
                            <p className="text-sm text-slate-500">Campanhas de marketing e descontos.</p>
                        </div>
                    </div>
                    <ArrowRight className="text-slate-300 group-hover:text-amber-500 group-hover:translate-x-2 transition-transform" />
                </button>
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
