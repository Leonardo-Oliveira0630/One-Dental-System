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
  Sparkles,
  Video as VideoIcon,
  Square
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';
import { smartCompress } from '../services/compressionService';

interface WebcamModalProps {
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ 
  onClose, 
  onCapture,
  title = "Mídia do Caso"
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

  // Capture mode: Photo vs Video
  const [captureMode, setCaptureMode] = useState<'PHOTO' | 'VIDEO'>('PHOTO');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

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
          setSelectedCameraId(prev => (prev && availableCameras.some(c => c.deviceId === prev)) ? prev : (getSmartCameraSelection(availableCameras) || availableCameras[0].deviceId));
        } else {
          setSelectedCameraId('default');
        }
      }
    };

    fetchCameras();

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', fetchCameras);
    }

    return () => { 
      isMounted = false; 
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', fetchCameras);
      }
    };
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

        const exactConstraint = selectedCameraId !== 'default' 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: { ideal: 'environment' } };

        const idealConstraint = selectedCameraId !== 'default' 
          ? { deviceId: { ideal: selectedCameraId } }
          : { facingMode: { ideal: 'environment' } };

        // Attempt 1: Exact camera ID + Full HD 1080p
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...exactConstraint,
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
        } catch (e1) {
          console.warn("Attempt 1 (exact ID + FHD) failed:", e1);
          try {
            // Attempt 2: Exact camera ID
            stream = await navigator.mediaDevices.getUserMedia({
              video: exactConstraint
            });
          } catch (e2) {
            console.warn("Attempt 2 (exact ID) failed:", e2);
            try {
              // Attempt 3: Ideal camera ID
              stream = await navigator.mediaDevices.getUserMedia({
                video: idealConstraint
              });
            } catch (e3) {
              console.warn("Attempt 3 failed, falling back to default video:", e3);
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
              ? 'Permissão de acesso à câmera negada. Permita o uso da câmera nas configurações do seu navegador ou sistema.' 
              : (err.message || 'Não foi possível acessar a câmera do dispositivo.')
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
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
          const rawFile = new File(
            [blob], 
            `foto-caso-${Date.now()}.${ext}`, 
            { type: `image/${ext === 'png' ? 'png' : 'jpeg'}` }
          );
          const processed = await smartCompress(rawFile);
          onCapture(processed);
          onClose();
        }
      } catch (err: any) {
        if (!err.message?.includes('User cancelled')) {
          console.error("Native camera error:", err);
        }
      }
    } else {
      galleryInputRef.current?.click();
    }
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const processed = await smartCompress(file);
      onCapture(processed);
      setIsLoading(false);
      onClose();
    }
  };

  const triggerShutterFeedback = () => {
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);
  };

  const handleViewfinderClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusAnimation({ x, y });
    setTimeout(() => setFocusAnimation(null), 1200);

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

  // Capturar Foto
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Certifica que o vídeo está pronto e com dimensões válidas
    if ((video.readyState < 2 || video.videoWidth === 0) && Capacitor.isNativePlatform()) {
      handleNativeCamera();
      return;
    }

    if (video.readyState < 2 || video.videoWidth === 0) {
      console.warn("Vídeo ainda não pronto para captura");
      return;
    }

    triggerShutterFeedback();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    const mimeType = supportsWebp ? 'image/webp' : 'image/jpeg';
    const ext = supportsWebp ? '.webp' : '.jpg';

    canvas.toBlob(async (blob) => {
      if (blob && blob.size > 0) {
        const file = new File(
          [blob], 
          `foto-caso-${Date.now()}${ext}`, 
          { type: mimeType }
        );
        const processed = await smartCompress(file);
        console.log(`[LABPROX CAMERA] Foto capturada e otimizada: ${(processed.size / 1024).toFixed(1)}KB`);
        onCapture(processed);
        onClose();
      }
    }, mimeType, 0.85);
  }, [onCapture, onClose]);

  // Gravar Vídeo (Início/Parada)
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Erro ao parar gravação:", e);
      }
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          const rawVideoFile = new File([blob], `video-caso-${Date.now()}.${ext}`, { type: mimeType });
          const processed = await smartCompress(rawVideoFile);
          console.log(`[LABPROX VIDEO] Vídeo gravado e processado: ${(processed.size / 1024 / 1024).toFixed(2)}MB`);
          onCapture(processed);
          onClose();
        }
      };

      mediaRecorder.start(200);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Erro ao iniciar gravação de vídeo:", err);
      alert("Não foi possível iniciar a gravação de vídeo neste dispositivo.");
    }
  }, [onCapture, onClose, stopRecording]);

  const cycleCamera = () => {
    if (cameras.length > 1 && selectedCameraId) {
      const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCameraId(cameras[nextIndex].deviceId);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Input de arquivo para seleção de galeria de imagens/vídeos */}
      <input 
        type="file" 
        ref={galleryInputRef} 
        accept="image/*,video/*" 
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
            className="w-10 h-10 bg-black/40 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/15 backdrop-blur-md active:scale-95 transition-all shadow-lg cursor-pointer"
            title="Fechar Câmera"
          >
            <X size={20} />
          </button>

          {/* Mode Selector Tabs (Foto vs Vídeo) */}
          <div className="flex items-center bg-black/60 border border-white/20 rounded-full p-1 backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => { if (!isRecording) setCaptureMode('PHOTO'); }}
              disabled={isRecording}
              className={`px-3 py-1 rounded-full text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                captureMode === 'PHOTO' ? 'bg-white text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <CameraIcon size={14} />
              <span>Foto</span>
            </button>
            <button
              type="button"
              onClick={() => { if (!isRecording) setCaptureMode('VIDEO'); }}
              disabled={isRecording}
              className={`px-3 py-1 rounded-full text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                captureMode === 'VIDEO' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'text-slate-300 hover:text-white'
              }`}
            >
              <VideoIcon size={14} />
              <span>Vídeo</span>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
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

            {cameras.length > 1 && !isRecording && (
              <button 
                type="button"
                onClick={cycleCamera} 
                className="w-10 h-10 bg-black/40 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/15 backdrop-blur-md active:scale-95 transition-all shadow-lg cursor-pointer"
                title="Alternar Câmera"
              >
                <SwitchCamera size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Live Recording Counter */}
        {isRecording && (
          <div className="absolute top-16 inset-x-0 mx-auto w-fit z-40 animate-pulse">
            <div className="bg-red-600/90 border border-red-400 text-white font-mono font-black text-sm px-4 py-1.5 rounded-full backdrop-blur-md shadow-2xl flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white animate-ping" />
              <span>GRAVANDO: {formatTimer(recordingSeconds)} / 00:30</span>
            </div>
          </div>
        )}

        {/* Camera Selector Sub-bar */}
        {cameras.length > 0 && !isRecording && (
          <div className="absolute top-16 inset-x-0 mx-auto w-11/12 max-w-sm z-30 flex justify-center">
            <div className="bg-black/75 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-md shadow-2xl flex items-center gap-2 w-full max-w-xs">
              <span className="text-[10px] font-black uppercase text-blue-400 shrink-0 flex items-center gap-1">
                📷 Câmera:
              </span>
              <select
                value={selectedCameraId || ''}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer w-full truncate border-none focus:ring-0"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId} className="bg-slate-900 text-white font-sans text-xs">
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Viewfinder Video Area */}
        <div 
          onClick={handleViewfinderClick}
          className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden cursor-crosshair"
          title="Toque na tela para focar"
        >
          {/* Shutter Flash Effect */}
          <div 
            className={`absolute inset-0 bg-white pointer-events-none z-40 transition-opacity duration-150 ${
              isFlashing ? 'opacity-90' : 'opacity-0'
            }`} 
          />

          {/* Tap-to-Focus Reticle */}
          {focusAnimation && (
            <div 
              style={{ left: `${focusAnimation.x - 32}px`, top: `${focusAnimation.y - 32}px` }}
              className="absolute w-16 h-16 border-2 border-amber-400 rounded-2xl pointer-events-none z-30 animate-ping duration-700 shadow-lg shadow-amber-400/50"
            />
          )}

          {/* Rule of Thirds Grid */}
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

          {/* Center Focus Frame */}
          <div className="absolute w-44 h-44 sm:w-52 sm:h-52 border border-white/30 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
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
                  Câmera Indisponível
                </h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {cameraError}
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 pt-2">
                <button 
                  type="button"
                  onClick={handleNativeCamera}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Smartphone size={16} /> Usar Câmera do Celular
                </button>
                <button 
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ImageIcon size={16} /> Selecionar das Mídias
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

        {/* Bottom Control Dock */}
        <div className="relative z-30 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-around gap-4">
          {/* Gallery Picker */}
          <button 
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isRecording}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-all active:scale-90 w-16 disabled:opacity-30 cursor-pointer"
            title="Escolher Mídia da Galeria"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-slate-200 shadow-md">
              <ImageIcon size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
              Mídias
            </span>
          </button>

          {/* Center Action Button (Foto vs Gravar Vídeo) */}
          {captureMode === 'PHOTO' ? (
            <button 
              type="button"
              onClick={capturePhoto}
              disabled={isLoading && !cameraError}
              className="relative group p-1 active:scale-90 transition-transform disabled:opacity-50 cursor-pointer"
              title="Tirar Foto"
            >
              <div className="w-20 h-20 rounded-full border-4 border-white/90 p-1 flex items-center justify-center transition-all group-hover:border-white group-hover:scale-105 shadow-2xl shadow-black/80">
                <div className="w-full h-full rounded-full bg-white group-active:bg-slate-200 transition-colors shadow-inner flex items-center justify-center">
                  <CameraIcon size={26} className="text-slate-950" />
                </div>
              </div>
            </button>
          ) : (
            <button 
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading && !cameraError}
              className="relative group p-1 active:scale-90 transition-transform disabled:opacity-50 cursor-pointer"
              title={isRecording ? "Parar Gravação" : "Iniciar Gravação de Vídeo"}
            >
              <div className={`w-20 h-20 rounded-full border-4 p-1 flex items-center justify-center transition-all shadow-2xl ${
                isRecording ? 'border-red-500 animate-pulse' : 'border-red-600/90 group-hover:border-red-500'
              }`}>
                <div className={`w-full h-full rounded-full transition-all flex items-center justify-center ${
                  isRecording ? 'bg-red-600 rounded-2xl scale-75' : 'bg-red-600 group-active:bg-red-700'
                }`}>
                  {isRecording ? (
                    <Square size={20} className="text-white fill-white" />
                  ) : (
                    <VideoIcon size={26} className="text-white" />
                  )}
                </div>
              </div>
            </button>
          )}

          {/* Native Camera Option */}
          <button
            type="button"
            onClick={handleNativeCamera}
            disabled={isRecording}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-all active:scale-90 w-20 disabled:opacity-30 cursor-pointer"
            title="Câmera do Dispositivo"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 backdrop-blur-md flex items-center justify-center text-emerald-300 shadow-md">
              <Smartphone size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 text-center leading-tight">
              Câmera
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
