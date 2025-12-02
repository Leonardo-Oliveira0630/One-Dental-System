import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UrgencyLevel } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock, X, Save, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProductionCalendar = () => {
  const { jobs, updateJob, currentUser } = useApp();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Modal State
  const [newDate, setNewDate] = useState('');

  // --- Calendar Logic ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return days;
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0 = Sunday
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  // Create grid slots
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
        // Sort: VIP first, then by OS
        if (a.urgency === UrgencyLevel.VIP && b.urgency !== UrgencyLevel.VIP) return -1;
        if (a.urgency !== UrgencyLevel.VIP && b.urgency === UrgencyLevel.VIP) return 1;
        return 0;
    });
  };

  // --- Modal Handlers ---
  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    // Format date for input type="date"
    setNewDate(new Date(job.dueDate).toISOString().split('T')[0]);
  };

  const handleUpdateDate = () => {
    if (!selectedJob || !newDate) return;
    
    // Adjust logic to prevent timezone shift issues on simple date strings
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" /> Calendário de Produção
          </h1>
          <p className="text-slate-500">Visualize as entregas e gerencie prazos.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                <ChevronLeft size={24} />
            </button>
            <div className="text-lg font-bold text-slate-800 w-40 text-center select-none">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                <ChevronRight size={24} />
            </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 text-center text-sm font-bold text-slate-500 uppercase">
                    {day}
                </div>
            ))}
        </div>
        
        {/* Days */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
            {totalSlots.map((day, index) => {
                if (!day) return <div key={index} className="bg-slate-50/30 border-b border-r border-slate-100" />;
                
                const dayJobs = getJobsForDay(day);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                return (
                    <div key={index} className={`border-b border-r border-slate-100 p-2 min-h-[100px] flex flex-col ${isToday ? 'bg-blue-50/30' : ''}`}>
                        <div className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                            {day}
                        </div>
                        
                        <div className="flex-1 space-y-1 overflow-y-auto max-h-[120px] scrollbar-thin scrollbar-thumb-slate-200">
                            {dayJobs.map(job => {
                                const isVip = job.urgency === UrgencyLevel.VIP || job.urgency === UrgencyLevel.HIGH;
                                const isDone = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
                                
                                return (
                                    <button
                                        key={job.id}
                                        onClick={() => handleJobClick(job)}
                                        className={`w-full text-left p-1.5 rounded-lg text-[10px] font-medium border shadow-sm transition-all hover:scale-[1.02] flex items-center gap-1.5 truncate ${
                                            isDone 
                                                ? 'bg-green-50 text-green-700 border-green-100 opacity-60 line-through'
                                                : isVip 
                                                    ? 'bg-orange-50 text-orange-800 border-orange-200'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                                        }`}
                                    >
                                        {isVip && <AlertTriangle size={10} className="shrink-0 text-orange-500" />}
                                        <span className="truncate">{job.osNumber} - {job.patientName}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-xl text-slate-800">{selectedJob.osNumber}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                selectedJob.status === JobStatus.COMPLETED ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                                {selectedJob.status}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{selectedJob.patientName}</h3>
                        <p className="text-sm text-slate-500">Dr. {selectedJob.dentistName}</p>
                    </div>
                    <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Date Reschedule */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Clock size={16} /> Reagendar Entrega
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button 
                                onClick={handleUpdateDate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                                title="Salvar Nova Data"
                            >
                                <Save size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Finish */}
                    {selectedJob.status !== JobStatus.COMPLETED && selectedJob.status !== JobStatus.DELIVERED ? (
                         <button 
                            onClick={handleFinalizeJob}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={20} /> Finalizar Trabalho
                        </button>
                    ) : (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center text-green-800 font-bold flex items-center justify-center gap-2">
                            <Check size={20} /> Trabalho Concluído
                        </div>
                    )}
                    
                    <button 
                        onClick={() => {
                            setSelectedJob(null);
                            navigate(`/jobs/${selectedJob.id}`);
                        }}
                        className="w-full py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                    >
                        Ver Detalhes Completos
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
