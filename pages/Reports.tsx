import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, JobItem } from '../types';
import {
  FileText,
  Users,
  DollarSign,
  Layers,
  Search,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  PackageCheck,
  CreditCard,
  Building2,
  PieChart
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type ReportGroup = 'CLIENTES' | 'FINANCEIRO' | 'PRODUCAO';

export type ReportType =
  | 'CLIENT_SUMMARY'
  | 'DEBTORS_CREDITORS'
  | 'RECEIPTS'
  | 'BASIC_PRODUCTION'
  | 'DETAILED_PRODUCTION'
  | 'SERVICE_TYPES'
  | 'SERVICE_CATEGORIES';

export default function Reports() {
  const { jobs, manualDentists, dentistPayments, jobTypes } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, CONCLUIDO_FATURADO, etc.
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');

  // Extract all categories from jobTypes
  const categories = useMemo(() => {
    const set = new Set<string>();
    jobTypes.forEach(jt => {
      if (jt.category) set.add(jt.category);
    });
    return Array.from(set).sort();
  }, [jobTypes]);

  // Extract available service types based on categoryFilter
  const availableServiceTypes = useMemo(() => {
    if (categoryFilter === 'ALL') {
      return jobTypes;
    }
    return jobTypes.filter(jt => jt.category === categoryFilter);
  }, [jobTypes, categoryFilter]);

  // Reset service type filter if it is not in the filtered category
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    if (cat !== 'ALL') {
      const validForCategory = jobTypes.filter(jt => jt.category === cat).map(jt => jt.id);
      if (serviceTypeFilter !== 'ALL' && !validForCategory.includes(serviceTypeFilter)) {
        setServiceTypeFilter('ALL');
      }
    }
  };

  // Helper to match jobs based on dates and status
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Date filter
      if (startDate) {
        const jobDate = new Date(job.createdAt).getTime();
        const start = new Date(startDate).getTime();
        if (jobDate < start) return false;
      }
      if (endDate) {
        const jobDate = new Date(job.createdAt).getTime();
        const end = new Date(endDate + 'T23:59:59').getTime();
        if (jobDate > end) return false;
      }

      // Status filter
      if (statusFilter === 'CONCLUIDO_FATURADO') {
        const isBilledOrCompleted =
          job.status === JobStatus.COMPLETED ||
          job.status === JobStatus.DELIVERED ||
          job.paymentStatus === 'PAID' ||
          job.status === 'FATURADO' ||
          job.status === 'CONCLUIDO';
        if (!isBilledOrCompleted) return false;
      } else if (statusFilter !== 'ALL') {
        if (job.status !== statusFilter) return false;
      }

      // Category filter check: job must have at least one item in category
      if (categoryFilter !== 'ALL') {
        const hasItemCategory = job.items.some(item => {
          const jt = jobTypes.find(t => t.id === item.jobTypeId || t.name === item.name);
          return jt?.category === categoryFilter;
        });
        if (!hasItemCategory) return false;
      }

      // Service type filter check: job must have matching item
      if (serviceTypeFilter !== 'ALL') {
        const hasServiceType = job.items.some(item => {
          return item.jobTypeId === serviceTypeFilter || item.name === serviceTypeFilter;
        });
        if (!hasServiceType) return false;
      }

      return true;
    });
  }, [jobs, startDate, endDate, statusFilter, categoryFilter, serviceTypeFilter, jobTypes]);

  // Extract matching items for item-level filter isolation
  const getMatchingJobItems = (job: Job): JobItem[] => {
    return job.items.filter(item => {
      const jt = jobTypes.find(t => t.id === item.jobTypeId || t.name === item.name);

      if (categoryFilter !== 'ALL' && jt?.category !== categoryFilter) {
        return false;
      }

      if (serviceTypeFilter !== 'ALL') {
        const selectedJt = jobTypes.find(t => t.id === serviceTypeFilter);
        if (item.jobTypeId !== serviceTypeFilter && item.name !== selectedJt?.name) {
          return false;
        }
      }

      return true;
    });
  };

  // Compute Client Summary Stats
  const clientStats = useMemo(() => {
    return manualDentists.map(dentist => {
      const clientJobs = filteredJobs.filter(j => j.dentistId === dentist.id || j.dentistName === dentist.name);
      
      let totalValue = 0;
      let totalElements = 0;

      clientJobs.forEach(job => {
        const items = getMatchingJobItems(job);
        items.forEach(item => {
          totalElements += item.quantity || 1;
          const itemVal = (item.price * item.quantity) - (item.appliedDiscount || 0);
          totalValue += itemVal;
        });
      });

      const clientPayments = dentistPayments.filter(p => {
        if (p.dentistId && p.dentistId === dentist.id) return true;
        if (p.dentistName && p.dentistName === dentist.name) return true;
        return false;
      }).filter(p => {
        if (startDate && new Date(p.paymentDate).getTime() < new Date(startDate).getTime()) return false;
        if (endDate && new Date(p.paymentDate).getTime() > new Date(endDate + 'T23:59:59').getTime()) return false;
        return true;
      });

      const totalReceived = clientPayments.reduce((acc, curr) => acc + curr.amount, 0);
      const balance = totalValue - totalReceived;

      return {
        dentist,
        jobCount: clientJobs.length,
        totalElements,
        totalValue,
        totalReceived,
        balance
      };
    });
  }, [manualDentists, filteredJobs, dentistPayments, startDate, endDate, categoryFilter, serviceTypeFilter]);

  // Compute Receipts Stats
  const receiptsList = useMemo(() => {
    return dentistPayments.filter(p => {
      if (startDate && new Date(p.paymentDate).getTime() < new Date(startDate).getTime()) return false;
      if (endDate && new Date(p.paymentDate).getTime() > new Date(endDate + 'T23:59:59').getTime()) return false;
      return true;
    });
  }, [dentistPayments, startDate, endDate]);

  // Compute Production by Category Stats
  const categoryStats = useMemo(() => {
    const map = new Map<string, {
      category: string;
      totalElements: number;
      totalValue: number;
      serviceTypes: Map<string, { name: string; quantity: number; value: number }>;
    }>();

    // Initialize map with known categories
    categories.forEach(cat => {
      map.set(cat, {
        category: cat,
        totalElements: 0,
        totalValue: 0,
        serviceTypes: new Map()
      });
    });

    // Add uncategorized if any
    map.set('Sem Categoria', {
      category: 'Sem Categoria',
      totalElements: 0,
      totalValue: 0,
      serviceTypes: new Map()
    });

    filteredJobs.forEach(job => {
      const items = getMatchingJobItems(job);
      items.forEach(item => {
        const jt = jobTypes.find(t => t.id === item.jobTypeId || t.name === item.name);
        const catName = jt?.category || 'Sem Categoria';

        if (!map.has(catName)) {
          map.set(catName, {
            category: catName,
            totalElements: 0,
            totalValue: 0,
            serviceTypes: new Map()
          });
        }

        const catData = map.get(catName)!;
        const itemQty = item.quantity || 1;
        const itemVal = (item.price * itemQty) - (item.appliedDiscount || 0);

        catData.totalElements += itemQty;
        catData.totalValue += itemVal;

        const stName = item.name;
        if (!catData.serviceTypes.has(stName)) {
          catData.serviceTypes.set(stName, { name: stName, quantity: 0, value: 0 });
        }
        const stData = catData.serviceTypes.get(stName)!;
        stData.quantity += itemQty;
        stData.value += itemVal;
      });
    });

    // Filter out categories with 0 items if category filter is active
    return Array.from(map.values()).filter(c => c.totalElements > 0 || c.totalValue > 0);
  }, [filteredJobs, categories, jobTypes, categoryFilter, serviceTypeFilter]);

  // Export PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Labprox - Relatório: ${getReportTitle(selectedReport)}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

    if (selectedReport === 'SERVICE_CATEGORIES') {
      const tableData: (string | number)[][] = [];
      categoryStats.forEach(cat => {
        tableData.push([`Categoria: ${cat.category}`, `${cat.totalElements} elem.`, `R$ ${cat.totalValue.toFixed(2)}`]);
        cat.serviceTypes.forEach(st => {
          tableData.push([`  • ${st.name}`, `${st.quantity} elem.`, `R$ ${st.value.toFixed(2)}`]);
        });
      });

      autoTable(doc, {
        startY: 28,
        head: [['Categoria / Tipo de Serviço', 'Quantidade', 'Valor Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }
      });
    } else if (selectedReport === 'CLIENT_SUMMARY') {
      const tableData = clientStats.map(c => [
        c.dentist.name,
        c.jobCount,
        c.totalElements,
        `R$ ${c.totalValue.toFixed(2)}`,
        `R$ ${c.totalReceived.toFixed(2)}`,
        `R$ ${c.balance.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Cliente', 'Trabalhos', 'Elementos', 'Valor Faturado', 'Valor Recebido', 'Saldo']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }
      });
    } else if (selectedReport === 'RECEIPTS') {
      const tableData = receiptsList.map(r => [
        new Date(r.paymentDate).toLocaleDateString('pt-BR'),
        r.dentistName || 'Cliente',
        r.paymentMethod,
        `R$ ${r.amount.toFixed(2)}`,
        r.notes || '-'
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Data', 'Cliente', 'Forma Pagto', 'Valor', 'Observações']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }
      });
    } else {
      // Basic / Detailed production
      const tableData = filteredJobs.map(j => [
        j.osNumber,
        j.boxNumber || '-',
        j.dentistName,
        j.patientName,
        j.status,
        `R$ ${j.totalValue.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Nº OS', 'Caixa', 'Dentista', 'Paciente', 'Status', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }
      });
    }

    doc.save(`relatorio_${selectedReport?.toLowerCase()}_${Date.now()}.pdf`);
  };

  // Export Excel
  const exportToExcel = () => {
    let wsData: any[] = [];

    if (selectedReport === 'SERVICE_CATEGORIES') {
      categoryStats.forEach(cat => {
        wsData.push({
          'Categoria / Serviço': `CATEGORIA: ${cat.category.toUpperCase()}`,
          'Quantidade (Elementos)': cat.totalElements,
          'Valor Total (R$)': cat.totalValue
        });
        cat.serviceTypes.forEach(st => {
          wsData.push({
            'Categoria / Serviço': `  - ${st.name}`,
            'Quantidade (Elementos)': st.quantity,
            'Valor Total (R$)': st.value
          });
        });
      });
    } else if (selectedReport === 'CLIENT_SUMMARY') {
      wsData = clientStats.map(c => ({
        'Cliente': c.dentist.name,
        'Trabalhos': c.jobCount,
        'Elementos': c.totalElements,
        'Valor Faturado (R$)': c.totalValue,
        'Valor Recebido (R$)': c.totalReceived,
        'Saldo (R$)': c.balance
      }));
    } else if (selectedReport === 'RECEIPTS') {
      wsData = receiptsList.map(r => ({
        'Data': new Date(r.paymentDate).toLocaleDateString('pt-BR'),
        'Cliente': r.dentistName || 'Cliente',
        'Forma de Pagamento': r.paymentMethod,
        'Valor (R$)': r.amount,
        'Observações': r.notes || ''
      }));
    } else {
      wsData = filteredJobs.map(j => ({
        'Nº OS': j.osNumber,
        'Caixa': j.boxNumber || '',
        'Dentista': j.dentistName,
        'Paciente': j.patientName,
        'Status': j.status,
        'Valor (R$)': j.totalValue
      }));
    }

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${selectedReport?.toLowerCase()}_${Date.now()}.xlsx`);
  };

  const getReportTitle = (type: ReportType | null) => {
    switch (type) {
      case 'CLIENT_SUMMARY': return 'Resumo por Cliente';
      case 'DEBTORS_CREDITORS': return 'Devedores e Credores';
      case 'RECEIPTS': return 'Recebimentos';
      case 'BASIC_PRODUCTION': return 'Produção Básica';
      case 'DETAILED_PRODUCTION': return 'Produção Detalhada';
      case 'SERVICE_TYPES': return 'Tipos de Serviço';
      case 'SERVICE_CATEGORIES': return 'Produção por Categoria';
      default: return '';
    }
  };

  // Report Groups structure matching screenshot
  const reportGroups = [
    {
      id: 'CLIENTES' as ReportGroup,
      title: 'Clientes',
      icon: Users,
      items: [
        {
          id: 'CLIENT_SUMMARY' as ReportType,
          name: 'Resumo por cliente',
          description: 'Listagem de todos os clientes com resumo de produção e saldos'
        }
      ]
    },
    {
      id: 'FINANCEIRO' as ReportGroup,
      title: 'Financeiro',
      icon: DollarSign,
      items: [
        {
          id: 'DEBTORS_CREDITORS' as ReportType,
          name: 'Devedores e credores',
          description: 'Lista de clientes com saldos pendentes ou débitos'
        },
        {
          id: 'RECEIPTS' as ReportType,
          name: 'Recebimentos',
          description: 'Listagem de pagamentos e recebimentos por período'
        }
      ]
    },
    {
      id: 'PRODUCAO' as ReportGroup,
      title: 'Produção',
      icon: Layers,
      items: [
        {
          id: 'BASIC_PRODUCTION' as ReportType,
          name: 'Produção básica',
          description: 'Lista simplificada de todos os trabalhos produzidos'
        },
        {
          id: 'DETAILED_PRODUCTION' as ReportType,
          name: 'Produção detalhada',
          description: 'Lista completa com itens, variações e valores detalhados'
        },
        {
          id: 'SERVICE_TYPES' as ReportType,
          name: 'Tipos de serviço',
          description: 'Total de produção agrupado por tipo de serviço'
        },
        {
          id: 'SERVICE_CATEGORIES' as ReportType,
          name: 'Produção por categoria',
          description: 'Somatória de quantidade de elementos e valor por categoria'
        }
      ]
    }
  ];

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return reportGroups;
    const query = searchQuery.toLowerCase();
    return reportGroups.map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    })).filter(group => group.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="text-teal-600" size={28} />
            <span>Relatórios</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Selecione o tipo de relatório desejado para visualizar e exportar os dados do laboratório.
          </p>
        </div>
      </div>

      {/* Global Search Bar for Reports */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Procure pelo nome do relatório desejado"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm transition"
        />
      </div>

      {/* 3 Columns Report Grid (Matching Layout Screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredGroups.map(group => {
          const GroupIcon = group.icon;
          return (
            <div
              key={group.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <GroupIcon size={20} />
                </div>
                <h2 className="font-bold text-slate-900 text-base">{group.title}</h2>
              </div>

              <div className="p-3 divide-y divide-slate-100 flex-1">
                {group.items.map(item => {
                  const isSelected = selectedReport === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedReport(item.id)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start justify-between gap-3 group ${
                        isSelected
                          ? 'bg-teal-50 border border-teal-200 text-teal-900 shadow-sm'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className={`font-bold text-sm ${isSelected ? 'text-teal-700 font-extrabold' : 'group-hover:text-teal-600'}`}>
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium leading-relaxed">
                          {item.description}
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className={`mt-0.5 transition-transform ${
                          isSelected ? 'text-teal-600 translate-x-1' : 'text-slate-300 group-hover:text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Report Section with Smooth Entrance */}
      {selectedReport && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-6 animate-slideDown">
          {/* Top Bar for Selected Report */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                title="Voltar aos grupos"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-teal-600">
                  Relatório Selecionado
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {getReportTitle(selectedReport)}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={generatePDF}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <Download size={15} />
                <span>PDF</span>
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <FileSpreadsheet size={15} />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter size={14} className="text-teal-600" />
              <span>Filtros do Relatório</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Date Start */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Data Inicial
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Date End */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Data Final
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Status do Pedido
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="CONCLUIDO_FATURADO">Concluído / Faturado</option>
                  <option value={JobStatus.PENDING}>Pendente</option>
                  <option value={JobStatus.IN_PROGRESS}>Em Andamento</option>
                  <option value={JobStatus.DELIVERED}>Entregue</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Categoria de Serviço
                </label>
                <select
                  value={categoryFilter}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type Filter (Filtered by Category) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tipo de Serviço {categoryFilter !== 'ALL' && `(da categoria "${categoryFilter}")`}
                </label>
                <select
                  value={serviceTypeFilter}
                  onChange={e => setServiceTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">Todos os Tipos de Serviço</option>
                  {availableServiceTypes.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.category || 'Sem Cat.'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* REPORT CONTENT DEPENDING ON SELECTED TYPE */}
          {selectedReport === 'SERVICE_CATEGORIES' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-teal-50 border border-teal-200 p-5 rounded-2xl">
                  <span className="text-xs font-bold uppercase text-teal-600 tracking-wider">
                    Total de Categorias
                  </span>
                  <div className="text-2xl font-black text-teal-900 mt-1">
                    {categoryStats.length}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Total de Elementos
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {categoryStats.reduce((acc, curr) => acc + curr.totalElements, 0)}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
                  <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">
                    Valor Total do Montante
                  </span>
                  <div className="text-2xl font-black text-emerald-900 mt-1">
                    R$ {categoryStats.reduce((acc, curr) => acc + curr.totalValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Table of Categories and Service Types */}
              <div className="space-y-4">
                {categoryStats.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-medium">
                    Nenhum registro encontrado para os filtros selecionados.
                  </div>
                ) : (
                  categoryStats.map(cat => (
                    <div
                      key={cat.category}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm"
                    >
                      {/* Category Header Row */}
                      <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <PieChart size={20} className="text-teal-400" />
                          <span className="font-black text-base uppercase tracking-wider">
                            Categoria: {cat.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm font-bold">
                          <div>
                            <span className="text-slate-400 font-normal text-xs mr-2">Elementos:</span>
                            <span className="text-teal-300 font-black">{cat.totalElements}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-normal text-xs mr-2">Valor:</span>
                            <span className="text-emerald-400 font-black">
                              R$ {cat.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Service Breakdown */}
                      <div className="divide-y divide-slate-100">
                        {Array.from(cat.serviceTypes.values()).map(st => (
                          <div
                            key={st.name}
                            className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition text-sm"
                          >
                            <div className="font-semibold text-slate-800 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                              <span>{st.name}</span>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="text-slate-600 font-medium text-xs">
                                Quant: <span className="font-bold text-slate-900">{st.quantity}</span>
                              </div>
                              <div className="text-emerald-700 font-bold text-sm">
                                R$ {st.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedReport === 'CLIENT_SUMMARY' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Trabalhos</th>
                    <th className="p-3.5">Elementos</th>
                    <th className="p-3.5">Valor Faturado</th>
                    <th className="p-3.5">Valor Recebido</th>
                    <th className="p-3.5">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {clientStats.map(c => (
                    <tr key={c.dentist.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-bold text-slate-900">{c.dentist.name}</td>
                      <td className="p-3.5">{c.jobCount}</td>
                      <td className="p-3.5">{c.totalElements}</td>
                      <td className="p-3.5 font-semibold text-slate-900">R$ {c.totalValue.toFixed(2)}</td>
                      <td className="p-3.5 font-semibold text-emerald-600">R$ {c.totalReceived.toFixed(2)}</td>
                      <td className={`p-3.5 font-bold ${c.balance > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                        R$ {c.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'RECEIPTS' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Forma de Pagamento</th>
                    <th className="p-3.5">Valor</th>
                    <th className="p-3.5">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {receiptsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum recebimento registrado para o período.
                      </td>
                    </tr>
                  ) : (
                    receiptsList.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-semibold text-slate-700">
                          {new Date(r.paymentDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{r.dentistName || 'Cliente'}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-bold rounded-lg text-[10px]">
                            {r.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3.5 font-black text-emerald-600">
                          R$ {r.amount.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-slate-500">{r.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(selectedReport === 'BASIC_PRODUCTION' || selectedReport === 'DETAILED_PRODUCTION' || selectedReport === 'DEBTORS_CREDITORS' || selectedReport === 'SERVICE_TYPES') && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nº OS</th>
                    <th className="p-3.5">Caixa</th>
                    <th className="p-3.5">Dentista</th>
                    <th className="p-3.5">Paciente</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum trabalho encontrado para os filtros definidos.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map(job => (
                      <tr key={job.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-bold text-teal-700">{job.osNumber}</td>
                        <td className="p-3.5 font-semibold text-slate-700">{job.boxNumber || '-'}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{job.dentistName}</td>
                        <td className="p-3.5 text-slate-600">{job.patientName}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-black text-emerald-700">R$ {job.totalValue.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
