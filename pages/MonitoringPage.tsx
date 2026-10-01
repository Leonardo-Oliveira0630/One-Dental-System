import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { 
  Tv, Maximize2, Settings, Sparkles, Clock, 
  LayoutGrid, Columns, Rows, Plus, RefreshCw, Check, MonitorPlay
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonitoringViewModal } from '../components/monitoring/MonitoringViewModal';
import { 
  MonitoringConfigModal, DEFAULT_PRESETS, MonitoringPreset, ScreenLayoutType 
} from '../components/monitoring/MonitoringConfigModal';
import { 
  MonitorPanelRenderer, TAB_INFO, MonitoringTabKey 
} from '../components/monitoring/MonitoringWidgets';

export const MonitoringPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrg, currentUser } = useApp();

  // Active preset state
  const [activePreset, setActivePreset] = useState<MonitoringPreset>(() => {
    try {
      const stored = localStorage.getItem('labprox_monitoring_active_preset');
      return stored ? JSON.parse(stored) : DEFAULT_PRESETS[0];
    } catch {
      return DEFAULT_PRESETS[0];
    }
  });

  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save active preset to localStorage
  const handleSelectPreset = (preset: MonitoringPreset) => {
    setActivePreset(preset);
    try {
      localStorage.setItem('labprox_monitoring_active_preset', JSON.stringify(preset));
    } catch {}
  };

  // Change number of screens quickly
  const handleScreensCountChange = (count: 1 | 2 | 3 | 4) => {
    let layout: ScreenLayoutType = '1-screen';
    if (count === 2) layout = '2-cols';
    if (count === 3) layout = '3-left-main';
    if (count === 4) layout = '4-grid';

    const currentPanels = [...activePreset.panels];
    const availableTabs: MonitoringTabKey[] = ['jobs', 'vip', 'kanban', 'reports', 'calendar', 'dashboard'];
    while (currentPanels.length < count) {
      currentPanels.push({
        id: `p${currentPanels.length + 1}`,
        tab: availableTabs[currentPanels.length % availableTabs.length],
        showBox: true,
        showPatient: true,
        showDentist: true,
        showDueDate: true,
        showSector: true
      });
    }

    const updated: MonitoringPreset = {
      ...activePreset,
      screensCount: count,
      layout,
      panels: currentPanels.slice(0, count)
    };
    handleSelectPreset(updated);
  };

  // Quick switch tab on a specific panel
  const handlePanelTabChange = (panelIndex: number, newTab: MonitoringTabKey) => {
    const updatedPanels = [...activePreset.panels];
    if (updatedPanels[panelIndex]) {
      updatedPanels[panelIndex] = {
        ...updatedPanels[panelIndex],
        tab: newTab
      };
      const updatedPreset = { ...activePreset, panels: updatedPanels };
      handleSelectPreset(updatedPreset);
    }
  };

  // Calculate grid layout CSS classes
  const getGridClasses = () => {
    const { layout, screensCount } = activePreset;
    if (screensCount === 1 || layout === '1-screen') {
      return 'grid grid-cols-1 grid-rows-1';
    }
    if (screensCount === 2) {
      if (layout === '2-rows') return 'grid grid-cols-1 grid-rows-2';
      return 'grid grid-cols-1 lg:grid-cols-2 grid-rows-1';
    }
    if (screensCount === 3) {
      if (layout === '3-cols') return 'grid grid-cols-1 lg:grid-cols-3';
      if (layout === '3-top-main') return 'grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2';
      return 'grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2';
    }
    if (screensCount === 4) {
      if (layout === '4-cols') return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      if (layout === '4-left-main') return 'grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-3';
      return 'grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2';
    }
    return 'grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2';
  };

  const getPanelSpanClass = (index: number) => {
    const { layout, screensCount } = activePreset;
    if (screensCount === 3) {
      if (layout === '3-left-main' && index === 0) return 'lg:col-span-2 lg:row-span-2';
      if (layout === '3-top-main' && index === 0) return 'lg:col-span-2 lg:row-span-1';
    }
    if (screensCount === 4 && layout === '4-left-main' && index === 0) {
      return 'lg:col-span-2 lg:row-span-3';
    }
    return '';
  };

  const activePanels = activePreset.panels.slice(0, activePreset.screensCount);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#0B0F17] text-slate-100 -mt-6 sm:-mt-8 -mx-4 sm:-mx-8 p-3 sm:p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col gap-4 animate-in fade-in duration-200">
      
      {/* ------------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS (ALWAYS IN SLEEK DARK THEME) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        
        {/* LEFT: TITLE & REAL-TIME CLOCK */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-2.5 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 text-teal-400 rounded-2xl border border-teal-500/30 shadow-md shrink-0">
            <Tv size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                Tela de Visualização Multitelas
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Central de operações e monitoramento de abas para {currentOrg?.name || 'Labprox'}.
            </p>
          </div>
        </div>

        {/* CLOCK & DATE */}
        <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-slate-300">
          <Clock size={15} className="text-teal-400" />
          <span className="text-white text-sm font-black">{format(currentTime, 'HH:mm:ss')}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 capitalize">{format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
        </div>

        {/* RIGHT: MAIN ACTION BUTTONS */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end flex-wrap">
          {/* QUICK SCREEN COUNT BUTTONS */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleScreensCountChange(num as 1 | 2 | 3 | 4)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activePreset.screensCount === num
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {num} {num === 1 ? 'Tela' : 'Telas'}
              </button>
            ))}
          </div>

          {/* CONFIGURE MODAL BUTTON */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Settings size={15} className="text-teal-400" />
            <span>Configurar Grid</span>
          </button>

          {/* LAUNCH FULLSCREEN TV MODE */}
          <button
            type="button"
            onClick={() => setIsFullscreenActive(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <MonitorPlay size={17} />
            <span>MODO TV (TELA CHEIA)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* QUICK PRESET BAR */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Modelos Rápidos:
        </span>
        {DEFAULT_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activePreset.id === preset.id
                ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm shadow-teal-500/10'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>{preset.name}</span>
            <span className="text-[10px] font-black bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
              {preset.screensCount}T
            </span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* REAL-TIME INTERACTIVE GRID (EMBEDDED IN DARK PAGE) */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 w-full min-h-[620px] rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 p-2.5 sm:p-3 shadow-inner">
        <div className={`w-full h-full min-h-[600px] gap-3 ${getGridClasses()}`}>
          {activePanels.map((panel, idx) => (
            <div 
              key={panel.id || idx} 
              className={`w-full h-full min-h-[290px] overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900 shadow-xl flex flex-col ${getPanelSpanClass(idx)}`}
            >
              {/* PANEL HEADER WITH QUICK TAB SELECTOR */}
              <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 font-black text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <select
                    value={panel.tab}
                    onChange={(e) => handlePanelTabChange(idx, e.target.value as MonitoringTabKey)}
                    className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer truncate"
                  >
                    {Object.keys(TAB_INFO).map((k) => (
                      <option key={k} value={k}>
                        {TAB_INFO[k as MonitoringTabKey].label}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">
                  Painel {idx + 1} de {activePreset.screensCount}
                </span>
              </div>

              {/* PANEL BODY CONTENT */}
              <div className="flex-1 overflow-hidden">
                <MonitorPanelRenderer config={panel} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* FULLSCREEN TV MODE MODAL OVERLAY */}
      {/* ------------------------------------------------------------------- */}
      {isFullscreenActive && (
        <MonitoringViewModal
          isOpen={isFullscreenActive}
          onClose={() => setIsFullscreenActive(false)}
          initialPreset={activePreset}
        />
      )}

      {/* ------------------------------------------------------------------- */}
      {/* CONFIGURATION MODAL */}
      {/* ------------------------------------------------------------------- */}
      {isConfigModalOpen && (
        <MonitoringConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          currentPreset={activePreset}
          onLaunch={(newPreset) => {
            handleSelectPreset(newPreset);
            setIsConfigModalOpen(false);
            setIsFullscreenActive(true);
          }}
        />
      )}
    </div>
  );
};

export default MonitoringPage;
