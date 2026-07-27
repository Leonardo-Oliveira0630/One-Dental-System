import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Job, OnlineRequisition, JobStatus, ManualDentist, Organization } from '../../types';
import { 
  Briefcase, Building, Search, Filter, Calendar, Clock, 
  CheckCircle2, AlertCircle, MessageSquare, Eye, ChevronRight, 
  ChevronDown, ShoppingBag, ClipboardList, FileText, Stethoscope, 
  Sparkles, RefreshCw, Layers, User as UserIcon, ExternalLink, X, 
  Tag, Activity, ArrowRight, ShieldAlert, CheckCircle, Package
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import * as api from '../../services/firebaseService';
import { db } from '../../services/firebaseConfig';
import * as firestorePkg from 'firebase/firestore';

const { collection, onSnapshot, query, where } = firestorePkg as any;

type OriginFilter = 'ALL' | 'INTERNAL' | 'REQUISITION' | 'STORE';
type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETED';

interface UnifiedCase {
  id: string;
  osNumber: string;
  patientName: string;
  dentistName: string;
  labId: string;
  labName: string;
  origin: 'INTERNAL' | 'REQUISITION' | 'STORE';
  status: JobStatus | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  statusLabel: string;
  currentSector?: string;
  servicesText: string;
  teethText?: string;
  createdAt: Date;
  dueDate?: Date;
  rawJob?: Job;
  rawReq?: OnlineRequisition;
  totalValue?: number;
}

export const DentistCases = () => {
  const { 
    currentUser, 
    userConnections, 
    allLaboratories, 
    activeOrganization, 
    switchActiveOrganization 
  } = useApp();

  const navigate = useNavigate();

  // Selected Laboratory
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  
  // Real-time data states
  const [labManualDentists, setLabManualDentists] = useState<ManualDentist[]>([]);
  const [labJobs, setLabJobs] = useState<Job[]>([]);
  const [labRequisitions, setLabRequisitions] = useState<OnlineRequisition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');

  // Quick view modal
  const [selectedCase, setSelectedCase] = useState<UnifiedCase | null>(null);

  // List of connected laboratories available for selection
  const availableLabs = useMemo(() => {
    const list: Array<{ id: string; name: string; logoUrl?: string }> = [];
    const addedIds = new Set<string>();

    // 1. From userConnections
    (userConnections || []).forEach(conn => {
      if (!addedIds.has(conn.organizationId)) {
        addedIds.add(conn.organizationId);
        const labObj = allLaboratories.find(l => l.id === conn.organizationId);
        list.push({
          id: conn.organizationId,
          name: labObj?.name || conn.organizationName || 'Laboratório',
          logoUrl: labObj?.logoUrl
        });
      }
    });

    // 2. Active organization if it's a lab
    if (activeOrganization && (activeOrganization.orgType === 'LAB' || activeOrganization.orgType === 'LAB_OUTSOURCED')) {
      if (!addedIds.has(activeOrganization.id)) {
        addedIds.add(activeOrganization.id);
        list.push({
          id: activeOrganization.id,
          name: activeOrganization.name,
          logoUrl: activeOrganization.logoUrl
        });
      }
    }

    // 3. All laboratories if no connections exist
    if (list.length === 0) {
      allLaboratories.forEach(lab => {
        if (!addedIds.has(lab.id)) {
          addedIds.add(lab.id);
          list.push({
            id: lab.id,
            name: lab.name,
            logoUrl: lab.logoUrl
          });
        }
      });
    }

    return list;
  }, [userConnections, allLaboratories, activeOrganization]);

  // Set default selected lab
  useEffect(() => {
    if (!selectedLabId && availableLabs.length > 0) {
      const activeInList = availableLabs.find(l => l.id === activeOrganization?.id);
      setSelectedLabId(activeInList ? activeInList.id : availableLabs[0].id);
    }
  }, [availableLabs, activeOrganization, selectedLabId]);

  // Get current selected lab details
  const selectedLab = useMemo(() => {
    return availableLabs.find(l => l.id === selectedLabId) || 
           allLaboratories.find(l => l.id === selectedLabId) ||
           { id: selectedLabId, name: 'Laboratório Selecionado' };
  }, [availableLabs, allLaboratories, selectedLabId]);

  // Clean digits helper
  const cleanDigits = (str?: string) => (str ? str.replace(/\D/g, '') : '');

  // Listen to ManualDentists for selected lab
  useEffect(() => {
    if (!selectedLabId) return;
    setIsLoading(true);
    const unsub = api.subscribeManualDentists(selectedLabId, (dentists) => {
      setLabManualDentists(dentists);
    });
    return () => unsub();
  }, [selectedLabId]);

  // Find matching manualDentist IDs for the logged-in user in this lab
  const matchedManualDentistIds = useMemo(() => {
    if (!currentUser) return [];
    const userEmail = currentUser.email?.toLowerCase().trim();
    const userCpfCnpj = cleanDigits(currentUser.cpfCnpj);
    const userId = currentUser.id;

    const matched = labManualDentists.filter(m => {
      if (m.userId && m.userId === userId) return true;
      if (userEmail && m.email && m.email.toLowerCase().trim() === userEmail) return true;
      if (userCpfCnpj && m.cpfCnpj && cleanDigits(m.cpfCnpj) === userCpfCnpj) return true;
      if (currentUser.manualDentistId && m.id === currentUser.manualDentistId) return true;
      return false;
    });

    return matched.map(m => m.id);
  }, [currentUser, labManualDentists]);

  // Listen to Jobs in selected lab
  useEffect(() => {
    if (!selectedLabId || !currentUser) return;

    const dentistIds = Array.from(new Set([
      currentUser.id,
      ...matchedManualDentistIds
    ].filter(Boolean)));

    const qJobs = query(collection(db, `organizations/${selectedLabId}/jobs`));

    const unsubJobs = onSnapshot(qJobs, (snap: any) => {
      const allJobs: Job[] = snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt || Date.now()),
        dueDate: d.data().dueDate?.toDate ? d.data().dueDate.toDate() : new Date(d.data().dueDate || Date.now())
      } as Job));

      // Filter jobs belonging to this dentist
      const userEmail = currentUser.email?.toLowerCase().trim();
      const userCpfCnpj = cleanDigits(currentUser.cpfCnpj);

      const filtered = allJobs.filter(job => {
        if (dentistIds.includes(job.dentistId)) return true;
        if (job.dentistUserId && job.dentistUserId === currentUser.id) return true;
        if (userEmail && (job as any).dentistEmail && (job as any).dentistEmail.toLowerCase().trim() === userEmail) return true;
        if (userCpfCnpj && (job as any).dentistCpfCnpj && cleanDigits((job as any).dentistCpfCnpj) === userCpfCnpj) return true;
        return false;
      });

      setLabJobs(filtered);
      setIsLoading(false);
    }, (error: any) => {
      console.warn('[DentistCases] Erro ao buscar trabalhos do laboratório:', error);
      setIsLoading(false);
    });

    return () => unsubJobs();
  }, [selectedLabId, currentUser, matchedManualDentistIds]);

  // Listen to Online Requisitions in selected lab
  useEffect(() => {
    if (!selectedLabId || !currentUser) return;

    const qReqs = query(
      collection(db, `organizations/${selectedLabId}/requisitions`),
      where('dentistId', '==', currentUser.id)
    );

    const unsubReqs = onSnapshot(qReqs, (snap: any) => {
      const list = snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt || Date.now())
      } as OnlineRequisition));

      setLabRequisitions(list);
    }, (error: any) => {
      console.warn('[DentistCases] Erro ao buscar requisições do laboratório:', error);
    });

    return () => unsubReqs();
  }, [selectedLabId, currentUser]);

  // Combine Jobs and Requisitions into Unified Cases
  const unifiedCases = useMemo(() => {
    const casesMap = new Map<string, UnifiedCase>();

    // 1. Process Jobs
    labJobs.forEach(job => {
      let origin: 'INTERNAL' | 'REQUISITION' | 'STORE' = 'INTERNAL';
      if (job.origin === 'ONLINE_ORDER' || job.isComboPurchase || job.osNumber?.startsWith('WEB-') || job.osNumber?.startsWith('STORE-')) {
        origin = 'STORE';
      } else if (job.origin === 'ONLINE_REQUISITION' || (job as any).requisitionId || job.osNumber?.startsWith('REQ-')) {
        origin = 'REQUISITION';
      }

      let statusLabel = 'Em Produção';
      switch (job.status) {
        case JobStatus.PENDING: statusLabel = 'Pendente'; break;
        case JobStatus.IN_PROGRESS: statusLabel = 'Em Produção'; break;
        case JobStatus.WAITING_APPROVAL: statusLabel = 'Aguardando Aprovação'; break;
        case JobStatus.SECTOR_TRANSITION: statusLabel = 'Em Transição'; break;
        case JobStatus.COMPLETED: statusLabel = 'Concluído'; break;
        case JobStatus.DELIVERED: statusLabel = 'Entregue'; break;
        case JobStatus.RETURNED: statusLabel = 'Retorno'; break;
        case JobStatus.CANCELED: statusLabel = 'Cancelado'; break;
        case JobStatus.REJECTED: statusLabel = 'Recusado'; break;
      }

      const servicesText = job.items && job.items.length > 0 
        ? job.items.map(i => i.name).join(', ')
        : 'Serviço Odontológico';

      const teethList = job.items?.flatMap(i => i.selectedTeeth || []).filter(Boolean);
      const teethText = teethList && teethList.length > 0 ? Array.from(new Set(teethList)).join(', ') : undefined;

      const uCase: UnifiedCase = {
        id: job.id,
        osNumber: job.osNumber || `OS-${job.id.substring(0, 6)}`,
        patientName: job.patientName || 'Paciente não informado',
        dentistName: job.dentistName || currentUser?.name || 'Dentista',
        labId: selectedLabId,
        labName: selectedLab.name,
        origin,
        status: job.status,
        statusLabel,
        currentSector: job.currentSector || 'Recepção / Triagem',
        servicesText,
        teethText,
        createdAt: job.createdAt || new Date(),
        dueDate: job.dueDate,
        rawJob: job,
        totalValue: job.totalValue
      };

      casesMap.set(job.id, uCase);
    });

    // 2. Process Requisitions (only if not already accepted as a job)
    labRequisitions.forEach(req => {
      if (req.acceptedAsJobId && casesMap.has(req.acceptedAsJobId)) {
        // Already converted to job, update origin if needed
        const existingCase = casesMap.get(req.acceptedAsJobId)!;
        existingCase.rawReq = req;
        return;
      }

      let statusLabel = 'Aguardando Aceite';
      if (req.status === 'ACCEPTED') statusLabel = 'Aceito pelo Laboratório';
      if (req.status === 'REJECTED') statusLabel = 'Recusado pelo Laboratório';

      const uCase: UnifiedCase = {
        id: req.id,
        osNumber: `REQ-${req.id.substring(0, 6).toUpperCase()}`,
        patientName: req.patientName || 'Paciente não informado',
        dentistName: req.dentistName || currentUser?.name || 'Dentista',
        labId: selectedLabId,
        labName: selectedLab.name,
        origin: 'REQUISITION',
        status: req.status,
        statusLabel,
        currentSector: 'Aguardando Análise do Lab',
        servicesText: req.serviceName || (req.items ? req.items.map(i => i.serviceName).join(', ') : 'Requisição Online'),
        createdAt: req.createdAt || new Date(),
        rawReq: req
      };

      casesMap.set(`req_${req.id}`, uCase);
    });

    const list = Array.from(casesMap.values());
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list;
  }, [labJobs, labRequisitions, selectedLabId, selectedLab.name, currentUser]);

  // Filtered Cases according to searchQuery, originFilter, statusFilter
  const filteredCases = useMemo(() => {
    return unifiedCases.filter(c => {
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesOS = c.osNumber.toLowerCase().includes(query);
        const matchesPatient = c.patientName.toLowerCase().includes(query);
        const matchesServices = c.servicesText.toLowerCase().includes(query);
        if (!matchesOS && !matchesPatient && !matchesServices) return false;
      }

      // Origin Filter
      if (originFilter === 'INTERNAL' && c.origin !== 'INTERNAL') return false;
      if (originFilter === 'REQUISITION' && c.origin !== 'REQUISITION') return false;
      if (originFilter === 'STORE' && c.origin !== 'STORE') return false;

      // Status Filter
      if (statusFilter === 'ACTIVE') {
        const isDone = (c.status as string) === JobStatus.COMPLETED || (c.status as string) === JobStatus.DELIVERED || (c.status as string) === JobStatus.CANCELED || (c.status as string) === JobStatus.REJECTED || (c.status as string) === 'REJECTED';
        if (isDone) return false;
      } else if (statusFilter === 'PENDING') {
        const isPending = (c.status as string) === JobStatus.PENDING || (c.status as string) === JobStatus.WAITING_APPROVAL || (c.status as string) === 'PENDING';
        if (!isPending) return false;
      } else if (statusFilter === 'COMPLETED') {
        const isDone = (c.status as string) === JobStatus.COMPLETED || (c.status as string) === JobStatus.DELIVERED;
        if (!isDone) return false;
      }

      return true;
    });
  }, [unifiedCases, searchQuery, originFilter, statusFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = unifiedCases.length;
    const active = unifiedCases.filter(c => 
      (c.status as string) !== JobStatus.COMPLETED && 
      (c.status as string) !== JobStatus.DELIVERED && 
      (c.status as string) !== JobStatus.CANCELED && 
      (c.status as string) !== JobStatus.REJECTED && 
      (c.status as string) !== 'REJECTED'
    ).length;
    const waitingApproval = unifiedCases.filter(c => 
      (c.status as string) === JobStatus.WAITING_APPROVAL || (c.status as string) === JobStatus.PENDING || (c.status as string) === 'PENDING'
    ).length;
    const completed = unifiedCases.filter(c => 
      (c.status as string) === JobStatus.COMPLETED || (c.status as string) === JobStatus.DELIVERED
    ).length;

    return { total, active, waitingApproval, completed };
  }, [unifiedCases]);

  // Origin Badge Render Helper
  const renderOriginBadge = (origin: 'INTERNAL' | 'REQUISITION' | 'STORE') => {
    switch (origin) {
      case 'INTERNAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
            <FileText size={12} />
            Trabalho Interno
          </span>
        );
      case 'REQUISITION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
            <ClipboardList size={12} />
            Requisição Online
          </span>
        );
      case 'STORE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <ShoppingBag size={12} />
            Loja Online
          </span>
        );
    }
  };

  // Status Badge Render Helper
  const renderStatusBadge = (status: JobStatus | 'PENDING' | 'ACCEPTED' | 'REJECTED') => {
    switch (status) {
      case JobStatus.IN_PROGRESS:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Activity size={12} className="animate-spin text-amber-600" />
            Em Produção
          </span>
        );
      case JobStatus.WAITING_APPROVAL:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <ShieldAlert size={12} />
            Aguardando Aprovação
          </span>
        );
      case JobStatus.COMPLETED:
      case JobStatus.DELIVERED:
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} />
            {status === JobStatus.DELIVERED ? 'Entregue' : 'Concluído'}
          </span>
        );
      case JobStatus.CANCELED:
      case JobStatus.REJECTED:
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <X size={12} />
            Cancelado / Recusado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} />
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Briefcase size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Meus Casos</h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                Acompanhe todos os seus trabalhos internos, requisições e compras da loja online.
              </p>
            </div>
          </div>
        </div>

        {/* LABORATORY SELECTOR DROPDOWN */}
        <div className="w-full md:w-auto flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
          <Building size={18} className="text-slate-500 ml-2 shrink-0" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Lab:</span>
          <select
            value={selectedLabId}
            onChange={(e) => {
              setSelectedLabId(e.target.value);
              switchActiveOrganization(e.target.value);
            }}
            className="w-full md:w-64 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="lab-selector-dropdown"
          >
            {availableLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => { setStatusFilter('ALL'); setOriginFilter('ALL'); }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-blue-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Casos</span>
            <Layers size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2">{stats.total}</div>
          <span className="text-[10px] text-slate-400 font-medium">No laboratório selecionado</span>
        </div>

        <div 
          onClick={() => { setStatusFilter('ACTIVE'); }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Em Produção</span>
            <Activity size={18} className="text-amber-500 group-hover:animate-spin" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-600 mt-2">{stats.active}</div>
          <span className="text-[10px] text-slate-400 font-medium">Trabalhos em andamento</span>
        </div>

        <div 
          onClick={() => { setStatusFilter('PENDING'); }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-rose-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Aguardando Aprovação</span>
            <ShieldAlert size={18} className="text-rose-500" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-rose-600 mt-2">{stats.waitingApproval}</div>
          <span className="text-[10px] text-slate-400 font-medium">Aprovações e autorizações</span>
        </div>

        <div 
          onClick={() => { setStatusFilter('COMPLETED'); }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Concluídos / Entregues</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-600 mt-2">{stats.completed}</div>
          <span className="text-[10px] text-slate-400 font-medium">Casos finalizados</span>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* SEARCH INPUT */}
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por OS, Paciente ou Serviço..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              id="search-cases-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* ORIGIN FILTER BUTTONS */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setOriginFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                originFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todos os Origens
            </button>
            <button
              onClick={() => setOriginFilter('INTERNAL')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                originFilter === 'INTERNAL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={12} />
              Trabalhos Internos
            </button>
            <button
              onClick={() => setOriginFilter('REQUISITION')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                originFilter === 'REQUISITION' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList size={12} />
              Requisições
            </button>
            <button
              onClick={() => setOriginFilter('STORE')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                originFilter === 'STORE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingBag size={12} />
              Loja Online
            </button>
          </div>
        </div>

        {/* STATUS TAB FILTER */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ACTIVE' 
                ? 'bg-amber-500/10 text-amber-700 border border-amber-300' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Em Aberto / Em Produção
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'PENDING' 
                ? 'bg-rose-500/10 text-rose-700 border border-rose-300' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Aguardando Aprovação
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'COMPLETED' 
                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-300' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Concluídos
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ALL' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Ver Todos
          </button>
        </div>
      </div>

      {/* CASES LIST / TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
            <RefreshCw size={32} className="animate-spin text-blue-600" />
            <p className="text-sm font-semibold">Carregando seus casos do laboratório...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
            <div className="p-4 bg-slate-100 rounded-full text-slate-400">
              <Briefcase size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Nenhum caso encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Não há trabalhos ou requisições cadastradas em seu nome no laboratório <strong className="text-slate-700">{selectedLab.name}</strong> para o filtro selecionado.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/requisitions')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-1.5"
              >
                <ClipboardList size={14} /> Enviar Nova Requisição
              </button>
              <button
                onClick={() => navigate('/store')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-1.5"
              >
                <ShoppingBag size={14} /> Ir para Loja Online
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* TABLE HEADER - Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-wider">
              <div className="col-span-2">Nº OS / Código</div>
              <div className="col-span-3">Paciente</div>
              <div className="col-span-2">Origem</div>
              <div className="col-span-2">Status / Setor</div>
              <div className="col-span-2">Data / Previsão</div>
              <div className="col-span-1 text-right">Ação</div>
            </div>

            {/* CASES ROWS */}
            {filteredCases.map((c) => (
              <div
                key={c.id}
                className="p-4 md:px-6 md:py-4 hover:bg-slate-50/80 transition-colors flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center group"
              >
                {/* OS Number & Patient */}
                <div className="col-span-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (c.rawJob) {
                        navigate(`/jobs/${c.rawJob.id}`);
                      } else {
                        setSelectedCase(c);
                      }
                    }}
                    className="font-mono text-sm font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    {c.osNumber}
                  </button>
                </div>

                <div className="col-span-3">
                  <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                    <UserIcon size={14} className="text-slate-400 shrink-0" />
                    {c.patientName}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {c.servicesText}
                    {c.teethText && <span className="text-blue-600 font-semibold ml-1">(Dentes: {c.teethText})</span>}
                  </div>
                </div>

                {/* Origin */}
                <div className="col-span-2">
                  {renderOriginBadge(c.origin)}
                </div>

                {/* Status & Current Sector */}
                <div className="col-span-2 space-y-1">
                  <div>{renderStatusBadge(c.status)}</div>
                  {c.currentSector && (
                    <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Activity size={10} className="text-slate-400" />
                      Setor: {c.currentSector}
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="col-span-2 text-xs text-slate-500 font-medium space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    Criado: {c.createdAt.toLocaleDateString('pt-BR')}
                  </div>
                  {c.dueDate && (
                    <div className="flex items-center gap-1 text-slate-700 font-semibold">
                      <Clock size={12} className="text-blue-500" />
                      Entrega: {c.dueDate.toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => {
                      if (c.rawJob) {
                        navigate(`/jobs/${c.rawJob.id}`);
                      } else {
                        setSelectedCase(c);
                      }
                    }}
                    className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-xl transition-all flex items-center gap-1 text-xs font-bold group-hover:shadow-md"
                    title="Ver Resumo do Trabalho"
                  >
                    <Eye size={16} />
                    <span className="md:hidden">Ver Resumo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK VIEW MODAL */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6 relative animate-in zoom-in-95 duration-200">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setSelectedCase(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            {/* HEADER */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {renderOriginBadge(selectedCase.origin)}
                {renderStatusBadge(selectedCase.status)}
              </div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                Caso OS: {selectedCase.osNumber}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Laboratório: <strong className="text-slate-800">{selectedCase.labName}</strong>
              </p>
            </div>

            {/* CASE DETAILS */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Paciente</span>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <UserIcon size={16} className="text-blue-600" />
                  {selectedCase.patientName}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Serviços / Trabalhos</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {selectedCase.servicesText}
                </p>
                {selectedCase.teethText && (
                  <p className="text-xs font-bold text-blue-600 mt-1">
                    Dentes Selecionados: {selectedCase.teethText}
                  </p>
                )}
              </div>

              {selectedCase.currentSector && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Setor Atual no Laboratório</span>
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 w-fit mt-1 flex items-center gap-1">
                    <Activity size={12} className="animate-spin text-amber-600" />
                    {selectedCase.currentSector}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Data de Entrada</span>
                  <p className="font-medium mt-0.5">{selectedCase.createdAt.toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedCase.dueDate && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Previsão de Entrega</span>
                    <p className="font-bold text-blue-600 mt-0.5">{selectedCase.dueDate.toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              {selectedCase.rawJob ? (
                <button
                  onClick={() => {
                    const jobId = selectedCase.rawJob!.id;
                    setSelectedCase(null);
                    navigate(`/jobs/${jobId}`);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all text-sm"
                >
                  Abrir Resumo Completo
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedCase(null);
                    navigate('/requisitions');
                  }}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all text-sm"
                >
                  Ver Painel de Requisições
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
