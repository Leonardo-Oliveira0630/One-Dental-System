
import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowRight, CheckCircle2, Loader2, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole } from '../types';

export const JobSearch = () => {
  const { jobs, currentUser, updateJob, addCommissionRecord, commissions } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredJobs = query.trim().length > 0 
    ? jobs.filter(job => 
        job.patientName.toLowerCase().includes(query.toLowerCase()) ||
        job.id.toLowerCase().includes(query.toLowerCase()) ||
        (job.osNumber && job.osNumber.toLowerCase().includes(query.toLowerCase())) ||
        job.dentistName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
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

  const handleMoveJob = async (e: React.MouseEvent, job: Job, actionType: 'ENTRY' | 'EXIT') => {
    e.stopPropagation();
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
        // Verificar se já existe comissão para este job/usuário/setor
        const alreadyPaid = commissions.some(c => 
            c.jobId === job.id && 
            c.userId === currentUser.id && 
            c.sector === sector
        );

        if (!alreadyPaid) {
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
      }

      let newSectorMovements = [...(job.sectorMovements || []).filter(Boolean)];
      const currentOpenMovements = newSectorMovements.filter(m => !m.exitTime);

      if (actionType === 'ENTRY') {
          currentOpenMovements.forEach(m => {
              const idx = newSectorMovements.findIndex(sm => sm.id === m.id);
              if (idx !== -1) {
                  newSectorMovements[idx] = {
                      ...newSectorMovements[idx],
                      exitTime: new Date(),
                      exitUserId: currentUser.id,
                      exitUserName: currentUser.name
                  };
              }
          });

          newSectorMovements.push({
              id: Math.random().toString(),
              sector: sector,
              entryTime: new Date(),
              entryUserId: currentUser.id,
              entryUserName: currentUser.name
          });
      } else if (actionType === 'EXIT') {
          const openMovementIndex = newSectorMovements.findIndex(m => m.sector === sector && !m.exitTime);
          if (openMovementIndex !== -1) {
              newSectorMovements[openMovementIndex] = {
                  ...newSectorMovements[openMovementIndex],
                  exitTime: new Date(),
                  exitUserId: currentUser.id,
                  exitUserName: currentUser.name
              };
          } else if (currentOpenMovements.length > 0) {
              const latestOpen = [...currentOpenMovements].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0];
              const idx = newSectorMovements.findIndex(sm => sm.id === latestOpen.id);
              if (idx !== -1) {
                  newSectorMovements[idx] = {
                      ...newSectorMovements[idx],
                      exitTime: new Date(),
                      exitUserId: currentUser.id,
                      exitUserName: currentUser.name
                  };
              }
          }
      }

      await updateJob(job.id, {
        currentSector: sector,
        status: newStatus,
        sectorMovements: newSectorMovements,
        history: [...(job.history || []).filter(Boolean), {
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

  const handleNavigateToJob = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
    setQuery('');
    setIsOpen(false);
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
          placeholder="Buscar trabalho (Paciente, ID, OS...)"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
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
                    onClick={() => handleNavigateToJob(job.id)}
                    className="p-3 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700">{job.patientName}</span>
                        {job.osNumber && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 rounded">#{job.osNumber}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: {job.id.split('_').pop()}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">Dr(a). {job.dentistName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="p-2 text-slate-300 group-hover:text-blue-500 transition-colors">
                        <Eye size={20} />
                      </div>
                      {currentUser?.sector && (
                        <div className="flex items-center gap-1 border-l border-slate-100 pl-2 ml-1">
                          {job.currentSector !== currentUser.sector ? (
                            <button
                              onClick={(e) => handleMoveJob(e, job, 'ENTRY')}
                              disabled={isProcessing === job.id}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 disabled:opacity-50"
                              title="Dar entrada no meu setor"
                            >
                              {isProcessing === job.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <>
                                  <span>Entrada</span>
                                  <ArrowRight size={10} />
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleMoveJob(e, job, 'EXIT')}
                              disabled={isProcessing === job.id}
                              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 disabled:opacity-50"
                              title="Dar saída do meu setor"
                            >
                              {isProcessing === job.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <>
                                  <span>Saída</span>
                                  <ArrowRight size={10} />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-900">Nenhum trabalho encontrado</p>
                <p className="text-xs text-slate-500 mt-1">Verifique o nome, ID ou OS e tente novamente</p>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique para ver detalhes</span>
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
