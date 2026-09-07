import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  X,
  Zap,
  ZapOff,
  SwitchCamera,
  Camera,
  Image,
  Keyboard,
  Loader2,
  ScanBarcode,
  AlertCircle,
  CheckCircle2,
  ZoomIn
} from 'lucide-react';
import { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';
import {
  BarcodeScannerEngine,
  startHighDefinitionCamera,
  toggleTrackTorch,
  applyTrackZoom
} from '../services/barcodeScannerEngine';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

const triggerSuccessFeedback = async () => {
  // 1. Audio Beep
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }
  } catch (e) {}

  // 2. Capacitor Haptics / Web Vibrate
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 20, 30]);
    }
  }
};

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxHardwareZoom, setMaxHardwareZoom] = useState<number>(1);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<BarcodeScannerEngine | null>(null);
  const activeTrackRef = useRef<MediaStreamTrack | null>(null);
  const hasScannedRef = useRef<boolean>(false);
  const scanLoopIdRef = useRef<number | null>(null);
  const isScanningFrameRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks and engine scanning safely
  const stopScanner = useCallback(() => {
    if (scanLoopIdRef.current !== null) {
      cancelAnimationFrame(scanLoopIdRef.current);
      scanLoopIdRef.current = null;
    }
    isScanningFrameRef.current = false;

    if (engineRef.current) {
      try {
        engineRef.current.reset();
      } catch (e) {}
    }

    if (activeTrackRef.current) {
      try {
        activeTrackRef.current.stop();
      } catch (e) {}
      activeTrackRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (tErr) {}
        });
        videoRef.current.srcObject = null;
      } catch (e) {}
    }

    setIsTorchOn(false);
    setHasTorch(false);
    setZoomLevel(1);
    setMaxHardwareZoom(1);
  }, []);

  // Request native permissions & discover available cameras
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    hasScannedRef.current = false;
    setLastDetectedCode(null);
    setCameraError(null);
    setIsLoading(true);

    let isMounted = true;

    const initDevice = async () => {
      // 1. If running on Capacitor Native, request native camera permission first
      if (Capacitor.isNativePlatform()) {
        try {
          const { Camera } = await import('@capacitor/camera');
          const status = await Camera.checkPermissions();
          if (status.camera !== 'granted') {
            await Camera.requestPermissions({ permissions: ['camera'] });
          }
        } catch (permErr) {
          console.warn('[CameraScanner] Native permission check error:', permErr);
        }
      }

      // 2. Discover available cameras
      try {
        const available = await getAvailableCameras();
        if (!isMounted) return;

        setCameras(available);
        if (available.length > 0) {
          const bestId = getSmartCameraSelection(available) || available[0].deviceId;
          setSelectedCameraId(bestId);
        } else {
          setSelectedCameraId('default');
        }
      } catch (err: any) {
        console.warn('[CameraScanner] Error getting cameras:', err);
        if (isMounted) {
          setSelectedCameraId('default');
        }
      }
    };

    initDevice();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, stopScanner]);

  // Handle successful scan event
  const handleBarcodeFound = useCallback((code: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    setLastDetectedCode(code);

    triggerSuccessFeedback();

    // Brief delay to let the user see the visual confirmation
    setTimeout(() => {
      stopScanner();
      onScan(code);
      onClose();
    }, 280);
  }, [onScan, onClose, stopScanner]);

  // Start High-Definition Camera and High-Speed Scan Loop
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isMounted = true;
    hasScannedRef.current = false;
    setLastDetectedCode(null);
    setIsLoading(true);
    setCameraError(null);

    // Initialize Barcode Engine (Native BarcodeDetector + Dual-Axis ZXing)
    const engine = new BarcodeScannerEngine();
    engineRef.current = engine;

    const startCameraAndScan = async () => {
      try {
        await engine.init();

        const { stream, track, capabilities } = await startHighDefinitionCamera(
          selectedCameraId === 'default' ? null : selectedCameraId
        );

        if (!isMounted) {
          track.stop();
          return;
        }

        activeTrackRef.current = track;

        const videoElement = videoRef.current;
        if (!videoElement) {
          track.stop();
          return;
        }

        videoElement.srcObject = stream;
        await videoElement.play();

        if (isMounted) {
          setIsLoading(false);

          // Check torch capability
          setHasTorch(!!capabilities?.torch);

          // Check zoom capability
          if (capabilities?.zoom) {
            setMaxHardwareZoom(capabilities.zoom.max || 1);
          } else {
            setMaxHardwareZoom(1);
          }

          // Start continuous high-speed scan loop (20-30 FPS)
          const runScanLoop = () => {
            if (!isMounted || hasScannedRef.current) return;

            if (!isScanningFrameRef.current && videoElement && videoElement.readyState >= 2) {
              isScanningFrameRef.current = true;

              engine.scanFrame(videoElement)
                .then(code => {
                  if (code && !hasScannedRef.current) {
                    handleBarcodeFound(code);
                  }
                })
                .catch(() => {})
                .finally(() => {
                  isScanningFrameRef.current = false;
                });
            }

            if (!hasScannedRef.current) {
              scanLoopIdRef.current = requestAnimationFrame(runScanLoop);
            }
          };

          scanLoopIdRef.current = requestAnimationFrame(runScanLoop);
        }
      } catch (err: any) {
        console.error('[CameraScanner] Failed to start HD camera scanner:', err);
        if (isMounted) {
          setIsLoading(false);
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Permissão de câmera negada. Ative o acesso à câmera nas configurações do seu aparelho ou navegador.'
              : err.message || 'Não foi possível acessar a câmera de alta definição para leitura de códigos.'
          );
        }
      }
    };

    startCameraAndScan();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, selectedCameraId, handleBarcodeFound, stopScanner]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!activeTrackRef.current) return;
    const nextState = !isTorchOn;
    const ok = await toggleTrackTorch(activeTrackRef.current, nextState);
    if (ok) {
      setIsTorchOn(nextState);
    }
  };

  // Toggle Zoom Level (1x -> 1.5x -> 2x -> 1x)
  const handleCycleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 1.5 : zoomLevel === 1.5 ? 2 : 1;
    setZoomLevel(nextZoom);

    if (activeTrackRef.current && maxHardwareZoom > 1) {
      await applyTrackZoom(activeTrackRef.current, nextZoom);
    }
  };

  // Cycle camera device
  const handleCycleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].deviceId);
  };

  // Handle Manual Code Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    stopScanner();
    onScan(manualCode.trim());
    onClose();
  };

  // Handle Photo from Device Native Camera (Capacitor)
  const handleNativeCameraSnap = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 100,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (photo.webPath) {
        setIsProcessingImage(true);
        try {
          if (!engineRef.current) {
            engineRef.current = new BarcodeScannerEngine();
          }
          const code = await engineRef.current.decodeStaticImage(photo.webPath);
          if (code) {
            handleBarcodeFound(code);
            return;
          } else {
            setCameraError('Nenhum código de barras identificado na foto capturada. Tente aproximar da ficha A4 ou etiqueta térmica.');
          }
        } catch (decodeErr) {
          setCameraError('Erro ao processar imagem capturada.');
        } finally {
          setIsProcessingImage(false);
        }
      }
    } catch (err: any) {
      if (!err.message?.includes('User cancelled')) {
        console.warn('[CameraScanner] Native capture error:', err);
      }
    }
  };

  // Handle Image File Selection (Gallery / File Explorer)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setCameraError(null);

    try {
      if (!engineRef.current) {
        engineRef.current = new BarcodeScannerEngine();
      }
      const code = await engineRef.current.decodeStaticImage(file);
      if (code) {
        handleBarcodeFound(code);
      } else {
        setCameraError('Código de barras não identificado na imagem enviada. Certifique-se de que esteja focado e bem iluminado.');
      }
    } catch (err) {
      setCameraError('Não foi possível processar a imagem do arquivo selecionado.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="camera-barcode-scanner-modal"
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/70 to-transparent">
        <div className="flex items-center gap-2.5 text-white">
          <div className={`p-2 rounded-xl transition-all ${lastDetectedCode ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-400' : 'bg-blue-600/30 border border-blue-500/30 text-blue-400'}`}>
            <ScanBarcode size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wide text-white uppercase">Leitor Rápido Labprox</h2>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase rounded tracking-wider">
                Ultra HD
              </span>
            </div>
            <p className="text-[11px] text-slate-300">Ficha A4 e Etiqueta Térmica na horizontal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Toggle Pill */}
          <button
            onClick={handleCycleZoom}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs rounded-full flex items-center gap-1 transition-all border border-white/10"
            title="Ajustar Zoom (Ideal para Etiqueta Térmica)"
          >
            <ZoomIn size={14} className="text-blue-400" />
            <span>{zoomLevel}x</span>
          </button>

          {/* Torch Button */}
          {hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`p-2.5 rounded-full transition-all ${
                isTorchOn
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/50 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isTorchOn ? 'Desligar Lanterna' : 'Ligar Lanterna'}
            >
              {isTorchOn ? <Zap size={18} /> : <ZapOff size={18} />}
            </button>
          )}

          {/* Switch Camera */}
          {cameras.length > 1 && (
            <button
              onClick={handleCycleCamera}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              title="Trocar Câmera Traseira"
            >
              <SwitchCamera size={18} />
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Viewfinder Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white space-y-3">
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Iniciando câmera Full HD...</p>
          </div>
        )}

        {/* Processing Image Overlay */}
        {isProcessingImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/85 text-white space-y-3">
            <Loader2 size={40} className="animate-spin text-blue-400" />
            <p className="text-sm font-bold text-white">Analisando imagem em alta resolução...</p>
          </div>
        )}

        {/* Live Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            transform: zoomLevel > 1 && maxHardwareZoom <= 1 ? `scale(${zoomLevel})` : undefined,
            transition: 'transform 0.2s ease-out'
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Reticle / Viewfinder Frame */}
        {!cameraError && (
          <div className="relative z-10 w-[84vw] max-w-sm h-48 sm:h-52 flex flex-col items-center justify-center pointer-events-none">
            {/* Viewfinder boundary box */}
            <div
              className={`relative w-full h-full rounded-2xl border-2 transition-all duration-200 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] ${
                lastDetectedCode
                  ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                  : 'border-blue-400/60'
              }`}
            >
              {/* Corner brackets */}
              <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl transition-colors ${lastDetectedCode ? 'border-emerald-400' : 'border-blue-500'}`} />
              <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl transition-colors ${lastDetectedCode ? 'border-emerald-400' : 'border-blue-500'}`} />
              <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl transition-colors ${lastDetectedCode ? 'border-emerald-400' : 'border-blue-500'}`} />
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl transition-colors ${lastDetectedCode ? 'border-emerald-400' : 'border-blue-500'}`} />

              {/* Dynamic Laser Beam */}
              {!lastDetectedCode ? (
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                  <style>{`
                    @keyframes ultraFastScanLine {
                      0% { top: 8%; opacity: 0.8; }
                      50% { top: 88%; opacity: 1; }
                      100% { top: 8%; opacity: 0.8; }
                    }
                    .ultra-laser-line {
                      position: absolute;
                      left: 4%;
                      right: 4%;
                      height: 2px;
                      background: #3b82f6;
                      box-shadow: 0 0 10px #60a5fa, 0 0 20px #3b82f6;
                      animation: ultraFastScanLine 1.4s ease-in-out infinite;
                    }
                  `}</style>
                  <div className="ultra-laser-line" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/70 rounded-2xl animate-in zoom-in-90 duration-150 text-white">
                  <CheckCircle2 size={44} className="text-emerald-400 mb-1" />
                  <span className="font-mono text-xs font-black tracking-wider text-emerald-300 uppercase">
                    Código Identificado
                  </span>
                  <span className="font-mono text-sm font-extrabold text-white mt-0.5">
                    {lastDetectedCode}
                  </span>
                </div>
              )}
            </div>

            {/* Instruction label */}
            <p className="text-white text-xs font-bold tracking-wide mt-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center px-4">
              Mantenha o celular na vertical e o código na horizontal
            </p>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="relative z-20 max-w-sm p-6 mx-4 text-center bg-slate-900/95 border border-slate-700 rounded-3xl text-white space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
              <AlertCircle size={28} />
            </div>
            <p className="text-xs font-semibold text-slate-200 leading-relaxed">{cameraError}</p>
            <div className="flex flex-col gap-2 pt-2">
              {Capacitor.isNativePlatform() && (
                <button
                  onClick={handleNativeCameraSnap}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Camera size={16} /> Tirar Foto com Câmera Nativa
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-600"
              >
                <Image size={16} /> Carregar Imagem da Galeria
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/20 transition-all"
              >
                Digitar OS Manualmente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-20 p-4 bg-gradient-to-t from-black/95 via-black/85 to-transparent space-y-3 pb-[env(safe-area-inset-bottom)]">
        {/* Manual Input Form */}
        {showManualInput ? (
          <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-md mx-auto animate-in slide-in-from-bottom duration-150">
            <input
              type="text"
              autoFocus
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Digite o número da OS ou Caixa..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 font-mono"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shrink-0"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => setShowManualInput(false)}
              className="px-3 py-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            {Capacitor.isNativePlatform() && (
              <button
                onClick={handleNativeCameraSnap}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 backdrop-blur-md transition-all border border-white/10"
              >
                <Camera size={16} className="text-blue-400" />
                Câmera Nativa
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 backdrop-blur-md transition-all border border-white/10"
            >
              <Image size={16} className="text-emerald-400" />
              Galeria
            </button>

            <button
              onClick={() => setShowManualInput(true)}
              className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 backdrop-blur-md transition-all border border-white/10"
            >
              <Keyboard size={16} className="text-amber-400" />
              Digitar OS
            </button>
          </div>
        )}

        {/* Hidden File Input for Gallery */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
