
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppointmentStatus, TransactionCategory, Expense } from '../../types';
import { 
    DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, Plus, 
    Search, Filter, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, 
    Receipt, Clock, CheckCircle2, X, Save, Trash2, Loader2, Info, ShoppingCart, Stethoscope
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Cell, PieChart, Pie, Legend
} from 'recharts';
import * as api from '../../services/firebaseService';
import { FeatureLocked } from '../../components/FeatureLocked';

export const ClinicFinance = () => {
    const { appointments, clinicServices, currentOrg, jobs, currentPlan } = useApp();
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CASHFLOW'>('DASHBOARD');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);

    // Form State
    const [entryType, setEntryType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [category, setCategory] = useState<TransactionCategory>('OTHER');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // --- PLAN CHECK ---
    if (currentPlan && !currentPlan.features.hasClinicModule) {
        return <FeatureLocked title="Financeiro Clínico Bloqueado" message="A gestão financeira avançada da clínica não está disponível no seu plano." />;
    }

    useEffect(() => {
        if (currentOrg) {
            const unsub = api.subscribeExpenses(currentOrg.id, setExpenses);
            return () => unsub();
        }
    }, [currentOrg]);

    // --- LÓGICA DE CÁLCULO DE RECEITA (PROCEDIMENTOS) ---
    const procedureRevenue = useMemo(() => {
        return appointments
            .filter(a => a.status === AppointmentStatus.COMPLETED)
            .map(appt => {
                const service = clinicServices.find(s => s.name === appt.procedure);
                return {
                    id: appt.id,
                    description: `Procedimento: ${appt.procedure} (${appt.patientName})`,
                    amount: service?.price || 0,
                    date: appt.date,
                    type: 'INCOME',
                    category: 'PRODUCTION' as TransactionCategory
                };
            });
    }, [appointments, clinicServices]);

    // --- LÓGICA DE CUSTOS DE LABORATÓRIO (PEDIDOS) ---
    const labCosts = useMemo(() => {
        return jobs.map(job => ({
            id: job.id,
            description: `Lab: ${job.items.map(i => i.name).join(', ')}`,
            amount: job.totalValue,
            date: job.createdAt,
            type: 'EXPENSE',
            category: 'OTHER' as TransactionCategory,
            status: job.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'
        }));
    }, [jobs]);

    // --- FLUXO UNIFICADO ---
    const cashFlow = useMemo(() => {
        const manualEntries = expenses.map(e => ({ ...e, type: 'EXPENSE' as const }));
        const all = [...procedureRevenue, ...labCosts, ...manualEntries];
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [procedureRevenue, labCosts, expenses]);

    const stats = useMemo(() => {
        const income = procedureRevenue.reduce((acc, curr) => acc + curr.amount, 0);
        const expense = cashFlow.filter(i => i.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
        return { income, expense, balance: income - expense };
    }, [procedureRevenue, cashFlow]);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg || !description || amount <= 0) return;
        setIsSaving(true);
        try {
            // No sistema ProTrack, 'Expense' com valor negativo/positivo ou flag define o tipo
            // Para simplificar para o usuário, tratamos tudo na coleção de despesas/transações
            await api.apiAddExpense(currentOrg.id, {
                id: `trans_${Date.now()}`,
                organizationId: currentOrg.id,
                description,
                amount: entryType === 'EXPENSE' ? amount : -amount, // Mantemos o padrão do sistema
                category,
                date: new Date(date),
                status: 'PAID',
                createdAt: new Date()
            } as any);
            setShowEntryModal(false);
            setDescription(''); setAmount(0);
        } catch (e) {
            alert("Erro ao lançar transação.");
        } finally {
            setIsSaving(false);
        }
    };

    const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <Wallet className="text-teal-600" /> Financeiro da Clínica
                    </h1>
                    <p className="text-slate-500 font-medium">Controle total de entradas, saídas e rentabilidade.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => { setEntryType('EXPENSE'); setShowEntryModal(true); }} className="flex-1 md:flex-none px-5 py-2.5 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 text-sm">
                        <Plus size={18} /> Gasto
                    </button>
                    <button onClick={() => { setEntryType('INCOME'); setShowEntryModal(true); }} className="flex-1 md:flex-none px-5 py-2.5 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                        <Plus size={18} /> Entrada
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl"><ArrowUpRight size={24}/></div>
                        <span className="text-[10px] font-black text-teal-500 bg-teal-50 px-2 py-1 rounded-full uppercase tracking-widest">Receita Bruta</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Recebido</p>
                    <h3 className="text-3xl font-black text-slate-800">R$ {stats.income.toFixed(2)}</h3>
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-teal-600"><TrendingUp size={100}/></div>
                </div>

                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ArrowDownRight size={24}/></div>
                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase tracking-widest">Despesas Gerais</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Saídas</p>
                    <h3 className="text-3xl font-black text-slate-800">R$ {stats.expense.toFixed(2)}</h3>
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-red-600"><TrendingDown size={100}/></div>
                </div>

                <div className={`p-6 rounded-[32px] shadow-xl border relative overflow-hidden transition-all ${stats.balance >= 0 ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${stats.balance >= 0 ? 'bg-white/10 text-teal-400' : 'bg-white/20 text-white'}`}><DollarSign size={24}/></div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Saldo (Lucro Real)</span>
                    </div>
                    <p className="text-xs font-bold opacity-70 uppercase">Resultado do Período</p>
                    <h3 className="text-3xl font-black">R$ {stats.balance.toFixed(2)}</h3>
                    <div className="absolute -bottom-2 -right-2 opacity-10"><PieChartIcon size={80}/></div>
                </div>
            </div>

            <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Visão Geral</button>
                <button onClick={() => setActiveTab('CASHFLOW')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'CASHFLOW' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Extrato Detalhado</button>
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Fluxo Semanal</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Receita', value: stats.income },
                                    { name: 'Despesa', value: stats.expense }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                        <Cell fill="#10b981" />
                                        <Cell fill="#ef4444" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Dicas de Gestão IA</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-lg h-fit"><TrendingUp size={16}/></div>
                                <div>
                                    <p className="text-sm font-bold text-blue-900">Otimização de Próteses</p>
                                    <p className="text-xs text-blue-700 mt-1">Seus gastos com laboratório representam {stats.income > 0 ? ((labCosts.reduce((a,b)=>a+b.amount,0) / stats.income) * 100).toFixed(1) : 0}% da receita de procedimentos. Considere ajustar sua margem.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                                <div className="p-2 bg-amber-600 text-white rounded-lg h-fit"><Clock size={16}/></div>
                                <div>
                                    <p className="text-sm font-bold text-amber-900">Agenda Ocupada</p>
                                    <p className="text-xs text-amber-700 mt-1">Você tem {appointments.filter(a => a.status === AppointmentStatus.SCHEDULED).length} consultas agendadas. Potencial de receita futura: R$ {appointments.filter(a => a.status === AppointmentStatus.SCHEDULED).reduce((acc, a) => acc + (clinicServices.find(s=>s.name === a.procedure)?.price || 0), 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'CASHFLOW' && (
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-right-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Descrição</th>
                                    <th className="p-6">Categoria</th>
                                    <th className="p-6 text-right">Valor</th>
                                    <th className="p-6">Tipo</th>
                                    <th className="p-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {cashFlow.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-6 text-sm font-bold text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <p className="text-sm font-black text-slate-800 leading-tight">{item.description}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-full uppercase tracking-tighter">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className={`p-6 text-right font-black text-lg ${item.type === 'INCOME' ? 'text-teal-600' : 'text-red-500'}`}>
                                            {item.type === 'INCOME' ? '+' : '-'} R$ {Math.abs(item.amount).toFixed(2)}
                                        </td>
                                        <td className="p-6">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.type === 'INCOME' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                {item.type === 'INCOME' ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                                                {item.type === 'INCOME' ? 'Entrada' : 'Saída'}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            {item.id?.startsWith('trans_') && (
                                                <button onClick={() => currentOrg && api.apiDeleteExpense(currentOrg.id, item.id)} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {cashFlow.length === 0 && (
                                    <tr><td colSpan={6} className="p-20 text-center text-slate-400 italic font-medium">Nenhuma transação registrada neste período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: LANÇAMENTO MANUAL */}
            {showEntryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[32px]">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                {entryType === 'INCOME' ? 'Lançar Receita' : 'Lançar Despesa'}
                            </h3>
                            <button onClick={() => setShowEntryModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddEntry} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
                                <input value={description} onChange={e => setDescription(e.target.value)} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Ex: Pagamento Aluguel" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor (R$)</label>
                                    <input type="number" step="0.01" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value))} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-xl" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
                                <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white">
                                    <option value="OFFICE">Escritório / Administrativo</option>
                                    <option value="SUPPLIES">Materiais Clínicos</option>
                                    <option value="RENT">Aluguel / Condomínio</option>
                                    <option value="SALARY">Salários / Pró-labore</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="TAX">Impostos</option>
                                    <option value="OTHER">Outros</option>
                                </select>
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 ${entryType === 'INCOME' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'} ${isSaving ? 'opacity-70' : ''}`}>
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
                                {entryType === 'INCOME' ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR GASTO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
