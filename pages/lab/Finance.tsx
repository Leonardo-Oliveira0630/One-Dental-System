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
  CreditCard, Loader2, User, Package, Clock, X, Filter, 
  FileCheck, Receipt, Check, Trash2, ShoppingCart, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronLeft, History, ExternalLink, Copy, Tag, AlertTriangle, ShieldCheck, Zap, ArrowUpCircle,
  ArrowDownCircle, FileSpreadsheet, Building, UserCheck, Save, Banknote, ChevronRight
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Finance = () => {
  const { 
    jobs, allUsers, manualDentists, currentOrg, dentistPayments, billingBatches, 
    addDentistPayment, updateBillingBatchStatus, generateBatchBoleto,
    cardMachines, bankAccounts, addCardMachine, updateCardMachine, deleteCardMachine,
    addBankAccount, updateBankAccount, deleteBankAccount
  } = useApp();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RECEIVABLES' | 'EXPENSES' | 'BATCHES' | 'SETTINGS'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // const [billingBatches, setBillingBatches] = useState<BillingBatch[]>([]); // Using from context now for sync

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Advanced Financial View State
  const [showStatement, setShowStatement] = useState(false);
  const [statementClient, setStatementClient] = useState<any | null>(null);
  const [dentistJobs, setDentistJobs] = useState<Job[]>([]);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'EXTRATO' | 'RECEBIMENTOS' | 'FATURAS'>('EXTRATO');
  const [showAsaasError, setShowAsaasError] = useState(false);
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
  const [paymentCardMachineId, setPaymentCardMachineId] = useState<string>('');
  const [paymentBankAccountId, setPaymentBankAccountId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<DentistPayment['type']>('PAYMENT');
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

  const generateStatementPDF = async () => {
    if (!statementClient || !currentOrg) return;

    const doc = new jsPDF();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const periodStr = `${monthNames[selectedMonth]} / ${selectedYear}`;
    
    const startDateStr = `01/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear}`;
    const endDateStr = `${new Date(selectedYear, selectedMonth + 1, 0).getDate()}/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear}`;

    // Header Background / Setup (Optional light background for header box)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 35, 'F'); 

    // Logo
    if (currentOrg?.logoUrl) {
        try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = currentOrg.logoUrl;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; 
            });
            
            if (img.width > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/png');
                    const imgRatio = img.height / img.width;
                    let finalWidth = 40;
                    let finalHeight = 40 * imgRatio;
                    if (finalHeight > 25) {
                        finalHeight = 25;
                        finalWidth = 25 / imgRatio;
                    }
                    doc.addImage(dataURL, 'PNG', 14, 5, finalWidth, finalHeight);
                }
            }
        } catch (e) {
            console.error("Erro renderizando logo", e);
        }
    }

    // Extrato Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Extrato", 195, 20, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${startDateStr} - ${endDateStr}`, 195, 26, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 35, 195, 35);

    // Client Info
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(statementClient.name.toUpperCase(), 30, 45);

    doc.setFont("helvetica", "bold");
    doc.text("Documento:", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(statementClient.cpfCnpj || '-', 36, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text("Período:", 14, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${startDateStr} - ${endDateStr}`, 30, 59);

    // Address Right Side
    doc.setFont("helvetica", "bold");
    doc.text("Endereço:", 120, 45);
    doc.setFont("helvetica", "normal");
    const address = statementClient.clinicName || 'Consultório';
    const splitAddr = doc.splitTextToSize(address, 60);
    doc.text(splitAddr, 140, 45);

    doc.line(14, 65, 195, 65);

    // Table
    const tableBody: any[] = [];
    tableBody.push([
        { content: '', styles: { lineWidth: { bottom: 0.1 } as any, lineColor: [220,220,220] } },
        { content: 'Saldo anterior', styles: { fontStyle: 'normal', lineWidth: { bottom: 0.1 } as any, lineColor: [220,220,220] } },
        { content: '', styles: { lineWidth: { bottom: 0.1 } as any, lineColor: [220,220,220] } },
        { content: `R$ ${chronoHistory.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { halign: 'left', fontStyle: 'normal', lineWidth: { bottom: 0.1 } as any, lineColor: [220,220,220] } }
    ]);

    chronoHistory.history.forEach((item) => {
        const isDebit = item.type === 'DEBIT';
        const amountStr = isDebit ? `R$ -${item.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : `R$ ${item.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        const textColor = isDebit ? [239, 68, 68] : [34, 197, 94]; 
        
        const hasSubItems = isDebit && item.job && item.job.items && item.job.items.length > 0;
        
        let description = '';
        if (isDebit) {
            const dentistName = (statementClient.name && statementClient.name.split(' ')[0]) || 'Dr.';
            description = `${item.job?.osNumber || '-'} - Dr(a): ${dentistName.toUpperCase()} - Paciente: ${(item.job?.patientName || '').toUpperCase()}`;
        } else {
            description = item.description;
        }

        tableBody.push([
            { content: new Date(item.date).toLocaleDateString('pt-BR'), styles: { lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
            { content: description, styles: { lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
            { content: amountStr, styles: { textColor: textColor, lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } },
            { content: `R$ ${item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { halign: 'left', lineWidth: { bottom: hasSubItems ? 0 : 0.1 } as any, lineColor: [220,220,220] } }
        ]);
        
        if (hasSubItems) {
            item.job.items.forEach((subItem: any, subIndex: number) => {
                const isLast = subIndex === item.job.items.length - 1;
                tableBody.push([
                    { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                    { content: `${subItem.quantity}      ${subItem.name.toUpperCase()}`, styles: { textColor: [100,100,100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                    { content: `R$ ${(subItem.price * subItem.quantity).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, styles: { textColor: [100,100,100], fontSize: 8, lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } },
                    { content: '', styles: { lineWidth: { bottom: isLast ? 0.1 : 0 } as any, lineColor: [220,220,220] } }
                ]);
            });
        }
    });

    autoTable(doc, {
        startY: 70,
        head: [['Data', 'Descrição', 'Valor', 'Saldo']],
        body: tableBody,
        theme: 'plain',
        headStyles: { fontStyle: 'bold', fontSize: 9, fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: { bottom: 0.1 } as any, lineColor: [220,220,220] },
        styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 } },
        columnStyles: { 0: { cellWidth: 25 }, 2: { halign: 'left', cellWidth: 35 }, 3: { halign: 'left', cellWidth: 35 } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const totalServices = chronoHistory.history.filter(i => i.type === 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
    const totalPayments = chronoHistory.history.filter(i => i.type !== 'DEBIT').reduce((acc, curr) => acc + curr.amount, 0);
    const currentBalance = chronoHistory.history.length > 0 ? chronoHistory.history[chronoHistory.history.length - 1].balanceAfter : chronoHistory.previousBalance;

    // Draw Summary Box aligned to right side
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    const summaryX = 80;
    const valX = 195;
    let cY = finalY;

    doc.text("Saldo anterior", summaryX, cY);
    doc.setTextColor(239, 68, 68);
    doc.text(`R$ ${chronoHistory.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });
    
    cY += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(summaryX, cY - 4, valX, cY - 4);
    
    doc.setTextColor(0, 0, 0);
    doc.text("Total de serviços", summaryX, cY);
    doc.setTextColor(239, 68, 68);
    doc.text(`R$ -${totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });

    cY += 8;
    doc.line(summaryX, cY - 4, valX, cY - 4);

    doc.setTextColor(0, 0, 0);
    doc.text("Total de pagamentos", summaryX, cY);
    doc.setTextColor(34, 197, 94);
    doc.text(`R$ ${totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });

    cY += 12;
    doc.line(summaryX, cY - 8, valX, cY - 8);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Saldo atual no período", summaryX, cY);
    const balanceColor = currentBalance < 0 ? [239, 68, 68] : [34, 197, 94];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2] as number);
    doc.text(`R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, valX, cY, { align: 'right' });

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
            cardMachineId: (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') ? paymentCardMachineId : undefined,
            bankAccountId: paymentMethod === 'BANK_TRANSFER' ? paymentBankAccountId : undefined,
            paymentDate: new Date(),
            type: paymentType,
            notes: paymentNotes
        });
        setPaymentAmount(0);
        setPaymentInterest(0);
        setPaymentFees(0);
        setPaymentDiscount(0);
        setPaymentCardMachineId('');
        setPaymentBankAccountId('');
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
          <button onClick={() => setActiveTab('SETTINGS')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'SETTINGS' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Configurações</button>
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
                          <div key={d.id} onClick={() => { setStatementClient(d); setShowStatement(true); }} className="p-5 border border-slate-100 rounded-2xl hover:border-blue-500 cursor-pointer transition-all bg-slate-50 group flex flex-col justify-between">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm">{d.name.charAt(0)}</div>
                                  <div className="flex-1 overflow-hidden"><p className="font-bold text-slate-800 truncate">{d.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase truncate">{d.clinicName || 'Consultório'}</p></div>
                                  <div className="flex gap-1">
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
      {activeTab === 'SETTINGS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-2">
              {/* Maquinas de Cartão */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><CreditCard className="text-blue-600"/> Máquinas de Cartão</h3>
                      <button 
                        onClick={() => {
                            const name = prompt("Nome da Máquina (Ex: Moderninha, Stone):");
                            if (name) addCardMachine({ name, active: true });
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"
                      >
                          <Plus size={20}/>
                      </button>
                  </div>
                  <div className="space-y-2">
                      {cardMachines.map(m => (
                          <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                              <span className="font-bold text-slate-700">{m.name}</span>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => deleteCardMachine(m.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                      {cardMachines.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Nenhuma máquina cadastrada.</p>}
                  </div>
              </div>

              {/* Contas Bancárias */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Building className="text-blue-600"/> Contas Bancárias</h3>
                      <button 
                        onClick={() => {
                            const name = prompt("Nome da Conta (Ex: Itau, Nubank, Banco do Brasil):");
                            if (name) addBankAccount({ name, active: true });
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"
                      >
                          <Plus size={20}/>
                      </button>
                  </div>
                  <div className="space-y-2">
                      {bankAccounts.map(b => (
                          <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                              <span className="font-bold text-slate-700">{b.name}</span>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => deleteBankAccount(b.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                      {bankAccounts.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Nenhuma conta cadastrada.</p>}
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

      {/* MODAL: EXTRATO COMPLETO (SINC COM DENTISTS.TSX) */}
      {showStatement && statementClient && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-slate-50 rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in zoom-in duration-300 overflow-hidden border border-white">
                        {/* HEADER */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-white relative">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200">
                                    <History size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{statementClient.name}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">Financeiro Unificado</span>
                                        <span className="text-xs text-slate-400 font-bold">• {statementClient.clinicName || 'Consultório'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-4">
                                <button onClick={() => setShowStatement(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                                    <X size={24} className="text-slate-400" />
                                </button>
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                                    <button 
                                        onClick={() => setActiveSubTab('EXTRATO')}
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSubTab === 'EXTRATO' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Extrato
                                    </button>
                                    <button 
                                        onClick={() => setActiveSubTab('RECEBIMENTOS')}
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSubTab === 'RECEBIMENTOS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Recebimentos
                                    </button>
                                    <button 
                                        onClick={() => setActiveSubTab('FATURAS')}
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSubTab === 'FATURAS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Faturas/Boletos
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 relative">
                            {isLoadingStatement && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                                    <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Sincronizando Dados...</p>
                                </div>
                            )}

                            {activeSubTab === 'EXTRATO' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                                <button 
                                                    onClick={() => selectedMonth === 0 ? (setSelectedMonth(11), setSelectedYear(selectedYear - 1)) : setSelectedMonth(selectedMonth - 1)}
                                                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"
                                                >
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <span className="px-6 font-black text-slate-700 text-sm min-w-[140px] text-center uppercase tracking-widest">
                                                    {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth]} {selectedYear}
                                                </span>
                                                <button 
                                                    onClick={() => selectedMonth === 11 ? (setSelectedMonth(0), setSelectedYear(selectedYear + 1)) : setSelectedMonth(selectedMonth + 1)}
                                                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={generateStatementPDF}
                                            className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
                                        >
                                            <Download size={16} /> Exportar PDF
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamento</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                <tr className="bg-slate-50/50 font-bold border-b border-slate-200">
                                                    <td className="px-6 py-4 text-xs text-slate-400">01/{(selectedMonth+1).toString().padStart(2,'0')}/{selectedYear}</td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 uppercase tracking-widest">Saldo Anterior Carregado</td>
                                                    <td className="px-6 py-4 text-right text-xs">-</td>
                                                    <td className={`px-6 py-4 text-right text-xs font-black ${chronoHistory.previousBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        R$ {chronoHistory.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                                {chronoHistory.history.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold italic bg-slate-50/10">
                                                            Nenhum registro encontrado neste período.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    chronoHistory.history.slice().reverse().map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                                {new Date(item.date).toLocaleDateString('pt-BR')}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`p-2 rounded-lg ${item.type === 'DEBIT' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                                            {item.type === 'DEBIT' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                                                                        </div>
                                                                        <span className="text-xs font-black text-slate-800">{item.description}</span>
                                                                    </div>
                                                                    {item.type === 'DEBIT' && item.job && (
                                                                        <div className="ml-10 space-y-1">
                                                                            {item.job.items.map((it:any, iIdx:number) => (
                                                                                <div key={iIdx} className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase">
                                                                                    <span>{it.quantity} x {it.name}</span>
                                                                                    <span className="text-slate-300">R$ {it.price.toFixed(2)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className={`px-6 py-4 text-xs font-black text-right ${item.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                                                                {item.type === 'DEBIT' ? '-' : '+'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className={`px-6 py-4 text-xs font-black text-right ${item.balanceAfter < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                                R$ {item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeSubTab === 'RECEBIMENTOS' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Histórico de Recebimentos</h4>
                                        <button 
                                            onClick={() => setShowPaymentForm(!showPaymentForm)}
                                            className="px-4 py-2 bg-green-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center gap-2"
                                        >
                                            {showPaymentForm ? <Trash2 size={14} /> : <Plus size={14} />}
                                            Novo Recebimento Manual
                                        </button>
                                    </div>

                                    {showPaymentForm && (
                                        <div className="bg-white p-6 rounded-2xl border-2 border-green-200 animate-in slide-in-from-top-4 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                <div className="md:col-span-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Valor Recebido (R$)</label>
                                                    <input 
                                                        type="number"
                                                        value={paymentAmount || ''}
                                                        onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-black text-slate-700"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest text-red-500">Juros/Mora (+)</label>
                                                    <input 
                                                        type="number"
                                                        value={paymentInterest || ''}
                                                        onChange={e => setPaymentInterest(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-4 py-2.5 bg-red-50/50 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-red-700"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest text-green-600">Desconto (-)</label>
                                                    <input 
                                                        type="number"
                                                        value={paymentDiscount || ''}
                                                        onChange={e => setPaymentDiscount(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-4 py-2.5 bg-green-50/50 border border-green-100 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-700"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest text-orange-600">Taxas (-)</label>
                                                    <input 
                                                        type="number"
                                                        value={paymentFees || ''}
                                                        onChange={e => setPaymentFees(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-4 py-2.5 bg-orange-50/50 border border-orange-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-orange-700"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Forma</label>
                                                    <select 
                                                        value={paymentMethod}
                                                        onChange={e => setPaymentMethod(e.target.value as any)}
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold text-slate-700 h-[46px]"
                                                    >
                                                        <option value="PIX">PIX</option>
                                                        <option value="CASH">Dinheiro</option>
                                                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                                                        <option value="DEBIT_CARD">Cartão de Débito</option>
                                                        <option value="BANK_TRANSFER">Transferência Bancária</option>
                                                        <option value="BOLETO">Boleto (Pago)</option>
                                                        <option value="DISCOUNT">Desconto/Cortesia</option>
                                                    </select>
                                                </div>

                                                {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
                                                    <div className="md:col-span-1 animate-in slide-in-from-top-2">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Máquina</label>
                                                        <select 
                                                            value={paymentCardMachineId}
                                                            onChange={e => setPaymentCardMachineId(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700 h-[46px]"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {cardMachines.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {paymentMethod === 'BANK_TRANSFER' && (
                                                    <div className="md:col-span-1 animate-in slide-in-from-top-2">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Conta</label>
                                                        <select 
                                                            value={paymentBankAccountId}
                                                            onChange={e => setPaymentBankAccountId(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700 h-[46px]"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {bankAccounts.map(b => (
                                                                <option key={b.id} value={b.id}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="md:col-span-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest italic">Total Líquido</label>
                                                    <div className="w-full px-4 py-2.5 bg-slate-200 border border-slate-300 rounded-xl font-black text-slate-800 h-[46px] flex items-center">
                                                        R$ {(paymentAmount + paymentInterest - paymentDiscount - paymentFees).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="md:col-span-full">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Observações/Ref.</label>
                                                    <input 
                                                        value={paymentNotes}
                                                        onChange={e => setPaymentNotes(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold text-slate-700"
                                                        placeholder="Ex: Ref. OS 123, Promoção especial..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end mt-4 gap-3">
                                                <button onClick={() => setShowPaymentForm(false)} className="px-4 py-2 text-xs font-black text-slate-400 uppercase hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                                                <button 
                                                    disabled={isSaving || paymentAmount <= 0}
                                                    onClick={handleSavePayment}
                                                    className="px-8 py-2 bg-green-600 text-white text-xs font-black uppercase rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />} Confirmar Recebimento (R$ {(paymentAmount + paymentInterest - paymentDiscount - paymentFees).toFixed(2)})
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Forma</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Observação</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {dentistPayments.filter(p => p.dentistId === statementClient.id).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold italic">Nenhum recebimento registrado.</td>
                                                    </tr>
                                                ) : (
                                                    dentistPayments.filter(p => p.dentistId === statementClient.id).map((p, idx) => (
                                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                                {new Date(p.paymentDate).toLocaleDateString('pt-BR')}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg">
                                                                    {p.paymentMethod}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-600 italic">
                                                                {p.notes || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-black text-right text-green-600">
                                                                R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeSubTab === 'FATURAS' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Faturas & Boletos</h4>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {billingBatches.filter(b => b.dentistId === statementClient.id).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic">Nenhuma fatura gerada para este cliente.</td>
                                                    </tr>
                                                ) : (
                                                    billingBatches.filter(b => b.dentistId === statementClient.id).map((b) => (
                                                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-4 text-[10px] font-black text-slate-400">#{b.id.slice(-6).toUpperCase()}</td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                                {new Date(b.dueDate).toLocaleDateString('pt-BR')}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg ${
                                                                    b.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                                                                    b.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                    {b.status === 'PAID' ? 'Paga' : b.status === 'OVERDUE' ? 'Atrasada' : 'Pendente'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-black text-right text-slate-800">
                                                                R$ {b.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {b.status !== 'PAID' && (
                                                                        <button 
                                                                            onClick={() => updateBillingBatchStatus(b.id, 'PAID')}
                                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                            title="Marcar como Pago"
                                                                        >
                                                                            <Check size={16} />
                                                                        </button>
                                                                    )}
                                                                    {b.boletoUrl && (
                                                                        <a href={b.boletoUrl} target="_blank" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Ver Boleto">
                                                                            <FileText size={16} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor Total</span>
                                    <span className={`text-xl font-black ${chronoHistory.history.length > 0 && chronoHistory.history[chronoHistory.history.length-1].balanceAfter < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        R$ {Math.abs(chronoHistory.history.length > 0 ? chronoHistory.history[chronoHistory.history.length-1].balanceAfter : chronoHistory.previousBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="h-10 w-px bg-slate-100 mx-2 hidden md:block" />
                                <div className="hidden md:flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Pagamento</span>
                                    <span className="text-sm font-bold text-slate-600">
                                        {chronoHistory.history.filter(i => i.type === 'PAYMENT').pop()?.date ? new Date(chronoHistory.history.filter(i => i.type === 'PAYMENT').pop()!.date).toLocaleDateString('pt-BR') : '--/--/----'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button 
                                    onClick={async () => {
                                        // Identifying jobs not in any batch yet (simplified)
                                        const pendingJobIds = chronoHistory.history
                                            .filter(item => item.type === 'DEBIT')
                                            .map(item => item.id);
                                        
                                        if (pendingJobIds.length === 0) {
                                            alert('Não há débitos pendentes para gerar fatura.');
                                            return;
                                        }

                                        try {
                                            const dueDate = new Date();
                                            dueDate.setDate(dueDate.getDate() + 5);
                                            await generateBatchBoleto(statementClient.id, pendingJobIds, dueDate);
                                            alert('Protocolo de fatura gerado com sucesso!');
                                            setActiveSubTab('FATURAS');
                                        } catch (err: any) {
                                            console.error(err);
                                            if (err.message === 'ASAAS_NOT_CONFIGURED') {
                                                setShowAsaasError(true);
                                            } else {
                                                alert('Erro ao gerar fatura.');
                                            }
                                        }
                                    }}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase text-xs"
                                >
                                    <Receipt size={18} /> Fechar Faturamento
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveSubTab('RECEBIMENTOS');
                                        setShowPaymentForm(true);
                                    }}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs"
                                >
                                    <Banknote size={18} /> Pagar Manual
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
      )}

      {showAsaasError && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                  <div className="flex flex-col items-center text-center gap-4">
                      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                          <AlertTriangle size={40} />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight text-red-600">Erro de Geração de Boleto</h3>
                      <p className="text-slate-500 font-bold">
                          Sua conta Asaas não está devidamente criada ou configurada para esta operação.
                      </p>
                      <p className="text-slate-400 text-sm">
                          Verifique as chaves de API e o ID da Carteira nas configurações do seu laboratório.
                      </p>
                      <button 
                          onClick={() => setShowAsaasError(false)}
                          className="w-full mt-6 py-4 bg-slate-800 text-white font-black uppercase rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-slate-200"
                      >
                          Entendido
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};