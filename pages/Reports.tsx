import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Download, Filter, Calendar, Users, Building2, Package, Search, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { JobStatus } from '../types';

const STATUS_TRANSLATION: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Produção',
  WAITING_APPROVAL: 'Aguardando Aprovação',
  COMPLETED: 'Finalizado',
  DELIVERED: 'Entregue',
  REJECTED: 'Rejeitado',
  CANCELED: 'Cancelado',
  RETURNED: 'Devolvido',
  SECTOR_TRANSITION: 'Em Transição'
};

export default function Reports() {
  const { jobs, allUsers, manualDentists, sectors, jobTypes, currentOrg, activeOrganization, currentUser } = useApp();
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateType, setDateType] = useState<'CREATED' | 'DUE'>('CREATED');
  const [dentistId, setDentistId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [sector, setSector] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [variationFilters, setVariationFilters] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'DATE' | 'JOB_TYPE'>('DATE');
  const [reportType, setReportType] = useState<'PRODUCTION' | 'DETAILED_ORDERS' | 'SERVICE_TYPES'>('PRODUCTION');

  const selectedJobType = useMemo(() => {
    return jobTypes.find(jt => jt.id === jobTypeId);
  }, [jobTypes, jobTypeId]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Date filter
      const jobDate = new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate);
      jobDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        // Fix timezone offset for start date
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        start.setHours(0, 0, 0, 0);
        if (jobDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        // Fix timezone offset for end date
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(0, 0, 0, 0);
        if (jobDate > end) return false;
      }

      // Dentist filter
      if (dentistId && job.dentistId !== dentistId) return false;

      // Collaborator filter
      if (collaboratorId) {
        const hasCollaborator = job.history.some(h => h.userId === collaboratorId);
        if (!hasCollaborator) return false;
      }

      // Sector filter
      if (sector && job.currentSector !== sector) return false;

      // Job Type & Variation filter
      if (jobTypeId) {
        const hasMatchingItem = job.items.some(item => {
          if (item.jobTypeId !== jobTypeId) return false;
          // Check variation filters
          for (const [groupId, optionId] of Object.entries(variationFilters)) {
            if (optionId) {
              const hasOpt = item.selectedVariationIds?.includes(optionId);
              if (!hasOpt) return false;
            }
          }
          return true;
        });
        if (!hasMatchingItem) return false;
      }

      // Status filter
      if (statusFilter) {
        if (statusFilter === 'PENDING' && job.status !== 'PENDING') return false;
        if (statusFilter === 'IN_PROGRESS' && job.status !== 'IN_PROGRESS' && job.status !== 'SECTOR_TRANSITION') return false;
        if (statusFilter === 'DELAYED') {
          if (job.status === 'COMPLETED' || job.status === 'DELIVERED' || job.status === 'CANCELED') return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(job.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due >= today) return false;
        }
      }

      // Urgency filter
      if (urgencyFilter) {
        if (urgencyFilter === 'URGENT' && job.urgency !== 'HIGH' && job.urgency !== 'VIP') return false;
        if (urgencyFilter === 'NORMAL' && job.urgency !== 'NORMAL' && job.urgency !== 'LOW') return false;
      }

      return true;
    });
  }, [jobs, startDate, endDate, dateType, dentistId, collaboratorId, sector, jobTypeId, variationFilters, statusFilter, urgencyFilter]);

  // Group jobs
  const groupedJobs = useMemo(() => {
    const groups: Record<string, typeof jobs> = {};
    
    filteredJobs.forEach(job => {
      let key = '';
      if (groupBy === 'DATE') {
        key = new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR');
      } else if (groupBy === 'JOB_TYPE') {
        key = job.items.length > 0 ? job.items[0].name : 'Sem tipo';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(job);
    });

    // Sort jobs within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        // Sort by date first
        const dateA = new Date(dateType === 'CREATED' ? a.createdAt : a.dueDate).getTime();
        const dateB = new Date(dateType === 'CREATED' ? b.createdAt : b.dueDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        
        // Then sort by job type
        const typeA = a.items.length > 0 ? a.items[0].name : '';
        const typeB = b.items.length > 0 ? b.items[0].name : '';
        return typeA.localeCompare(typeB);
      });
    });

    // Sort the groups themselves
    const sortedGroups: Record<string, typeof jobs> = {};
    Object.keys(groups).sort((a, b) => {
      if (groupBy === 'DATE') {
        // Parse DD/MM/YYYY to sort
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA).getTime();
        const dateB = new Date(yearB, monthB - 1, dayB).getTime();
        return dateA - dateB;
      } else {
        return a.localeCompare(b);
      }
    }).forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredJobs, groupBy, dateType]);

  const serviceStats = useMemo(() => {
    if (reportType !== 'SERVICE_TYPES') return null;
    const stats: Record<string, { quantity: number; totalValue: number }> = {};
    filteredJobs.forEach(job => {
      job.items.forEach((item: any) => {
        const typeId = item.jobTypeId || item.name;
        const typeName = jobTypes.find(t => t.id === typeId)?.name || item.name;
        if (!stats[typeName]) {
          stats[typeName] = { quantity: 0, totalValue: 0 };
        }
        stats[typeName].quantity += item.quantity || 1;
        stats[typeName].totalValue += (item.price * (item.quantity || 1)) - (item.appliedDiscount || 0);
      });
    });
    return stats;
  }, [filteredJobs, reportType, jobTypes]);

  const generatePDF = () => {
    const isLandscape = reportType === 'DETAILED_ORDERS';
    const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait');
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    let title = `Relatório de Produção - ${orgName}`;
    if (reportType === 'DETAILED_ORDERS') title = `Relatório Detalhado de Pedidos - ${orgName}`;
    if (reportType === 'SERVICE_TYPES') title = `Relatório de Tipos de Serviço - ${orgName}`;
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    
    if (reportType === 'SERVICE_TYPES' && serviceStats) {
        doc.text(`Total de trabalhos: ${filteredJobs.length}`, 14, 36);
        
        const tableData = Object.entries(serviceStats)
          .sort((a, b) => b[1].quantity - a[1].quantity)
          .map(([name, stats]) => [
            name,
            stats.quantity.toString(),
            `R$ ${stats.totalValue.toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: 45,
          head: [['Tipo de Serviço', 'Quantidade Produzida', 'Valor Total Produzido']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 10, cellPadding: 4 },
        });
        
        doc.save(`relatorio-tipos-servico-${new Date().getTime()}.pdf`);
        return;
    }

    doc.text(`Filtros: ${filteredJobs.length} trabalhos encontrados`, 14, 36);

    let yPos = 45;

    Object.entries(groupedJobs).forEach(([groupName, groupJobs]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(groupName, 14, yPos);
      yPos += 5;

      if (reportType === 'DETAILED_ORDERS') {
        const tableData: any[] = [];
        groupJobs.forEach(job => {
          let entryDate = new Date(job.createdAt).toLocaleDateString('pt-BR');
          let finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';
          
          let itemsText = job.items.map(item => {
            const jt = jobTypes.find(t => t.id === item.jobTypeId);
            return `${item.quantity}x ${jt ? jt.name : item.name}`;
          }).join('\n');
          
          let pricesText = job.items.map(item => {
            return `R$ $(((item.price * item.quantity) - (item.appliedDiscount || 0)).toFixed(2))`;
          }).join('\n');

          tableData.push([
            job.osNumber || '-',
            job.boxNumber || '-',
            job.dentistName,
            job.patientName,
            itemsText,
            pricesText,
            `R$ ${job.totalValue.toFixed(2)}`,
            entryDate,
            finishDate
          ]);
        });

        autoTable(doc, {
          startY: yPos,
          head: [['OS', 'Caixa', 'Dentista', 'Paciente', 'Serviços', 'Valor Serviço', 'Valor Total', 'Entrada', 'Finalização']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] }, // Amber 500
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            4: { cellWidth: 40 }, // Serviços
            5: { cellWidth: 20 }, // Valor Serviço
          },
          margin: { top: 10 },
        });
      } else {
        const tableData = groupJobs.map(job => [
          job.osNumber || '-',
          job.patientName,
          job.dentistName,
          new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR'),
          job.currentSector || 'Recepção',
          STATUS_TRANSLATION[job.status] || job.status
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['OS', 'Paciente', 'Dentista', dateType === 'CREATED' ? 'Entrada' : 'Entrega', 'Setor', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 8 },
          margin: { top: 10 },
        });
      }

      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > (reportType === 'DETAILED_ORDERS' ? 180 : 270)) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(reportType === 'DETAILED_ORDERS' ? `relatorio-detalhado-${new Date().getTime()}.pdf` : `relatorio-producao-${new Date().getTime()}.pdf`);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDentistId('');
    setCollaboratorId('');
    setSector('');
    setJobTypeId('');
    setVariationFilters({});
    setStatusFilter('');
    setUrgencyFilter('');
  };

  return (
    <div className="p-4 md:p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <FileText className="text-indigo-600" />
            Relatórios de Produção
          </h1>
          <p className="text-slate-500 mt-1">Acompanhe e filtre a produção do laboratório</p>
        </div>
        <button 
          onClick={generatePDF}
          disabled={filteredJobs.length === 0}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} />
          Exportar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Filter size={20} className="text-slate-400" />
            Filtros
          </h2>
          <button onClick={clearFilters} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <X size={16} /> Limpar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Base</label>
            <select value={dateType} onChange={(e) => setDateType(e.target.value as any)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="CREATED">Data de Entrada</option>
              <option value="DUE">Data de Entrega</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Dentista</label>
            <select value={dentistId} onChange={(e) => setDentistId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Todos os Dentistas</option>
              {manualDentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Colaborador</label>
                <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Colaboradores</option>
                  {allUsers.filter(u => u.role !== 'CLIENT').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Setor</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Setores</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Status do Pedido</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="IN_PROGRESS">Em Produção</option>
                  <option value="DELAYED">Atrasado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Grau de Importância</label>
                <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todas as Prioridades</option>
                  <option value="NORMAL">Normal / Baixa</option>
                  <option value="URGENT">Urgente / VIP</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Trabalho</label>
                <select value={jobTypeId} onChange={(e) => { setJobTypeId(e.target.value); setVariationFilters({}); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Tipos</option>
                  {jobTypes.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                </select>
              </div>

              {selectedJobType && selectedJobType.variationGroups && selectedJobType.variationGroups.map(group => (
                <div key={group.id} className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-slate-500 uppercase">{group.name}</label>
                  <select 
                    value={variationFilters[group.id] || ''} 
                    onChange={(e) => setVariationFilters(prev => ({...prev, [group.id]: e.target.value}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Qualquer</option>
                    {group.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                  </select>
                </div>
              ))}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Relatório</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as any)} className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="PRODUCTION">Produção Básica</option>
              <option value="DETAILED_ORDERS">Pedidos Detalhado</option>
              <option value="SERVICE_TYPES">Tipos de Serviço Detalhado</option>
            </select>
          </div>

          {reportType !== 'SERVICE_TYPES' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Agrupar Por</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="DATE">Data</option>
              <option value="JOB_TYPE">Tipo de Trabalho</option>
            </select>
          </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Resultados ({filteredJobs.length} trabalhos)</h3>
        </div>
        
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-8 mt-4">
          {reportType === 'SERVICE_TYPES' && serviceStats ? (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-indigo-50 text-indigo-700 text-[10px] uppercase tracking-widest font-black">
                     <th className="p-3 rounded-l-lg">Tipo de Serviço</th>
                     <th className="p-3">Quantidade Produzida</th>
                     <th className="p-3 rounded-r-lg">Valor Total Produzido</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {Object.entries(serviceStats).sort((a,b) => b[1].quantity - a[1].quantity).map(([name, stats]) => (
                     <tr key={name} className="hover:bg-slate-50">
                       <td className="p-3 font-bold text-slate-700">{name}</td>
                       <td className="p-3 text-slate-600">{stats.quantity}</td>
                       <td className="p-3 font-bold text-green-600">R$ {stats.totalValue.toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          ) : Object.entries(groupedJobs).length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Nenhum trabalho encontrado com os filtros atuais.</p>
            </div>
          ) : (
            Object.entries(groupedJobs).map(([groupName, groupJobs]) => (
              <div key={groupName} className="space-y-4">
                <h4 className="font-black text-lg text-slate-800 border-b border-slate-200 pb-2">{groupName} <span className="text-sm font-bold text-slate-400 ml-2">({groupJobs.length})</span></h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      {reportType === 'DETAILED_ORDERS' ? (
                        <tr className="bg-amber-50 text-amber-700 text-[10px] uppercase tracking-widest font-black">
                          <th className="p-3 rounded-l-lg">OS #</th>
                          <th className="p-3">Caixa</th>
                          <th className="p-3">Dentista</th>
                          <th className="p-3">Paciente</th>
                          <th className="p-3">Serviços</th>
                          <th className="p-3">Valor Serviço</th>
                          <th className="p-3">Total</th>
                          <th className="p-3">Entrada</th>
                          <th className="p-3 rounded-r-lg">Finalização</th>
                        </tr>
                      ) : (
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                          <th className="p-3 rounded-l-lg">OS #</th>
                          <th className="p-3">Paciente</th>
                          <th className="p-3">Dentista</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">Setor</th>
                          <th className="p-3 rounded-r-lg">Status</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupJobs.map(job => {
                        if (reportType === 'DETAILED_ORDERS') {
                          const finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';
                          return (
                            <tr key={job.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                              <td className="p-3 font-bold text-slate-700 text-xs">{job.boxNumber || '-'}</td>
                              <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                              <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                              <td className="p-3 text-xs text-slate-600">
                                {job.items.map((item: any, i: number) => {
                                  const jt = jobTypes.find(t => t.id === item.jobTypeId);
                                  return (
                                    <div key={i}>{item.quantity}x {jt ? jt.name : item.name}</div>
                                  );
                                })}
                              </td>
                              <td className="p-3 text-xs text-slate-600">
                                {job.items.map((item: any, i: number) => (
                                  <div key={i}>R$ {((item.price * item.quantity) - (item.appliedDiscount || 0)).toFixed(2)}</div>
                                ))}
                              </td>
                              <td className="p-3 font-bold text-slate-800 text-sm">R$ {job.totalValue.toFixed(2)}</td>
                              <td className="p-3 text-sm text-slate-600">{new Date(job.createdAt).toLocaleDateString('pt-BR')}</td>
                              <td className="p-3 text-sm text-slate-600">{finishDate}</td>
                            </tr>
                          );
                        } else {
                          return (
                            <tr key={job.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                              <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                              <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                              <td className="p-3 text-sm text-slate-600">{new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR')}</td>
                              <td className="p-3 text-sm text-slate-600">{job.currentSector || 'Recepção'}</td>
                              <td className="p-3 text-xs font-bold text-slate-500">{STATUS_TRANSLATION[job.status] || job.status}</td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
