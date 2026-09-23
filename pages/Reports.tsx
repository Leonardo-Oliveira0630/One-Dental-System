import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, Download, Filter, Calendar, Users, Building2, Package, Search, X, 
  DollarSign, TrendingUp, ChevronDown, ChevronUp, ChevronRight, FileSpreadsheet, 
  ArrowUpDown, Wallet, UserCheck, Stethoscope, CheckCircle2, Clock, AlertCircle,
  BarChart3, Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { JobStatus, Job } from '../types';

const STATUS_TRANSLATION: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Produção',
  WAITING_APPROVAL: 'Aguardando Aprovação',
  COMPLETED: 'Finalizado',
  DELIVERED: 'Entregue',
  REJECTED: 'Rejeitado',
  CANCELED: 'Cancelado',
  RETURNED: 'Devolvido',
  SECTOR_TRANSITION: 'Em Transição'
};

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
  const { jobs, allUsers, manualDentists, sectors, jobTypes, currentOrg } = useApp();
  
  // Date and filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateType, setDateType] = useState<'CREATED' | 'DUE'>('CREATED');
  const [dentistId, setDentistId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [sector, setSector] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [variationFilters, setVariationFilters] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'DATE' | 'JOB_TYPE' | 'LIST' | 'COLLABORATOR'>('DATE');
  const [reportType, setReportType] = useState<'CLIENT_SUMMARY' | 'PRODUCTION' | 'DETAILED_ORDERS' | 'SERVICE_TYPES'>('CLIENT_SUMMARY');
  
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
      if (dentistId && job.dentistId !== dentistId && job.dentistName !== dentistId) return false;

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
  }, [jobs, startDate, endDate, dateType, dentistId, collaboratorId, sector, jobTypeId, variationFilters, statusFilter, urgencyFilter]);

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
      
      const clientName = job.dentistName || dentistInfo?.name || 'Cliente sem nome';
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
      if (clientSortBy === 'NAME_ASC') return a.clientName.localeCompare(b.clientName, 'pt-BR');
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
          const key = 'Sem Colaborador';
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
              const key = 'Sem Colaborador';
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
          key = new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR');
        } else if (groupBy === 'JOB_TYPE') {
          if (jobTypeId && selectedJobType) {
            key = selectedJobType.name;
          } else {
            key = job.items.length > 0 ? job.items[0].name : 'Sem tipo';
          }
        } else if (groupBy === 'LIST') {
          key = 'Lista Geral';
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
      if (groupBy === 'DATE') {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA).getTime();
        const dateB = new Date(yearB, monthB - 1, dayB).getTime();
        return dateA - dateB;
      } else {
        return a.localeCompare(b);
      }
    }).forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredJobs, groupBy, dateType, allUsers, collaboratorId, jobTypeId, selectedJobType]);

  const serviceStats = useMemo(() => {
    if (reportType !== 'SERVICE_TYPES') return null;
    const stats: Record<string, { quantity: number; totalValue: number }> = {};
    filteredJobs.forEach(job => {
      job.items.forEach((item: any) => {
        const typeId = item.jobTypeId || item.name;
        const typeName = jobTypes.find(t => t.id === typeId)?.name || item.name;
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
    const isLandscape = reportType === 'DETAILED_ORDERS' || reportType === 'CLIENT_SUMMARY';
    const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait');
    const orgName = currentOrg?.name || 'Laboratório';
    
    doc.setFontSize(18);
    let title = `Relatório de Produção - ${orgName}`;
    if (reportType === 'CLIENT_SUMMARY') title = `Relatório de Faturamento e Casos por Cliente - ${orgName}`;
    if (reportType === 'DETAILED_ORDERS') title = `Relatório Detalhado de Pedidos - ${orgName}`;
    if (reportType === 'SERVICE_TYPES') title = `Relatório de Tipos de Serviço - ${orgName}`;
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateRangeStr = startDate || endDate 
      ? `Período: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje'} (${dateType === 'CREATED' ? 'Data de Entrada' : 'Data de Entrega'})`
      : `Período: Todo o histórico (${dateType === 'CREATED' ? 'Data de Entrada' : 'Data de Entrega'})`;
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}  |  ${dateRangeStr}`, 14, 27);
    
    // --- PDF: CLIENT_SUMMARY ---
    if (reportType === 'CLIENT_SUMMARY') {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `Total Faturado: R$ ${clientSummaryData.grandTotalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Total de Casos: ${clientSummaryData.grandTotalJobs}  |  Ticket Médio Geral: R$ ${clientSummaryData.averageTicketGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Clientes: ${clientSummaryData.grandTotalClients}`, 
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
        'TOTAL GERAL',
        '-',
        clientSummaryData.grandTotalJobs.toString(),
        clientSummaryData.grandTotalItems.toString(),
        `R$ ${clientSummaryData.grandTotalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${clientSummaryData.averageTicketGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        '100.0%'
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Cliente / Dentista', 'Clínica', 'Qtd Casos', 'Qtd Itens', 'Faturamento Total', 'Ticket Médio', '% Part.']],
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
      doc.text(`Total de trabalhos: ${filteredJobs.length}`, 14, 36);
      
      const tableData = Object.entries(serviceStats)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .map(([name, stats]) => [
          name,
          stats.quantity.toString(),
          `R$ ${stats.totalValue.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Tipo de Serviço', 'Quantidade Produzida', 'Valor Total Produzido']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10, cellPadding: 4 },
      });
      
      doc.save(`relatorio-tipos-servico-${new Date().getTime()}.pdf`);
      return;
    }

    doc.text(`Filtros: ${filteredJobs.length} trabalhos encontrados`, 14, 36);

    let yPos = 45;

    Object.entries(groupedJobs).forEach(([groupName, groupJobs]) => {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(groupName, 14, yPos);
      yPos += 5;

      if (reportType === 'DETAILED_ORDERS') {
        const tableData: any[] = [];
        groupJobs.forEach(job => {
          let entryDate = new Date(job.createdAt).toLocaleDateString('pt-BR');
          let finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';
          
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
          head: [['OS', 'Caixa', 'Dentista', 'Paciente', 'Serviços', 'Valor Serviço', 'Valor Total', 'Entrada', 'Finalização']],
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
          new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR'),
          job.currentSector || 'Recepção',
          STATUS_TRANSLATION[job.status] || job.status
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['OS', 'Paciente', 'Dentista', dateType === 'CREATED' ? 'Entrada' : 'Entrega', 'Setor', 'Status']],
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
    if (reportType === 'CLIENT_SUMMARY') {
      const rows = sortedClients.map((c, index) => ({
        '#': index + 1,
        'Cliente / Dentista': c.clientName,
        'Clínica': c.clinicName || '-',
        'Telefone': c.phone || '-',
        'Qtd de Casos': c.totalJobs,
        'Qtd de Elementos/Itens': c.totalItems,
        'Faturamento Total (R$)': Number(c.totalBilling.toFixed(2)),
        'Ticket Médio (R$)': Number(c.averageTicket.toFixed(2)),
        '% Participação': `${c.percentage.toFixed(1)}%`
      }));

      // Total row
      rows.push({
        '#': 0,
        'Cliente / Dentista': 'TOTAL GERAL',
        'Clínica': '-',
        'Telefone': '-',
        'Qtd de Casos': clientSummaryData.grandTotalJobs,
        'Qtd de Elementos/Itens': clientSummaryData.grandTotalItems,
        'Faturamento Total (R$)': Number(clientSummaryData.grandTotalBilling.toFixed(2)),
        'Ticket Médio (R$)': Number(clientSummaryData.averageTicketGlobal.toFixed(2)),
        '% Participação': '100.0%'
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Faturamento por Cliente');

      // Also add detailed orders sheet
      const detailedRows = filteredJobs.map(job => ({
        'OS': job.osNumber || '-',
        'Caixa': job.boxNumber || '-',
        'Dentista': job.dentistName,
        'Clínica': job.clinicName || '-',
        'Paciente': job.patientName,
        'Valor Total (R$)': Number((job.totalValue || 0).toFixed(2)),
        'Data Entrada': new Date(job.createdAt).toLocaleDateString('pt-BR'),
        'Data Entrega': new Date(job.dueDate).toLocaleDateString('pt-BR'),
        'Status': STATUS_TRANSLATION[job.status] || job.status,
        'Setor': job.currentSector || 'Recepção'
      }));
      const wsDetail = XLSX.utils.json_to_sheet(detailedRows);
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Casos do Período');

      XLSX.writeFile(wb, `faturamento_clientes_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const rows = filteredJobs.map(job => ({
        'OS': job.osNumber || '-',
        'Caixa': job.boxNumber || '-',
        'Dentista': job.dentistName,
        'Paciente': job.patientName,
        'Valor Total (R$)': Number((job.totalValue || 0).toFixed(2)),
        'Data Entrada': new Date(job.createdAt).toLocaleDateString('pt-BR'),
        'Data Entrega': new Date(job.dueDate).toLocaleDateString('pt-BR'),
        'Status': STATUS_TRANSLATION[job.status] || job.status,
        'Setor': job.currentSector || 'Recepção'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
      XLSX.writeFile(wb, `relatorio_producao_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDentistId('');
    setCollaboratorId('');
    setSector('');
    setJobTypeId('');
    setVariationFilters({});
    setStatusFilter('');
    setUrgencyFilter('');
    setClientSearch('');
  };

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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Relatórios & Faturamento
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                Consulte o faturamento por cliente, volume de casos e acompanhe a produção.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={exportToExcel}
            disabled={filteredJobs.length === 0}
            className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider border border-emerald-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
          
          <button 
            onClick={generatePDF}
            disabled={filteredJobs.length === 0}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Segmented Navigation of Report Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setReportType('CLIENT_SUMMARY')}
          className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            reportType === 'CLIENT_SUMMARY'
              ? 'bg-white text-teal-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={16} className={reportType === 'CLIENT_SUMMARY' ? 'text-teal-600' : 'text-slate-400'} />
          <span>Resumo por Cliente</span>
        </button>

        <button
          onClick={() => setReportType('PRODUCTION')}
          className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            reportType === 'PRODUCTION'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={16} className={reportType === 'PRODUCTION' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Produção Básica</span>
        </button>

        <button
          onClick={() => setReportType('DETAILED_ORDERS')}
          className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            reportType === 'DETAILED_ORDERS'
              ? 'bg-white text-amber-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText size={16} className={reportType === 'DETAILED_ORDERS' ? 'text-amber-600' : 'text-slate-400'} />
          <span>Pedidos Detalhado</span>
        </button>

        <button
          onClick={() => setReportType('SERVICE_TYPES')}
          className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            reportType === 'SERVICE_TYPES'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package size={16} className={reportType === 'SERVICE_TYPES' ? 'text-purple-600' : 'text-slate-400'} />
          <span>Tipos de Serviço</span>
        </button>
      </div>

      {/* KPI Cards when in CLIENT_SUMMARY mode */}
      {reportType === 'CLIENT_SUMMARY' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">Faturamento no Período</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {clientSummaryData.grandTotalBilling.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Soma de todos os casos</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <FileText size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Total de Casos Abertos</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {clientSummaryData.grandTotalJobs} <span className="text-sm font-bold text-slate-400">pedidos</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">{clientSummaryData.grandTotalItems} elementos produzidos</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Ticket Médio por Caso</span>
              <p className="text-xl font-black text-slate-900 truncate">
                R$ {clientSummaryData.averageTicketGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-400 font-medium">Média por pedido</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Clientes com Movimento</span>
              <p className="text-xl font-black text-slate-900 truncate">
                {clientSummaryData.grandTotalClients} <span className="text-sm font-bold text-slate-400">clientes</span>
              </p>
              <span className="text-xs text-slate-400 font-medium">Dentistas / Clínicas no filtro</span>
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
              Filtros do Período & Parâmetros
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Atalhos:</span>
            <button 
              onClick={() => applyDatePreset('THIS_MONTH')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors"
            >
              Este Mês
            </button>
            <button 
              onClick={() => applyDatePreset('LAST_MONTH')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors"
            >
              Mês Passado
            </button>
            <button 
              onClick={() => applyDatePreset('LAST_30')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors"
            >
              Últimos 30 Dias
            </button>
            <button 
              onClick={() => applyDatePreset('THIS_YEAR')} 
              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-lg transition-colors"
            >
              Este Ano
            </button>
            <button 
              onClick={clearFilters} 
              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={14} /> Limpar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-600" /> Data Base
            </label>
            <select 
              value={dateType} 
              onChange={(e) => setDateType(e.target.value as any)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
            >
              <option value="CREATED">Data de Entrada (Criação do Caso)</option>
              <option value="DUE">Data de Entrega (Vencimento)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Inicial</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Final</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Stethoscope size={13} className="text-teal-600" /> Cliente / Dentista
            </label>
            <select 
              value={dentistId} 
              onChange={(e) => setDentistId(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
            >
              <option value="">Todos os Clientes / Dentistas</option>
              {manualDentists.map(d => <option key={d.id} value={d.id}>{d.name} {d.clinicName ? `(${d.clinicName})` : ''}</option>)}
            </select>
          </div>

          {reportType !== 'CLIENT_SUMMARY' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Colaborador</label>
                <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">Todos os Colaboradores</option>
                  {allUsers.filter(u => u.role !== 'CLIENT').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Setor</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">Todos os Setores</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Status do Pedido</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">Todos os Status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="IN_PROGRESS">Em Produção</option>
                  <option value="DELAYED">Atrasado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Prioridade</label>
                <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">Todas as Prioridades</option>
                  <option value="NORMAL">Normal / Baixa</option>
                  <option value="URGENT">Urgente / VIP</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Trabalho</label>
                <select value={jobTypeId} onChange={(e) => { setJobTypeId(e.target.value); setVariationFilters({}); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">Todos os Tipos</option>
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
                    <option value="">Qualquer</option>
                    {group.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                  </select>
                </div>
              ))}

              {reportType !== 'SERVICE_TYPES' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Agrupar Por</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="DATE">Data</option>
                    <option value="JOB_TYPE">Tipo de Trabalho</option>
                    <option value="COLLABORATOR">Colaborador</option>
                    <option value="LIST">Lista Contínua</option>
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
                  Resumo de Faturamento e Casos por Cliente
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  Exibindo {sortedClients.length} de {clientSummaryData.grandTotalClients} clientes com movimentação no período
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente ou clínica..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
                    <option value="BILLING_DESC">Maior Faturamento</option>
                    <option value="BILLING_ASC">Menor Faturamento</option>
                    <option value="JOBS_DESC">Mais Casos</option>
                    <option value="TICKET_DESC">Maior Ticket Médio</option>
                    <option value="NAME_ASC">Nome (A - Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {sortedClients.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold text-base text-slate-600">Nenhum cliente encontrado com os filtros selecionados.</p>
                <p className="text-xs text-slate-400 mt-1">Experimente ajustar o período de datas ou limpar a busca.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="p-4 pl-6">Cliente / Dentista</th>
                      <th className="p-4">Clínica</th>
                      <th className="p-4 text-center">Qtd de Casos</th>
                      <th className="p-4 text-center">Elementos</th>
                      <th className="p-4 text-right">Faturamento Total</th>
                      <th className="p-4 text-right">Ticket Médio</th>
                      <th className="p-4 text-center">% Part.</th>
                      <th className="p-4 pr-6 text-center">Detalhes</th>
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
                                {client.totalJobs} {client.totalJobs === 1 ? 'caso' : 'casos'}
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
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                                  isExpanded 
                                    ? 'bg-teal-600 text-white' 
                                    : 'bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700'
                                }`}
                                title="Ver pedidos desse cliente"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                <span className="text-[11px] hidden sm:inline">{isExpanded ? 'Ocultar' : 'Ver OSs'}</span>
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
                                      Casos de {client.clientName} no período ({client.jobs.length})
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                      <span>Total do Cliente: <strong className="text-teal-700">R$ {client.totalBilling.toFixed(2)}</strong></span>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                          <th className="py-2 px-3">OS #</th>
                                          <th className="py-2 px-3">Paciente</th>
                                          <th className="py-2 px-3">Serviços Inclusos</th>
                                          <th className="py-2 px-3">Entrada</th>
                                          <th className="py-2 px-3">Entrega</th>
                                          <th className="py-2 px-3">Status</th>
                                          <th className="py-2 px-3 text-right">Valor</th>
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
                                            <td className="py-2.5 px-3 text-slate-500">{new Date(job.createdAt).toLocaleDateString('pt-BR')}</td>
                                            <td className="py-2.5 px-3 text-slate-500">{new Date(job.dueDate).toLocaleDateString('pt-BR')}</td>
                                            <td className="py-2.5 px-3">
                                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                                                {STATUS_TRANSLATION[job.status] || job.status}
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
                        TOTAL GERAL ({clientSummaryData.grandTotalClients} clientes)
                      </td>
                      <td className="p-4">-</td>
                      <td className="p-4 text-center text-teal-900">
                        {clientSummaryData.grandTotalJobs} casos
                      </td>
                      <td className="p-4 text-center text-teal-900">
                        {clientSummaryData.grandTotalItems} itens
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
            <h3 className="font-bold text-slate-800 text-lg">Tipos de Serviço Detalhado</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-700 text-[10px] uppercase tracking-widest font-black">
                    <th className="p-3 rounded-l-lg">Tipo de Serviço</th>
                    <th className="p-3 text-center">Quantidade Produzida</th>
                    <th className="p-3 rounded-r-lg text-right">Valor Total Produzido</th>
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
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Resultados ({filteredJobs.length} trabalhos)</h3>
            </div>
            {Object.entries(groupedJobs).length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">Nenhum trabalho encontrado com os filtros atuais.</p>
              </div>
            ) : (
              Object.entries(groupedJobs).map(([groupName, groupJobs]) => (
                <div key={groupName} className="space-y-4">
                  <h4 className="font-black text-lg text-slate-800 border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span>{groupName}</span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {groupJobs.length} {groupJobs.length === 1 ? 'caso' : 'casos'}
                    </span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        {reportType === 'DETAILED_ORDERS' ? (
                          <tr className="bg-amber-50 text-amber-700 text-[10px] uppercase tracking-widest font-black">
                            <th className="p-3 rounded-l-lg">OS #</th>
                            <th className="p-3">Caixa</th>
                            <th className="p-3">Dentista</th>
                            <th className="p-3">Paciente</th>
                            <th className="p-3">Serviços</th>
                            <th className="p-3">Valor Serviço</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Entrada</th>
                            <th className="p-3 rounded-r-lg">Finalização</th>
                          </tr>
                        ) : (
                          <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                            <th className="p-3 rounded-l-lg">OS #</th>
                            <th className="p-3">Paciente</th>
                            <th className="p-3">Dentista</th>
                            <th className="p-3">Data</th>
                            <th className="p-3">Setor</th>
                            <th className="p-3 rounded-r-lg">Status</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupJobs.map(job => {
                          if (reportType === 'DETAILED_ORDERS') {
                            const finishDate = job.status === JobStatus.COMPLETED && job.history ? new Date(job.history.slice().reverse().find((h: any) => h.action === 'COMPLETED' || h.statusTo === JobStatus.COMPLETED)?.timestamp || new Date()).toLocaleDateString('pt-BR') : '-';
                            return (
                              <tr key={job.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                                <td className="p-3 font-bold text-slate-700 text-xs">{job.boxNumber || '-'}</td>
                                <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                                <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                                <td className="p-3 text-xs text-slate-600">
                                  {(job.items || []).map((item: any, i: number) => {
                                    const jt = jobTypes.find(t => t.id === item.jobTypeId);
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
                                <td className="p-3 text-sm text-slate-600">{new Date(job.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 text-sm text-slate-600">{finishDate}</td>
                              </tr>
                            );
                          } else {
                            return (
                              <tr key={job.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-700 text-xs">{job.osNumber || '-'}</td>
                                <td className="p-3 font-bold text-slate-900 text-sm">{job.patientName}</td>
                                <td className="p-3 text-sm text-slate-600">{job.dentistName}</td>
                                <td className="p-3 text-sm text-slate-600">{new Date(dateType === 'CREATED' ? job.createdAt : job.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 text-sm text-slate-600">{job.currentSector || 'Recepção'}</td>
                                <td className="p-3 text-xs font-bold text-slate-500">{STATUS_TRANSLATION[job.status] || job.status}</td>
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
