
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Building, Crown, Users } from 'lucide-react';

export const SuperAdminDashboard = () => {
    const { allOrganizations, allPlans, allUsers } = useApp();

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-900">Painel Super Admin</h1>
            
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

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Organizações Recentes</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                            <th className="p-4">ID</th>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4">Criado em</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allOrganizations.map(org => (
                            <tr key={org.id}>
                                <td className="p-4 font-mono text-xs">{org.id}</td>
                                <td className="p-4 font-bold">{org.name}</td>
                                <td className="p-4"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase">{org.planId}</span></td>
                                <td className="p-4 text-sm text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
