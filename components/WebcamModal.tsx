import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Loader2, SwitchCamera } from 'lucide-react';
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

  useEffect(() => {
    const fetchCameras = async () => {
      const availableCameras = await getAvailableCameras();
      setCameras(availableCameras);
      if (availableCameras.length > 0 && !selectedCameraId) {
        setSelectedCameraId(getSmartCameraSelection(availableCameras) || availableCameras[0].deviceId);
      }
    };
    fetchCameras();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    const startCamera = async () => {
      if (!selectedCameraId) return;
      setIsLoading(true);

      try {
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (isMounted) setIsLoading(false);
          };
        }
      } catch (err) {
        console.error("Failed to start camera", err);
        if (isMounted) setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current?.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [selectedCameraId]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
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
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-contain"
            />
        </div>

        {/* Controls */}
        <div className="p-6 bg-black flex justify-center items-center">
            <button 
                onClick={capturePhoto}
                disabled={isLoading}
                className="w-20 h-20 rounded-full bg-white/20 border-4 border-white flex items-center justify-center hover:bg-white/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                    <Camera size={32} className="text-black" />
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};
