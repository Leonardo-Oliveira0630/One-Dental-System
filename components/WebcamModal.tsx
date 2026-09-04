import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera as CameraIcon, X, Loader2, SwitchCamera, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraDevice, getAvailableCameras, getSmartCameraSelection } from '../utils/cameraUtils';

interface WebcamModalProps {
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
          // No enumerated devices found, still trigger default camera stream
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
          console.warn("Attempt 1 getUserMedia failed, trying fallback constraints...", e1);
          // Attempt 2: generic environment camera
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' } }
            });
          } catch (e2) {
            console.warn("Attempt 2 getUserMedia failed, trying basic video...", e2);
            // Attempt 3: plain video
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
          setCameraError(err.message || 'Não foi possível acessar a câmera');
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

  const handleNativeCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `capture-${Date.now()}.${photo.format || 'jpg'}`, { type: `image/${photo.format || 'jpeg'}` });
        onCapture(file);
      }
    } catch (err: any) {
      if (!err.message?.includes('User cancelled')) {
        console.error("Native camera error:", err);
      }
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // If video width is 0, fall back to native camera if available
    if (video.videoWidth === 0 && Capacitor.isNativePlatform()) {
      handleNativeCamera();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${new Date().getTime()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.9);
  }, [onCapture]);

  const cycleCamera = () => {
    if (cameras.length > 1 && selectedCameraId) {
        const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        setSelectedCameraId(cameras[nextIndex].deviceId);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
            {cameras.length > 1 && (
                <button onClick={cycleCamera} className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-colors">
                    <SwitchCamera size={24} />
                </button>
            )}
            <button onClick={onClose} className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-colors ml-auto">
                <X size={24} />
            </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-[4/3] sm:aspect-video w-full bg-slate-900 flex items-center justify-center">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-10">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <span className="text-sm font-bold">Iniciando câmera...</span>
                </div>
            )}
            {cameraError && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white z-10 space-y-3">
                    <AlertCircle className="text-amber-400" size={40} />
                    <p className="text-sm font-bold text-slate-200">{cameraError}</p>
                    {Capacitor.isNativePlatform() && (
                      <button 
                        onClick={handleNativeCamera}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg"
                      >
                        Abrir Câmera Nativa do Aparelho
                      </button>
                    )}
                </div>
            )}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-contain"
            />
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-6 bg-black flex justify-center items-center gap-4">
            <button 
                onClick={capturePhoto}
                disabled={isLoading && !cameraError}
                className="w-20 h-20 rounded-full bg-white/20 border-4 border-white flex items-center justify-center hover:bg-white/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                title="Tirar Foto"
            >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                    <CameraIcon size={32} className="text-black" />
                </div>
            </button>
            {Capacitor.isNativePlatform() && (
              <button
                onClick={handleNativeCamera}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-xs font-black uppercase tracking-wider backdrop-blur-md transition-all flex items-center gap-2"
              >
                <CameraIcon size={16} />
                Câmera Nativa
              </button>
            )}
        </div>
      </div>
    </div>
  );
};
