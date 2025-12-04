
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Building, Users, CreditCard } from 'lucide-react';

export const SuperAdminDashboard = () => {
    const { allOrganizations, allPlans, allUsers } = useApp();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Painel de Controle SaaS</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <Building size={24} className="text-blue-500 mb-2" />
                    <h3 className="text-3xl font-bold">{allOrganizations.length}</h3>
                    <p className="text-slate-500">Laboratórios Ativos</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <Users size={24} className="text-green-500 mb-2" />
                    <h3 className="text-3xl font-bold">{allUsers.length}</h3>
                    <p className="text-slate-500">Usuários Totais</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <CreditCard size={24} className="text-purple-500 mb-2" />
                    <h3 className="text-3xl font-bold">{allPlans.length}</h3>
                    <p className="text-slate-500">Planos de Assinatura</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                <h2 className="p-4 font-bold border-b border-slate-100">Organizações</h2>
                <div className="divide-y divide-slate-100">
                    {allOrganizations.map(org => (
                        <div key={org.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold">{org.name}</p>
                                <p className="text-xs text-slate-500">{org.id}</p>
                            </div>
                            <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-full">
                                Plano: {allPlans.find(p => p.id === org.planId)?.name || 'N/A'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
