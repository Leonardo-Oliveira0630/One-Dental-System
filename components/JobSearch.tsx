
import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole } from '../types';

export const JobSearch = () => {
  const { jobs, currentUser, updateJob, addCommissionRecord } = useApp();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredJobs = query.trim().length > 0 
    ? jobs.filter(job => 
        job.patientName.toLowerCase().includes(query.toLowerCase()) ||
        job.id.toLowerCase().includes(query.toLowerCase()) ||
        job.dentistName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMoveJob = async (job: Job, actionType: 'ENTRY' | 'EXIT') => {
    if (!currentUser?.sector) return;
    
    setIsProcessing(job.id);
    try {
      const sector = currentUser.sector;
      const action = actionType === 'ENTRY' ? `Entrada manual no setor ${sector}` : `Saída manual do setor ${sector}`;
      let newStatus = job.status;

      if (actionType === 'ENTRY' && (job.status === JobStatus.PENDING || job.status === JobStatus.WAITING_APPROVAL)) {
        newStatus = JobStatus.IN_PROGRESS;
      }

      // Se for Saída, calcular comissão
      if (actionType === 'EXIT') {
        let totalComm = 0;
        job.items.forEach(item => {
          if (item.commissionDisabled) return;
          const setting = currentUser.commissionSettings?.find(s => s.jobTypeId === item.jobTypeId);
          if (setting) {
            if (setting.type === 'FIXED') totalComm += setting.value * item.quantity;
            else totalComm += (item.price * item.quantity * (setting.value / 100));
          }
        });

        if (totalComm > 0) {
          await addCommissionRecord({
            userId: currentUser.id,
            userName: currentUser.name,
            jobId: job.id,
            osNumber: job.osNumber || 'N/A',
            patientName: job.patientName,
            amount: totalComm,
            status: 'PENDING' as any,
            createdAt: new Date(),
            sector: sector
          });
        }
      }

      await updateJob(job.id, {
        currentSector: sector,
        status: newStatus,
        history: [...job.history, {
          id: Math.random().toString(),
          timestamp: new Date(),
          action: action,
          userId: currentUser.id,
          userName: currentUser.name,
          sector: sector
        }]
      });
      setQuery('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating job sector:', error);
    } finally {
      setIsProcessing(null);
    }
  };

  if (currentUser?.role === UserRole.CLIENT) return null;

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar trabalho (Paciente, ID...)"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {filteredJobs.length > 0 ? (
              <div className="space-y-1">
                {filteredJobs.map((job) => (
                  <div 
                    key={job.id}
                    className="p-3 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-900 truncate">{job.patientName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: {job.id.split('_').pop()}</span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded uppercase">{job.currentSector || 'Sem Setor'}</span>
                      </div>
                    </div>
                    
                    {currentUser?.sector && (
                      <div className="flex items-center gap-2">
                        {job.currentSector !== currentUser.sector ? (
                          <button
                            onClick={() => handleMoveJob(job, 'ENTRY')}
                            disabled={isProcessing === job.id}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isProcessing === job.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <span>Dar Entrada</span>
                                <ArrowRight size={14} />
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMoveJob(job, 'EXIT')}
                            disabled={isProcessing === job.id}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isProcessing === job.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <span>Dar Saída</span>
                                <ArrowRight size={14} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-900">Nenhum trabalho encontrado</p>
                <p className="text-xs text-slate-500 mt-1">Verifique o nome ou ID e tente novamente</p>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resultados da busca</span>
            {currentUser?.sector && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Setor:</span>
                <span className="text-[10px] font-black text-blue-600 uppercase">{currentUser.sector}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
