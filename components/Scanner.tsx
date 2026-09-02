import { Capacitor } from '@capacitor/core';
import { CapacitorNfc as Nfc } from '@capgo/capacitor-nfc';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole, CommissionStatus, JobItem, JobType } from '../types';
import { ScanBarcode, X, AlertTriangle, LogIn, LogOut, CheckCircle, Camera, RefreshCcw, Volume2, MessageCircle, Loader2, ImagePlus } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { calculateItemCommission } from '../utils/commissionUtils';
import { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';
import { getNfcUidFormats, findMatchingNfcBox } from '../services/nfcServices';

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


const formatItemNameWithVariations = (item: JobItem, jobTypes: JobType[]) => {
    const jt = jobTypes.find(t => t.id === item.jobTypeId);
    if (!jt || ((!jt.variationGroups || jt.variationGroups.length === 0) && (!jt.variations || jt.variations.length === 0))) return item.name;
    const groups = (jt.variationGroups && jt.variationGroups.length > 0) ? jt.variationGroups : [{ id: 'default', name: 'Opções', options: jt.variations || [] }];
    
    const parts: string[] = [];
    item.selectedVariationIds?.forEach(optId => {
        for (const group of groups as any[]) {
            const opt = group.options.find((o: any) => o.id === optId);
            if (opt) {
                if (group.selectionType === 'TEXT' && item.variationValues?.[optId]) {
                    parts.push(`${group.name}: ${item.variationValues[optId]}`);
                } else {
                    parts.push(opt.name);
                }
            }
        }
    });
    
    if (parts.length > 0) {
        return `${item.name} - ${parts.join(' - ')}`;
    }
    return item.name;
};

export const GlobalScanner: React.FC = () => {
  console.log("GlobalScanner mounted!");
  const { jobs, updateJob, currentUser, addCommissionRecord, commissions, uploadFile, sectors, jobTypes, nfcBoxes } = useApp();
  const navigate = useNavigate();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  
  const [activeanySector, setActiveanySector] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{item: JobItem, stageName?: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE', blockedMessage?: string} | null>(null);

  const activeanySectorRef = useRef(activeanySector);

  
  const [commissionEarned, setCommissionEarned] = useState<number>(0);
  const [eligibleItems, setEligibleItems] = useState<{item: JobItem, jobType?: JobType}[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<Record<string, string[]>>({});
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [nextSector, setNextSector] = useState<string>('');
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'scanning' | 'error'>('idle');
  const [isCasesDropdownOpen, setIsCasesDropdownOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mapeamento otimizado para busca instantânea de trabalhos por OS ou ID
  const jobMap = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach(j => {
      if (j.id) {
          map.set(j.id.toUpperCase(), j);
          map.set(j.id.substring(0,8).toUpperCase(), j);
      }
      if (j.osNumber) {
          map.set(j.osNumber.toUpperCase().replace(/^0+/, ''), j);
          map.set(j.osNumber.toUpperCase(), j);
      }
    });
    return map;
  }, [jobs]);

  const SCANNER_TIMEOUT = 30; 
  const MIN_LENGTH = 3;

  const playBeep = useCallback((success = true) => {
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
  }, []);

  // Refs para manter o listener estável e evitar re-registros frequentes
  const currentUserRef = useRef(currentUser);
  const isCameraActiveRef = useRef(isCameraActive);
  const jobsRef = useRef(jobs);
  const jobMapRef = useRef(jobMap);
  const commissionsRef = useRef(commissions);
  const jobTypesRef = useRef(jobTypes);
  const scannedJobRef = useRef(scannedJob);
  const scanActionRef = useRef(scanAction);
  const nextSectorRef = useRef(nextSector);
  const nfcBoxesRef = useRef(nfcBoxes);

  useEffect(() => {
    currentUserRef.current = currentUser;
    isCameraActiveRef.current = isCameraActive;
    jobsRef.current = jobs;
    jobMapRef.current = jobMap;
    commissionsRef.current = commissions;
    jobTypesRef.current = jobTypes;
    scannedJobRef.current = scannedJob;
    scanActionRef.current = scanAction;
    nextSectorRef.current = nextSector;
    nfcBoxesRef.current = nfcBoxes;
  }, [currentUser, isCameraActive, jobs, jobMap, commissions, jobTypes, scannedJob, scanAction, nextSector, nfcBoxes]);

  
  // Web NFC API integration
  useEffect(() => {
    let ndef: any = null;
    let abortController = new AbortController();
    
    setIsNfcSupported(Capacitor.isNativePlatform() || 'NDEFReader' in window);

    const startNfc = async (fromanyInteraction = false) => {
      try {
        if (Capacitor.isNativePlatform()) {
          const isSupported = await Nfc.isSupported();
          if (!isSupported.supported) throw new Error('NFC nativo não suportado.');
          
          await (Nfc as any).startScanSession();
          setNfcStatus('scanning');
          console.log("Native NFC Scanner started successfully!");
          
          (Nfc as any).addListener('nfcTagScanned', (event: any) => {
            const serialNumber = event.id ? event.id.map((b: any) => b.toString(16).padStart(2, '0')).join('').toUpperCase() : '';
            console.log("[Native NFC] Tag detected. SerialNumber:", serialNumber);
            
            let textValue = '';
            if (event.messages && event.messages.length > 0) {
              for (const record of event.messages[0].records) {
                if (record.type && String.fromCharCode(...record.type) === 'T' && record.payload) {
                   textValue = String.fromCharCode(...record.payload).substring(3);
                   break;
                }
              }
            }
            
            if (navigator.vibrate) navigator.vibrate(50);
            
            let cleanSerialNumber = serialNumber.replace(/:/g, "").toUpperCase();
            let cleanText = textValue ? textValue.toUpperCase().trim() : '';
            
            if (cleanText.startsWith('BOX-')) {
               cleanText = cleanText.replace('BOX-', '');
            }
            
            if (cleanSerialNumber || cleanText) {
                processScan(cleanSerialNumber || cleanText);
                // removed isNfcSupported
                setIsCameraActive(false);
                (Nfc as any).stopScanSession();
                (Nfc as any).removeAllListeners();
            }
          });
          
          abortController.signal.addEventListener('abort', () => {
             (Nfc as any).stopScanSession();
             (Nfc as any).removeAllListeners();
          });
          
        } else if ('NDEFReader' in window) {
          ndef = new (window as any).NDEFReader();
          await ndef.scan({ signal: abortController.signal });
          setNfcStatus('scanning');
          console.log("Web NFC Scanner started successfully!");
          
          ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
            console.log("[Web NFC] Tag detected. SerialNumber:", serialNumber);
            let textValue = '';
            try {
              if (message && message.records) {
                 for (const record of message.records) {
                   if (record.recordType === "text" || (record.recordType === "mime" && record.mediaType === "text/plain")) {
                     const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                     textValue = textDecoder.decode(record.data);
                     break;
                   }
                 }
              }
            } catch (e) {
              console.error("[Web NFC] Error reading NDEF:", e);
            }
            
            if (navigator.vibrate) navigator.vibrate(50);
            
            let cleanSerialNumber = (serialNumber || '').replace(/:/g, "").toUpperCase();
            let cleanText = textValue ? textValue.toUpperCase().trim() : '';
            if (cleanText.startsWith('BOX-')) cleanText = cleanText.replace('BOX-', '');
            
            if (cleanSerialNumber || cleanText) {
                processScan(cleanSerialNumber || cleanText);
                // removed isNfcSupported
                setIsCameraActive(false);
            }
          });
        }
      } catch (error: any) {
         setNfcStatus('error');
         if (fromanyInteraction) {
             alert("Erro ao iniciar NFC: " + error.message);
         }
      }
    };

    if (isNfcSupported && isNfcSupported === true) {
      startNfc(false);
    }

    return () => {
      abortController.abort();
      if (Capacitor.isNativePlatform()) {
         try { (Nfc as any).stopScanSession(); (Nfc as any).removeAllListeners(); } catch(e){}
      }
    };
  }, [isNfcSupported, isNfcSupported]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        attachments: [...(scannedJob.attachments || []).filter(Boolean), newAttachment]
      });
      setScannedJob(prev => prev ? {
          ...prev,
          attachments: [...(prev.attachments || []).filter(Boolean), newAttachment]
      } : null);
      
      alert('Foto anexada com sucesso!');
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  }, [scannedJob, currentUser, uploadFile, updateJob]);

  
  const getEligibleItemsAndComm = (job: Job, user: any, types: JobType[], sector: string) => {
    let commission = 0;
    const eligible: any[] = [];
    if (!job.items) return { eligible, commission };
    for (const item of job.items) {
      const jobType = types.find(t => t.id === item.jobTypeId);
      const comm = calculateItemCommission(item, jobType, user, item.quantity, sector, []);
      if (comm != null) {
        eligible.push(item);
        if (typeof comm === 'number') commission += comm;
      }
    }
    return { eligible, commission };
  };

  const calculateCommissionForItems = (items: JobItem[], user: any, types: JobType[], sector: string) => {
    let commission = 0;
    for (const item of items) {
      const jobType = types.find(t => t.id === item.jobTypeId);
      const comm = calculateItemCommission(item, jobType, user, item.quantity, sector, []);
      if (typeof comm === 'number') commission += comm;
    }
    return commission;
  };


  const processScan = useCallback(async (code: string) => {
    try {
        const rawCode = code.trim().toUpperCase();
        const cleanedCode = rawCode.replace(/^0+/, ''); // Remove leading zeros and trim
        console.log(`[Scanner] Processando código: "${cleanedCode}" (Original: "${code}")`);


        // Lógica de confirmação por "Bip Duplo"
        if (scannedJobRef.current) {
            const currentJob = scannedJobRef.current;
            const jobOs = (currentJob.osNumber || '').trim().toUpperCase().replace(/^0+/, '');
            const jobId = currentJob.id.trim().toUpperCase();
            const jobIdShort = currentJob.id.substring(0,8).toUpperCase();
            const jobBox = (currentJob.boxNumber || '').trim().toUpperCase();
            
            if (jobOs === cleanedCode || jobId === cleanedCode || jobIdShort === rawCode || (jobBox && (jobBox === cleanedCode || jobBox === rawCode))) {

                await playNativeHaptic(true);
                playBeep(true);
                return;
            }
        }

        setCommissionEarned(0);
        setNextSector('');
        
        // Busca instantânea via Map (tenta o raw normal, o raw sem zeros, e depois fuzzy)
        let job = jobMapRef.current.get(cleanedCode) || jobMapRef.current.get(rawCode);
        

        if (!job) {
            // Busca mais rigorosa no array
            job = jobsRef.current.find(j => 
                (j.osNumber && j.osNumber.toUpperCase() === rawCode) ||
                (j.osNumber && j.osNumber.toUpperCase().replace(/^0+/, '') === cleanedCode) ||
                j.id.toUpperCase() === rawCode ||
                j.id.substring(0, 8).toUpperCase() === rawCode
            );
        }
        
        // Busca por UID da Caixa NFC do laboratório (suporta Leitor Novo Hex e Leitor Antigo Decimal)
        if (!job) {
            let searchBoxNumber = rawCode;
            if (nfcBoxesRef.current && nfcBoxesRef.current.length > 0) {
                const matchedBox = findMatchingNfcBox(rawCode, nfcBoxesRef.current);
                if (matchedBox) {
                    searchBoxNumber = String(matchedBox.numeroCaixa).trim().toUpperCase();
                    console.log(`[Scanner] Tag NFC mapeada para Caixa #${searchBoxNumber} (UID: ${matchedBox.uid})`);
                }
            }

            const activeJobWithBox = jobsRef.current.find(j => {
                if (!j.boxNumber) return false;
                const box = String(j.boxNumber).trim().toUpperCase();
                return box === searchBoxNumber || box === rawCode || box === cleanedCode;
            });
            
            if (activeJobWithBox && !['COMPLETED', 'DELIVERED', 'CANCELED', 'REJECTED'].includes(activeJobWithBox.status)) {
                job = activeJobWithBox;
                console.log(`[Scanner] Trabalho encontrado pela Caixa NFC: ${job.osNumber} (Caixa: ${job.boxNumber})`);
            }
        }

        
        if (job) {
          console.log(`[Scanner] Trabalho encontrado: ${job.osNumber} (${job.id})`);
          await playNativeHaptic(true);
          playBeep(true);
          if (currentUserRef.current) {
              const user = currentUserRef.current;
              
              let detectedSector = user?.sector || '';
              if (user?.sectors && user.sectors.length > 0) {
                  const openMovement = job.sectorMovements?.find(m => !m.exitTime && (m.sector === user.sector || user.sectors?.includes(m.sector)));
                  if (openMovement) {
                      detectedSector = openMovement.sector;
                  } else if (!detectedSector && user.sectors.length > 0) {
                      detectedSector = user.sectors[0];
                  }
              }
              setActiveanySector(detectedSector);

              const isLastActionEntryHere = detectedSector ? job.sectorMovements?.some(m => m.sector === detectedSector && !m.exitTime) : false;
              setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
              
              if (isLastActionEntryHere && detectedSector) {
                  const { eligible, commission } = getEligibleItemsAndComm(job, user, jobTypesRef.current, detectedSector);
                  setEligibleItems(eligible);
                  
                  const openMovement = job.sectorMovements?.find(m => m.sector === detectedSector && !m.exitTime);
                  if (openMovement && ((openMovement.plannedItems && openMovement.plannedItems.length > 0) || Object.keys(openMovement.plannedStages || {}).length > 0)) {
                      const plannedIds = openMovement.plannedItems || [];
                      const plannedStg = openMovement.plannedStages || {};
                      setSelectedItemIds(plannedIds);
                      setSelectedStages(plannedStg);
                      setCommissionEarned(calculateCommissionForItems(job.items?.filter(i => plannedIds.includes(i.id)) || [], user, jobTypesRef.current, detectedSector));
                  } else {
                      setSelectedItemIds([]);
                      setSelectedStages({});
                      setCommissionEarned(0);
                  }
              } else {
                  setEligibleItems([]);
                  setSelectedItemIds([]);
                  setSelectedStages({});
                  setCommissionEarned(0);
              }
          } else {
              setEligibleItems([]);
              setSelectedItemIds([]);
              setScanAction('ENTRY');
          }
          setScannedJob(job);
        } else {
            console.warn(`[Scanner] Trabalho não encontrado para o código: ${cleanedCode}`);
            await playNativeHaptic(false);
            playBeep(false);
            alert(`Nenhuma Ordem de Serviço encontrada com a caixa ou ID: "${rawCode}"`);
            // Opcional: mostrar um feedback visual temporário de "Não encontrado"
        }
    } catch (err) {
        console.error("Erro ao processar scan:", err);
        await playNativeHaptic(false);
        playBeep(false);
    }
  }, [playBeep]);

  
  
  const executePendingAction = async () => {
    if (!pendingAction) return;
    const { item, stageName, status: currentStatus } = pendingAction;
    setPendingAction(null);

    if (isUploading) return;
    const currentJob = scannedJobRef.current;
    const user = currentUserRef.current;
    if (!currentJob || !user) return;

    const isEntering = currentStatus === 'NOT_STARTED';
    const isExiting = currentStatus === 'IN_PROGRESS';
    if (!isEntering && !isExiting) return;

    const actionText = isEntering ? 'ENTRADA' : 'SAÍDA';
    const targetName = stageName ? `${item.name} - ${stageName}` : item.name;

    setIsUploading(true);
    try {
        let sector = activeanySectorRef.current || user.sector || currentJob.currentSector || 'Gestão';
        
        let newExecutions = [...(currentJob.itemExecutions || [])];
        let executionIndex = newExecutions.findIndex(e => e.itemId === item.id && e.sector === sector);
        
        if (executionIndex === -1) {
            newExecutions.push({
                itemId: item.id,
                jobTypeId: item.jobTypeId,
                jobTypeName: jobTypesRef.current.find((t: JobType) => t.id === item.jobTypeId)?.name || '',
                sector: sector,
                userId: user.id,
                userName: user.name,
                timestamp: new Date(),
                stageTimes: {}
            });
            executionIndex = newExecutions.length - 1;
        }
        
        const exec = { ...newExecutions[executionIndex] };
        if (!exec.stageTimes) exec.stageTimes = {};
        
        const stageKey = stageName || 'BASE';
        const currentStageTime = exec.stageTimes[stageKey] || {};
        
        let commissionEarned = 0;

        if (isEntering) {
            exec.stageTimes[stageKey] = { ...currentStageTime, entryTime: new Date(), entryUserId: user.id };
            // Optional: also update the execution's timestamp so the PRODUCTION tab knows there's activity
            exec.timestamp = new Date();
        } else if (isExiting) {
            exec.stageTimes[stageKey] = { ...currentStageTime, exitTime: new Date(), exitUserId: user.id };
            exec.timestamp = new Date();
            
            if (stageName) {
                exec.executedStages = [...(exec.executedStages || [])];
                if (!exec.executedStages.includes(stageName)) {
                    exec.executedStages.push(stageName);
                }
            } else {
                exec.isBaseChecked = true;
            }

            // Calculate commission for this stage/item
            const jt = jobTypesRef.current.find((t: JobType) => t.id === item.jobTypeId);
            if (jt && !item.commissionDisabled) {
                const secQty = (item.sectorQuantities && item.sectorQuantities[sector]) ? item.sectorQuantities[sector] : item.quantity;
                commissionEarned = calculateItemCommission(item, jt, user, secQty, sector, stageName ? [stageName] : [], !stageName);
            }
        }
        
        newExecutions[executionIndex] = exec;

        const newHistory = [...(currentJob.history || []).filter(Boolean), {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: `${actionText} - ${targetName} no setor ${sector}`,
            userId: user.id,
            userName: user.name,
            sector: sector,
                    amount: commissionEarned,
                    status: 'PENDING' as CommissionStatus,
                    createdAt: new Date(),
                    patientName: currentJob.patientName
                }];

        // We DO NOT update sectorMovements here anymore, to avoid treating the whole job as started
        // Actually, we can update sectorMovements so the OS appears in this sector overall.
        // Let's keep it but NOT rely on it in JobDetails for the individual items!
        let newSectorMovements = [...(currentJob.sectorMovements || []).filter(Boolean)];
        let openMovementIndex = newSectorMovements.findIndex(m => m.sector === sector && !m.exitTime);
        if (openMovementIndex === -1) {
            newSectorMovements.push({
                id: Math.random().toString(),
                sector: sector,
                entryTime: new Date(),
                entryUserId: user.id,
                entryUserName: user.name
            });
        }

        const newStatus = (currentJob.status === JobStatus.PENDING || currentJob.status === JobStatus.WAITING_APPROVAL) 
            ? JobStatus.IN_PROGRESS 
            : currentJob.status;

        const updatedJob = {
            ...currentJob,
            status: newStatus,
            currentSector: sector,
            history: newHistory,
            sectorMovements: newSectorMovements,
            itemExecutions: newExecutions,
            updatedAt: new Date()
        };

        await updateJob(currentJob.id, updatedJob);

        if (commissionEarned > 0) {
            try {
                await addCommissionRecord({
                    userId: user.id,
                    userName: user.name,
                    jobId: currentJob.id,
                    osNumber: currentJob.osNumber || 'N/A',
                    sector: sector,
                    amount: commissionEarned,
                    status: 'PENDING' as CommissionStatus,
                    createdAt: new Date(),
                    patientName: currentJob.patientName
                });
            } catch (commErr: any) {
                console.error("Erro ao registrar comissão:", commErr);
            }
        }

        await playNativeHaptic(true);
        playBeep(true);
        setScannedJob(updatedJob);
    } catch (err: any) {
        console.error("Erro ao registrar ação:", err);
        setActionError(err.message);
        await playNativeHaptic(false);
        playBeep(false);
    } finally {
        setIsUploading(false);
    }
  };

  
  const handleStageAction = (item: JobItem, stageName: string | undefined, currentStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE') => {
      // 1. Check if it's the BASE service and the sector is not allowed
      if (!stageName) {
          const user = currentUserRef.current;
          let sector = activeanySectorRef.current || user?.sector || 'Gestão';
          const jt = jobTypesRef.current.find(t => t.id === item.jobTypeId);
          
          if (jt?.allowedSectors && jt.allowedSectors.length > 0 && !jt.allowedSectors.includes(sector)) {
              // Block the action and show friendly error modal
              setPendingAction({ item, stageName, status: currentStatus, blockedMessage: `O serviço "${jt.name}" não está habilitado para o setor "${sector}". Você só pode registrar etapas específicas.` });
              return;
          }
      }
      
      setPendingAction({ item, stageName, status: currentStatus });
  };





  // Listeners for manual triggers and global barcode scanning
  useEffect(() => {
    const handleManualScan = (e: any) => {
      if (e.detail && e.detail.code) {
        processScan(e.detail.code);
      }
    };

    const handleOpenJobScanner = (e: any) => {
      console.log("Scanner listener fired! JobId: " + (e.detail?.jobId || 'none') + ", Jobs: " + jobsRef.current.length);
      if (e.detail && e.detail.jobId) {
        const job = jobsRef.current.find(j => j.id === e.detail.jobId);
        if (job) {
          setScannedJob(job);
        } else {
          console.error("Job not found in jobsRef!");
        }
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      const char = e.key;
      const now = Date.now();
      
      if (now - lastKeyTimeRef.current > SCANNER_TIMEOUT && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }
      
      if (char === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= MIN_LENGTH) {
          processScan(code);
        }
        bufferRef.current = '';
      } else if (char.length === 1) {
        bufferRef.current += char;
      }
      
      lastKeyTimeRef.current = now;
    };

    window.addEventListener('manual-scan-trigger', handleManualScan);
    window.addEventListener('open-job-scanner-popup', handleOpenJobScanner);
    window.addEventListener('keypress', handleKeyPress);
    const handleOpenScannerCam = () => setIsCameraActive(true);
    window.addEventListener('open-scanner', handleOpenScannerCam);

    
    return () => {
      window.removeEventListener('manual-scan-trigger', handleManualScan);
      window.removeEventListener('open-job-scanner-popup', handleOpenJobScanner);
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('open-scanner', handleOpenScannerCam);

      
    };
  }, [processScan]);

  if (!scannedJob) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto overscroll-contain border-t-[12px] border-blue-600 animate-in zoom-in duration-200 relative">
    {pendingAction && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 rounded-3xl backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full p-6 text-center animate-in zoom-in-95 duration-200">
                {pendingAction.blockedMessage ? (
                    <>
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Ação Não Permitida</h3>
                        <p className="text-sm font-bold text-slate-500 mb-6">
                            {pendingAction.blockedMessage}
                        </p>
                        <div className="flex justify-center">
                            <button 
                                onClick={() => setPendingAction(null)}
                                className="w-full py-3 bg-slate-100 text-slate-600 font-black rounded-xl uppercase tracking-widest text-xs"
                            >
                                Entendi
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Confirmar Ação</h3>
                        <p className="text-sm font-bold text-slate-500 mb-6">
                            Deseja registrar a <strong>{pendingAction.status === 'NOT_STARTED' ? 'ENTRADA' : 'SAÍDA'}</strong> em <br/>
                            <span className="text-blue-600">{pendingAction.stageName ? `${pendingAction.item.name} - ${pendingAction.stageName}` : pendingAction.item.name}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setPendingAction(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl uppercase tracking-widest text-xs"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={executePendingAction}
                                className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-md"
                            >
                                Confirmar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )}

        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
                    <CheckCircle size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Controle de Setor</h3>
                    {currentUser?.sectors && currentUser.sectors.length > 1 ? (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Setor:</span>
                            <select 
                                value={activeanySector} 
                                onChange={e => {
                                    const newSector = e.target.value;
                                    setActiveanySector(newSector);
                                    
                                    const isLastActionEntryHere = newSector ? scannedJob.sectorMovements?.some(m => m.sector === newSector && !m.exitTime) : false;
                                    setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');

                                    if (isLastActionEntryHere) {
                                        const { eligible } = getEligibleItemsAndComm(scannedJob, currentUser, jobTypes, newSector);
                                        setEligibleItems(eligible);
                                    } else {
                                        setEligibleItems([]);
                                    }
                                    setSelectedItemIds([]);
                                    setSelectedStages({});
                                    setCommissionEarned(0);
                                }}
                                className="bg-slate-100 border-none text-slate-700 text-xs font-bold rounded-lg py-1 px-2 cursor-pointer focus:ring-0"
                            >
                                {currentUser.sectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    ) : (
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Setor: {activeanySector || 'Geral'}</p>
                    )}
                </div>
            </div>
            <button onClick={() => { setScannedJob(null); setActionError(null); setPendingAction(null); }} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
        </div>

        
        {actionError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                <p className="text-sm text-red-700 font-bold">{actionError}</p>
            </div>
        )}

        <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-100 mb-6 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 overflow-visible">
                <span className="text-slate-500 text-xs font-bold uppercase shrink-0 mr-2">OS</span>
                <div className="flex items-center gap-2 relative">
                    <button 
                        onClick={() => { setScannedJob(null); setActionError(null); setPendingAction(null); navigate(`/jobs/${scannedJob.id}`); }} 
                        className="font-mono font-black text-2xl text-blue-600 hover:text-blue-800 transition-colors hover:underline cursor-pointer text-right"
                    >
                        {scannedJob.osNumber || "N/A"}
                    </button>
                </div>
            </div>
            <div className="flex justify-between items-center"><span className="text-slate-500 text-xs font-bold uppercase">Paciente</span><span className="font-black text-slate-800">{scannedJob.patientName}</span></div>
        </div>

        <div className="mb-6 space-y-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">Serviços e Etapas</label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 rounded-xl border border-slate-100 p-2 bg-slate-50">
                {(scannedJob.items || []).map((item) => {
                    const jt = jobTypes.find(t => t.id === item.jobTypeId);
                    const sector = activeanySector || 'Gestão';
                    const itemSectorStages = item.sectorStages?.[sector] || jt?.sectorStages?.[sector] || [];
                    
                    const execution = scannedJob.itemExecutions?.find(e => e.itemId === item.id && e.sector === sector);
                    const stageTimes = execution?.stageTimes || {};

                    return (
                        <div key={item.id} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800">{formatItemNameWithVariations(item, jobTypes)}</p>
                                    <p className="text-xs text-slate-500">Qtd: {
                                        (currentUser?.sector && item.sectorQuantities && item.sectorQuantities[currentUser.sector]) 
                                            ? item.sectorQuantities[currentUser.sector] 
                                            : item.quantity
                                    }</p>
                                </div>
                                {(() => {
                                    const baseTimes = stageTimes['BASE'] || {};
                                    let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' = 'NOT_STARTED';
                                    if (baseTimes.exitTime) status = 'DONE';
                                    else if (baseTimes.entryTime) status = 'IN_PROGRESS';

                                    return (
                                        <button
                                            disabled={status === 'DONE' || isUploading}
                                            onClick={() => handleStageAction(item, undefined, status)}
                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                                status === 'DONE' ? 'bg-green-100 text-green-700' :
                                                status === 'IN_PROGRESS' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md' :
                                                'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                            }`}
                                        >
                                            {status === 'DONE' ? 'Concluído' : status === 'IN_PROGRESS' ? 'Saída' : 'Entrada'}
                                        </button>
                                    );
                                })()}
                            </div>

                            {itemSectorStages.length > 0 && (
                                <div className="pl-4 space-y-2 border-t border-slate-100 pt-2 mt-2">
                                    {itemSectorStages.map((stageName: string) => {
                                        const sTime = stageTimes[stageName] || {};
                                        let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' = 'NOT_STARTED';
                                        if (sTime.exitTime) status = 'DONE';
                                        else if (sTime.entryTime) status = 'IN_PROGRESS';

                                        return (
                                            <div key={stageName} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                                                <span className="text-sm font-bold text-slate-600 flex-1">{stageName}</span>
                                                <button
                                                    disabled={status === 'DONE' || isUploading}
                                                    onClick={() => handleStageAction(item, stageName, status)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                        status === 'DONE' ? 'bg-green-100 text-green-700' :
                                                        status === 'IN_PROGRESS' ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm' :
                                                        'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                    }`}
                                                >
                                                    {status === 'DONE' ? 'Concluído' : status === 'IN_PROGRESS' ? 'Saída' : 'Entrada'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                {(scannedJob.items || []).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4 italic">Nenhum serviço neste trabalho.</p>
                )}
            </div>
        </div>

        <div className="flex gap-3">
            <button disabled={isUploading} onClick={() => setScannedJob(null)} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-sm disabled:opacity-50">
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};



export const ManualScannerInput: React.FC = () => {
    const [value, setValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) {
                window.dispatchEvent(new CustomEvent('manual-scan-trigger', { detail: { code: value.trim() } }));
                setValue('');
            }
        }
    };

    return (
        <div className="relative flex items-center">
            <div className="absolute left-3 text-slate-400">
                <ScanBarcode size={16} />
            </div>
            <input 
                type="text" 
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Bipar Caixa/OS..." 
                className="w-48 pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:font-normal"
            />
        </div>
    );
};
