
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus, UserRole, UrgencyLevel, Job } from '../types';
import { Search, Filter, FileDown, Eye, Clock, AlertCircle, Printer, X, ChevronRight, MapPin, User, SlidersHorizontal, RefreshCcw, Ban, Building, QrCode, Copy, Check, Globe, HardDrive, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';

export const JobsList = () => {
  const { jobs, currentUser, triggerPrint, updateJob, sectors, activeOrganization } = useApp();
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
  const [filterOrigin, setFilterOrigin] = useState<'ALL' | 'WEB' | 'MANUAL'>('ALL');

  // Print Modal
  const [printModalJob, setPrintModalJob] = useState<Job | null>(null);
  
  // PIX Modal
  const [pixModalJob, setPixModalJob] = useState<Job | null>(null);
  const [copied, setCopied] = useState(false);

  const isClient = currentUser?.role === UserRole.CLIENT;
  const isLabStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.COLLABORATOR;

  // --- SAFEGUARD: DENTIST WITHOUT ACTIVE LAB ---
  if (isClient && !activeOrganization) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Building size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum Laboratório Selecionado</h2>
                <p className="text-slate-500 mb-6">
                    Para visualizar seus pedidos, selecione um laboratório parceiro no menu lateral ou adicione uma nova parceria.
                </p>
                <button 
                    onClick={() => navigate('/dentist/partnerships')}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors w-full"
                >
                    Gerenciar Parcerias
                </button>
            </div>
        </div>
    );
  }

  // Filter Logic
  const filteredJobs = jobs.filter(job => {
    if (isClient && job.dentistId !== currentUser?.id) return false;
    const searchLower = filterText.toLowerCase();
    const matchText = 
      (job.osNumber || '').toLowerCase().includes(searchLower) ||
      job.patientName.toLowerCase().includes(searchLower) ||
      job.dentistName.toLowerCase().includes(searchLower);
    if (!matchText) return false;
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
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
    if (filterSector && job.currentSector !== filterSector) return false;
    if (filterUrgency && job.urgency !== filterUrgency) return false;
    if (filterOrigin !== 'ALL') {
        const isWeb = job.history.some(h => h.action.toLowerCase().includes('loja virtual'));
        if (filterOrigin === 'WEB' && !isWeb) return false;
        if (filterOrigin === 'MANUAL' && isWeb) return false;
    }
    return true;
  });

  const handleFinalizeJob = async (job: Job) => {
      if (!window.confirm(`Deseja finalizar o caso de ${job.patientName}? O trabalho será marcado como concluído e o débito será confirmado para o dentista.`)) return;
      
      await updateJob(job.id, {
          status: JobStatus.COMPLETED,
          history: [...job.history, {
              id: `hist_fin_${Date.now()}`,
              timestamp: new Date(),
              action: 'Trabalho Finalizado e Conferido (Pronto para Entrega/Faturamento)',
              userId: currentUser?.id || 'sys',
              userName: currentUser?.name || 'Sistema',
              sector: 'Expedição'
          }]
      });
      alert("Trabalho finalizado com sucesso!");
  };

  const getStatusColor = (status: JobStatus) => {
    switch(status) {
        case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border border-green-200';
        case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border border-blue-200';
        case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border border-purple-200';
        case JobStatus.PENDING: return 'bg-slate-100 text-slate-700 border border-slate-200';
        case JobStatus.REJECTED: return 'bg-red-100 text-red-700 border border-red-200';
        case JobStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
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

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isClient ? 'Meus Pedidos' : 'Lista de Trabalhos'}</h1>
          <p className="text-slate-500">
            {isClient && activeOrganization ? `Laboratório: ${activeOrganization.name} • ` : ''}
            Mostrando {filteredJobs.length} de {jobs.length} trabalhos encontrados.
          </p>
        </div>
        <div className="flex gap-2">
            {!isClient && (
                <button 
                    onClick={() => alert("Função de exportação")}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 w-full md:w-auto justify-center font-bold"
                >
                    <FileDown size={18} /> Exportar PDF
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
                <SlidersHorizontal size={18} /> Filtros {showFilters ? 'Ativos' : 'Avançados'}
            </button>
        </div>

        {showFilters && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Origem</label>
                    <select value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-white">
                        <option value="ALL">Todas</option>
                        <option value="WEB">🌐 Web</option>
                        <option value="MANUAL">📝 Manual</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Status</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-white">
                        <option value="ALL">Todos</option>
                        {Object.values(JobStatus).map(s => <option key={s} value={s}>{getTranslatedStatus(s)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Urgência</label>
                    <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-white">
                        <option value="">Todas</option>
                        <option value={UrgencyLevel.VIP}>🔥 VIP/Urgente</option>
                        <option value={UrgencyLevel.HIGH}>Alta</option>
                        <option value={UrgencyLevel.NORMAL}>Normal</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button onClick={() => { setFilterText(''); setStatusFilter('ALL'); setShowFilters(false); }} className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm">Limpar</button>
                </div>
            </div>
        )}
      </div>

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-4">OS #</th>
                        {!isClient && <th className="p-4">Caixa</th>}
                        <th className="p-4">Paciente</th>
                        {!isClient && <th className="p-4">Dentista</th>}
                        <th className="p-4">Status</th>
                        <th className="p-4">Entrega</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredJobs.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-400">Nenhum trabalho encontrado.</td></tr>
                    ) : (
                        filteredJobs.map(job => {
                            const isWeb = job.history.some(h => h.action.toLowerCase().includes('loja virtual'));
                            const canFinalize = isLabStaff && job.status !== JobStatus.COMPLETED && job.status !== JobStatus.DELIVERED && job.status !== JobStatus.REJECTED;
                            
                            return (
                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-700">
                                        {job.osNumber || '---'}
                                    </td>
                                    {!isClient && (
                                        <td className="p-4">
                                            {job.boxNumber ? (
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm border border-black/10" style={{ backgroundColor: job.boxColor?.hex || '#ccc', color: getContrastColor(job.boxColor?.hex || '#ccc') }}>{job.boxNumber}</div>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                    )}
                                    <td className="p-4 font-bold text-slate-900">{job.patientName}</td>
                                    {!isClient && <td className="p-4 text-slate-600 text-sm">{job.dentistName}</td>}
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(job.status)}`}>
                                            {getTranslatedStatus(job.status)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 text-sm">
                                        <div className="flex items-center gap-1 font-medium">
                                            {job.urgency === UrgencyLevel.VIP && <AlertCircle size={14} className="text-red-500" />}
                                            {new Date(job.dueDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            {canFinalize && (
                                                <button 
                                                    onClick={() => handleFinalizeJob(job)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Finalizar Caso (Enviar p/ Débito)"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                            {isClient && job.paymentMethod === 'PIX' && job.paymentStatus === 'PENDING' && job.pixQrCode && (
                                                <button onClick={() => setPixModalJob(job)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg font-bold text-xs flex items-center gap-1 border border-green-200">
                                                    <QrCode size={16} /> Pagar
                                                </button>
                                            )}
                                            {!isClient && job.status !== JobStatus.REJECTED && (
                                                <button onClick={() => setPrintModalJob(job)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors" title="Imprimir"><Printer size={18} /></button>
                                            )}
                                            <button onClick={() => navigate(`/jobs/${job.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalhes"><Eye size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MOBILE CARD VIEW --- */}
      <div className="md:hidden space-y-4">
        {filteredJobs.map(job => {
            const canFinalize = isLabStaff && job.status !== JobStatus.COMPLETED && job.status !== JobStatus.DELIVERED && job.status !== JobStatus.REJECTED;
            return (
                <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-lg text-slate-800">{job.osNumber || 'WEB'}</span>
                                {job.urgency === UrgencyLevel.VIP && <AlertCircle size={16} className="text-red-500" />}
                            </div>
                            <h3 className="font-bold text-slate-900 leading-tight">{job.patientName}</h3>
                            <p className="text-xs text-slate-500">Dr. {job.dentistName}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${getStatusColor(job.status)}`}>
                            {getTranslatedStatus(job.status)}
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
                            <Clock size={14} /> {new Date(job.dueDate).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                             {canFinalize && (
                                <button onClick={() => handleFinalizeJob(job)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white font-bold text-[10px] rounded-lg shadow-sm">
                                    <CheckCircle2 size={14} /> FINALIZAR
                                </button>
                            )}
                            <button onClick={() => navigate(`/jobs/${job.id}`)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Eye size={18} /></button>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Modais de Impressão e PIX permanecem iguais */}
      {printModalJob && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-sm w-full relative">
                 <button onClick={() => setPrintModalJob(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
                <h3 className="font-bold text-lg mb-4 text-slate-800">Imprimir OS: {printModalJob.osNumber}</h3>
                <div className="space-y-3">
                    <button onClick={() => { triggerPrint(printModalJob, 'SHEET'); setPrintModalJob(null); }} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 flex items-center gap-3 transition-colors text-left"><FileDown size={24} className="text-blue-600" /><div><span className="block font-bold text-slate-800">Ficha de Trabalho</span><span className="text-xs text-slate-500">A4 Completo com Código de Barras</span></div></button>
                    <button onClick={() => { triggerPrint(printModalJob, 'LABEL'); setPrintModalJob(null); }} className="w-full p-4 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 flex items-center gap-3 transition-colors text-left"><Printer size={24} className="text-purple-600" /><div><span className="block font-bold text-slate-800">Etiqueta Térmica</span><span className="text-xs text-slate-500">10x5cm para Caixas</span></div></button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};
