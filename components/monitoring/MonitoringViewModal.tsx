import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { 
  X, Maximize2, Minimize2, Settings, Tv, Clock, 
  Sparkles, RefreshCw, LayoutGrid, Layers, Crown, 
  Activity, ShieldCheck, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MonitoringPreset, DEFAULT_PRESETS, MonitoringConfigModal 
} from './MonitoringConfigModal';
import { MonitorPanelRenderer } from './MonitoringWidgets';

interface MonitoringViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreset?: MonitoringPreset;
}

export const MonitoringViewModal: React.FC<MonitoringViewModalProps> = ({
  isOpen,
  onClose,
  initialPreset
}) => {
  const { currentOrg } = useApp();
  const [currentPreset, setCurrentPreset] = useState<MonitoringPreset>(
    initialPreset || DEFAULT_PRESETS[0]
  );

  // When initialPreset prop changes, update state
  useEffect(() => {
    if (initialPreset) {
      setCurrentPreset(initialPreset);
    }
  }, [initialPreset]);

  // Real-time digital clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Smart Auto-Hide Top Controls on Mouse Inactivity
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleMouseMove);
    window.addEventListener('keydown', handleMouseMove);

    // Initial timer
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      window.removeEventListener('keydown', handleMouseMove);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isOpen, handleMouseMove]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Config modal state inside monitor mode
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  if (!isOpen) return null;

  // Compute CSS grid classes based on layout
  const getGridClasses = () => {
    const { layout, screensCount } = currentPreset;

    if (screensCount === 1 || layout === '1-screen') {
      return 'grid grid-cols-1 grid-rows-1';
    }

    if (screensCount === 2) {
      if (layout === '2-rows') return 'grid grid-cols-1 grid-rows-2';
      return 'grid grid-cols-1 md:grid-cols-2 grid-rows-1';
    }

    if (screensCount === 3) {
      if (layout === '3-cols') return 'grid grid-cols-1 md:grid-cols-3';
      if (layout === '3-top-main') return 'grid grid-cols-1 md:grid-cols-2 grid-rows-2';
      // 3-left-main default
      return 'grid grid-cols-1 md:grid-cols-3 grid-rows-2';
    }

    if (screensCount === 4) {
      if (layout === '4-cols') return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      if (layout === '4-left-main') return 'grid grid-cols-1 md:grid-cols-3 grid-rows-3';
      // 4-grid (2x2) default
      return 'grid grid-cols-1 md:grid-cols-2 grid-rows-2';
    }

    return 'grid grid-cols-1 md:grid-cols-2 grid-rows-2';
  };

  // Compute individual panel grid spans
  const getPanelSpanClass = (index: number) => {
    const { layout, screensCount } = currentPreset;

    if (screensCount === 3) {
      if (layout === '3-left-main') {
        // First panel takes 2 columns width and 2 rows height
        if (index === 0) return 'md:col-span-2 md:row-span-2';
        return 'md:col-span-1 md:row-span-1';
      }
      if (layout === '3-top-main') {
        // First panel takes full top row
        if (index === 0) return 'md:col-span-2 md:row-span-1';
        return 'md:col-span-1 md:row-span-1';
      }
    }

    if (screensCount === 4 && layout === '4-left-main') {
      if (index === 0) return 'md:col-span-2 md:row-span-3';
      return 'md:col-span-1 md:row-span-1';
    }

    return '';
  };

  const activePanels = currentPreset.panels.slice(0, currentPreset.screensCount);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-[99999] bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans ${
        !showControls ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* ------------------------------------------------------------------- */}
      {/* FLOATING TOPBAR CONTROLS (AUTO-HIDES ON MOUSE INACTIVITY) */}
      {/* ------------------------------------------------------------------- */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent backdrop-blur-sm transition-all duration-300 flex items-center justify-between gap-4 ${
          showControls 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        {/* LEFT: ORG BRAND & LIVE CLOCK */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-md">
            <Tv size={18} className="text-teal-400 animate-pulse" />
            <span className="font-black text-xs sm:text-sm tracking-tight text-white uppercase truncate">
              {currentOrg?.name || 'Labprox'} • Visualização
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-slate-300">
            <Clock size={14} className="text-teal-400" />
            <span>{format(currentTime, 'HH:mm:ss')}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 capitalize">{format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] font-black text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>TEMPO REAL</span>
          </div>
        </div>

        {/* RIGHT: ACTIONS & CLOSE BUTTON */}
        <div className="flex items-center gap-2 shrink-0">
          {/* QUICK SCREEN COUNT SWITCHER */}
          <div className="hidden lg:flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  let l: any = '1-screen';
                  if (num === 2) l = '2-cols';
                  if (num === 3) l = '3-left-main';
                  if (num === 4) l = '4-grid';
                  setCurrentPreset(prev => ({
                    ...prev,
                    screensCount: num as any,
                    layout: l
                  }));
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  currentPreset.screensCount === num 
                    ? 'bg-teal-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {num}T
              </button>
            ))}
          </div>

          {/* CONFIGURE LAYOUT BUTTON */}
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Configurar Telas e Filtros"
          >
            <Settings size={15} className="text-teal-400" />
            <span className="hidden sm:inline">Configurar Telas</span>
          </button>

          {/* FULLSCREEN TOGGLE */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* BIG CLOSE 'X' BUTTON */}
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            title="Sair da Visualização (ESC)"
          >
            <X size={18} />
            <span className="font-bold">SAIR (ESC)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MAIN MONITORING GRID AREA */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 w-full h-full p-2 sm:p-2.5 overflow-hidden">
        <div className={`w-full h-full gap-2 sm:gap-2.5 ${getGridClasses()}`}>
          {activePanels.map((panel, idx) => (
            <div 
              key={panel.id || idx} 
              className={`w-full h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl flex flex-col ${getPanelSpanClass(idx)}`}
            >
              <MonitorPanelRenderer config={panel} />
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* IN-VIEW CONFIGURATOR MODAL */}
      {/* ------------------------------------------------------------------- */}
      {isConfigOpen && (
        <MonitoringConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          currentPreset={currentPreset}
          onLaunch={(newPreset) => {
            setCurrentPreset(newPreset);
            setIsConfigOpen(false);
          }}
        />
      )}
    </div>
  );
};
