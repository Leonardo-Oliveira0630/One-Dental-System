import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera as CameraIcon, 
  X, 
  Loader2, 
  SwitchCamera, 
  AlertCircle, 
  Flashlight, 
  FlashlightOff, 
  Image as ImageIcon, 
  Smartphone,
  Sparkles
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';

interface WebcamModalProps {
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ 
  onClose, 
  onCapture,
  title = "Foto do Caso"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const [cameraResolution, setCameraResolution] = useState<{ width: number; height: number } | null>(null);
  const [focusAnimation, setFocusAnimation] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCameras = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await Camera.requestPermissions();
        } catch (e) {
          console.warn("Could not request native camera permissions:", e);
        }
      }

      const availableCameras = await getAvailableCameras();
      if (isMounted) {
        setCameras(availableCameras);
        if (availableCameras.length > 0) {
          setSelectedCameraId(getSmartCameraSelection(availableCameras) || availableCameras[0].deviceId);
        } else {
          setSelectedCameraId('default');
        }
      }
    };
    fetchCameras();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;
    let safetyTimeout: any = null;

    const startCamera = async () => {
      if (!selectedCameraId) return;
      setIsLoading(true);
      setCameraError(null);
      setIsTorchOn(false);
      setCameraResolution(null);

      try {
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
        }

        const deviceConstraint = selectedCameraId !== 'default' 
          ? { deviceId: { ideal: selectedCameraId } }
          : { facingMode: { ideal: 'environment' } };

        // Attempt 1: Ultra High Definition 4K with advanced auto-focus & exposure
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...deviceConstraint,
              width: { ideal: 4096 },
              height: { ideal: 2160 },
              frameRate: { ideal: 30 },
              advanced: [
                { focusMode: 'continuous' } as any,
                { exposureMode: 'continuous' } as any,
                { whiteBalanceMode: 'continuous' } as any
              ]
            }
          });
        } catch (e1) {
          console.warn("Tentativa 4K falhou, tentando Full HD...", e1);
          try {
            // Attempt 2: Full HD 1080p
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                ...deviceConstraint,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                advanced: [
                  { focusMode: 'continuous' } as any,
                  { exposureMode: 'continuous' } as any
                ]
              }
            });
          } catch (e2) {
            console.warn("Tentativa Full HD falhou, tentando HD 720p...", e2);
            try {
              // Attempt 3: HD 720p
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  ...deviceConstraint,
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }
              });
            } catch (e3) {
              console.warn("Tentativa HD falhou, usando configuração flexível...", e3);
              stream = await navigator.mediaDevices.getUserMedia({
                video: deviceConstraint
              });
            }
          }
        }

        if (isMounted && videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          
          const handleReady = () => {
            if (isMounted) {
              setIsLoading(false);
              if (videoRef.current) {
                videoRef.current.play().catch(console.error);
                if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
                  setCameraResolution({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight
                  });
                }
              }
              // Check torch capability
              try {
                const track = stream?.getVideoTracks()[0];
                const caps = (track?.getCapabilities ? track.getCapabilities() : {}) as any;
                setHasTorch(Boolean(caps?.torch));
              } catch (tErr) {
                setHasTorch(false);
              }
            }
          };

          videoRef.current.onloadedmetadata = handleReady;
          videoRef.current.oncanplay = handleReady;

          safetyTimeout = setTimeout(() => {
            if (isMounted) setIsLoading(false);
          }, 2000);
        }
      } catch (err: any) {
        console.error("Failed to start camera", err);
        if (isMounted) {
          setIsLoading(false);
          setCameraError(
            err.name === 'NotAllowedError' 
              ? 'Permissão de acesso à câmera negada. Permita o uso da câmera nas configurações do seu aparelho.' 
              : (err.message || 'Não foi possível acessar a câmera do dispositivo.')
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current?.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [selectedCameraId]);

  const toggleTorch = async () => {
    try {
      if (!videoRef.current?.srcObject) return;
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      const nextTorch = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn("Torch toggle error:", err);
    }
  };

  const handleNativeCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          quality: 92,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        });

        if (photo.webPath) {
          const response = await fetch(photo.webPath);
          const blob = await response.blob();
          const ext = photo.format || 'jpg';
          const file = new File(
            [blob], 
            `foto-caso-${Date.now()}.${ext}`, 
            { type: `image/${ext === 'png' ? 'png' : 'jpeg'}` }
          );
          onCapture(file);
          onClose();
        }
      } catch (err: any) {
        if (!err.message?.includes('User cancelled')) {
          console.error("Native camera error:", err);
        }
      }
    } else {
      // On web browser, trigger native camera file picker
      galleryInputRef.current?.click();
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      onClose();
    }
  };

  const triggerShutterFeedback = () => {
    // Haptic vibration
    try {
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch (e) {}

    // Shutter flash effect
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 150);
  };

  const handleViewfinderClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusAnimation({ x, y });
    setTimeout(() => setFocusAnimation(null), 1200);

    // Try hardware focus constraint if available
    try {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (caps.focusMode && (caps.focusMode.includes('continuous') || caps.focusMode.includes('single-shot'))) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any]
            });
          }
        }
      }
    } catch (err) {
      console.warn("Autofocus tap constraint error:", err);
    }
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // If video width is 0, fall back to native camera if available
    if (video.videoWidth === 0 && Capacitor.isNativePlatform()) {
      handleNativeCamera();
      return;
    }

    triggerShutterFeedback();

    const stream = video.srcObject as MediaStream;
    const track = stream?.getVideoTracks()[0];

    // Priority 1: Hardware-level ImageCapture API for true sensor resolution (12MP/48MP/4K)
    if (track && (window as any).ImageCapture) {
      try {
        const imageCapture = new (window as any).ImageCapture(track);
        
        // Trigger auto-focus right before taking photo if supported
        try {
          const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (caps.focusMode && (caps.focusMode.includes('single-shot') || caps.focusMode.includes('continuous'))) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
          }
        } catch (fErr) {}

        let photoSettings: any = {};
        try {
          if (imageCapture.getPhotoCapabilities) {
            const photoCaps = await imageCapture.getPhotoCapabilities();
            if (photoCaps.imageWidth?.max) {
              photoSettings.imageWidth = photoCaps.imageWidth.max;
            }
            if (photoCaps.imageHeight?.max) {
              photoSettings.imageHeight = photoCaps.imageHeight.max;
            }
            if (isTorchOn && photoCaps.fillLightMode?.includes('flash')) {
              photoSettings.fillLightMode = 'flash';
            }
          }
        } catch (capsErr) {
          console.warn("Could not query photo capabilities, using defaults:", capsErr);
        }

        const blob = await imageCapture.takePhoto(photoSettings);

        if (blob && blob.size > 0) {
          const file = new File(
            [blob], 
            `foto-caso-hd-${Date.now()}.jpg`, 
            { type: 'image/jpeg' }
          );
          console.log(`[LABPROX CAMERA] Foto de alta resolução capturada via ImageCapture (${(blob.size / 1024).toFixed(1)}KB)`);
          onCapture(file);
          onClose();
          return;
        }
      } catch (icErr) {
        console.warn("ImageCapture takePhoto fallback to high-resolution Canvas:", icErr);
      }
    }

    // Priority 2: High-resolution Canvas capture with bicubic smoothing
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File(
          [blob], 
          `foto-caso-hd-${Date.now()}.jpg`, 
          { type: 'image/jpeg' }
        );
        console.log(`[LABPROX CAMERA] Foto capturada via Canvas HD (${canvas.width}x${canvas.height}): ${(blob.size / 1024).toFixed(1)}KB`);
        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.98);
  }, [onCapture, onClose, isTorchOn]);

  const cycleCamera = () => {
    if (cameras.length > 1 && selectedCameraId) {
      const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCameraId(cameras[nextIndex].deviceId);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Hidden gallery file input */}
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={handleGallerySelect} 
      />

      <div className="relative w-full h-full sm:max-w-md md:max-w-lg sm:h-[88vh] sm:max-h-[820px] bg-black sm:rounded-[36px] sm:border sm:border-slate-800/80 shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 p-4 sm:p-5 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Close button */}
          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 bg-black/40 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/15 backdrop-blur-md active:scale-95 transition-all shadow-lg"
            title="Fechar Câmera"
          >
            <X size={20} />
          </button>

          {/* Title & HD Resolution Pill */}
          <div className="flex items-center gap-1.5">
            <div className="px-3.5 py-1.5 bg-black/50 border border-white/15 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {title}
              </span>
            </div>
            {cameraResolution && (
              <div className="hidden sm:flex px-2.5 py-1 bg-blue-600/60 border border-blue-400/40 rounded-full backdrop-blur-md items-center gap-1 shadow-lg text-[10px] font-black text-white uppercase tracking-tight">
                <Sparkles size={11} className="text-blue-300" />
                {cameraResolution.width >= 3840 ? '4K Ultra HD' : cameraResolution.width >= 1920 ? 'Full HD' : `${cameraResolution.width}x${cameraResolution.height}`}
              </div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Torch toggle */}
            {hasTorch && (
              <button 
                type="button"
                onClick={toggleTorch} 
                className={`w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-md active:scale-95 transition-all shadow-lg ${
                  isTorchOn 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30' 
                    : 'bg-black/40 hover:bg-black/80 text-white border-white/15'
                }`}
                title={isTorchOn ? "Desativar Lanterna" : "Ativar Lanterna"}
              >
                {isTorchOn ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
              </button>
            )}

            {/* Switch Camera */}
            {cameras.length > 1 && (
              <button 
                type="button"
                onClick={cycleCamera} 
                className="w-10 h-10 bg-black/40 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/15 backdrop-blur-md active:scale-95 transition-all shadow-lg"
                title="Alternar Câmera"
              >
                <SwitchCamera size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Viewfinder Video Area */}
        <div 
          onClick={handleViewfinderClick}
          className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden cursor-crosshair"
          title="Toque na tela para focar"
        >
          {/* Shutter White Flash Feedback */}
          <div 
            className={`absolute inset-0 bg-white pointer-events-none z-40 transition-opacity duration-150 ${
              isFlashing ? 'opacity-90' : 'opacity-0'
            }`} 
          />

          {/* Dynamic Tap-to-Focus Reticle */}
          {focusAnimation && (
            <div 
              style={{ left: `${focusAnimation.x - 32}px`, top: `${focusAnimation.y - 32}px` }}
              className="absolute w-16 h-16 border-2 border-amber-400 rounded-2xl pointer-events-none z-30 animate-ping duration-700 shadow-lg shadow-amber-400/50"
            />
          )}

          {/* Rule of Thirds Alignment Grid */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-20">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>

          {/* Center Focus Reticle */}
          <div className="absolute w-44 h-44 sm:w-52 sm:h-52 border border-white/30 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white/70 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white/70 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white/70 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white/70 rounded-br" />
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white z-20 gap-3 p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Loader2 className="animate-spin" size={28} />
              </div>
              <span className="text-sm font-black uppercase tracking-wider text-slate-200">
                Iniciando câmera...
              </span>
              <span className="text-xs text-slate-400 font-medium max-w-xs">
                Ajustando foco e resolução do sensor
              </span>
            </div>
          )}

          {/* Error Message */}
          {cameraError && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950/95 text-white z-20 space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg">
                <AlertCircle size={32} />
              </div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-white mb-1">
                  Acesso à Câmera Indisponível
                </h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {cameraError}
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 pt-2">
                <button 
                  type="button"
                  onClick={handleNativeCamera}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Smartphone size={16} /> Abrir Câmera Nativa do Celular
                </button>
                <button 
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <ImageIcon size={16} /> Escolher da Galeria
                </button>
              </div>
            </div>
          )}

          {/* Video Stream Element */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Bottom Camera Control Dock */}
        <div className="relative z-30 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-around gap-4">
          {/* Left: Gallery Picker */}
          <button 
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-all active:scale-90 w-16"
            title="Escolher Foto da Galeria"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-slate-200 shadow-md">
              <ImageIcon size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
              Galeria
            </span>
          </button>

          {/* Center: Premium Shutter Button */}
          <button 
            type="button"
            onClick={capturePhoto}
            disabled={isLoading && !cameraError}
            className="relative group p-1 active:scale-90 transition-transform disabled:opacity-50"
            title="Tirar Foto"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white/90 p-1 flex items-center justify-center transition-all group-hover:border-white group-hover:scale-105 shadow-2xl shadow-black/80">
              <div className="w-full h-full rounded-full bg-white group-active:bg-slate-200 transition-colors shadow-inner flex items-center justify-center">
                <CameraIcon size={26} className="text-slate-950" />
              </div>
            </div>
          </button>

          {/* Right: Native Camera Option */}
          <button
            type="button"
            onClick={handleNativeCamera}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-all active:scale-90 w-16"
            title="Abrir Câmera Nativa do Celular"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 backdrop-blur-md flex items-center justify-center text-blue-300 shadow-md">
              <Smartphone size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-blue-200">
              Nativa
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
