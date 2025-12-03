
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus, UserRole, UrgencyLevel, Job } from '../types';
import { Search, Filter, FileDown, Eye, Clock, AlertCircle, Printer, X, ChevronRight, MapPin, User, SlidersHorizontal, RefreshCcw, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';

export const JobsList = () => {
  const { jobs, currentUser, triggerPrint, jobTypes, sectors, allUsers } = useApp();
  const navigate = useNavigate();
  
  // Basic Search
  const [filterText, setFilterText] = useState('');
  
  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [filterCollaborator, setFilterCollaborator] = useState('');

  // Print Modal
  const [printModalJob, setPrintModalJob] = useState<Job | null>(null);

  const isClient = currentUser?.role === UserRole.CLIENT;

  // Filter Logic
  const filteredJobs = jobs.filter(job => {
    // 1. Role Check (Client sees only their own)
    if (isClient && job.dentistId !== currentUser?.id) return false;

    // 2. Text Search (OS, Patient, Dentist)
    const searchLower = filterText.toLowerCase();
    const matchText = 
      (job.osNumber || '').toLowerCase().includes(searchLower) ||
      job.patientName.toLowerCase().includes(searchLower) ||
      job.dentistName.toLowerCase().includes(searchLower);
    if (!matchText) return false;

    // 3. Status Filter
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;

    // 4. Date Range (Created At)
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (new Date(job.createdAt) < start) return false;
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (new Date(job.createdAt) > end) return false;
    }

    // 5. Sector Filter
    if (filterSector && job.currentSector !== filterSector) return false;

    // 6. Urgency Filter
    if (filterUrgency && job.urgency !== filterUrgency) return false;

    // 7. Job Type Filter (Check if ANY item in the job matches the type)
    if (filterJobType) {
        const hasType = job.items.some(item => item.jobTypeId === filterJobType);
        if (!hasType) return false;
    }

    // 8. Collaborator Filter (Check History - Has this person touched the job?)
    if (filterCollaborator) {
        const hasHistory = job.history.some(h => h.userId === filterCollaborator);
        if (!hasHistory) return false;
    }

    return true;
  });

  const clearFilters = () => {
      setFilterText('');
      setStatusFilter('ALL');
      setStartDate('');
      setEndDate('');
      setFilterSector('');
      setFilterUrgency('');
      setFilterJobType('');
      setFilterCollaborator('');
  };

  const getStatusColor = (status: JobStatus) => {
    switch(status) {
        case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border border-green-200';
        case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border border-blue-200';
        case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border border-purple-200';
        case JobStatus.PENDING: return 'bg-slate-100 text-slate-700 border border-slate-200';
        case JobStatus.REJECTED: return 'bg-red-100 text-red-700 border border-red-200';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTranslatedStatus = (status: JobStatus) => {
      switch(status) {
        case JobStatus.WAITING_APPROVAL: return 'Aguardando Aprovação';
        case JobStatus.PENDING: return 'Pendente';
        case JobStatus.IN_PROGRESS: return 'Em Produção';
        case JobStatus.COMPLETED: return 'Concluído';
        case JobStatus.DELIVERED: return 'Entregue';
        case JobStatus.REJECTED: return 'Rejeitado';
        default: return status;
      }
  };

  const handleExport = () => {
    alert("Em um app real, isso acionaria o jspdf-autotable para baixar um PDF da visualização atual.");
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isClient ? 'Meus Pedidos' : 'Lista de Trabalhos'}</h1>
          <p className="text-slate-500">
            Mostrando {filteredJobs.length} de {jobs.length} trabalhos encontrados.
          </p>
        </div>
        <div className="flex gap-2">
            {!isClient && (
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 w-full md:w-auto justify-center"
                >
                    <FileDown size={18} />
                    Exportar PDF
                </button>
            )}
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar OS, Paciente, Dentista..." 
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
                <SlidersHorizontal size={18} />
                Filtros {showFilters ? 'Ativos' : 'Avançados'}
            </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                {/* Status */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Status</label>
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="ALL">Todos os Status</option>
                            {Object.values(JobStatus).map(s => <option key={s} value={s}>{getTranslatedStatus(s)}</option>)}
                        </select>
                    </div>
                </div>

                {/* Other filters remain similar ... */}
                {/* Urgency */}
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Urgência</label>
                    <div className="relative">
                        <AlertCircle size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <select 
                            value={filterUrgency}
                            onChange={(e) => setFilterUrgency(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">Todas</option>
                            <option value={UrgencyLevel.LOW}>Baixa</option>
                            <option value={UrgencyLevel.NORMAL}>Normal</option>
                            <option value={UrgencyLevel.HIGH}>Alta</option>
                            <option value={UrgencyLevel.VIP}>VIP</option>
                        </select>
                    </div>
                </div>

                {/* Sector */}
                {!isClient && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Setor Atual</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-2.5 text-slate-400" />
                            <select 
                                value={filterSector}
                                onChange={(e) => setFilterSector(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">Todos os Setores</option>
                                {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}
                
                {/* Date Range */}
                <div className="sm:col-span-2 lg:col-span-2 flex gap-2">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Data Início</label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Data Fim</label>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                    <button 
                        onClick={clearFilters}
                        className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 text-sm transition-colors"
                    >
                        <RefreshCcw size={16} /> Limpar Filtros
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                        <th className="p-4 font-semibold">OS #</th>
                        {!isClient && <th className="p-4 font-semibold">Caixa</th>}
                        <th className="p-4 font-semibold">Paciente</th>
                        {!isClient && <th className="p-4 font-semibold">Dentista</th>}
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Setor</th>
                        <th className="p-4 font-semibold">Entrega</th>
                        <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredJobs.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-400">Nenhum trabalho encontrado.</td></tr>
                    ) : (
                        filteredJobs.map(job => (
                            <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-mono font-medium text-slate-700">
                                    {job.osNumber || <span className="text-xs text-purple-400 italic">WEB</span>}
                                </td>
                                {!isClient && (
                                    <td className="p-4">
                                        {job.boxNumber ? (
                                            <div 
                                                className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm shadow-sm border border-black/10"
                                                style={{ 
                                                    backgroundColor: job.boxColor?.hex || '#ccc',
                                                    color: getContrastColor(job.boxColor?.hex || '#ccc')
                                                }}
                                            >
                                                {job.boxNumber}
                                            </div>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                )}
                                <td className="p-4 font-medium text-slate-900">{job.patientName}</td>
                                {!isClient && <td className="p-4 text-slate-600">{job.dentistName}</td>}
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(job.status)}`}>
                                        {getTranslatedStatus(job.status)}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-500">
                                    {job.status === JobStatus.REJECTED ? <Ban size={16} className="text-red-400"/> : (job.currentSector || 'Início')}
                                </td>
                                <td className="p-4 text-slate-600">
                                    <div className="flex items-center gap-1">
                                        {job.urgency === UrgencyLevel.VIP && <AlertCircle size={16} className="text-red-500" />}
                                        {new Date(job.dueDate).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {!isClient && job.status !== JobStatus.REJECTED && (
                                        <button 
                                            onClick={() => setPrintModalJob(job)}
                                            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                            title="Imprimir"
                                        >
                                            <Printer size={18} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                        title="Ver Detalhes"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="md:hidden space-y-4">
        {filteredJobs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                Nenhum trabalho encontrado.
            </div>
        ) : (
            filteredJobs.map(job => (
                <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3">
                            {/* Box Badge for Mobile */}
                            {!isClient && job.boxNumber && (
                                <div 
                                    className="w-10 h-10 rounded flex items-center justify-center font-bold shadow-sm border border-black/10 shrink-0"
                                    style={{ 
                                        backgroundColor: job.boxColor?.hex || '#ccc',
                                        color: getContrastColor(job.boxColor?.hex || '#ccc')
                                    }}
                                >
                                    {job.boxNumber}
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono font-bold text-lg text-slate-800">
                                        {job.osNumber || 'WEB'}
                                    </span>
                                    {job.urgency === UrgencyLevel.VIP && <AlertCircle size={16} className="text-red-500" />}
                                </div>
                                <h3 className="font-bold text-slate-900 leading-tight">{job.patientName}</h3>
                            </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(job.status)}`}>
                            {getTranslatedStatus(job.status)}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                         <div className="flex items-center gap-1">
                            <Clock size={14} className="text-slate-400" />
                            <span>{new Date(job.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-2">
                             <MapPin size={14} className="text-slate-400" />
                             <span>{job.status === JobStatus.REJECTED ? 'Cancelado' : (job.currentSector || 'Recepção')}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                         {/* Only allow print if not rejected */}
                        {!isClient && job.status !== JobStatus.REJECTED && (
                            <button 
                                onClick={() => setPrintModalJob(job)}
                                className="text-slate-400 hover:text-slate-700 p-2"
                            >
                                <Printer size={18} />
                            </button>
                        )}
                        <button 
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            className="flex items-center gap-1 text-blue-600 font-medium text-sm hover:underline ml-auto"
                        >
                            Ver Detalhes <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Print Selection Modal */}
      {printModalJob && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full relative">
                 <button onClick={() => setPrintModalJob(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
                <h3 className="font-bold text-lg mb-4 text-slate-800">Imprimir OS: {printModalJob.osNumber}</h3>
                <div className="space-y-3">
                    <button 
                        onClick={() => { triggerPrint(printModalJob, 'SHEET'); setPrintModalJob(null); }}
                        className="w-full p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 flex items-center gap-3 transition-colors"
                    >
                        <FileDown size={24} className="text-blue-600" />
                        <div className="text-left">
                            <span className="block font-bold text-slate-800">Ficha de Trabalho</span>
                            <span className="text-xs text-slate-500">A4 Completo com Código de Barras</span>
                        </div>
                    </button>
                    <button 
                        onClick={() => { triggerPrint(printModalJob, 'LABEL'); setPrintModalJob(null); }}
                        className="w-full p-4 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 flex items-center gap-3 transition-colors"
                    >
                        <Printer size={24} className="text-purple-600" />
                        <div className="text-left">
                            <span className="block font-bold text-slate-800">Etiqueta Térmica</span>
                            <span className="text-xs text-slate-500">10x5cm para Caixas</span>
                        </div>
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};
