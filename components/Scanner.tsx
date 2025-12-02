import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole } from '../types';
import { ScanBarcode, X, AlertTriangle, ShieldAlert, LogIn, LogOut } from 'lucide-react';

export const GlobalScanner: React.FC = () => {
  const { jobs, updateJob, currentUser } = useApp();
  
  // High-performance buffer using refs instead of state to prevent re-render lags with fast USB scanners
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  // UI State for the Modal
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Config
  const SCANNER_TIMEOUT = 100; // ms: Gap allows to distinguish between manual typing and scanner
  const MIN_LENGTH = 2; // Min chars to consider a valid scan

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is not logged in, ignore scanner
      if (!currentUser) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      // 1. Detect "Enter" (Scanner usually sends [CODE] + [ENTER])
      if (e.key === 'Enter') {
          // If we have a valid buffer content accumulated rapidly
          if (bufferRef.current.length >= MIN_LENGTH) {
              // Prevent default form submissions if scanner triggers while in an input
              e.preventDefault();
              e.stopPropagation();
              
              processScan(bufferRef.current);
          }
          // Always clear buffer on Enter
          bufferRef.current = '';
          lastKeyTimeRef.current = currentTime;
          return;
      }

      // 2. Logic to differentiate Scanner vs Manual Typing
      // If the gap between keys is huge, it's likely a human typing manually. Reset buffer.
      // Scanners type at <30-50ms intervals.
      if (timeDiff > SCANNER_TIMEOUT) {
          bufferRef.current = '';
      }

      // 3. Ignore control keys, just capture printable characters
      if (e.key.length === 1) {
          bufferRef.current += e.key;
      }

      lastKeyTimeRef.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jobs, currentUser]); // Dependencies needed for processScan context

  const processScan = (code: string) => {
    setErrorMsg(null);
    console.log("Global Scanner Detected:", code);
    
    // Logic: Find job by OS Number or ID (Case insensitive)
    const job = jobs.find(j => 
        (j.osNumber && j.osNumber.toUpperCase() === code.toUpperCase()) || 
        j.id === code
    );
    
    if (job) {
      // --- PRODUCTION LOGIC: ENTRY vs EXIT ---
      if (currentUser?.sector) {
          // Check history to decide if it's an Entry or Exit for this sector
          // Logic: If the LAST action in this specific sector was "Entrada", then now it is "Saída".
          // Otherwise, it is "Entrada".
          
          const lastEvent = job.history[job.history.length - 1];
          const isLastActionEntryHere = lastEvent?.sector === currentUser.sector && lastEvent?.action.includes('Entrada');

          if (isLastActionEntryHere) {
              setScanAction('EXIT');
          } else {
              setScanAction('ENTRY');
          }
      } else {
          // Admin/Manager (No specific sector) -> Default to simple Entry/Tracking
          setScanAction('ENTRY');
      }

      setScannedJob(job);
    } else {
        console.warn(`Job not found via scan: ${code}`);
        // Optional: Audio feedback for error could be added here
    }
  };

  const handleMoveJob = () => {
    if (!scannedJob || !currentUser) return;

    let newStatus = scannedJob.status;
    let sector = currentUser.sector || scannedJob.currentSector || 'Gestão';
    let action = '';

    if (scanAction === 'ENTRY') {
        action = `Entrada no setor ${sector}`;
        // If coming from pending/waiting, start progress
        if (scannedJob.status === JobStatus.PENDING || scannedJob.status === JobStatus.WAITING_APPROVAL) {
            newStatus = JobStatus.IN_PROGRESS;
        }
    } else {
        action = `Saída do setor ${sector}`;
        // Status remains In Progress (or could logic to check if it's the final sector)
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
    setErrorMsg(null);
  };

  if (!scannedJob) return null;

  // Visual Styles based on Action
  const isEntry = scanAction === 'ENTRY';
  const themeColor = isEntry ? 'blue' : 'orange';
  const ThemeIcon = isEntry ? LogIn : LogOut;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-t-8 ${isEntry ? 'border-blue-600' : 'border-orange-500'} animate-in zoom-in duration-200 scale-100`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${isEntry ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'} shadow-inner`}>
                    <ThemeIcon size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 leading-none">
                        {isEntry ? 'Registrar Entrada' : 'Registrar Saída'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {isEntry ? 'Iniciando etapa no setor' : 'Finalizando etapa no setor'}
                    </p>
                </div>
            </div>
            <button onClick={() => { setScannedJob(null); setErrorMsg(null); }} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 text-sm font-medium">OS / Código</span>
                <span className="font-mono font-bold text-2xl text-slate-800 tracking-wider">{scannedJob.osNumber || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm font-medium">Paciente</span>
                <span className="font-bold text-lg text-slate-800">{scannedJob.patientName}</span>
            </div>
             <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 text-sm font-medium">Setor do Usuário</span>
                <span className={`font-bold px-2 py-0.5 rounded text-sm uppercase ${isEntry ? 'text-blue-600 bg-blue-50' : 'text-orange-600 bg-orange-50'}`}>
                    {currentUser?.sector || 'Geral'}
                </span>
            </div>
        </div>

        {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800 flex items-start gap-3">
                <AlertTriangle size={20} className="shrink-0 mt-0.5 text-red-600" />
                <span className="font-medium">{errorMsg}</span>
            </div>
        )}

        <div className="flex gap-3">
            <button 
                onClick={() => { setScannedJob(null); setErrorMsg(null); }}
                className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
            >
                Cancelar
            </button>
            {!errorMsg && (
                <button 
                    onClick={handleMoveJob}
                    autoFocus
                    className={`flex-1 py-4 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-[1.02] ${
                        isEntry 
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                        : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                    }`}
                >
                    CONFIRMAR {isEntry ? 'ENTRADA' : 'SAÍDA'}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};