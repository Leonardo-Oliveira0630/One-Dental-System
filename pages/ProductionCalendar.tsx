
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UrgencyLevel } from '../types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  AlertTriangle, CheckCircle, Clock, X, Save, Check, 
  Package, AlertCircle, Info 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';

export const ProductionCalendar = () => {
  const { jobs, updateJob, currentUser, manualDentists, allUsers } = useApp();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Modal State
  const [newDate, setNewDate] = useState('');

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
        // Prioridade visual no grid: Atrasados primeiro, depois VIP
        const aDone = a.status === JobStatus.COMPLETED || a.status === JobStatus.DELIVERED;
        const bDone = b.status === JobStatus.COMPLETED || b.status === JobStatus.DELIVERED;
        if (aDone && !bDone) return 1;
        if (!aDone && bDone) return -1;
        return 0;
    });
  };

  // --- Modal Handlers ---
  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setNewDate(new Date(job.dueDate).toISOString().split('T')[0]);
  };

  const handleUpdateDate = () => {
    if (!selectedJob || !newDate) return;
    const dateParts = newDate.split('-');
    const adjustedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));

    updateJob(selectedJob.id, {
        dueDate: adjustedDate,
        history: [...selectedJob.history, {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: `Data Prometida alterada para ${adjustedDate.toLocaleDateString()}`,
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

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <CalendarIcon className="text-blue-600" /> Fluxo de Bancada
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">Planejamento mensal de entregas e coletas</p>
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

      {/* LEGENDA DE CORES */}
      <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-6">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1"><Info size={14}/> Legenda:</span>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase">Atrasados</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase">Urgentes / VIP</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase">Via Correios</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></div>
              <span className="text-[10px] font-black text-slate-600 uppercase">Normal / Concluído</span>
          </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {day}
                </div>
            ))}
        </div>
        
        {/* Days */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto no-scrollbar">
            {totalSlots.map((day, index) => {
                if (!day) return <div key={index} className="bg-slate-50/20 border-b border-r border-slate-50" />;
                
                const dayJobs = getJobsForDay(day);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                return (
                    <div key={index} className={`border-b border-r border-slate-50 p-2 min-h-[120px] flex flex-col group transition-colors ${isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/30'}`}>
                        <div className={`text-xs font-black mb-2 w-6 h-6 flex items-center justify-center rounded-lg transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
                            {day}
                        </div>
                        
                        <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar max-h-[160px]">
                            {dayJobs.map(job => {
                                const isVip = job.urgency === UrgencyLevel.VIP || job.urgency === UrgencyLevel.HIGH;
                                const isDone = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
                                const isDelayed = !isDone && new Date(job.dueDate) < new Date(new Date().setHours(0,0,0,0));
                                
                                // Cruzamento de dados para identificar Correios
                                const dentist = manualDentists.find(d => d.id === job.dentistId) || allUsers.find(u => u.id === job.dentistId);
                                const isPost = dentist?.deliveryViaPost;

                                const boxColorHex = job.boxColor?.hex || '#cbd5e1';
                                
                                // Lógica de Cores do Card
                                let cardStyle = "bg-white border-slate-100 hover:border-blue-300";
                                let textClass = "text-slate-800";
                                let tagIcon = null;

                                if (isDone) {
                                    cardStyle = "bg-slate-50 border-slate-100 opacity-50 grayscale";
                                    textClass = "text-slate-500";
                                } else if (isDelayed) {
                                    cardStyle = "bg-red-50 border-red-200 shadow-sm shadow-red-100 hover:border-red-400";
                                    textClass = "text-red-900";
                                    tagIcon = <Clock size={10} className="text-red-500" />;
                                } else if (isVip) {
                                    cardStyle = "bg-orange-50 border-orange-200 shadow-sm shadow-orange-100 hover:border-orange-400";
                                    textClass = "text-orange-900";
                                    tagIcon = <AlertCircle size={10} className="text-orange-500" />;
                                } else if (isPost) {
                                    cardStyle = "bg-indigo-50 border-indigo-200 hover:border-indigo-400";
                                    textClass = "text-indigo-900";
                                    tagIcon = <Package size={10} className="text-indigo-500" />;
                                }

                                return (
                                    <button
                                        key={job.id}
                                        onClick={() => handleJobClick(job)}
                                        className={`w-full text-left p-1.5 rounded-xl border shadow-sm transition-all hover:scale-[1.03] active:scale-95 flex items-start gap-1.5 ${cardStyle}`}
                                    >
                                        {/* Quadrado da Caixa */}
                                        <div 
                                            className="w-5 h-5 shrink-0 rounded-lg flex items-center justify-center font-black text-[9px] shadow-sm border border-black/5 mt-0.5"
                                            style={{ backgroundColor: boxColorHex, color: getContrastColor(boxColorHex) }}
                                        >
                                            {job.boxNumber || '-'}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col leading-[1.1]">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className={`truncate font-black uppercase tracking-tighter text-[9px] ${textClass}`}>
                                                    {job.dentistName}
                                                </span>
                                                {tagIcon}
                                            </div>
                                            <span className="truncate text-slate-500 font-bold uppercase text-[8px] opacity-70">
                                                {job.patientName}
                                            </span>
                                            <span className="truncate text-blue-600 font-mono font-black tracking-widest text-[8px]">
                                                #{job.osNumber}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* JOB EDIT MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md animate-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-black text-2xl text-blue-600 tracking-tighter">#{selectedJob.osNumber}</span>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-widest ${
                                selectedJob.status === JobStatus.COMPLETED ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                                {selectedJob.status}
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedJob.patientName}</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dr(a). {selectedJob.dentistName}</p>
                    </div>
                    <button onClick={() => setSelectedJob(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Date Reschedule */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Clock size={14} className="text-blue-500" /> Reprogramar Entrega
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                            />
                            <button 
                                onClick={handleUpdateDate}
                                className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
                                title="Salvar Nova Data"
                            >
                                <Save size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Status Info */}
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <Info size={20} className="text-blue-600 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-blue-400 uppercase leading-none mb-1">Localização Atual</p>
                            <p className="font-bold text-blue-900 truncate uppercase">{selectedJob.currentSector || 'Triagem / Entrada'}</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {selectedJob.status !== JobStatus.COMPLETED && selectedJob.status !== JobStatus.DELIVERED ? (
                             <button 
                                onClick={handleFinalizeJob}
                                className="w-full py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-xl shadow-green-100 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                            >
                                <CheckCircle size={22} /> FINALIZAR TRABALHO
                            </button>
                        ) : (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-center text-green-800 font-black uppercase text-xs flex items-center justify-center gap-2">
                                <Check size={20} /> Trabalho Concluído
                            </div>
                        )}
                        
                        <button 
                            onClick={() => {
                                setSelectedJob(null);
                                navigate(`/jobs/${selectedJob.id}`);
                            }}
                            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                        >
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
