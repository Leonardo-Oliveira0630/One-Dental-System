
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole, CommissionStatus } from '../types';
import { ScanBarcode, X, AlertTriangle, LogIn, LogOut, CheckCircle } from 'lucide-react';

export const GlobalScanner: React.FC = () => {
  const { jobs, updateJob, currentUser, addCommissionRecord } = useApp();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commissionEarned, setCommissionEarned] = useState<number>(0);

  const SCANNER_TIMEOUT = 100;
  const MIN_LENGTH = 2;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentUser) return;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      if (e.key === 'Enter') {
          if (bufferRef.current.length >= MIN_LENGTH) {
              e.preventDefault();
              processScan(bufferRef.current);
          }
          bufferRef.current = '';
          return;
      }

      if (timeDiff > SCANNER_TIMEOUT) bufferRef.current = '';
      if (e.key.length === 1) bufferRef.current += e.key;
      lastKeyTimeRef.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jobs, currentUser]);

  const processScan = (code: string) => {
    setErrorMsg(null);
    setCommissionEarned(0);
    const job = jobs.find(j => (j.osNumber || '').toUpperCase() === code.toUpperCase() || j.id === code);
    
    if (job) {
      if (currentUser?.sector) {
          const lastEvent = job.history[job.history.length - 1];
          const isLastActionEntryHere = lastEvent?.sector === currentUser.sector && lastEvent?.action.includes('Entrada');
          setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
          
          // Se for SAÍDA, calcula potencial comissão
          if (isLastActionEntryHere) {
              let totalComm = 0;
              job.items.forEach(item => {
                  if (item.commissionDisabled) return;
                  const setting = currentUser.commissionSettings?.find(s => s.jobTypeId === item.jobTypeId);
                  if (setting) {
                      if (setting.type === 'FIXED') totalComm += setting.value * item.quantity;
                      else totalComm += (item.price * item.quantity * (setting.value / 100));
                  }
              });
              setCommissionEarned(totalComm);
          }
      } else {
          setScanAction('ENTRY');
      }
      setScannedJob(job);
    }
  };

  const handleMoveJob = async () => {
    if (!scannedJob || !currentUser) return;

    let newStatus = scannedJob.status;
    let sector = currentUser.sector || scannedJob.currentSector || 'Gestão';
    let action = scanAction === 'ENTRY' ? `Entrada no setor ${sector}` : `Saída do setor ${sector}`;

    if (scanAction === 'ENTRY' && (scannedJob.status === JobStatus.PENDING || scannedJob.status === JobStatus.WAITING_APPROVAL)) {
        newStatus = JobStatus.IN_PROGRESS;
    }

    // Se for SAÍDA e houver comissão, registra o ganho
    if (scanAction === 'EXIT' && commissionEarned > 0) {
        await addCommissionRecord({
            userId: currentUser.id,
            userName: currentUser.name,
            jobId: scannedJob.id,
            osNumber: scannedJob.osNumber || 'N/A',
            patientName: scannedJob.patientName,
            amount: commissionEarned,
            status: CommissionStatus.PENDING,
            createdAt: new Date(),
            sector: sector
        });
    }

    updateJob(scannedJob.id, {
        status: newStatus,
        currentSector: sector,
        history: [...scannedJob.history, {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: action,
            userId: currentUser.id,
            userName: currentUser.name,
            sector: sector
        }]
    });
    setScannedJob(null);
  };

  if (!scannedJob) return null;

  const isEntry = scanAction === 'ENTRY';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-t-8 ${isEntry ? 'border-blue-600' : 'border-orange-500'} animate-in zoom-in duration-200`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${isEntry ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {isEntry ? <LogIn size={32} /> : <LogOut size={32} />}
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-800">{isEntry ? 'Entrada' : 'Saída'}</h3>
                    <p className="text-sm text-slate-500">Setor: {currentUser?.sector || 'Geral'}</p>
                </div>
            </div>
            <button onClick={() => setScannedJob(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-2">
            <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">OS / Código</span><span className="font-mono font-bold text-xl">{scannedJob.osNumber || "N/A"}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Paciente</span><span className="font-bold">{scannedJob.patientName}</span></div>
        </div>

        {!isEntry && commissionEarned > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-bounce">
                <div className="bg-green-600 p-2 rounded-lg text-white"><CheckCircle size={20} /></div>
                <div>
                    <p className="text-xs font-bold text-green-700 uppercase">Comissão Gerada!</p>
                    <p className="text-lg font-black text-green-800">+ R$ {commissionEarned.toFixed(2)}</p>
                </div>
            </div>
        )}

        <div className="flex gap-3">
            <button onClick={() => setScannedJob(null)} className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleMoveJob} autoFocus className={`flex-1 py-4 text-white font-bold rounded-xl shadow-xl transition-all ${isEntry ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                CONFIRMAR {isEntry ? 'ENTRADA' : 'SAÍDA'}
            </button>
        </div>
      </div>
    </div>
  );
};
