import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, ManualDentist, User, UserRole } from '../types';
import { 
  UserX, RotateCcw, MessageCircle, Phone, Mail, Calendar, AlertTriangle, 
  TrendingDown, Sparkles, ShieldAlert, CheckCircle2, Layers, Stethoscope, 
  Building2, Search, RefreshCw, Clock, Flame, Info, ExternalLink, ArrowUpRight,
  Filter, ChevronDown, ChevronUp, SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InactiveDentistInfo {
  id: string;
  name: string;
  clinicName: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cro?: string;
  totalJobsHistorical: number;
  totalBillingHistorical: number;
  lastJobDate: Date | null;
  daysInactive: number;
  severity: 'CRITICAL' | 'WARNING' | 'NEVER';
  lastJobPatient?: string;
  lastJobService?: string;
}

interface RepetitionDentistInfo {
  id: string;
  name: string;
  clinicName: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cro?: string;
  totalJobs: number;
  repeatedJobsCount: number;
  totalRepetitionItems: number;
  repetitionRate: number; // percentage
  serviceRepetitions: Record<string, number>;
  mostRepeatedService: string;
  severity: 'CRITICAL' | 'WARNING' | 'LOW';
  recommendedAction: string;
  sampleRepeatedCases: {
    osNumber?: string;
    patientName: string;
    date: Date;
    serviceName: string;
    nature?: string;
    reason?: string;
  }[];
}

export const ClientRetentionRadar: React.FC = () => {
  const { jobs, manualDentists, allUsers, currentOrg, jobTypes } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'INACTIVE' | 'REPETITIONS'>('INACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [inactiveFilter, setInactiveFilter] = useState<'ALL' | '30_DAYS' | '60_DAYS' | 'NEVER'>('ALL');
  const [repetitionFilter, setRepetitionFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [expandedDentistId, setExpandedDentistId] = useState<string | null>(null);

  // Unify all dentists from manualDentists and allUsers
  const allDentistsList = useMemo(() => {
    const list: { id: string; name: string; clinicName?: string; phone?: string; whatsapp?: string; email?: string; cro?: string }[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    manualDentists.forEach(d => {
      seenIds.add(d.id);
      seenNames.add(d.name.trim().toLowerCase());
      list.push({
        id: d.id,
        name: d.name,
        clinicName: d.clinicName || (d as any).address,
        phone: d.phone,
        whatsapp: d.whatsapp || d.phone,
        email: d.email,
        cro: d.cro
      });
    });

    allUsers.filter(u => u.role === UserRole.CLIENT || u.role === UserRole.DENTIST).forEach(u => {
      if (!seenIds.has(u.id) && !seenNames.has(u.name.trim().toLowerCase())) {
        seenIds.add(u.id);
        seenNames.add(u.name.trim().toLowerCase());
        list.push({
          id: u.id,
          name: u.name,
          clinicName: (u as any).clinicName,
          phone: (u as any).phone,
          whatsapp: (u as any).whatsapp || (u as any).phone,
          email: u.email,
          cro: (u as any).cro
        });
      }
    });

    // Also include dentists that exist in jobs but might not have a formal manualDentist record
    jobs.forEach(j => {
      if (j.dentistName && !seenNames.has(j.dentistName.trim().toLowerCase())) {
        seenNames.add(j.dentistName.trim().toLowerCase());
        list.push({
          id: j.dentistId || j.dentistName,
          name: j.dentistName,
          clinicName: j.clinicName,
          phone: undefined,
          whatsapp: undefined,
          email: undefined
        });
      }
    });

    return list;
  }, [manualDentists, allUsers, jobs]);

  // 1. Calculate Inactive Dentists
  const inactiveDentists = useMemo<InactiveDentistInfo[]>(() => {
    const now = new Date();

    const results: InactiveDentistInfo[] = allDentistsList.map(dentist => {
      const dentistJobs = jobs.filter(j => 
        (j.dentistId && j.dentistId === dentist.id) || 
        (j.dentistName && j.dentistName.trim().toLowerCase() === dentist.name.trim().toLowerCase())
      );

      const totalJobsHistorical = dentistJobs.length;
      const totalBillingHistorical = dentistJobs.reduce((sum, j) => sum + (j.totalValue || 0), 0);

      if (dentistJobs.length === 0) {
        return {
          id: dentist.id,
          name: dentist.name,
          clinicName: dentist.clinicName || 'Geral',
          phone: dentist.phone,
          whatsapp: dentist.whatsapp || dentist.phone,
          email: dentist.email,
          cro: dentist.cro,
          totalJobsHistorical: 0,
          totalBillingHistorical: 0,
          lastJobDate: null,
          daysInactive: 9999,
          severity: 'NEVER',
          lastJobPatient: undefined,
          lastJobService: undefined
        };
      }

      // Sort by creation date descending
      const sortedJobs = [...dentistJobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latestJob = sortedJobs[0];
      const lastDate = new Date(latestJob.createdAt);
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let severity: 'CRITICAL' | 'WARNING' | 'NEVER' = 'WARNING';
      if (daysInactive >= 60) severity = 'CRITICAL';
      else if (daysInactive >= 30) severity = 'WARNING';

      const lastService = latestJob.items && latestJob.items.length > 0 ? latestJob.items[0].name : undefined;

      return {
        id: dentist.id,
        name: dentist.name,
        clinicName: dentist.clinicName || latestJob.clinicName || 'Geral',
        phone: dentist.phone,
        whatsapp: dentist.whatsapp || dentist.phone,
        email: dentist.email,
        cro: dentist.cro,
        totalJobsHistorical,
        totalBillingHistorical,
        lastJobDate: lastDate,
        daysInactive,
        severity,
        lastJobPatient: latestJob.patientName,
        lastJobService: lastService
      };
    });

    // Filter only those that are either inactive (+30 days) or never sent
    const inactiveOnly = results.filter(d => d.daysInactive >= 30 || d.severity === 'NEVER');

    // Sort by days inactive descending (most critical first)
    return inactiveOnly.sort((a, b) => b.daysInactive - a.daysInactive);
  }, [allDentistsList, jobs]);

  // 2. Calculate Repetition & Remake Dentists
  const repetitionDentists = useMemo<RepetitionDentistInfo[]>(() => {
    const results: RepetitionDentistInfo[] = [];

    allDentistsList.forEach(dentist => {
      const dentistJobs = jobs.filter(j => 
        (j.dentistId && j.dentistId === dentist.id) || 
        (j.dentistName && j.dentistName.trim().toLowerCase() === dentist.name.trim().toLowerCase())
      );

      if (dentistJobs.length === 0) return;

      const serviceRepetitions: Record<string, number> = {};
      let repeatedJobsCount = 0;
      let totalRepetitionItems = 0;
      const sampleRepeatedCases: RepetitionDentistInfo['sampleRepeatedCases'] = [];

      dentistJobs.forEach(job => {
        let jobHasRepetition = false;

        // Check items
        (job.items || []).forEach(item => {
          const isRep = item.nature === 'REPETITION' || item.nature === 'ADJUSTMENT' || 
                        (item.name && (item.name.toLowerCase().includes('repeti') || item.name.toLowerCase().includes('retrabalho') || item.name.toLowerCase().includes('ajuste')));
          
          if (isRep) {
            jobHasRepetition = true;
            totalRepetitionItems += (item.quantity || 1);
            
            // Find clean service name
            const sName = jobTypes.find(t => t.id === item.jobTypeId)?.name || item.name;
            serviceRepetitions[sName] = (serviceRepetitions[sName] || 0) + (item.quantity || 1);

            sampleRepeatedCases.push({
              osNumber: job.osNumber,
              patientName: job.patientName,
              date: new Date(job.createdAt),
              serviceName: sName,
              nature: item.nature === 'REPETITION' ? 'Repetição' : 'Ajuste',
              reason: job.rejectionReason || job.notes
            });
          }
        });

        // Also check if whole job was returned/rejected
        if (!jobHasRepetition && (job.status === JobStatus.RETURNED || job.status === JobStatus.REJECTED)) {
          jobHasRepetition = true;
          totalRepetitionItems += 1;
          const sName = job.items && job.items[0] ? (jobTypes.find(t => t.id === job.items[0].jobTypeId)?.name || job.items[0].name) : 'Caso Inteiro';
          serviceRepetitions[sName] = (serviceRepetitions[sName] || 0) + 1;

          sampleRepeatedCases.push({
            osNumber: job.osNumber,
            patientName: job.patientName,
            date: new Date(job.createdAt),
            serviceName: sName,
            nature: 'Devolvido / Rejeitado',
            reason: job.rejectionReason || job.notes
          });
        }

        if (jobHasRepetition) {
          repeatedJobsCount += 1;
        }
      });

      // If dentist has any repetition
      if (repeatedJobsCount > 0) {
        const repetitionRate = (repeatedJobsCount / dentistJobs.length) * 100;
        
        // Find most repeated service
        let mostRepeatedService = 'Geral';
        let maxCount = 0;
        Object.entries(serviceRepetitions).forEach(([sName, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostRepeatedService = `${sName} (${count}x)`;
          }
        });

        let severity: 'CRITICAL' | 'WARNING' | 'LOW' = 'LOW';
        if (repetitionRate >= 20 || repeatedJobsCount >= 3) {
          severity = 'CRITICAL';
        } else if (repetitionRate >= 10 || repeatedJobsCount >= 2) {
          severity = 'WARNING';
        }

        // Generate tailored recommended action for the lab
        let recommendedAction = 'Monitorar próximos casos e conferir modelo de gesso/escaneamento antes da inclusão.';
        const lowerService = mostRepeatedService.toLowerCase();
        if (lowerService.includes('zirc') || lowerService.includes('cerâm') || lowerService.includes('coroa') || lowerService.includes('e.max')) {
          recommendedAction = 'Propor alinhamento técnico de preparo protético (espaço oclusal e término cervical) e conferência de troquel.';
        } else if (lowerService.includes('implante') || lowerService.includes('protocolo')) {
          recommendedAction = 'Sugerir envio de guia cirúrgico/transferente ou validação de assentamento passivo com índice rígido.';
        } else if (lowerService.includes('prótese total') || lowerService.includes('pt') || lowerService.includes('placa')) {
          recommendedAction = 'Recomendar conferência de vedamento periférico, relação cêntrica (DVO) e alívio de compressão tecidual.';
        } else if (repetitionRate > 25) {
          recommendedAction = 'Agendar reunião clínica com o protesista chefe do lab para padronizar parâmetros de envio e moldagem.';
        }

        results.push({
          id: dentist.id,
          name: dentist.name,
          clinicName: dentist.clinicName || 'Geral',
          phone: dentist.phone,
          whatsapp: dentist.whatsapp || dentist.phone,
          email: dentist.email,
          cro: dentist.cro,
          totalJobs: dentistJobs.length,
          repeatedJobsCount,
          totalRepetitionItems,
          repetitionRate,
          serviceRepetitions,
          mostRepeatedService,
          severity,
          recommendedAction,
          sampleRepeatedCases
        });
      }
    });

    // Sort by severity (CRITICAL first) then by repetition rate
    return results.sort((a, b) => {
      const severityWeight = { CRITICAL: 3, WARNING: 2, LOW: 1 };
      if (severityWeight[b.severity] !== severityWeight[a.severity]) {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      return b.repetitionRate - a.repetitionRate;
    });
  }, [allDentistsList, jobs, jobTypes]);

  // Filtered lists
  const filteredInactiveDentists = useMemo(() => {
    return inactiveDentists.filter(d => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches = d.name.toLowerCase().includes(term) || d.clinicName.toLowerCase().includes(term);
        if (!matches) return false;
      }

      if (inactiveFilter === '30_DAYS' && (d.daysInactive < 30 || d.daysInactive >= 60 || d.severity === 'NEVER')) return false;
      if (inactiveFilter === '60_DAYS' && (d.daysInactive < 60 || d.severity === 'NEVER')) return false;
      if (inactiveFilter === 'NEVER' && d.severity !== 'NEVER') return false;

      return true;
    });
  }, [inactiveDentists, searchTerm, inactiveFilter]);

  const filteredRepetitionDentists = useMemo(() => {
    return repetitionDentists.filter(d => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches = d.name.toLowerCase().includes(term) || d.clinicName.toLowerCase().includes(term) || d.mostRepeatedService.toLowerCase().includes(term);
        if (!matches) return false;
      }

      if (repetitionFilter === 'CRITICAL' && d.severity !== 'CRITICAL') return false;
      if (repetitionFilter === 'WARNING' && d.severity !== 'WARNING') return false;

      return true;
    });
  }, [repetitionDentists, searchTerm, repetitionFilter]);

  // Quick WhatsApp helpers
  const handleOpenWhatsAppReactivation = (dentist: InactiveDentistInfo) => {
    const rawPhone = dentist.whatsapp || dentist.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const labName = currentOrg?.name || 'Laboratório';

    let message = '';
    if (dentist.severity === 'NEVER') {
      message = `Olá Dr(a). ${dentist.name}! Tudo bem? Aqui é do ${labName}. Vimos que você possui cadastro conosco, mas ainda não enviou seu primeiro caso. Gostaríamos de saber se tem algum trabalho clínico em andamento para enviarmos tabela especial de boas-vindas e tirarmos qualquer dúvida!`;
    } else {
      const daysStr = `${dentist.daysInactive} dias`;
      const lastCaseStr = dentist.lastJobService ? ` (último em ${dentist.lastJobService})` : '';
      message = `Olá Dr(a). ${dentist.name}! Tudo bem? Aqui é do ${labName}. Notamos que faz ${daysStr} desde o seu último envio conosco${lastCaseStr}. Gostaríamos de saber como estão seus atendimentos e se podemos ajudar em algum caso protético desta semana com agilidade e condições especiais!`;
    }

    const phoneToUse = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
    if (phoneToUse.length >= 10) {
      window.open(`https://wa.me/${phoneToUse}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      alert(`Telefone/WhatsApp não informado para ${dentist.name}. Por favor, adicione o telefone no cadastro de dentistas.`);
    }
  };

  const handleOpenWhatsAppTechnicalAlignment = (dentist: RepetitionDentistInfo) => {
    const rawPhone = dentist.whatsapp || dentist.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const labName = currentOrg?.name || 'Laboratório';

    const serviceNameClean = dentist.mostRepeatedService.replace(/\(\d+x\)/, '').trim();
    const message = `Olá Dr(a). ${dentist.name}! Tudo bem? Aqui é o responsável técnico do ${labName}. Estamos fazendo uma revisão de qualidade dos nossos trabalhos e notamos algumas repetições recentes em casos de ${serviceNameClean}. Nosso compromisso é entregar sempre a adaptação perfeita de primeira para valorizar seu tempo de cadeira. Gostaria de agendar um rápido alinhamento técnico para revisarmos detalhes de preparo/moldagem e calibrarmos nossos parâmetros com sua preferência?`;

    const phoneToUse = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
    if (phoneToUse.length >= 10) {
      window.open(`https://wa.me/${phoneToUse}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      alert(`Telefone/WhatsApp não informado para ${dentist.name}. Por favor, adicione o telefone no cadastro de dentistas.`);
    }
  };

  return (
    <div className="bg-white dark:bg-[#131B2A] rounded-3xl p-5 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-soft space-y-6">
      {/* Header with Title & Stats Overview */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-rose-200 dark:shadow-none">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Radar de Clientes & Qualidade
                <span className="text-[10px] uppercase tracking-widest font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                  Inteligência Comercial
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Identifique dentistas inativos para reativação e reincidências de retrabalho para suporte técnico personalizado.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Tabs Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('INACTIVE'); setExpandedDentistId(null); }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'INACTIVE'
                ? 'bg-white dark:bg-[#1E293B] text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserX size={16} />
            <span>Sem Enviar ({inactiveDentists.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('REPETITIONS'); setExpandedDentistId(null); }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'REPETITIONS'
                ? 'bg-white dark:bg-[#1E293B] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw size={16} />
            <span>Reincidência de Repetições ({repetitionDentists.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">Inativos +60 Dias</span>
            <Flame size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
            {inactiveDentists.filter(d => d.daysInactive >= 60 && d.severity !== 'NEVER').length}
          </p>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400 font-medium">Alto risco de perda</span>
        </div>

        <div className="bg-orange-50/60 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-400">Inativos 30-59 Dias</span>
            <Clock size={16} className="text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-900 dark:text-orange-200 mt-1">
            {inactiveDentists.filter(d => d.daysInactive >= 30 && d.daysInactive < 60).length}
          </p>
          <span className="text-[10px] text-orange-600/80 dark:text-orange-400 font-medium">Janela ideal de contato</span>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Alta Reincidência</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
            {repetitionDentists.filter(d => d.severity === 'CRITICAL').length}
          </p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400 font-medium">Taxa de repetição &gt; 20%</span>
        </div>

        <div className="bg-teal-50/60 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">Casos com Repetição</span>
            <RotateCcw size={16} className="text-teal-500" />
          </div>
          <p className="text-2xl font-black text-teal-900 dark:text-teal-200 mt-1">
            {repetitionDentists.reduce((sum, d) => sum + d.repeatedJobsCount, 0)}
          </p>
          <span className="text-[10px] text-teal-600/80 dark:text-teal-400 font-medium">Total de OSs retrabalhadas</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'INACTIVE' ? 'Buscar dentista inativo...' : 'Buscar por dentista ou serviço...'}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#131B2A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        {activeTab === 'INACTIVE' ? (
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Inatividade:</span>
            <button
              onClick={() => setInactiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                inactiveFilter === 'ALL'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Todos ({inactiveDentists.length})
            </button>
            <button
              onClick={() => setInactiveFilter('60_DAYS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                inactiveFilter === '60_DAYS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              +60 Dias
            </button>
            <button
              onClick={() => setInactiveFilter('30_DAYS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                inactiveFilter === '30_DAYS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              30 - 59 Dias
            </button>
            <button
              onClick={() => setInactiveFilter('NEVER')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                inactiveFilter === 'NEVER'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Sem Pedidos
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Gravidade:</span>
            <button
              onClick={() => setRepetitionFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                repetitionFilter === 'ALL'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Todos ({repetitionDentists.length})
            </button>
            <button
              onClick={() => setRepetitionFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                repetitionFilter === 'CRITICAL'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Crítico (&gt;20%)
            </button>
            <button
              onClick={() => setRepetitionFilter('WARNING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                repetitionFilter === 'WARNING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-[#131B2A] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Atenção (10-20%)
            </button>
          </div>
        )}
      </div>

      {/* --- TAB 1 CONTENT: INACTIVE DENTISTS --- */}
      {activeTab === 'INACTIVE' && (
        <div className="space-y-3">
          {filteredInactiveDentists.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Excelente! Nenhum dentista inativo encontrado.</p>
              <p className="text-xs text-slate-400 mt-0.5">Sua carteira de clientes está ativa e com pedidos frequentes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredInactiveDentists.map(dentist => {
                const isNever = dentist.severity === 'NEVER';
                const isCritical = dentist.severity === 'CRITICAL';

                return (
                  <div 
                    key={dentist.id} 
                    className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60 shadow-sm transition-all flex flex-col justify-between gap-3 relative overflow-hidden group"
                  >
                    {/* Top severity bar indicator */}
                    <div 
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        isNever ? 'bg-slate-400' : isCritical ? 'bg-rose-500' : 'bg-orange-400'
                      }`} 
                    />

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isCritical ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                          }`}>
                            <Stethoscope size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-white text-sm truncate flex items-center gap-1.5">
                              {dentist.name}
                              {dentist.cro && (
                                <span className="text-[10px] font-bold text-slate-400">({dentist.cro})</span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <Building2 size={12} /> {dentist.clinicName || 'Clínica Geral'}
                            </p>
                          </div>
                        </div>

                        {/* Inactivity Badge */}
                        <div className={`shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                          isNever 
                            ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' 
                            : isCritical 
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900' 
                              : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900'
                        }`}>
                          <Clock size={12} />
                          <span>{isNever ? 'Sem Pedidos' : `${dentist.daysInactive} dias inativo`}</span>
                        </div>
                      </div>

                      {/* Summary Data */}
                      <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Último Pedido</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {dentist.lastJobDate ? dentist.lastJobDate.toLocaleDateString('pt-BR') : 'Nunca enviou'}
                          </span>
                          {dentist.lastJobService && (
                            <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                              {dentist.lastJobService}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Histórico no Lab</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {dentist.totalJobsHistorical} {dentist.totalJobsHistorical === 1 ? 'caso' : 'casos'}
                          </span>
                          <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 block mt-0.5">
                            R$ {dentist.totalBillingHistorical.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Button to Reactivate via WhatsApp */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-400 truncate">
                        {dentist.whatsapp || dentist.phone ? (
                          <span className="flex items-center gap-1"><Phone size={12} /> {dentist.whatsapp || dentist.phone}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">Sem telefone salvo</span>
                        )}
                      </span>

                      <button
                        onClick={() => handleOpenWhatsAppReactivation(dentist)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 shrink-0"
                        title="Enviar mensagem amigável de reativação pelo WhatsApp"
                      >
                        <MessageCircle size={14} />
                        <span>Reativar no WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2 CONTENT: REPETITION & REMAKES DENTISTS --- */}
      {activeTab === 'REPETITIONS' && (
        <div className="space-y-3">
          {filteredRepetitionDentists.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tudo em ordem! Nenhuma reincidência de repetições detectada.</p>
              <p className="text-xs text-slate-400 mt-0.5">Os trabalhos estão sendo entregues com alto índice de aprovação de primeira.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRepetitionDentists.map(dentist => {
                const isCritical = dentist.severity === 'CRITICAL';
                const isExpanded = expandedDentistId === dentist.id;

                return (
                  <div 
                    key={dentist.id} 
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/60 shadow-sm transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                          isCritical ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          <RotateCcw size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-900 dark:text-white text-base truncate flex items-center gap-2">
                            {dentist.name}
                            {dentist.cro && <span className="text-xs text-slate-400">({dentist.cro})</span>}
                          </h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Building2 size={12} /> {dentist.clinicName || 'Geral'}
                          </p>
                        </div>
                      </div>

                      {/* Repetition Rate Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                          isCritical 
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900' 
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                        }`}>
                          <AlertTriangle size={14} />
                          <span>Taxa: {dentist.repetitionRate.toFixed(1)}% ({dentist.repeatedJobsCount} de {dentist.totalJobs} casos)</span>
                        </div>

                        <button
                          onClick={() => handleOpenWhatsAppTechnicalAlignment(dentist)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                          title="Abrir WhatsApp com mensagem cordial de suporte técnico"
                        >
                          <MessageCircle size={14} />
                          <span>Alinhamento Técnico</span>
                        </button>
                      </div>
                    </div>

                    {/* Breakdown of Most Repeated Services & Strategic Lab Advice */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 text-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 block mb-1">
                          Reincidência Concentrada Em:
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(dentist.serviceRepetitions).map(([service, count]) => (
                            <span 
                              key={service} 
                              className="px-2 py-0.5 bg-white dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold rounded-md text-[11px]"
                            >
                              {service}: <strong>{count}x</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-400 block mb-1 flex items-center gap-1">
                          <Sparkles size={12} className="text-blue-600 dark:text-blue-400" />
                          Recomendação de Abordagem do Laboratório:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-relaxed">
                          {dentist.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {/* Expand Case Details Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setExpandedDentistId(isExpanded ? null : dentist.id)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        <span>{isExpanded ? 'Ocultar Casos Repetidos' : `Ver Histórico de ${dentist.sampleRepeatedCases.length} Retrabalhos`}</span>
                      </button>

                      <button
                        onClick={() => navigate('/reports')}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>Abrir Relatório Completo</span>
                        <ArrowUpRight size={12} />
                      </button>
                    </div>

                    {/* Expanded list of repeated cases for this dentist */}
                    {isExpanded && (
                      <div className="mt-3 bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Detalhamento de OSs com Repetição / Ajuste:
                        </span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                <th className="py-1.5 px-2">OS #</th>
                                <th className="py-1.5 px-2">Paciente</th>
                                <th className="py-1.5 px-2">Serviço</th>
                                <th className="py-1.5 px-2">Data</th>
                                <th className="py-1.5 px-2">Tipo</th>
                                <th className="py-1.5 px-2">Motivo / Obs</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-[11px]">
                              {dentist.sampleRepeatedCases.map((c, i) => (
                                <tr key={i} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                                  <td className="py-2 px-2 font-mono font-bold text-slate-700 dark:text-slate-300">{c.osNumber || '-'}</td>
                                  <td className="py-2 px-2 font-bold text-slate-900 dark:text-white">{c.patientName}</td>
                                  <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{c.serviceName}</td>
                                  <td className="py-2 px-2 text-slate-400">{c.date.toLocaleDateString('pt-BR')}</td>
                                  <td className="py-2 px-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                      {c.nature || 'Repetição'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-slate-500 italic max-w-xs truncate">{c.reason || 'Sem observação'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
