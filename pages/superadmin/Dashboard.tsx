
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Building, Crown, Users, Ticket, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SuperAdminDashboard = () => {
    const { allOrganizations, allPlans, allUsers } = useApp();
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Painel Super Admin</h1>
                    <p className="text-slate-500">Controle mestre da plataforma One Dental.</p>
                </div>
            </div>
            
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase">Laboratórios</p>
                            <h3 className="text-3xl font-bold text-slate-800">{allOrganizations.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <Building size={24} />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase">Planos Ativos</p>
                            <h3 className="text-3xl font-bold text-slate-800">{allPlans.length}</h3>
                        </div>
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                            <Crown size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase">Usuários Totais</p>
                            <h3 className="text-3xl font-bold text-slate-800">{allUsers.length}</h3>
                        </div>
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                            <Users size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                    onClick={() => navigate('/superadmin/plans')}
                    className="p-6 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl"><Crown size={32}/></div>
                        <div className="text-left">
                            <h4 className="font-bold text-xl">Configurar Planos</h4>
                            <p className="text-indigo-100 text-sm opacity-80">Edite preços e limites do SaaS.</p>
                        </div>
                    </div>
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </button>

                <button 
                    onClick={() => navigate('/superadmin/coupons')}
                    className="p-6 bg-slate-800 text-white rounded-2xl shadow-lg hover:bg-slate-900 transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl"><Ticket size={32}/></div>
                        <div className="text-left">
                            <h4 className="font-bold text-xl">Gerenciar Cupons</h4>
                            <p className="text-slate-300 text-sm opacity-80">Crie campanhas de desconto.</p>
                        </div>
                    </div>
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </button>
            </div>

            {/* Tabela de Organizações */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Organizações Recentes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                <th className="p-4">ID</th>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Plano</th>
                                <th className="p-4">Criado em</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allOrganizations.map(org => (
                                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono text-[10px] text-slate-400">{org.id}</td>
                                    <td className="p-4 font-bold text-slate-700">{org.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${org.orgType === 'CLINIC' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {org.orgType}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold uppercase border border-slate-200">{org.planId}</span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
