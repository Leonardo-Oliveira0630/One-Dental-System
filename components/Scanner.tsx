
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole, CommissionStatus } from '../types';
import { ScanBarcode, X, AlertTriangle, LogIn, LogOut, CheckCircle, Camera, RefreshCcw, Volume2 } from 'lucide-react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

export const GlobalScanner: React.FC = () => {
  const { jobs, updateJob, currentUser, addCommissionRecord } = useApp();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [commissionEarned, setCommissionEarned] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const SCANNER_TIMEOUT = 100;
  const MIN_LENGTH = 2;

  // Audio Context para o Beep do Scanner
  const playBeep = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) { console.warn("Beep failed:", e); }
  };

  // KEYBOARD LISTENER (Desktop/USB Scanners)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentUser || isCameraActive) return;
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
  }, [jobs, currentUser, isCameraActive]);

  // CAMERA SCANNER HANDLER
  useEffect(() => {
      if (isCameraActive && !scannerRef.current) {
          scannerRef.current = new Html5Qrcode("reader");
          const config = { fps: 20, qrbox: { width: 250, height: 150 } };
          
          scannerRef.current.start(
              { facingMode: "environment" },
              config,
              (decodedText) => {
                  processScan(decodedText);
                  stopCamera();
              },
              () => {} 
          ).catch(err => {
              console.error(err);
              setIsCameraActive(false);
          });
      }
      return () => { if (scannerRef.current) stopCamera(); };
  }, [isCameraActive]);

  const stopCamera = async () => {
      if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch(e) {}
          scannerRef.current = null;
          setIsCameraActive(false);
      }
  };

  const processScan = (code: string) => {
    setCommissionEarned(0);
    const job = jobs.find(j => (j.osNumber || '').toUpperCase() === code.toUpperCase() || j.id === code);
    
    if (job) {
      // Feedback Nativo
      playBeep();
      if (navigator.vibrate) navigator.vibrate(80);

      if (currentUser?.sector) {
          const lastEvent = job.history[job.history.length - 1];
          const isLastActionEntryHere = lastEvent?.sector === currentUser.sector && lastEvent?.action.includes('Entrada');
          setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
          
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

    await updateJob(scannedJob.id, {
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

  if (!scannedJob && !isCameraActive && currentUser?.role !== UserRole.CLIENT) {
      return (
          <button 
            onClick={() => setIsCameraActive(true)}
            className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all md:hidden"
          >
              <Camera size={28} />
          </button>
      );
  }

  if (isCameraActive) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center text-white z-20">
                  <div>
                      <h3 className="font-bold text-lg">Leitor de OS</h3>
                      <p className="text-xs opacity-70">Aponte para o código de barras da ficha</p>
                  </div>
                  <button onClick={() => stopCamera()} className="p-2 bg-white/10 rounded-full"><X/></button>
              </div>
              <div id="reader" className="w-full h-full scanner-overlay"></div>
              <div className="scanner-laser"></div>
          </div>
      );
  }

  if (!scannedJob) return null;

  const isEntry = scanAction === 'ENTRY';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border-t-[12px] ${isEntry ? 'border-blue-600' : 'border-orange-500'} animate-in zoom-in duration-200`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${isEntry ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {isEntry ? <LogIn size={32} /> : <LogOut size={32} />}
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-800">{isEntry ? 'Entrada' : 'Saída'}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Setor: {currentUser?.sector || 'Geral'}</p>
                </div>
            </div>
            <button onClick={() => setScannedJob(null)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-500 text-xs font-bold uppercase">Ordem de Serviço</span><span className="font-mono font-black text-2xl text-blue-600">{scannedJob.osNumber || "N/A"}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 text-xs font-bold uppercase">Paciente</span><span className="font-black text-slate-800">{scannedJob.patientName}</span></div>
        </div>

        {!isEntry && commissionEarned > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-4 animate-bounce">
                <div className="bg-green-600 p-3 rounded-xl text-white shadow-lg shadow-green-200"><CheckCircle size={24} /></div>
                <div>
                    <p className="text-xs font-black text-green-700 uppercase tracking-tighter">Bônus de Produção!</p>
                    <p className="text-2xl font-black text-green-800">+ R$ {commissionEarned.toFixed(2)}</p>
                </div>
            </div>
        )}

        <div className="flex gap-3">
            <button onClick={() => setScannedJob(null)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
            <button onClick={handleMoveJob} autoFocus className={`flex-[2] py-4 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 ${isEntry ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-50 hover:bg-orange-600 shadow-orange-200'}`}>
                {isEntry ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SAÍDA'}
            </button>
        </div>
      </div>
    </div>
  );
};
