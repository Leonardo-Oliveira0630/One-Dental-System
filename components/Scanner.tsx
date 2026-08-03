
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

export const GlobalScanner: React.FC = () => {
  const { jobs, updateJob, currentUser, addCommissionRecord, commissions, uploadFile, sectors, jobTypes, nfcBoxes } = useApp();
  const navigate = useNavigate();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  
  const [scannedJob, setScannedJob] = useState<Job | null>(null);
  const [scanAction, setScanAction] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [commissionEarned, setCommissionEarned] = useState<number>(0);
  const [eligibleItems, setEligibleItems] = useState<{item: JobItem, jobType?: JobType}[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
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

  const getEligibleItemsAndComm = (job: Job, user: any, jobTypes: JobType[]) => {
      if (!user.sector) return { eligible: [], commission: 0 };
      const sector = user.sector;
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

  const calculateCommissionForItems = (job: Job, user: any, selectedIds: string[], jobTypes: JobType[]) => {
      if (!user || (!selectedIds || selectedIds.length === 0)) return 0;
      const sector = user.sector || 'Gestão';
      let totalComm = 0;
      
      job.items.forEach(item => {
          if (!selectedIds.includes(item.id)) return;
          if (item.commissionDisabled) return;
          
          const secQty = (item.sectorQuantities && item.sectorQuantities[sector]) ? item.sectorQuantities[sector] : item.quantity;
          const jt = jobTypes.find(t => t.id === item.jobTypeId);
          totalComm += calculateItemCommission(item, jt, user, secQty);
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
            const isLastActionEntryHere = user?.sector ? job.sectorMovements?.some(m => m.sector === user.sector && !m.exitTime) : false;
            setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
            
            if (isLastActionEntryHere && user && user.sector) {
                const { eligible, commission } = getEligibleItemsAndComm(job, user, jobTypesRef.current);
                setEligibleItems(eligible);
                setSelectedItemIds(eligible.map(e => e.item.id));
                setCommissionEarned(commission);
            } else {
                setEligibleItems([]);
                setSelectedItemIds([]);
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
                await handleMoveJob(nextSectorRef.current);
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
          if (currentUserRef.current?.sector) {
              const user = currentUserRef.current;
              const isLastActionEntryHere = job.sectorMovements?.some(m => m.sector === user.sector && !m.exitTime);
              setScanAction(isLastActionEntryHere ? 'EXIT' : 'ENTRY');
              
              if (isLastActionEntryHere) {
                  const { eligible, commission } = getEligibleItemsAndComm(job, user, jobTypesRef.current);
                  setEligibleItems(eligible);
                  setSelectedItemIds(eligible.map(e => e.item.id));
                  setCommissionEarned(commission);
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

  const handleMoveJob = async (nextSector?: string) => {
    if (isUploadingRef.current) return;
    
    const currentJob = scannedJobRef.current;
    const user = currentUserRef.current;
    const actionType = scanActionRef.current;

    if (!currentJob || !user) return;
    setIsUploading(true); // Usar como loading genérico
    
    try {
        let newStatus = currentJob.status;
        let sector = user.sector || currentJob.currentSector || 'Gestão';
        
        // --- VALIDAÇÃO DE SETORES PERMITIDOS ---
        const isSectorAllowed = (targetSector: string) => {
            let hasRestrictions = false;
            const allowedForAll: Set<string> = new Set();
            
            for (const item of currentJob.items) {
                const jType = jobTypes.find(jt => jt.id === item.jobTypeId);
                if (jType?.allowedSectors && jType.allowedSectors.length > 0) {
                    hasRestrictions = true;
                    jType.allowedSectors.forEach(s => allowedForAll.add(s));
                }
            }
            
            if (!hasRestrictions) return true;
            return allowedForAll.has(targetSector);
        };

        if (actionType === 'ENTRY' && !isSectorAllowed(sector)) {
            alert(`Ops! Este trabalho não foi destinado para o setor "${sector}". Verifique os serviços solicitados nesta OS.`);
            await playNativeHaptic(false);
            playBeep(false);
            return;
        }

        if (actionType === 'EXIT' && nextSector && !isSectorAllowed(nextSector)) {
            alert(`Ops! Este trabalho não foi destinado para o setor "${nextSector}". Verifique os serviços solicitados nesta OS.`);
            await playNativeHaptic(false);
            playBeep(false);
            return;
        }
        // ----------------------------------------

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

            // Calcular comissão em tempo de execução
            const calculatedCommission = calculateCommissionForItems(currentJob, user, selectedItemIds, jobTypesRef.current);
            
            // Atualizar o state para o UI
            setCommissionEarned(calculatedCommission);

            if (calculatedCommission > 0) {
                try {
                    await addCommissionRecord({
                        userId: user.id,
                        userName: user.name,
                        jobId: currentJob.id,
                        osNumber: currentJob.osNumber || 'N/A',
                        patientName: currentJob.patientName,
                        amount: calculatedCommission,
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

        const newHistory = [...(currentJob.history || []).filter(Boolean), {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: action,
            userId: user.id,
            userName: user.name,
            sector: sector
        }];

        let newSectorMovements = [...(currentJob.sectorMovements || []).filter(Boolean)];
        const currentOpenMovements = newSectorMovements.filter(m => !m.exitTime);
        let newItemExecutions = [...(currentJob.itemExecutions || [])];

        if (actionType === 'ENTRY') {
            // Fechar qualquer movimento em aberto antes de entrar em um novo
            currentOpenMovements.forEach(m => {
                const idx = newSectorMovements.findIndex(sm => sm.id === m.id);
                if (idx !== -1) {
                    newSectorMovements[idx] = {
                        ...newSectorMovements[idx],
                        exitTime: new Date(),
                        exitUserId: user.id,
                        exitUserName: user.name
                    };
                }
            });

            newSectorMovements.push({
                id: Math.random().toString(),
                sector: sector,
                entryTime: new Date(),
                entryUserId: user.id,
                entryUserName: user.name
            });
        } else if (actionType === 'EXIT') {
            // Register item executions
            selectedItemIds.forEach(itemId => {
                const item = currentJob.items.find((i: JobItem) => i.id === itemId);
                const jt = jobTypesRef.current.find((t: JobType) => t.id === item?.jobTypeId);
                if (item && jt) {
                    newItemExecutions.push({
                        itemId: item.id,
                        jobTypeId: item.jobTypeId,
                        jobTypeName: jt.name,
                        sector: sector,
                        userId: user.id,
                        userName: user.name,
                        timestamp: new Date()
                    });
                }
            });

            // Find the open movement for this sector
            const openMovementIndex = newSectorMovements.findIndex(m => m.sector === sector && !m.exitTime);
            if (openMovementIndex !== -1) {
                newSectorMovements[openMovementIndex] = {
                    ...newSectorMovements[openMovementIndex],
                    exitTime: new Date(),
                    exitUserId: user.id,
                    exitUserName: user.name
                };
            } else if (currentOpenMovements.length > 0) {
                // Se não achou no setor atual mas tem outro aberto, fecha o outro
                const latestOpen = [...currentOpenMovements].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0];
                const idx = newSectorMovements.findIndex(sm => sm.id === latestOpen.id);
                if (idx !== -1) {
                    newSectorMovements[idx] = {
                        ...newSectorMovements[idx],
                        exitTime: new Date(),
                        exitUserId: user.id,
                        exitUserName: user.name
                    };
                }
            }
        }

        if (actionType === 'EXIT' && nextSector) {
            newHistory.push({
                id: Math.random().toString(),
                timestamp: new Date(),
                action: `Entrada no setor ${nextSector}`,
                userId: user.id,
                userName: user.name,
                sector: nextSector
            });
            newSectorMovements.push({
                id: Math.random().toString(),
                sector: nextSector,
                entryTime: new Date(),
                entryUserId: user.id,
                entryUserName: user.name
            });
            sector = nextSector;
        }

        // Determine the current sector based on the latest open movement
        const latestOpenMovements = newSectorMovements.filter(m => !m.exitTime);
        if (latestOpenMovements.length > 0) {
            // Sort by entryTime descending to get the latest
            latestOpenMovements.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
            sector = latestOpenMovements[0].sector;
        }

        await updateJob(currentJob.id, {
            status: newStatus,
            currentSector: sector,
            history: newHistory,
            sectorMovements: newSectorMovements,
            itemExecutions: newItemExecutions
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
          <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] flex flex-col gap-3 items-center md:hidden print:hidden">
              {isNfcSupported && nfcStatus !== 'scanning' && (
                 <button 
                   onClick={() => (window as any).triggerNfcStart?.()}
                   className="w-12 h-12 bg-slate-800 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                   title="Ativar NFC"
                 >
                     <span className="font-black text-[10px]">NFC</span>
                 </button>
              )}
              <button 
                onClick={() => setIsCameraActive(true)}
                className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              >
                  <Camera size={28} />
              </button>
          </div>
      );
  }

  if (isCameraActive) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center text-white z-[120] bg-gradient-to-b from-black/60 to-transparent">
                  <div>
                      <h3 className="font-bold text-xl tracking-tight">Leitor LABPROX</h3>
                      <p className="text-xs opacity-70">Aponte para o código de barras da OS</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cameras.length > 1 && (
                      <select 
                        className="bg-black/40 border border-white/20 text-white text-[10px] rounded-lg px-2 py-1 outline-none mr-2 max-w-[120px] truncate"
                        value={selectedCameraId || ''}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                      >
                        {cameras.map(cam => (
                          <option key={cam.deviceId} value={cam.deviceId} className="text-black">{cam.label}</option>
                        ))}
                      </select>
                    )}
                    <button 
                        onClick={toggleTorch}
                        className={`p-3 rounded-full transition-all ${isTorchOn ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-200' : 'bg-white/10 text-white'}`}
                    >
                        <Volume2 size={24} className={isTorchOn ? 'animate-pulse' : ''} />
                    </button>
                    <button onClick={() => { setIsCameraActive(false); setIsTorchOn(false); }} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all">
                        <X size={24}/>
                    </button>
                  </div>
              </div>
              
              <video ref={videoRef} className="w-full h-full object-cover"></video>
              
              {/* Scanner Overlay UI Re-engineered */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 z-[110]">
                  {/* Scan Frame */}
                  <div className={`relative w-72 h-44 md:w-96 md:h-56 border-2 transition-all duration-300 ${scanSuccess ? 'border-green-400 scale-95' : 'border-white/30'}`}>
                      {/* Corners */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                      
                      {/* Scanning Line Animation */}
                      <motion.div 
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-0.5 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                      />

                      {/* Success Flash */}
                      {scanSuccess && (
                          <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 0.4, 0] }}
                              className="absolute inset-0 bg-white"
                          />
                      )}
                  </div>

                  <div className="mt-12 text-center space-y-2">
                      <p className="text-white/80 text-[10px] uppercase font-black tracking-[0.2em] bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Scanner de Fluxo Digital</p>
                      <p className="text-blue-400 text-[11px] font-bold">Posicione o código de barras no quadro</p>
                  </div>
              </div>
          </div>
      );
  }

  if (!scannedJob) return null;

  const isEntry = scanAction === 'ENTRY';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md max-h-[95vh] overflow-y-auto overscroll-contain border-t-[12px] ${isEntry ? 'border-blue-600' : 'border-orange-500'} animate-in zoom-in duration-200`}>
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
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 overflow-visible">
                <span className="text-slate-500 text-xs font-bold uppercase shrink-0 mr-2">OS</span>
                <div className="flex items-center gap-2 relative">
                    {jobs.filter(j => j.patientName === scannedJob.patientName).length > 1 && (
                        <div className="relative">
                            <button onClick={() => setIsCasesDropdownOpen(!isCasesDropdownOpen)} className="text-[9px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-black uppercase tracking-widest hover:bg-slate-300 transition-colors shadow-sm">Todos os Casos</button>
                            {isCasesDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsCasesDropdownOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 bg-white shadow-2xl border border-slate-200 rounded-xl py-2 w-48 z-[9999]">
                                        <div className="px-3 pb-2 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
                                            Histórico do Paciente
                                        </div>
                                        {jobs.filter(j => j.patientName === scannedJob.patientName)
                                             .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                             .map(j => (
                                            <button 
                                                key={j.id} 
                                                onClick={() => { setIsCasesDropdownOpen(false); setScannedJob(null); navigate(`/jobs/${j.id}`); }} 
                                                className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm font-mono font-bold text-slate-700 flex items-center justify-between"
                                            >
                                                <span>OS {j.osNumber || 'N/A'}</span>
                                                {j.id === scannedJob.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={() => { setScannedJob(null); navigate(`/jobs/${scannedJob.id}`); }} 
                        className="font-mono font-black text-2xl text-blue-600 hover:text-blue-800 transition-colors hover:underline cursor-pointer text-right"
                    >
                        {scannedJob.osNumber || "N/A"}
                    </button>
                </div>
            </div>
            <div className="flex justify-between items-center"><span className="text-slate-500 text-xs font-bold uppercase">Paciente</span><span className="font-black text-slate-800">{scannedJob.patientName}</span></div>
        </div>

        {/* Histórico Recente */}
        <div className="mb-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Últimas Movimentações</h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                {(scannedJob.history || []).slice(-3).reverse().map((h, i) => (
                    <div key={i} className={`px-3 py-2 flex items-center gap-3 ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold text-slate-700 leading-tight">{h.action}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-medium">Por: {h.userName} • {h.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
                {(!scannedJob.history || scannedJob.history.length === 0) && (
                    <p className="p-3 text-[10px] text-slate-400 text-center italic">Nenhum histórico registrado</p>
                )}
            </div>
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

        {!isEntry && eligibleItems.length > 0 && (
            <div className="mb-6 space-y-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Trabalhos Executados</label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 rounded-xl border border-slate-100 p-2 bg-slate-50">
                    {eligibleItems.map(({ item, jobType }) => (
                        <label key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500 border-slate-300"
                                checked={selectedItemIds.includes(item.id)}
                                onChange={(e) => {
                                    const newIds = e.target.checked 
                                        ? [...selectedItemIds, item.id] 
                                        : selectedItemIds.filter(id => id !== item.id);
                                    setSelectedItemIds(newIds);
                                    if (currentUserRef.current) {
                                        setCommissionEarned(calculateCommissionForItems(scannedJob, currentUserRef.current, newIds, jobTypesRef.current));
                                    }
                                }}
                            />
                            <div className="flex-1">
                                <p className="font-bold text-sm text-slate-800">{jobType?.name || 'Item Desconhecido'}</p>
                                <p className="text-xs text-slate-500">Qtd: {
                                    (currentUser?.sector && item.sectorQuantities && item.sectorQuantities[currentUser.sector]) 
                                        ? item.sectorQuantities[currentUser.sector] 
                                        : item.quantity
                                }</p>
                            </div>
                        </label>
                    ))}
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
            <button disabled={isUploading} onClick={() => { setScannedJob(null); setNextSector(''); }} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-50">Cancelar</button>
            <button disabled={isUploading} onClick={() => handleMoveJob(nextSector)} autoFocus className={`flex-[2] py-4 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex flex-col items-center justify-center leading-tight disabled:opacity-50 disabled:scale-100 ${isEntry ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}>
                {isUploading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    <>
                        <span>{isEntry ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SAÍDA'}</span>
                        <span className="text-[10px] font-medium opacity-80 mt-1">ou bipe novamente</span>
                    </>
                )}
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
