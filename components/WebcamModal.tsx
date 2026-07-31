import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Check, RefreshCcw } from 'lucide-react';

interface WebcamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (base64Image: string) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ isOpen, onClose, onCapture }) => {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setImgSrc(imageSrc);
        }
    }, [webcamRef, setImgSrc]);

    const handleConfirm = () => {
        if (imgSrc) {
            onCapture(imgSrc);
            onClose();
            setImgSrc(null);
        }
    };

    const handleRetake = () => {
        setImgSrc(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                <div className="p-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                        <Camera size={20} className="text-blue-600" /> Tirar Foto
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 bg-slate-900 relative flex items-center justify-center min-h-[400px]">
                    {imgSrc ? (
                        <img src={imgSrc} alt="Captured" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={1.0}
                            className="w-full h-full object-cover"
                            videoConstraints={{ 
                                width: { ideal: 3840 }, 
                                height: { ideal: 2160 } 
                            }}
                        />
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-center gap-4">
                    {imgSrc ? (
                        <>
                            <button
                                onClick={handleRetake}
                                className="px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all flex items-center gap-2"
                            >
                                <RefreshCcw size={18} /> Repetir
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                            >
                                <Check size={18} /> Confirmar
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={capture}
                            className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all ring-4 ring-blue-100"
                        >
                            <Camera size={28} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
