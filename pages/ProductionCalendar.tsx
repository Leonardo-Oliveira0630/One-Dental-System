
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UrgencyLevel } from '../types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  AlertTriangle, CheckCircle, Clock, X, Save, Check, 
  Package, AlertCircle, Info, LayoutGrid, ChevronDown, FilterX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';

type CalendarFilter = 'ALL' | 'DELAYED' | 'URGENT' | 'POST';

export const ProductionCalendar = () => {
  const { jobs, updateJob, currentUser, manualDentists, allUsers } = useApp();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeDayView, setActiveDayView] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>('ALL');

  // Modal State
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // --- Calendar Logic ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  // --- Helper para identificar categorias ---
  const getJobCategory = (job: Job) => {
    const isDone = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
    const isVip = job.urgency === UrgencyLevel.VIP || job.urgency === UrgencyLevel.HIGH;
    const isDelayed = !isDone && new Date(job.dueDate) < new Date(new Date().setHours(0,0,0,0));
    const dentist = manualDentists.find(d => d.id === job.dentistId) || allUsers.find(u => u.id === job.dentistId);
    const isPost = dentist?.deliveryViaPost === true;

    return { isDone, isVip, isDelayed, isPost };
  };

  const getJobsForDay = (day: number) => {
    const dayJobs = jobs.filter(job => {
      const d = new Date(job.dueDate);
      return (
        d.getDate() === day &&
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear()
      );
    });

    // APLICAR FILTRO DA LEGENDA
    return dayJobs.filter(job => {
        if (activeFilter === 'ALL') return true;
        const { isDelayed, isVip, isPost } = getJobCategory(job);
        if (activeFilter === 'DELAYED') return isDelayed;
        if (activeFilter === 'URGENT') return isVip;
        if (activeFilter === 'POST') return isPost;
        return true;
    }).sort((a, b) => {
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
        if (a.dueTime) return -1;
        if (b.dueTime) return 1;
        return 0;
    });
  };

  const toggleFilter = (filter: CalendarFilter) => {
      setActiveFilter(prev => prev === filter ? 'ALL' : filter);
  };

  const handleJobClick = (job: Job, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJob(job);
    setNewDate(new Date(job.dueDate).toISOString().split('T')[0]);
    setNewTime(job.dueTime || '');
  };

  const handleUpdateJob = () => {
    if (!selectedJob || !newDate) return;
    const dateParts = newDate.split('-');
    const adjustedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    updateJob(selectedJob.id, { dueDate: adjustedDate, dueTime: newTime || undefined });
    setSelectedJob(null);
  };

  const handleFinalizeJob = () => {
    if (!selectedJob) return;
    updateJob(selectedJob.id, { status: JobStatus.COMPLETED });
    setSelectedJob(null);
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- Estilização Dinâmica ---
  const getJobColors = (job: Job) => {
    const { isDone, isVip, isDelayed, isPost } = getJobCategory(job);

    if (isDone) return { bg: "bg-slate-50 border-slate-100 opacity-50 grayscale", text: "text-slate-400" };
    if (isDelayed) return { bg: "bg-red-50 border-red-200 shadow-red-100/50", text: "text-red-900" };
    if (isVip) return { bg: "bg-orange-50 border-orange-200 shadow-orange-100/50", text: "text-orange-900" };
    if (isPost) return { bg: "bg-indigo-50 border-indigo-200 shadow-indigo-100/50", text: "text-indigo-900" };
    
    return { bg: "bg-white border-slate-100 hover:border-blue-200", text: "text-slate-800" };
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 as 20:00

  return (
    <div className="space-y-4 md:space-y-6 flex-1 flex flex-col relative w-full overflow-hidden">
      
      {/* Header Fixo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 px-2 md:px-0">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter truncate">
            <CalendarIcon className="text-blue-600 shrink-0" /> Agenda de Bancada
          </h1>
          <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">Faturamento e Fluxo Diário</p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 bg-white p-1.5 md:p-2 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto justify-between">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"><ChevronLeft size={20} /></button>
            <div className="text-sm md:text-base font-black text-slate-800 flex-1 md:w-40 text-center uppercase tracking-tighter">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Legenda de Alertas INTERATIVA (FILTROS) */}
      <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0 mx-2 md:mx-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Filtrar por:</span>
          
          <button 
            onClick={() => toggleFilter('DELAYED')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all active:scale-95 ${activeFilter === 'DELAYED' ? 'bg-red-500 border-red-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-red-200'}`}
          >
              <div className={`w-2 h-2 rounded-full ${activeFilter === 'DELAYED' ? 'bg-white' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-black uppercase">Atrasados</span>
          </button>

          <button 
            onClick={() => toggleFilter('URGENT')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all active:scale-95 ${activeFilter === 'URGENT' ? 'bg-orange-500 border-orange-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-orange-200'}`}
          >
              <div className={`w-2 h-2 rounded-full ${activeFilter === 'URGENT' ? 'bg-white' : 'bg-orange-500'}`}></div>
              <span className="text-[10px] font-black uppercase">Urgentes</span>
          </button>

          <button 
            onClick={() => toggleFilter('POST')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all active:scale-95 ${activeFilter === 'POST' ? 'bg-indigo-500 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
          >
              <div className={`w-2 h-2 rounded-full ${activeFilter === 'POST' ? 'bg-white' : 'bg-indigo-500'}`}></div>
              <span className="text-[10px] font-black uppercase">Correios</span>
          </button>

          {activeFilter !== 'ALL' && (
              <button 
                onClick={() => setActiveFilter('ALL')}
                className="ml-auto flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase hover:underline"
              >
                  <FilterX size={14}/> Limpar Filtros
              </button>
          )}
      </div>

      {/* Calendário Mensal */}
      <div className={`bg-white rounded-3xl shadow-sm border flex-1 flex flex-col overflow-hidden min-h-0 w-full transition-all ${activeFilter !== 'ALL' ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-2.5 text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
            ))}
        </div>
        
        <div className="grid grid-cols-7 flex-1 overflow-y-auto no-scrollbar auto-rows-fr">
            {totalSlots.map((day, index) => {
                if (!day) return <div key={index} className="bg-slate-50/10 border-b border-r border-slate-50" />;
                
                const dayJobs = getJobsForDay(day);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                return (
                    <div 
                        key={index} 
                        onClick={() => setActiveDayView(day)}
                        className={`border-b border-r border-slate-50 p-1 md:p-1.5 min-h-[100px] flex flex-col group transition-all cursor-pointer relative ${isToday ? 'bg-blue-50/20' : 'hover:bg-slate-50/20'}`}
                    >
                        <div className={`text-[10px] md:text-xs font-black mb-1 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>
                            {day}
                        </div>
                        
                        <div className="flex-1 space-y-1 overflow-hidden">
                            {dayJobs.slice(0, 4).map(job => {
                                const colors = getJobColors(job);
                                const boxHex = job.boxColor?.hex || '#cbd5e1';
                                return (
                                    <div key={job.id} className={`p-1 rounded-md border flex items-center gap-1.5 transition-all shadow-sm ${colors.bg}`}>
                                        <div 
                                            className="w-4 h-4 md:w-5 md:h-5 shrink-0 rounded text-[7px] md:text-[8px] flex items-center justify-center font-black shadow-sm"
                                            style={{ backgroundColor: boxHex, color: getContrastColor(boxHex) }}
                                        >
                                            {job.boxNumber || '?'}
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
                                            <p className={`truncate text-[7px] font-black leading-none uppercase ${colors.text}`}>Dr. {job.dentistName}</p>
                                            <p className="truncate text-[8px] font-black leading-tight uppercase text-slate-900">{job.patientName}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {dayJobs.length > 4 && <div className="text-[7px] font-black text-slate-400 text-center py-1">+{dayJobs.length - 4} mais</div>}
                            {dayJobs.length === 0 && activeFilter !== 'ALL' && <div className="flex-1"></div>}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* DRAWER DA AGENDA DIÁRIA (Timeline Estilo Google) */}
      {activeDayView !== null && (
          <div className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full md:w-[500px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cronograma Diário</p>
                          <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter">
                            {activeDayView} de {monthNames[currentDate.getMonth()]}
                          </h2>
                          {activeFilter !== 'ALL' && (
                              <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded">Filtro Ativo: {activeFilter}</span>
                          )}
                      </div>
                      <button onClick={() => setActiveDayView(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
                      {/* Trabalhos sem hora marcada */}
                      {getJobsForDay(activeDayView).filter(j => !j.dueTime).length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14}/> Horário a Definir
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {getJobsForDay(activeDayView).filter(j => !j.dueTime).map(job => {
                                    const colors = getJobColors(job);
                                    const boxHex = job.boxColor?.hex || '#cbd5e1';
                                    return (
                                        <div 
                                            key={job.id} 
                                            onClick={() => handleJobClick(job)}
                                            className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex items-center gap-4 ${colors.bg}`}
                                        >
                                            <div 
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-md border border-black/5 shrink-0" 
                                                style={{backgroundColor: boxHex, color: getContrastColor(boxHex)}}
                                            >
                                                {job.boxNumber || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-mono font-black text-blue-600 text-xs">#{job.osNumber}</span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">{job.currentSector || 'Triagem'}</span>
                                                </div>
                                                <h4 className="font-black text-slate-900 text-base uppercase truncate leading-tight">{job.patientName}</h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase truncate">Dr. {job.dentistName}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                      )}

                      {/* Linha do Tempo Estilo Google */}
                      <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <LayoutGrid size={14}/> Linha do Tempo
                          </h3>
                          <div className="relative border-l-2 border-slate-100 ml-10 pl-6 space-y-12 pb-20">
                              {hours.map(h => {
                                  const hourStr = h.toString().padStart(2, '0') + ':00';
                                  const jobsInHour = getJobsForDay(activeDayView).filter(j => j.dueTime?.startsWith(h.toString().padStart(2, '0')));
                                  
                                  return (
                                      <div key={h} className="relative">
                                          <div className="absolute -left-[54px] top-0 text-[10px] font-black text-slate-400 bg-white pr-2">{hourStr}</div>
                                          
                                          <div className="space-y-3">
                                              {jobsInHour.length === 0 ? (
                                                  <div className="h-4 border-b border-slate-50 border-dashed"></div>
                                              ) : (
                                                  jobsInHour.map(job => {
                                                      const colors = getJobColors(job);
                                                      const boxHex = job.boxColor?.hex || '#cbd5e1';
                                                      return (
                                                          <div 
                                                              key={job.id} 
                                                              onClick={() => handleJobClick(job)}
                                                              className={`p-4 rounded-[24px] border-2 shadow-sm cursor-pointer transition-all hover:translate-x-2 flex items-center gap-4 ${colors.bg}`}
                                                          >
                                                              <div 
                                                                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-md border border-black/5 shrink-0" 
                                                                style={{backgroundColor: boxHex, color: getContrastColor(boxHex)}}
                                                              >
                                                                {job.boxNumber || '?'}
                                                              </div>
                                                              <div className="flex-1 min-w-0">
                                                                  <div className="flex justify-between items-center mb-0.5">
                                                                      <div className="flex items-center gap-2">
                                                                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-black">{job.dueTime}</span>
                                                                        <span className="font-mono font-black text-slate-400 text-[10px]">#{job.osNumber}</span>
                                                                      </div>
                                                                      {job.status === JobStatus.COMPLETED && <CheckCircle size={14} className="text-green-500" />}
                                                                  </div>
                                                                  <h4 className="font-black text-slate-900 text-sm uppercase truncate leading-tight">{job.patientName}</h4>
                                                                  <p className="text-[10px] font-bold text-slate-500 uppercase truncate">Dr. {job.dentistName}</p>
                                                              </div>
                                                          </div>
                                                      );
                                                  })
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE EDIÇÃO RÁPIDA */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[32px] shadow-2xl p-6 md:p-8 w-full max-w-md animate-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-black text-2xl text-blue-600 tracking-tighter">#{selectedJob.osNumber}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{selectedJob.patientName}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase">Dr(a). {selectedJob.dentistName}</p>
                    </div>
                    <button onClick={() => setSelectedJob(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors shrink-0"><X size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data Saída</label>
                            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-transparent border-0 font-bold outline-none text-sm"/>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Saída</label>
                            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-transparent border-0 font-bold outline-none text-sm"/>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <button onClick={handleUpdateJob} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                            <Save size={20} /> SALVAR ALTERAÇÕES
                        </button>
                        
                        {selectedJob.status !== JobStatus.COMPLETED && (
                             <button onClick={handleFinalizeJob} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                                <CheckCircle size={20} /> FINALIZAR AGORA
                            </button>
                        )}
                        
                        <button onClick={() => { setSelectedJob(null); navigate(`/jobs/${selectedJob.id}`); }} className="w-full py-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">
                            Ver Prontuário Completo
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
