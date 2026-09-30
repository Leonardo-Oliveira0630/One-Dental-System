import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { UserRole, PermissionKey } from '../../types';
import { 
  Tv, X, Check, Sliders, Layers, Plus, Trash2, Eye, 
  Settings, Play, Save, RotateCcw, MonitorPlay, Sparkles,
  LayoutGrid, Columns, Rows, ArrowRight, ShieldCheck
} from 'lucide-react';
import { 
  MonitoringTabKey, ScreenPanelConfig, TAB_INFO 
} from './MonitoringWidgets';

export type ScreenLayoutType = 
  | '1-screen'
  | '2-cols' 
  | '2-rows'
  | '3-cols'
  | '3-left-main'
  | '3-top-main'
  | '4-grid'
  | '4-cols'
  | '4-left-main';

export interface MonitoringPreset {
  id: string;
  name: string;
  screensCount: 1 | 2 | 3 | 4;
  layout: ScreenLayoutType;
  panels: ScreenPanelConfig[];
}

export const DEFAULT_PRESETS: MonitoringPreset[] = [
  {
    id: 'default-4-grid',
    name: 'Central de Operações (4 Telas)',
    screensCount: 4,
    layout: '4-grid',
    panels: [
      { id: 'p1', tab: 'vip', titleCustom: 'Produção VIP & Prometidos', showBox: true, showPatient: true, showDentist: true, showDueDate: true },
      { id: 'p2', tab: 'jobs', titleCustom: 'Trabalhos em Andamento', statusFilter: 'ALL', showBox: true, showPatient: true, showDueDate: true, showSector: true },
      { id: 'p3', tab: 'kanban', titleCustom: 'Kanban por Setor' },
      { id: 'p4', tab: 'reports', titleCustom: 'Relatório & Faturamento', showValues: true }
    ]
  },
  {
    id: 'default-2-cols',
    name: 'Monitor Duplo (VIP + Geral)',
    screensCount: 2,
    layout: '2-cols',
    panels: [
      { id: 'p1', tab: 'vip', titleCustom: 'Produção VIP & Críticos' },
      { id: 'p2', tab: 'jobs', titleCustom: 'Fila de Casos Ativos' }
    ]
  },
  {
    id: 'default-3-screens',
    name: 'Três Telas (Painel Principal + 2)',
    screensCount: 3,
    layout: '3-left-main',
    panels: [
      { id: 'p1', tab: 'jobs', titleCustom: 'Visão Geral da Produção' },
      { id: 'p2', tab: 'vip', titleCustom: 'Casos VIP' },
      { id: 'p3', tab: 'dashboard', titleCustom: 'Indicadores do Dia' }
    ]
  },
  {
    id: 'default-1-screen',
    name: 'Tela Única (Kanban Completo)',
    screensCount: 1,
    layout: '1-screen',
    panels: [
      { id: 'p1', tab: 'kanban', titleCustom: 'Fluxo Geral de Produção' }
    ]
  }
];

interface MonitoringConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (preset: MonitoringPreset) => void;
  currentPreset?: MonitoringPreset;
}

