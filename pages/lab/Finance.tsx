
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { JobStatus, UserRole, Expense, Job, TransactionCategory, ManualDentist } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
// Fixed: Added Clock to the lucide-react imports
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Search, Calendar, Filter, Plus, Printer, FileText, Download, 
  AlertCircle, Wallet, ShoppingCart, Briefcase, ChevronRight, CheckCircle, 
  CreditCard, Loader2, User, Building, Package, Tag, Trash2, Clock
} from 'lucide-react';

export const Finance = () => {
  const { jobs, allUsers, manualDentists, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RECEIVABLES' | 'EXPENSES' | 'REPORTS'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- MOCK FINANCE DATA (To supplement Job data for expenses) ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalRevenue = jobs.filter(j => j.paymentStatus === 'PAID').reduce((acc, curr) => acc + curr.totalValue, 0);
    const pendingRevenue = jobs.filter(j => j.paymentStatus === 'PENDING').reduce((acc, curr) => acc + curr.totalValue, 0);
    const totalExpenses = expenses.filter(e => e.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
    const profit = totalRevenue - totalExpenses;
    
    return { totalRevenue, pendingRevenue, totalExpenses, profit };
  }, [jobs, expenses]);

  // --- CHART DATA ---
  const chartData = [
    { name: 'Jan', receita: 4500, despesa: 2100 },
    { name: 'Fev', receita: 5200, despesa: 2400 },
    { name: 'Mar', receita: 4800, despesa: 3200 },
    { name: 'Abr', receita: 6100, despesa: 2900 },
    { name: 'Mai', receita: stats.totalRevenue, despesa: stats.totalExpenses },
  ];

  const categoryData = [
    { name: 'Produção', value: 400 },
    { name: 'Insumos', value: 300 },
    { name: 'Salários', value: 300 },
    { name: 'Aluguel', value: 200 },
  ];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // --- DENTIST BILLING LOGIC ---
  const dentistBilling = useMemo(() => {
    const map = new Map<string, { id: string, name: string, clinic: string, totalPaid: number, totalPending: number, jobs: Job[] }>();
    
    // Process manually registered and system dentists
    const allKnownDentists = [...allUsers.filter(u => u.role === UserRole.CLIENT), ...manualDentists];
    
    allKnownDentists.forEach(d => {
        map.set(d.id, { id: d.id, name: d.name, clinic: d.clinicName || 'Consultório', totalPaid: 0, totalPending: 0, jobs: [] });
    });

    jobs.forEach(job => {
        let entry = map.get(job.dentistId);
        if (!entry) {
            entry = { id: job.dentistId, name: job.dentistName, clinic: 'Visitante', totalPaid: 0, totalPending: 0, jobs: [] };
            map.set(job.dentistId, entry);
        }
        if (job.paymentStatus === 'PAID') entry.totalPaid += job.totalValue;
        else if (job.paymentStatus === 'PENDING') entry.totalPending += job.totalValue;
        entry.jobs.push(job);
    });

    return Array.from(map.values()).filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.clinic.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.totalPending - a.totalPending);
  }, [jobs, allUsers, manualDentists, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="text-blue-600" /> Gestão Financeira
          </h1>
          <p className="text-slate-500 font-medium">Controle total de fluxo de caixa, inadimplência e lucros.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all">
             <Printer size={18} /> Balanço PDF
           </button>
           <button 
            onClick={() => setActiveTab('EXPENSES')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
           >
             <Plus size={18} /> Novo Gasto
           </button>
        </div>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('RECEIVABLES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'RECEIVABLES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Contas a Receber</button>
          <button onClick={() => setActiveTab('EXPENSES')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'EXPENSES' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Contas a Pagar</button>
          <button onClick={() => setActiveTab('REPORTS')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'REPORTS' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>DRE / Relatórios</button>
      </div>

      {/* --- CONTENT: DASHBOARD --- */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={24}/></div>
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded">+14%</span>
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase">Receita Paga (Mês)</p>
                  <h3 className="text-2xl font-black text-slate-800">R$ {stats.totalRevenue.toFixed(2)}</h3>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><TrendingDown size={24}/></div>
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded">Fixo</span>
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase">Despesas Totais</p>
                  <h3 className="text-2xl font-black text-slate-800">R$ {stats.totalExpenses.toFixed(2)}</h3>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Clock size={24}/></div>
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase">Pendentes (Devedores)</p>
                  <h3 className="text-2xl font-black text-orange-600">R$ {stats.pendingRevenue.toFixed(2)}</h3>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><DollarSign size={24}/></div>
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase">Lucro Líquido</p>
                  <h3 className="text-2xl font-black text-blue-700">R$ {stats.profit.toFixed(2)}</h3>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">Fluxo de Caixa (5 Meses)</h3>
                  <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                              <defs>
                                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                              <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                              <Area type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
                              <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={3} fillOpacity={0} />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Custos por Categoria</h3>
                  <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                      {categoryData.map((c, i) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i]}}></div><span className="text-slate-500">{c.name}</span></div>
                              <span className="font-bold text-slate-700">R$ {c.value}</span>
                          </div>
                      ))}
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* --- CONTENT: RECEIVABLES (CONTAS A RECEBER / DENTISTAS) --- */}
      {activeTab === 'RECEIVABLES' && (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Painel de Faturamento por Cliente</h2>
                        <p className="text-sm text-slate-500">Histórico financeiro, boletos e inadimplência.</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar dentista ou clínica..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="pb-4 px-2">Cliente / Dentista</th>
                                <th className="pb-4 px-2">Total OS</th>
                                <th className="pb-4 px-2">Recebido</th>
                                <th className="pb-4 px-2">Em Aberto</th>
                                <th className="pb-4 px-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {dentistBilling.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="py-4 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">
                                                {d.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{d.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{d.clinic}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 font-bold text-slate-600">{d.jobs.length}</td>
                                    <td className="py-4 px-2 font-black text-green-600">R$ {d.totalPaid.toFixed(2)}</td>
                                    <td className="py-4 px-2">
                                        <span className={`font-black ${d.totalPending > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                            R$ {d.totalPending.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            {d.totalPending > 0 && (
                                                <button 
                                                    title="Gerar Boleto Unificado"
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <CreditCard size={18} />
                                                </button>
                                            )}
                                            <button 
                                                title="Ver Detalhes Financeiros"
                                                className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
                                            >
                                                <FileText size={18} />
                                            </button>
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

      {/* --- CONTENT: EXPENSES (CONTAS A PAGAR / INSUMOS) --- */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Lançamento */}
              <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <TrendingDown size={20} className="text-red-500" /> Novo Lançamento
                      </h3>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição / Fornecedor</label>
                          <input placeholder="Ex: Dental Speed - Cerâmica" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                          <input type="number" placeholder="0.00" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
                          <select className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 appearance-none">
                              <option value="SUPPLIES">Insumos e Materiais</option>
                              <option value="RENT">Aluguel / Fixos</option>
                              <option value="SALARY">Mão de Obra / Salários</option>
                              <option value="MARKETING">Propaganda</option>
                              <option value="OTHER">Diversos</option>
                          </select>
                      </div>
                      <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-slate-200">
                          REGISTRAR DESPESA
                      </button>
                  </div>
              </div>

              {/* Lista de Gastos */}
              <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
                      <h3 className="font-black text-slate-800 mb-6">Extrato de Saídas</h3>
                      <div className="space-y-3">
                          <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                              <div className="flex items-center gap-4">
                                  <div className="p-3 bg-red-100 text-red-600 rounded-xl"><Package size={20}/></div>
                                  <div>
                                      <p className="font-bold text-slate-800"> Dental Prime - Insumos Zircônia</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Categoria: Insumos</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="font-black text-red-600">R$ 1.250,00</p>
                                  <p className="text-[10px] text-slate-400 font-bold">12/05/2024</p>
                              </div>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                              <div className="flex items-center gap-4">
                                  <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Briefcase size={20}/></div>
                                  <div>
                                      <p className="font-bold text-slate-800"> Conta de Luz (Energia)</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">Categoria: Fixos</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="font-black text-red-600">R$ 480,00</p>
                                  <p className="text-[10px] text-slate-400 font-bold">10/05/2024</p>
                              </div>
                          </div>
                      </div>
                      <div className="mt-8 text-center">
                          <p className="text-slate-400 text-sm">Não há mais lançamentos para este período.</p>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* --- CONTENT: REPORTS (DRE / COMPARATIVOS) --- */}
      {activeTab === 'REPORTS' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in duration-300">
           <div className="flex justify-between items-start mb-8">
              <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Balanço DRE</h2>
                  <p className="text-slate-500">Demonstrativo do Resultado do Exercício</p>
              </div>
              <button className="flex items-center gap-2 text-blue-600 font-bold hover:underline">
                  <Download size={18} /> Baixar CSV para Contador
              </button>
           </div>

           <div className="space-y-4">
              <div className="flex justify-between p-4 bg-blue-50 rounded-2xl border-l-8 border-blue-600">
                  <span className="font-bold text-blue-900">(+) Receita Bruta (Jobs + Loja)</span>
                  <span className="font-black text-blue-900">R$ {stats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-4 bg-red-50 rounded-2xl border-l-8 border-red-600">
                  <span className="font-bold text-red-900">(-) Deduções e Impostos</span>
                  <span className="font-black text-red-900">R$ {(stats.totalRevenue * 0.06).toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border-l-8 border-slate-400">
                  <span className="font-bold text-slate-800">(-) Custos de Mercadorias / Insumos</span>
                  <span className="font-black text-slate-800">R$ {stats.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border-l-8 border-slate-400">
                  <span className="font-bold text-slate-800">(-) Comissões Pagas</span>
                  <span className="font-black text-slate-800">R$ 840,00</span>
              </div>
              <div className="pt-6 mt-6 border-t-4 border-double border-slate-200">
                  <div className="flex justify-between p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
                      <span className="text-xl font-black uppercase">Resultado Líquido (Lucro)</span>
                      <span className="text-3xl font-black text-green-400">R$ {(stats.profit - 840).toFixed(2)}</span>
                  </div>
              </div>
           </div>

           <div className="mt-12 bg-orange-50 p-6 rounded-3xl border border-orange-100">
              <div className="flex items-center gap-4">
                  <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl"><AlertCircle size={32}/></div>
                  <div>
                    <h3 className="font-bold text-orange-900">Análise de Perdas / Repetições</h3>
                    <p className="text-orange-700 text-sm">Este mês você teve 4 casos de repetição técnica. Estimativa de prejuízo em insumos: <strong>R$ 380,00</strong>.</p>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
