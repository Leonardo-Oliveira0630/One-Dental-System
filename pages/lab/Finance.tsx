import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { JobStatus, UserRole, Expense, Job, TransactionCategory, BillingBatch, DentistPayment } from '../../types';
import * as api from '../../services/firebaseService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  DollarSign, TrendingUp, TrendingDown, Search, Calendar, Plus, Printer, 
  FileText, Download, AlertCircle, Wallet, Briefcase, CheckCircle, 
  CreditCard, Loader2, User, Package, Clock, X, ChevronRight, Filter, 
  FileCheck, Receipt, Check, Trash2, ShoppingCart, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronLeft, History, ExternalLink, Copy, Tag, AlertTriangle, ShieldCheck, Zap, ArrowUpCircle,
  ArrowDownCircle, FileSpreadsheet, Building, UserCheck
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Finance = () => {
  const { jobs, allUsers, manualDentists, currentOrg, dentistPayments, billingBatches, addDentistPayment, updateBillingBatchStatus, generateBatchBoleto } = useApp();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RECEIVABLES' | 'EXPENSES' | 'BATCHES'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // const [billingBatches, setBillingBatches] = useState<BillingBatch[]>([]); // Using from context now for sync
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Advanced Financial View State
  const [showStatement, setShowStatement] = useState(false);
  const [statementClient, setStatementClient] = useState<any | null>(null);
  const [dentistJobs, setDentistJobs] = useState<Job[]>([]);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isSaving, setIsSaving] = useState(false);

  // Manual Payment Form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentInterest, setPaymentInterest] = useState<number>(0);
  const [paymentFees, setPaymentFees] = useState<number>(0);
  const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<DentistPayment['paymentMethod']>('PIX');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Expense Form State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
      description: '',
      amount: 0,
      category: 'SUPPLIES' as TransactionCategory,
      date: new Date().toISOString().split('T')[0],
      status: 'PAID' as 'PAID' | 'PENDING'
  });

  useEffect(() => {
    if (showStatement && statementClient && currentOrg) {
        setIsLoadingStatement(true);
        const unsub = api.subscribeDentistJobs(currentOrg.id, statementClient.id, (data) => {
            setDentistJobs(data);
            setIsLoadingStatement(false);
        });
        return () => unsub();
    } else {
        setDentistJobs([]);
        setIsLoadingStatement(false);
    }
  }, [showStatement, statementClient, currentOrg]);

  useEffect(() => {
    if (currentOrg) {
      const unsubExp = api.subscribeExpenses(currentOrg.id, setExpenses);
      return () => { unsubExp(); };
    }
  }, [currentOrg]);

  // Chrono History Logic (Synchronized with Dentists.tsx)
  const chronoHistory = useMemo(() => {
    if (!statementClient) return { history: [], previousBalance: 0 };
    
    const clientJobs = dentistJobs.filter(j => j.dentistId === statementClient.id && (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED));
    const clientPayments = dentistPayments.filter(p => p.dentistId === statementClient.id);
    
    const history = [
        ...clientJobs.map(j => ({
            id: j.id,
            date: j.createdAt,
            type: 'DEBIT' as const,
            description: `OS #${j.osNumber || j.id.substring(0,6)} - Paciente: ${j.patientName}`,
            amount: j.totalValue || 0,
            job: j
        })),
        ...clientPayments.map(p => ({
            id: p.id,
            date: p.paymentDate,
            type: (p.type === 'DISCOUNT' ? 'CREDIT' : 'PAYMENT') as 'CREDIT' | 'PAYMENT',
            description: p.type === 'DISCOUNT' ? `Desconto: ${p.notes || ''}` : `Pagamento: ${p.paymentMethod} ${p.notes ? `- ${p.notes}` : ''}`,
            amount: p.amount + (p.interest || 0) + (p.fees || 0) - (p.discount || 0),
            payment: p
        }))
    ];
    
    const sorted = history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    let runningBalance = 0;
    let previousBalance = 0;
    
    const historyWithBalance = sorted.map(item => {
        if (item.type === 'DEBIT') runningBalance -= item.amount;
        else runningBalance += item.amount;
        
        const isBefore = new Date(item.date) < startDate;
        if (isBefore) previousBalance = runningBalance;
        
        return { ...item, balanceAfter: runningBalance };
    });

    const filteredHistory = historyWithBalance.filter(item => {
        const d = new Date(item.date);
        return d >= startDate && d <= endDate;
    });

    return { history: filteredHistory, previousBalance };
  }, [statementClient, dentistJobs, dentistPayments, selectedMonth, selectedYear]);

  const generateStatementPDF = () => {
    if (!statementClient) return;

    const doc = new jsPDF();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const periodStr = `${monthNames[selectedMonth]} / ${selectedYear}`;
    
    doc.setFontSize(20);
    doc.text("Extrato", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Período: 01/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear} - ${new Date(selectedYear, selectedMonth + 1, 0).getDate()}/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear}`, 105, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Cliente: ${statementClient.name.toUpperCase()}`, 14, 45);
    doc.text(`Documento: ${statementClient.cpfCnpj || '-'}`, 14, 52);
    
    const address = statementClient.clinicName || 'Consultório';
    doc.text(`Endereço: ${address}`, 120, 45, { maxWidth: 80 });

    autoTable(doc, {
        startY: 70,
        head: [['Data', 'Descrição', 'Valor', 'Saldo']],
        body: [
            ['', 'Saldo anterior', '', `R$ ${chronoHistory.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
        ],
        theme: 'plain',
        styles: { fontSize: 9, fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' } }
    });

    const tableBody = chronoHistory.history.map(item => {
        const amountStr = item.type === 'DEBIT' ? `R$ -${item.amount.toFixed(2)}` : `R$ ${item.amount.toFixed(2)}`;
        return [
            new Date(item.date).toLocaleDateString('pt-BR'),
            item.description,
            { content: amountStr, styles: { textColor: (item.type === 'DEBIT' ? [255, 0, 0] : [0, 128, 0]) as [number, number, number] } },
            `R$ ${item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ];
    });

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 2,
        head: [],
        body: tableBody,
        theme: 'striped',
        styles: { fontSize: 8 },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalServices = chronoHistory.history.filter(i => i.type === 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
    const totalPayments = chronoHistory.history.filter(i => i.type !== 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
    const currentBalance = chronoHistory.history.length > 0 ? chronoHistory.history[chronoHistory.history.length - 1].balanceAfter : chronoHistory.previousBalance;

    doc.setFontSize(10);
    doc.text("Saldo anterior", 140, finalY);
    doc.text(`R$ ${chronoHistory.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 195, finalY, { align: 'right' });
    
    doc.text("Total de serviços", 140, finalY + 7);
    doc.setTextColor(255, 0, 0);
    doc.text(`R$ -${totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 195, finalY + 7, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    doc.text("Total de pagamentos", 140, finalY + 14);
    doc.setTextColor(0, 128, 0);
    doc.text(`R$ ${totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 195, finalY + 14, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Saldo atual no período", 140, finalY + 25);
    const balanceColor = (currentBalance < 0 ? [255, 0, 0] : [0, 128, 0]) as [number, number, number];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.text(`R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 195, finalY + 25, { align: 'right' });

    doc.save(`Extrato_${statementClient.name}_${periodStr.replace(' / ', '_')}.pdf`);
  };

  const handleSavePayment = async () => {
    if (!statementClient || paymentAmount <= 0) return;
    setIsSaving(true);
    try {
        await addDentistPayment({
            dentistId: statementClient.id,
            dentistName: statementClient.name,
            amount: paymentAmount,
            interest: paymentInterest,
            fees: paymentFees,
            discount: paymentDiscount,
            paymentMethod: paymentMethod,
            paymentDate: new Date(),
            type: 'PAYMENT',
            notes: paymentNotes
        });
        setPaymentAmount(0);
        setPaymentInterest(0);
        setPaymentFees(0);
        setPaymentDiscount(0);
        setPaymentNotes('');
        setShowPaymentForm(false);
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar pagamento.");
    } finally {
        setIsSaving(false);
    }
  };

  // --- ANALYTICS CALCULATIONS ---
  const stats = useMemo(() => {
    const paidFromJobs = jobs.filter(j => j.paymentStatus === 'PAID').reduce((acc, curr) => acc + curr.totalValue, 0);
    const paidRevenue = paidFromJobs; 

    const pendingRevenue = jobs.filter(j => 
        (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED) && 
        (j.paymentStatus === 'PENDING' || !j.paymentStatus) &&
        !j.batchId && !j.asaasPaymentId
    ).reduce((acc, curr) => acc + curr.totalValue, 0);

    const inBatchesPending = billingBatches.filter(b => b.status === 'PENDING').reduce((acc, curr) => acc + curr.totalAmount, 0);

    const totalExpenses = expenses.filter(e => e.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
    
    return { paidRevenue, pendingRevenue, inBatchesPending, totalExpenses, profit: paidRevenue - totalExpenses };
  }, [jobs, expenses, billingBatches]);

  const dentistSummary = useMemo(() => {
    const map = new Map<string, any>();
    const allDents = [...allUsers.filter(u => u.role === UserRole.CLIENT), ...manualDentists];
    
    allDents.forEach(d => {
        map.set(d.id, { ...d, totalPending: 0, history: [], pendingJobs: [] });
    });

    jobs.forEach(job => {
        let entry = map.get(job.dentistId);
        if (!entry) {
            entry = { id: job.dentistId, name: job.dentistName, totalPending: 0, history: [], pendingJobs: [] };
            map.set(job.dentistId, entry);
        }
        
        if (
            (job.paymentStatus === 'PENDING' || !job.paymentStatus) && 
            (job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED) &&
            !job.batchId && !job.asaasPaymentId
        ) {
            entry.totalPending += job.totalValue;
            entry.pendingJobs.push(job);
        }
    });

    return Array.from(map.values())
        .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(d => d.totalPending > 0)
        .sort((a, b) => b.totalPending - a.totalPending);
  }, [jobs, allUsers, manualDentists, searchTerm]);

  const handleCreateBoleto = async () => {
    if (!currentOrg || !selectedDentist || selectedJobIds.length === 0) return;
    setIsGenerating(true);
    try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5);
        await api.apiGenerateBatchBoleto(currentOrg.id, selectedDentist.id, selectedJobIds, dueDate);
        alert("Boleto e Fatura gerados com sucesso!");
        setSelectedDentist(null);
        setSelectedJobIds([]);
        setActiveTab('BATCHES');
    } catch (error: any) {
        alert("Erro: " + error.message);
    } finally { setIsGenerating(false); }
  };

  const handleWithdrawFunds = async () => {
      if (!currentOrg?.financialSettings?.balance || currentOrg.financialSettings.balance <= 0) {
          alert("Você não possui saldo disponível para saque.");
          return;
      }
      if (!window.confirm(`Deseja transferir R$ ${currentOrg.financialSettings.balance.toFixed(2)} para sua conta bancária cadastrada no Asaas?`)) return;
      
      setIsWithdrawing(true);
      try {
          await api.apiRequestWithdrawal(currentOrg.id, currentOrg.financialSettings.balance);
          alert("Solicitação de transferência enviada com sucesso!");
      } catch (err: any) {
          alert("Erro ao solicitar saque: " + err.message);
      } finally { setIsWithdrawing(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentOrg) return;
      try {
          await api.apiAddExpense(currentOrg.id, {
              ...expenseForm,
              id: `exp_${Date.now()}`,
              organizationId: currentOrg.id,
              date: new Date(expenseForm.date),
              createdAt: new Date()
          } as any);
          setShowExpenseModal(false);
          setExpenseForm({ description: '', amount: 0, category: 'SUPPLIES', date: new Date().toISOString().split('T')[0], status: 'PAID' });
      } catch (e) { alert("Erro ao salvar despesa."); }
  };

  const copyBoletoLink = (url: string, id: string) => {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Wallet className="text-blue-600" /> Financeiro do Laboratório</h1>
          <p className="text-slate-500 font-medium">Gestão de faturamento acumulado e fluxo de caixa.</p>
        </div>
      </div>

      {/* ASAAS WALLET QUICK INFO (Sempre Visível) */}
      {currentOrg?.financialSettings?.asaasWalletId && (
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><ShieldCheck size={120} /></div>
              <div className="flex-1 text-center md:text-left relative z-10">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> Conta Digital Ativa (Split ProTrack)
                  </div>
                  <h2 className="text-sm font-bold text-slate-400 uppercase">Saldo Disponível para Saque</h2>
                  <p className="text-4xl font-black text-white mt-1">R$ {(currentOrg.financialSettings.balance || 0).toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium flex items-center justify-center md:justify-start gap-2">
                      <Clock size={12} /> Lançamentos a liberar: <strong>R$ {(currentOrg.financialSettings.pendingBalance || 0).toFixed(2)}</strong>
                  </p>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto relative z-10">
                  <button 
                    onClick={handleWithdrawFunds}
                    disabled={isWithdrawing || !currentOrg.financialSettings.balance}
                    className="px-8 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                      {isWithdrawing ? <Loader2 className="animate-spin" size={20}/> : <><ArrowUpCircle size={20}/> SOLICITAR SAQUE</>}
                  </button>
                  <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="text-center text-[10px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
                      Gerenciar via Painel Asaas <ExternalLink size={10}/>
                  </a>
              </div>
          </div>
      )}

      <div className="flex bg-slate-200 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'DASHBOARD' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Métricas</button>
          <button onClick={() => setActiveTab('RECEIVABLES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RECEIVABLES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Extrato p/ Faturamento</button>
          <button onClick={() => setActiveTab('BATCHES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'BATCHES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Faturas & Boletos</button>
          <button onClick={() => setActiveTab('EXPENSES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'EXPENSES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Despesas</button>
      </div>

      {activeTab === 'DASHBOARD' && (
          <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Receita Realizada (Paga)</p>
                      <h3 className="text-2xl font-black text-green-600">R$ {stats.paidRevenue.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Faturado Pendente (Boletos)</p>
                      <h3 className="text-2xl font-black text-orange-600">R$ {stats.inBatchesPending.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">A Faturar (Concluídos)</p>
                      <h3 className="text-2xl font-black text-blue-600">R$ {stats.pendingRevenue.toFixed(2)}</h3>
                  </div>
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Despesas Pagas</p>
                      <h3 className="text-2xl font-black text-red-500">R$ {stats.totalExpenses.toFixed(2)}</h3>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'RECEIVABLES' && (
          <div className="space-y-6 animate-in slide-in-from-right-2">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Prontos para Cobrança</h2>
                        <p className="text-sm text-slate-500">Apenas trabalhos internos **concluídos** que ainda não foram faturados.</p>
                      </div>
                      <div className="relative w-full md:w-80">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                          <input placeholder="Buscar dentista..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dentistSummary.map(d => (
                          <div key={d.id} onClick={() => setSelectedDentist(d)} className="p-5 border border-slate-100 rounded-2xl hover:border-blue-500 cursor-pointer transition-all bg-slate-50 group flex flex-col justify-between">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm">{d.name.charAt(0)}</div>
                                  <div className="flex-1 overflow-hidden"><p className="font-bold text-slate-800 truncate">{d.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">{d.clinicName || 'Consultório'}</p></div>
                                  <div className="flex gap-1">
                                      <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setStatementClient(d);
                                              setShowStatement(true);
                                          }}
                                          className="p-2 bg-white text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100"
                                          title="Ver Extrato Detalhado"
                                      >
                                          <FileText size={18} />
                                      </button>
                                      <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500" />
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 gap-2 border-t border-slate-200/50 pt-4">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Débito na Gaveta</p>
                                  <p className="text-xl font-black text-red-600">R$ {d.totalPending.toFixed(2)}</p>
                              </div>
                          </div>
                      ))}
                      {dentistSummary.length === 0 && (
                          <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed rounded-3xl italic">
                              Nenhum trabalho concluído aguardando faturamento.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'BATCHES' && (
          <div className="space-y-6 animate-in slide-in-from-right-2">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Receipt className="text-blue-600"/> Histórico de Faturas e Boletos</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                            <tr>
                                <th className="p-4">Fatura ID</th>
                                <th className="p-4">Dentista</th>
                                <th className="p-4">Vencimento</th>
                                <th className="p-4">Valor Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {billingBatches.map(batch => (
                                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-500 uppercase">{batch.id.substring(0, 8)}...</td>
                                    <td className="p-4 font-bold text-slate-800">{batch.dentistName}</td>
                                    <td className="p-4 text-slate-600 font-medium">{new Date(batch.dueDate).toLocaleDateString()}</td>
                                    <td className="p-4 font-black text-slate-800">R$ {batch.totalAmount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black ${
                                            batch.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                                            batch.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {batch.status === 'PAID' ? 'PAGO' : batch.status === 'OVERDUE' ? 'VENCIDO' : 'AGUARDANDO'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {batch.invoiceUrl && (
                                                <>
                                                    <button 
                                                        onClick={() => copyBoletoLink(batch.invoiceUrl!, batch.id)}
                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copiedId === batch.id ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                                    >
                                                        {copiedId === batch.id ? <Check size={14}/> : <Copy size={14}/>} {copiedId === batch.id ? 'Copiado' : 'Link Boleto'}
                                                    </button>
                                                    <a href={batch.invoiceUrl} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                                        <ExternalLink size={16} />
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'EXPENSES' && (
          <div className="space-y-6 animate-in slide-in-from-right-2">
              <div className="flex justify-end">
                  <button onClick={() => setShowExpenseModal(true)} className="px-6 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg flex items-center gap-2 hover:bg-red-700 transition-all">
                      <Plus size={20} /> LANÇAR DESPESA
                  </button>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr>
                              <th className="p-4">Data</th>
                              <th className="p-4">Descrição</th>
                              <th className="p-4">Categoria</th>
                              <th className="p-4">Valor</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {expenses.map(exp => (
                              <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4 text-sm font-medium text-slate-600">{new Date(exp.date).toLocaleDateString()}</td>
                                  <td className="p-4 font-bold text-slate-800">{exp.description}</td>
                                  <td className="p-4"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500">{exp.category}</span></td>
                                  <td className="p-4 font-black text-red-600">R$ {exp.amount.toFixed(2)}</td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-black ${exp.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{exp.status === 'PAID' ? 'PAGA' : 'PENDENTE'}</span></td>
                                  <td className="p-4 text-right">
                                      <button onClick={() => api.apiDeleteExpense(currentOrg!.id, exp.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={18}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* MODAL: SELEÇÃO DE TRABALHOS P/ FATURAMENTO */}
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
                          
                          <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 mb-6 flex gap-2 items-start">
                              <AlertTriangle className="text-yellow-600 shrink-0" size={18}/>
                              <p className="text-[11px] text-yellow-800">Um boleto bancário será gerado e os trabalhos serão marcados como **Aguardando Pagamento**.</p>
                          </div>

                          <button onClick={handleCreateBoleto} disabled={selectedJobIds.length === 0 || isGenerating} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all">
                            {isGenerating ? <Loader2 className="animate-spin"/> : <><Receipt size={20}/> CONFIRMAR E GERAR BOLETO</>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: NOVA DESPESA */}
      {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-xl font-black text-slate-800">Lançar Nova Despesa</h3>
                      <button onClick={() => setShowExpenseModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleAddExpense} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
                          <input required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" placeholder="Ex: Compra de Resina" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                            <input type="number" required value={expenseForm.amount || ''} onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data</label>
                            <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
                          </div>
                      </div>
                      <button type="submit" className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl hover:bg-red-700 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                        <DollarSign size={20}/> REGISTRAR SAÍDA
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: EXTRATO DETALHADO (SINC COM DENTISTS.TSX) */}
      {showStatement && statementClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-in zoom-in duration-300 overflow-hidden ring-1 ring-slate-200">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
                      <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 animate-in slide-in-from-left duration-500">
                              <History size={32} />
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{statementClient.name}</h3>
                              <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">Consultório Individual</span>
                                  <span className="text-xs text-slate-400 font-bold">• Histórico Financeiro Completo</span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setShowStatement(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all active:scale-95 group">
                          <X size={24} className="text-slate-400 group-hover:text-slate-600" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 relative">
                      {isLoadingStatement && (
                          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                              <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Carregando Histórico Completo...</p>
                              <p className="text-xs text-slate-400 font-bold mt-1">Isso pode levar alguns segundos dependendo do volume de dados.</p>
                          </div>
                      )}
                      {/* Period Selection & Export */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                                  <button 
                                      onClick={() => {
                                          if (selectedMonth === 0) {
                                              setSelectedMonth(11);
                                              setSelectedYear(selectedYear - 1);
                                          } else {
                                              setSelectedMonth(selectedMonth - 1);
                                          }
                                      }}
                                      className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"
                                  >
                                      <ChevronDown size={18} className="rotate-90" />
                                  </button>
                                  <span className="px-6 font-black text-slate-700 text-sm min-w-[150px] text-center uppercase tracking-widest">
                                      {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][selectedMonth]} {selectedYear}
                                  </span>
                                  <button 
                                      onClick={() => {
                                          if (selectedMonth === 11) {
                                              setSelectedMonth(0);
                                              setSelectedYear(selectedYear + 1);
                                          } else {
                                              setSelectedMonth(selectedMonth + 1);
                                          }
                                      }}
                                      className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"
                                  >
                                      <ChevronDown size={18} className="-rotate-90" />
                                  </button>
                              </div>
                              <button
                                  onClick={() => {
                                      setShowPaymentForm(true);
                                  }}
                                  className="px-6 py-3.5 bg-green-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-green-700 hover:shadow-xl hover:shadow-green-100 transition-all flex items-center gap-2"
                              >
                                  <Plus size={16} /> Registrar Pagamento
                              </button>
                          </div>
                          <button 
                              onClick={generateStatementPDF}
                              className="px-8 py-3.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
                          >
                              <Download size={18} /> Exportar Extrato PDF
                          </button>
                      </div>

                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                          <table className="w-full text-left">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                  <tr>
                                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  <tr className="bg-slate-50/70 font-black border-b border-slate-200">
                                      <td className="px-8 py-5 text-xs text-slate-400 font-bold tracking-widest">PERÍODO ANT.</td>
                                      <td className="px-8 py-5 text-xs text-slate-500 uppercase tracking-widest">Saldo Devedor / Credor Acumulado</td>
                                      <td className="px-8 py-5 text-right text-xs">-</td>
                                      <td className={`px-8 py-5 text-right text-xs font-black ${chronoHistory.previousBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                          R$ {chronoHistory.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                  </tr>
                                  {chronoHistory.history.length === 0 ? (
                                      <tr>
                                          <td colSpan={4} className="px-8 py-16 text-center text-slate-400 font-bold italic bg-slate-50/10">
                                              Nenhum registro financeiro encontrado neste período.
                                          </td>
                                      </tr>
                                  ) : (
                                      chronoHistory.history.slice().reverse().map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                              <td className="px-8 py-5 text-xs font-black text-slate-400">
                                                  {new Date(item.date).toLocaleDateString('pt-BR')}
                                              </td>
                                              <td className="px-8 py-5">
                                                  <div className="flex flex-col gap-1.5">
                                                      <div className="flex items-center gap-3">
                                                          <div className={`p-2 rounded-xl ${item.type === 'DEBIT' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                              {item.type === 'DEBIT' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                                                          </div>
                                                          <span className="text-xs font-black text-slate-800 tracking-tight uppercase">{item.description}</span>
                                                      </div>
                                                      {item.type === 'DEBIT' && item.job && (
                                                          <div className="ml-12 pl-3 border-l-2 border-slate-100 space-y-1">
                                                              {item.job.items.map((it:any, iIdx:number) => (
                                                                  <div key={iIdx} className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                                      <span>{it.quantity} x {it.name}</span>
                                                                      <span className="text-blue-500/50">R$ {it.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      )}
                                                  </div>
                                              </td>
                                              <td className={`px-8 py-5 text-xs font-black text-right ${item.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                                                  {item.type === 'DEBIT' ? '-' : '+'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                              </td>
                                              <td className={`px-8 py-5 text-xs font-black text-right ${item.balanceAfter < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                  R$ {item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: REGISTRAR PAGAMENTO (SINC COM DENTISTS.TSX) */}
      {showPaymentForm && statementClient && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in duration-200 border border-slate-200">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-5">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registrar Recebimento</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{statementClient.name}</p>
                      </div>
                      <button onClick={() => setShowPaymentForm(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Valor Base (R$)</label>
                          <input 
                              type="number" 
                              required 
                              value={paymentAmount || ''} 
                              onChange={e => setPaymentAmount(parseFloat(e.target.value))} 
                              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-black text-slate-700" 
                              placeholder="0.00" 
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Juros (R$)</label>
                          <input 
                              type="number" 
                              value={paymentInterest || ''} 
                              onChange={e => setPaymentInterest(parseFloat(e.target.value))} 
                              className="w-full px-5 py-3 bg-red-50/30 border border-red-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-black text-red-600" 
                              placeholder="0.00" 
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Taxas (R$)</label>
                          <input 
                              type="number" 
                              value={paymentFees || ''} 
                              onChange={e => setPaymentFees(parseFloat(e.target.value))} 
                              className="w-full px-5 py-3 bg-red-50/30 border border-red-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-black text-red-600" 
                              placeholder="0.00" 
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Desconto (R$)</label>
                          <input 
                              type="number" 
                              value={paymentDiscount || ''} 
                              onChange={e => setPaymentDiscount(parseFloat(e.target.value))} 
                              className="w-full px-5 py-3 bg-green-50/30 border border-green-100 rounded-2xl outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-black text-green-600" 
                              placeholder="0.00" 
                          />
                      </div>
                      <div className="col-span-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Método</label>
                           <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-slate-700">
                               <option value="PIX">PIX</option>
                               <option value="CASH">Dinheiro</option>
                               <option value="BANK_TRANSFER">Transferência</option>
                               <option value="BOLETO">Boleto Pago</option>
                               <option value="CREDIT_CARD">Cartão de Crédito</option>
                               <option value="DEBIT_CARD">Cartão de Débito</option>
                           </select>
                      </div>
                  </div>

                  <div className="bg-slate-900 rounded-3xl p-6 mb-8 shadow-xl shadow-slate-200 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><DollarSign size={80} className="text-white" /></div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Líquido a Receber</p>
                          <h4 className="text-3xl font-black text-white">
                              R$ {Math.max(0, (paymentAmount || 0) + (paymentInterest || 0) + (paymentFees || 0) - (paymentDiscount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h4>
                      </div>
                      <Check size={32} className="text-green-500" />
                  </div>

                  <div className="flex gap-4">
                      <button onClick={() => setShowPaymentForm(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs">Cancelar</button>
                      <button 
                          disabled={isSaving || paymentAmount <= 0}
                          onClick={handleSavePayment}
                          className="flex-[2] py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 className="animate-spin" size={18}/> : <><DollarSign size={18}/> Salvar Recebimento</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};