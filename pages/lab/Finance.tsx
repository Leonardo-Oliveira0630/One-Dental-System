
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { JobStatus, UserRole, Expense, Job, TransactionCategory, BillingBatch } from '../../types';
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
  ChevronDown, History
} from 'lucide-react';

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

  // Expense Form State
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseVal, setExpenseVal] = useState('');
  const [expenseCat, setExpenseCat] = useState<TransactionCategory>('SUPPLIES');

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
    const pendingRevenue = jobs.filter(j => j.paymentStatus === 'PENDING').reduce((acc, curr) => acc + curr.totalValue, 0);
    const totalExpenses = expenses.filter(e => e.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
    
    // Perda por repetições (Jobs que contém itens com nature REPETITION)
    const lossFromRemakes = jobs.reduce((acc, job) => {
        const remakeItems = job.items.filter(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT');
        return acc + remakeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, 0);

    return { 
        paidRevenue, 
        pendingRevenue, 
        totalExpenses, 
        profit: paidRevenue - totalExpenses,
        lossFromRemakes
    };
  }, [jobs, expenses]);

  // --- CHARTS DATA ---
  const cashFlowData = [
    { name: 'Jan', entrada: 12000, saida: 8000 },
    { name: 'Fev', entrada: 15000, saida: 9500 },
    { name: 'Mar', entrada: 14000, saida: 11000 },
    { name: 'Abr', entrada: 18000, saida: 10500 },
    { name: 'Mai', entrada: stats.paidRevenue, saida: stats.totalExpenses },
  ];

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => {
        cats[e.category] = (cats[e.category] || 0) + e.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

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
        } else if (job.paymentStatus === 'PENDING') {
            entry.totalPending += job.totalValue;
            entry.pendingJobs.push(job);
        }
        entry.history.push(job);
    });

    return Array.from(map.values()).filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.totalPending - a.totalPending);
  }, [jobs, allUsers, manualDentists, searchTerm]);

  // --- HANDLERS ---
  const handleAddExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentOrg || !expenseVal) return;
      const newExp: Expense = {
          id: `exp_${Date.now()}`,
          organizationId: currentOrg.id,
          description: expenseDesc,
          amount: parseFloat(expenseVal),
          category: expenseCat,
          date: new Date(),
          status: 'PAID',
          createdAt: new Date()
      };
      await api.apiAddExpense(currentOrg.id, newExp);
      setShowAddExpense(false);
      setExpenseDesc(''); setExpenseVal('');
  };

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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER E TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="text-blue-600" /> Controle Financeiro 360°
          </h1>
          <p className="text-slate-500 font-medium">Fluxo de caixa, despesas e faturamento de clientes.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowAddExpense(true)} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg">
                <Plus size={18} /> Lançar Despesa
            </button>
        </div>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'DASHBOARD' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Métricas & Dashboard</button>
          <button onClick={() => setActiveTab('RECEIVABLES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'RECEIVABLES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Extrato de Clientes</button>
          <button onClick={() => setActiveTab('EXPENSES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'EXPENSES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Gestão de Despesas</button>
          <button onClick={() => setActiveTab('BATCHES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'BATCHES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Faturas Geradas</button>
      </div>

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'DASHBOARD' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Receita Líquida (Paga)</p>
                      <h3 className="text-2xl font-black text-green-600">R$ {stats.paidRevenue.toFixed(2)}</h3>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-500"><TrendingUp size={12}/> +12% vs mês anterior</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Despesas</p>
                      <h3 className="text-2xl font-black text-red-600">R$ {stats.totalExpenses.toFixed(2)}</h3>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">Contas fixas e insumos</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Prejuízo (Repetições)</p>
                      <h3 className="text-2xl font-black text-orange-600">R$ {stats.lossFromRemakes.toFixed(2)}</h3>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-orange-500"><AlertCircle size={12}/> Perda técnica estimada</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Saldo em Aberto</p>
                      <h3 className="text-2xl font-black text-blue-600">R$ {stats.pendingRevenue.toFixed(2)}</h3>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-400">A receber de dentistas</div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">Fluxo de Caixa Mensal</h3>
                      <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={cashFlowData}>
                                  <defs>
                                      <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                  <Tooltip />
                                  <Area type="monotone" dataKey="entrada" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEnt)" />
                                  <Area type="monotone" dataKey="saida" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-6">Gastos por Categoria</h3>
                      <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                      {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                  </Pie>
                                  <Tooltip />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-4">
                          {categoryData.map((c, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                      <span className="text-slate-500 uppercase">{c.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-700">R$ {c.value.toFixed(2)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- RECEIVABLES (EXTRATO DENTISTAS) --- */}
      {activeTab === 'RECEIVABLES' && (
          <div className="space-y-6 animate-in slide-in-from-right-2">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Situação Financeira por Cliente</h2>
                        <p className="text-sm text-slate-500">Acompanhe inadimplência e histórico de pagamentos.</p>
                      </div>
                      <div className="relative w-full md:w-80">
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                          <input 
                            placeholder="Buscar dentista..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dentistSummary.map(d => (
                          <div 
                            key={d.id} 
                            onClick={() => setSelectedDentist(d)}
                            className="p-5 border border-slate-100 rounded-2xl hover:border-blue-500 cursor-pointer transition-all bg-slate-50 group flex flex-col justify-between"
                          >
                              <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm">
                                      {d.name.charAt(0)}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                      <p className="font-bold text-slate-800 truncate">{d.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{d.clinicName || 'Consultório'}</p>
                                  </div>
                                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500" />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 border-t border-slate-200/50 pt-4">
                                  <div>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">A Receber</p>
                                      <p className={`text-lg font-black ${d.totalPending > 0 ? 'text-red-600' : 'text-slate-300'}`}>R$ {d.totalPending.toFixed(2)}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">Já Pago</p>
                                      <p className="text-lg font-black text-green-600">R$ {d.totalPaid.toFixed(2)}</p>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- EXPENSES TAB --- */}
      {activeTab === 'EXPENSES' && (
          <div className="space-y-4 animate-in slide-in-from-left-2">
               <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                <th className="p-4">Data</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {expenses.sort((a,b) => b.date.getTime() - a.date.getTime()).map(exp => (
                                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm text-slate-500">{exp.date.toLocaleDateString()}</td>
                                    <td className="p-4 font-bold text-slate-800">{exp.description}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{exp.category}</span>
                                    </td>
                                    <td className="p-4 text-right font-black text-red-600">R$ {exp.amount.toFixed(2)}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => api.apiDeleteExpense(currentOrg!.id, exp.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhuma despesa lançada este mês.</td></tr>
                            )}
                        </tbody>
                    </table>
               </div>
          </div>
      )}

      {/* --- BATCHES TAB --- */}
      {activeTab === 'BATCHES' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Extrato de Faturas e Boletos</h2>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b">
                              <th className="pb-4">Emissão</th>
                              <th className="pb-4">Cliente</th>
                              <th className="pb-4">Vencimento</th>
                              <th className="pb-4">Valor</th>
                              <th className="pb-4">Status</th>
                              <th className="pb-4 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {billingBatches.map(batch => (
                              <tr key={batch.id}>
                                  <td className="py-4 text-sm">{new Date(batch.createdAt).toLocaleDateString()}</td>
                                  <td className="py-4 font-bold">{batch.dentistName}</td>
                                  <td className="py-4 text-sm">{new Date(batch.dueDate).toLocaleDateString()}</td>
                                  <td className="py-4 font-black">R$ {batch.totalAmount.toFixed(2)}</td>
                                  <td className="py-4">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${batch.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{batch.status}</span>
                                  </td>
                                  <td className="py-4 text-right flex justify-end gap-2">
                                      {batch.invoiceUrl && <a href={batch.invoiceUrl} target="_blank" className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CreditCard size={18}/></a>}
                                      {batch.nfeUrl && <a href={batch.nfeUrl} target="_blank" className="p-2 bg-green-50 text-green-600 rounded-lg"><FileCheck size={18}/></a>}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* MODAL: LANÇAR DESPESA */}
      {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><ArrowDownRight className="text-red-500" /> Registrar Saída</h3>
                  <form onSubmit={handleAddExpense} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
                          <input required value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="Ex: Dental Speed - Cerâmica A2" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                              <input required type="number" step="0.01" value={expenseVal} onChange={e => setExpenseVal(e.target.value)} placeholder="0,00" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
                              <select value={expenseCat} onChange={e => setExpenseCat(e.target.value as any)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none appearance-none">
                                  <option value="SUPPLIES">Insumos/Materiais</option>
                                  <option value="RENT">Aluguel/Fixos</option>
                                  <option value="SALARY">Salários</option>
                                  <option value="TAX">Impostos</option>
                                  <option value="OFFICE">Escritório</option>
                                  <option value="OTHER">Outros</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
                          <button type="submit" className="flex-1 py-3 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700">SALVAR GASTO</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: EXPLORER DENTISTA / FATURAMENTO EM LOTE */}
      {selectedDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">Extrato: {selectedDentist.name}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase">{selectedDentist.clinicName || 'Consultório Particular'}</p>
                      </div>
                      <button onClick={() => setSelectedDentist(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Lado Esquerdo: Histórico Geral */}
                      <div className="lg:col-span-7 space-y-6">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Histórico de Trabalhos</h4>
                          <div className="space-y-3">
                              {selectedDentist.history.sort((a:any, b:any) => b.createdAt.getTime() - a.createdAt.getTime()).map((job: Job) => (
                                  <div key={job.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-lg ${job.paymentStatus === 'PAID' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                              {job.paymentStatus === 'PAID' ? <CheckCircle size={18}/> : <Clock size={18}/>}
                                          </div>
                                          <div>
                                              <p className="font-bold text-slate-800">OS #{job.osNumber} - {job.patientName}</p>
                                              <p className="text-[10px] text-slate-400">{new Date(job.createdAt).toLocaleDateString()} • {job.paymentStatus === 'PAID' ? 'Liquidado' : 'Pendente'}</p>
                                          </div>
                                      </div>
                                      <span className="font-black text-slate-700">R$ {job.totalValue.toFixed(2)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Lado Direito: Seleção para Faturamento */}
                      <div className="lg:col-span-5 bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col">
                          <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><CreditCard size={14}/> Faturamento em Lote</h4>
                          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                              {selectedDentist.pendingJobs.length === 0 ? (
                                  <div className="text-center py-10 text-slate-400 italic text-sm">Nenhuma OS pendente de cobrança.</div>
                              ) : (
                                  selectedDentist.pendingJobs.map((job: Job) => {
                                      const isSelected = selectedJobIds.includes(job.id);
                                      return (
                                          <div 
                                            key={job.id} 
                                            onClick={() => setSelectedJobIds(prev => isSelected ? prev.filter(id => id !== job.id) : [...prev, job.id])}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-blue-600 bg-white shadow-md' : 'border-blue-100 bg-white/50 hover:bg-white'}`}
                                          >
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-blue-200'}`}>
                                                      {isSelected && <Check size={12} className="text-white" />}
                                                  </div>
                                                  <p className="text-xs font-bold text-slate-700">OS {job.osNumber}</p>
                                              </div>
                                              <p className="text-xs font-black text-blue-800">R$ {job.totalValue.toFixed(2)}</p>
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                          
                          <div className="mt-6 pt-6 border-t border-blue-200">
                              <div className="flex justify-between items-center mb-4">
                                  <span className="text-xs font-bold text-blue-600">TOTAL SELECIONADO:</span>
                                  <span className="text-2xl font-black text-blue-900">R$ {selectedJobIds.reduce((acc, id) => {
                                      const j = selectedDentist.pendingJobs.find((p:any) => p.id === id);
                                      return acc + (j?.totalValue || 0);
                                  }, 0).toFixed(2)}</span>
                              </div>
                              <button 
                                onClick={handleCreateBoleto}
                                disabled={selectedJobIds.length === 0 || isGenerating}
                                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                              >
                                {isGenerating ? <Loader2 className="animate-spin"/> : <><Receipt size={20}/> GERAR BOLETO UNIFICADO</>}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
