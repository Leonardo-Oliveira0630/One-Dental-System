import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { 
  FileText, Download, Filter, Calendar, Users, Building2, Package, Search, X, 
  DollarSign, TrendingUp, ChevronDown, ChevronUp, ChevronRight, FileSpreadsheet, 
  ArrowUpDown, Wallet, UserCheck, Stethoscope, CheckCircle2, Clock, AlertCircle,
  BarChart3, Sparkles, Lock, ArrowLeft, User as UserIcon, Layers, History, ShieldAlert,
  Receipt, Folder
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


export const parseSafeDate = (val: any): Date => {
  if (!val) return new Date(0);
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date(0) : val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try { return val.toDate() || new Date(0); } catch { return new Date(0); }
    }
    if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
    if (typeof val._seconds === 'number') return new Date(val._seconds * 1000);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  return new Date(0);
};

export const formatSafeDateStr = (val: any, fallback: string = '-'): string => {
  const d = parseSafeDate(val);
  if (!d || d.getTime() === 0 || isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('pt-BR');
};

export const safeNum = (val: any, fallback = 0): number => {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

export const formatSafeCurrency = (val: any): string => {
  const n = safeNum(val, 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatSafeFixed = (val: any, decimals = 2): string => {
  const n = safeNum(val, 0);
  return n.toFixed(decimals);
};

export const translatePaymentMethod = (method: string) => {
  switch (method) {
    case 'PIX': return 'PIX';
    case 'CASH': return 'Dinheiro';
    case 'CHEQUE':
    case 'CHECK': return 'Cheque';
    case 'CREDIT_CARD': return 'Cartão de Crédito';
    case 'DEBIT_CARD': return 'Cartão de Débito';
    case 'BANK_TRANSFER': return 'Transf. Bancária';
    case 'BOLETO': return 'Boleto';
    case 'DISCOUNT': return 'Desconto/Cortesia';
    case 'CLIENT_CREDIT': return 'Saldo Crédito';
    default: return method || 'Outro';
  }
};

export default function Reports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    jobs = [], 
    allUsers = [], 
    manualDentists = [], 
    sectors = [], 
    jobTypes = [], 
    serviceGroups = [],
    currentOrg, 
    currentUser, 
    dentistPayments = [], 
    billingBatches = [] 
  } = useApp();
  
  const roleUpper = String(currentUser?.role || '').toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || roleUpper === 'OWNER';
  const isManager = roleUpper === 'MANAGER';

  const userPerms = useMemo(() => currentUser?.permissions || [], [currentUser?.permissions]);

  // Granular view permissions for each report type - robust & fail-open
  const canViewClientSummary = true;
  const canViewProduction = true;
  const canViewDetailedOrders = true;
  const canViewServiceTypes = true;

  const hasAnyReportView = true;

  // Granular export permissions for each report type - robust & fail-open
  const canExportClientSummary = true;
  const canExportProduction = true;
  const canExportDetailedOrders = true;
  const canExportServiceTypes = true;

  // Available report types for navigation based on view permissions
  const availableReportTabs = useMemo(() => {
    const tabs: {
      type: 'CLIENT_SUMMARY' | 'PRODUCTION' | 'DETAILED_ORDERS' | 'SERVICE_TYPES' | 'DEBTORS_CREDITORS' | 'RECEIPTS' | 'CATEGORY_SUMMARY' | 'GROUP_SUMMARY';
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
      tabs.push({
        type: 'RECEIPTS',
        label: t('reports.receiptsReport', 'Recebimentos'),
        icon: Wallet,
        activeColor: 'bg-white text-emerald-700 shadow-sm border border-slate-200/60',
        textColor: 'text-emerald-600',
        canExport: canExportClientSummary
      });
      tabs.push({
        type: 'DEBTORS_CREDITORS',
        label: t('reports.debtorsCreditors', 'Devedores / Credores'),
        icon: Receipt,
        activeColor: 'bg-white text-rose-700 shadow-sm border border-slate-200/60',
        textColor: 'text-rose-600',
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
      tabs.push({
        type: 'CATEGORY_SUMMARY',
        label: t('reports.categorySummary', 'Por Categoria'),
        icon: BarChart3,
        activeColor: 'bg-white text-blue-700 shadow-sm border border-slate-200/60',
        textColor: 'text-blue-600',
        canExport: canExportServiceTypes
      });
      tabs.push({
        type: 'GROUP_SUMMARY',
        label: t('reports.groupSummary', 'Por Grupo'),
        icon: Layers,
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
  const [reportType, setReportType] = useState<'CLIENT_SUMMARY' | 'PRODUCTION' | 'DETAILED_ORDERS' | 'SERVICE_TYPES' | 'DEBTORS_CREDITORS' | 'RECEIPTS' | 'CATEGORY_SUMMARY' | 'GROUP_SUMMARY'>('CLIENT_SUMMARY');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('');
  const [showServiceTypesInCategory, setShowServiceTypesInCategory] = useState(false);
  const [showServiceTypesInGroup, setShowServiceTypesInGroup] = useState(false);
  const [receiptsSubView, setReceiptsSubView] = useState<'CLIENTS' | 'TRANSACTIONS'>('CLIENTS');

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
      case 'CATEGORY_SUMMARY': return canExportServiceTypes;
      case 'GROUP_SUMMARY': return canExportServiceTypes;
      case 'DEBTORS_CREDITORS': return canExportClientSummary;
      case 'RECEIPTS': return canExportClientSummary;
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

  // Consolidated list of all service categories
  const allCategoriesList = useMemo(() => {
    const cats = jobTypes.map(jt => (jt.category || 'Geral').trim()).filter(Boolean);
    let custom: string[] = [];
    try {
      const saved = localStorage.getItem('labprox_custom_job_categories');
      if (saved) custom = JSON.parse(saved);
    } catch (err) {}
    const merged = Array.from(new Set(['Geral', 'Prótese Fixa', 'Prótese Removível', 'Prótese Total', 'Ortodontia', 'Placas', 'Implante', 'Estética', ...cats, ...custom]));
    return merged.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [jobTypes]);

  // Job types filtered by selected category
  const availableJobTypesForFilter = useMemo(() => {
    if (!selectedServiceCategory) return jobTypes;
    const catTerm = selectedServiceCategory.toLowerCase().trim();
    return jobTypes.filter(jt => (jt.category || 'Geral').toLowerCase().trim() === catTerm);
  }, [jobTypes, selectedServiceCategory]);

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

  const getMatchingItems = (job: Job) => {
    if (!jobTypeId) return job.items || [];
    return (job.items || []).filter(item => {
      if (item.jobTypeId !== jobTypeId) return false;
      for (const [groupId, optionId] of Object.entries(variationFilters)) {
        if (optionId) {
          const hasOpt = item.selectedVariationIds?.includes(optionId);
          if (!hasOpt) return false;
        }
      }
      return true;
    });
  };

  const getJobDisplayValue = (job: Job) => {
    const matching = getMatchingItems(job);
    if (!jobTypeId) return safeNum(job.totalValue, 0);
    return matching.reduce((sum, it) => sum + ((safeNum(it.price) * safeNum(it.quantity, 1)) - safeNum(it.appliedDiscount, 0)), 0);
  };

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Date filter
      const rawDate = dateType === 'CREATED' ? job.createdAt : job.dueDate;
      const jobDate = parseSafeDate(rawDate);
      jobDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = parseSafeDate(startDate);
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        start.setHours(0, 0, 0, 0);
        if (jobDate < start) return false;
      }
      if (endDate) {
        const end = parseSafeDate(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(23, 59, 59, 999);
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
        const hasMatchingItem = (job.items || []).some(item => {
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
        if (statusFilter === 'COMPLETED' && job.status !== 'COMPLETED' && job.status !== 'DELIVERED') return false;
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

      // Service Category filter
      if (selectedServiceCategory) {
        const catTerm = selectedServiceCategory.toLowerCase().trim();
        const matchingTypeIds = new Set(
          jobTypes
            .filter(jt => (jt.category || 'Geral').toLowerCase().trim() === catTerm)
            .map(jt => jt.id)
        );

        const hasMatchingCategory = job.items?.some(item => {
          if (item.jobTypeId && matchingTypeIds.has(item.jobTypeId)) return true;
          const jt = jobTypes.find(t => t.id === item.jobTypeId || t.name === item.name);
          return jt && (jt.category || 'Geral').toLowerCase().trim() === catTerm;
        });

        if (!hasMatchingCategory) return false;
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
      const matchingItems = getMatchingItems(job);
      if (jobTypeId && matchingItems.length === 0) return;

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
      const itemsCount = matchingItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
      client.totalItems += itemsCount;
      const jobVal = getJobDisplayValue(job);
      client.totalBilling += jobVal;
      client.jobs.push(job);

      if (job.status === 'PENDING') client.statusBreakdown.pending++;
      else if (job.status === 'IN_PROGRESS' || job.status === 'SECTOR_TRANSITION' || job.status === 'WAITING_APPROVAL') client.statusBreakdown.inProgress++;
      else if (job.status === 'COMPLETED') client.statusBreakdown.completed++;
      else if (job.status === 'DELIVERED') client.statusBreakdown.delivered++;
      else if (job.status === 'CANCELED' || job.status === 'REJECTED') client.statusBreakdown.canceled++;

      grandTotalBilling += jobVal;
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

  // Devedores / Credores Data
  const debtorsData = useMemo(() => {
    const map = new Map<string, {
      id: string;
      code: string;
      name: string;
      clinicName: string;
      phone?: string;
      email?: string;
    }>();

    manualDentists.forEach((d, i) => {
      map.set(d.id, {
        id: d.id,
        code: String((d as any).code || (d as any).osNumber || (i + 1)),
        name: d.name,
        clinicName: d.clinicName || (d as any).address || 'Geral',
        phone: (d as any).phone || (d as any).whatsapp,
        email: d.email
      });
    });

    allUsers.filter(u => u.role === UserRole.DENTIST || (u.role as any) === 'CLIENT').forEach((u, i) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          code: String((u as any).code || (i + 100)),
          name: u.name,
          clinicName: (u as any).clinicName || 'Geral',
          phone: (u as any).phone || (u as any).whatsapp,
          email: u.email
        });
      }
    });

    jobs.forEach(j => {
      if (j.dentistId && !map.has(j.dentistId)) {
        map.set(j.dentistId, {
          id: j.dentistId,
          code: 'Geral',
          name: j.dentistName || 'Cliente',
          clinicName: j.clinicName || 'Geral'
        });
      }
    });

    const clientList = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const rawRows = clientList.map((client, idx) => {
      // Find all jobs for this client
      const clientJobs = jobs.filter(j => 
        (j.dentistId && j.dentistId === client.id) || 
        (j.dentistName && j.dentistName === client.name)
      );

      // Find all billable jobs (only COMPLETED or DELIVERED cases generate debt, matching Finance Contas a Receber)
      const validJobs = clientJobs.filter(j => {
        if (j.status === 'CANCELED' || j.status === 'REJECTED') return false;
        const isOnline = j.origin === 'ONLINE_ORDER' || j.origin === 'ONLINE_REQUISITION';
        const isCompleted = j.status === 'COMPLETED' || j.status === 'DELIVERED';
        return isCompleted || (isOnline && (j.paymentStatus === 'PAID' || isCompleted));
      });

      // Filter jobs up to cutoff date if endDate is provided
      const jobsUpToCutoff = validJobs.filter(j => {
        if (!endDate) return true;
        const jobDate = parseSafeDate(dateType === 'CREATED' ? j.createdAt : j.dueDate);
        jobDate.setHours(0, 0, 0, 0);
        const end = parseSafeDate(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(23, 59, 59, 999);
        return jobDate <= end;
      });

      // Filter payments up to cutoff date if endDate is provided
      const clientPayments = (dentistPayments || []).filter(p => p.dentistId === client.id);
      const paymentsUpToCutoff = clientPayments.filter(p => {
        if (!endDate) return true;
        const payDate = parseSafeDate(p.paymentDate || (p as any).createdAt);
        payDate.setHours(0, 0, 0, 0);
        const end = parseSafeDate(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(23, 59, 59, 999);
        return payDate <= end;
      });

      // Period jobs (within startDate and endDate)
      const periodJobs = validJobs.filter(j => {
        const jobDate = parseSafeDate(dateType === 'CREATED' ? j.createdAt : j.dueDate);
        jobDate.setHours(0, 0, 0, 0);

        if (startDate) {
          const start = parseSafeDate(startDate);
          start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
          start.setHours(0, 0, 0, 0);
          if (jobDate < start) return false;
        }
        if (endDate) {
          const end = parseSafeDate(endDate);
          end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
          end.setHours(23, 59, 59, 999);
          if (jobDate > end) return false;
        }
        return true;
      });

      // Last job date
      const sortedJobs = [...clientJobs].sort((a, b) => parseSafeDate(b.createdAt).getTime() - parseSafeDate(a.createdAt).getTime());
      const lastJob = sortedJobs[0];
      const lastJobDate = lastJob ? formatSafeDateStr(lastJob.createdAt) : '-';

      // Last payment info
      const sortedPayments = [...clientPayments].sort((a, b) => parseSafeDate(b.paymentDate || (b as any).createdAt).getTime() - parseSafeDate(a.paymentDate || (a as any).createdAt).getTime());
      const lastPay = sortedPayments[0];
      const lastPaymentStr = lastPay 
        ? `${formatSafeDateStr(lastPay.paymentDate || (lastPay as any).createdAt)} - R$ ${formatSafeCurrency(lastPay.amount)}`
        : '-';

      // Base balance (Faturamento de trabalhos finalizados no período selecionado)
      const baseBalance = periodJobs.reduce((sum, j) => sum + (j.totalValue || 0), 0);

      // Débitos Acumulados do Cliente (Apenas OSs Finalizadas + Débitos Manuais)
      const totalOSDebits = jobsUpToCutoff.reduce((sum, j) => sum + (j.totalValue || 0), 0);
      const manualDebits = paymentsUpToCutoff.filter(p => p.type === 'MANUAL_DEBIT').reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const debits = totalOSDebits + manualDebits;

      // Créditos Acumulados do Cliente (Pagamentos, Créditos Manuais e Descontos)
      const credits = paymentsUpToCutoff.reduce((sum, p) => {
        if (p.type === 'MANUAL_DEBIT') return sum;
        const amt = Number(p.amount || 0) + Number(p.discount || 0);
        return sum + amt;
      }, 0);

      // Saldo Atual Real do Cliente na Gaveta (Resultado real devendo ou em crédito de casos finalizados)
      const currentBalance = debits - credits;

      // Pagamentos Pendentes em Faturas
      const pendingBatches = (billingBatches || []).filter(b => (b.dentistId === client.id || b.dentistName === client.name) && b.status === 'PENDING');
      const pendingPayments = pendingBatches.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

      // Saldo Devedor Total (Reflete o Saldo Acumulado de Casos Finalizados)
      const totalDebtorBalance = currentBalance;

      return {
        idx: idx + 1,
        code: client.code || String(idx + 1),
        clientId: client.id,
        clientName: client.name,
        clinicName: client.clinicName,
        phone: client.phone,
        lastJobDate,
        lastPaymentStr,
        baseBalance,
        credits,
        debits,
        currentBalance,
        pendingPayments,
        totalDebtorBalance
      };
    });

    // Filter only clients with open balance/debt and apply search/dentist filters
    const filteredRows = rawRows.filter(r => {
      const hasOpenBalance = Math.abs(r.totalDebtorBalance) > 0.001 || 
                             Math.abs(r.currentBalance) > 0.001 || 
                             Math.abs(r.pendingPayments) > 0.001;
      
      if (!hasOpenBalance) {
        return false;
      }

      if (dentistId && r.clientId !== dentistId && (!selectedDentist || r.clientName !== selectedDentist.name)) {
        return false;
      }
      if (clientSearch.trim()) {
        const term = clientSearch.toLowerCase().trim();
        return r.clientName.toLowerCase().includes(term) || r.clinicName.toLowerCase().includes(term);
      }
      return true;
    });

    const rowsWithIdx = filteredRows.map((r, i) => ({ ...r, idx: i + 1 }));

    let grandBaseBalance = 0;
    let grandCredits = 0;
    let grandDebits = 0;
    let grandCurrentBalance = 0;
    let grandPendingPayments = 0;
    let grandTotalDebtor = 0;

    rowsWithIdx.forEach(r => {
      grandBaseBalance += r.baseBalance;
      grandCredits += r.credits;
      grandDebits += r.debits;
      grandCurrentBalance += r.currentBalance;
      grandPendingPayments += r.pendingPayments;
      grandTotalDebtor += r.totalDebtorBalance;
    });

    return {
      rows: rowsWithIdx,
      grandBaseBalance,
      grandCredits,
      grandDebits,
      grandCurrentBalance,
      grandPendingPayments,
      grandTotalDebtor,
      debtorsCount: rowsWithIdx.filter(r => r.totalDebtorBalance > 0.001).length
    };
  }, [jobs, manualDentists, allUsers, dentistPayments, billingBatches, startDate, endDate, dateType, clientSearch, dentistId, selectedDentist]);

  // Recebimentos (Receipts) Data
  const receiptsData = useMemo(() => {
    const rawPayments = (dentistPayments || []).filter(p => p.type !== 'MANUAL_DEBIT');

    const filtered = rawPayments.filter(p => {
      // Date filter based on paymentDate
      const payDateStr = p.paymentDate || (p as any).createdAt || (p as any).date;
      const payDate = new Date(payDateStr);
      payDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        start.setHours(0, 0, 0, 0);
        if (payDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(23, 59, 59, 999);
        if (payDate > end) return false;
      }

      // Dentist filter
      if (dentistId && p.dentistId !== dentistId && p.dentistName !== dentistId && (!selectedDentist || p.dentistName !== selectedDentist.name)) {
        return false;
      }

      // Client search text filter
      if (clientSearch.trim()) {
        const term = clientSearch.toLowerCase().trim();
        const matchName = (p.dentistName || '').toLowerCase().includes(term);
        const matchNotes = (p.notes || '').toLowerCase().includes(term);
        const matchMethod = translatePaymentMethod(p.paymentMethod).toLowerCase().includes(term);
        if (!matchName && !matchNotes && !matchMethod) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.paymentDate || (a as any).createdAt).getTime();
      const dateB = new Date(b.paymentDate || (b as any).createdAt).getTime();
      return dateB - dateA;
    });

    let totalAmountReceived = 0;
    let totalDiscountGiven = 0;
    const uniqueClientsSet = new Set<string>();
    const methodBreakdown: Record<string, { count: number; amount: number; discount: number }> = {};
    const clientGroupsMap = new Map<string, {
      clientId: string;
      clientName: string;
      totalAmount: number;
      totalDiscount: number;
      count: number;
      payments: typeof filtered;
    }>();

    filtered.forEach(p => {
      const amount = Number(p.amount || 0);
      const discount = Number(p.discount || 0);
      totalAmountReceived += amount;
      totalDiscountGiven += discount;

      const cName = p.dentistName || 'Cliente';
      const cId = p.dentistId || cName;
      uniqueClientsSet.add(cId);

      const methodKey = p.paymentMethod || 'OTHER';
      if (!methodBreakdown[methodKey]) {
        methodBreakdown[methodKey] = { count: 0, amount: 0, discount: 0 };
      }
      methodBreakdown[methodKey].count += 1;
      methodBreakdown[methodKey].amount += amount;
      methodBreakdown[methodKey].discount += discount;

      if (!clientGroupsMap.has(cId)) {
        clientGroupsMap.set(cId, {
          clientId: cId,
          clientName: cName,
          totalAmount: 0,
          totalDiscount: 0,
          count: 0,
          payments: []
        });
      }
      const grp = clientGroupsMap.get(cId)!;
      grp.totalAmount += amount;
      grp.totalDiscount += discount;
      grp.count += 1;
      grp.payments.push(p);
    });

    const clientGroups = Array.from(clientGroupsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    const uniqueClientsCount = uniqueClientsSet.size;
    const transactionCount = filtered.length;
    const averagePerClient = uniqueClientsCount > 0 ? totalAmountReceived / uniqueClientsCount : 0;

    return {
      filteredPayments: filtered,
      totalAmountReceived,
      totalDiscountGiven,
      transactionCount,
      uniqueClientsCount,
      averagePerClient,
      methodBreakdown,
      clientGroups
    };
  }, [dentistPayments, startDate, endDate, dentistId, selectedDentist, clientSearch]);

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
          key = formatSafeDateStr(dateType === 'CREATED' ? job.createdAt : job.dueDate);
        } else if (groupBy === 'JOB_TYPE') {
          if (jobTypeId && selectedJobType) {
            key = selectedJobType.name;
          } else {
            const items = job.items || [];
            key = items.length > 0 ? (items[0]?.name || t('reports.withoutType', 'Sem tipo')) : t('reports.withoutType', 'Sem tipo');
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
        const dateA = parseSafeDate(dateType === 'CREATED' ? a.createdAt : a.dueDate).getTime();
        const dateB = parseSafeDate(dateType === 'CREATED' ? b.createdAt : b.dueDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        
        const itemsA = a.items || [];
        const itemsB = b.items || [];
        const typeA = itemsA.length > 0 ? (itemsA[0]?.name || '') : '';
        const typeB = itemsB.length > 0 ? (itemsB[0]?.name || '') : '';
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
      (job.items || []).forEach((item: any) => {
        const typeId = item.jobTypeId || item.name;
        const matchingJt = jobTypes.find(tj => tj.id === typeId || tj.name === item.name);
        const typeName = matchingJt?.name || item.name;
        const typeCat = matchingJt?.category || 'Geral';

        if (selectedServiceCategory && typeCat.toLowerCase().trim() !== selectedServiceCategory.toLowerCase().trim()) {
          return;
        }

        if (!stats[typeName]) {
          stats[typeName] = { quantity: 0, totalValue: 0 };
        }
        stats[typeName].quantity += item.quantity || 1;
        stats[typeName].totalValue += (item.price * (item.quantity || 1)) - (item.appliedDiscount || 0);
      });
    });
    return stats;
  }, [filteredJobs, reportType, jobTypes, selectedServiceCategory]);

  const categoryStats = useMemo(() => {
    if (reportType !== 'CATEGORY_SUMMARY') return null;
    const stats: Record<string, { categoryName: string; quantity: number; totalValue: number; serviceTypesMap: Record<string, { name: string; quantity: number; totalValue: number }> }> = {};
    
    const categoriesToInitialize = selectedServiceCategory
      ? allCategoriesList.filter(cat => cat.toLowerCase().trim() === selectedServiceCategory.toLowerCase().trim())
      : allCategoriesList;

    categoriesToInitialize.forEach(cat => {
      stats[cat] = {
        categoryName: cat,
        quantity: 0,
        totalValue: 0,
        serviceTypesMap: {}
      };
    });

    filteredJobs.forEach(job => {
      (job.items || []).forEach((item: any) => {
        const typeId = item.jobTypeId || item.name;
        const matchingJt = jobTypes.find(tj => tj.id === typeId || tj.name === item.name);
        const typeName = matchingJt?.name || item.name || 'Serviço';
        const typeCat = (matchingJt?.category || 'Geral').trim();

        if (selectedServiceCategory && typeCat.toLowerCase().trim() !== selectedServiceCategory.toLowerCase().trim()) {
          return;
        }

        if (!stats[typeCat]) {
          stats[typeCat] = {
            categoryName: typeCat,
            quantity: 0,
            totalValue: 0,
            serviceTypesMap: {}
          };
        }

        const catEntry = stats[typeCat];
        const qty = item.quantity || 1;
        const val = (item.price * qty) - (item.appliedDiscount || 0);

        catEntry.quantity += qty;
        catEntry.totalValue += val;

        if (!catEntry.serviceTypesMap[typeName]) {
          catEntry.serviceTypesMap[typeName] = { name: typeName, quantity: 0, totalValue: 0 };
        }
        catEntry.serviceTypesMap[typeName].quantity += qty;
        catEntry.serviceTypesMap[typeName].totalValue += val;
      });
    });

    let result = Object.values(stats);
    if (selectedServiceCategory) {
      const catTerm = selectedServiceCategory.toLowerCase().trim();
      result = result.filter(s => s.categoryName.toLowerCase().trim() === catTerm);
    } else {
      result = result.filter(s => s.quantity > 0);
    }

    return result.sort((a, b) => b.quantity - a.quantity);
  }, [filteredJobs, reportType, jobTypes, allCategoriesList, selectedServiceCategory]);

  const groupStats = useMemo(() => {
    if (reportType !== 'GROUP_SUMMARY') return null;

    const stats: Record<string, {
      groupId: string;
      groupName: string;
      groupColor?: string;
      description?: string;
      quantity: number;
      totalValue: number;
      serviceTypesMap: Record<string, { name: string; quantity: number; totalValue: number }>;
    }> = {};

    (serviceGroups || []).forEach(grp => {
      stats[grp.id] = {
        groupId: grp.id,
        groupName: grp.name,
        groupColor: grp.color,
        description: grp.description,
        quantity: 0,
        totalValue: 0,
        serviceTypesMap: {}
      };
    });

    filteredJobs.forEach(job => {
      (job.items || []).forEach((item: any) => {
        const typeId = item.jobTypeId || item.name;
        const matchingJt = jobTypes.find(tj => tj.id === typeId || tj.name === item.name);
        if (!matchingJt) return;

        const qty = safeNum(item.quantity, 1);
        const val = (safeNum(item.price) * qty) - safeNum(item.appliedDiscount, 0);

        const selectedVariationIds: string[] = item.selectedVariationIds || [];
        const selectedVariationNames: string[] = [];
        
        if (matchingJt.variationGroups && selectedVariationIds.length > 0) {
          matchingJt.variationGroups.forEach(vg => {
            vg.options.forEach(opt => {
              if (selectedVariationIds.includes(opt.id)) {
                selectedVariationNames.push(opt.name);
              }
            });
          });
        }

        (serviceGroups || []).forEach(grp => {
          let matches = false;

          // 1. Check if JobType itself belongs to group
          if (matchingJt.groupIds?.includes(grp.id)) {
            matches = true;
          }

          // 2. Check if any selected variation option belongs to group
          if (!matches && matchingJt.variationGroups && selectedVariationIds.length > 0) {
            for (const vg of matchingJt.variationGroups) {
              for (const opt of vg.options) {
                if (selectedVariationIds.includes(opt.id) && opt.groupIds?.includes(grp.id)) {
                  matches = true;
                  break;
                }
              }
              if (matches) break;
            }
          }

          // 3. Check targets defined on group object
          if (!matches && grp.targets && grp.targets.length > 0) {
            for (const target of grp.targets) {
              if (target.jobTypeId === matchingJt.id) {
                const isTargetingSpecificOption = Boolean(target.optionId || target.optionName || target.optionValue);
                if (!isTargetingSpecificOption) {
                  // Targets the whole JobType
                  matches = true;
                  break;
                } else {
                  // Targets a specific variation option
                  const matchById = Boolean(target.optionId && selectedVariationIds.includes(target.optionId));
                  const matchByName = Boolean(
                    (target.optionName || target.optionValue) &&
                    selectedVariationNames.some(
                      name => name.toLowerCase().trim() === (target.optionName || target.optionValue)?.toLowerCase().trim()
                    )
                  );

                  if (matchById || matchByName) {
                    matches = true;
                    break;
                  }
                }
              }
            }
          }

          if (matches) {
            if (!stats[grp.id]) {
              stats[grp.id] = {
                groupId: grp.id,
                groupName: grp.name,
                groupColor: grp.color,
                description: grp.description,
                quantity: 0,
                totalValue: 0,
                serviceTypesMap: {}
              };
            }

            const entry = stats[grp.id];
            entry.quantity += qty;
            entry.totalValue += val;

            const displaySubName = selectedVariationNames.length > 0
              ? `${matchingJt.name} (${selectedVariationNames.join(', ')})`
              : matchingJt.name;

            if (!entry.serviceTypesMap[displaySubName]) {
              entry.serviceTypesMap[displaySubName] = { name: displaySubName, quantity: 0, totalValue: 0 };
            }
            entry.serviceTypesMap[displaySubName].quantity += qty;
            entry.serviceTypesMap[displaySubName].totalValue += val;
          }
        });
      });
    });

    const result = Object.values(stats).filter(s => s.quantity > 0);
    return result.sort((a, b) => b.quantity - a.quantity);
  }, [filteredJobs, reportType, jobTypes, serviceGroups]);

  // Export to PDF
  const generatePDF = () => {
    if (!canExportCurrentReport) {
      alert(t('reports.noExportPermission', 'Você não tem permissão para exportar este relatório. Solicite autorização ao administrador.'));
      return;
    }
    const isLandscape = reportType === 'DETAILED_ORDERS' || reportType === 'CLIENT_SUMMARY' || reportType === 'DEBTORS_CREDITORS';
    const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait');
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    let title = t('reports.pdfReportTitleProduction', 'Relatório de Produção - {{org}}', { org: orgName });
    if (reportType === 'CLIENT_SUMMARY') title = t('reports.pdfReportTitleClientSummary', 'Relatório de Faturamento e Casos por Cliente - {{org}}', { org: orgName });
    if (reportType === 'DEBTORS_CREDITORS') title = `Relatório de Devedores / Credores - ${orgName}`;
    if (reportType === 'RECEIPTS') title = `Relatório de Recebimentos - ${orgName}`;
    if (reportType === 'DETAILED_ORDERS') title = t('reports.pdfReportTitleDetailedOrders', 'Relatório Detalhado de Pedidos - {{org}}', { org: orgName });
    if (reportType === 'SERVICE_TYPES') title = t('reports.pdfReportTitleServiceTypes', 'Relatório de Tipos de Serviço - {{org}}', { org: orgName });
    if (reportType === 'CATEGORY_SUMMARY') title = `Relatório por Categoria - ${orgName}`;
    if (reportType === 'GROUP_SUMMARY') title = `Relatório por Grupo de Serviço - ${orgName}`;
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
    
    // --- PDF: DEBTORS_CREDITORS ---
    if (reportType === 'DEBTORS_CREDITORS') {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `Total Saldo Devedor: R$ ${debtorsData.grandTotalDebtor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Clientes Devedores: ${debtorsData.debtorsCount}`, 
        14, 34
      );

      const tableData = debtorsData.rows.map(r => [
        r.code,
        r.clientName,
        r.lastJobDate,
        r.lastPaymentStr,
        `R$ ${r.baseBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${r.credits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${r.debits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${r.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${r.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${r.totalDebtorBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      // Total Row
      tableData.push([
        'TOTAL',
        '-',
        '-',
        '-',
        `R$ ${debtorsData.grandBaseBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${debtorsData.grandCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${debtorsData.grandDebits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${debtorsData.grandCurrentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${debtorsData.grandPendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${debtorsData.grandTotalDebtor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 40,
        head: [[
          'Nº',
          'Cliente',
          'Último Pedido',
          'Último Pagam.',
          'Saldo Base',
          'Créditos',
          'Débitos',
          'Saldo Atual',
          'Pag. Pendentes',
          'Saldo Devedor Total'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72] }, // Rose 600
        styles: { fontSize: 7, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center' },
          1: { fontStyle: 'bold' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          9: { fontStyle: 'bold', halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 241, 242];
            data.cell.styles.textColor = [159, 18, 57];
          }
        }
      });
      
      doc.save(`relatorio-devedores-credores-${new Date().getTime()}.pdf`);
      return;
    }

    // --- PDF: RECEIPTS ---
    if (reportType === 'RECEIPTS') {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `Total Recebido: R$ ${receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Descontos: R$ ${receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Qtd Pagamentos: ${receiptsData.transactionCount}  |  Clientes: ${receiptsData.uniqueClientsCount}`, 
        14, 34
      );

      const tableData = receiptsData.filteredPayments.map(p => [
        new Date(p.paymentDate || (p as any).createdAt).toLocaleDateString('pt-BR'),
        p.dentistName || 'Cliente',
        translatePaymentMethod(p.paymentMethod),
        `R$ ${Number(p.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        p.notes || '-'
      ]);

      tableData.push([
        'TOTAL GERAL',
        `${receiptsData.uniqueClientsCount} clientes`,
        `${receiptsData.transactionCount} recebimentos`,
        `R$ ${receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        '-'
      ]);

      autoTable(doc, {
        startY: 40,
        head: [[
          'Data',
          'Cliente / Dentista',
          'Forma de Pagamento',
          'Desconto (R$)',
          'Valor Recebido (R$)',
          'Observações'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }, // Emerald 600
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center' },
          1: { fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { fontStyle: 'bold', halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [236, 253, 245];
            data.cell.styles.textColor = [4, 120, 87];
          }
        }
      });
      
      doc.save(`relatorio-recebimentos-${new Date().getTime()}.pdf`);
      return;
    }

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

    // --- PDF: CATEGORY_SUMMARY ---
    if (reportType === 'CATEGORY_SUMMARY' && categoryStats) {
      doc.text(`Total de trabalhos: ${filteredJobs.length}`, 14, 36);
      
      const tableData: any[] = [];
      categoryStats.forEach(cat => {
        tableData.push([
          `[CATEGORIA] ${cat.categoryName}`,
          cat.quantity.toString(),
          `R$ ${cat.totalValue.toFixed(2)}`
        ]);
        Object.values(cat.serviceTypesMap).forEach(st => {
          tableData.push([
            `   └─ ${st.name}`,
            st.quantity.toString(),
            `R$ ${st.totalValue.toFixed(2)}`
          ]);
        });
      });

      autoTable(doc, {
        startY: 45,
        head: [[
          'Categoria / Tipo de Serviço',
          'Quantidade Produzida',
          'Valor Total Produzido'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9, cellPadding: 3 },
      });
      
      doc.save(`relatorio-por-categoria-${new Date().getTime()}.pdf`);
      return;
    }

    // --- PDF: GROUP_SUMMARY ---
    if (reportType === 'GROUP_SUMMARY' && groupStats) {
      doc.text(`Total de trabalhos: ${filteredJobs.length}`, 14, 36);
      
      const tableData: any[] = [];
      groupStats.forEach(grp => {
        tableData.push([
          `[GRUPO] ${grp.groupName}`,
          grp.quantity.toString(),
          `R$ ${grp.totalValue.toFixed(2)}`
        ]);
        Object.values(grp.serviceTypesMap).forEach(st => {
          tableData.push([
            `   └─ ${st.name}`,
            st.quantity.toString(),
            `R$ ${st.totalValue.toFixed(2)}`
          ]);
        });
      });

      autoTable(doc, {
        startY: 45,
        head: [[
          'Grupo / Tipo de Serviço',
          'Quantidade Produzida',
          'Valor Total Produzido'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 9, cellPadding: 3 },
      });
      
      doc.save(`relatorio-por-grupo-${new Date().getTime()}.pdf`);
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
    if (reportType === 'CATEGORY_SUMMARY' && categoryStats) {
      const rows: any[] = [];
      categoryStats.forEach(cat => {
        rows.push({
          'Categoria / Tipo de Serviço': `[CATEGORIA] ${cat.categoryName}`,
          'Quantidade Produzida': cat.quantity,
          'Valor Total Produzido (R$)': Number(cat.totalValue.toFixed(2))
        });
        Object.values(cat.serviceTypesMap).forEach(st => {
          rows.push({
            'Categoria / Tipo de Serviço': `   └─ ${st.name}`,
            'Quantidade Produzida': st.quantity,
            'Valor Total Produzido (R$)': Number(st.totalValue.toFixed(2))
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Por_Categoria');
      XLSX.writeFile(wb, `relatorio_por_categoria_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }
    if (reportType === 'GROUP_SUMMARY' && groupStats) {
      const rows: any[] = [];
      groupStats.forEach(grp => {
        rows.push({
          'Grupo / Tipo de Serviço': `[GRUPO] ${grp.groupName}`,
          'Quantidade Produzida': grp.quantity,
          'Valor Total Produzido (R$)': Number(grp.totalValue.toFixed(2))
        });
        Object.values(grp.serviceTypesMap).forEach(st => {
          rows.push({
            'Grupo / Tipo de Serviço': `   └─ ${st.name}`,
            'Quantidade Produzida': st.quantity,
            'Valor Total Produzido (R$)': Number(st.totalValue.toFixed(2))
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Por_Grupo');
      XLSX.writeFile(wb, `relatorio_por_grupo_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }
    if (reportType === 'DEBTORS_CREDITORS') {
      const rows = debtorsData.rows.map((r) => ({
        'Nº': r.code,
        'Cliente': r.clientName,
        'Clínica': r.clinicName || '-',
        'Último Pedido': r.lastJobDate,
        'Último Pagamento': r.lastPaymentStr,
        'Saldo Base (R$)': Number(r.baseBalance.toFixed(2)),
        'Créditos (R$)': Number(r.credits.toFixed(2)),
        'Débitos (R$)': Number(r.debits.toFixed(2)),
        'Saldo Atual (R$)': Number(r.currentBalance.toFixed(2)),
        'Pag. Pendentes (R$)': Number(r.pendingPayments.toFixed(2)),
        'Saldo Devedor Total (R$)': Number(r.totalDebtorBalance.toFixed(2))
      }));

      rows.push({
        'Nº': 'TOTAL',
        'Cliente': 'TOTAL GERAL',
        'Clínica': '-',
        'Último Pedido': '-',
        'Último Pagamento': '-',
        'Saldo Base (R$)': Number(debtorsData.grandBaseBalance.toFixed(2)),
        'Créditos (R$)': Number(debtorsData.grandCredits.toFixed(2)),
        'Débitos (R$)': Number(debtorsData.grandDebits.toFixed(2)),
        'Saldo Atual (R$)': Number(debtorsData.grandCurrentBalance.toFixed(2)),
        'Pag. Pendentes (R$)': Number(debtorsData.grandPendingPayments.toFixed(2)),
        'Saldo Devedor Total (R$)': Number(debtorsData.grandTotalDebtor.toFixed(2))
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Devedores_Credores');
      XLSX.writeFile(wb, `devedores_credores_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }
    if (reportType === 'RECEIPTS') {
      const rows = receiptsData.filteredPayments.map((p) => ({
        'Data Recebimento': new Date(p.paymentDate || (p as any).createdAt).toLocaleDateString('pt-BR'),
        'Cliente / Dentista': p.dentistName || 'Cliente',
        'Forma de Pagamento': translatePaymentMethod(p.paymentMethod),
        'Valor Recebido (R$)': Number(Number(p.amount || 0).toFixed(2)),
        'Desconto Concedido (R$)': Number(Number(p.discount || 0).toFixed(2)),
        'Observações / Notas': p.notes || '-'
      }));

      rows.push({
        'Data Recebimento': 'TOTAL GERAL',
        'Cliente / Dentista': `${receiptsData.uniqueClientsCount} clientes com pagamentos`,
        'Forma de Pagamento': `${receiptsData.transactionCount} transações`,
        'Valor Recebido (R$)': Number(receiptsData.totalAmountReceived.toFixed(2)),
        'Desconto Concedido (R$)': Number(receiptsData.totalDiscountGiven.toFixed(2)),
        'Observações / Notas': '-'
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recebimentos');
      XLSX.writeFile(wb, `relatorio_recebimentos_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    setSelectedServiceCategory('');
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
    }).sort((a, b) => parseSafeDate(a.createdAt).getTime() - parseSafeDate(b.createdAt).getTime());

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

  let content;
  try {
    content = (
    <div className="p-4 md:p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#131B2A] p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center font-black shadow-inner shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {t('reports.title', 'Relatórios & Faturamento')}
                </h1>
                {!canExportCurrentReport && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock size={10} />
                    {t('reports.viewOnlyBadge', 'Apenas Visualização')}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
                {t('reports.subtitle', 'Consulte o faturamento por cliente, volume de casos e acompanhe a produção.')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full md:w-auto">
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
            className={`w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider border shadow-sm ${
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
            className={`w-full sm:w-auto px-3.5 sm:px-5 py-2.5 sm:py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider shadow-lg ${
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

      {/* 3-Column Report Categories Layout (Clientes, Produção, Financeiro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Category Card 1: Clientes */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0 border border-teal-100/80">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Clientes</h3>
              <p className="text-[11px] text-slate-400 font-medium">Relatórios de faturamento e movimentação</p>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {canViewClientSummary && (
              <button
                type="button"
                onClick={() => setReportType('CLIENT_SUMMARY')}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                  reportType === 'CLIENT_SUMMARY'
                    ? 'bg-teal-50/90 border-teal-300 ring-2 ring-teal-500/20 text-teal-950 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wide">Resumo por Cliente</span>
                  {reportType === 'CLIENT_SUMMARY' && <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">Ativo</span>}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                  Listagem de todos os clientes com faturamento, quantidade de casos e ticket médio.
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Category Card 2: Produção */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 border border-indigo-100/80">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Produção</h3>
              <p className="text-[11px] text-slate-400 font-medium">Acompanhamento de pedidos e serviços</p>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {canViewProduction && (
              <button
                type="button"
                onClick={() => setReportType('PRODUCTION')}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                  reportType === 'PRODUCTION'
                    ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wide">Produção Básica</span>
                  {reportType === 'PRODUCTION' && <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">Ativo</span>}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                  Acompanhamento geral dos trabalhos por data de entrada, entrega, setor ou colaborador.
                </p>
              </button>
            )}

            {canViewDetailedOrders && (
              <button
                type="button"
                onClick={() => setReportType('DETAILED_ORDERS')}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                  reportType === 'DETAILED_ORDERS'
                    ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 text-amber-950 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wide">Pedidos Detalhados</span>
                  {reportType === 'DETAILED_ORDERS' && <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Ativo</span>}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                  Listagem detalhada de ordens com serviços inclusos, caixas, paciente e valores.
                </p>
              </button>
            )}

            {canViewServiceTypes && (
              <button
                type="button"
                onClick={() => setReportType('SERVICE_TYPES')}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                  reportType === 'SERVICE_TYPES'
                    ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-500/20 text-purple-950 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wide">Tipos de Serviço</span>
                  {reportType === 'SERVICE_TYPES' && <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Ativo</span>}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                  Quantidade produzida e faturamento gerado por cada tipo de serviço ou categoria.
                </p>
              </button>
            )}

            {canViewServiceTypes && (
              <button
                type="button"
                onClick={() => setReportType('CATEGORY_SUMMARY')}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                  reportType === 'CATEGORY_SUMMARY'
                    ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 text-blue-950 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wide">Por Categoria</span>
                  {reportType === 'CATEGORY_SUMMARY' && <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">Ativo</span>}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                  Somatória de quantidade de elementos e valor total por categoria de serviço.
                </p>
              </button>
            )}

            {canViewServiceTypes && (
              <button
                type="button"
                onClick={() => setReportType('GROUP_SUMMARY')}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                  reportType === 'GROUP_SUMMARY'
                    ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-500/20 text-purple-950 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wide">Por Grupo</span>
                  {reportType === 'GROUP_SUMMARY' && <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Ativo</span>}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                  Somatória de quantidade e valor total agrupados por grupo de métricas.
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Category Card 3: Financeiro */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0 border border-emerald-100/80">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Financeiro</h3>
              <p className="text-[11px] text-slate-400 font-medium">Fluxo de caixa e contas a receber</p>
            </div>
          </div>

          <div className="space-y-2 flex-1">
            {canViewClientSummary && (
              <>
                <button
                  type="button"
                  onClick={() => setReportType('DEBTORS_CREDITORS')}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                    reportType === 'DEBTORS_CREDITORS'
                      ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 text-rose-950 shadow-sm'
                      : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide">Devedores e Credores</span>
                    {reportType === 'DEBTORS_CREDITORS' && <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">Ativo</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                    Listagem de clientes com saldos devedores em aberto, faturas e créditos.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('RECEIPTS')}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                    reportType === 'RECEIPTS'
                      ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-950 shadow-sm'
                      : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide">Recebimentos</span>
                    {reportType === 'RECEIPTS' && <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Ativo</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                    Extrato detalhado de todos os recebimentos e pagamentos efetuados por período.
                  </p>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Empty Selection Notice */}
      { !reportType ? (
        <div className="bg-slate-50/80 border-2 border-dashed border-slate-200/80 rounded-3xl p-10 text-center space-y-3 animate-in fade-in duration-300">
          <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
            <FileText size={28} />
          </div>
          <h3 className="font-black text-slate-800 text-lg">Selecione um Relatório Acima</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Escolha uma das opções nos grupos de <strong>Clientes</strong>, <strong>Produção</strong> ou <strong>Financeiro</strong> para carregar os filtros e os dados do relatório.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* KPI Cards when in RECEIPTS mode */}
      {reportType === 'RECEIPTS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total Recebido</span>
              <p className="text-xl font-black text-emerald-700 truncate">
                R$ {receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Entradas no período</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Total Descontos</span>
              <p className="text-xl font-black text-amber-700 truncate">
                R$ {receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Descontos concedidos</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Qtd Recebimentos</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {receiptsData.transactionCount} <span className="text-sm font-bold text-slate-400">pagamentos</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">Transações efetuadas</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Clientes Atendidos</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {receiptsData.uniqueClientsCount} <span className="text-sm font-bold text-slate-400">clientes</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">Com recebimento no período</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">Média por Cliente</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {receiptsData.averagePerClient.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Valor médio pago</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards when in DEBTORS_CREDITORS mode */}
      {reportType === 'DEBTORS_CREDITORS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Total Saldo Devedor</span>
              <p className="text-xl font-black text-rose-700 truncate">
                R$ {debtorsData.grandTotalDebtor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Saldo devedor acumulado</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Clientes Devedores</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {debtorsData.debtorsCount} <span className="text-sm font-bold text-slate-400">clientes</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">Com saldo em aberto</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Saldo Base (Faturamento)</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {debtorsData.grandBaseBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Faturamento do período</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total Créditos / Pagam.</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {debtorsData.grandCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Pagamentos Efetuados</span>
            </div>
          </div>
        </div>
      )}

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
                                  {p.totalJobs} {p.totalJobs === 1 ? 'caso / OS' : 'casos / OSs'} • R$ {formatSafeFixed(p.totalValue, 2)}
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

          {/* ALWAYS VISIBLE: SERVICE CATEGORY FILTER */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Folder size={13} className="text-teal-600" /> Categoria de Serviço
              </label>
              {selectedServiceCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceCategory('');
                    setJobTypeId('');
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('common.clear', 'Limpar')}
                </button>
              )}
            </div>
            <select 
              value={selectedServiceCategory} 
              onChange={(e) => {
                setSelectedServiceCategory(e.target.value);
                setJobTypeId('');
              }} 
              className={`w-full p-3 border rounded-xl font-bold text-slate-700 focus:ring-2 outline-none text-sm transition-all shadow-sm ${
                selectedServiceCategory ? 'bg-teal-50/40 border-teal-300 ring-1 ring-teal-200' : 'bg-slate-50 border-slate-200 focus:ring-teal-500'
              }`}
            >
              <option value="">Todas as Categorias</option>
              {allCategoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* ALWAYS VISIBLE: SERVICE TYPE FILTER */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Package size={13} className="text-teal-600" /> Tipo de Serviço
              </label>
              {jobTypeId && (
                <button
                  type="button"
                  onClick={() => setJobTypeId('')}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('common.clear', 'Limpar')}
                </button>
              )}
            </div>
            <select 
              value={jobTypeId} 
              onChange={(e) => { setJobTypeId(e.target.value); setVariationFilters({}); }} 
              className={`w-full p-3 border rounded-xl font-bold text-slate-700 focus:ring-2 outline-none text-sm transition-all shadow-sm ${
                jobTypeId ? 'bg-teal-50/40 border-teal-300 ring-1 ring-teal-200' : 'bg-slate-50 border-slate-200 focus:ring-teal-500'
              }`}
            >
              <option value="">{t('reports.allTypes', 'Todos os Tipos de Serviço')}</option>
              {availableJobTypesForFilter.map(jt => (
                <option key={jt.id} value={jt.id}>
                  {jt.name} {!selectedServiceCategory && jt.category ? `(${jt.category})` : ''}
                </option>
              ))}
            </select>
          </div>

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
                  <option value="COMPLETED">Concluído (Faturado)</option>
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
        {/* --- VIEW: RECEIPTS (Recebimentos) --- */}
        {reportType === 'RECEIPTS' ? (
          <div>
            {/* Header & Sub-view Switcher */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="text-emerald-600" size={20} />
                  Relatório de Recebimentos
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  Extrato detalhado de todos os valores recebidos no período filtrado
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex bg-slate-200/70 p-1 rounded-xl">
                  <button
                    onClick={() => setReceiptsSubView('CLIENTS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      receiptsSubView === 'CLIENTS' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Por Cliente
                  </button>
                  <button
                    onClick={() => setReceiptsSubView('TRANSACTIONS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      receiptsSubView === 'TRANSACTIONS' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Lista de Recebimentos
                  </button>
                </div>

                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente, método ou nota..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Summary Chips */}
            {Object.keys(receiptsData.methodBreakdown).length > 0 && (
              <div className="p-4 sm:p-5 bg-emerald-50/30 border-b border-emerald-100/50 flex flex-wrap gap-2.5 items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 mr-1 flex items-center gap-1">
                  <BarChart3 size={13} /> Por Forma de Pagamento:
                </span>
                {Object.entries(receiptsData.methodBreakdown).map(([method, stats]) => (
                  <div key={method} className="bg-white border border-emerald-200/80 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{translatePaymentMethod(method)}:</span>
                    <span className="text-xs font-black text-emerald-700">R$ {stats.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">({stats.count})</span>
                  </div>
                ))}
              </div>
            )}

            {receiptsData.filteredPayments.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold text-base text-slate-600">Nenhum recebimento encontrado no período selecionado.</p>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de data ou selecione outro cliente.</p>
              </div>
            ) : receiptsSubView === 'CLIENTS' ? (
              /* Grouped by Client View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="p-4 pl-6">Cliente / Dentista</th>
                      <th className="p-4 text-center">Qtd Recebimentos</th>
                      <th className="p-4 text-right">Desconto Total (R$)</th>
                      <th className="p-4 text-right">Total Recebido (R$)</th>
                      <th className="p-4 pr-6 text-center">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptsData.clientGroups.map((grp) => {
                      const isExpanded = expandedClientId === grp.clientId;
                      return (
                        <React.Fragment key={grp.clientId}>
                          <tr className={`hover:bg-emerald-50/20 transition-colors ${isExpanded ? 'bg-emerald-50/30' : ''}`}>
                            <td className="p-4 pl-6 font-bold text-slate-900">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shrink-0">
                                  {grp.clientName.charAt(0).toUpperCase()}
                                </div>
                                <span>{grp.clientName}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center font-bold text-slate-600">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                                {grp.count} {grp.count === 1 ? 'pagamento' : 'pagamentos'}
                              </span>
                            </td>
                            <td className="p-4 text-right font-bold text-amber-600">
                              R$ {grp.totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-right font-black text-sm text-emerald-700">
                              R$ {grp.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 pr-6 text-center">
                              <button
                                onClick={() => setExpandedClientId(isExpanded ? null : grp.clientId)}
                                className="p-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                <span>{isExpanded ? 'Ocultar' : 'Ver Extrato'}</span>
                              </button>
                            </td>
                          </tr>

                          {/* Expanded payments for this client */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={5} className="p-4 sm:p-6 border-y border-emerald-100">
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Wallet size={15} className="text-emerald-600" />
                                    Histórico de Recebimentos de {grp.clientName}
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                          <th className="py-2 px-3">Data</th>
                                          <th className="py-2 px-3">Forma de Pagamento</th>
                                          <th className="py-2 px-3 text-right">Desconto (R$)</th>
                                          <th className="py-2 px-3 text-right">Valor Recebido (R$)</th>
                                          <th className="py-2 px-3">Observações</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {grp.payments.map((p, pIdx) => (
                                          <tr key={p.id || pIdx} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                              {formatSafeDateStr(p.paymentDate || (p as any).createdAt)}
                                            </td>
                                            <td className="py-2.5 px-3 font-bold text-slate-800">
                                              {translatePaymentMethod(p.paymentMethod)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                                              R$ {Number(p.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                                              R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500 text-xs italic">
                                              {p.notes || '-'}
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
                  <tfoot>
                    <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-black text-xs text-slate-900">
                      <td className="p-4 pl-6 font-bold text-emerald-900">TOTAL GERAL</td>
                      <td className="p-4 text-center text-emerald-900">{receiptsData.transactionCount} recebimentos</td>
                      <td className="p-4 text-right text-emerald-900">
                        R$ {receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-sm text-emerald-900 font-black">
                        R$ {receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 pr-6"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Flat Transactions List View */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="p-4 pl-6 text-center">Data</th>
                      <th className="p-4">Cliente / Dentista</th>
                      <th className="p-4">Forma de Pagamento</th>
                      <th className="p-4 text-right">Desconto (R$)</th>
                      <th className="p-4 text-right">Valor Recebido (R$)</th>
                      <th className="p-4 pr-6">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptsData.filteredPayments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-4 pl-6 text-center font-mono font-bold text-slate-600">
                          {formatSafeDateStr(p.paymentDate || (p as any).createdAt)}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {p.dentistName || 'Cliente'}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-lg text-xs font-bold">
                            {translatePaymentMethod(p.paymentMethod)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-amber-600">
                          R$ {Number(p.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-black text-sm text-emerald-700">
                          R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 pr-6 text-slate-500 text-xs italic">
                          {p.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-black text-xs text-slate-900">
                      <td className="p-4 pl-6 text-center font-bold text-emerald-900">TOTAL</td>
                      <td className="p-4 font-bold text-emerald-900">{receiptsData.uniqueClientsCount} clientes</td>
                      <td className="p-4 font-bold text-emerald-900">{receiptsData.transactionCount} recebimentos</td>
                      <td className="p-4 text-right text-emerald-900">
                        R$ {receiptsData.totalDiscountGiven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-sm text-emerald-900 font-black">
                        R$ {receiptsData.totalAmountReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 pr-6"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : reportType === 'DEBTORS_CREDITORS' ? (
          <div>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="text-rose-600" size={20} />
                  Devedores / Credores
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 bg-rose-50 border border-rose-200/80 text-rose-900 px-2.5 py-0.5 rounded-lg">
                    Devedor | Período de cobrança: {startDate ? startDate : 'Todos'} até {endDate ? endDate : 'Todos'} | Status: Todos
                  </span>
                </div>
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar devedor pelo nome..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none shadow-sm"
                />
                {clientSearch && (
                  <button onClick={() => setClientSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {debtorsData.rows.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold text-base text-slate-600">Nenhum registro encontrado no relatório de Devedores / Credores.</p>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de data ou a busca pelo nome do cliente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="p-3.5 pl-6 text-center">Nº</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5 text-center">Último pedido</th>
                      <th className="p-3.5 text-center">Último pagam.</th>
                      <th className="p-3.5 text-right">Saldo base</th>
                      <th className="p-3.5 text-right">Créditos</th>
                      <th className="p-3.5 text-right">Débitos</th>
                      <th className="p-3.5 text-right">Saldo atual</th>
                      <th className="p-3.5 text-right">Pag. pendentes</th>
                      <th className="p-3.5 pr-6 text-right">Saldo devedor total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {debtorsData.rows.map((row) => (
                      <tr key={row.clientId} className="hover:bg-rose-50/20 transition-colors">
                        <td className="p-3.5 pl-6 text-center font-mono font-bold text-slate-500">
                          {row.code}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <span className="block">{row.clientName}</span>
                          {row.clinicName && <span className="text-[10px] text-slate-400 font-normal">{row.clinicName}</span>}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 font-medium">
                          {row.lastJobDate}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 font-medium">
                          {row.lastPaymentStr}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-700">
                          R$ {row.baseBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-600">
                          R$ {row.credits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-700">
                          R$ {row.debits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-800">
                          R$ {row.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-right font-bold text-amber-600">
                          R$ {row.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`p-3.5 pr-6 text-right font-black ${row.totalDebtorBalance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          R$ {row.totalDebtorBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-50/70 border-t-2 border-rose-200 font-black text-xs text-slate-900">
                      <td className="p-3.5 pl-6 text-center font-bold text-rose-900">TOTAL</td>
                      <td className="p-3.5 text-rose-900 font-bold">{debtorsData.rows.length} clientes</td>
                      <td className="p-3.5 text-center text-rose-900">-</td>
                      <td className="p-3.5 text-center text-rose-900">-</td>
                      <td className="p-3.5 text-right text-rose-900">
                        R$ {debtorsData.grandBaseBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-900">
                        R$ {debtorsData.grandCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-900">
                        R$ {debtorsData.grandDebits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-900">
                        R$ {debtorsData.grandCurrentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-900">
                        R$ {debtorsData.grandPendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 pr-6 text-right text-sm text-rose-900 font-black">
                        R$ {debtorsData.grandTotalDebtor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : reportType === 'CLIENT_SUMMARY' ? (
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
                              R$ {formatSafeCurrency(client.totalBilling)}
                            </td>

                            <td className="p-4 text-right text-xs font-bold text-slate-700">
                              R$ {formatSafeCurrency(client.averageTicket)}
                            </td>

                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xs font-bold text-slate-600 w-10 text-right">
                                  {formatSafeFixed(client.percentage, 1)}%
                                </span>
                                <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className="bg-teal-500 h-full rounded-full transition-all" 
                                    style={{ width: `${Math.min(100, Math.max(5, safeNum(client.percentage)))}%` }} 
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
                                      <span>{t('reports.clientTotal', 'Total do Cliente:')} <strong className="text-teal-700">R$ {formatSafeFixed(client.totalBilling, 2)}</strong></span>
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
                                            <td className="py-2.5 px-3 text-slate-500">{formatSafeDateStr(job.createdAt)}</td>
                                            <td className="py-2.5 px-3 text-slate-500">{formatSafeDateStr(job.dueDate)}</td>
                                            <td className="py-2.5 px-3">
                                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                                {getStatusLabel(job.status)}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-teal-700">
                                              R$ {formatSafeFixed(job.totalValue, 2)}
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
        ) : reportType === 'CATEGORY_SUMMARY' && categoryStats ? (
          /* --- VIEW: CATEGORY_SUMMARY --- */
          <div className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  Relatório de Produção por Categoria
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Somatória de quantidade de elementos e valor total por categoria de serviço.
                </p>
              </div>

              <label className="flex items-center gap-2 px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200/70 rounded-xl border border-slate-200 cursor-pointer select-none transition-all shadow-2xs">
                <input
                  type="checkbox"
                  checked={showServiceTypesInCategory}
                  onChange={(e) => setShowServiceTypesInCategory(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Visualizar tipos de serviço</span>
              </label>
            </div>

            {categoryStats.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50/50 rounded-2xl border border-slate-100">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-20 text-blue-600" />
                <p className="font-bold text-sm">Nenhuma produção registrada para esta categoria no período.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryStats.map((cat) => (
                  <div key={cat.categoryName} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-black flex items-center justify-center text-sm shadow-xs">
                          {cat.categoryName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-base">{cat.categoryName}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {Object.keys(cat.serviceTypesMap).length} {Object.keys(cat.serviceTypesMap).length === 1 ? 'tipo de serviço' : 'tipos de serviço'} produzidos
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Qtd Total</span>
                          <span className="text-sm font-black text-slate-900">{cat.quantity} elementos</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Valor Total</span>
                          <span className="text-sm font-black text-blue-700">R$ {cat.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sublist of service types inside category - conditionally shown when checkbox is checked */}
                    {showServiceTypesInCategory && Object.keys(cat.serviceTypesMap).length > 0 && (
                      <div className="pl-4 sm:pl-12 space-y-2 pt-1 animate-in fade-in duration-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                          Detalhamento por Tipo de Serviço:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {Object.values(cat.serviceTypesMap).map((st) => (
                            <div key={st.name} className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-slate-800 truncate" title={st.name}>{st.name}</span>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-black text-slate-900 block">{st.quantity} un.</span>
                                <span className="text-[11px] font-bold text-teal-700">R$ {st.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : reportType === 'GROUP_SUMMARY' && groupStats ? (
          /* --- VIEW: GROUP_SUMMARY --- */
          <div className="p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Layers className="text-purple-600" size={20} />
                  Relatório de Produção por Grupo
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Somatória de quantidade de elementos e valor total por grupo de métricas.
                </p>
              </div>

              <label className="flex items-center gap-2 px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200/70 rounded-xl border border-slate-200 cursor-pointer select-none transition-all shadow-2xs">
                <input
                  type="checkbox"
                  checked={showServiceTypesInGroup}
                  onChange={(e) => setShowServiceTypesInGroup(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">Visualizar tipos de serviço</span>
              </label>
            </div>

            {groupStats.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50/50 rounded-2xl border border-slate-100">
                <Layers size={40} className="mx-auto mb-3 opacity-20 text-purple-600" />
                <p className="font-bold text-sm">Nenhum grupo de métricas com produção registrada no período.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupStats.map((grp) => (
                  <div key={grp.groupId} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl text-white font-black flex items-center justify-center text-sm shadow-xs"
                          style={{ backgroundColor: grp.groupColor || '#8B5CF6' }}
                        >
                          {grp.groupName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-base">{grp.groupName}</h4>
                          {grp.description ? (
                            <span className="text-[11px] text-slate-500 font-medium">{grp.description}</span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">
                              {Object.keys(grp.serviceTypesMap).length} {Object.keys(grp.serviceTypesMap).length === 1 ? 'tipo/variação de serviço' : 'tipos/variações de serviço'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Qtd Total</span>
                          <span className="text-sm font-black text-slate-900">{grp.quantity} elementos</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Valor Total</span>
                          <span className="text-sm font-black text-purple-700">R$ {grp.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sublist of service types inside group - conditionally shown when checkbox is checked */}
                    {showServiceTypesInGroup && Object.keys(grp.serviceTypesMap).length > 0 && (
                      <div className="pl-4 sm:pl-12 space-y-2 pt-1 animate-in fade-in duration-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                          Detalhamento por Tipo de Serviço / Variação:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {Object.values(grp.serviceTypesMap).map((st) => (
                            <div key={st.name} className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-slate-800 truncate" title={st.name}>{st.name}</span>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-black text-slate-900 block">{st.quantity} un.</span>
                                <span className="text-[11px] font-bold text-teal-700">R$ {st.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                            const completedHist = Array.isArray(job.history) ? job.history.slice().reverse().find((h: any) => h?.action === 'COMPLETED' || h?.statusTo === JobStatus.COMPLETED) : null;
                            const finishDate = (job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED) && completedHist ? formatSafeDateStr(completedHist.timestamp) : '-';
                            return (
                              <tr key={job.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                                <td className="p-3 font-bold text-slate-700 text-xs">{job.boxNumber || '-'}</td>
                                <td className="p-3 text-sm text-slate-600">{job.dentistName || '-'}</td>
                                <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName || '-'}</td>
                                <td className="p-3 text-xs text-slate-600">
                                  {(job.items || []).map((item: any, i: number) => {
                                    const jt = jobTypes.find(tj => tj.id === item.jobTypeId);
                                    return (
                                      <div key={i}>{safeNum(item.quantity, 1)}x {jt ? jt.name : (item.name || 'Serviço')}</div>
                                    );
                                  })}
                                </td>
                                <td className="p-3 text-xs text-slate-600">
                                  {(job.items || []).map((item: any, i: number) => (
                                    <div key={i}>R$ {formatSafeFixed((safeNum(item.price) * safeNum(item.quantity, 1)) - safeNum(item.appliedDiscount), 2)}</div>
                                  ))}
                                </td>
                                <td className="p-3 font-black text-teal-700 text-sm">R$ {formatSafeFixed(job.totalValue, 2)}</td>
                                <td className="p-3 text-sm text-slate-600">{formatSafeDateStr(job.createdAt)}</td>
                                <td className="p-3 text-sm text-slate-600">{finishDate}</td>
                              </tr>
                            );
                          } else {
                            return (
                              <tr key={job.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                                <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName || '-'}</td>
                                <td className="p-3 text-sm text-slate-600">{job.dentistName || '-'}</td>
                                <td className="p-3 text-sm text-slate-600">{formatSafeDateStr(dateType === 'CREATED' ? job.createdAt : job.dueDate)}</td>
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
  )}
</div>
);
  } catch (err: any) {
    content = (
      <div className="p-12 text-center text-rose-600 bg-rose-50 m-6 rounded-3xl font-bold shadow-sm border border-rose-200">
        <p className="text-lg mb-2">Erro ao renderizar relatórios:</p>
        <pre className="text-xs text-left bg-white p-4 rounded-xl border border-rose-100 max-w-xl mx-auto overflow-auto">{err?.message}\n{err?.stack}</pre>
      </div>
    );
  }
  return content;
}
