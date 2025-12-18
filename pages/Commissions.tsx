
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, CommissionStatus } from '../types';
import { DollarSign, CheckCircle, Clock, Calendar, User, Search, Filter, Download } from 'lucide-react';

export const Commissions = () => {
  const { commissions, currentUser, updateCommissionStatus, allUsers } = useApp();
  const [filterUser, setFilterUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const isManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  // Filtragem
  const filteredCommissions = commissions.filter(c => {
    if (!isManager && c.userId !== currentUser?.id) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (filterUser && !c.userName.toLowerCase().includes(filterUser.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    pending: filteredCommissions.filter(c => c.status === CommissionStatus.PENDING).reduce((acc, curr) => acc + curr.amount, 0),
    paid: filteredCommissions.filter(c => c.status === CommissionStatus.PAID).reduce((acc, curr) => acc + curr.amount, 0),
    total: filteredCommissions.reduce((acc, curr) => acc + curr.amount, 0)
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Extrato de Comissões</h1>
          <p className="text-slate-500">Relatório de ganhos por produção e produtividade.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50">
          <Download size={18} /> Exportar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-bold text-slate-500 mb-1 uppercase">A Receber</p>
            <h3 className="text-3xl font-black text-orange-600">R$ {stats.pending.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-bold text-slate-500 mb-1 uppercase">Pago (Acumulado)</p>
            <h3 className="text-3xl font-black text-green-600">R$ {stats.paid.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-bold text-slate-500 mb-1 uppercase">Total Período</p>
            <h3 className="text-3xl font-black text-blue-600">R$ {stats.total.toFixed(2)}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
          {isManager && (
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input 
                    placeholder="Filtrar por colaborador..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none"
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                  />
              </div>
          )}
          <select 
            className="px-4 py-2 border border-slate-200 rounded-lg bg-white outline-none font-medium"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
              <option value="ALL">Todos os Status</option>
              <option value={CommissionStatus.PENDING}>Pendente</option>
              <option value={CommissionStatus.PAID}>Pago</option>
          </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="p-4">Data/Hora</th>
                        <th className="p-4">Colaborador</th>
                        <th className="p-4">OS / Paciente</th>
                        <th className="p-4">Setor</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4">Status</th>
                        {isManager && <th className="p-4 text-center">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredCommissions.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-sm text-slate-600">
                                <div className="flex items-center gap-1 font-medium">{new Date(rec.createdAt).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400">{new Date(rec.createdAt).toLocaleTimeString()}</div>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-slate-800">{rec.userName}</div>
                            </td>
                            <td className="p-4">
                                <div className="font-mono font-bold text-blue-600">{rec.osNumber}</div>
                                <div className="text-xs text-slate-500">{rec.patientName}</div>
                            </td>
                            <td className="p-4">
                                <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase">{rec.sector}</span>
                            </td>
                            <td className="p-4 text-right font-black text-slate-800">R$ {rec.amount.toFixed(2)}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${rec.status === CommissionStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {rec.status === CommissionStatus.PAID ? 'PAGO' : 'PENDENTE'}
                                </span>
                            </td>
                            {isManager && (
                                <td className="p-4 text-center">
                                    {rec.status === CommissionStatus.PENDING && (
                                        <button 
                                            onClick={() => updateCommissionStatus(rec.id, CommissionStatus.PAID)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Marcar como Pago"
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                    {filteredCommissions.length === 0 && (
                        <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">Nenhum registro de comissão encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
