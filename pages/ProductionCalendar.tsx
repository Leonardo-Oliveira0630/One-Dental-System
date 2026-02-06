
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UrgencyLevel } from '../types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  AlertTriangle, CheckCircle, Clock, X, Save, Check, 
  Package, AlertCircle, Info, Maximize2, MoreVertical, LayoutGrid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';

export const ProductionCalendar = () => {
  const { jobs, updateJob, currentUser, manualDentists, allUsers } = useApp();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeDayView, setActiveDayView] = useState<number | null>(null);

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

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  // --- Filtering Jobs for Calendar ---
  const getJobsForDay = (day: number) => {
    return jobs.filter(job => {
      const d = new Date(job.dueDate);
      return (
        d.getDate() === day &&
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear()
      );
    }).sort((a, b) => {
        // Ordenar por hora se existir, senão por prioridade
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
        if (a.dueTime) return -1;
        if (b.dueTime) return 1;
        const aDone = a.status === JobStatus.COMPLETED || a.status === JobStatus.DELIVERED;
        const bDone = b.status === JobStatus.COMPLETED || b.status === JobStatus.DELIVERED;
        if (aDone && !bDone) return 1;
        if (!aDone && bDone) return -1;
        return 0;
    });
  };

  // --- Modal Handlers ---
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

    updateJob(selectedJob.id, {
        dueDate: adjustedDate,
        dueTime: newTime || undefined,
        history: [...selectedJob.history, {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: `Agendamento alterado para ${adjustedDate.toLocaleDateString()} às ${newTime || 'Hora indefinida'}`,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Admin'
        }]
    });
    setSelectedJob(null);
  };

  const handleFinalizeJob = () => {
    if (!selectedJob) return;
    updateJob(selectedJob.id, {
        status: JobStatus.COMPLETED,
        history: [...selectedJob.history, {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: 'Finalizado via Calendário',
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Admin',
            sector: 'Expedição'
        }]
    });
    setSelectedJob(null);
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // --- Render Helpers ---
  const getJobStyle = (job: Job) => {
    const isVip = job.urgency === UrgencyLevel.VIP || job.urgency === UrgencyLevel.HIGH;
    const isDone = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
    const isDelayed = !isDone && new Date(job.dueDate) < new Date(new Date().setHours(0,0,0,0));
    
    const dentist = manualDentists.find(d => d.id === job.dentistId) || allUsers.find(u => u.id === job.dentistId);
    const isPost = dentist?.deliveryViaPost;

    if (isDone) return { card: "bg-slate-50 border-slate-100 opacity-50 grayscale", text: "text-slate-500", icon: <CheckCircle size={10} /> };
    if (isDelayed) return { card: "bg-red-50 border-red-200 shadow-red-100", text: "text-red-900", icon: <Clock size={10} className="text-red-500" /> };
    if (isVip) return { card: "bg-orange-50 border-orange-200 shadow-orange-100", text: "text-orange-900", icon: <AlertCircle size={10} className="text-orange-500" /> };
    if (isPost) return { card: "bg-indigo-50 border-indigo-200 shadow-indigo-100", text: "text-indigo-900", icon: <Package size={10} className="text-indigo-500" /> };
    
    return { card: "bg-white border-slate-100 hover:border-blue-300", text: "text-slate-800", icon: null };
  };

  // --- DAY TIMELINE VIEW ---
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <CalendarIcon className="text-blue-600" /> Fluxo de Bancada
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">Gestão mensal e horária de entregas</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors">
                <ChevronLeft size={24} />
            </button>
            <div className="text-base font-black text-slate-800 w-40 text-center select-none uppercase tracking-tighter">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors">
                <ChevronRight size={24} />
            </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-6">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1"><Info size={14}/> Legenda:</span>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase">Atrasados</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase">Urgentes / VIP</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase">Correios</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold ml-auto italic">Clique no dia para ver a agenda por hora.</div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
            ))}
        </div>
        
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto no-scrollbar">
            {totalSlots.map((day, index) => {
                if (!day) return <div key={index} className="bg-slate-50/20 border-b border-r border-slate-50" />;
                
                const dayJobs = getJobsForDay(day);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                return (
                    <div 
                        key={index} 
                        onClick={() => setActiveDayView(day)}
                        className={`border-b border-r border-slate-50 p-2 min-h-[120px] flex flex-col group transition-colors cursor-pointer ${isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/30'}`}
                    >
                        <div className={`text-xs font-black mb-2 w-6 h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
                            {day}
                        </div>
                        
                        <div className="flex-1 space-y-1 overflow-hidden">
                            {dayJobs.slice(0, 4).map(job => {
                                const style = getJobStyle(job);
                                return (
                                    <div key={job.id} className={`p-1 rounded-lg border text-[8px] font-black uppercase truncate flex items-center gap-1 ${style.card} ${style.text}`}>
                                        {job.dueTime && <span className="text-blue-600 shrink-0">{job.dueTime}</span>}
                                        <span className="truncate">{job.patientName}</span>
                                    </div>
                                );
                            })}
                            {dayJobs.length > 4 && <div className="text-[8px] font-black text-slate-400 text-center">+{dayJobs.length - 4} trabalhos</div>}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* DETALHE DO DIA (EXPANDIDO - ESTILO GOOGLE CALENDAR) */}
      {activeDayView !== null && (
          <div className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Agenda Diária</p>
                          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                            {activeDayView} de {monthNames[currentDate.getMonth()]}
                          </h2>
                      </div>
                      <button onClick={() => setActiveDayView(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                      {/* Seção sem horário */}
                      {getJobsForDay(activeDayView).filter(j => !j.dueTime).length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14}/> Horário a Definir
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {getJobsForDay(activeDayView).filter(j => !j.dueTime).map(job => (
                                    <div 
                                        key={job.id} 
                                        onClick={() => handleJobClick(job)}
                                        className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all hover:scale-102 ${getJobStyle(job).card}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono font-black text-blue-600 text-xs">#{job.osNumber}</span>
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] border border-black/5" style={{backgroundColor: job.boxColor?.hex}}>{job.boxNumber || '-'}</div>
                                        </div>
                                        <p className="font-black text-slate-800 text-sm uppercase truncate">{job.patientName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">Dr. {job.dentistName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}

                      {/* Linha do Tempo */}
                      <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <LayoutGrid size={14}/> Linha do Tempo
                          </h3>
                          <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-12 pb-20">
                              {hours.map(h => {
                                  const hourStr = h.toString().padStart(2, '0') + ':00';
                                  const jobsInHour = getJobsForDay(activeDayView).filter(j => j.dueTime?.startsWith(h.toString().padStart(2, '0')));
                                  
                                  return (
                                      <div key={h} className="relative">
                                          {/* Time Label */}
                                          <div className="absolute -left-[54px] top-0 text-[10px] font-black text-slate-400 bg-white pr-2">{hourStr}</div>
                                          
                                          <div className="space-y-3">
                                              {jobsInHour.length === 0 ? (
                                                  <div className="h-4 border-b border-slate-50 border-dashed"></div>
                                              ) : (
                                                  jobsInHour.map(job => (
                                                      <div 
                                                          key={job.id} 
                                                          onClick={() => handleJobClick(job)}
                                                          className={`p-4 rounded-[24px] border-2 shadow-sm cursor-pointer transition-all hover:translate-x-2 ${getJobStyle(job).card}`}
                                                      >
                                                          <div className="flex justify-between items-center mb-1">
                                                              <div className="flex items-center gap-2">
                                                                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black">{job.dueTime}</span>
                                                                <span className="font-mono font-black text-slate-400 text-xs">#{job.osNumber}</span>
                                                              </div>
                                                              {getJobStyle(job).icon}
                                                          </div>
                                                          <h4 className="font-black text-slate-800 uppercase tracking-tight">{job.patientName}</h4>
                                                          <div className="flex items-center gap-2 mt-2">
                                                              <div className="w-5 h-5 rounded-lg flex items-center justify-center font-black text-[9px] border border-black/5" style={{backgroundColor: job.boxColor?.hex}}>{job.boxNumber || '-'}</div>
                                                              <span className="text-[10px] font-black text-slate-400 uppercase">{job.currentSector || 'Triagem'}</span>
                                                          </div>
                                                      </div>
                                                  ))
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

      {/* JOB EDIT MODAL (Atualizado com Hora) */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md animate-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-black text-2xl text-blue-600 tracking-tighter">#{selectedJob.osNumber}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedJob.patientName}</h3>
                    </div>
                    <button onClick={() => setSelectedJob(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Entrega</label>
                            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-transparent border-0 font-bold outline-none"/>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Horário Previsto</label>
                            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-transparent border-0 font-bold outline-none"/>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <button onClick={handleUpdateJob} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl flex items-center justify-center gap-2 transition-all">
                            <Save size={20} /> SALVAR ALTERAÇÕES
                        </button>
                        
                        {selectedJob.status !== JobStatus.COMPLETED && (
                             <button onClick={handleFinalizeJob} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 transition-all">
                                <CheckCircle size={20} /> FINALIZAR AGORA
                            </button>
                        )}
                        
                        <button onClick={() => { setSelectedJob(null); navigate(`/jobs/${selectedJob.id}`); }} className="w-full py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">
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
