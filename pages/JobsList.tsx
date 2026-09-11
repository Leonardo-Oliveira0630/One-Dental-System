import logger from "../utils/logger";

import React, { useState, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../src/i18n';
import { useApp } from '../context/AppContext';
import { JobStatus, UserRole, UrgencyLevel, Job } from '../types';
import { Search, Filter, FileDown, Eye, Clock, AlertCircle, Printer, X, ChevronRight, MapPin, User, SlidersHorizontal, RefreshCcw, Ban, Building, QrCode, Copy, Check, Globe, HardDrive, CheckCircle2, Truck, Loader2, Box, RotateCcw, Calendar, MoreHorizontal, PlusCircle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getContrastColor } from '../services/mockData';
import { MultiSelect } from '../components/MultiSelect';

import { StoreTopMenu } from '../components/StoreTopMenu';

// Helper function to extract and style the origin of a job
export const getJobOriginInfo = (job: any) => {
  const isWebStore = (job.history || []).some((h: any) => h?.action?.toLowerCase().includes('loja virtual') || h?.action?.toLowerCase().includes('pedido online'));
  const isReq = (job.history || []).some((h: any) => h?.action?.toLowerCase().includes('requisica') || h?.action?.toLowerCase().includes('requisiç') || h?.action?.toLowerCase().includes('portal de requisicoes') || h?.action?.toLowerCase().includes('portal de requisições'));

  const origin = job.origin || (isWebStore ? 'ONLINE_ORDER' : (isReq ? 'ONLINE_REQUISITION' : 'MANUAL'));

  switch(origin) {
    case 'ONLINE_ORDER':
      return { label: i18n.t('orders.origin.ONLINE_ORDER', 'Loja Online'), color: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' }
    case 'ONLINE_REQUISITION':
      return { label: i18n.t('orders.origin.ONLINE_REQUISITION', 'Requisição Online'), color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' }
    case 'OUTSOURCING':
      return { label: i18n.t('orders.origin.OUTSOURCING', 'Terceirização'), color: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' }
    case 'MANUAL':
    default:
      return { label: i18n.t('orders.origin.MANUAL', 'Manual'), color: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300' }
  }

}

// Componente de Linha Memoizado para evitar re-renders desnecessários
const JobRow = memo(({ isJobOverdue, 
    job, 
    isClient,
    isBudgetMode, 
    isLabStaff, 
    navigate, 
    handleFinalizeJob, 
    handleReopenJob, 
    setRouteModalJob,
    getStatusColor,
    getTranslatedStatus,
    getSectorTimeInfo,
    revealJobStatus
}: { 
    isJobOverdue?: any,
    job: Job, 
    isClient: boolean, 
    isBudgetMode?: boolean,
    isLabStaff: boolean, 
    navigate: any, 
    handleFinalizeJob: any, 
    handleReopenJob: any, 
    setRouteModalJob: any,
    getStatusColor: any,
    getTranslatedStatus: any,
    getSectorTimeInfo: any,
    revealJobStatus: boolean
}) => {
    const { t } = useTranslation();
    const canFinalize = isLabStaff && job.status !== JobStatus.COMPLETED && job.status !== JobStatus.DELIVERED && job.status !== JobStatus.REJECTED;
    const canRoute = isLabStaff && job.status === JobStatus.COMPLETED && !job.routeId;
    const canReopen = isLabStaff && (job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED || job.status === JobStatus.RETURNED);
    const timeInfo = getSectorTimeInfo(job);
    const showAttention = !isClient && timeInfo.isAttention;

    return (
        <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors ${showAttention ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}>
            <td className="p-4 font-mono font-bold text-sm">
                <button onClick={() => navigate(`/jobs/${job.id}`)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-left">
                    {job.osNumber || '---'}
                </button>
            </td>
            {!isClient && !isBudgetMode && (
                <td className="p-4">
                    {job.boxNumber ? (
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs shadow-sm border border-black/10"
                            style={{ backgroundColor: job.boxColor?.hex || '#1E293B', color: job.boxColor ? getContrastColor(job.boxColor.hex) : '#94A3B8' }}
                        >
                            {job.boxNumber}
                        </div>
                    ) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                </td>
            )}
            
            {!isBudgetMode && (
                <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{job.patientName}</div>
                    {(job.status === 'REJECTED' || (job.status as any) === 'REJECTED_REQUISITION') && job.rejectionReason && (
                        <div className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded px-2 py-1 max-w-xs">
                            <span className="font-black text-[9px] uppercase tracking-wider block text-red-700 dark:text-red-300">{t('orders.rejectionReasonLabel', 'Motivo da Recusa:')}</span>
                            {job.rejectionReason}
                        </div>
                    )}
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{job.dentistName}</div>
                </td>
            )}
            
            {!isBudgetMode && (
                <td className="p-4 text-xs font-bold">
                    {(() => {
                        const originInfo = getJobOriginInfo(job);
                        return (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${originInfo.color}`}>
                                {originInfo.label}
                            </span>
                        );
                    })()}
                </td>
            )}
            
            {!isBudgetMode && (
                <td className="p-4">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{job.dentistName}</div>
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{job.patientName}</div>
                </td>
            )}
            
            {!isBudgetMode && (
                <td className="p-4">
                    {revealJobStatus ? (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}`}>
                            {getTranslatedStatus(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase border bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700" title={t('orders.statusUnavailableNotice', 'Função de andamento indisponível no momento')}>
                            {t('common.unavailable', 'Indisponível')}
                        </span>
                    )}
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {revealJobStatus ? (job.currentSector || t('sectors.screening', 'Triagem')) : t('common.unavailable', 'Indisponível')}
                        </span>
                        {revealJobStatus && !isClient && (
                            <div className={`flex items-center gap-1 text-xs font-bold ${timeInfo.isAttention ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                <Clock size={12} /> {timeInfo.label}
                                {timeInfo.isAttention && <AlertCircle size={12} className="animate-pulse" />}
                            </div>
                        )}
                    </div>
                </td>
            )}
            
            {isBudgetMode && (
                <td className="p-4 text-slate-600 dark:text-slate-300 text-xs font-bold">
                    {job.createdAt ? (
                        job.createdAt instanceof Date 
                            ? job.createdAt.toLocaleDateString()
                            : new Date((job.createdAt as any).seconds ? (job.createdAt as any).seconds * 1000 : job.createdAt).toLocaleDateString()
                    ) : '-'}
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4 text-slate-600 dark:text-slate-300 text-xs font-bold">{(job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-")}</td>
            )}
            
            {!isBudgetMode && (
                <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                        {canFinalize && <button onClick={() => handleFinalizeJob(job)} className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/40 rounded-lg" title={t('orders.actionFinalize', 'Finalizar')}><CheckCircle2 size={18} /></button>}
                        {canReopen && <button onClick={() => handleReopenJob(job)} className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-lg" title={t('orders.actionReopen', 'Reabrir')}><RotateCcw size={18} /></button>}
                        {canRoute && <button onClick={() => setRouteModalJob(job)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 rounded-lg" title={t('orders.scaleForDelivery', 'Escalar p/ Entrega')}><Truck size={18} /></button>}
                        <button onClick={() => navigate(`/jobs/${job.id}`)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40 rounded-lg" title={t('common.view', 'Visualizar')}><Eye size={18} /></button>
                    </div>
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4 text-right font-bold text-xs text-slate-800 dark:text-slate-100">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(job.totalValue || 0)}
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => navigate(`/jobs/${job.id}`)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40 rounded-lg" title={t('orders.viewBudget', 'Ver Orçamento')}>
                            <Eye size={18} />
                        </button>
                    </div>
                </td>
            )}
        </tr>
    );
});

// Componente de Card Mobile Memoizado
const JobCard = memo(({ isJobOverdue, 
    job, 
    navigate, 
    getStatusColor, 
    getTranslatedStatus, 
    getSectorTimeInfo, 
    isClient,
    isBudgetMode,
    revealJobStatus
}: { 
    isJobOverdue?: any,
    job: Job, 
    navigate: any, 
    getStatusColor: any, 
    getTranslatedStatus: any, 
    getSectorTimeInfo: any, 
    isClient: boolean,
    isBudgetMode?: boolean,
    revealJobStatus: boolean
}) => {
    const { t } = useTranslation();
    const timeInfo = getSectorTimeInfo(job);
    const showAttention = !isClient && timeInfo.isAttention;
    return (
        <div onClick={() => navigate(`/jobs/${job.id}`)} className={`bg-white dark:bg-[#131B2A] rounded-2xl p-4 shadow-sm border transition-transform relative overflow-hidden active:scale-[0.98] ${showAttention ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
            {job.urgency === UrgencyLevel.VIP && <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden"><div className="bg-orange-500 text-white text-[8px] font-black py-1 px-10 transform rotate-45 translate-x-3 -translate-y-1 text-center shadow-sm uppercase">VIP</div></div>}

            {showAttention && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 animate-pulse" />}

            
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-base">#{job.osNumber || '---'}</span>
                    {!isBudgetMode && (
                        revealJobStatus ? (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStatusColor(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}`}>
                                {getTranslatedStatus(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700">
                                {t('common.unavailable', 'Indisponível')}
                            </span>
                        )
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none">{isBudgetMode ? t('orders.table.createdAt', 'Criado em') : t('orders.table.dueDate', 'Entrega')}</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isBudgetMode 
                            ? (job.createdAt ? (job.createdAt instanceof Date ? job.createdAt.toLocaleDateString() : new Date((job.createdAt as any).seconds ? (job.createdAt as any).seconds * 1000 : job.createdAt).toLocaleDateString()) : '-')
                            : (job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '-')
                        }
                    </p>
                </div>
            </div>

            <div className="space-y-1 mb-4">
                {isBudgetMode && (
                    <div className="mb-2">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none block mb-1">{t('orders.table.finalValue', 'Valor Final')}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(job.totalValue || 0)}
                        </span>
                    </div>
                )}
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg leading-tight">{job.patientName}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-bold">
                    <User size={12} className="text-blue-500" />
                    <span className="uppercase truncate">Dr(a). {job.dentistName}</span>
                </div>
                {!isBudgetMode && (job.status === 'REJECTED' || (job.status as any) === 'REJECTED_REQUISITION') && job.rejectionReason && (
                    <div className="mt-2 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-2.5">
                        <span className="font-black text-[9px] uppercase tracking-wider block mb-0.5 text-red-800 dark:text-red-300">{t('orders.rejectionReasonLabel', 'Motivo da Recusa:')}</span>
                        {job.rejectionReason}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                   {!isClient && !isBudgetMode && job.boxNumber && (
                       <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                           <Box size={14} className="text-slate-400 dark:text-slate-500" />
                           <span className="text-xs font-black text-slate-700 dark:text-slate-300">{job.boxNumber}</span>
                       </div>
                   )}

                   {!isBudgetMode && (
                       <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${revealJobStatus ? (showAttention ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300') : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                           <MapPin size={14} className={revealJobStatus ? (showAttention ? 'text-amber-500' : 'text-blue-400') : 'text-slate-400'} />
                           <span className="text-xs font-bold truncate max-w-[100px]">{revealJobStatus ? (job.currentSector || t('sectors.reception', 'Recepção')) : t('common.unavailable', 'Indisponível')}</span>
                           {revealJobStatus && !isClient && <span className="text-[10px] font-black border-l border-current pl-1.5 ml-0.5">{timeInfo.label}</span>}
                       </div>
                   )}
                   {!isBudgetMode && (() => {
                        const originInfo = getJobOriginInfo(job);
                        return (
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${originInfo.color}`}>
                                {originInfo.label}
                            </span>
                        );
                   })()}
                </div>
                <ChevronRight className="text-slate-300 dark:text-slate-600 flex-shrink-0" size={20} />
            </div>
        </div>
    );
});


export const getStatusColor = (status: any, isOverdue = false) => {
    if (isOverdue) return 'bg-red-500 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse';
    switch(status) {
        case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        case 'PENDING_REQUISITION': return 'bg-amber-100 text-amber-700 border border-amber-200';
        case 'REJECTED_REQUISITION': return 'bg-red-100 text-red-700 border border-red-200';
        case 'COMPLETED': return 'bg-green-100 text-green-700 border border-green-200';
        case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border border-blue-200';
        case 'WAITING_APPROVAL': return 'bg-purple-100 text-purple-700 border border-purple-200';
        case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        case 'REJECTED': return 'bg-red-100 text-red-700 border border-red-200';
        case 'CANCELED': return 'bg-gray-200 text-gray-700 border border-gray-300';
        case 'RETURNED': return 'bg-orange-100 text-orange-700 border border-orange-200';
        case 'SECTOR_TRANSITION': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }

}

export const getTranslatedStatus = (status: any, isOverdue = false) => {
    if (isOverdue) return i18n.t('orders.status.OVERDUE', 'Atrasado');
    switch(status) {
        case 'APPROVED': return i18n.t('orders.status.APPROVED', 'Aprovado');
        case 'PENDING_REQUISITION': return i18n.t('orders.status.PENDING_REQUISITION', 'Req. Pendente');
        case 'REJECTED_REQUISITION': return i18n.t('orders.status.REJECTED_REQUISITION', 'Req. Recusada');
        case 'WAITING_APPROVAL': return i18n.t('orders.status.WAITING_APPROVAL', 'Aguardando');
        case 'PENDING': return i18n.t('orders.status.PENDING', 'Pendente');
        case 'IN_PROGRESS': return i18n.t('orders.status.IN_PROGRESS', 'Produção');
        case 'COMPLETED': return i18n.t('orders.status.COMPLETED', 'Concluído');
        case 'DELIVERED': return i18n.t('orders.status.DELIVERED', 'Entregue');
        case 'REJECTED': return i18n.t('orders.status.REJECTED', 'Rejeitado');
        case 'CANCELED': return i18n.t('orders.status.CANCELED', 'Cancelado');
        case 'RETURNED': return i18n.t('orders.status.RETURNED', 'Devolvido');
        case 'SECTOR_TRANSITION': return i18n.t('orders.status.SECTOR_TRANSITION', 'Em Transição');
        default: return status;
    }

}

export const getSectorTimeInfo = (job: any) => {
    if (!job.sectorEntryTime) return { hours: 0, isAttention: false, label: '---' }
    const diff = new Date().getTime() - new Date(job.sectorEntryTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let label = '';
    if (hours > 0) label += `${hours}h `;
    label += `${minutes}m`;
    return { hours, isAttention: hours >= 18, label }
}

export const JobsList = ({ isStoreContext, isBudgetMode }: { isStoreContext?: boolean; isBudgetMode?: boolean } = {}) => {
  const { t } = useTranslation();
  const { jobs, budgets, currentUser, updateJob, sectors, activeOrganization, addJobToRoute, allUsers, manualDentists, couriers, onlineRequisitions, activeManualDentistId, currentPlan, currentOrg } = useApp();
  const navigate = useNavigate();
  
  const [filterText, setFilterText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
  const [filterAttention, setFilterAttention] = useState(false);
  
  const [selectedDentists, setSelectedDentists] = useState<string[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  const [routeModalJob, setRouteModalJob] = useState<Job | null>(null);
  
  // Free Lab OS Edit States
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editNotesText, setEditNotesText] = useState('');

  // Route Form State
  const [routeDriver, setRouteDriver] = useState('');
  const [routeShift, setRouteShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeObservations, setRouteObservations] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  const handleSaveNotes = async (jobId: string, notes: string) => {
    try {
      await updateJob(jobId, { notes });
      setEditingJob(null);
    } catch (e) { alert(t('common.errorSaveNotes', 'Erro ao salvar observação.')); }
}
const handleUpdateStatus = async (jobId: string, status: JobStatus) => {
    try {
      await updateJob(jobId, { status });
    } catch (e) { alert(t('common.errorUpdateStatus', 'Erro ao atualizar status.')); }
}
const isClient = currentUser?.role === UserRole.CLIENT || !!isStoreContext;
  const isLabStaff = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.COLLABORATOR;
  const revealJobStatus = !isClient || (activeOrganization?.revealJobStatusToDentist ?? false);

  const currentOrgId = activeOrganization?.id || currentUser?.organizationId;

  const dentistOptions = useMemo(() => [
    ...manualDentists.map(d => ({ value: d.id, label: d.name })),
    ...allUsers.filter(u => u.role === UserRole.CLIENT).map(u => ({ value: u.id, label: u.name }))
  ].sort((a, b) => a.label.localeCompare(b.label)), [manualDentists, allUsers, currentOrgId]);

  const collaboratorOptions = useMemo(() => allUsers
    .filter(u => u.role !== UserRole.CLIENT && u.organizationId === currentOrgId)
    .map(u => ({ value: u.id, label: u.name }))
    .sort((a, b) => a.label.localeCompare(b.label)), [allUsers, currentOrgId]);

  const sectorOptions = useMemo(() => sectors.map(s => ({ value: s.name, label: s.name })), [sectors]);

  const normalizeText = (text: string) => {
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  

  const isJobOverdue = (job: any) => {
    if (!job.dueDate) return false;
    const isInactive = ['COMPLETED', 'DELIVERED', 'REJECTED', 'REJECTED_REQUISITION', 'CANCELED'].includes(job.status);
    if (isInactive) return false;
    const due = new Date(job.dueDate);
    due.setHours(23, 59, 59, 999);
    return new Date() > due;
  }

  const statusOptions = useMemo(() => [
    { value: 'OVERDUE', label: 'Atrasado' },
    ...Object.values(JobStatus).map(s => ({ value: s, label: getTranslatedStatus(s) }))
  ].sort((a, b) => a.label.localeCompare(b.label)), []);

  const combinedJobs = useMemo(() => {
    if (isBudgetMode) return budgets || [];
    if (!isClient) return jobs;

    // Filter pending/rejected requisitions made by this dentist that are not yet accepted as active jobs
    const rawReqs = onlineRequisitions || [];
    const nonAcceptedReqs = rawReqs
      .filter(r => (r.dentistId === currentUser?.id || r.dentistManualId === currentUser?.manualDentistId || r.dentistManualId === activeManualDentistId) && r.status !== 'ACCEPTED')
      .map(r => ({
        id: `pseudo_req_${r.id}`,
        osNumber: 'REQ-' + r.id.substring(0, 5).toUpperCase(),
        patientName: r.patientName,
        dentistId: r.dentistManualId || r.dentistId,
        dentistName: r.dentistName,
        status: (r.status === 'PENDING' ? 'PENDING_REQUISITION' : 'REJECTED_REQUISITION') as any,
        urgency: 'NORMAL',
        items: [{
          id: `pseudo_item_${r.id}`,
          jobTypeId: r.serviceId,
          name: r.serviceName,
          quantity: r.quantity || 1,
          price: 0
        }],
        history: [],
        createdAt: r.createdAt instanceof Date ? r.createdAt : (r.createdAt ? new Date((r.createdAt as any).seconds * 1000 || r.createdAt) : new Date()),
        dueDate: r.createdAt instanceof Date ? r.createdAt : (r.createdAt ? new Date((r.createdAt as any).seconds * 1000 || r.createdAt) : new Date()),
        totalValue: 0,
        notes: r.notes || '',
        origin: 'ONLINE_REQUISITION',
        isPseudo: true,
        rejectionReason: r.rejectionReason || '',
        labName: r.labName || 'Laboratório'
      } as any));

    return [...nonAcceptedReqs, ...jobs];
  }, [jobs, budgets, onlineRequisitions, isClient, currentUser?.id, currentUser?.manualDentistId, activeManualDentistId, isBudgetMode]);

  const filteredJobs = useMemo(() => {
    return combinedJobs.filter(job => {
        if (job.isComboPurchase) return false;
        if (isClient && 
            job.dentistId !== currentUser?.id && 
            job.dentistId !== currentUser?.manualDentistId && 
            job.dentistId !== activeManualDentistId && 
            job.dentistUserId !== currentUser?.id && 
            !job.isPseudo
        ) return false;
        const searchLower = normalizeText(filterText);
        const matchText = 
          normalizeText(job.osNumber || '').includes(searchLower) ||
          normalizeText(job.boxNumber || '').includes(searchLower) ||
          normalizeText(job.patientName).includes(searchLower) ||
          normalizeText(job.dentistName).includes(searchLower);
        if (!matchText) return false;
        if (selectedStatuses.length > 0) {
            const hasOverdueSelected = selectedStatuses.includes('OVERDUE');
            const hasOtherStatuses = selectedStatuses.some(s => s !== 'OVERDUE');
            
            let matchesStatus = false;
            
            if (hasOverdueSelected && isJobOverdue(job)) {
                matchesStatus = true;
            }

            
            if (hasOtherStatuses && selectedStatuses.includes(job.status)) {
                matchesStatus = true;
            }

            
            if (!matchesStatus) return false;
        } else if (statusFilter !== 'ALL') {
            if (statusFilter === 'ACTIVE_JOBS') {
                const inactive = ['COMPLETED', 'DELIVERED', 'REJECTED', 'REJECTED_REQUISITION', 'CANCELED'];
                if (inactive.includes(job.status)) return false;
            } else if (statusFilter === 'COMPLETED_DELIVERED') {
                if (job.status !== 'COMPLETED' && job.status !== 'DELIVERED') return false;
            } else if (statusFilter === 'REJECTED_JOBS') {
                if (job.status !== 'REJECTED' && job.status !== 'REJECTED_REQUISITION') return false;
            } else if (job.status !== statusFilter) {
                return false;
            }

        }

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0,0,0,0);
            if (new Date(job.createdAt) < start) return false;
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23,59,59,999);
            if (new Date(job.createdAt) > end) return false;
        }

        
        if (selectedDentists.length > 0 && !selectedDentists.includes(job.dentistId)) return false;
        if (selectedSectors.length > 0 && !selectedSectors.includes(job.currentSector || '')) return false;
        if (selectedCollaborators.length > 0) {
            const hasCollaborator = (job.history || []).some((h: any) => selectedCollaborators.includes(h?.userId));
            if (!hasCollaborator) return false;
        }


        if (filterUrgency && job.urgency !== filterUrgency) return false;
        if (filterAttention) {
            if (!job.sectorEntryTime) return false;
            const hours = (new Date().getTime() - new Date(job.sectorEntryTime).getTime()) / (1000 * 60 * 60);
            if (hours < 18) return false;
        }

        if (filterOrigin !== 'ALL') {
            const isWebStore = (job.history || []).some((h: any) => h?.action?.toLowerCase().includes('loja virtual') || h?.action?.toLowerCase().includes('pedido online'));
            const isReq = (job.history || []).some((h: any) => h?.action?.toLowerCase().includes('requisica') || h?.action?.toLowerCase().includes('requisiç') || h?.action?.toLowerCase().includes('portal de requisicoes') || h?.action?.toLowerCase().includes('portal de requisições'));
            const resolvedOrigin = job.origin || (isWebStore ? 'ONLINE_ORDER' : (isReq ? 'ONLINE_REQUISITION' : 'MANUAL'));
            
            if (filterOrigin !== resolvedOrigin) return false;
        }

        return true;
      });
  }, [combinedJobs, isBudgetMode, isClient, currentUser?.id, currentUser?.manualDentistId, activeManualDentistId, filterText, statusFilter, selectedStatuses, startDate, endDate, selectedDentists, selectedSectors, selectedCollaborators, filterUrgency, filterAttention, filterOrigin]);

  const handleFinalizeJob = async (job: Job) => {
      const dentist = allUsers.find(u => u.id === job.dentistId) || manualDentists.find(d => d.id === job.dentistId);
      if (dentist?.isBlocked) {
          alert(t('orders.blockedClientWarning', "Este cliente está BLOQUEADO por limite de fatura. Não é possível finalizar o trabalho até que a pendência seja resolvida."));
          return;
      }


      if (!window.confirm(t('orders.confirmFinalizeJob', { name: job.patientName, defaultValue: `Deseja finalizar o caso de ${job.patientName}?` }))) return;
      await updateJob(job.id, {
          status: JobStatus.COMPLETED,
          history: [...(job.history || []).filter(Boolean), {
              id: `hist_fin_${Date.now()}`,
              timestamp: new Date(),
              action: 'Trabalho Finalizado e Conferido',
              userId: currentUser?.id || 'sys',
              userName: currentUser?.name || 'Sistema',
              sector: 'Expedição'
          }]
      });
  }

  const handleReopenJob = async (job: Job) => {
      if (!window.confirm(t('orders.confirmReopenJob', { name: job.patientName, defaultValue: `Deseja reabrir o caso de ${job.patientName}?` }))) return;
      await updateJob(job.id, {
          status: JobStatus.IN_PROGRESS,
          history: [...(job.history || []).filter(Boolean), {
              id: `hist_reopen_${Date.now()}`,
              timestamp: new Date(),
              action: 'Trabalho REABERTO via lista rápida',
              userId: currentUser?.id || 'sys',
              userName: currentUser?.name || 'Sistema',
              sector: currentUser?.sector || 'Gestão'
          }]
      });
  }

  const handleAddToRoute = async () => {
    if (!routeModalJob || !routeDriver) return;
    setIsProcessing(true);
    try {
        await addJobToRoute(routeModalJob, routeDriver, routeShift, new Date(routeDate), routeObservations);
        setRouteModalJob(null);
        setRouteObservations('');
        alert(t('orders.addedToRouteSuccess', "Adicionado à rota!"));
    } catch (e) { alert(t('common.errorGeneric', "Erro.")); } finally { setIsProcessing(false); }

  }

  


  if (isClient && !activeOrganization) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-8">
            <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Building size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">{t('orders.noLabSelected', 'Nenhum Laboratório Selecionado')}</h2>
                <p className="text-slate-500 mb-6">{t('orders.noLabSelectedDesc', 'Selecione um laboratório parceiro no menu lateral para ver seus pedidos.')}</p>
                <button onClick={() => navigate('/dentist/partnerships')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors w-full">{t('orders.managePartnerships', 'Gerenciar Parcerias')}</button>
            </div>
        </div>
    );
  }


  const isFreeLab = currentOrg?.orgType === 'LAB' && (currentPlan?.id === 'free_lab' || currentPlan?.features?.isLabFreeStoreOnly === true);

  if (isFreeLab) {
    const freeLabJobs = jobs.filter(j => 
      (j.origin === 'ONLINE_ORDER' || j.origin === 'ONLINE_REQUISITION')
    );

    return (
      <div className="space-y-6 pb-20 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('orders.jobsStoreTitle', 'Trabalhos (Loja Online)')}</h1>
          <p className="text-sm text-slate-500">{t('orders.jobsStoreSubtitle', 'Gerencie e atualize o andamento dos pedidos aceitos na sua loja.')}</p>
        </div>

        {/* JOBS LIST */}

        <div className="bg-white dark:bg-[#131B2A] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0F17] text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4">{t('orders.table.osNumber', 'O.S. / Pedido')}</th>
                  <th className="px-6 py-4">{t('orders.table.dentist', 'Dentista')}</th>
                  <th className="px-6 py-4">{t('orders.table.patient', 'Paciente')}</th>
                  <th className="px-6 py-4">{t('orders.table.services', 'Serviços')}</th>
                  <th className="px-6 py-4">{t('orders.table.notes', 'Observações')}</th>
                  <th className="px-6 py-4">{t('orders.table.dueDate', 'Entrega')}</th>
                  <th className="px-6 py-4 text-center">{t('orders.table.actionsStatus', 'Ações / Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {freeLabJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      {t('orders.emptyAcceptedOrders', 'Nenhum pedido aceito encontrado. Aceite pedidos na aba "Pedidos Web".')}
                    </td>
                  </tr>
                ) : (
                  freeLabJobs.slice(0, visibleCount).map((job) => {
                    const isEditingThis = editingJob?.id === job.id;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          <button 
                            onClick={() => navigate(`/jobs/${job.id}`)} 
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-bold focus:outline-none cursor-pointer"
                          >
                            #{job.osNumber || job.id.substring(0, 6)}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => navigate(`/jobs/${job.id}`)} 
                            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left font-medium focus:outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                          >
                            {job.dentistName}
                          </button>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                          <button 
                            onClick={() => navigate(`/jobs/${job.id}`)} 
                            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left font-bold focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer"
                          >
                            {job.patientName}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {job.items?.map(i => `${i.name} (x${i.quantity || 1})`).join(', ') || 
                           job.products?.map(p => `${p.name} (x${p.quantity || 1})`).join(', ') || '---'}
                        </td>
                        <td className="px-6 py-4 max-w-[200px]">
                          {isEditingThis ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                value={editNotesText}
                                onChange={(e) => setEditNotesText(e.target.value)}
                                className="px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                              />
                              <button 
                                onClick={() => handleSaveNotes(job.id, editNotesText)}
                                className="px-2 py-1 bg-green-600 text-white font-bold rounded text-xs hover:bg-green-700"
                              >
                                {t('common.save', 'Salvar')}
                              </button>
                              <button 
                                onClick={() => setEditingJob(null)}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded text-xs"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span className="truncate block max-w-[150px] text-slate-600 dark:text-slate-300" title={job.notes || t('orders.noNotes', 'Sem observações')}>
                                {job.notes || <span className="text-slate-300 dark:text-slate-600 italic">{t('orders.noNotesShort', 'Sem obs')}</span>}
                              </span>
                              <button 
                                onClick={() => {
                                  setEditingJob(job);
                                  setEditNotesText(job.notes || '');
                                }}
                                className="text-blue-500 hover:text-blue-700 text-xs underline cursor-pointer"
                              >
                                {t('common.edit', 'Editar')}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {new Date(job.dueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              job.status === JobStatus.COMPLETED 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : job.status === JobStatus.DELIVERED 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              {job.status === JobStatus.COMPLETED ? t('orders.status.COMPLETED', 'Finalizado') : job.status === JobStatus.DELIVERED ? t('orders.status.DELIVERED', 'Logística') : t('orders.status.PENDING', 'Pendente')}

                            </span>
                            
                            <div className="flex gap-1">
                              {job.status !== JobStatus.COMPLETED && (
                                <button 
                                  onClick={() => handleUpdateStatus(job.id, JobStatus.COMPLETED)}

                                  className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 transition-colors"
                                  title={t('orders.markCompleted', 'Marcar como Finalizado')}
                                >
                                  {t('orders.actionFinalize', 'Finalizar')}
                                </button>
                              )}

                              {job.status !== JobStatus.DELIVERED && (
                                <button 
                                  onClick={() => handleUpdateStatus(job.id, JobStatus.DELIVERED)}

                                  className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded hover:bg-indigo-700 transition-colors"
                                  title={t('orders.sendToLogistics', 'Enviar para Logística')}
                                >
                                  {t('orders.actionLogistics', 'Logística')}
                                </button>
                              )}

                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {freeLabJobs.length > visibleCount && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center">
                        <button 
                            onClick={() => setVisibleCount(prev => prev + 20)}
                            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                        >
                            {t('common.loadMoreJobs', 'Carregar mais trabalhos')}
                        </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={`flex flex-col h-full ${isClient && !isStoreContext ? 'bg-slate-50 dark:bg-[#0B0F17]' : ''}`}>
       {isClient && !isStoreContext && <StoreTopMenu />}

       <div className={`space-y-4 md:space-y-6 pb-20 ${isClient && !isStoreContext ? 'p-4 md:p-6 flex-1 overflow-y-auto' : 'p-4 sm:p-6 max-w-7xl mx-auto w-full'}`}>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{isClient ? t('orders.myOrders', 'Meus Pedidos') : (isBudgetMode ? t('orders.budgetList', 'Lista de Orçamentos') : t('orders.jobsList', 'Lista de Trabalhos'))}</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t('orders.showingResults', { count: filteredJobs.length, defaultValue: `Mostrando ${filteredJobs.length} registros encontrados.` })}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isClient && isBudgetMode && (
             <button onClick={() => navigate('/new-budget')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-tight flex items-center gap-2 active:scale-95 transition-transform text-xs sm:text-sm shadow-sm">
                <PlusCircle size={18} /> {t('orders.newBudget', 'Novo Orçamento')}
             </button>
          )}
          {!isClient && !isBudgetMode && (
             <button onClick={() => navigate('/new-job')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-tight flex items-center gap-2 active:scale-95 transition-transform text-xs sm:text-sm shadow-sm">
                <PlusCircle size={18} /> {t('orders.newCase', 'Novo Caso')}
             </button>
          )}
        </div>
      </div>

      {isClient && (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl max-w-lg gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'ALL' 
                ? 'bg-white dark:bg-[#131B2A] text-slate-800 dark:text-slate-100 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t('common.all', 'Todos')} ({combinedJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE_JOBS')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'ACTIVE_JOBS' 
                ? 'bg-white dark:bg-[#131B2A] text-blue-700 dark:text-blue-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t('orders.filterActive', 'Ativos')} ({combinedJobs.filter(j => !['COMPLETED', 'DELIVERED', 'REJECTED', 'REJECTED_REQUISITION', 'CANCELED'].includes(j.status)).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED_DELIVERED')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'COMPLETED_DELIVERED' 
                ? 'bg-white dark:bg-[#131B2A] text-emerald-700 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t('orders.filterDelivered', 'Entregues')} ({combinedJobs.filter(j => ['COMPLETED', 'DELIVERED'].includes(j.status)).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED_JOBS')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'REJECTED_JOBS' 
                ? 'bg-white dark:bg-[#131B2A] text-rose-700 dark:text-rose-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t('orders.filterRejected', 'Recusados')} ({combinedJobs.filter(j => ['REJECTED', 'REJECTED_REQUISITION', 'CANCELED'].includes(j.status)).length})
          </button>
        </div>
      )}


      <div className="bg-white dark:bg-[#131B2A] p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" size={20} />
                <input 
                    type="text" 
                    placeholder={t('orders.searchPlaceholder', 'Buscar OS, Caixa, Paciente, Dentista...')}
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold ${
                    showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-[#0B0F17] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <SlidersHorizontal size={18} /> {t('common.filters', 'Filtros')}
            </button>
        </div>

        {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-slate-100 dark:border-slate-800 pt-3">
                <MultiSelect 
                    options={statusOptions} 
                    selectedValues={selectedStatuses} 
                    onChange={setSelectedStatuses} 
                    placeholder={t('orders.filterStatusPlaceholder', 'Filtrar Status')}
                />
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100">
                    <option value="">{t('orders.allPriorities', 'Todas Prioridades')}</option>
                    {Object.values(UrgencyLevel).map(u => <option key={u} value={u}>{u}</option>)}
                </select>

                {!isClient && (
                    <>
                        <MultiSelect 
                            options={dentistOptions} 
                            selectedValues={selectedDentists} 
                            onChange={setSelectedDentists} 
                            placeholder={t('orders.filterDentistsPlaceholder', 'Filtrar Dentistas')}
                        />
                        <MultiSelect 
                            options={collaboratorOptions} 
                            selectedValues={selectedCollaborators} 
                            onChange={setSelectedCollaborators} 
                            placeholder={t('orders.filterCollaboratorsPlaceholder', 'Filtrar Colaboradores')}
                        />
                        <MultiSelect 
                            options={sectorOptions} 
                            selectedValues={selectedSectors} 
                            onChange={setSelectedSectors} 
                            placeholder={t('orders.filterSectorsPlaceholder', 'Filtrar Setores')}
                        />
                    </>
                )}


                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100" title={t('common.startDate', 'Data Inicial')} />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100" title={t('common.endDate', 'Data Final')} />
                <select value={filterOrigin} onChange={e => setFilterOrigin(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100">
                    <option value="ALL">{t('orders.origin.ALL', 'Todas as Origens')}</option>
                    <option value="MANUAL">{t('orders.origin.MANUAL', 'Cadastrado Manual')}</option>
                    <option value="ONLINE_ORDER">{t('orders.origin.ONLINE_ORDER', 'Pedido Online')}</option>
                    <option value="ONLINE_REQUISITION">{t('orders.origin.ONLINE_REQUISITION', 'Requisição Online')}</option>
                    <option value="OUTSOURCING">{t('orders.origin.OUTSOURCING', 'Terceirização')}</option>
                </select>
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#0B0F17] cursor-pointer">
                    <input type="checkbox" checked={filterAttention} onChange={e => setFilterAttention(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('orders.onlyAttention', 'Apenas Atenção (+18h)')}</span>
                </label>
            </div>
        )}

      </div>

      {/* VIEW PARA DESKTOP (TABELA) */}

      <div className="hidden md:block bg-white dark:bg-[#131B2A] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-400 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-4">{isBudgetMode ? t('orders.table.budgetNumber', 'Orçamento #') : t('orders.table.osNumber', 'OS #')}</th>
                        {!isClient && !isBudgetMode && <th className="p-4">{t('orders.table.box', 'Caixa')}</th>}
                        
                        {!isBudgetMode && <th className="p-4">{t('orders.table.patient', 'Paciente')}</th>}
                        {isBudgetMode && <th className="p-4">{t('orders.table.dentist', 'Dentista')}</th>}
                        
                        {!isBudgetMode && <th className="p-4">{t('orders.table.origin', 'Origem')}</th>}
                        
                        {!isBudgetMode && <th className="p-4">{t('orders.table.dentist', 'Dentista')}</th>}
                        {isBudgetMode && <th className="p-4">{t('orders.table.patient', 'Paciente')}</th>}

                        {!isBudgetMode && <th className="p-4">{t('orders.table.status', 'Status')}</th>}
                        {!isBudgetMode && <th className="p-4">{isClient ? t('orders.table.sector', 'Setor') : t('orders.table.sectorTime', 'Setor/Tempo')}</th>}
                        
                        <th className="p-4">{isBudgetMode ? t('orders.table.createdAt', 'Data de Criação') : t('orders.table.dueDate', 'Entrega')}</th>
                        {isBudgetMode && <th className="p-4 text-right">{t('orders.table.finalValue', 'Valor Final')}</th>}
                        {!isBudgetMode && <th className="p-4 text-right">{t('orders.table.actions', 'Ações')}</th>}
                        {isBudgetMode && <th className="p-4 text-right">{t('orders.table.actions', 'Ações')}</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredJobs.slice(0, visibleCount).map(job => (
                        <JobRow 
                            key={job.id} 
                            job={job} 
                            isClient={isClient}
                            isBudgetMode={isBudgetMode}
                            isLabStaff={isLabStaff}
                            navigate={navigate}
                            handleFinalizeJob={handleFinalizeJob}
                            handleReopenJob={handleReopenJob}
                            setRouteModalJob={setRouteModalJob}
                            getStatusColor={getStatusColor}
                            getTranslatedStatus={getTranslatedStatus}
                            isJobOverdue={isJobOverdue}
                            getSectorTimeInfo={getSectorTimeInfo}
                            revealJobStatus={revealJobStatus}
                        />
                    ))}

                    
                    {filteredJobs.length > visibleCount && (
                        <tr>
                            <td colSpan={8} className="p-4 text-center">
                                <button 
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors text-sm"
                                >
                                    {t('common.loadMoreJobs', 'Carregar mais trabalhos')}
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* VIEW PARA MOBILE (CARDS) */}

      <div className="md:hidden space-y-4">
        {filteredJobs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-[#131B2A] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">{t('orders.noOrdersFound', 'Nenhum pedido encontrado.')}</div>
        ) : (
            filteredJobs.slice(0, visibleCount).map(job => (
                <JobCard 
                    key={job.id}
                    job={job}
                    navigate={navigate}
                    getStatusColor={getStatusColor}
                    getTranslatedStatus={getTranslatedStatus}
                    getSectorTimeInfo={getSectorTimeInfo}
                    isClient={isClient}
                    isBudgetMode={isBudgetMode}
                    revealJobStatus={revealJobStatus}
                />
            ))
        )}

        {filteredJobs.length > visibleCount && (
            <div className="p-4 flex justify-center">
                <button 
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors text-sm"
                >
                    {t('common.loadMoreJobs', 'Carregar mais trabalhos')}
                </button>
            </div>
        )}
      </div>

      {/* ROUTE MODAL */}

      {routeModalJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#131B2A] rounded-3xl shadow-2xl w-full max-w-md p-4 sm:p-6 animate-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Truck className="text-indigo-600 dark:text-indigo-400" /> {t('orders.scaleForDelivery', 'Escalar p/ Entrega')}</h3>
                      <button onClick={() => setRouteModalJob(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('orders.routeDate', 'Data da Rota')}</label>
                          <input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 rounded-xl" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('orders.shift', 'Turno')}</label>
                          <select value={routeShift} onChange={e => setRouteShift(e.target.value as any)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-[#0B0F17]">
                              <option value="MORNING">{t('orders.morning', 'Manhã')}</option>
                              <option value="AFTERNOON">{t('orders.afternoon', 'Tarde')}</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('orders.courier', 'Motoboy')}</label>
                          {couriers.filter(c => c.active).length > 0 ? (
                              <div className="space-y-2">
                                  <select value={routeDriver} onChange={e => setRouteDriver(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-[#0B0F17]">
                                      <option value="">{t('orders.selectCourier', 'Selecione um motoboy...')}</option>
                                      {couriers.filter(c => c.active).map(c => (
                                          <option key={c.id} value={c.name}>{c.name} {c.vehicle ? `(${c.vehicle})` : ''}</option>
                                      ))}
                                      <option value="MANUAL">{t('orders.otherManual', 'Outro (Digitar nome)')}</option>
                                  </select>
                                  {(!couriers.filter(c => c.active).map(c => c.name).includes(routeDriver) || routeDriver === 'MANUAL') && (
                                      <input 
                                          placeholder={t('orders.courierNamePlaceholder', 'Digite o nome do Motoboy')}
                                          value={routeDriver === 'MANUAL' ? '' : routeDriver} 
                                          onChange={e => setRouteDriver(e.target.value)} 
                                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-[#0B0F17]" 
                                      />
                                  )}
                              </div>
                          ) : (
                              <input placeholder={t('orders.courierNamePlaceholder', 'Nome do Motoboy')} value={routeDriver} onChange={e => setRouteDriver(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-[#0B0F17]" />
                          )}
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('orders.deliveryNotes', 'Observações de Entrega (Opcional)')}</label>
                          <textarea 
                              placeholder={t('orders.deliveryNotesPlaceholder', 'Instruções adicionais para a entrega...')}
                              value={routeObservations}
                              onChange={e => setRouteObservations(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-[#0B0F17] resize-none h-20"
                          />
                      </div>
                      <button onClick={handleAddToRoute} disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                          {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> {t('orders.confirmInRoute', 'CONFIRMAR NA ROTA')}</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
    </div>
  );
}