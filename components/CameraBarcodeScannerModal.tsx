import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { X, Zap, ZapOff, SwitchCamera, Camera, Image, Keyboard, Loader2, ScanBarcode, AlertCircle } from 'lucide-react';
import { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

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
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const hasScannedRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks and ZXing decoder safely
  const stopScanner = useCallback(() => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    } catch (e) {
      console.warn('[CameraScanner] Error resetting reader:', e);
    }

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (tErr) {}
        });
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn('[CameraScanner] Error stopping tracks:', e);
    }
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Request permissions and initialize cameras
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    hasScannedRef.current = false;
    setCameraError(null);
    setIsLoading(true);

    let isMounted = true;

    const initCamera = async () => {
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
          // If device enumeration didn't return labels, try default
          setSelectedCameraId('default');
        }
      } catch (err: any) {
        console.warn('[CameraScanner] Error getting cameras:', err);
        if (isMounted) {
          setSelectedCameraId('default');
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, stopScanner]);

  // Start ZXing Barcode Scanning on the selected camera
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isMounted = true;
    hasScannedRef.current = false;
    setIsLoading(true);
    setCameraError(null);

    // Hints configured for A4 paper barcodes (CODE128, CODE39, EAN, QR)
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODABAR
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, 200);
    codeReaderRef.current = reader;

    const startScanning = async () => {
      try {
        const targetDeviceId = (selectedCameraId === 'default' || !selectedCameraId) ? null : selectedCameraId;
        const videoElement = videoRef.current;
        if (!videoElement) return;

        await reader.decodeFromVideoDevice(
          targetDeviceId,
          videoElement,
          (result, error) => {
            if (!isMounted) return;

            if (result && !hasScannedRef.current) {
              const scannedText = result.getText();
              if (scannedText && scannedText.trim().length >= 2) {
                hasScannedRef.current = true;
                stopScanner();
                onScan(scannedText.trim());
                onClose();
              }
            }
          }
        );

        if (isMounted) {
          setIsLoading(false);

          // Check if torch is supported on current video track
          try {
            if (videoElement.srcObject) {
              const stream = videoElement.srcObject as MediaStream;
              const track = stream.getVideoTracks()[0];
              if (track) {
                const capabilities = (track as any).getCapabilities?.();
                setHasTorch(!!capabilities?.torch);
              }
            }
          } catch (tErr) {}
        }
      } catch (err: any) {
        console.error('[CameraScanner] Failed to start barcode scanner:', err);
        if (isMounted) {
          setIsLoading(false);
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Permissão de câmera negada. Ative a câmera nas configurações do seu aparelho ou navegador.'
              : err.message || 'Não foi possível acessar a câmera para leitura de códigos.'
          );
        }
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, selectedCameraId, onScan, onClose, stopScanner]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const nextState = !isTorchOn;
          await (track as any).applyConstraints({
            advanced: [{ torch: nextState }]
          });
          setIsTorchOn(nextState);
        }
      }
    } catch (err) {
      console.warn('[CameraScanner] Torch toggle error:', err);
    }
  };

  // Cycle camera
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

  // Handle Photo from Device Native Camera
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
          const hints = new Map<DecodeHintType, any>();
          hints.set(DecodeHintType.TRY_HARDER, true);
          const imgReader = new BrowserMultiFormatReader(hints);
          const result = await imgReader.decodeFromImageUrl(photo.webPath);
          if (result && result.getText()) {
            stopScanner();
            onScan(result.getText().trim());
            onClose();
            return;
          }
        } catch (decodeErr) {
          setCameraError('Nenhum código de barras legível encontrado na foto. Tente aproximar da ficha A4 ou digite a OS.');
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
      const objectUrl = URL.createObjectURL(file);
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.TRY_HARDER, true);
      const imgReader = new BrowserMultiFormatReader(hints);
      const result = await imgReader.decodeFromImageUrl(objectUrl);
      URL.revokeObjectURL(objectUrl);

      if (result && result.getText()) {
        stopScanner();
        onScan(result.getText().trim());
        onClose();
      } else {
        setCameraError('Código não identificado na imagem. Tente uma foto mais nítida do código de barras.');
      }
    } catch (err) {
      setCameraError('Não foi possível identificar o código de barras nesta foto. Certifique-se de que a imagem esteja nítida e bem iluminada.');
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
      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2.5 text-white">
          <div className="p-2 bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400">
            <ScanBarcode size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wide text-white uppercase">Leitor de Código de Barras</h2>
            <p className="text-[11px] text-slate-300">Aponte para o código da ficha A4 ou caixa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`p-3 rounded-full transition-all ${
                isTorchOn
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/50 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isTorchOn ? 'Desligar Lanterna' : 'Ligar Lanterna'}
            >
              {isTorchOn ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
          )}

          {cameras.length > 1 && (
            <button
              onClick={handleCycleCamera}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              title="Trocar Câmera"
            >
              <SwitchCamera size={20} />
            </button>
          )}

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Viewfinder Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white space-y-3">
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Iniciando câmera...</p>
          </div>
        )}

        {/* Processing Image Overlay */}
        {isProcessingImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 text-white space-y-3">
            <Loader2 size={40} className="animate-spin text-blue-400" />
            <p className="text-sm font-bold text-white">Analisando imagem do código...</p>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Reticle / Viewfinder Frame */}
        {!cameraError && (
          <div className="relative z-10 w-[82vw] max-w-sm h-48 sm:h-56 flex flex-col items-center justify-center pointer-events-none">
            {/* Viewfinder boundary box */}
            <div className="relative w-full h-full rounded-2xl border-2 border-blue-400/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />

              {/* Animated laser line */}
              <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse">
                <style>{`
                  @keyframes scanLineAnimation {
                    0% { top: 6%; opacity: 0.8; }
                    50% { top: 92%; opacity: 1; }
                    100% { top: 6%; opacity: 0.8; }
                  }
                  .scanner-laser-line {
                    position: absolute;
                    left: 5%;
                    right: 5%;
                    height: 2px;
                    background: #3b82f6;
                    box-shadow: 0 0 10px #60a5fa, 0 0 20px #3b82f6;
                    animation: scanLineAnimation 2.2s ease-in-out infinite;
                  }
                `}</style>
                <div className="scanner-laser-line" />
              </div>
            </div>

            <p className="text-white text-xs font-bold tracking-wide mt-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center px-4">
              Posicione o código de barras da ficha A4 dentro da moldura
            </p>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="relative z-20 max-w-sm p-6 mx-4 text-center bg-slate-900/90 border border-slate-700 rounded-3xl text-white space-y-4 shadow-2xl">
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
      <div className="relative z-20 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-3 pb-[env(safe-area-inset-bottom)]">
        {/* Manual Input form if opened */}
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

        {/* Hidden File Input */}
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
