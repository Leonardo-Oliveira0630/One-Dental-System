import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, UrgencyLevel, JobStatus } from '../types';
import { AlertTriangle, Calendar, Clock, Edit2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';

export const PromisedJobs = () => {
  const { jobs, updateJob } = useApp();
  const navigate = useNavigate();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Filter only VIP/High Urgency and Active Jobs
  const vipJobs = jobs.filter(j => 
    (j.urgency === UrgencyLevel.VIP || j.urgency === UrgencyLevel.HIGH) && 
    j.status !== JobStatus.COMPLETED && 
    j.status !== JobStatus.DELIVERED
  );

  // Grouping Logic
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const grouped = {
    delayed: vipJobs.filter(j => new Date(j.dueDate) < today),
    today: vipJobs.filter(j => {
        const d = new Date(j.dueDate); d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
    }),
    tomorrow: vipJobs.filter(j => {
        const d = new Date(j.dueDate); d.setHours(0,0,0,0);
        return d.getTime() === tomorrow.getTime();
    }),
    future: vipJobs.filter(j => {
        const d = new Date(j.dueDate); d.setHours(0,0,0,0);
        return d.getTime() > tomorrow.getTime();
    })
  };

  const handleEditNote = (job: Job) => {
    setEditingNoteId(job.id);
    setNoteContent(job.managerNotes || '');
  };

  const handleSaveNote = (jobId: string) => {
    updateJob(jobId, { managerNotes: noteContent });
    setEditingNoteId(null);
  };

  const renderJobCard = (job: Job, colorClass: string) => (
    <div key={job.id} className={`bg-white dark:bg-[#131B2A] p-4 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 border-l-4 ${colorClass} mb-3 relative`}>
        {/* Box Badge Absolute Top Right */}
        {job.boxNumber && (
            <div 
                className="absolute top-4 right-4 w-8 h-8 rounded flex items-center justify-center font-bold text-sm shadow-sm border border-black/10"
                style={{ 
                    backgroundColor: job.boxColor?.hex || '#ccc',
                    color: getContrastColor(job.boxColor?.hex || '#ccc')
                }}
            >
                {job.boxNumber}
            </div>
        )}

        <div className="flex justify-between items-start mb-2 pr-10">
            <div>
                <span className="font-mono font-bold text-lg text-slate-800 dark:text-slate-100">{job.osNumber}</span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight cursor-pointer hover:text-blue-500 transition-colors" onClick={() => navigate(`/jobs/${job.id}`)}>
                    {job.patientName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dr. {job.dentistName}</p>
            </div>
        </div>
        
        <div className="text-right mb-2">
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 uppercase">
                {job.currentSector || 'Recepção'}
            </span>
        </div>

        {/* Items Summary */}
        <div className="mb-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B0F17] p-2 rounded border border-slate-100 dark:border-slate-800/60">
            {job.items.map(i => i.name).join(', ')}
        </div>

        {/* Manager Notes Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {editingNoteId === job.id ? (
                <div className="flex flex-col gap-2">
                    <textarea 
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 border border-blue-300 dark:border-blue-500 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Lembrete para produção..."
                        autoFocus
                    />
                    <button 
                        onClick={() => handleSaveNote(job.id)}
                        className="self-end px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors"
                    >
                        <Save size={12} /> Salvar
                    </button>
                </div>
            ) : (
                <div className="flex justify-between items-start group">
                     <p className={`text-xs italic ${job.managerNotes ? 'text-blue-800 dark:text-blue-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                        {job.managerNotes || 'Adicionar lembrete de produção...'}
                     </p>
                     <button 
                        onClick={() => handleEditNote(job)}
                        className="text-slate-300 dark:text-slate-500 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Edit2 size={12} />
                     </button>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="space-y-6 overflow-x-auto pb-6">
       <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" /> Casos Prometidos (VIP)
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Monitoramento intensivo de prazos e fiscalização.</p>
          </div>
       </div>

       <div className="flex gap-4 sm:p-6 min-w-[1000px]">
           {/* Column: Delayed */}
           <div className="flex-1 min-w-[280px]">
                <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-t-xl border-b-2 border-red-200 dark:border-red-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                        <AlertTriangle size={16} /> Atrasados
                    </h3>
                    <span className="bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200 text-xs font-bold px-2 py-0.5 rounded-full">{grouped.delayed.length}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-[#0B0F17] p-3 min-h-[500px] rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800">
                    {grouped.delayed.map(j => renderJobCard(j, 'border-red-500'))}
                    {grouped.delayed.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">Nenhum atraso.</p>}
                </div>
           </div>

           {/* Column: Today */}
           <div className="flex-1 min-w-[280px]">
                <div className="bg-yellow-50 dark:bg-amber-950/40 p-3 rounded-t-xl border-b-2 border-yellow-200 dark:border-amber-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-yellow-800 dark:text-amber-300 flex items-center gap-2">
                        <Clock size={16} /> Para Hoje
                    </h3>
                    <span className="bg-yellow-200 dark:bg-amber-900/60 text-yellow-800 dark:text-amber-200 text-xs font-bold px-2 py-0.5 rounded-full">{grouped.today.length}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-[#0B0F17] p-3 min-h-[500px] rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800">
                    {grouped.today.map(j => renderJobCard(j, 'border-yellow-500'))}
                    {grouped.today.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">Tudo entregue hoje.</p>}
                </div>
           </div>

           {/* Column: Tomorrow */}
           <div className="flex-1 min-w-[280px]">
                <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-t-xl border-b-2 border-blue-200 dark:border-blue-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <Calendar size={16} /> Amanhã
                    </h3>
                    <span className="bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-bold px-2 py-0.5 rounded-full">{grouped.tomorrow.length}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-[#0B0F17] p-3 min-h-[500px] rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800">
                     {grouped.tomorrow.map(j => renderJobCard(j, 'border-blue-500'))}
                     {grouped.tomorrow.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">Nada para amanhã.</p>}
                </div>
           </div>

            {/* Column: Future */}
            <div className="flex-1 min-w-[280px]">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-t-xl border-b-2 border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Calendar size={16} /> Próximos
                    </h3>
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">{grouped.future.length}</span>
                </div>
                <div className="bg-slate-100/50 dark:bg-[#0B0F17] p-3 min-h-[500px] rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800">
                     {grouped.future.map(j => renderJobCard(j, 'border-slate-400'))}
                </div>
           </div>
       </div>
    </div>
  );
};