import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { 
  Job, JobStatus, UrgencyLevel, SectorMovement, Sector 
} from '../../types';
import { 
  Clock, AlertTriangle, CheckCircle2, User, Stethoscope, Box, 
  MapPin, Calendar, FileText, TrendingUp, DollarSign, Package, 
  Truck, ArrowRight, Activity, Filter, Eye, Layers, Crown, Sparkles,
  InboxIcon, ClipboardList, Wallet, ShieldAlert, BarChart3, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type MonitoringTabKey = 
  | 'jobs' 
  | 'vip' 
  | 'kanban' 
  | 'calendar' 
  | 'reports' 
  | 'dashboard' 
  | 'logistics' 
  | 'budgets' 
  | 'incoming_orders' 
  | 'incoming_requisitions' 
  | 'finance' 
  | 'inventory';

export interface ScreenPanelConfig {
  id: string;
  tab: MonitoringTabKey;
  titleCustom?: string;
  fontSize?: 'sm' | 'md' | 'lg';
  showBox?: boolean;
  showDentist?: boolean;
  showPatient?: boolean;
  showServices?: boolean;
  showSector?: boolean;
  showDueDate?: boolean;
  showValues?: boolean;
  statusFilter?: string;
  sectorFilter?: string;
  urgencyFilter?: string;
  searchQuery?: string;
}

export const TAB_INFO: Record<MonitoringTabKey, { label: string; icon: React.ReactNode; color: string; desc: string; requiredPerm?: string }> = {
  jobs: {
    label: 'Trabalhos (OS)',
    icon: <FileText size={16} />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    desc: 'Lista de ordens de serviço ativas com prazos e etapas',
    requiredPerm: 'jobs:view'
  },
  vip: {
    label: 'Produção VIP & Prometidos',
    icon: <Crown size={16} />,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    desc: 'Casos urgentes e prometidos divididos por criticidade',
    requiredPerm: 'vip:view'
  },
  kanban: {
    label: 'Kanban de Setores',
    icon: <Layers size={16} />,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    desc: 'Fluxo visual de trabalho em cada setor do laboratório',
    requiredPerm: 'jobs:view'
  },
  calendar: {
    label: 'Calendário de Entregas',
    icon: <Calendar size={16} />,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    desc: 'Visão de prazos e volumes de entrega diários',
    requiredPerm: 'calendar:view'
  },
  reports: {
    label: 'Relatórios & Métricas',
    icon: <BarChart3 size={16} />,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    desc: 'Faturamento, volume de casos e ranking de clientes',
    requiredPerm: 'reports:view'
  },
  dashboard: {
    label: 'Dashboard Executivo',
    icon: <Activity size={16} />,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    desc: 'Visão geral com indicadores-chave em tempo real',
  },
  logistics: {
    label: 'Logística & Entregas',
    icon: <Truck size={16} />,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    desc: 'Rotas do dia, motoristas e entregas programadas',
    requiredPerm: 'logistics:view'
  },
  budgets: {
    label: 'Orçamentos',
    icon: <FileText size={16} />,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    desc: 'Orçamentos pendentes e cotações de clientes',
    requiredPerm: 'budgets:view'
  },
  incoming_orders: {
    label: 'Pedidos Web',
    icon: <InboxIcon size={16} />,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    desc: 'Fila de novos pedidos recebidos pela plataforma',
    requiredPerm: 'catalog:view'
  },
  incoming_requisitions: {
    label: 'Requisições Online',
    icon: <ClipboardList size={16} />,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    desc: 'Requisições enviadas por clínicas e dentistas',
    requiredPerm: 'clients:view'
  },
  finance: {
    label: 'Financeiro do Lab',
    icon: <Wallet size={16} />,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    desc: 'Faturamento, contas a receber e lotes',
    requiredPerm: 'finance:view'
  },
  inventory: {
    label: 'Estoque & Insumos',
    icon: <Package size={16} />,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    desc: 'Itens com estoque baixo e materiais críticos',
    requiredPerm: 'inventory:view'
  }
};

// ---------------------------------------------------------------------------
// 1. JOBS MONITOR WIDGET
// ---------------------------------------------------------------------------
export const JobsMonitorWidget: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  const { jobs, sectors } = useApp();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (j.status === JobStatus.DELIVERED || j.status === JobStatus.CANCELED) return false;
      
      // Status filter
      if (config.statusFilter && config.statusFilter !== 'ALL') {
        if (config.statusFilter === 'DELAYED') {
          const due = new Date(j.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due >= today) return false;
        } else if (config.statusFilter === 'TODAY') {
          const due = new Date(j.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due.getTime() !== today.getTime()) return false;
        } else if (j.status !== config.statusFilter) {
          return false;
        }
      }

      // Sector filter
      if (config.sectorFilter && config.sectorFilter !== 'ALL') {
        if (j.currentSector !== config.sectorFilter && !j.sectorMovements?.some(m => !m.exitTime && m.sector === config.sectorFilter)) {
          return false;
        }
      }

      // Urgency filter
      if (config.urgencyFilter && config.urgencyFilter !== 'ALL') {
        if (config.urgencyFilter === 'VIP_ONLY' && j.urgency !== UrgencyLevel.VIP && j.urgency !== UrgencyLevel.HIGH) {
          return false;
        }
        if (config.urgencyFilter === 'NORMAL' && (j.urgency === UrgencyLevel.VIP || j.urgency === UrgencyLevel.HIGH)) {
          return false;
        }
      }

      // Search Query
      if (config.searchQuery && config.searchQuery.trim()) {
        const q = config.searchQuery.toLowerCase().trim();
        const matches = 
          (j.osNumber || '').toLowerCase().includes(q) ||
          (j.patientName || '').toLowerCase().includes(q) ||
          (j.dentistName || '').toLowerCase().includes(q) ||
          (j.boxNumber || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [jobs, config, today]);

  const textScale = config.fontSize === 'lg' ? 'text-sm' : config.fontSize === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900/90 text-slate-100">
      {/* Widget Header Stats */}
      <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            {config.titleCustom || 'Trabalhos em Produção'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-black border border-blue-500/30">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'caso' : 'casos'}
          </span>
        </div>
      </div>

      {/* Jobs Scroll List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
        {filteredJobs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <CheckCircle2 size={36} className="text-slate-600 mb-2" />
            <p className="font-bold text-sm text-slate-400">Nenhum trabalho pendente</p>
            <p className="text-xs text-slate-600 mt-0.5">Todos os casos estão em dia com os filtros atuais.</p>
          </div>
        ) : (
          filteredJobs.map(job => {
            const dueDateObj = new Date(job.dueDate);
            dueDateObj.setHours(0, 0, 0, 0);
            const isDelayed = dueDateObj < today;
            const isDueToday = dueDateObj.getTime() === today.getTime();
            const isVip = job.urgency === UrgencyLevel.VIP || job.urgency === UrgencyLevel.HIGH;

            return (
              <div 
                key={job.id} 
                className={`p-2.5 rounded-xl border transition-all ${
                  isDelayed 
                    ? 'bg-rose-950/40 border-rose-600/50 hover:border-rose-500' 
                    : isDueToday 
                      ? 'bg-amber-950/40 border-amber-600/50 hover:border-amber-500' 
                      : 'bg-slate-800/70 border-slate-700/60 hover:border-slate-500'
                }`}
              >
                {/* TOP ROW */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-xs text-white bg-slate-700/90 px-2 py-0.5 rounded-md border border-slate-600">
                      OS #{job.osNumber || job.id.slice(-5).toUpperCase()}
                    </span>

                    {config.showBox !== false && job.boxNumber && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-black text-[10px] border border-indigo-500/30 flex items-center gap-1">
                        <Box size={10} /> Cx {job.boxNumber}
                      </span>
                    )}

                    {isVip && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/30 flex items-center gap-0.5">
                        <Crown size={10} /> VIP
                      </span>
                    )}
                  </div>

                  {/* DUE DATE BADGE */}
                  {config.showDueDate !== false && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                      isDelayed 
                        ? 'bg-rose-500 text-white animate-pulse' 
                        : isDueToday 
                          ? 'bg-amber-500 text-slate-950 font-black' 
                          : 'bg-slate-700 text-slate-300'
                    }`}>
                      <Clock size={10} />
                      {isDelayed ? 'ATRASADO' : isDueToday ? 'ENTREGA HOJE' : format(new Date(job.dueDate), 'dd/MM')}
                    </span>
                  )}
                </div>

                {/* PATIENT & DENTIST */}
                <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    {config.showPatient !== false && (
                      <p className={`font-black text-white truncate ${textScale}`}>
                        {job.patientName}
                      </p>
                    )}
                    {config.showDentist !== false && (
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <Stethoscope size={11} className="text-slate-500 shrink-0" />
                        {job.dentistName}
                      </p>
                    )}
                  </div>

                  {/* FINANCIAL VALUE */}
                  {config.showValues && (
                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-400 text-xs">
                        R$ {job.totalValue?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  )}
                </div>

                {/* SERVICES & SECTOR */}
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                  {config.showSector !== false && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <MapPin size={10} className="text-blue-400" />
                      <span className="font-bold text-slate-300">
                        {job.currentSector || 'Recepção'}
                      </span>
                    </div>
                  )}

                  {config.showServices !== false && job.items && job.items.length > 0 && (
                    <div className="text-slate-400 truncate max-w-[200px]">
                      {job.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. VIP & PROMISED MONITOR WIDGET (HOSPITAL / EMERGENCY STYLE)
// ---------------------------------------------------------------------------
export const VipMonitorWidget: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  const { jobs } = useApp();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const vipJobs = useMemo(() => {
    return jobs.filter(j => 
      (j.urgency === UrgencyLevel.VIP || j.urgency === UrgencyLevel.HIGH) &&
      j.status !== JobStatus.COMPLETED &&
      j.status !== JobStatus.DELIVERED &&
      j.status !== JobStatus.CANCELED
    );
  }, [jobs]);

  const groups = useMemo(() => {
    return {
      delayed: vipJobs.filter(j => {
        const d = new Date(j.dueDate);
        d.setHours(0, 0, 0, 0);
        return d < today;
      }),
      today: vipJobs.filter(j => {
        const d = new Date(j.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }),
      tomorrow: vipJobs.filter(j => {
        const d = new Date(j.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === tomorrow.getTime();
      }),
      future: vipJobs.filter(j => {
        const d = new Date(j.dueDate);
        d.setHours(0, 0, 0, 0);
        return d > tomorrow;
      })
    };
  }, [vipJobs, today, tomorrow]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-amber-950/40 border-b border-amber-600/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-amber-400 animate-bounce" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
            {config.titleCustom || 'Casos VIP & Prometidos'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {groups.delayed.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] animate-pulse">
              {groups.delayed.length} Atrasados
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/30">
            {vipJobs.length} Total
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* DELAYED (RED ALERT) */}
        {groups.delayed.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-rose-400 uppercase tracking-wider">
              <AlertTriangle size={14} className="text-rose-500 animate-pulse" />
              <span>Atrasados ({groups.delayed.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {groups.delayed.map(job => (
                <div key={job.id} className="p-3 bg-rose-950/50 border-2 border-rose-500 rounded-xl flex items-center justify-between gap-3 shadow-lg shadow-rose-950/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-white bg-rose-900/80 px-2 py-0.5 rounded">
                        OS #{job.osNumber || job.id.slice(-5)}
                      </span>
                      {job.boxNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-black text-[10px] border border-amber-400/30">
                          Cx {job.boxNumber}
                        </span>
                      )}
                    </div>
                    <p className="font-black text-white text-sm mt-1 truncate">{job.patientName}</p>
                    <p className="text-xs text-rose-200/70 truncate">{job.dentistName} • {job.currentSector || 'Produção'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-black text-rose-300 uppercase block">Venceu em</span>
                    <span className="font-black text-rose-100 text-xs">{format(new Date(job.dueDate), 'dd/MM/yyyy')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TODAY (AMBER ALERT) */}
        {groups.today.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
              <Clock size={14} className="text-amber-500" />
              <span>Entrega Hoje ({groups.today.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {groups.today.map(job => (
                <div key={job.id} className="p-3 bg-amber-950/40 border border-amber-500/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-amber-200 bg-amber-900/80 px-2 py-0.5 rounded">
                        OS #{job.osNumber || job.id.slice(-5)}
                      </span>
                      {job.boxNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-black text-[10px]">
                          Cx {job.boxNumber}
                        </span>
                      )}
                    </div>
                    <p className="font-black text-white text-sm mt-1 truncate">{job.patientName}</p>
                    <p className="text-xs text-amber-200/60 truncate">{job.dentistName} • {job.currentSector || 'Produção'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-black text-xs">
                      HOJE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOMORROW & FUTURE */}
        {(groups.tomorrow.length > 0 || groups.future.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-wider">
              <Calendar size={14} />
              <span>Próximos Dias ({groups.tomorrow.length + groups.future.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[...groups.tomorrow, ...groups.future].map(job => (
                <div key={job.id} className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-bold text-xs text-slate-400 mr-2">
                      OS #{job.osNumber || job.id.slice(-5)}
                    </span>
                    <span className="font-black text-slate-200 text-xs">{job.patientName}</span>
                    <p className="text-[11px] text-slate-500 truncate">{job.dentistName}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 shrink-0">
                    {format(new Date(job.dueDate), 'dd/MM')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vipJobs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <CheckCircle2 size={36} className="text-emerald-500/40 mb-2" />
            <p className="font-bold text-sm text-slate-400">Nenhum caso VIP pendente</p>
            <p className="text-xs text-slate-600 mt-0.5">Todas as entregas críticas estão concluídas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. KANBAN SECTORS MONITOR WIDGET
// ---------------------------------------------------------------------------
export const KanbanMonitorWidget: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  const { jobs, sectors } = useApp();

  const activeJobs = useMemo(() => {
    return jobs.filter(j => j.status !== JobStatus.DELIVERED && j.status !== JobStatus.CANCELED);
  }, [jobs]);

  // Group active jobs by sector
  const sectorColumns = useMemo(() => {
    const list = sectors.length > 0 ? sectors : [
      { id: 'gesso', name: 'Gesso & Modelo' },
      { id: 'cadcam', name: 'CAD / CAM' },
      { id: 'ceramica', name: 'Cerâmica / Aplicação' },
      { id: 'acabamento', name: 'Acabamento & Polimento' },
      { id: 'expedicao', name: 'Expedição & CQ' },
    ];

    return list.map(sec => {
      const secJobs = activeJobs.filter(j => {
        if (j.currentSector === sec.name || j.currentSector === sec.id) return true;
        return j.sectorMovements?.some(m => !m.exitTime && (m.sector === sec.name || m.sector === sec.id));
      });
      return {
        ...sec,
        jobs: secJobs
      };
    });
  }, [sectors, activeJobs]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-indigo-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            {config.titleCustom || 'Fluxo Kanban de Produção'}
          </span>
        </div>
        <span className="text-xs font-bold text-slate-400">
          {activeJobs.length} Casos em Andamento
        </span>
      </div>

      {/* Horizontal Scrolling Kanban Columns */}
      <div className="flex-1 overflow-x-auto p-3 flex gap-3 custom-scrollbar">
        {sectorColumns.map(col => (
          <div 
            key={col.id} 
            className="w-64 shrink-0 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col overflow-hidden"
          >
            {/* Column Header */}
            <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
              <span className="font-black text-xs text-slate-200 truncate">{col.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-[10px]">
                {col.jobs.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {col.jobs.length === 0 ? (
                <p className="text-center text-[11px] text-slate-600 py-6 italic">Sem casos no setor</p>
              ) : (
                col.jobs.map(job => (
                  <div 
                    key={job.id} 
                    className="p-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-xl transition-all"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-bold text-[10px] text-slate-400">
                        #{job.osNumber || job.id.slice(-4)}
                      </span>
                      {job.boxNumber && (
                        <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 px-1 rounded">
                          Cx {job.boxNumber}
                        </span>
                      )}
                    </div>
                    <p className="font-black text-slate-200 text-xs truncate">{job.patientName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{job.dentistName}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-800/60 pt-1">
                      <span>Prazo:</span>
                      <span className="font-bold text-slate-300">{format(new Date(job.dueDate), 'dd/MM')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. REPORTS & METRICS MONITOR WIDGET
// ---------------------------------------------------------------------------
export const ReportsMonitorWidget: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  const { jobs, allUsers } = useApp();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const metrics = useMemo(() => {
    let monthlyBilling = 0;
    let completedCount = 0;
    let totalItems = 0;
    const dentistBillingMap: Record<string, { name: string; total: number; count: number }> = {};

    jobs.forEach(j => {
      const d = new Date(j.createdAt);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthlyBilling += j.totalValue || 0;
        totalItems += (j.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
        if (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED) {
          completedCount += 1;
        }

        const dName = j.dentistName || 'Outro';
        if (!dentistBillingMap[dName]) {
          dentistBillingMap[dName] = { name: dName, total: 0, count: 0 };
        }
        dentistBillingMap[dName].total += j.totalValue || 0;
        dentistBillingMap[dName].count += 1;
      }
    });

    const topDentists = Object.values(dentistBillingMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      monthlyBilling,
      completedCount,
      totalItems,
      topDentists
    };
  }, [jobs, currentMonth, currentYear]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-teal-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            {config.titleCustom || 'Relatório de Produção & Faturamento'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
          Mês Atual
        </span>
      </div>

      {/* KPI Cards & Top Clients */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento Mês</span>
            <p className="text-lg font-black text-emerald-400 mt-0.5">
              R$ {metrics.monthlyBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Trabalhos Concluídos</span>
            <p className="text-lg font-black text-blue-400 mt-0.5">
              {metrics.completedCount} casos
            </p>
          </div>
        </div>

        {/* Top Clients Table */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Stethoscope size={13} className="text-teal-400" />
            Top Clientes do Mês
          </h4>
          <div className="space-y-1.5">
            {metrics.topDentists.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                <span className="font-bold text-slate-200 truncate max-w-[150px]">
                  {idx + 1}. {client.name}
                </span>
                <div className="text-right shrink-0">
                  <span className="font-black text-emerald-400">
                    R$ {client.total.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-2">({client.count} OSs)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 5. DASHBOARD EXECUTIVE MONITOR WIDGET
// ---------------------------------------------------------------------------
export const DashboardMonitorWidget: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  const { jobs, alerts } = useApp();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeRecentAlerts = useMemo(() => {
    const now = new Date();
    const isSameDay = (d1: Date, d2: Date) => (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
    return (alerts || []).filter(alert => {
      if (!alert.scheduledFor) return false;
      const scheduledDate = alert.scheduledFor instanceof Date ? alert.scheduledFor : new Date(alert.scheduledFor);
      return !isNaN(scheduledDate.getTime()) && isSameDay(now, scheduledDate);
    });
  }, [alerts]);

  const stats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let delayed = 0;
    let dueToday = 0;

    jobs.forEach(j => {
      if (j.status === JobStatus.DELIVERED || j.status === JobStatus.CANCELED) return;
      
      if (j.status === JobStatus.PENDING) pending++;
      else inProgress++;

      const due = new Date(j.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) delayed++;
      else if (due.getTime() === today.getTime()) dueToday++;
    });

    return { pending, inProgress, delayed, dueToday, total: pending + inProgress };
  }, [jobs, today]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            {config.titleCustom || 'Painel de Operações'}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-black text-[10px] border border-purple-500/30">
          Status em Tempo Real
        </span>
      </div>

      {/* Grid Stats */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Em Aberto</span>
            <p className="text-2xl font-black text-blue-400 mt-0.5">{stats.total}</p>
          </div>
          <div className={`p-3 border rounded-2xl ${stats.delayed > 0 ? 'bg-rose-950/50 border-rose-600/50' : 'bg-slate-950/70 border-slate-800'}`}>
            <span className="text-[10px] font-bold text-rose-400 uppercase">Atrasados</span>
            <p className="text-2xl font-black text-rose-400 mt-0.5">{stats.delayed}</p>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-amber-400 uppercase">Para Hoje</span>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{stats.dueToday}</p>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-indigo-400 uppercase">Em Produção</span>
            <p className="text-2xl font-black text-indigo-400 mt-0.5">{stats.inProgress}</p>
          </div>
        </div>

        {/* Recent Alerts */}
        {activeRecentAlerts && activeRecentAlerts.length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-2">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-400" />
              Alertas Recentes da Produção
            </h4>
            <div className="space-y-1.5">
              {activeRecentAlerts.slice(0, 4).map(alert => (
                <div key={alert.id} className="p-2 bg-slate-900/80 rounded-xl border border-slate-800 text-xs flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-200 truncate">{alert.osNumber ? `OS #${alert.osNumber}` : 'Alerta de Caso'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{alert.message || 'Alerta no sistema'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 6. LOGISTICS MONITOR WIDGET
// ---------------------------------------------------------------------------
export const LogisticsMonitorWidget: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  const { jobs } = useApp();

  const readyJobs = useMemo(() => {
    return jobs.filter(j => j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED);
  }, [jobs]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900 text-slate-100">
      <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            {config.titleCustom || 'Expedição & Entregas'}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-black text-[10px] border border-cyan-500/30">
          {readyJobs.length} Prontos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {readyJobs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Truck size={36} className="text-slate-600 mb-2" />
            <p className="font-bold text-sm text-slate-400">Nenhum caso na expedição</p>
          </div>
        ) : (
          readyJobs.map(job => (
            <div key={job.id} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-mono font-bold text-xs text-cyan-400 mr-2">
                  OS #{job.osNumber || job.id.slice(-4)}
                </span>
                <span className="font-black text-slate-200 text-xs">{job.patientName}</span>
                <p className="text-[11px] text-slate-400 truncate">{job.dentistName}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                job.status === JobStatus.DELIVERED 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {job.status === JobStatus.DELIVERED ? 'Entregue' : 'Pronto para Rota'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 7. INVENTORY MONITOR WIDGET
// ---------------------------------------------------------------------------
export const InventoryMonitorWidget: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  const { inventoryItems } = useApp();

  const lowStockItems = useMemo(() => {
    return (inventoryItems || []).filter(item => {
      const min = item.minStock || 5;
      return (item.currentStock || 0) <= min;
    });
  }, [inventoryItems]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900 text-slate-100">
      <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            {config.titleCustom || 'Estoque & Insumos Críticos'}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-black text-[10px] border border-yellow-500/30">
          {lowStockItems.length} Alertas
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {lowStockItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <CheckCircle2 size={36} className="text-emerald-500/40 mb-2" />
            <p className="font-bold text-sm text-slate-400">Estoque Regularizado</p>
            <p className="text-xs text-slate-600 mt-0.5">Nenhum insumo em nível crítico no momento.</p>
          </div>
        ) : (
          lowStockItems.map(item => (
            <div key={item.id} className="p-2.5 bg-yellow-950/30 border border-yellow-500/40 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-black text-white text-xs truncate">{item.name}</p>
                <p className="text-[10px] text-yellow-300/70">{item.description || 'Insumo Geral'}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-yellow-400 text-xs">
                  {item.currentStock || 0} un
                </span>
                <span className="text-[10px] text-slate-500 block">Min: {item.minStock || 5}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MASTER WIDGET DISPATCHER
// ---------------------------------------------------------------------------
export const MonitorPanelRenderer: React.FC<{ config: ScreenPanelConfig }> = ({ config }) => {
  switch (config.tab) {
    case 'jobs':
      return <JobsMonitorWidget config={config} />;
    case 'vip':
      return <VipMonitorWidget config={config} />;
    case 'kanban':
      return <KanbanMonitorWidget config={config} />;
    case 'reports':
      return <ReportsMonitorWidget config={config} />;
    case 'dashboard':
      return <DashboardMonitorWidget config={config} />;
    case 'logistics':
      return <LogisticsMonitorWidget config={config} />;
    case 'inventory':
      return <InventoryMonitorWidget config={config} />;
    case 'calendar':
      return <JobsMonitorWidget config={{ ...config, titleCustom: config.titleCustom || 'Calendário de Produção (Entregas)' }} />;
    case 'budgets':
    case 'incoming_orders':
    case 'incoming_requisitions':
    case 'finance':
    default:
      return <JobsMonitorWidget config={config} />;
  }
};