export const MonitoringConfigModal: React.FC<MonitoringConfigModalProps> = ({
  isOpen,
  onClose,
  onLaunch,
  currentPreset
}) => {
  const { t } = useTranslation();
  const { currentUser, sectors } = useApp();

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;

  // Filter allowed tabs based on user permissions
  const allowedTabs = useMemo(() => {
    return (Object.keys(TAB_INFO) as MonitoringTabKey[]).filter(key => {
      if (isAdmin || isManager) return true;
      const perm = TAB_INFO[key].requiredPerm;
      if (!perm) return true;
      return (currentUser?.permissions || []).includes(perm as PermissionKey);
    });
  }, [currentUser, isAdmin, isManager]);

  // Local storage for custom user presets
  const [savedPresets, setSavedPresets] = useState<MonitoringPreset[]>(() => {
    try {
      const stored = localStorage.getItem('labprox_monitoring_presets');
      return stored ? JSON.parse(stored) : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  });

  // Active configuration state
  const [screensCount, setScreensCount] = useState<1 | 2 | 3 | 4>(currentPreset?.screensCount || 4);
  const [selectedLayout, setSelectedLayout] = useState<ScreenLayoutType>(currentPreset?.layout || '4-grid');
  const [presetName, setPresetName] = useState(currentPreset?.name || 'Meu Painel Personalizado');

  // Panels configuration
  const [panels, setPanels] = useState<ScreenPanelConfig[]>(() => {
    if (currentPreset?.panels && currentPreset.panels.length > 0) {
      return currentPreset.panels;
    }
    return [
      { id: 'p1', tab: allowedTabs[0] || 'jobs', showBox: true, showPatient: true, showDentist: true, showDueDate: true, showSector: true },
      { id: 'p2', tab: allowedTabs[1] || 'vip', showBox: true, showPatient: true, showDentist: true, showDueDate: true },
      { id: 'p3', tab: allowedTabs[2] || 'kanban', showBox: true, showPatient: true },
      { id: 'p4', tab: allowedTabs[3] || 'reports', showValues: true }
    ];
  });

  const [activePanelEditIdx, setActivePanelEditIdx] = useState<number>(0);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Sync panels count when screensCount changes
  const handleScreensCountChange = (count: 1 | 2 | 3 | 4) => {
    setScreensCount(count);
    let defaultLayout: ScreenLayoutType = '1-screen';
    if (count === 2) defaultLayout = '2-cols';
    if (count === 3) defaultLayout = '3-left-main';
    if (count === 4) defaultLayout = '4-grid';
    setSelectedLayout(defaultLayout);

    setPanels(prev => {
      const updated = [...prev];
      while (updated.length < count) {
        const nextTab = allowedTabs[updated.length % allowedTabs.length] || 'jobs';
        updated.push({
          id: `p${updated.length + 1}`,
          tab: nextTab,
          showBox: true,
          showPatient: true,
          showDentist: true,
          showDueDate: true,
          showSector: true
        });
      }
      return updated.slice(0, count);
    });

    if (activePanelEditIdx >= count) {
      setActivePanelEditIdx(0);
    }
  };

  // Update specific panel properties
  const updatePanel = (index: number, updates: Partial<ScreenPanelConfig>) => {
    setPanels(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Load a preset
  const handleLoadPreset = (preset: MonitoringPreset) => {
    setPresetName(preset.name);
    setScreensCount(preset.screensCount);
    setSelectedLayout(preset.layout);
    setPanels(preset.panels);
    setActivePanelEditIdx(0);
  };

  // Save current preset
  const handleSavePreset = () => {
    const newPreset: MonitoringPreset = {
      id: `preset_${Date.now()}`,
      name: presetName.trim() || 'Painel de Monitoramento',
      screensCount,
      layout: selectedLayout,
      panels: panels.slice(0, screensCount)
    };

    const updatedList = [...savedPresets.filter(p => p.id !== newPreset.id), newPreset];
    setSavedPresets(updatedList);
    try {
      localStorage.setItem('labprox_monitoring_presets', JSON.stringify(updatedList));
    } catch {}
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  // Launch Fullscreen TV Mode
  const handleStartMonitoring = () => {
    const finalPreset: MonitoringPreset = {
      id: 'active-session',
      name: presetName,
      screensCount,
      layout: selectedLayout,
      panels: panels.slice(0, screensCount)
    };

    onLaunch(finalPreset);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-500/30">
              <Tv size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Tela de Visualização Multitelas (Modo TV & Monitor)
              </h3>
              <p className="text-xs text-slate-400">
                Divida sua tela de 1 a 4 partes em tempo real e personalize a visualização para sua central de operações.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* STEP 1: QUANTIDADE DE TELAS */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <LayoutGrid size={14} className="text-teal-400" />
              1. Quantidade de Telas no Grid (1 a 4 Divisões)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {[1, 2, 3, 4].map(count => {
                const isSelected = screensCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleScreensCountChange(count as 1 | 2 | 3 | 4)}
                    className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500 text-white shadow-lg shadow-teal-500/10'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xl font-black">{count} {count === 1 ? 'Tela' : 'Telas'}</span>
                    <span className="text-[10px] text-slate-400">
                      {count === 1 ? 'Visão Única 100%' : count === 2 ? 'Divisão Dupla' : count === 3 ? 'Três Telas' : 'Grid 4 Quadrantes'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: LAYOUT / PROPORÇÃO */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Columns size={14} className="text-teal-400" />
              2. Disposição e Proporção do Grid
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
              {screensCount === 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedLayout('1-screen')}
                  className={`p-3 rounded-xl border text-xs font-bold text-center ${
                    selectedLayout === '1-screen' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  Tela Cheia Única (100%)
                </button>
              )}

              {screensCount === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('2-cols')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '2-cols' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    2 Colunas Verticais (50% / 50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('2-rows')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '2-rows' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    2 Linhas Horizontais (50% / 50%)
                  </button>
                </>
              )}

              {screensCount === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('3-left-main')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '3-left-main' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    1 Principal Esquerda + 2 Direita
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('3-cols')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '3-cols' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    3 Colunas Iguais (33% cada)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('3-top-main')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '3-top-main' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    1 Topo Largo + 2 Embaixo
                  </button>
                </>
              )}

              {screensCount === 4 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('4-grid')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '4-grid' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    Grid 2x2 (4 Quadrantes Perfeitos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('4-cols')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '4-cols' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    4 Colunas Verticais
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('4-left-main')}
                    className={`p-3 rounded-xl border text-xs font-bold text-center ${
                      selectedLayout === '4-left-main' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    1 Principal Larga + 3 Laterais
                  </button>
                </>
              )}
            </div>
          </div>

          {/* STEP 3: CONFIGURAR CONTEÚDO E CAMPOS DE CADA TELA */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders size={14} className="text-teal-400" />
              3. Configurar Conteúdo e Filtros de Cada Painel
            </label>

            {/* Panel Selector Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              {Array.from({ length: screensCount }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePanelEditIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activePanelEditIdx === idx
                      ? 'bg-slate-800 text-teal-400 border border-teal-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  Painel {idx + 1}: {TAB_INFO[panels[idx]?.tab]?.label || 'Configurar'}
                </button>
              ))}
            </div>

            {/* Active Panel Config Box */}
            {panels[activePanelEditIdx] && (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TAB SELECTOR */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Aba Exibida no Painel {activePanelEditIdx + 1}
                    </label>
                    <select
                      value={panels[activePanelEditIdx].tab}
                      onChange={e => updatePanel(activePanelEditIdx, { tab: e.target.value as MonitoringTabKey })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      {allowedTabs.map(tabKey => (
                        <option key={tabKey} value={tabKey}>
                          {TAB_INFO[tabKey].label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {TAB_INFO[panels[activePanelEditIdx].tab]?.desc}
                    </p>
                  </div>

                  {/* CUSTOM TITLE */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Título Personalizado do Painel (Opcional)
                    </label>
                    <input
                      type="text"
                      value={panels[activePanelEditIdx].titleCustom || ''}
                      onChange={e => updatePanel(activePanelEditIdx, { titleCustom: e.target.value })}
                      placeholder={`Ex: ${TAB_INFO[panels[activePanelEditIdx].tab]?.label}`}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* FILTROS ADICIONAIS SE FOR TRABALHOS OU VIP */}
                {(panels[activePanelEditIdx].tab === 'jobs' || panels[activePanelEditIdx].tab === 'calendar') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Filtro de Status
                      </label>
                      <select
                        value={panels[activePanelEditIdx].statusFilter || 'ALL'}
                        onChange={e => updatePanel(activePanelEditIdx, { statusFilter: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-300"
                      >
                        <option value="ALL">Todos os Status</option>
                        <option value="PENDING">Apenas Pendentes</option>
                        <option value="IN_PROGRESS">Apenas Em Produção</option>
                        <option value="DELAYED">Apenas Casos Atrasados</option>
                        <option value="TODAY">Apenas Entrega Hoje</option>
                        <option value="COMPLETED">Apenas Finalizados</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Filtro de Setor
                      </label>
                      <select
                        value={panels[activePanelEditIdx].sectorFilter || 'ALL'}
                        onChange={e => updatePanel(activePanelEditIdx, { sectorFilter: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-300"
                      >
                        <option value="ALL">Todos os Setores</option>
                        {sectors.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Filtro de Urgência
                      </label>
                      <select
                        value={panels[activePanelEditIdx].urgencyFilter || 'ALL'}
                        onChange={e => updatePanel(activePanelEditIdx, { urgencyFilter: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-300"
                      >
                        <option value="ALL">Todas as Urgências</option>
                        <option value="VIP_ONLY">Apenas VIP / Urgentes</option>
                        <option value="NORMAL">Apenas Normais</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* VISIBLE FIELDS CHECKBOXES */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
                    Campos Visíveis no Card deste Painel:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={panels[activePanelEditIdx].showBox !== false}
                        onChange={e => updatePanel(activePanelEditIdx, { showBox: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span>Número da Caixa</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={panels[activePanelEditIdx].showPatient !== false}
                        onChange={e => updatePanel(activePanelEditIdx, { showPatient: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span>Nome do Paciente</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={panels[activePanelEditIdx].showDentist !== false}
                        onChange={e => updatePanel(activePanelEditIdx, { showDentist: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span>Dentista / Clínica</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={panels[activePanelEditIdx].showDueDate !== false}
                        onChange={e => updatePanel(activePanelEditIdx, { showDueDate: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span>Prazo / Vencimento</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={panels[activePanelEditIdx].showSector !== false}
                        onChange={e => updatePanel(activePanelEditIdx, { showSector: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span>Setor Atual</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={panels[activePanelEditIdx].showServices !== false}
                        onChange={e => updatePanel(activePanelEditIdx, { showServices: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span>Serviços / Itens</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!panels[activePanelEditIdx].showValues}
                        onChange={e => updatePanel(activePanelEditIdx, { showValues: e.target.checked })}
                        className="rounded border-slate-700 text-teal-500 focus:ring-0"
                      />
                      <span>Valores em R$</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: PRESETS RÁPIDOS */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">
              Modelos Prontos de Visualização:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {savedPresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className="p-2.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-bold text-slate-200 truncate">{preset.name}</span>
                  <span className="text-[10px] font-black bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                    {preset.screensCount}T
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSavePreset}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>Salvar como Modelo</span>
            </button>
            {showSaveSuccess && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30 animate-in fade-in">
                ✓ Modelo salvo com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-400 hover:text-white text-xs font-bold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleStartMonitoring}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <MonitorPlay size={18} />
              <span>INICIAR TELA DE VISUALIZAÇÃO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
