
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, CommissionStatus, Job } from '../types';
import { DollarSign, CheckCircle, Clock, Calendar, User, Search, Filter, Download, FileText, FileSpreadsheet, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface EnrichedCommission {
  id: string;
  createdAt: Date;
  userId: string;
  userName: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  dentistName: string;
  serviceTypes: string;
  quantity: number;
  sector: string;
  amount: number;
  status: CommissionStatus;
}

export const Commissions = () => {
  const { commissions, currentUser, updateCommissionStatus, allUsers, jobs, activeOrganization } = useApp();
  const [filterUser, setFilterUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const isManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SUPER_ADMIN;

  // Enriquecer dados com informações do Job
  const enrichedCommissions: EnrichedCommission[] = useMemo(() => {
    return commissions.map(comm => {
      const job = jobs.find(j => j.id === comm.jobId);
      const quantity = job?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;
      const serviceTypes = job?.items.map(item => item.name).join(', ') || 'N/A';
      
      return {
        ...comm,
        dentistName: job?.dentistName || 'N/A',
        serviceTypes: serviceTypes,
        quantity: quantity,
        createdAt: new Date(comm.createdAt)
      };
    });
  }, [commissions, jobs]);

  // Filtragem
  const filteredCommissions = useMemo(() => {
    return enrichedCommissions.filter(c => {
      if (!isManager && c.userId !== currentUser?.id) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (filterUser && c.userId !== filterUser) return false;
      return true;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [enrichedCommissions, isManager, currentUser, statusFilter, filterUser]);

  const stats = {
    pending: filteredCommissions.filter(c => c.status === CommissionStatus.PENDING).reduce((acc, curr) => acc + curr.amount, 0),
    paid: filteredCommissions.filter(c => c.status === CommissionStatus.PAID).reduce((acc, curr) => acc + curr.amount, 0),
    total: filteredCommissions.reduce((acc, curr) => acc + curr.amount, 0)
  };

  // Exportar para Excel (Geral)
  const exportToExcel = () => {
    const data = filteredCommissions.map(c => ({
      'Data': c.createdAt.toLocaleDateString(),
      'Hora': c.createdAt.toLocaleTimeString(),
      'Colaborador': c.userName,
      'OS': c.osNumber,
      'Paciente': c.patientName,
      'Dentista': c.dentistName,
      'Serviços': c.serviceTypes,
      'Qtd': c.quantity,
      'Setor': c.sector,
      'Valor': c.amount,
      'Status': c.status === CommissionStatus.PAID ? 'PAGO' : 'PENDENTE'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comissões");
    XLSX.writeFile(wb, "Extrato_Comissoes.xlsx");
    setIsExportMenuOpen(false);
  };

  // Exportar para PDF (Geral ou Batch)
  const exportToPDF = (mode: 'GENERAL' | 'BATCH') => {
    const doc = new jsPDF();

    if (mode === 'GENERAL') {
      doc.text("Extrato de Comissões - Geral", 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

      const tableData = filteredCommissions.map(c => [
        c.createdAt.toLocaleDateString(),
        c.userName,
        c.osNumber,
        c.patientName,
        c.dentistName,
        c.serviceTypes,
        c.quantity,
        c.sector,
        `R$ ${c.amount.toFixed(2)}`,
        c.status === CommissionStatus.PAID ? 'PAGO' : 'PENDENTE'
      ]);

      autoTable(doc, {
        head: [['Data', 'Colaborador', 'OS', 'Paciente', 'Dentista', 'Serviço', 'Qtd', 'Setor', 'Valor', 'Status']],
        body: tableData,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Totais
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Total Pendente: R$ ${stats.pending.toFixed(2)}`, 14, finalY);
      doc.text(`Total Pago: R$ ${stats.paid.toFixed(2)}`, 14, finalY + 5);
      doc.text(`Total Geral: R$ ${stats.total.toFixed(2)}`, 14, finalY + 10);

      doc.save("Comissoes_Geral.pdf");
    } else if (mode === 'BATCH') {
      // Agrupar por usuário
      const grouped = filteredCommissions.reduce((acc, curr) => {
        if (!acc[curr.userId]) acc[curr.userId] = [];
        acc[curr.userId].push(curr);
        return acc;
      }, {} as Record<string, EnrichedCommission[]>);

      let isFirstPage = true;

      Object.entries(grouped).forEach(([userId, userCommissions]) => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        const userName = userCommissions[0].userName;
        const userTotal = userCommissions.reduce((acc, c) => acc + c.amount, 0);
        const userPending = userCommissions.filter(c => c.status === CommissionStatus.PENDING).reduce((acc, c) => acc + c.amount, 0);
        const userPaid = userCommissions.filter(c => c.status === CommissionStatus.PAID).reduce((acc, c) => acc + c.amount, 0);

        doc.setFontSize(16);
        doc.text(`Extrato de Comissões: ${userName}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

        const tableData = userCommissions.map(c => [
          c.createdAt.toLocaleDateString(),
          c.osNumber,
          c.patientName,
          c.dentistName,
          c.serviceTypes,
          c.quantity,
          c.sector,
          `R$ ${c.amount.toFixed(2)}`,
          c.status === CommissionStatus.PAID ? 'PAGO' : 'PENDENTE'
        ]);

        autoTable(doc, {
          head: [['Data', 'OS', 'Paciente', 'Dentista', 'Serviço', 'Qtd', 'Setor', 'Valor', 'Status']],
          body: tableData,
          startY: 25,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text(`Total Pendente: R$ ${userPending.toFixed(2)}`, 14, finalY);
        doc.text(`Total Pago: R$ ${userPaid.toFixed(2)}`, 14, finalY + 5);
        doc.text(`Total Geral: R$ ${userTotal.toFixed(2)}`, 14, finalY + 10);
      });

      doc.save("Comissoes_Por_Funcionario.pdf");
    }
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Extrato de Comissões</h1>
          <p className="text-slate-500">Relatório de ganhos por produção e produtividade.</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm"
          >
            <Download size={18} /> Exportar Relatório
          </button>
          
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              <button onClick={exportToExcel} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700">
                <FileSpreadsheet size={16} className="text-green-600" /> Excel (Geral)
              </button>
              <button onClick={() => exportToPDF('GENERAL')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700">
                <FileText size={16} className="text-red-600" /> PDF (Geral)
              </button>
              <button onClick={() => exportToPDF('BATCH')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 border-t border-slate-100">
                <Users size={16} className="text-blue-600" /> PDF (Por Funcionário)
              </button>
            </div>
          )}
        </div>
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
                  <User className="absolute left-3 top-3 text-slate-400" size={18} />
                  <select 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none bg-white appearance-none"
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                  >
                    <option value="">Todos os Colaboradores</option>
                    {allUsers
                      .filter(u => u.role !== UserRole.CLIENT && u.organizationId === (activeOrganization?.id || currentUser?.organizationId))
                      .map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))
                    }
                  </select>
              </div>
          )}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
            <select 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white outline-none font-medium appearance-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
                <option value="ALL">Todos os Status</option>
                <option value={CommissionStatus.PENDING}>Pendente</option>
                <option value={CommissionStatus.PAID}>Pago</option>
            </select>
          </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="p-4">Data</th>
                        <th className="p-4">Colaborador</th>
                        <th className="p-4">Detalhes do Trabalho</th>
                        <th className="p-4">Serviço / Qtd</th>
                        <th className="p-4">Setor</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4">Status</th>
                        {isManager && <th className="p-4 text-center">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredCommissions.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                                <div className="flex items-center gap-1 font-medium">{rec.createdAt.toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400">{rec.createdAt.toLocaleTimeString()}</div>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-slate-800">{rec.userName}</div>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="font-mono font-bold text-blue-600 text-xs">{rec.osNumber}</span>
                                  <span className="text-sm font-medium text-slate-900">{rec.patientName}</span>
                                  <span className="text-[10px] text-slate-500 uppercase">Dr. {rec.dentistName}</span>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-slate-700 line-clamp-1" title={rec.serviceTypes}>{rec.serviceTypes}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{rec.quantity} Elementos</span>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase">{rec.sector}</span>
                            </td>
                            <td className="p-4 text-right font-black text-slate-800 whitespace-nowrap">R$ {rec.amount.toFixed(2)}</td>
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
                        <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic">Nenhum registro de comissão encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
