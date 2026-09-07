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

      try {
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
        }

        // Attempt 1: With ideal camera ID
        try {
          const constraints: MediaStreamConstraints = {
            video: selectedCameraId !== 'default' ? {
              deviceId: { ideal: selectedCameraId },
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } : {
              facingMode: { ideal: 'environment' }
            }
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e1) {
          console.warn("Attempt 1 getUserMedia failed, trying fallback...", e1);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' } }
            });
          } catch (e2) {
            console.warn("Attempt 2 getUserMedia failed, trying basic video...", e2);
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        }

        if (isMounted && videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          
          const handleReady = () => {
            if (isMounted) {
              setIsLoading(false);
              if (videoRef.current) {
                videoRef.current.play().catch(console.error);
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

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // If video width is 0, fall back to native camera if available
    if (video.videoWidth === 0 && Capacitor.isNativePlatform()) {
      handleNativeCamera();
      return;
    }

    triggerShutterFeedback();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File(
          [blob], 
          `foto-caso-${Date.now()}.jpg`, 
          { type: 'image/jpeg' }
        );
        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.92);
  }, [onCapture, onClose]);

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

          {/* Title Pill */}
          <div className="px-3.5 py-1.5 bg-black/50 border border-white/15 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              {title}
            </span>
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
        <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
          {/* Shutter White Flash Feedback */}
          <div 
            className={`absolute inset-0 bg-white pointer-events-none z-40 transition-opacity duration-150 ${
              isFlashing ? 'opacity-90' : 'opacity-0'
            }`} 
          />

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
