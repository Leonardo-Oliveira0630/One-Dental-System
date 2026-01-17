
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus, UserRole, UrgencyLevel, Job } from '../types';
import { Search, Filter, FileDown, Eye, Clock, AlertCircle, Printer, X, ChevronRight, MapPin, User, SlidersHorizontal, RefreshCcw, Ban, Building, QrCode, Copy, Check, Globe, HardDrive, CheckCircle2, Truck, Loader2, Box, RotateCcw, Calendar, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';

export const JobsList = () => {
  const { jobs, currentUser, triggerPrint, updateJob, sectors, activeOrganization, addJobToRoute } = useApp();
  const navigate = useNavigate();
  
  const [filterText, setFilterText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterOrigin, setFilterOrigin] = useState<'ALL' | 'WEB' | 'MANUAL'>('ALL');

  const [routeModalJob, setRouteModalJob] = useState<Job | null>(null);
  
  // Route Form State
  const [routeDriver, setRouteDriver] = useState('');
  const [routeShift, setRouteShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const isClient = currentUser?.role === UserRole.CLIENT;
  const isLabStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.COLLABORATOR;

  if (isClient && !activeOrganization) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Building size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum Laboratório Selecionado</h2>
                <p className="text-slate-500 mb-6">Selecione um laboratório parceiro no menu lateral para ver seus pedidos.</p>
                <button onClick={() => navigate('/dentist/partnerships')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors w-full">Gerenciar Parcerias</button>
            </div>
        </div>
    );
  }

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
      if (!window.confirm(`Deseja finalizar o caso de ${job.patientName}?`)) return;
      await updateJob(job.id, {
          status: JobStatus.COMPLETED,
          history: [...job.history, {
              id: `hist_fin_${Date.now()}`,
              timestamp: new Date(),
              action: 'Trabalho Finalizado e Conferido',
              userId: currentUser?.id || 'sys',
              userName: currentUser?.name || 'Sistema',
              sector: 'Expedição'
          }]
      });
  };

  const handleReopenJob = async (job: Job) => {
      if (!window.confirm(`Deseja reabrir o caso de ${job.patientName}?`)) return;
      await updateJob(job.id, {
          status: JobStatus.IN_PROGRESS,
          history: [...job.history, {
              id: `hist_reopen_${Date.now()}`,
              timestamp: new Date(),
              action: 'Trabalho REABERTO via lista rápida',
              userId: currentUser?.id || 'sys',
              userName: currentUser?.name || 'Sistema',
              sector: currentUser?.sector || 'Gestão'
          }]
      });
  };

  const handleAddToRoute = async () => {
    if (!routeModalJob || !routeDriver) return;
    setIsProcessing(true);
    try {
        await addJobToRoute(routeModalJob, routeDriver, routeShift, new Date(routeDate));
        setRouteModalJob(null);
        alert("Adicionado à rota!");
    } catch (e) { alert("Erro."); } finally { setIsProcessing(false); }
  };

  const getStatusColor = (status: JobStatus) => {
    switch(status) {
        case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border border-green-200';
        case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border border-blue-200';
        case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border border-purple-200';
        case JobStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        case JobStatus.REJECTED: return 'bg-red-100 text-red-700 border border-red-200';
        default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getTranslatedStatus = (status: JobStatus) => {
      switch(status) {
        case JobStatus.WAITING_APPROVAL: return 'Aguardando';
        case JobStatus.PENDING: return 'Pendente';
        case JobStatus.IN_PROGRESS: return 'Produção';
        case JobStatus.COMPLETED: return 'Concluído';
        case JobStatus.DELIVERED: return 'Entregue';
        case JobStatus.REJECTED: return 'Rejeitado';
        default: return status;
      }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{isClient ? 'Meus Pedidos' : 'Lista de Trabalhos'}</h1>
          <p className="text-xs md:text-sm text-slate-500">Mostrando {filteredJobs.length} registros encontrados.</p>
        </div>
      </div>

      <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar OS, Paciente, Dentista..." 
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold ${
                    showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
                <SlidersHorizontal size={18} /> Filtros
            </button>
        </div>

        {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-slate-100 pt-3">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold outline-none bg-slate-50">
                    <option value="ALL">Todos os Status</option>
                    {Object.values(JobStatus).map(s => <option key={s} value={s}>{getTranslatedStatus(s)}</option>)}
                </select>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold outline-none bg-slate-50">
                    <option value="">Todas Prioridades</option>
                    {Object.values(UrgencyLevel).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold bg-slate-50" title="Data Inicial" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold bg-slate-50" title="Data Final" />
            </div>
        )}
      </div>

      {/* VIEW PARA DESKTOP (TABELA) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-4">OS #</th>
                        {!isClient && <th className="p-4">Caixa</th>}
                        <th className="p-4">Paciente</th>
                        <th className="p-4">Dentista</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Entrega</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredJobs.map(job => {
                        const canFinalize = isLabStaff && job.status !== JobStatus.COMPLETED && job.status !== JobStatus.DELIVERED && job.status !== JobStatus.REJECTED;
                        const canRoute = isLabStaff && job.status === JobStatus.COMPLETED && !job.routeId;
                        const canReopen = isLabStaff && (job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED);
                        
                        return (
                            <tr key={job.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="p-4 font-mono font-bold text-slate-700 text-sm">{job.osNumber || '---'}</td>
                                {!isClient && (
                                    <td className="p-4">
                                        {job.boxNumber ? (
                                            <div 
                                                className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs shadow-sm border border-black/10"
                                                style={{ backgroundColor: job.boxColor?.hex || '#f1f5f9', color: job.boxColor ? getContrastColor(job.boxColor.hex) : '#64748b' }}
                                            >
                                                {job.boxNumber}
                                            </div>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                )}
                                <td className="p-4 font-bold text-slate-900 text-sm">{job.patientName}</td>
                                <td className="p-4">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-tight">{job.dentistName}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(job.status)}`}>
                                        {getTranslatedStatus(job.status)}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-600 text-xs font-bold">{new Date(job.dueDate).toLocaleDateString()}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1">
                                        {canFinalize && <button onClick={() => handleFinalizeJob(job)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg"><CheckCircle2 size={18} /></button>}
                                        {canReopen && <button onClick={() => handleReopenJob(job)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"><RotateCcw size={18} /></button>}
                                        {canRoute && <button onClick={() => setRouteModalJob(job)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"><Truck size={18} /></button>}
                                        <button onClick={() => navigate(`/jobs/${job.id}`)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Eye size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* VIEW PARA MOBILE (CARDS) */}
      <div className="md:hidden space-y-4">
        {filteredJobs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed">Nenhum pedido encontrado.</div>
        ) : (
            filteredJobs.map(job => (
                <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 active:scale-[0.98] transition-transform relative overflow-hidden">
                    {job.urgency === UrgencyLevel.VIP && <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden"><div className="bg-orange-500 text-white text-[8px] font-black py-1 px-10 transform rotate-45 translate-x-3 -translate-y-1 text-center shadow-sm uppercase">VIP</div></div>}
                    
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-blue-600 text-base">#{job.osNumber || '---'}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStatusColor(job.status)}`}>
                                {getTranslatedStatus(job.status)}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Entrega</p>
                            <p className="text-xs font-bold text-slate-800">{new Date(job.dueDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="space-y-1 mb-4">
                        <h3 className="font-black text-slate-900 text-lg leading-tight">{job.patientName}</h3>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                            <User size={12} className="text-blue-500" />
                            <span className="uppercase truncate">Dr(a). {job.dentistName}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                           {!isClient && job.boxNumber && (
                               <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                                   <Box size={14} className="text-slate-400" />
                                   <span className="text-xs font-black text-slate-700">{job.boxNumber}</span>
                               </div>
                           )}
                           <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg">
                               <MapPin size={14} className="text-blue-400" />
                               <span className="text-xs font-bold text-blue-700 truncate max-w-[100px]">{job.currentSector || 'Recepção'}</span>
                           </div>
                        </div>
                        <ChevronRight className="text-slate-300" size={20} />
                    </div>
                </div>
            ))
        )}
      </div>

      {/* ROUTE MODAL */}
      {routeModalJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-indigo-600" /> Escalar p/ Entrega</h3>
                      <button onClick={() => setRouteModalJob(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data da Rota</label>
                          <input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turno</label>
                          <select value={routeShift} onChange={e => setRouteShift(e.target.value as any)} className="w-full px-4 py-2 border rounded-xl bg-white font-bold">
                              <option value="MORNING">Manhã</option>
                              <option value="AFTERNOON">Tarde</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entregador</label>
                          <input placeholder="Nome do Motoboy" value={routeDriver} onChange={e => setRouteDriver(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-bold" />
                      </div>
                      <button onClick={handleAddToRoute} disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                          {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> CONFIRMAR NA ROTA</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
