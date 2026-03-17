
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole, CommissionStatus } from '../types';
import { ScanBarcode, X, AlertTriangle, LogIn, LogOut, CheckCircle, Camera, RefreshCcw, Volume2, MessageCircle, Loader2, ImagePlus } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

// Importação segura do Capacitor
const playNativeHaptic = async (isSuccess: boolean) => {
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: isSuccess ? ImpactStyle.Medium : ImpactStyle.Heavy });
    } catch (e) {
        // Fallback para Web Vibrate API
        if (navigator.vibrate) {
            navigator.vibrate(isSuccess ? [10, 30, 10] : [100, 50, 100]);
        }
    }
};

export const GlobalScanner: React.FC = () => {
  const { jobs, updateJob, currentUser, addCommissionRecord, commissions, uploadFile } = useApp();
  const navigate = useNavigate();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [commissionEarned, setCommissionEarned] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const SCANNER_TIMEOUT = 100;
  const MIN_LENGTH = 2;

  const playBeep = (success = true) => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(success ? 880 : 440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

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
  }, [jobs, currentUser, isCameraActive, scannedJob, scanAction]);

  const processScanRef = useRef<((code: string) => Promise<void>) | null>(null);
  useEffect(() => {
      processScanRef.current = processScan;
  });

  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;

      if (isCameraActive && videoRef.current) {
          const activeReader = new BrowserMultiFormatReader();
          reader = activeReader;
          
          const startScanner = async () => {
              try {
                  if (videoRef.current && isMounted) {
                      await activeReader.decodeFromConstraints(
                          {
                              audio: false,
                              video: {
                                  facingMode: 'environment',
                                  width: { ideal: 1280 },
                                  height: { ideal: 720 }
                              }
                          },
                          videoRef.current,
                          (result, err) => {
                              if (result && isMounted) {
                                  if (processScanRef.current) {
                                      processScanRef.current(result.getText());
                                  }
                                  setIsCameraActive(false);
                              }
                          }
                      );
                  }
              } catch (err) {
                  console.error("Camera error:", err);
                  // Fallback to any camera if environment fails
                  if (isMounted && videoRef.current) {
                      try {
                          await activeReader.decodeFromVideoDevice(
                              null,
                              videoRef.current,
                              (result, err) => {
                                  if (result && isMounted) {
                                      if (processScanRef.current) {
                                          processScanRef.current(result.getText());
                                      }
                                      setIsCameraActive(false);
                                  }
                              }
                          );
                      } catch (fallbackErr) {
                          console.error("Fallback camera error:", fallbackErr);
                          if (isMounted) setIsCameraActive(false);
                      }
                  }
              }
          };

          startScanner();
      }

      return () => { 
          isMounted = false;
          if (reader) {
              reader.reset();
          }
      };
  }, [isCameraActive]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannedJob || !currentUser) return;

    setIsUploading(true);
    try {
      const url = await uploadFile(file);
      const newAttachment = {
        id: `att_${Date.now()}`,
        name: `Foto_Scanner_${new Date().toLocaleTimeString()}.jpg`,
        url,
        uploadedAt: new Date()
      };
      await updateJob(scannedJob.id, {
        attachments: [...(scannedJob.attachments || []), newAttachment]
      });
      setScannedJob(prev => prev ? {
          ...prev,
          attachments: [...(prev.attachments || []), newAttachment]
      } : null);
      
      alert('Foto anexada com sucesso!');
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const processScan = async (code: string) => {
    // Lógica de confirmação por "Bip Duplo"
    if (scannedJob) {
        if ((scannedJob.osNumber || '').toUpperCase() === code.toUpperCase() || scannedJob.id === code) {
            await playNativeHaptic(true);
            playBeep(true);
            await handleMoveJob();
            return;
        }
    }

    setCommissionEarned(0);
    const job = jobs.find(j => (j.osNumber || '').toUpperCase() === code.toUpperCase() || j.id === code);
    
    if (job) {
      await playNativeHaptic(true);
      playBeep(true);
      if (currentUser?.sector) {
          const lastEvent = job.history[job.history.length - 1];
          const isLastActionEntryHere = lastEvent?.sector === currentUser.sector && lastEvent?.action.includes('Entrada');
          setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
          
          if (isLastActionEntryHere) {
              // Verificar se já existe comissão para este job/usuário/setor
              const alreadyPaid = commissions.some(c => 
                  c.jobId === job.id && 
                  c.userId === currentUser.id && 
                  c.sector === currentUser.sector
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
                  setCommissionEarned(totalComm);
              } else {
                  setCommissionEarned(0);
              }
          }
      } else {
          setScanAction('ENTRY');
      }
      setScannedJob(job);
    } else {
        await playNativeHaptic(false);
        playBeep(false);
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
                      <h3 className="font-bold text-lg">Leitor My Tooth</h3>
                      <p className="text-xs opacity-70">Aponte para o código de barras</p>
                  </div>
                  <button onClick={() => setIsCameraActive(false)} className="p-2 bg-white/10 rounded-full"><X/></button>
              </div>
              <video ref={videoRef} className="w-full h-full object-cover"></video>
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
            <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-500 text-xs font-bold uppercase">OS</span><span className="font-mono font-black text-2xl text-blue-600">{scannedJob.osNumber || "N/A"}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 text-xs font-bold uppercase">Paciente</span><span className="font-black text-slate-800">{scannedJob.patientName}</span></div>
        </div>

        {/* Ações Rápidas (Mobile) */}
        <div className="flex gap-3 mb-6 md:hidden">
            <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                id="scanner-camera-upload" 
                onChange={handleFileUpload} 
            />
            <button 
                onClick={() => document.getElementById('scanner-camera-upload')?.click()}
                disabled={isUploading}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                <span>Foto</span>
            </button>
            <button 
                onClick={() => {
                    const jobId = scannedJob.id;
                    setScannedJob(null);
                    navigate(`/jobs/${jobId}`);
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
                <MessageCircle size={18} />
                <span>Chat</span>
            </button>
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
            <button onClick={handleMoveJob} autoFocus className={`flex-[2] py-4 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex flex-col items-center justify-center leading-tight ${isEntry ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-50 hover:bg-orange-600 shadow-orange-200'}`}>
                <span>{isEntry ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SAÍDA'}</span>
                <span className="text-[10px] font-medium opacity-80 mt-1">ou bipe novamente</span>
            </button>
        </div>
      </div>
    </div>
  );
};
