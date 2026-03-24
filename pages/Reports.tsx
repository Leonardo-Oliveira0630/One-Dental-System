import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Download, Filter, Calendar, Users, Building2, Package, Search, X } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { JobStatus } from '../types';

export default function Reports() {
  const { jobs, allUsers, manualDentists, sectors, jobTypes, currentOrg, activeOrganization, currentUser } = useApp();
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateType, setDateType] = useState<'CREATED' | 'DUE'>('CREATED');
  const [dentistId, setDentistId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [sector, setSector] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [groupBy, setGroupBy] = useState<'DATE' | 'JOB_TYPE'>('DATE');

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

      // Job Type filter
      if (jobTypeId) {
        const hasJobType = job.items.some(item => item.jobTypeId === jobTypeId);
        if (!hasJobType) return false;
      }

      return true;
    });
  }, [jobs, startDate, endDate, dateType, dentistId, collaboratorId, sector, jobTypeId]);

  // Group jobs
  const groupedJobs = useMemo(() => {
    const groups: Record<string, typeof jobs> = {};
    
    filteredJobs.forEach(job => {
      let key = '';
      if (groupBy === 'DATE') {
        key = new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR');
      } else if (groupBy === 'JOB_TYPE') {
        // A job can have multiple items, so we might group by the first item's type or create multiple entries.
        // For simplicity, let's group by the first item's type name.
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

  const generatePDF = () => {
    const doc = new jsPDF();
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    doc.text(`Relatório de Produção - ${orgName}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    doc.text(`Filtros: ${filteredJobs.length} trabalhos encontrados`, 14, 36);

    let yPos = 45;

    Object.entries(groupedJobs).forEach(([groupName, groupJobs]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(groupName, 14, yPos);
      yPos += 5;

      const tableData = groupJobs.map(job => [
        job.osNumber || '-',
        job.patientName,
        job.dentistName,
        new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR'),
        job.currentSector || 'Recepção',
        job.status
      ]);

      (doc as any).autoTable({
        startY: yPos,
        head: [['OS', 'Paciente', 'Dentista', dateType === 'CREATED' ? 'Entrada' : 'Entrega', 'Setor', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        margin: { top: 10 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(`relatorio-producao-${new Date().getTime()}.pdf`);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDentistId('');
    setCollaboratorId('');
    setSector('');
    setJobTypeId('');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
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
              {allUsers.filter(u => u.role !== 'CLIENT' && u.organizationId === (activeOrganization?.id || currentUser?.organizationId)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Trabalho</label>
            <select value={jobTypeId} onChange={(e) => setJobTypeId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Todos os Tipos</option>
              {jobTypes.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Agrupar Por</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="DATE">Data</option>
              <option value="JOB_TYPE">Tipo de Trabalho</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Resultados ({filteredJobs.length} trabalhos)</h3>
        </div>
        
        <div className="p-6 space-y-8">
          {Object.entries(groupedJobs).length === 0 ? (
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
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-3 rounded-l-lg">OS #</th>
                        <th className="p-3">Paciente</th>
                        <th className="p-3">Dentista</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Setor</th>
                        <th className="p-3 rounded-r-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupJobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                          <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                          <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                          <td className="p-3 text-sm text-slate-600">{new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 text-sm text-slate-600">{job.currentSector || 'Recepção'}</td>
                          <td className="p-3 text-xs font-bold text-slate-500">{job.status}</td>
                        </tr>
                      ))}
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
