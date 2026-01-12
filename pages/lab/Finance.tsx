

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { JobStatus, UserRole, Expense, Job, TransactionCategory, BillingBatch } from '../../types';
import * as api from '../../services/firebaseService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
/* Fixed lucide-react import from lucide-center typo */
import { 
  DollarSign, TrendingUp, TrendingDown, Search, Calendar, Plus, Printer, 
  FileText, Download, AlertCircle, Wallet, Briefcase, CheckCircle, 
  CreditCard, Loader2, User, Package, Clock, X, ChevronRight, Filter, 
  FileCheck, Receipt, Check, Trash2, ShoppingCart, ArrowUpRight, ArrowDownRight,
  ChevronDown, History
} from 'lucide-react';

// Correcting the import path that was likely meant to be lucide-react
import { Search as SearchIcon } from 'lucide-react';

export const Finance = () => {
  const { jobs, allUsers, manualDentists, currentOrg } = useApp();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RECEIVABLES' | 'EXPENSES' | 'BATCHES'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [billingBatches, setBillingBatches] = useState<BillingBatch[]>([]);
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      const unsubExp = api.subscribeExpenses(currentOrg.id, setExpenses);
      const unsubBatch = api.subscribeBillingBatches(currentOrg.id, setBillingBatches);
      return () => { unsubExp(); unsubBatch(); };
    }
  }, [currentOrg]);

  // --- ANALYTICS CALCULATIONS ---
  const stats = useMemo(() => {
    const paidRevenue = jobs.filter(j => j.paymentStatus === 'PAID').reduce((acc, curr) => acc + curr.totalValue, 0);
    
    // A Receber: Apenas trabalhos que NÃO foram pagos (Web já nasce como PAID ou em processo de captura)
    // Consideramos trabalhos manuais que estão finalizados mas ainda com paymentStatus PENDING ou sem status definido
    const pendingRevenue = jobs.filter(j => 
        (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED) && 
        (j.paymentStatus === 'PENDING' || !j.paymentStatus) &&
        !j.asaasPaymentId // Property 'asaasPaymentId' fixed by updating Job interface in types.ts
    ).reduce((acc, curr) => acc + curr.totalValue, 0);

    const totalExpenses = expenses.filter(e => e.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
    const lossFromRemakes = jobs.reduce((acc, job) => {
        const remakeItems = job.items.filter(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT');
        return acc + remakeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, 0);

    return { paidRevenue, pendingRevenue, totalExpenses, profit: paidRevenue - totalExpenses, lossFromRemakes };
  }, [jobs, expenses]);

  // --- DENTIST SUMMARY ---
  const dentistSummary = useMemo(() => {
    const map = new Map<string, any>();
    const allDents = [...allUsers.filter(u => u.role === UserRole.CLIENT), ...manualDentists];
    
    allDents.forEach(d => {
        map.set(d.id, { ...d, totalPending: 0, totalPaid: 0, history: [], pendingJobs: [] });
    });

    jobs.forEach(job => {
        let entry = map.get(job.dentistId);
        if (!entry) {
            entry = { id: job.dentistId, name: job.dentistName, totalPending: 0, totalPaid: 0, history: [], pendingJobs: [] };
            map.set(job.dentistId, entry);
        }
        
        if (job.paymentStatus === 'PAID') {
            entry.totalPaid += job.totalValue;
        } else if (
            /* Fixed line 81: renamed variable 'j' to 'job' to match scope */
            (job.paymentStatus === 'PENDING' || !job.paymentStatus) && 
            (job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED) &&
            !job.asaasPaymentId // Property 'asaasPaymentId' fixed by updating Job interface in types.ts
        ) {
            entry.totalPending += job.totalValue;
            entry.pendingJobs.push(job);
        }
        entry.history.push(job);
    });

    return Array.from(map.values()).filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(d => d.totalPending > 0 || d.history.length > 0).sort((a, b) => b.totalPending - a.totalPending);
  }, [jobs, allUsers, manualDentists, searchTerm]);

  const handleCreateBoleto = async () => {
    if (!currentOrg || !selectedDentist || selectedJobIds.length === 0) return;
    setIsGenerating(true);
    try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5);
        await api.apiGenerateBatchBoleto(currentOrg.id, selectedDentist.id, selectedJobIds, dueDate);
        alert("Boleto e Fatura gerados!");
        setSelectedDentist(null);
        setSelectedJobIds([]);
    } catch (error: any) {
        alert("Erro: " + error.message);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Wallet className="text-blue-600" /> Fluxo de Caixa & Faturamento</h1>
          <p className="text-slate-500 font-medium">Apenas casos manuais finalizados ficam disponíveis para faturamento acumulado.</p>
        </div>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'DASHBOARD' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Métricas</button>
          <button onClick={() => setActiveTab('RECEIVABLES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RECEIVABLES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Extrato p/ Faturamento</button>
          <button onClick={() => setActiveTab('EXPENSES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'EXPENSES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Despesas</button>
          <button onClick={() => setActiveTab('BATCHES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'BATCHES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Faturas</button>
      </div>

      {activeTab === 'RECEIVABLES' && (
          <div className="space-y-6 animate-in slide-in-from-right-2">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Débitos de Casos Concluídos</h2>
                        <p className="text-sm text-slate-500">Selecione o dentista para faturar trabalhos internos já finalizados.</p>
                      </div>
                      <div className="relative w-full md:w-80">
                          <SearchIcon className="absolute left-3 top-2.5 text-slate-400" size={18} />
                          <input placeholder="Buscar dentista..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dentistSummary.map(d => (
                          <div key={d.id} onClick={() => setSelectedDentist(d)} className="p-5 border border-slate-100 rounded-2xl hover:border-blue-500 cursor-pointer transition-all bg-slate-50 group flex flex-col justify-between">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm">{d.name.charAt(0)}</div>
                                  <div className="flex-1 overflow-hidden"><p className="font-bold text-slate-800 truncate">{d.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">{d.clinicName || 'Consultório'}</p></div>
                                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500" />
                              </div>
                              <div className="grid grid-cols-1 gap-2 border-t border-slate-200/50 pt-4">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Débito Acumulado (Finalizados)</p>
                                  <p className={`text-xl font-black ${d.totalPending > 0 ? 'text-red-600' : 'text-slate-300'}`}>R$ {d.totalPending.toFixed(2)}</p>
                              </div>
                          </div>
                      ))}
                      {dentistSummary.length === 0 && (
                          <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed rounded-3xl italic">
                              Nenhum débito pendente de faturamento no momento.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'DASHBOARD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Receita Realizada (Paga)</p>
                  <h3 className="text-2xl font-black text-green-600">R$ {stats.paidRevenue.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">A Receber (Finalizados)</p>
                  <h3 className="text-2xl font-black text-red-600">R$ {stats.pendingRevenue.toFixed(2)}</h3>
              </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Despesas</p>
                  <h3 className="text-2xl font-black text-slate-800">R$ {stats.totalExpenses.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Lucro Estimado</p>
                  <h3 className="text-2xl font-black text-blue-600">R$ {stats.profit.toFixed(2)}</h3>
              </div>
          </div>
      )}

      {selectedDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">Extrato de Débitos: {selectedDentist.name}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase">Apenas trabalhos internos concluídos</p>
                      </div>
                      <button onClick={() => setSelectedDentist(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-7 space-y-3">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Trabalhos Disponíveis p/ Cobrança</h4>
                          {selectedDentist.pendingJobs.map((job: Job) => {
                              const isSelected = selectedJobIds.includes(job.id);
                              return (
                                  <div key={job.id} onClick={() => setSelectedJobIds(prev => isSelected ? prev.filter(id => id !== job.id) : [...prev, job.id])} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-blue-600 bg-white shadow-md' : 'border-blue-100 bg-white/50 hover:bg-white'}`}>
                                      <div className="flex items-center gap-3">
                                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-blue-200'}`}>{isSelected && <Check size={12} className="text-white" />}</div>
                                          <div>
                                              <p className="text-sm font-bold text-slate-800">OS #{job.osNumber} - {job.patientName}</p>
                                              <p className="text-[10px] text-slate-400">Finalizado em: {new Date(job.history[job.history.length-1].timestamp).toLocaleDateString()}</p>
                                          </div>
                                      </div>
                                      <p className="font-black text-blue-800">R$ {job.totalValue.toFixed(2)}</p>
                                  </div>
                              );
                          })}
                      </div>
                      <div className="lg:col-span-5 bg-blue-50/50 p-6 rounded-3xl border border-blue-100 h-fit">
                          <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Total a Faturar</h4>
                          <div className="flex justify-between items-center mb-6">
                              <span className="text-xs text-slate-500">{selectedJobIds.length} trabalhos selecionados</span>
                              <span className="text-2xl font-black text-blue-900">R$ {selectedJobIds.reduce((acc, id) => acc + (selectedDentist.pendingJobs.find((p:any)=>p.id===id)?.totalValue || 0), 0).toFixed(2)}</span>
                          </div>
                          <button onClick={handleCreateBoleto} disabled={selectedJobIds.length === 0 || isGenerating} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                            {isGenerating ? <Loader2 className="animate-spin"/> : <><Receipt size={20}/> GERAR BOLETO E FATURA</>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};