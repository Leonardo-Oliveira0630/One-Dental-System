
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole, CommissionStatus, JobItem, JobType } from '../types';
import { ScanBarcode, X, AlertTriangle, LogIn, LogOut, CheckCircle, Camera, RefreshCcw, Volume2, MessageCircle, Loader2, ImagePlus } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { calculateItemCommission } from '../utils/commissionUtils';
import { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';
import { getNfcUidFormats } from '../services/nfcServices';

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
  const { jobs, updateJob, currentUser, addCommissionRecord, commissions, uploadFile, sectors, jobTypes, nfcBoxes } = useApp();
  const navigate = useNavigate();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  
  const [activeUserSector, setActiveUserSector] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{item: JobItem, stageName?: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE', blockedMessage?: string} | null>(null);

  const activeUserSectorRef = useRef(activeUserSector);
  useEffect(() => { activeUserSectorRef.current = activeUserSector; }, [activeUserSector]);
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
  
  // Web NFC API integration
  useEffect(() => {
    let ndef: any = null;
    let abortController = new AbortController();
    
    setIsNfcSupported('NDEFReader' in window);

    const startNfc = async (fromUserInteraction = false) => {
      if ('NDEFReader' in window) {
        try {
          ndef = new (window as any).NDEFReader();
          await ndef.scan({ signal: abortController.signal });
          setNfcStatus('scanning');
          console.log("NFC Scanner started successfully!");
          
          ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
            console.log("[Web NFC] Tag detected. SerialNumber:", serialNumber);
            
            // Decodificar registros NDEF (se houver texto/URL gravados na memória)
            let textValue = '';
            try {
              for (const record of message.records) {
                if (record.recordType === "text" || (record.recordType === "mime" && record.mediaType === "text/plain")) {
                  const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                  textValue = textDecoder.decode(record.data);
                  break;
                } else if (record.recordType === "url") {
                  const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                  const url = textDecoder.decode(record.data);
                  const parts = url.split('/');
                  const lastPart = parts[parts.length - 1];
                  if (lastPart) textValue = lastPart;
                  break;
                } else {
                  const textDecoder = new TextDecoder('utf-8');
                  const text = textDecoder.decode(record.data);
                  if (text && text.length > 0 && text.length < 50) {
                    textValue = text;
                    break;
                  }
                }
              }
            } catch (error: any) {
              console.error("[Web NFC] Error processing reading:", error);
            }

            // Normalizar o UID do hardware (ex: "04:A1:B2:C3" -> "04A1B2C3")
            const cleanSerialNumber = serialNumber ? String(serialNumber).replace(/[:\s-]/g, '').toUpperCase() : '';
            const cleanText = textValue ? textValue.trim().toUpperCase() : '';

            // Processar a leitura no scanner
            if (processScanRef.current) {
              if (cleanSerialNumber) {
                console.log("[Web NFC] Processando Serial Number (UID):", cleanSerialNumber);
                processScanRef.current(cleanSerialNumber);
              }
              if (cleanText && cleanText !== cleanSerialNumber) {
                console.log("[Web NFC] Processando Texto NDEF:", cleanText);
                processScanRef.current(cleanText);
              }
            }
          });
          
        } catch (error: any) {
          console.log("[Web NFC] Error starting scan:", error);
          setNfcStatus('error');
          if (fromUserInteraction) {
             alert("Erro ao iniciar NFC: " + error.message);
          } else if (error.name === 'NotAllowedError') {
             console.warn("NFC scan requires user gesture or permission.");
          }
        }
      }
    };

    startNfc();
    
    // Expose for manual triggering
    (window as any).triggerNfcStart = () => startNfc(true);

    return () => {
      abortController.abort();
    };
  }, []);
  const isUploadingRef = useRef(isUploading);

  const getEligibleItemsAndComm = (job: Job, user: any, jobTypes: JobType[], sectorToUse: string) => {
      if (!sectorToUse) return { eligible: [], commission: 0 };
      const sector = sectorToUse;
      const availableItems: { item: JobItem, jobType?: JobType }[] = [];
      let totalComm = 0;
      
      job.items.forEach(item => {
          const jt = jobTypes.find(t => t.id === item.jobTypeId);
          if (jt?.allowedSectors && jt.allowedSectors.length > 0 && !jt.allowedSectors.includes(sector)) return;
          const alreadyExecuted = job.itemExecutions?.some(e => e.itemId === item.id && e.sector === sector);
          if (alreadyExecuted) return;
          
          availableItems.push({ item, jobType: jt });

          if (!item.commissionDisabled) {
              const secQty = (item.sectorQuantities && item.sectorQuantities[sector]) ? item.sectorQuantities[sector] : item.quantity;
              totalComm += calculateItemCommission(item, jt, user, secQty);
          }
      });
      return { eligible: availableItems, commission: totalComm };
  };

  const calculateCommissionForItems = (job: Job, user: any, selectedIds: string[], jobTypes: JobType[], sectorToUse: string, stagesMap?: Record<string, string[]>) => {
      if (!user) return 0;
      const sector = sectorToUse || 'Gestão';
      let totalComm = 0;
      
      job.items.forEach(item => {
          const isBaseChecked = selectedIds.includes(item.id);
          const stagesToUse = stagesMap?.[item.id] || [];
          if (!isBaseChecked && stagesToUse.length === 0) return;
          if (item.commissionDisabled) return;
          
          const secQty = (item.sectorQuantities && item.sectorQuantities[sector]) ? item.sectorQuantities[sector] : item.quantity;
          const jt = jobTypes.find(t => t.id === item.jobTypeId);
          totalComm += calculateItemCommission(item, jt, user, secQty, sector, stagesToUse, isBaseChecked);
      });
      return totalComm;
  };

  useEffect(() => {
    const handleOpenJobScannerPopup = (e: any) => {
        const jobId = e.detail?.jobId;
        if (!jobId) return;
        const job = jobMapRef.current.get(jobId.toUpperCase()) || jobsRef.current.find(j => j.id === jobId);
        if (job) {
            setScanSuccess(true);
            setTimeout(() => setScanSuccess(false), 500);
            setScannedJob(job);
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
            setActiveUserSector(detectedSector);

            const isLastActionEntryHere = detectedSector ? job.sectorMovements?.some(m => m.sector === detectedSector && !m.exitTime) : false;
            setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
            
            if (isLastActionEntryHere && user && detectedSector) {
                const { eligible, commission } = getEligibleItemsAndComm(job, user, jobTypesRef.current, detectedSector);
                setEligibleItems(eligible);
                setSelectedItemIds([]);
                setSelectedStages({});
                setCommissionEarned(0);
            } else {
                setEligibleItems([]);
                setSelectedItemIds([]);
                setSelectedStages({});
                setCommissionEarned(0);
            }
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
    jobMapRef.current = jobMap;
    commissionsRef.current = commissions;
    jobTypesRef.current = jobTypes;
    scannedJobRef.current = scannedJob;
    scanActionRef.current = scanAction;
    nextSectorRef.current = nextSector;
    isUploadingRef.current = isUploading;
    nfcBoxesRef.current = nfcBoxes;
  }, [currentUser, isCameraActive, jobs, commissions, jobTypes, scannedJob, scanAction, nextSector, jobMap, isUploading, nfcBoxes]);

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
    const handleManualTrigger = (e: any) => {
        if (e.detail?.code && processScanRef.current) {
            processScanRef.current(e.detail.code);
        }
    };
    window.addEventListener('manual-scan-trigger', handleManualTrigger);

    return () => {
        window.removeEventListener('keydown', handleKeyDown, { capture: true });
        window.removeEventListener('keypress', preventShortcuts, { capture: true });
        window.removeEventListener('keyup', preventShortcuts, { capture: true });
        window.removeEventListener('open-scanner', handleOpenScanner);
        window.removeEventListener('manual-scan-trigger', handleManualTrigger);
    };
  }, []); // Dependências vazias pois usamos refs

  const processScanRef = useRef<((code: string) => Promise<void>) | null>(null);
  useEffect(() => {
      processScanRef.current = processScan;
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchCameras = async () => {
        if (!isCameraActive) return;
        const availableCameras = await getAvailableCameras();
        if (isMounted) {
            setCameras(availableCameras);
            if (availableCameras.length > 0 && !selectedCameraId) {
                setSelectedCameraId(getSmartCameraSelection(availableCameras) || null);
            }
        }
    };
    
    if (isCameraActive && cameras.length === 0) {
        fetchCameras();
    }
    
    return () => { isMounted = false; };
  }, [isCameraActive, selectedCameraId, cameras.length]);

  useEffect(() => {
      let isMounted = true;
      let reader: BrowserMultiFormatReader | null = null;
      let scanLoopId: number | null = null;
      let stream: MediaStream | null = null;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      const getRotatedCanvas = (video: HTMLVideoElement, angleDeg: number) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const vWidth = video.videoWidth;
          const vHeight = video.videoHeight;
          if (!vWidth || !vHeight || !ctx) return null;

          const rad = (angleDeg * Math.PI) / 180;
          if (Math.abs(angleDeg) === 90 || Math.abs(angleDeg) === 270) {
              canvas.width = vHeight;
              canvas.height = vWidth;
          } else {
              canvas.width = vWidth;
              canvas.height = vHeight;
          }

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(rad);
          ctx.drawImage(video, -vWidth / 2, -vHeight / 2);
          ctx.restore();
          return canvas;
      };

      if (isCameraActive && videoRef.current) {
          if (cameras.length === 0) return;

          const startScanner = async () => {
              try {
                  const isPortrait = window.innerHeight > window.innerWidth;
                  const idealWidth = isPortrait ? 1080 : 1920;
                  const idealHeight = isPortrait ? 1920 : 1080;

                  const videoConstraints: MediaTrackConstraints = selectedCameraId 
                    ? { deviceId: { exact: selectedCameraId }, width: { ideal: idealWidth }, height: { ideal: idealHeight } }
                    : { facingMode: 'environment', width: { ideal: idealWidth }, height: { ideal: idealHeight } };

                  const hasNativeScanner = 'BarcodeDetector' in window;

                  if (hasNativeScanner && videoRef.current) {
                      console.log("Using Native Web Barcode Scanner API");
                      const barcodeDetector = new (window as any).BarcodeDetector({ 
                          formats: ['code_128', 'qr_code', 'ean_13', 'ean_8', 'code_39'] 
                      });

                      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
                      if (!isMounted || !videoRef.current) {
                          if (stream) stream.getTracks().forEach(t => t.stop());
                          return;
                      }

                      videoRef.current.srcObject = stream;
                      videoRef.current.setAttribute("playsinline", "true");
                      await videoRef.current.play();

                      const track = stream.getVideoTracks()[0];
                      if (track) {
                          try {
                              const capabilities = track.getCapabilities() as any;
                              const advancedConstraints: any = {};
                              if (capabilities.zoom) advancedConstraints.zoom = capabilities.zoom.min || 1;
                              if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) advancedConstraints.focusMode = 'continuous';
                              if (capabilities.focusDistance) advancedConstraints.focusDistance = capabilities.focusDistance.min || 0;
                              
                              if (Object.keys(advancedConstraints).length > 0) {
                                  await track.applyConstraints({ advanced: [advancedConstraints] });
                              }
                          } catch (e) {}
                      }

                      let lastScan = 0;
                      const scanFrame = async () => {
                          if (!isMounted || !isCameraActive || !videoRef.current) return;
                          
                          const now = Date.now();
                          if (now - lastScan > 100) {
                              lastScan = now;
                              try {
                                  let barcodes = [];
                                  if (isIOS) {
                                      const rotatedCanvas = getRotatedCanvas(videoRef.current, 90);
                                      if (rotatedCanvas) {
                                          try {
                                              barcodes = await barcodeDetector.detect(rotatedCanvas);
                                          } catch (e) {}
                                      }
                                      if (!barcodes || barcodes.length === 0) {
                                          const rotatedCanvas270 = getRotatedCanvas(videoRef.current, 270);
                                          if (rotatedCanvas270) {
                                              try {
                                                  barcodes = await barcodeDetector.detect(rotatedCanvas270);
                                              } catch (e) {}
                                          }
                                      }
                                  }
                                  if (!barcodes || barcodes.length === 0) {
                                      barcodes = await barcodeDetector.detect(videoRef.current);
                                  }

                                  if (barcodes && barcodes.length > 0) {
                                      const text = barcodes[0].rawValue;
                                      if (processScanRef.current) {
                                          processScanRef.current(text);
                                      }
                                      setIsCameraActive(false);
                                      return;
                                  }
                              } catch (e) {}
                          }
                          scanLoopId = requestAnimationFrame(scanFrame);
                      };
                      
                      scanFrame();

                  } else {
                      const hints = new Map();
                      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                          BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_39
                      ]);
                      hints.set(DecodeHintType.TRY_HARDER, true);
                      
                      const activeReader = new BrowserMultiFormatReader(hints);
                      activeReader.timeBetweenDecodingAttempts = 150; 
                      reader = activeReader;

                      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
                      if (!isMounted || !videoRef.current) {
                          if (stream) stream.getTracks().forEach(t => t.stop());
                          return;
                      }

                      videoRef.current.srcObject = stream;
                      videoRef.current.setAttribute("playsinline", "true");
                      await videoRef.current.play();

                      let lastScan = 0;
                      const zxingScanFrame = async () => {
                          if (!isMounted || !isCameraActive || !videoRef.current) return;

                          const now = Date.now();
                          if (now - lastScan > 200) {
                              lastScan = now;
                              try {
                                  const canvases = [];
                                  if (isIOS) {
                                      const c90 = getRotatedCanvas(videoRef.current, 90);
                                      if (c90) canvases.push(c90);
                                      const c270 = getRotatedCanvas(videoRef.current, 270);
                                      if (c270) canvases.push(c270);
                                  }
                                  canvases.push(videoRef.current);

                                  for (const target of canvases) {
                                      try {
                                          let result = null;
                                          if (target instanceof HTMLCanvasElement) {
                                              const dataUrl = target.toDataURL('image/jpeg', 0.8);
                                              result = await activeReader.decodeFromImageUrl(dataUrl);
                                          } else {
                                              result = await activeReader.decodeFromVideoElement(target);
                                          }
                                          if (result) {
                                              const text = result.getText();
                                              if (text) {
                                                  if (processScanRef.current) {
                                                      processScanRef.current(text);
                                                  }
                                                  setIsCameraActive(false);
                                                  return;
                                              }
                                          }
                                      } catch (e) {}
                                  }
                              } catch (e) {}
                          }
                          scanLoopId = requestAnimationFrame(zxingScanFrame);
                      };

                      zxingScanFrame();

                      const s = videoRef.current.srcObject;
                      if (s) {
                          stream = s as MediaStream;
                          const track = stream.getVideoTracks()[0];
                          if (track) {
                              try {
                                  const capabilities = track.getCapabilities() as any;
                                  const advancedConstraints: any = {};
                                  if (capabilities.zoom) advancedConstraints.zoom = capabilities.zoom.min || 1;
                                  if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) advancedConstraints.focusMode = 'continuous';
                                  if (capabilities.focusDistance) advancedConstraints.focusDistance = capabilities.focusDistance.min || 0;
                                  if (Object.keys(advancedConstraints).length > 0) {
                                      track.applyConstraints({ advanced: [advancedConstraints] }).catch(e => {});
                                  }
                              } catch (e) {}
                          }
                      }
                  }
              } catch (err) {
                  console.error("Camera error:", err);
                  if (reader && isMounted && videoRef.current) {
                      try {
                          await reader.decodeFromVideoDevice(
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
          if (scanLoopId !== null) {
              cancelAnimationFrame(scanLoopId);
          }
          if (stream) {
              stream.getTracks().forEach(t => t.stop());
          }
          if (reader) {
              reader.reset();
          }
      };
  }, [isCameraActive, selectedCameraId, cameras.length]);

  const toggleTorch = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          const newState = !isTorchOn;
          await track.applyConstraints({
            advanced: [{ torch: newState }] as any
          });
          setIsTorchOn(newState);
        }
      }
    } catch (e) {
      console.error("Torch error:", e);
    }
  }, [isTorchOn]);

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
        
        // Busca por UID da Caixa NFC do laboratório, Número da Caixa (NFC) ou Texto Gravado
        if (!job) {
            let searchBoxNumber = rawCode;
            if (nfcBoxesRef.current && nfcBoxesRef.current.length > 0) {
                const rawCandidates = getNfcUidFormats(rawCode).allCandidates;
                const matchedBox = nfcBoxesRef.current.find(b => {
                    const boxCandidates = new Set([
                        b.uid,
                        b.uidHex,
                        b.uidDecimal,
                        ...getNfcUidFormats(b.uid || '').allCandidates
                    ].filter(Boolean).map(s => String(s).trim().toUpperCase().replace(/[:\s-]/g, '')));

                    const cleanBoxNum = String(b.numeroCaixa || '').trim().toUpperCase().replace(/^0+/, '');
                    const cleanRawNum = rawCode.replace(/^0+/, '');
                    const cleanText = (b.textoGravado || '').trim().toUpperCase();

                    const matchesUid = rawCandidates.some(c => boxCandidates.has(c));
                    const matchesBoxNum = cleanBoxNum && cleanBoxNum === cleanRawNum;
                    const matchesText = cleanText && (cleanText === rawCode || rawCode.includes(cleanText));

                    return matchesUid || matchesBoxNum || matchesText;
                });
                if (matchedBox) {
                    searchBoxNumber = String(matchedBox.numeroCaixa).trim().toUpperCase();
                    console.log(`[Scanner] Tag NFC mapeada para Caixa #${searchBoxNumber}`);
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
              setActiveUserSector(detectedSector);

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
                      setCommissionEarned(calculateCommissionForItems(job, user, plannedIds, jobTypesRef.current, detectedSector, plannedStg));
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

    if (isUploadingRef.current) return;
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
        let sector = activeUserSectorRef.current || user.sector || currentJob.currentSector || 'Gestão';
        
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
            sector: sector
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
                    patientName: currentJob.patientName,
                    amount: commissionEarned,
                    status: CommissionStatus.PENDING,
                    createdAt: new Date(),
                    sector: sector
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
          let sector = activeUserSectorRef.current || user?.sector || 'Gestão';
          const jt = jobTypesRef.current.find(t => t.id === item.jobTypeId);
          
          if (jt?.allowedSectors && jt.allowedSectors.length > 0 && !jt.allowedSectors.includes(sector)) {
              // Block the action and show friendly error modal
              setPendingAction({ item, stageName, status: currentStatus, blockedMessage: `O serviço "${jt.name}" não está habilitado para o setor "${sector}". Você só pode registrar etapas específicas.` });
              return;
          }
      }
      
      setPendingAction({ item, stageName, status: currentStatus });
  };




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
                                value={activeUserSector} 
                                onChange={e => {
                                    setActiveUserSector(e.target.value);
                                    const { eligible } = getEligibleItemsAndComm(scannedJob, currentUser, jobTypes, e.target.value);
                                    setEligibleItems(eligible);
                                }}
                                className="bg-slate-100 border-none text-slate-700 text-xs font-bold rounded-lg py-1 px-2 cursor-pointer focus:ring-0"
                            >
                                {currentUser.sectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    ) : (
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Setor: {activeUserSector || 'Geral'}</p>
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
                {scannedJob.items.map((item) => {
                    const jt = jobTypes.find(t => t.id === item.jobTypeId);
                    const sector = activeUserSector || 'Gestão';
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
                {scannedJob.items.length === 0 && (
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
