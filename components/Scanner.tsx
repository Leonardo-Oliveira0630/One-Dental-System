
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
  const { jobs, updateJob, currentUser, addCommissionRecord, commissions, uploadFile, sectors } = useApp();
  const navigate = useNavigate();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [commissionEarned, setCommissionEarned] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [nextSector, setNextSector] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const SCANNER_TIMEOUT = 30; // Reduzido para maior precisão em scanners rápidos
  const MIN_LENGTH = 3;

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

  // Refs para manter o listener estável e evitar re-registros frequentes
  const currentUserRef = useRef(currentUser);
  const isCameraActiveRef = useRef(isCameraActive);
  const jobsRef = useRef(jobs);
  const commissionsRef = useRef(commissions);
  const scannedJobRef = useRef(scannedJob);
  const scanActionRef = useRef(scanAction);
  const nextSectorRef = useRef(nextSector);

  useEffect(() => {
    const handleOpenJobScannerPopup = (e: any) => {
        const jobId = e.detail?.jobId;
        if (!jobId) return;
        const job = jobsRef.current.find(j => j.id === jobId);
        if (job) {
            setScannedJob(job);
            
            // Determine action based on current sector
            const isEntry = job.status === JobStatus.SECTOR_TRANSITION || job.status === JobStatus.PENDING;
            setScanAction(isEntry ? 'ENTRY' : 'EXIT');
            setCommissionEarned(0);
            setNextSector('');
        }
    };

    window.addEventListener('open-job-scanner-popup', handleOpenJobScannerPopup);
    return () => window.removeEventListener('open-job-scanner-popup', handleOpenJobScannerPopup);
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
    isCameraActiveRef.current = isCameraActive;
    jobsRef.current = jobs;
    commissionsRef.current = commissions;
    scannedJobRef.current = scannedJob;
    scanActionRef.current = scanAction;
    nextSectorRef.current = nextSector;
  }, [currentUser, isCameraActive, jobs, commissions, scannedJob, scanAction, nextSector]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueio ultra-agressivo de Ctrl+J / Cmd+J (Downloads no Chrome) e variações
      // Scanners Elgin/Bematech costumam enviar Ctrl+J como sufixo (Line Feed)
      const isCtrlJ = (e.ctrlKey || e.metaKey) && (
        e.key?.toLowerCase() === 'j' || 
        e.keyCode === 74 || 
        e.which === 74
      );
      
      const isLineFeed = e.key === '\n' || e.keyCode === 10 || e.which === 10;

      if (isCtrlJ || isLineFeed) {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          
          // Se houver algo no buffer, processar agora
          if (bufferRef.current.length >= MIN_LENGTH) {
              processScan(bufferRef.current);
          }
          bufferRef.current = '';
          return;
      }

      // Bloqueio de Ctrl+M / Cmd+M (Enter) que alguns scanners enviam
      const isCtrlM = (e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 'm' || e.keyCode === 13 || e.which === 13);
      if (isCtrlM) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (bufferRef.current.length >= MIN_LENGTH) {
              processScan(bufferRef.current);
          }
          bufferRef.current = '';
          return;
      }

      // Bloqueio de Ctrl+N / Cmd+N (Nova Janela) e Ctrl+T / Cmd+T (Nova Guia)
      if ((e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 'n' || e.key?.toLowerCase() === 't')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
      }

      // Ignorar se câmera ativa ou se for apenas uma tecla modificadora
      if (!currentUserRef.current || isCameraActiveRef.current || ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      // Detectar se é um scanner (entrada muito rápida)
      const isScannerInput = timeDiff < SCANNER_TIMEOUT;

      // Tratamento para Enter ou Tab (terminadores comuns)
      if (e.key === 'Enter' || e.key === 'Tab') {
          if (bufferRef.current.length >= MIN_LENGTH) {
              e.preventDefault();
              e.stopPropagation();
              processScan(bufferRef.current);
          }
          bufferRef.current = '';
          return;
      }

      // Se o tempo entre teclas for muito longo, resetar o buffer (provavelmente digitação manual)
      if (timeDiff > 200) {
          const target = e.target as HTMLElement;
          if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
              bufferRef.current = '';
          }
      }

      // Capturar apenas caracteres individuais
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          bufferRef.current += e.key;
          
          // Se detectarmos que é um scanner (pelo menos a partir do 2º caractere), 
          // podemos tentar evitar que o texto "vaze" para inputs focados
          if (isScannerInput) {
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                  // e.preventDefault(); // Cuidado: pode ser agressivo demais
              }
          }
      }

      lastKeyTimeRef.current = currentTime;
    };

    const preventShortcuts = (e: KeyboardEvent) => {
      const isCtrlJ = (e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 'j' || e.keyCode === 74 || e.which === 74);
      const isCtrlM = (e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 'm' || e.keyCode === 13 || e.which === 13);
      if (isCtrlJ || isCtrlM) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Usar capture: true para interceptar antes de outros handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keypress', preventShortcuts, { capture: true });
    window.addEventListener('keyup', preventShortcuts, { capture: true });
    
    // Ouvinte para evento customizado de abrir scanner (útil para botões globais)
    const handleOpenScanner = () => setIsCameraActive(true);
    window.addEventListener('open-scanner', handleOpenScanner);

    return () => {
        window.removeEventListener('keydown', handleKeyDown, { capture: true });
        window.removeEventListener('keypress', preventShortcuts, { capture: true });
        window.removeEventListener('keyup', preventShortcuts, { capture: true });
        window.removeEventListener('open-scanner', handleOpenScanner);
    };
  }, []); // Dependências vazias pois usamos refs

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
    try {
        const cleanedCode = code.trim().toUpperCase().replace(/^0+/, ''); // Remove leading zeros and trim
        console.log(`[Scanner] Processando código: "${cleanedCode}" (Original: "${code}")`);

        // Lógica de confirmação por "Bip Duplo"
        if (scannedJobRef.current) {
            const currentJob = scannedJobRef.current;
            const jobOs = (currentJob.osNumber || '').trim().toUpperCase().replace(/^0+/, '');
            const jobId = currentJob.id.trim().toUpperCase();
            
            if (jobOs === cleanedCode || jobId === cleanedCode) {
                await playNativeHaptic(true);
                playBeep(true);
                await handleMoveJob(nextSectorRef.current);
                return;
            }
        }

        setCommissionEarned(0);
        setNextSector('');
        
        // Busca flexível: tenta OS exata, ID exato, e OS sem zeros à esquerda
        const job = jobsRef.current.find(j => {
            const jobOs = (j.osNumber || '').trim().toUpperCase().replace(/^0+/, '');
            const jobId = j.id.trim().toUpperCase();
            return jobOs === cleanedCode || jobId === cleanedCode || (j.osNumber || '').toUpperCase() === cleanedCode;
        });
        
        if (job) {
          console.log(`[Scanner] Trabalho encontrado: ${job.osNumber} (${job.id})`);
          await playNativeHaptic(true);
          playBeep(true);
          if (currentUserRef.current?.sector) {
              const user = currentUserRef.current;
              const lastEvent = job.history[job.history.length - 1];
              const isLastActionEntryHere = lastEvent?.sector === user.sector && lastEvent?.action.includes('Entrada');
              setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
              
              if (isLastActionEntryHere) {
                  // Verificar se já existe comissão para este job/usuário/setor
                  const alreadyPaid = commissionsRef.current.some(c => 
                      c.jobId === job.id && 
                      c.userId === user.id && 
                      c.sector === user.sector
                  );

                  if (!alreadyPaid) {
                      let totalComm = 0;
                      job.items.forEach(item => {
                          if (item.commissionDisabled) return;
                          const setting = user.commissionSettings?.find(s => s.jobTypeId === item.jobTypeId);
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
            console.warn(`[Scanner] Trabalho não encontrado para o código: ${cleanedCode}`);
            await playNativeHaptic(false);
            playBeep(false);
            // Opcional: mostrar um feedback visual temporário de "Não encontrado"
        }
    } catch (err) {
        console.error("Erro ao processar scan:", err);
        await playNativeHaptic(false);
        playBeep(false);
    }
  };

  const handleMoveJob = async (nextSector?: string) => {
    const currentJob = scannedJobRef.current;
    const user = currentUserRef.current;
    const actionType = scanActionRef.current;

    if (!currentJob || !user) return;
    setIsUploading(true); // Usar como loading genérico
    
    try {
        let newStatus = currentJob.status;
        let sector = user.sector || currentJob.currentSector || 'Gestão';
        let action = actionType === 'ENTRY' ? `Entrada no setor ${sector}` : `Saída do setor ${sector}`;

        if (actionType === 'ENTRY' && (currentJob.status === JobStatus.PENDING || currentJob.status === JobStatus.WAITING_APPROVAL)) {
            newStatus = JobStatus.IN_PROGRESS;
        }

        if (actionType === 'EXIT') {
            if (nextSector) {
                action += ` (Encaminhado para ${nextSector})`;
            } else {
                newStatus = JobStatus.SECTOR_TRANSITION;
            }

            if (commissionEarned > 0) {
                try {
                    await addCommissionRecord({
                        userId: user.id,
                        userName: user.name,
                        jobId: currentJob.id,
                        osNumber: currentJob.osNumber || 'N/A',
                        patientName: currentJob.patientName,
                        amount: commissionEarned,
                        status: CommissionStatus.PENDING,
                        createdAt: new Date(),
                        sector: sector
                    });
                } catch (commErr: any) {
                    console.error("Erro ao registrar comissão:", commErr);
                    // Se for erro de permissão, avisar mas talvez permitir continuar a movimentação?
                    // No ProTrack, a comissão é vital, então vamos avisar.
                    if (commErr.message?.includes('permission-denied') || commErr.code === 'permission-denied' || commErr.message?.includes('Missing or insufficient permissions')) {
                        alert("Erro de permissão ao registrar comissão. Contate o administrador para verificar suas permissões de escrita.");
                    } else {
                        alert("Erro ao registrar comissão: " + (commErr.message || "Erro desconhecido"));
                    }
                }
            }
        }

        const newHistory = [...currentJob.history, {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: action,
            userId: user.id,
            userName: user.name,
            sector: sector
        }];

        if (actionType === 'EXIT' && nextSector) {
            newHistory.push({
                id: Math.random().toString(),
                timestamp: new Date(),
                action: `Entrada no setor ${nextSector}`,
                userId: user.id,
                userName: user.name,
                sector: nextSector
            });
            sector = nextSector;
        }

        await updateJob(currentJob.id, {
            status: newStatus,
            currentSector: sector,
            history: newHistory
        });
        
        await playNativeHaptic(true);
        playBeep(true);
        setScannedJob(null);
        setNextSector('');
    } catch (error: any) {
        console.error("Erro ao movimentar trabalho:", error);
        if (error.message?.includes('permission-denied') || error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
            alert("Erro de permissão: Você não tem autorização para movimentar este trabalho ou o laboratório atingiu o limite de uso.");
        } else {
            alert("Ocorreu um erro ao processar a movimentação: " + (error.message || "Erro desconhecido"));
        }
        await playNativeHaptic(false);
        playBeep(false);
    } finally {
        setIsUploading(false);
    }
  };

  if (!scannedJob && !isCameraActive && currentUser?.role !== UserRole.CLIENT) {
      return (
          <button 
            onClick={() => setIsCameraActive(true)}
            className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all md:hidden print:hidden"
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

        {!isEntry && (
            <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Próximo Setor (Opcional)</label>
                <select
                    value={nextSector}
                    onChange={(e) => setNextSector(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                >
                    <option value="">Nenhum (Transição de Setor)</option>
                    {sectors.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                    Se informado, o trabalho já dará entrada automaticamente no setor selecionado.
                </p>
            </div>
        )}

        <div className="flex gap-3">
            <button onClick={() => { setScannedJob(null); setNextSector(''); }} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
            <button onClick={() => handleMoveJob(nextSector)} autoFocus className={`flex-[2] py-4 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex flex-col items-center justify-center leading-tight ${isEntry ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}>
                <span>{isEntry ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SAÍDA'}</span>
                <span className="text-[10px] font-medium opacity-80 mt-1">ou bipe novamente</span>
            </button>
        </div>
      </div>
    </div>
  );
};
