
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detecta iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    // Detecta Android (Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) setShowPrompt(true);
    });

    // Se já estiver instalado ou em standalone, não mostra
    if (isStandalone) setShowPrompt(false);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-2xl border border-white/10 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2">
            <button onClick={() => setShowPrompt(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                <Smartphone size={32} />
            </div>
            <div>
                <h3 className="font-bold text-lg leading-tight">Instale o My Tooth</h3>
                <p className="text-xs text-slate-400">Tenha uma experiência nativa e mais rápida em seu celular.</p>
            </div>
        </div>

        {isIOS ? (
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                <p className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                    <Share size={12} className="text-blue-400" /> Como Instalar no iPhone:
                </p>
                <ol className="text-xs text-slate-400 space-y-1 pl-1">
                    <li>1. Toque no ícone de <span className="text-white font-bold inline-flex items-center gap-1">Compartilhar <Share size={10}/></span> abaixo.</li>
                    <li>2. Role e selecione <span className="text-white font-bold inline-flex items-center gap-1">Adicionar à Tela de Início <Plus size={10}/></span>.</li>
                </ol>
            </div>
        ) : (
            <button 
                onClick={handleInstallClick}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
                <Download size={20} /> ADICIONAR À TELA INICIAL
            </button>
        )}
      </div>
    </div>
  );
};
