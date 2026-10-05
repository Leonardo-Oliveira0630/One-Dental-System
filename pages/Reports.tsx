import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { 
  FileText, Download, Filter, Calendar, Users, Building2, Package, Search, X, 
  DollarSign, TrendingUp, ChevronDown, ChevronUp, ChevronRight, FileSpreadsheet, 
  ArrowUpDown, Wallet, UserCheck, Stethoscope, CheckCircle2, Clock, AlertCircle,
  BarChart3, Sparkles, Lock, ArrowLeft, User as UserIcon, Layers, History, ShieldAlert
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { JobStatus, Job, UserRole } from '../types';

export interface ClientSummaryStat {
  clientId: string;
  clientName: string;
  clinicName: string;
  email?: string;
  phone?: string;
  totalJobs: number;
  totalItems: number;
  totalBilling: number;
  averageTicket: number;
  percentage: number;
  jobs: Job[];
  statusBreakdown: {
    pending: number;
    inProgress: number;
    completed: number;
    delivered: number;
    canceled: number;
  };
}

export default function Reports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { jobs, allUsers, manualDentists, sectors, jobTypes, currentOrg, currentUser } = useApp();
  
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;

  const userPerms = useMemo(() => currentUser?.permissions || [], [currentUser?.permissions]);

  // Check if user has any specific granular view permissions set
  const hasGranularViewPerms = useMemo(() => {
    return userPerms.some(p => 
      ['reports:client_summary:view', 'reports:production:view', 'reports:detailed_orders:view', 'reports:service_types:view'].includes(p as any)
    );
  }, [userPerms]);

  // Granular view permissions for each report type
  const canViewClientSummary = Boolean(
    isAdmin || isManager || 
    userPerms.includes('reports:client_summary:view') || 
    (!hasGranularViewPerms && userPerms.includes('reports:view'))
  );

  const canViewProduction = Boolean(
    isAdmin || isManager || 
    userPerms.includes('reports:production:view') || 
    (!hasGranularViewPerms && userPerms.includes('reports:view'))
  );

  const canViewDetailedOrders = Boolean(
    isAdmin || isManager || 
    userPerms.includes('reports:detailed_orders:view') || 
    (!hasGranularViewPerms && userPerms.includes('reports:view'))
  );

  const canViewServiceTypes = Boolean(
    isAdmin || isManager || 
    userPerms.includes('reports:service_types:view') || 
    (!hasGranularViewPerms && userPerms.includes('reports:view'))
  );

  const hasAnyReportView = canViewClientSummary || canViewProduction || canViewDetailedOrders || canViewServiceTypes;

  // Granular export permissions for each report type
  const hasGlobalExport = userPerms.includes('reports:export');

  const canExportClientSummary = Boolean(
    isAdmin || isManager || hasGlobalExport || userPerms.includes('reports:client_summary:export')
  );

  const canExportProduction = Boolean(
    isAdmin || isManager || hasGlobalExport || userPerms.includes('reports:production:export')
  );

  const canExportDetailedOrders = Boolean(
    isAdmin || isManager || hasGlobalExport || userPerms.includes('reports:detailed_orders:export')
  );

  const canExportServiceTypes = Boolean(
    isAdmin || isManager || hasGlobalExport || userPerms.includes('reports:service_types:export')
  );

  // Available report types for navigation based on view permissions
  const availableReportTabs = useMemo(() => {
    const tabs: {
      type: 'CLIENT_SUMMARY' | 'PRODUCTION' | 'DETAILED_ORDERS' | 'SERVICE_TYPES';
      label: string;
      icon: any;
      activeColor: string;
      textColor: string;
      canExport: boolean;
    }[] = [];

    if (canViewClientSummary) {
      tabs.push({
        type: 'CLIENT_SUMMARY',
        label: t('reports.clientSummary', 'Resumo por Cliente'),
        icon: Users,
        activeColor: 'bg-white text-teal-700 shadow-sm border border-slate-200/60',
        textColor: 'text-teal-600',
        canExport: canExportClientSummary
      });
    }
    if (canViewProduction) {
      tabs.push({
        type: 'PRODUCTION',
        label: t('reports.basicProduction', 'Produção Básica'),
        icon: BarChart3,
        activeColor: 'bg-white text-indigo-700 shadow-sm border border-slate-200/60',
        textColor: 'text-indigo-600',
        canExport: canExportProduction
      });
    }
    if (canViewDetailedOrders) {
      tabs.push({
        type: 'DETAILED_ORDERS',
        label: t('reports.detailedOrders', 'Pedidos Detalhado'),
        icon: FileText,
        activeColor: 'bg-white text-amber-700 shadow-sm border border-slate-200/60',
        textColor: 'text-amber-600',
        canExport: canExportDetailedOrders
      });
    }
    if (canViewServiceTypes) {
      tabs.push({
        type: 'SERVICE_TYPES',
        label: t('reports.serviceTypes', 'Tipos de Serviço'),
        icon: Package,
        activeColor: 'bg-white text-purple-700 shadow-sm border border-slate-200/60',
        textColor: 'text-purple-600',
        canExport: canExportServiceTypes
      });
    }

    return tabs;
  }, [
    canViewClientSummary, canViewProduction, canViewDetailedOrders, canViewServiceTypes,
    canExportClientSummary, canExportProduction, canExportDetailedOrders, canExportServiceTypes,
    t
  ]);

  // Status translation helper
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return t('status.pending', 'Pendente');
      case 'IN_PROGRESS': return t('status.inProgress', 'Em Produção');
      case 'WAITING_APPROVAL': return t('status.waitingApproval', 'Aguardando Aprovação');
      case 'COMPLETED': return t('status.completed', 'Finalizado');
      case 'DELIVERED': return t('status.delivered', 'Entregue');
      case 'REJECTED': return t('status.rejected', 'Rejeitado');
      case 'CANCELED': return t('status.canceled', 'Cancelado');
      case 'RETURNED': return t('status.returned', 'Devolvido');
      case 'SECTOR_TRANSITION': return t('status.sectorTransition', 'Em Transição');
      default: return status;
    }
  };

  // Date and filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateType, setDateType] = useState<'CREATED' | 'DUE'>('CREATED');
  const [dentistId, setDentistId] = useState('');
  const [dentistSearchText, setDentistSearchText] = useState('');
  const [showDentistDropdown, setShowDentistDropdown] = useState(false);
  const dentistDropdownRef = useRef<HTMLDivElement>(null);

  // Patient filter & search states
  const [patientFilter, setPatientFilter] = useState('');
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  const [collaboratorId, setCollaboratorId] = useState('');
  const [sector, setSector] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [variationFilters, setVariationFilters] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'DATE' | 'JOB_TYPE' | 'LIST' | 'COLLABORATOR'>('DATE');
  const [reportType, setReportType] = useState<'CLIENT_SUMMARY' | 'PRODUCTION' | 'DETAILED_ORDERS' | 'SERVICE_TYPES'>('CLIENT_SUMMARY');

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dentistDropdownRef.current && !dentistDropdownRef.current.contains(event.target as Node)) {
        setShowDentistDropdown(false);
      }
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Consolidate and sort all available clients / dentists alphabetically
  const allClientOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; clinicName?: string; phone?: string; email?: string }>();
    
    manualDentists.forEach(d => {
      map.set(d.id, {
        id: d.id,
        name: d.name,
        clinicName: d.clinicName || (d as any).address,
        phone: (d as any).phone || (d as any).whatsapp,
        email: d.email
      });
    });

    allUsers.filter(u => u.role === UserRole.DENTIST || (u.role as any) === 'CLIENT').forEach(u => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          name: u.name,
          clinicName: (u as any).clinicName,
          phone: (u as any).phone || (u as any).whatsapp,
          email: u.email
        });
      }
    });

    jobs.forEach(j => {
      if (j.dentistId && !map.has(j.dentistId)) {
        map.set(j.dentistId, {
          id: j.dentistId,
          name: j.dentistName || 'Cliente',
          clinicName: j.clinicName
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  }, [manualDentists, allUsers, jobs]);

  // Filtered client options based on search query
  const filteredDentistSuggestions = useMemo(() => {
    if (!dentistSearchText.trim()) return allClientOptions;
    const term = dentistSearchText.toLowerCase().trim();
    return allClientOptions.filter(d => 
      (d.name && d.name.toLowerCase().includes(term)) ||
      (d.clinicName && d.clinicName.toLowerCase().includes(term)) ||
      (d.phone && d.phone.toLowerCase().includes(term))
    );
  }, [allClientOptions, dentistSearchText]);

  // Currently selected client object
  const selectedDentist = useMemo(() => {
    if (!dentistId) return null;
    return allClientOptions.find(d => d.id === dentistId || d.name === dentistId) || null;
  }, [allClientOptions, dentistId]);

  // Keep dentist search text in sync when a dentist is selected or changed
  useEffect(() => {
    if (selectedDentist) {
      setDentistSearchText(selectedDentist.name + (selectedDentist.clinicName ? ` (${selectedDentist.clinicName})` : ''));
    } else if (!dentistId) {
      // Don't wipe if user is actively searching
    }
  }, [selectedDentist, dentistId]);

  // Patients dynamically extracted from jobs (filtered by selected client if any, sorted alphabetically)
  const availablePatientOptions = useMemo(() => {
    const map = new Map<string, {
      name: string;
      totalJobs: number;
      totalValue: number;
      dentistNames: Set<string>;
      latestDate: Date;
      jobs: Job[];
    }>();

    const baseJobs = dentistId 
      ? jobs.filter(j => j.dentistId === dentistId || j.dentistName === dentistId || (selectedDentist && j.dentistName === selectedDentist.name))
      : jobs;

    baseJobs.forEach(job => {
      const pName = (job.patientName || '').trim();
      if (!pName) return;

      const key = pName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: pName,
          totalJobs: 0,
          totalValue: 0,
          dentistNames: new Set(),
          latestDate: new Date(job.createdAt),
          jobs: []
        });
      }

      const pEntry = map.get(key)!;
      pEntry.totalJobs += 1;
      pEntry.totalValue += (job.totalValue || 0);
      if (job.dentistName) pEntry.dentistNames.add(job.dentistName);
      pEntry.jobs.push(job);
      const jDate = new Date(job.createdAt);
      if (jDate > pEntry.latestDate) {
        pEntry.latestDate = jDate;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [jobs, dentistId, selectedDentist]);

  // Filtered patient suggestions based on search query
  const filteredPatientSuggestions = useMemo(() => {
    if (!patientSearchText.trim()) return availablePatientOptions;
    const term = patientSearchText.toLowerCase().trim();
    return availablePatientOptions.filter(p => p.name.toLowerCase().includes(term));
  }, [availablePatientOptions, patientSearchText]);

  // Keep patient search text synced
  useEffect(() => {
    if (patientFilter) {
      setPatientSearchText(patientFilter);
    }
  }, [patientFilter]);

  // Active report export permission
  const canExportCurrentReport = useMemo(() => {
    switch (reportType) {
      case 'CLIENT_SUMMARY': return canExportClientSummary;
      case 'PRODUCTION': return canExportProduction;
      case 'DETAILED_ORDERS': return canExportDetailedOrders;
      case 'SERVICE_TYPES': return canExportServiceTypes;
      default: return false;
    }
  }, [reportType, canExportClientSummary, canExportProduction, canExportDetailedOrders, canExportServiceTypes]);

  // Auto-switch to first available tab if current reportType is not permitted
  useEffect(() => {
    if (availableReportTabs.length > 0) {
      const isCurrentPermitted = availableReportTabs.some(tab => tab.type === reportType);
      if (!isCurrentPermitted) {
        setReportType(availableReportTabs[0].type);
      }
    }
  }, [availableReportTabs, reportType]);
  
  // Client summary specific state
  const [clientSearch, setClientSearch] = useState('');
  const [clientSortBy, setClientSortBy] = useState<'BILLING_DESC' | 'BILLING_ASC' | 'JOBS_DESC' | 'NAME_ASC' | 'TICKET_DESC'>('BILLING_DESC');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const selectedJobType = useMemo(() => {
    return jobTypes.find(jt => jt.id === jobTypeId);
  }, [jobTypes, jobTypeId]);

  // Quick date presets
  const applyDatePreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'ALL') => {
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'LAST_30') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'THIS_YEAR') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Date filter
      const jobDate = new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate);
      jobDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        start.setHours(0, 0, 0, 0);
        if (jobDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(0, 0, 0, 0);
        if (jobDate > end) return false;
      }

      // Dentist filter
      if (dentistId && job.dentistId !== dentistId && job.dentistName !== dentistId && (!selectedDentist || job.dentistName !== selectedDentist.name)) return false;

      // Patient filter
      if (patientFilter.trim()) {
        const pTerm = patientFilter.toLowerCase().trim();
        if (!job.patientName || !job.patientName.toLowerCase().includes(pTerm)) {
          return false;
        }
      }

      // Collaborator filter
      if (collaboratorId) {
        const hasCollaborator = job.history?.some(h => h.userId === collaboratorId);
        if (!hasCollaborator) return false;
      }

      // Sector filter
      if (sector && job.currentSector !== sector) return false;

      // Job Type & Variation filter
      if (jobTypeId) {
        const hasMatchingItem = job.items.some(item => {
          if (item.jobTypeId !== jobTypeId) return false;
          for (const [groupId, optionId] of Object.entries(variationFilters)) {
            if (optionId) {
              const hasOpt = item.selectedVariationIds?.includes(optionId);
              if (!hasOpt) return false;
            }
          }
          return true;
        });
        if (!hasMatchingItem) return false;
      }

      // Status filter
      if (statusFilter) {
        if (statusFilter === 'PENDING' && job.status !== 'PENDING') return false;
        if (statusFilter === 'IN_PROGRESS' && job.status !== 'IN_PROGRESS' && job.status !== 'SECTOR_TRANSITION') return false;
        if (statusFilter === 'DELAYED') {
          if (job.status === 'COMPLETED' || job.status === 'DELIVERED' || job.status === 'CANCELED') return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(job.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due >= today) return false;
        }
      }

      // Urgency filter
      if (urgencyFilter) {
        if (urgencyFilter === 'URGENT' && job.urgency !== 'HIGH' && job.urgency !== 'VIP') return false;
        if (urgencyFilter === 'NORMAL' && job.urgency !== 'NORMAL' && job.urgency !== 'LOW') return false;
      }

      return true;
    });
  }, [jobs, startDate, endDate, dateType, dentistId, selectedDentist, patientFilter, collaboratorId, sector, jobTypeId, variationFilters, statusFilter, urgencyFilter]);

  // Client Summary Data (Faturamento Total do Período & Quantidade de Casos)
  const clientSummaryData = useMemo(() => {
    const clientsMap: Record<string, {
      clientId: string;
      clientName: string;
      clinicName: string;
      email?: string;
      phone?: string;
      totalJobs: number;
      totalItems: number;
      totalBilling: number;
      jobs: Job[];
      statusBreakdown: {
        pending: number;
        inProgress: number;
        completed: number;
        delivered: number;
        canceled: number;
      };
    }> = {};

    let grandTotalBilling = 0;
    let grandTotalJobs = 0;
    let grandTotalItems = 0;

    filteredJobs.forEach(job => {
      const clientId = job.dentistId || job.dentistName || 'unknown';
      const dentistInfo = manualDentists.find(d => d.id === job.dentistId || d.name === job.dentistName) || 
                          allUsers.find(u => u.id === job.dentistId || u.name === job.dentistName);
      
      const clientName = job.dentistName || dentistInfo?.name || 'Cliente';
      const clinicName = job.clinicName || (dentistInfo as any)?.clinicName || (dentistInfo as any)?.address || 'Geral';
      const email = (dentistInfo as any)?.email;
      const phone = (dentistInfo as any)?.phone || (dentistInfo as any)?.whatsapp;

      if (!clientsMap[clientId]) {
        clientsMap[clientId] = {
          clientId,
          clientName,
          clinicName,
          email,
          phone,
          totalJobs: 0,
          totalItems: 0,
          totalBilling: 0,
          jobs: [],
          statusBreakdown: {
            pending: 0,
            inProgress: 0,
            completed: 0,
            delivered: 0,
            canceled: 0
          }
        };
      }

      const client = clientsMap[clientId];
      client.totalJobs += 1;
      const itemsCount = (job.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
      client.totalItems += itemsCount;
      client.totalBilling += (job.totalValue || 0);
      client.jobs.push(job);

      if (job.status === 'PENDING') client.statusBreakdown.pending++;
      else if (job.status === 'IN_PROGRESS' || job.status === 'SECTOR_TRANSITION' || job.status === 'WAITING_APPROVAL') client.statusBreakdown.inProgress++;
      else if (job.status === 'COMPLETED') client.statusBreakdown.completed++;
      else if (job.status === 'DELIVERED') client.statusBreakdown.delivered++;
      else if (job.status === 'CANCELED' || job.status === 'REJECTED') client.statusBreakdown.canceled++;

      grandTotalBilling += (job.totalValue || 0);
      grandTotalJobs += 1;
      grandTotalItems += itemsCount;
    });

    const clientList: ClientSummaryStat[] = Object.values(clientsMap).map(c => ({
      ...c,
      averageTicket: c.totalJobs > 0 ? c.totalBilling / c.totalJobs : 0,
      percentage: grandTotalBilling > 0 ? (c.totalBilling / grandTotalBilling) * 100 : 0
    }));

    return {
      clients: clientList,
      grandTotalBilling,
      grandTotalJobs,
      grandTotalItems,
      grandTotalClients: clientList.length,
      averageTicketGlobal: grandTotalJobs > 0 ? grandTotalBilling / grandTotalJobs : 0
    };
  }, [filteredJobs, manualDentists, allUsers]);

  // Sorted and filtered clients for table
  const sortedClients = useMemo(() => {
    let result = clientSummaryData.clients;

    if (clientSearch.trim()) {
      const term = clientSearch.toLowerCase().trim();
      result = result.filter(c => 
        c.clientName.toLowerCase().includes(term) ||
        c.clinicName.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term))
      );
    }

    return [...result].sort((a, b) => {
      if (clientSortBy === 'BILLING_DESC') return b.totalBilling - a.totalBilling;
      if (clientSortBy === 'BILLING_ASC') return a.totalBilling - b.totalBilling;
      if (clientSortBy === 'JOBS_DESC') return b.totalJobs - a.totalJobs;
      if (clientSortBy === 'TICKET_DESC') return b.averageTicket - a.averageTicket;
      if (clientSortBy === 'NAME_ASC') return a.clientName.localeCompare(b.clientName);
      return 0;
    });
  }, [clientSummaryData.clients, clientSearch, clientSortBy]);

  // Group jobs for production/detailed report
  const groupedJobs = useMemo(() => {
    const groups: Record<string, typeof jobs> = {};
    
    filteredJobs.forEach(job => {
      if (groupBy === 'COLLABORATOR') {
        const collabIds = [...new Set(job.history?.map(h => h.userId).filter(Boolean) || [])];
        let targetCollabIds = collabIds;
        
        if (collaboratorId) {
          targetCollabIds = collabIds.filter(id => id === collaboratorId);
        }

        if (targetCollabIds.length === 0) {
          const key = t('reports.withoutCollaborator', 'Sem Colaborador');
          if (!groups[key]) groups[key] = [];
          groups[key].push(job);
        } else {
          targetCollabIds.forEach(cId => {
            const collab = allUsers.find(u => u.id === cId);
            if (collab && collab.role !== 'CLIENT') {
              const key = collab.name;
              if (!groups[key]) groups[key] = [];
              groups[key].push(job);
            } else if (!collab) {
              const key = t('reports.withoutCollaborator', 'Sem Colaborador');
              if (!groups[key]) groups[key] = [];
              if (!groups[key].some(j => j.id === job.id)) {
                groups[key].push(job);
              }
            }
          });
        }
      } else {
        let key = '';
        if (groupBy === 'DATE') {
          key = new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString();
        } else if (groupBy === 'JOB_TYPE') {
          if (jobTypeId && selectedJobType) {
            key = selectedJobType.name;
          } else {
            key = job.items.length > 0 ? job.items[0].name : t('reports.withoutType', 'Sem tipo');
          }
        } else if (groupBy === 'LIST') {
          key = t('reports.generalList', 'Lista Geral');
        }
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(job);
      }
    });

    // Sort jobs within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = new Date(dateType === 'CREATED' ? a.createdAt : a.dueDate).getTime();
        const dateB = new Date(dateType === 'CREATED' ? b.createdAt : b.dueDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        
        const typeA = a.items.length > 0 ? a.items[0].name : '';
        const typeB = b.items.length > 0 ? b.items[0].name : '';
        return typeA.localeCompare(typeB);
      });
    });

    const sortedGroups: Record<string, typeof jobs> = {};
    Object.keys(groups).sort((a, b) => {
      return a.localeCompare(b);
    }).forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredJobs, groupBy, dateType, allUsers, collaboratorId, jobTypeId, selectedJobType, t]);

  const serviceStats = useMemo(() => {
    if (reportType !== 'SERVICE_TYPES') return null;
    const stats: Record<string, { quantity: number; totalValue: number }> = {};
    filteredJobs.forEach(job => {
      job.items.forEach((item: any) => {
        const typeId = item.jobTypeId || item.name;
        const typeName = jobTypes.find(tj => tj.id === typeId)?.name || item.name;
        if (!stats[typeName]) {
          stats[typeName] = { quantity: 0, totalValue: 0 };
        }
        stats[typeName].quantity += item.quantity || 1;
        stats[typeName].totalValue += (item.price * (item.quantity || 1)) - (item.appliedDiscount || 0);
      });
    });
    return stats;
  }, [filteredJobs, reportType, jobTypes]);

  // Export to PDF
  const generatePDF = () => {
    if (!canExportCurrentReport) {
      alert(t('reports.noExportPermission', 'Você não tem permissão para exportar este relatório. Solicite autorização ao administrador.'));
      return;
    }
    const isLandscape = reportType === 'DETAILED_ORDERS' || reportType === 'CLIENT_SUMMARY';
    const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait');
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    let title = t('reports.pdfReportTitleProduction', 'Relatório de Produção - {{org}}', { org: orgName });
    if (reportType === 'CLIENT_SUMMARY') title = t('reports.pdfReportTitleClientSummary', 'Relatório de Faturamento e Casos por Cliente - {{org}}', { org: orgName });
    if (reportType === 'DETAILED_ORDERS') title = t('reports.pdfReportTitleDetailedOrders', 'Relatório Detalhado de Pedidos - {{org}}', { org: orgName });
    if (reportType === 'SERVICE_TYPES') title = t('reports.pdfReportTitleServiceTypes', 'Relatório de Tipos de Serviço - {{org}}', { org: orgName });
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateRangeStr = startDate || endDate 
      ? t('reports.pdfPeriod', 'Período: {{start}} até {{end}} ({{type}})', {
          start: startDate ? new Date(startDate).toLocaleDateString() : '-',
          end: endDate ? new Date(endDate).toLocaleDateString() : '-',
          type: dateType === 'CREATED' ? t('reports.entryDateCreation', 'Data de Entrada') : t('reports.dueDateExpiration', 'Data de Entrega')
        })
      : t('reports.pdfAllHistory', 'Período: Todo o histórico ({{type}})', {
          type: dateType === 'CREATED' ? t('reports.entryDateCreation', 'Data de Entrada') : t('reports.dueDateExpiration', 'Data de Entrega')
        });
    doc.text(t('reports.pdfGeneratedAt', 'Gerado em: {{date}}', { date: new Date().toLocaleString() }) + `  |  ${dateRangeStr}`, 14, 27);
    
    // --- PDF: CLIENT_SUMMARY ---
    if (reportType === 'CLIENT_SUMMARY') {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `${t('reports.totalBillingHeader', 'Total Faturado')}: R$ ${clientSummaryData.grandTotalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  ${t('reports.totalOpenCases', 'Total de Casos')}: ${clientSummaryData.grandTotalJobs}  |  ${t('reports.averageTicketHeader', 'Ticket Médio Geral')}: R$ ${clientSummaryData.averageTicketGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  ${t('reports.clientsWithMovement', 'Clientes')}: ${clientSummaryData.grandTotalClients}`, 
        14, 34
      );

      const tableData = sortedClients.map(c => [
        c.clientName,
        c.clinicName || '-',
        c.totalJobs.toString(),
        c.totalItems.toString(),
        `R$ ${c.totalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${c.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${c.percentage.toFixed(1)}%`
      ]);

      // Add Total Row
      tableData.push([
        t('reports.totalGeneral', 'TOTAL GERAL'),
        '-',
        clientSummaryData.grandTotalJobs.toString(),
        clientSummaryData.grandTotalItems.toString(),
        `R$ ${clientSummaryData.grandTotalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${clientSummaryData.averageTicketGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        '100.0%'
      ]);

      autoTable(doc, {
        startY: 40,
        head: [[
          t('reports.clientDentistHeader', 'Cliente / Dentista'),
          t('reports.clinicHeader', 'Clínica'),
          t('reports.jobsCountHeader', 'Qtd Casos'),
          t('reports.elementsHeader', 'Qtd Itens'),
          t('reports.totalBillingHeader', 'Faturamento Total'),
          t('reports.averageTicketHeader', 'Ticket Médio'),
          t('reports.percentageHeader', '% Part.')
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] }, // Teal 600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          4: { fontStyle: 'bold', halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 253, 250];
            data.cell.styles.textColor = [15, 118, 110];
          }
        }
      });
      
      doc.save(`relatorio-faturamento-clientes-${new Date().getTime()}.pdf`);
      return;
    }

    // --- PDF: SERVICE_TYPES ---
    if (reportType === 'SERVICE_TYPES' && serviceStats) {
      doc.text(`${t('reports.totalOpenCases', 'Total de trabalhos')}: ${filteredJobs.length}`, 14, 36);
      
      const tableData = Object.entries(serviceStats)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .map(([name, stats]) => [
          name,
          stats.quantity.toString(),
          `R$ ${stats.totalValue.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [[
          t('reports.serviceTypeHeader', 'Tipo de Serviço'),
          t('reports.quantityProducedHeader', 'Quantidade Produzida'),
          t('reports.totalValueProducedHeader', 'Valor Total Produzido')
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10, cellPadding: 4 },
      });
      
      doc.save(`relatorio-tipos-servico-${new Date().getTime()}.pdf`);
      return;
    }

    let filterText = `Filtros: ${filteredJobs.length} trabalhos encontrados`;
    if (selectedDentist) {
      filterText += `  |  Cliente: ${selectedDentist.name}`;
    }
    if (patientFilter) {
      filterText += `  |  Paciente: ${patientFilter}`;
    }
    doc.text(filterText, 14, 36);

    let yPos = 45;

    Object.entries(groupedJobs).forEach(([groupName, groupJobs]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(groupName, 14, yPos);
      yPos += 5;

      if (reportType === 'DETAILED_ORDERS') {
        const tableData: any[] = [];
        groupJobs.forEach(job => {
          let entryDate = new Date(job.createdAt).toLocaleDateString();
          let finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString() : '-';
          
          let itemsText = (job.items || []).map(item => {
            const jt = jobTypes.find(t => t.id === item.jobTypeId);
            return `${item.quantity}x ${jt ? jt.name : item.name}`;
          }).join('\n');
          
          let pricesText = (job.items || []).map(item => {
            return `R$ ${((item.price * item.quantity) - (item.appliedDiscount || 0)).toFixed(2)}`;
          }).join('\n');

          tableData.push([
            job.osNumber || '-',
            job.boxNumber || '-',
            job.dentistName,
            job.patientName,
            itemsText,
            pricesText,
            `R$ ${job.totalValue.toFixed(2)}`,
            entryDate,
            finishDate
          ]);
        });

        autoTable(doc, {
          startY: yPos,
          head: [[
            t('reports.osNumber', 'OS'),
            t('reports.box', 'Caixa'),
            t('reports.clientDentist', 'Dentista'),
            t('reports.patient', 'Paciente'),
            t('reports.services', 'Serviços'),
            t('reports.serviceValue', 'Valor Serviço'),
            t('reports.total', 'Valor Total'),
            t('reports.entryDate', 'Entrada'),
            t('reports.completion', 'Finalização')
          ]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] }, // Amber 500
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            4: { cellWidth: 40 },
            5: { cellWidth: 20 },
          },
          margin: { top: 10 },
        });
      } else {
        const tableData = groupJobs.map(job => [
          job.osNumber || '-',
          job.patientName,
          job.dentistName,
          new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString(),
          job.currentSector || 'Recepção',
          getStatusLabel(job.status)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [[
            t('reports.osNumber', 'OS'),
            t('reports.patient', 'Paciente'),
            t('reports.clientDentist', 'Dentista'),
            dateType === 'CREATED' ? t('reports.entryDate', 'Entrada') : t('reports.deliveryDate', 'Entrega'),
            t('reports.sector', 'Setor'),
            t('reports.status', 'Status')
          ]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 8 },
          margin: { top: 10 },
        });
      }

      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > (reportType === 'DETAILED_ORDERS' ? 180 : 270)) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(reportType === 'DETAILED_ORDERS' ? `relatorio-detalhado-${new Date().getTime()}.pdf` : `relatorio-producao-${new Date().getTime()}.pdf`);
  };

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    if (!canExportCurrentReport) {
      alert(t('reports.noExportPermission', 'Você não tem permissão para exportar este relatório. Solicite autorização ao administrador.'));
      return;
    }
    if (reportType === 'CLIENT_SUMMARY') {
      const rows = sortedClients.map((c, index) => ({
        '#': index + 1,
        [t('reports.clientDentistHeader', 'Cliente / Dentista')]: c.clientName,
        [t('reports.clinicHeader', 'Clínica')]: c.clinicName || '-',
        [t('profile.phoneLabel', 'Telefone')]: c.phone || '-',
        [t('reports.jobsCountHeader', 'Qtd de Casos')]: c.totalJobs,
        [t('reports.elementsHeader', 'Qtd de Elementos/Itens')]: c.totalItems,
        [`${t('reports.totalBillingHeader', 'Faturamento Total')} (R$)`]: Number(c.totalBilling.toFixed(2)),
        [`${t('reports.averageTicketHeader', 'Ticket Médio')} (R$)`]: Number(c.averageTicket.toFixed(2)),
        [t('reports.percentageHeader', '% Participação')]: `${c.percentage.toFixed(1)}%`
      }));

      // Total row
      rows.push({
        '#': 0,
        [t('reports.clientDentistHeader', 'Cliente / Dentista')]: t('reports.totalGeneral', 'TOTAL GERAL'),
        [t('reports.clinicHeader', 'Clínica')]: '-',
        [t('profile.phoneLabel', 'Telefone')]: '-',
        [t('reports.jobsCountHeader', 'Qtd de Casos')]: clientSummaryData.grandTotalJobs,
        [t('reports.elementsHeader', 'Qtd de Elementos/Itens')]: clientSummaryData.grandTotalItems,
        [`${t('reports.totalBillingHeader', 'Faturamento Total')} (R$)`]: Number(clientSummaryData.grandTotalBilling.toFixed(2)),
        [`${t('reports.averageTicketHeader', 'Ticket Médio')} (R$)`]: Number(clientSummaryData.averageTicketGlobal.toFixed(2)),
        [t('reports.percentageHeader', '% Participação')]: '100.0%'
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('reports.excelClientBillingSheet', 'Faturamento por Cliente'));

      // Also add detailed orders sheet
      const detailedRows = filteredJobs.map(job => ({
        [t('reports.osNumber', 'OS')]: job.osNumber || '-',
        [t('reports.box', 'Caixa')]: job.boxNumber || '-',
        [t('reports.clientDentist', 'Dentista')]: job.dentistName,
        [t('reports.clinicHeader', 'Clínica')]: job.clinicName || '-',
        [t('reports.patient', 'Paciente')]: job.patientName,
        [`${t('reports.total', 'Valor Total')} (R$)`]: Number((job.totalValue || 0).toFixed(2)),
        [t('reports.entryDate', 'Data Entrada')]: new Date(job.createdAt).toLocaleDateString(),
        [t('reports.deliveryDate', 'Data Entrega')]: new Date(job.dueDate).toLocaleDateString(),
        [t('reports.status', 'Status')]: getStatusLabel(job.status),
        [t('reports.sector', 'Setor')]: job.currentSector || 'Recepção'
      }));
      const wsDetail = XLSX.utils.json_to_sheet(detailedRows);
      XLSX.utils.book_append_sheet(wb, wsDetail, t('reports.excelPeriodCasesSheet', 'Casos do Período'));

      XLSX.writeFile(wb, `faturamento_clientes_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const rows = filteredJobs.map(job => ({
        [t('reports.osNumber', 'OS')]: job.osNumber || '-',
        [t('reports.box', 'Caixa')]: job.boxNumber || '-',
        [t('reports.clientDentist', 'Dentista')]: job.dentistName,
        [t('reports.patient', 'Paciente')]: job.patientName,
        [`${t('reports.total', 'Valor Total')} (R$)`]: Number((job.totalValue || 0).toFixed(2)),
        [t('reports.entryDate', 'Data Entrada')]: new Date(job.createdAt).toLocaleDateString(),
        [t('reports.deliveryDate', 'Data Entrega')]: new Date(job.dueDate).toLocaleDateString(),
        [t('reports.status', 'Status')]: getStatusLabel(job.status),
        [t('reports.sector', 'Setor')]: job.currentSector || 'Recepção'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('reports.excelProductionSheet', 'Relatório'));
      XLSX.writeFile(wb, `relatorio_producao_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDentistId('');
    setDentistSearchText('');
    setShowDentistDropdown(false);
    setPatientFilter('');
    setPatientSearchText('');
    setShowPatientDropdown(false);
    setCollaboratorId('');
    setSector('');
    setJobTypeId('');
    setVariationFilters({});
    setStatusFilter('');
    setUrgencyFilter('');
    setClientSearch('');
  };

  // Stats for the active patient extract (continuidade de casos do paciente)
  const patientExtractStats = useMemo(() => {
    if (!patientFilter.trim()) return null;
    const pTerm = patientFilter.toLowerCase().trim();
    const pJobs = jobs.filter(j => {
      const matchPatient = j.patientName && j.patientName.toLowerCase().includes(pTerm);
      if (!matchPatient) return false;
      if (dentistId && j.dentistId !== dentistId && j.dentistName !== dentistId && (!selectedDentist || j.dentistName !== selectedDentist.name)) return false;
      return true;
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (pJobs.length === 0) return null;

    const totalValue = pJobs.reduce((sum, j) => sum + (j.totalValue || 0), 0);
    const totalItems = pJobs.reduce((sum, j) => sum + (j.items || []).reduce((s, it) => s + (it.quantity || 1), 0), 0);
    const dentistNames = Array.from(new Set(pJobs.map(j => j.dentistName).filter(Boolean)));
    const clinicNames = Array.from(new Set(pJobs.map(j => j.clinicName).filter(Boolean)));
    const statusCounts = {
      completed: pJobs.filter(j => j.status === 'COMPLETED' || j.status === 'DELIVERED').length,
      inProgress: pJobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'PENDING' || j.status === 'SECTOR_TRANSITION' || j.status === 'WAITING_APPROVAL').length,
      canceled: pJobs.filter(j => j.status === 'CANCELED' || j.status === 'REJECTED').length
    };

    return {
      patientName: pJobs[0].patientName,
      jobs: pJobs,
      totalJobs: pJobs.length,
      totalValue,
      totalItems,
      dentistNames,
      clinicNames,
      statusCounts,
      firstEntry: pJobs[0].createdAt,
      lastEntry: pJobs[pJobs.length - 1].createdAt
    };
  }, [jobs, patientFilter, dentistId, selectedDentist]);

  if (!hasAnyReportView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 max-w-lg mx-auto animate-in fade-in">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-4 border border-rose-200 shadow-sm">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">
          {t('reports.accessRestrictedTitle', 'Acesso Restrito aos Relatórios')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          {t('reports.accessRestrictedDesc', 'Seu usuário não possui permissão para visualizar nenhum dos relatórios deste laboratório. Solicite ao administrador da equipe a liberação do acesso aos relatórios desejados.')}
        </p>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-100"
        >
          <ArrowLeft size={16} />
          <span>{t('common.back', 'Voltar ao Início')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center font-black shadow-inner">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {t('reports.title', 'Relatórios & Faturamento')}
                </h1>
                {!canExportCurrentReport && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock size={10} />
                    {t('reports.viewOnlyBadge', 'Apenas Visualização')}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm font-medium">
                {t('reports.subtitle', 'Consulte o faturamento por cliente, volume de casos e acompanhe a produção.')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {!canExportCurrentReport && (
            <span className="text-[11px] font-bold text-amber-600 hidden lg:inline-flex items-center gap-1 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/60">
              <Lock size={12} />
              {t('reports.noExportPermNotice', 'Exportação desabilitada p/ seu usuário')}
            </span>
          )}

          <button 
            onClick={exportToExcel}
            disabled={filteredJobs.length === 0 || !canExportCurrentReport}
            title={!canExportCurrentReport ? t('reports.noExportPermissionTooltip', 'Você não tem permissão para exportar este relatório.') : undefined}
            className={`px-4 py-3 font-bold rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider border shadow-sm ${
              !canExportCurrentReport
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {!canExportCurrentReport ? <Lock size={16} /> : <FileSpreadsheet size={18} className="text-emerald-600" />}
            <span>{t('reports.exportExcel', 'Exportar Excel')}</span>
          </button>
          
          <button 
            onClick={generatePDF}
            disabled={filteredJobs.length === 0 || !canExportCurrentReport}
            title={!canExportCurrentReport ? t('reports.noExportPermissionTooltip', 'Você não tem permissão para exportar este relatório.') : undefined}
            className={`px-5 py-3 font-bold rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg ${
              !canExportCurrentReport
                ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed opacity-70'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {!canExportCurrentReport ? <Lock size={16} /> : <Download size={18} />}
            <span>{t('reports.exportPdf', 'Exportar PDF')}</span>
          </button>
        </div>
      </div>

      {/* Segmented Navigation of Permitted Report Types */}
      <div className={`grid gap-2 bg-slate-100 p-1.5 rounded-2xl ${
        availableReportTabs.length === 1 ? 'grid-cols-1 max-w-xs' :
        availableReportTabs.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-xl' :
        availableReportTabs.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
        'grid-cols-2 md:grid-cols-4'
      }`}>
        {availableReportTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = reportType === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setReportType(tab.type)}
              className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? tab.activeColor
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? tab.textColor : 'text-slate-400'} />
              <span className="truncate">{tab.label}</span>
              {!tab.canExport && (
                <span title={t('reports.viewOnlyShort', 'Visualização apenas')} className="inline-flex items-center">
                  <Lock size={12} className="text-slate-400 shrink-0" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KPI Cards when in CLIENT_SUMMARY mode */}
      {reportType === 'CLIENT_SUMMARY' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">{t('reports.billingInPeriod', 'Faturamento no Período')}</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {clientSummaryData.grandTotalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">{t('reports.sumOfAllCases', 'Soma de todos os casos')}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <FileText size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">{t('reports.totalOpenCases', 'Total de Casos Abertos')}</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {clientSummaryData.grandTotalJobs} <span className="text-sm font-bold text-slate-400">{t('reports.ordersCount', 'pedidos')}</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">{clientSummaryData.grandTotalItems} {t('reports.elementsProduced', 'elementos produzidos')}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{t('reports.averageTicketPerCase', 'Ticket Médio por Caso')}</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {clientSummaryData.averageTicketGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">{t('reports.averagePerOrder', 'Média por pedido')}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">{t('reports.clientsWithMovement', 'Clientes com Movimento')}</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {clientSummaryData.grandTotalClients} <span className="text-sm font-bold text-slate-400">{t('reports.clientsWithMovement', 'clientes')}</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">{t('reports.dentistsClinicsInFilter', 'Dentistas / Clínicas no filtro')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters Box */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-teal-600" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              {t('reports.filtersAndParams', 'Filtros do Período & Parâmetros')}
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">{t('reports.shortcuts', 'Atalhos:')}</span>
            <button 
              onClick={() => applyDatePreset('THIS_MONTH')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t('reports.thisMonth', 'Este Mês')}
            </button>
            <button 
              onClick={() => applyDatePreset('LAST_MONTH')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t('reports.lastMonth', 'Mês Passado')}
            </button>
            <button 
              onClick={() => applyDatePreset('LAST_30')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t('reports.last30Days', 'Últimos 30 Dias')}
            </button>
            <button 
              onClick={() => applyDatePreset('THIS_YEAR')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t('reports.thisYear', 'Este Ano')}
            </button>
            <button 
              onClick={clearFilters} 
              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X size={14} /> {t('reports.clear', 'Limpar')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-600" /> {t('reports.baseDate', 'Data Base')}
            </label>
            <select 
              value={dateType} 
              onChange={(e) => setDateType(e.target.value as any)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
            >
              <option value="CREATED">{t('reports.entryDateCreation', 'Data de Entrada (Criação do Caso)')}</option>
              <option value="DUE">{t('reports.dueDateExpiration', 'Data de Entrega (Vencimento)')}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.startDate', 'Data Inicial')}</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.endDate', 'Data Final')}</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          {/* CLIENT / DENTIST FILTER WITH SEARCH-AS-YOU-TYPE AND DROPDOWN */}
          <div className="space-y-1.5" ref={dentistDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Stethoscope size={13} className="text-teal-600" /> {t('reports.clientDentist', 'Cliente / Dentista')}
              </label>
              {dentistId && (
                <button
                  type="button"
                  onClick={() => {
                    setDentistId('');
                    setDentistSearchText('');
                    setShowDentistDropdown(false);
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('common.clear', 'Limpar')}
                </button>
              )}
            </div>

            <div className="relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={dentistSearchText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDentistSearchText(val);
                    setShowDentistDropdown(true);
                    if (!val.trim()) {
                      setDentistId('');
                    } else {
                      const exact = allClientOptions.find(d => 
                        d.name.toLowerCase() === val.trim().toLowerCase() ||
                        `${d.name} (${d.clinicName})`.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (exact) setDentistId(exact.id);
                    }
                  }}
                  onFocus={() => setShowDentistDropdown(true)}
                  onClick={() => setShowDentistDropdown(true)}
                  placeholder={t('reports.searchClientPlaceholderInput', 'Digite ou selecione cliente...')}
                  className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all shadow-sm"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {dentistSearchText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDentistId('');
                      setDentistSearchText('');
                      setShowDentistDropdown(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
              </div>

              {showDentistDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDentistId('');
                      setDentistSearchText('');
                      setShowDentistDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-xs font-bold ${
                      !dentistId ? 'bg-teal-50/70 text-teal-800' : 'text-slate-600'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Users size={13} />
                    </div>
                    <span>{t('reports.allClientsDentists', 'Todos os Clientes / Dentistas')}</span>
                  </button>

                  {filteredDentistSuggestions.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                      {t('reports.noClientFound', 'Nenhum cliente ou dentista encontrado.')}
                    </div>
                  ) : (
                    filteredDentistSuggestions.map((d) => {
                      const isSelected = dentistId === d.id || dentistId === d.name;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setDentistId(d.id);
                            setDentistSearchText(d.name + (d.clinicName ? ` (${d.clinicName})` : ''));
                            setShowDentistDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 hover:bg-teal-50/50 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50 text-teal-900 font-black' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 font-black flex items-center justify-center text-xs shrink-0 border border-teal-100/80">
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
                              {d.clinicName && (
                                <p className="text-[10px] text-slate-400 font-medium truncate">{d.clinicName}</p>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={15} className="text-teal-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PATIENT / CASE CONTINUITY FILTER WITH SEARCH-AS-YOU-TYPE AND DROPDOWN */}
          {(dentistId || reportType === 'DETAILED_ORDERS' || patientFilter) && (
            <div className="space-y-1.5" ref={patientDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <UserIcon size={13} className="text-amber-600" /> {t('reports.patientCaseFilter', 'Paciente / Extrato')}
                </label>
                {patientFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientFilter('');
                      setPatientSearchText('');
                      setShowPatientDropdown(false);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    {t('common.clear', 'Limpar')}
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={patientSearchText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPatientSearchText(val);
                      setPatientFilter(val);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onClick={() => setShowPatientDropdown(true)}
                    placeholder={dentistId ? t('reports.searchPatientOfClient', 'Buscar paciente deste cliente...') : t('reports.searchPatientAll', 'Buscar paciente...')}
                    className={`w-full pl-9 pr-8 py-3 bg-slate-50 border rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 outline-none text-sm transition-all shadow-sm ${
                      patientFilter ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20' : 'border-slate-200 focus:ring-teal-500'
                    }`}
                  />
                  <UserIcon size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${patientFilter ? 'text-amber-600' : 'text-slate-400'}`} />
                  {patientSearchText ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientFilter('');
                        setPatientSearchText('');
                        setShowPatientDropdown(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>

                {showPatientDropdown && (
                  <div className="absolute z-30 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setPatientFilter('');
                        setPatientSearchText('');
                        setShowPatientDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-xs font-bold ${
                        !patientFilter ? 'bg-amber-50/70 text-amber-900' : 'text-slate-600'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Users size={13} />
                      </div>
                      <span>{t('reports.allPatients', 'Todos os Pacientes')}</span>
                    </button>

                    {filteredPatientSuggestions.length === 0 ? (
                      <div className="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                        {patientSearchText 
                          ? t('reports.useTypedPatientName', 'Filtrar por "{{name}}"', { name: patientSearchText }) 
                          : t('reports.noPatientsFoundForClient', 'Nenhum paciente registrado para este cliente.')}
                      </div>
                    ) : (
                      filteredPatientSuggestions.map((p) => {
                        const isSelected = patientFilter.toLowerCase().trim() === p.name.toLowerCase().trim();
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setPatientFilter(p.name);
                              setPatientSearchText(p.name);
                              setShowPatientDropdown(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/50 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected ? 'bg-amber-50 text-amber-900 font-black' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 font-black flex items-center justify-center text-xs shrink-0 border border-amber-200/60">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                  {p.totalJobs} {p.totalJobs === 1 ? 'caso / OS' : 'casos / OSs'} • R$ {p.totalValue.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={15} className="text-amber-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {reportType !== 'CLIENT_SUMMARY' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.collaborator', 'Colaborador')}</label>
                <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allCollaborators', 'Todos os Colaboradores')}</option>
                  {allUsers.filter(u => u.role !== 'CLIENT').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.sector', 'Setor')}</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allSectors', 'Todos os Setores')}</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.orderStatus', 'Status do Pedido')}</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allStatuses', 'Todos os Status')}</option>
                  <option value="PENDING">{t('reports.pending', 'Pendente')}</option>
                  <option value="IN_PROGRESS">{t('reports.inProgress', 'Em Produção')}</option>
                  <option value="DELAYED">{t('reports.delayed', 'Atrasado')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.priority', 'Prioridade')}</label>
                <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allPriorities', 'Todas as Prioridades')}</option>
                  <option value="NORMAL">{t('reports.normalLow', 'Normal / Baixa')}</option>
                  <option value="URGENT">{t('reports.urgentVip', 'Urgente / VIP')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.jobType', 'Tipo de Trabalho')}</label>
                <select value={jobTypeId} onChange={(e) => { setJobTypeId(e.target.value); setVariationFilters({}); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allTypes', 'Todos os Tipos')}</option>
                  {jobTypes.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                </select>
              </div>

              {selectedJobType && selectedJobType.variationGroups && selectedJobType.variationGroups.map(group => (
                <div key={group.id} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{group.name}</label>
                  <select 
                    value={variationFilters[group.id] || ''} 
                    onChange={(e) => setVariationFilters(prev => ({...prev, [group.id]: e.target.value}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  >
                    <option value="">{t('reports.anyVariation', 'Qualquer')}</option>
                    {group.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                  </select>
                </div>
              ))}

              {reportType !== 'SERVICE_TYPES' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.groupBy', 'Agrupar Por')}</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="DATE">{t('reports.groupByDate', 'Data')}</option>
                    <option value="JOB_TYPE">{t('reports.groupByJobType', 'Tipo de Trabalho')}</option>
                    <option value="COLLABORATOR">{t('reports.groupByCollaborator', 'Colaborador')}</option>
                    <option value="LIST">{t('reports.groupByList', 'Lista Contínua')}</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Results Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* --- VIEW 1: CLIENT_SUMMARY (Resumo por Cliente) --- */}
        {reportType === 'CLIENT_SUMMARY' ? (
          <div>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="text-teal-600" size={20} />
                  {t('reports.clientSummaryTitle', 'Resumo de Faturamento e Casos por Cliente')}
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  {t('reports.showingClientsCount', 'Exibindo {{count}} de {{total}} clientes com movimentação no período', { count: sortedClients.length, total: clientSummaryData.grandTotalClients })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder={t('reports.searchClientPlaceholder', 'Buscar cliente ou clínica...')}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <ArrowUpDown size={14} className="text-slate-400" />
                  <select
                    value={clientSortBy}
                    onChange={(e) => setClientSortBy(e.target.value as any)}
                    className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                  >
                    <option value="BILLING_DESC">{t('reports.billingDesc', 'Maior Faturamento')}</option>
                    <option value="BILLING_ASC">{t('reports.billingAsc', 'Menor Faturamento')}</option>
                    <option value="JOBS_DESC">{t('reports.jobsDesc', 'Mais Casos')}</option>
                    <option value="TICKET_DESC">{t('reports.ticketDesc', 'Maior Ticket Médio')}</option>
                    <option value="NAME_ASC">{t('reports.nameAsc', 'Nome (A - Z)')}</option>
                  </select>
                </div>
              </div>
            </div>

            {sortedClients.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold text-base text-slate-600">{t('reports.noClientsFound', 'Nenhum cliente encontrado com os filtros selecionados.')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('reports.noClientsFoundDesc', 'Experimente ajustar o período de datas ou limpar a busca.')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="p-4 pl-6">{t('reports.clientDentistHeader', 'Cliente / Dentista')}</th>
                      <th className="p-4">{t('reports.clinicHeader', 'Clínica')}</th>
                      <th className="p-4 text-center">{t('reports.jobsCountHeader', 'Qtd de Casos')}</th>
                      <th className="p-4 text-center">{t('reports.elementsHeader', 'Elementos')}</th>
                      <th className="p-4 text-right">{t('reports.totalBillingHeader', 'Faturamento Total')}</th>
                      <th className="p-4 text-right">{t('reports.averageTicketHeader', 'Ticket Médio')}</th>
                      <th className="p-4 text-center">{t('reports.percentageHeader', '% Part.')}</th>
                      <th className="p-4 pr-6 text-center">{t('reports.detailsHeader', 'Detalhes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedClients.map((client) => {
                      const isExpanded = expandedClientId === client.clientId;
                      return (
                        <React.Fragment key={client.clientId}>
                          <tr className={`hover:bg-teal-50/30 transition-colors ${isExpanded ? 'bg-teal-50/40' : ''}`}>
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-sm shrink-0 border border-teal-100">
                                  {client.clientName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-black text-slate-900 text-sm block truncate">
                                    {client.clientName}
                                  </span>
                                  {client.phone && (
                                    <span className="text-[11px] text-slate-400 font-medium">{client.phone}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {client.clinicName || 'Geral'}
                              </span>
                            </td>

                            <td className="p-4 text-center">
                              <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-xs rounded-xl border border-indigo-100">
                                {client.totalJobs} {client.totalJobs === 1 ? t('reports.case', 'caso') : t('reports.cases', 'casos')}
                              </span>
                            </td>

                            <td className="p-4 text-center text-xs font-bold text-slate-600">
                              {client.totalItems}
                            </td>

                            <td className="p-4 text-right font-black text-sm text-teal-700">
                              R$ {client.totalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="p-4 text-right text-xs font-bold text-slate-700">
                              R$ {client.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xs font-bold text-slate-600 w-10 text-right">
                                  {client.percentage.toFixed(1)}%
                                </span>
                                <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className="bg-teal-500 h-full rounded-full transition-all" 
                                    style={{ width: `${Math.min(100, Math.max(5, client.percentage))}%` }} 
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="p-4 pr-6 text-center">
                              <button
                                onClick={() => setExpandedClientId(isExpanded ? null : client.clientId)}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                                  isExpanded 
                                    ? 'bg-teal-600 text-white' 
                                    : 'bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700'
                                }`}
                                title={t('reports.seeOrders', 'Ver OSs')}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                <span className="text-[11px] hidden sm:inline">{isExpanded ? t('reports.hideOrders', 'Ocultar') : t('reports.seeOrders', 'Ver OSs')}</span>
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Job Details for this client */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={8} className="p-4 sm:p-6 border-y border-teal-100">
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                      <FileText size={15} className="text-teal-600" />
                                      {t('reports.clientCasesInPeriod', 'Casos de {{name}} no período ({{count}})', { name: client.clientName, count: client.jobs.length })}
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                      <span>{t('reports.clientTotal', 'Total do Cliente:')} <strong className="text-teal-700">R$ {client.totalBilling.toFixed(2)}</strong></span>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                          <th className="py-2 px-3">{t('reports.osNumber', 'OS #')}</th>
                                          <th className="py-2 px-3">{t('reports.patient', 'Paciente')}</th>
                                          <th className="py-2 px-3">{t('reports.includedServices', 'Serviços Inclusos')}</th>
                                          <th className="py-2 px-3">{t('reports.entryDate', 'Entrada')}</th>
                                          <th className="py-2 px-3">{t('reports.deliveryDate', 'Entrega')}</th>
                                          <th className="py-2 px-3">{t('reports.status', 'Status')}</th>
                                          <th className="py-2 px-3 text-right">{t('reports.value', 'Valor')}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {client.jobs.map(job => (
                                          <tr key={job.id} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{job.osNumber || '-'}</td>
                                            <td className="py-2.5 px-3 font-bold text-slate-900">{job.patientName}</td>
                                            <td className="py-2.5 px-3 text-slate-600">
                                              {(job.items || []).map((it, idx) => (
                                                <div key={idx} className="truncate max-w-xs">{it.quantity}x {it.name}</div>
                                              ))}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">{new Date(job.createdAt).toLocaleDateString()}</td>
                                            <td className="py-2.5 px-3 text-slate-500">{new Date(job.dueDate).toLocaleDateString()}</td>
                                            <td className="py-2.5 px-3">
                                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                                {getStatusLabel(job.status)}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-teal-700">
                                              R$ {(job.totalValue || 0).toFixed(2)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  {/* Table Footer with Grand Totals */}
                  <tfoot>
                    <tr className="bg-teal-50/70 border-t-2 border-teal-200 font-black text-xs text-slate-900">
                      <td className="p-4 pl-6 uppercase tracking-wider text-teal-900">
                        {t('reports.totalGeneralCount', 'TOTAL GERAL ({{count}} clientes)', { count: clientSummaryData.grandTotalClients })}
                      </td>
                      <td className="p-4">-</td>
                      <td className="p-4 text-center text-teal-900">
                        {clientSummaryData.grandTotalJobs} {t('reports.cases', 'casos')}
                      </td>
                      <td className="p-4 text-center text-teal-900">
                        {clientSummaryData.grandTotalItems} {t('reports.items', 'itens')}
                      </td>
                      <td className="p-4 text-right text-sm text-teal-900">
                        R$ {clientSummaryData.grandTotalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-teal-900">
                        R$ {clientSummaryData.averageTicketGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center text-teal-900">
                        100.0%
                      </td>
                      <td className="p-4 pr-6"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : reportType === 'SERVICE_TYPES' && serviceStats ? (
          /* --- VIEW 2: SERVICE_TYPES --- */
          <div className="p-5 sm:p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">{t('reports.detailedServiceTypes', 'Tipos de Serviço Detalhado')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-700 text-[10px] uppercase tracking-widest font-black">
                    <th className="p-3 rounded-l-lg">{t('reports.serviceTypeHeader', 'Tipo de Serviço')}</th>
                    <th className="p-3 text-center">{t('reports.quantityProducedHeader', 'Quantidade Produzida')}</th>
                    <th className="p-3 rounded-r-lg text-right">{t('reports.totalValueProducedHeader', 'Valor Total Produzido')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(serviceStats).sort((a,b) => b[1].quantity - a[1].quantity).map(([name, stats]) => (
                    <tr key={name} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-700">{name}</td>
                      <td className="p-3 text-center font-bold text-slate-600">{stats.quantity}</td>
                      <td className="p-3 text-right font-black text-teal-700">R$ {stats.totalValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* --- VIEW 3: PRODUCTION / DETAILED_ORDERS --- */
          <div className="p-5 sm:p-6 space-y-8">
            {/* PATIENT CONTINUITY STATEMENT BANNER (EXTRATO POR PACIENTE) */}
            {patientExtractStats && (
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-200/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black flex items-center justify-center text-xl shadow-md shadow-amber-200">
                      <UserIcon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">
                          {patientExtractStats.patientName}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <History size={11} /> {t('reports.continuityBadge', 'Extrato de Continuidade de Casos')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {t('reports.dentistResponsible', 'Dentista / Clínica:')} <strong className="text-slate-800">{patientExtractStats.dentistNames.join(', ') || 'Geral'}</strong>
                        {patientExtractStats.clinicNames.length > 0 && ` • ${patientExtractStats.clinicNames.join(', ')}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPatientFilter('');
                      setPatientSearchText('');
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <X size={14} />
                    <span>{t('reports.clearPatientFilter', 'Remover Filtro do Paciente')}</span>
                  </button>
                </div>

                {/* KPI Metrics for this patient */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-1">
                      {t('reports.totalInvested', 'Valor Total Acumulado')}
                    </span>
                    <p className="text-lg sm:text-xl font-black text-teal-700">
                      R$ {patientExtractStats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">
                      {t('reports.casesAndStages', 'Ordens / Etapas')}
                    </span>
                    <p className="text-lg sm:text-xl font-black text-slate-900">
                      {patientExtractStats.totalJobs} <span className="text-xs font-bold text-slate-400">{patientExtractStats.totalJobs === 1 ? 'caso' : 'etapas vinculadas'}</span>
                    </p>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block mb-1">
                      {t('reports.totalElements', 'Elementos Produzidos')}
                    </span>
                    <p className="text-lg sm:text-xl font-black text-slate-900">
                      {patientExtractStats.totalItems} <span className="text-xs font-bold text-slate-400">itens</span>
                    </p>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                      {t('reports.statusOverview', 'Status das Etapas')}
                    </span>
                    <div className="text-xs font-bold text-slate-700 space-y-0.5 mt-0.5">
                      {patientExtractStats.statusCounts.completed > 0 && (
                        <div className="text-emerald-700 flex items-center gap-1 font-bold">
                          <CheckCircle2 size={12} /> {patientExtractStats.statusCounts.completed} Finalizado(s)
                        </div>
                      )}
                      {patientExtractStats.statusCounts.inProgress > 0 && (
                        <div className="text-amber-700 flex items-center gap-1 font-bold">
                          <Clock size={12} /> {patientExtractStats.statusCounts.inProgress} Em Produção
                        </div>
                      )}
                      {patientExtractStats.statusCounts.canceled > 0 && (
                        <div className="text-rose-600 flex items-center gap-1 font-bold">
                          <AlertCircle size={12} /> {patientExtractStats.statusCounts.canceled} Cancelado(s)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline stages badge chips */}
                {patientExtractStats.jobs.length > 1 && (
                  <div className="bg-white/70 p-3 rounded-2xl border border-amber-100 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] font-black text-slate-400 uppercase shrink-0 flex items-center gap-1">
                      <Layers size={13} /> {t('reports.continuitySequence', 'Sequência de Etapas:')}
                    </span>
                    <div className="flex items-center gap-2">
                      {patientExtractStats.jobs.map((pj, idx) => (
                        <React.Fragment key={pj.id}>
                          {idx > 0 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
                          <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-amber-800 font-black">OS #{pj.osNumber || '-'}</span>
                            <span className="text-[10px] text-slate-400">({new Date(pj.createdAt).toLocaleDateString()})</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-teal-700 font-bold">
                              R$ {(pj.totalValue || 0).toFixed(2)}
                            </span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{t('reports.resultsCount', 'Resultados ({{count}} trabalhos)', { count: filteredJobs.length })}</h3>
            </div>
            {Object.entries(groupedJobs).length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">{t('reports.noJobsFound', 'Nenhum trabalho encontrado com os filtros atuais.')}</p>
              </div>
            ) : (
              Object.entries(groupedJobs).map(([groupName, groupJobs]) => (
                <div key={groupName} className="space-y-4">
                  <h4 className="font-black text-lg text-slate-800 border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span>{groupName}</span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {groupJobs.length} {groupJobs.length === 1 ? t('reports.case', 'caso') : t('reports.cases', 'casos')}
                    </span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        {reportType === 'DETAILED_ORDERS' ? (
                          <tr className="bg-amber-50 text-amber-700 text-[10px] uppercase tracking-widest font-black">
                            <th className="p-3 rounded-l-lg">{t('reports.osNumber', 'OS #')}</th>
                            <th className="p-3">{t('reports.box', 'Caixa')}</th>
                            <th className="p-3">{t('reports.clientDentist', 'Dentista')}</th>
                            <th className="p-3">{t('reports.patient', 'Paciente')}</th>
                            <th className="p-3">{t('reports.services', 'Serviços')}</th>
                            <th className="p-3">{t('reports.serviceValue', 'Valor Serviço')}</th>
                            <th className="p-3">{t('reports.total', 'Total')}</th>
                            <th className="p-3">{t('reports.entryDate', 'Entrada')}</th>
                            <th className="p-3 rounded-r-lg">{t('reports.completion', 'Finalização')}</th>
                          </tr>
                        ) : (
                          <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                            <th className="p-3 rounded-l-lg">{t('reports.osNumber', 'OS #')}</th>
                            <th className="p-3">{t('reports.patient', 'Paciente')}</th>
                            <th className="p-3">{t('reports.clientDentist', 'Dentista')}</th>
                            <th className="p-3">{t('reports.date', 'Data')}</th>
                            <th className="p-3">{t('reports.sector', 'Setor')}</th>
                            <th className="p-3 rounded-r-lg">{t('reports.status', 'Status')}</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupJobs.map(job => {
                          if (reportType === 'DETAILED_ORDERS') {
                            const finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString() : '-';
                            return (
                              <tr key={job.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                                <td className="p-3 font-bold text-slate-700 text-xs">{job.boxNumber || '-'}</td>
                                <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                                <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                                <td className="p-3 text-xs text-slate-600">
                                  {(job.items || []).map((item: any, i: number) => {
                                    const jt = jobTypes.find(tj => tj.id === item.jobTypeId);
                                    return (
                                      <div key={i}>{item.quantity}x {jt ? jt.name : item.name}</div>
                                    );
                                  })}
                                </td>
                                <td className="p-3 text-xs text-slate-600">
                                  {(job.items || []).map((item: any, i: number) => (
                                    <div key={i}>R$ {((item.price * item.quantity) - (item.appliedDiscount || 0)).toFixed(2)}</div>
                                  ))}
                                </td>
                                <td className="p-3 font-black text-teal-700 text-sm">R$ {job.totalValue.toFixed(2)}</td>
                                <td className="p-3 text-sm text-slate-600">{new Date(job.createdAt).toLocaleDateString()}</td>
                                <td className="p-3 text-sm text-slate-600">{finishDate}</td>
                              </tr>
                            );
                          } else {
                            return (
                              <tr key={job.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                                <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                                <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                                <td className="p-3 text-sm text-slate-600">{new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString()}</td>
                                <td className="p-3 text-sm text-slate-600">{job.currentSector || 'Recepção'}</td>
                                <td className="p-3 text-xs font-bold text-slate-500">{getStatusLabel(job.status)}</td>
                              </tr>
                            );
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
