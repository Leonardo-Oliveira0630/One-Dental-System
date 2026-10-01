
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { UserRole, CommissionStatus, Job } from '../types';
import { DollarSign, CheckCircle, Clock, Calendar, User, Search, Filter, Download, FileText, FileSpreadsheet, Users, Layers, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface EnrichedItemExecutionDetail {
  serviceTypeName: string;
  stagesExecuted: string[];
  isBaseOnly: boolean;
  quantity: number;
}

interface EnrichedCommission {
  id: string;
  ids: string[];
  createdAt: Date;
  userId: string;
  userName: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  dentistName: string;
  serviceTypes: string;
  executedDetails: EnrichedItemExecutionDetail[];
  quantity: number;
  sector: string;
  amount: number;
  status: CommissionStatus;
}

export const Commissions = () => {
  const { t } = useTranslation();
  const { commissions, currentUser, updateCommissionStatus, deleteCommissionRecord, allUsers, jobs, activeOrganization } = useApp();
  const [filterUser, setFilterUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [consolidateByJob, setConsolidateByJob] = useState(true);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const isManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SUPER_ADMIN || !!currentUser?.permissions?.includes('commissions:view');

  // Consolidar e enriquecer dados de comissões por caso (jobId), colaborador (userId) e status
  const enrichedCommissions: EnrichedCommission[] = useMemo(() => {
    // 1. Agrupar lançamentos para evitar que o pagamento do mesmo caso/setor fique dividido ao meio
    const groupsMap = new Map<string, {
      ids: string[];
      comm: any;
      totalAmount: number;
      latestCreatedAt: Date;
      sectors: Set<string>;
      itemsDirect: { itemName?: string; stageName?: string; quantity?: number; itemId?: string; amount?: number }[];
    }>();

    commissions.forEach(comm => {
      // Se consolidateByJob for true, agrupa todos os lançamentos da mesma OS + Colaborador + Status
      const groupKey = (consolidateByJob && comm.jobId) 
        ? `${comm.jobId}_${comm.userId}_${comm.status}`
        : comm.id;

      const commDate = new Date(comm.createdAt);
      const existing = groupsMap.get(groupKey);
      if (existing) {
        existing.ids.push(comm.id);
        existing.totalAmount += (comm.amount || 0);
        if (commDate > existing.latestCreatedAt) {
          existing.latestCreatedAt = commDate;
        }
        if (comm.sector) existing.sectors.add(comm.sector);
        if (comm.itemName || comm.stageName || comm.itemId) {
          existing.itemsDirect.push({ 
            itemId: comm.itemId, 
            itemName: comm.itemName, 
            stageName: comm.stageName, 
            quantity: comm.quantity,
            amount: comm.amount
          });
        }
      } else {
        const sectors = new Set<string>();
        if (comm.sector) sectors.add(comm.sector);
        groupsMap.set(groupKey, {
          ids: [comm.id],
          comm: comm,
          totalAmount: comm.amount || 0,
          latestCreatedAt: commDate,
          sectors: sectors,
          itemsDirect: (comm.itemName || comm.stageName || comm.itemId) 
            ? [{ 
                itemId: comm.itemId, 
                itemName: comm.itemName, 
                stageName: comm.stageName, 
                quantity: comm.quantity,
                amount: comm.amount
              }] 
            : []
        });
      }
    });

    // 2. Enriquecer cada grupo consolidado ou lançamento individual
    return Array.from(groupsMap.values()).map(group => {
      const comm = group.comm;
      const job = jobs.find(j => j.id === comm.jobId);
      let quantity = 0;
      let serviceTypes = 'N/A';
      const executedDetails: EnrichedItemExecutionDetail[] = [];
      const textDetails: string[] = [];

      const isConsolidated = group.ids.length > 1 || consolidateByJob;

      if (job && job.itemExecutions) {
        // Obter as execuções do usuário no trabalho
        let userExecutions = job.itemExecutions.filter(
          (e: any) => e.userId === comm.userId
        );

        if (!isConsolidated) {
          // No modo individual, se tiver itemId ou setor específico no registro, filtra por ele
          if (comm.itemId) {
            userExecutions = userExecutions.filter((e: any) => e.itemId === comm.itemId);
          } else if (comm.sector) {
            const bySector = userExecutions.filter((e: any) => e.sector === comm.sector);
            if (bySector.length > 0) userExecutions = bySector;
          }
        }

        userExecutions.forEach((exec: any) => {
          const item = job.items?.find((i: any) => i.id === exec.itemId);
          if (item) {
            if (item.commissionDisabled) return;
            if (exec.sector && item.sectorCommissionDisabled?.[exec.sector]) return;

            const sec = exec.sector || comm.sector;
            const secQty = (item.sectorQuantities && sec && item.sectorQuantities[sec] !== undefined)
              ? item.sectorQuantities[sec]
              : item.quantity;

            const stages = exec.executedStages || [];
            if (stages.length > 0) {
              // Etapas específicas executadas
              let itemStageQty = secQty;
              stages.forEach((stage: string) => {
                let stageQty = secQty;
                if (sec && item.stageQuantities?.[sec]?.[stage] !== undefined) {
                  const customQty = Number(item.stageQuantities[sec][stage]);
                  if (!isNaN(customQty) && customQty > 0) {
                    stageQty = (customQty === 1 && secQty > 1) ? secQty : customQty;
                  }
                }
                itemStageQty = stageQty;
                quantity += stageQty;
              });

              executedDetails.push({
                serviceTypeName: item.name,
                stagesExecuted: stages,
                isBaseOnly: false,
                quantity: itemStageQty
              });

              textDetails.push(`${item.name} (Etapa: ${stages.join(', ')} - Qtd: ${itemStageQty})`);
            } else if (exec.isBaseChecked !== false) {
              // Serviço base executado
              quantity += secQty;
              executedDetails.push({
                serviceTypeName: item.name,
                stagesExecuted: [],
                isBaseOnly: true,
                quantity: secQty
              });
              textDetails.push(`${item.name} (Serviço Base - Qtd: ${secQty})`);
            }
          }
        });

        if (textDetails.length > 0) {
          serviceTypes = textDetails.join(' | ');
        }
      }

      // Fallback se não encontrar nas execuções da OS
      if (executedDetails.length === 0) {
        if (group.itemsDirect.length > 0) {
          group.itemsDirect.forEach(d => {
            const sName = d.itemName || 'Serviço';
            const stgs = d.stageName ? [d.stageName] : [];
            const q = d.quantity || 1;
            quantity += q;
            executedDetails.push({
              serviceTypeName: sName,
              stagesExecuted: stgs,
              isBaseOnly: stgs.length === 0,
              quantity: q
            });
            textDetails.push(stgs.length > 0 ? `${sName} (Etapa: ${stgs.join(', ')} - Qtd: ${q})` : `${sName} (Qtd: ${q})`);
          });
          serviceTypes = textDetails.join(' | ');
        } else if (comm.itemName || comm.stageName) {
          const sName = comm.itemName || 'Serviço';
          const stgs = comm.stageName ? [comm.stageName] : [];
          const q = comm.quantity || 1;
          quantity = q;
          executedDetails.push({
            serviceTypeName: sName,
            stagesExecuted: stgs,
            isBaseOnly: stgs.length === 0,
            quantity: q
          });
          serviceTypes = stgs.length > 0 ? `${sName} (Etapa: ${stgs.join(', ')} - Qtd: ${q})` : `${sName} (Qtd: ${q})`;
        } else if (job && job.items && job.items.length > 0) {
          job.items.forEach(i => {
            if (i.commissionDisabled) return;
            const q = i.quantity;
            quantity += q;
            executedDetails.push({
              serviceTypeName: i.name,
              stagesExecuted: [],
              isBaseOnly: true,
              quantity: q
            });
          });
          serviceTypes = executedDetails.map(d => `${d.serviceTypeName} (Qtd: ${d.quantity})`).join(' | ');
        }
      }

      const displaySector = group.sectors.size > 0 
        ? Array.from(group.sectors).join(', ') 
        : (comm.sector || 'Geral');

      return {
        id: comm.id,
        ids: group.ids,
        userId: comm.userId,
        userName: comm.userName,
        jobId: comm.jobId,
        osNumber: comm.osNumber || (job?.osNumber || 'N/A'),
        patientName: comm.patientName || (job?.patientName || 'N/A'),
        dentistName: job?.dentistName || 'N/A',
        serviceTypes: serviceTypes,
        executedDetails: executedDetails,
        quantity: quantity || comm.quantity || 1,
        sector: displaySector,
        amount: group.totalAmount,
        status: comm.status,
        createdAt: group.latestCreatedAt
      };
    });
  }, [commissions, jobs, consolidateByJob]);

  const handleMarkAsPaid = async (rec: EnrichedCommission) => {
    if (rec.ids && rec.ids.length > 0) {
      await Promise.all(rec.ids.map(id => updateCommissionStatus(id, CommissionStatus.PAID)));
    } else {
      await updateCommissionStatus(rec.id, CommissionStatus.PAID);
    }
  };

  const handleDeleteCommission = async (rec: EnrichedCommission) => {
    if (!window.confirm(t('commissions.confirmDelete', 'Tem certeza que deseja excluir este registro de comissão?'))) return;
    if (rec.ids && rec.ids.length > 0) {
      await Promise.all(rec.ids.map(id => deleteCommissionRecord(id)));
    } else {
      await deleteCommissionRecord(rec.id);
    }
  };

  // Filtragem
  const filteredCommissions = useMemo(() => {
    return enrichedCommissions.filter(c => {
      if (!isManager && c.userId !== currentUser?.id) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (filterUser && c.userId !== filterUser) return false;
      
      if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (c.createdAt < from) return false;
      }
      if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (c.createdAt > to) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [enrichedCommissions, isManager, currentUser, statusFilter, filterUser, dateFrom, dateTo]);

  const stats = {
    pending: filteredCommissions.filter(c => c.status === CommissionStatus.PENDING).reduce((acc, curr) => acc + curr.amount, 0),
    paid: filteredCommissions.filter(c => c.status === CommissionStatus.PAID).reduce((acc, curr) => acc + curr.amount, 0),
    total: filteredCommissions.reduce((acc, curr) => acc + curr.amount, 0)
  };

  // Exportar para Excel (Geral)
  const exportToExcel = () => {
    const data = filteredCommissions.map(c => ({
      [t('commissions.excelDate', 'Data')]: c.createdAt.toLocaleDateString(),
      [t('commissions.excelTime', 'Hora')]: c.createdAt.toLocaleTimeString(),
      [t('commissions.excelCollaborator', 'Colaborador')]: c.userName,
      [t('commissions.excelOs', 'OS')]: c.osNumber,
      [t('commissions.excelPatient', 'Paciente')]: c.patientName,
      [t('commissions.excelDentist', 'Dentista')]: c.dentistName,
      [t('commissions.excelServiceAndStage', 'Serviço / Etapa Executada')]: c.serviceTypes,
      [t('commissions.excelQty', 'Qtd')]: c.quantity,
      [t('commissions.excelSector', 'Setor')]: c.sector,
      [t('commissions.excelAmount', 'Valor')]: c.amount,
      [t('commissions.excelStatus', 'Status')]: c.status === CommissionStatus.PAID ? t('commissions.statusPaid', 'PAGO') : t('commissions.statusPending', 'PENDENTE')
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

    const formatServicesForPdf = (c: EnrichedCommission) => {
      if (c.executedDetails && c.executedDetails.length > 0) {
        return c.executedDetails.map(d => {
          const stg = d.stagesExecuted.length > 0 ? ` (${d.stagesExecuted.join(', ')})` : '';
          return `${d.serviceTypeName}${stg} [Qtd: ${d.quantity}]`;
        }).join('\n');
      }
      return c.serviceTypes;
    };

    if (mode === 'GENERAL') {
      doc.text(t('commissions.pdfGeneralTitle', "Extrato de Comissões - Geral"), 14, 15);
      doc.setFontSize(10);
      doc.text(`${t('commissions.pdfGeneratedAt', 'Gerado em:')} ${new Date().toLocaleString()}`, 14, 22);

      const tableData = filteredCommissions.map(c => [
        c.createdAt.toLocaleDateString(),
        c.userName,
        c.osNumber,
        c.patientName,
        c.dentistName,
        formatServicesForPdf(c),
        c.quantity,
        c.sector,
        `R$ ${c.amount.toFixed(2)}`,
        c.status === CommissionStatus.PAID ? t('commissions.statusPaid', 'PAGO') : t('commissions.statusPending', 'PENDENTE')
      ]);

      autoTable(doc, {
        head: [[
          t('commissions.excelDate', 'Data'), 
          t('commissions.excelCollaborator', 'Colaborador'), 
          t('commissions.excelOs', 'OS'), 
          t('commissions.excelPatient', 'Paciente'), 
          t('commissions.excelDentist', 'Dentista'), 
          t('commissions.serviceAndStage', 'Serviço / Etapa Executada'), 
          t('commissions.excelQty', 'Qtd'), 
          t('commissions.excelSector', 'Setor'), 
          t('commissions.excelAmount', 'Valor'), 
          t('commissions.excelStatus', 'Status')
        ]],
        body: tableData,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Totais
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`${t('commissions.totalPending', 'Total Pendente:')} R$ ${stats.pending.toFixed(2)}`, 14, finalY);
      doc.text(`${t('commissions.totalPaid', 'Total Pago:')} R$ ${stats.paid.toFixed(2)}`, 14, finalY + 5);
      doc.text(`${t('commissions.totalGeneral', 'Total Geral:')} R$ ${stats.total.toFixed(2)}`, 14, finalY + 10);

      doc.save(t('commissions.pdfGeneralFilename', "Comissoes_Geral.pdf"));
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
        doc.text(`${t('commissions.pdfExtratoUser', 'Extrato de Comissões:')} ${userName}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`${t('commissions.pdfGeneratedAt', 'Gerado em:')} ${new Date().toLocaleString()}`, 14, 22);

        const tableData = userCommissions.map(c => [
          c.createdAt.toLocaleDateString(),
          c.osNumber,
          c.patientName,
          c.dentistName,
          formatServicesForPdf(c),
          c.quantity,
          c.sector,
          `R$ ${c.amount.toFixed(2)}`,
          c.status === CommissionStatus.PAID ? t('commissions.statusPaid', 'PAGO') : t('commissions.statusPending', 'PENDENTE')
        ]);

        autoTable(doc, {
          head: [[
            t('commissions.excelDate', 'Data'), 
            t('commissions.excelOs', 'OS'), 
            t('commissions.excelPatient', 'Paciente'), 
            t('commissions.excelDentist', 'Dentista'), 
            t('commissions.serviceAndStage', 'Serviço / Etapa Executada'), 
            t('commissions.excelQty', 'Qtd'), 
            t('commissions.excelSector', 'Setor'), 
            t('commissions.excelAmount', 'Valor'), 
            t('commissions.excelStatus', 'Status')
          ]],
          body: tableData,
          startY: 25,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text(`${t('commissions.totalPending', 'Total Pendente:')} R$ ${userPending.toFixed(2)}`, 14, finalY);
        doc.text(`${t('commissions.totalPaid', 'Total Pago:')} R$ ${userPaid.toFixed(2)}`, 14, finalY + 5);
        doc.text(`${t('commissions.totalGeneral', 'Total Geral:')} R$ ${userTotal.toFixed(2)}`, 14, finalY + 10);
      });

      doc.save(t('commissions.pdfBatchFilename', "Comissoes_Por_Funcionario.pdf"));
    }
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('commissions.title', 'Extrato de Comissões')}</h1>
          <p className="text-slate-500">{t('commissions.subtitle', 'Relatório de ganhos por produção e produtividade.')}</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm"
          >
            <Download size={18} /> {t('commissions.export', 'Exportar Relatório')}
          </button>
          
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
              <button onClick={exportToExcel} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700">
                <FileSpreadsheet size={16} className="text-green-600" /> {t('commissions.exportExcel', 'Excel (Geral)')}
              </button>
              <button onClick={() => exportToPDF('GENERAL')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700">
                <FileText size={16} className="text-red-600" /> {t('commissions.exportPdf', 'PDF (Geral)')}
              </button>
              <button onClick={() => exportToPDF('BATCH')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 border-t border-slate-100">
                <Users size={16} className="text-blue-600" /> {t('commissions.exportByEmployee', 'PDF (Por Funcionário)')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:p-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-bold text-slate-500 mb-1 uppercase">{t('commissions.pendingAmount', 'A Receber')}</p>
            <h3 className="text-3xl font-black text-orange-600">R$ {stats.pending.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-bold text-slate-500 mb-1 uppercase">{t('commissions.paidAmount', 'Pago (Acumulado)')}</p>
            <h3 className="text-3xl font-black text-green-600">R$ {stats.paid.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-bold text-slate-500 mb-1 uppercase">{t('commissions.totalAmount', 'Total Período')}</p>
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
                    <option value="">{t('commissions.allTechnicians', 'Todos os Colaboradores')}</option>
                    {allUsers
                      .filter(u => u.role !== UserRole.CLIENT)
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
                <option value="ALL">{t('commissions.allStatuses', 'Todos os Status')}</option>
                <option value={CommissionStatus.PENDING}>{t('commissions.statusPending', 'Pendente')}</option>
                <option value={CommissionStatus.PAID}>{t('commissions.statusPaid', 'Pago')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white font-medium text-slate-600 text-sm w-full md:w-auto"
            />
            <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white font-medium text-slate-600 text-sm w-full md:w-auto"
            />
          </div>

          <button
            type="button"
            onClick={() => setConsolidateByJob(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors ${
              consolidateByJob 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={consolidateByJob ? t('commissions.consolidatedTitle', 'Visualizando consolidado por OS (Evita pagamentos divididos)') : t('commissions.detailedTitle', 'Visualizando lançamentos individuais')}
          >
            <Layers size={18} className={consolidateByJob ? 'text-blue-600' : 'text-slate-400'} />
            <span className="whitespace-nowrap">
              {consolidateByJob ? t('commissions.consolidatedView', 'Consolidado por OS') : t('commissions.detailedView', 'Lançamentos Detalhados')}
            </span>
          </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="p-4">{t('commissions.date', 'Data')}</th>
                        <th className="p-4">{t('commissions.technician', 'Colaborador')}</th>
                        <th className="p-4">{t('commissions.jobDetails', 'Detalhes do Trabalho')}</th>
                        <th className="p-4">{t('commissions.serviceAndStage', 'Serviço / Etapa Executada')}</th>
                        <th className="p-4">{t('commissions.sector', 'Setor')}</th>
                        <th className="p-4 text-right">{t('commissions.amount', 'Valor')}</th>
                        <th className="p-4">{t('commissions.status', 'Status')}</th>
                        {isManager && <th className="p-4 text-center">{t('common.actions', 'Ações')}</th>}
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
                                {rec.executedDetails && rec.executedDetails.length > 0 ? (
                                  <div className="flex flex-col gap-2.5">
                                    {rec.executedDetails.map((detail, idx) => (
                                      <div key={idx} className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 leading-tight">
                                          {detail.serviceTypeName}
                                        </span>
                                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md mt-1 w-fit border border-blue-100">
                                          {detail.stagesExecuted && detail.stagesExecuted.length > 0
                                            ? `Etapa${detail.stagesExecuted.length > 1 ? 's' : ''}: ${detail.stagesExecuted.join(', ')}`
                                            : 'Etapa: Produção Base'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                          {t('commissions.quantity', 'Qtd')}: {detail.quantity}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800" title={rec.serviceTypes}>{rec.serviceTypes}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{t('commissions.quantity', 'Qtd')}: {rec.quantity}</span>
                                  </div>
                                )}
                            </td>
                            <td className="p-4">
                                <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase">{rec.sector}</span>
                            </td>
                            <td className="p-4 text-right font-black text-slate-800 whitespace-nowrap">R$ {rec.amount.toFixed(2)}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${rec.status === CommissionStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {rec.status === CommissionStatus.PAID ? t('commissions.statusPaid', 'PAGO') : t('commissions.statusPending', 'PENDENTE')}
                                </span>
                            </td>
                            {isManager && (
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {rec.status === CommissionStatus.PENDING && (
                                          <button 
                                              onClick={() => handleMarkAsPaid(rec)}
                                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                              title={t('commissions.markAsPaid', 'Marcar como Pago')}
                                          >
                                              <CheckCircle size={20} />
                                          </button>
                                      )}
                                      <button
                                          onClick={() => handleDeleteCommission(rec)}
                                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title={t('common.delete', 'Excluir')}
                                      >
                                          <Trash2 size={18} />
                                      </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                    {filteredCommissions.length === 0 && (
                        <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic">{t('commissions.empty', 'Nenhum registro de comissão encontrado.')}</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );

};
