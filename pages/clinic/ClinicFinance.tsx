import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppointmentStatus, TransactionCategory, Expense, ClinicPatient, PatientPayment, PatientBillingBatch } from '../../types';
import { 
    DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, Plus, 
    Search, Filter, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, 
    Receipt, Clock, CheckCircle2, X, Save, Trash2, Loader2, Info, ShoppingCart, 
    Stethoscope, ShieldCheck, Key, Building2, Eye, FileText, Check, AlertCircle, 
    CreditCard, ExternalLink, QrCode, Copy, Printer
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Cell, PieChart, Pie, Legend
} from 'recharts';
import * as api from '../../services/firebaseService';
import { FeatureLocked } from '../../components/FeatureLocked';

export const ClinicFinance = () => {
    const { 
        appointments, clinicServices, currentOrg, jobs, currentPlan, patients,
        patientPayments, patientBillingBatches, addPatientPayment, updatePatientPayment, deletePatientPayment,
        addPatientBillingBatch, updatePatientBillingBatchStatus, deletePatientBillingBatch, updateOrganization, createLabWallet
    } = useApp();

    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CASHFLOW' | 'PATIENT_BILLS' | 'ASAAS_SETUP'>('DASHBOARD');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    
    // UI Local Modals / Forms
    const [isSaving, setIsSaving] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showBillingModal, setShowBillingModal] = useState(false);
    
    // Form Entry (Cashflow general entry)
    const [entryType, setEntryType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [category, setCategory] = useState<TransactionCategory>('OTHER');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Asaas KYC States
    const [setupMode, setSetupMode] = useState<'CHOICE' | 'MANUAL' | 'CREATE'>('CHOICE');
    const [manualWalletId, setManualWalletId] = useState('');
    const [kycData, setKycData] = useState({
        name: '', email: '', cpfCnpj: '', phone: '', mobilePhone: '',
        postalCode: '', address: '', addressNumber: '', province: '',
        incomeValue: ''
    });

    // Patient Billing States
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patientSearch, setPatientSearch] = useState('');
    const [checkoutInvoice, setCheckoutInvoice] = useState<PatientBillingBatch | null>(null);

    // Patient Payment Form
    const [payForm, setPayForm] = useState({
        amount: 0,
        discount: 0,
        paymentMethod: 'PIX' as PatientPayment['paymentMethod'],
        notes: '',
        type: 'PAYMENT' as PatientPayment['type']
    });

    // Patient Billing Form (Batch)
    const [billForm, setBillForm] = useState({
        amount: 0,
        selectedAppointmentIds: [] as string[],
        paymentMethod: 'PIX' as 'PIX' | 'BOLETO' | 'CREDIT_CARD'
    });

    const [copiedContent, setCopiedContent] = useState(false);

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

    // Track chosen patient
    const selectedPatient = useMemo(() => {
        return patients.find(p => p.id === selectedPatientId) || null;
    }, [patients, selectedPatientId]);

    // --- LÓGICA DE CÁLCULO DE RECEITA (PROCEDIMENTOS) ---
    const procedureRevenue = useMemo(() => {
        return appointments
            .filter(a => a.status === AppointmentStatus.COMPLETED)
            .map(appt => {
                const service = clinicServices.find(s => s.name === appt.procedure);
                return {
                    id: appt.id,
                    patientId: appt.patientId || '',
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

    // Patient Financial Calculators
    const patientCalculations = useMemo(() => {
        const records: Record<string, {
            proceduresTotal: number;
            paidTotal: number;
            discountTotal: number;
            balance: number;
            lastActivity: string | null;
        }> = {};

        // Initialize with default
        patients.forEach(p => {
            records[p.id] = { proceduresTotal: 0, paidTotal: 0, discountTotal: 0, balance: 0, lastActivity: null };
        });

        // Add procedure charges
        procedureRevenue.forEach(rev => {
            if (rev.patientId && records[rev.patientId]) {
                records[rev.patientId].proceduresTotal += rev.amount;
                records[rev.patientId].balance += rev.amount;
                const dateStr = typeof rev.date === 'string' ? rev.date : (rev.date instanceof Date ? rev.date.toISOString().split('T')[0] : '');
                records[rev.patientId].lastActivity = dateStr;
            }
        });

        // Deduct payments / discounts
        patientPayments.forEach(pay => {
            if (pay.patientId && records[pay.patientId]) {
                if (pay.type === 'PAYMENT') {
                    records[pay.patientId].paidTotal += pay.amount;
                    records[pay.patientId].balance -= pay.amount;
                } else if (pay.type === 'DISCOUNT') {
                    records[pay.patientId].discountTotal += pay.amount;
                    records[pay.patientId].balance -= pay.amount;
                } else if (pay.type === 'REFUND') {
                    records[pay.patientId].paidTotal -= pay.amount;
                    records[pay.patientId].balance += pay.amount;
                }
                const dateStr = new Date(pay.paymentDate).toISOString().split('T')[0];
                if (!records[pay.patientId].lastActivity || dateStr > records[pay.patientId].lastActivity!) {
                    records[pay.patientId].lastActivity = dateStr;
                }
            }
        });

        return records;
    }, [patients, procedureRevenue, patientPayments]);

    // Filter patients
    const filteredPatients = useMemo(() => {
        return patients.filter(p => 
            p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
            (p.cpf && p.cpf.toLowerCase().includes(patientSearch.toLowerCase())) ||
            (p.phone && p.phone.toLowerCase().includes(patientSearch.toLowerCase()))
        );
    }, [patients, patientSearch]);

    // Chronological history of the selected patient
    const selectedPatientHistory = useMemo(() => {
        if (!selectedPatientId) return [];

        const patientProcedures = procedureRevenue.filter(p => p.patientId === selectedPatientId);
        const patientPays = patientPayments.filter(p => p.patientId === selectedPatientId);
        const patientBatches = patientBillingBatches.filter(b => b.patientId === selectedPatientId);

        const items = [
            ...patientProcedures.map(p => ({
                id: p.id,
                date: p.date,
                type: 'PROCEDURE' as const,
                title: p.description,
                amount: p.amount,
                color: 'text-rose-500'
            })),
            ...patientPays.map(p => ({
                id: p.id,
                date: new Date(p.paymentDate).toISOString().split('T')[0],
                type: p.type as 'PAYMENT' | 'DISCOUNT' | 'REFUND',
                title: p.type === 'DISCOUNT' ? `Desconto concedido: ${p.notes || '(Sem notas)'}` : `Recebimento manual: ${p.paymentMethod} - ${p.notes || '(Sem notas)'}`,
                amount: p.amount,
                color: p.type === 'DISCOUNT' ? 'text-blue-500' : 'text-teal-600'
            })),
            ...patientBatches.map(b => ({
                id: b.id,
                date: new Date(b.billingDate).toISOString().split('T')[0],
                type: 'BATCH' as const,
                title: `Cobrança enviada: ${b.status} - ID: ${b.id.substring(0,8)}`,
                amount: b.totalAmount,
                color: 'text-indigo-600',
                batch: b
            }))
        ];

        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedPatientId, procedureRevenue, patientPayments, patientBillingBatches]);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg || !description || amount <= 0) return;
        setIsSaving(true);
        try {
            await api.apiAddExpense(currentOrg.id, {
                id: `trans_${Date.now()}`,
                organizationId: currentOrg.id,
                description,
                amount: entryType === 'EXPENSE' ? amount : -amount,
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

    // Subaccount / Wallet creation on Asaas callback
    const handleKycChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKycData({ ...kycData, [e.target.name]: e.target.value });
    };

    const handleCreateWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg) return;
        setIsSaving(true);
        try {
            const payload = {
                orgId: currentOrg.id,
                accountData: {
                    ...kycData,
                    cpfCnpj: kycData.cpfCnpj.replace(/\D/g, ''),
                    postalCode: kycData.postalCode.replace(/\D/g, ''),
                    incomeValue: parseFloat(kycData.incomeValue) || 0
                }
            };
            await createLabWallet(payload);
            alert("Sua solicitação de abertura de conta clínica para paciente foi recebida e vinculada com sucesso!");
            setSetupMode('CHOICE');
        } catch (err: any) {
            alert("Erro: " + (err.message || "Erro desconhecido."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleManualAsaasLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrg || !manualWalletId.trim()) return;
        setIsSaving(true);
        try {
            await updateOrganization(currentOrg.id, {
                financialSettings: {
                    ...currentOrg.financialSettings,
                    asaasWalletId: manualWalletId.trim(),
                    asaasWalletStatus: 'APPROVED'
                }
            });
            alert("Conta do Asaas integrada com sucesso à clínica!");
            setManualWalletId('');
            setSetupMode('CHOICE');
        } catch (err) {
            alert("Falha ao integrar conta.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveAsaas = async () => {
        if (!currentOrg || !window.confirm("Deseja realmente remover as configurações de recebimento do Asaas?")) return;
        try {
            await updateOrganization(currentOrg.id, {
                financialSettings: {
                    ...currentOrg.financialSettings,
                    asaasWalletId: '',
                    asaasWalletStatus: ''
                }
            });
            alert("Chave desconectada.");
        } catch (err) {
            alert("Falha ao desconectar.");
        }
    };

    // Patient payment mutations
    const handleAddPatientPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId || payForm.amount <= 0) return;
        setIsSaving(true);
        try {
            await addPatientPayment({
                patientId: selectedPatientId,
                amount: payForm.amount,
                discount: payForm.discount || 0,
                paymentMethod: payForm.paymentMethod,
                paymentDate: new Date(),
                type: payForm.type,
                notes: payForm.notes
            });
            alert("Recebimento registrado com sucesso!");
            setShowPaymentModal(false);
            setPayForm({ amount: 0, discount: 0, paymentMethod: 'PIX', notes: '', type: 'PAYMENT' });
        } catch (err) {
            alert("Erro ao adicionar recebimento.");
        } finally {
            setIsSaving(false);
        }
    };

    // Patient billing batch mutation (Boleto/Pix emission)
    const handleAddBillingBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId || billForm.amount <= 0) return;
        setIsSaving(true);
        try {
            const hasWalletId = !!currentOrg?.financialSettings?.asaasWalletId;
            const simulatedLink = `https://sandbox.asaas.com/invoice/checkout/simulated-${Math.random().toString(36).substring(2, 8)}`;
            
            await addPatientBillingBatch({
                patientId: selectedPatientId,
                appointmentIds: billForm.selectedAppointmentIds,
                totalAmount: billForm.amount,
                billingDate: new Date(),
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                status: 'PENDING',
                paymentLink: simulatedLink,
                pixCopyPaste: `00020126360014BR.GOV.BCB.PIX0114clinicanas${selectedPatientId.substring(0,4)}5204000053039865405${billForm.amount.toFixed(2)}5802BR5915SmileproxClin6009SaoPaulo62070503***6304A1B2`,
                bankSlipUrl: simulatedLink
            });

            alert(`Fatura gerada com sucesso! ${hasWalletId ? 'Emitido boleto via Asaas Wallet cadastrado.' : 'Gerado modo Pix/Boleto simplificado.'}`);
            setShowBillingModal(false);
        } catch (err) {
            alert("Erro ao emitir fatura.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyPix = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedContent(true);
        setTimeout(() => setCopiedContent(false), 2000);
    };

    const handleConfirmReceiptFromBatch = async (batch: PatientBillingBatch) => {
        if (!window.confirm("Confirmar recebimento deste lote faturado? Isso registrará o pagamento do paciente automáticamente.")) return;
        try {
            await updatePatientBillingBatchStatus(batch.id, 'RECEIVED');
            await addPatientPayment({
                patientId: batch.patientId,
                amount: batch.totalAmount,
                discount: 0,
                paymentMethod: 'PIX',
                paymentDate: new Date(),
                type: 'PAYMENT',
                notes: `Fatura Liquidada #${batch.id.substring(0,6)}`
            });
            alert("Fatura liquidada e pagamento lançado no prontuário!");
        } catch (err) {
            alert("Erro ao liquidar.");
        }
    };

    const asaasWalletId = currentOrg?.financialSettings?.asaasWalletId;
    const asaasStatus = currentOrg?.financialSettings?.asaasWalletStatus || 'Não configurada';

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500 max-w-7xl mx-auto px-1 md:px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <Wallet className="text-teal-600" /> FINANCEIRO DA CLÍNICA
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Controle de caixa, faturamento individual de pacientes, emissão de boletos e cartões de crédito.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => { setEntryType('EXPENSE'); setShowEntryModal(true); }} className="flex-1 md:flex-none px-5 py-2.5 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 text-xs">
                        <Plus size={18} /> GASTO CLÍNICO
                    </button>
                    <button onClick={() => { setEntryType('INCOME'); setShowEntryModal(true); }} className="flex-1 md:flex-none px-5 py-2.5 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 transition-all shadow-lg flex items-center justify-center gap-2 text-xs">
                        <Plus size={18} /> LANÇAMENTO EXTRA
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-150 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl"><ArrowUpRight size={24}/></div>
                        <span className="text-[10px] font-black text-teal-500 bg-teal-50 px-2 py-1 rounded-full uppercase tracking-widest">Procedimentos Prontos</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Receita Bruto Produzido</p>
                    <h3 className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.income)}
                    </h3>
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-teal-600"><TrendingUp size={100}/></div>
                </div>

                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-150 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ArrowDownRight size={24}/></div>
                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase tracking-widest">Saídas & Custos</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Geral Despesas</p>
                    <h3 className="text-2xl font-black text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.expense)}
                    </h3>
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-red-600"><TrendingDown size={100}/></div>
                </div>

                <div className={`p-6 rounded-[32px] shadow-xl border relative overflow-hidden transition-all ${stats.balance >= 0 ? 'bg-slate-900 border-slate-850 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${stats.balance >= 0 ? 'bg-white/10 text-teal-300' : 'bg-white/20 text-white'}`}><DollarSign size={24}/></div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Rentabilidade de Caixa</span>
                    </div>
                    <p className="text-xs font-bold opacity-70 uppercase">Saldo Consolidado</p>
                    <h3 className="text-2xl font-black">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.balance)}
                    </h3>
                    <div className="absolute -bottom-2 -right-2 opacity-15"><PieChartIcon size={80}/></div>
                </div>
            </div>

            {/* BARRA DE NAVEGAÇÃO INTERNA */}
            <div className="flex bg-slate-200/60 p-1 rounded-2xl w-fit flex-wrap gap-1">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}>Visão Geral</button>
                <button onClick={() => setActiveTab('CASHFLOW')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'CASHFLOW' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}>Fluxo de Caixa (Livro)</button>
                <button onClick={() => setActiveTab('PATIENT_BILLS')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'PATIENT_BILLS' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}>Faturamento de Pacientes</button>
                <button onClick={() => setActiveTab('ASAAS_SETUP')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${activeTab === 'ASAAS_SETUP' ? 'bg-white text-slate-900 shadow-sm font-black flex items-center gap-1.5' : 'text-slate-500 hover:text-slate-700 flex items-center gap-1.5'}`}>
                    <ShieldCheck size={14}/> Cobrança Asaas
                </button>
            </div>

            {/* ABA: VISÃO GERAL */}
            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Comparativo Financeiro</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Receita Est.', value: stats.income },
                                    { name: 'Custos Totais', value: stats.expense }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                        <Cell fill="#0d9488" />
                                        <Cell fill="#f43f5e" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Educação e Alerts Clínicos</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-teal-50/50 border border-teal-150 rounded-2xl flex gap-3">
                                    <div className="p-2 bg-teal-600 text-white rounded-xl h-fit"><TrendingUp size={16}/></div>
                                    <div>
                                        <p className="text-xs font-black text-teal-900 uppercase tracking-tight">Relação Procedimento x Laboratório</p>
                                        <p className="text-xs text-slate-600 mt-1">Os custos laboratoriais são o maior item de estoque indireto na sua clínica. Compare suas tabelas de clínicas com nossos preços parceiros.</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex gap-3">
                                    <div className="p-2 bg-orange-600 text-white rounded-xl h-fit"><Clock size={16}/></div>
                                    <div>
                                        <p className="text-xs font-black text-orange-950 uppercase tracking-tight">Previsibilidade futura</p>
                                        <p className="text-xs text-slate-600 mt-1">Você possui consultas em agendamento prontas para se tornarem debito. Configure cobranças automáticas no Asaas para aumentar pontualidade.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Cobrança Direta por Telefone/PIX ativa</span>
                            <div className="text-xs font-black text-teal-600">SMILEPROX PLATINUM</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA: FLUXO DE CAIXA (CASHFLOW) */}
            {activeTab === 'CASHFLOW' && (
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-150 overflow-hidden animate-in slide-in-from-right-4 duration-300">
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
                                        <td className="p-6 text-xs font-bold text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <p className="text-sm font-black text-slate-800 leading-tight">{item.description}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className={`p-6 text-right font-black text-sm ${item.type === 'INCOME' ? 'text-teal-600' : 'text-red-500'}`}>
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
                                    <tr><td colSpan={6} className="p-20 text-center text-slate-400 italic font-medium">Nenhuma entrada ou saída extra cadastrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ABA: FATURAMENTO DE PACIENTES */}
            {activeTab === 'PATIENT_BILLS' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-300">
                    {/* Lista esquerda: Pacientes */}
                    <div className="lg:col-span-4 bg-white p-6 rounded-[32px] border border-slate-150 flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Procurar paciente..."
                                value={patientSearch}
                                onChange={e => setPatientSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-xs"
                            />
                        </div>

                        <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                            {filteredPatients.map(p => {
                                const calculations = patientCalculations[p.id] || { balance: 0, proceduresTotal: 0 };
                                const isOwed = calculations.balance > 0;
                                const isSelected = p.id === selectedPatientId;
                                return (
                                    <button 
                                        key={p.id}
                                        onClick={() => setSelectedPatientId(p.id)}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${isSelected ? 'border-teal-500 bg-teal-50/40 shadow-sm' : 'border-slate-100 hover:bg-slate-50 bg-white'}`}
                                    >
                                        <div>
                                            <p className="font-black text-slate-800 text-sm">{p.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">CPF: {p.cpf || 'Não cadastrado'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-black ${isOwed ? 'text-red-500' : 'text-teal-600'}`}>
                                                R$ {calculations.balance.toFixed(2)}
                                            </p>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded mt-1 inline-block ${isOwed ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
                                                {isOwed ? 'Débito' : 'Em Dia'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredPatients.length === 0 && (
                                <p className="text-center py-10 text-slate-400 italic text-xs">Nenhum paciente cadastrado até o momento.</p>
                            )}
                        </div>
                    </div>

                    {/* Detalhes à direita: Paciente Selecionado */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {selectedPatient ? (
                            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-150 space-y-6">
                                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 pb-6">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">{selectedPatient.name}</h2>
                                        <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-500">
                                            <span>CPF: {selectedPatient.cpf || '--'}</span>
                                            <span>•</span>
                                            <span>Telefone: {selectedPatient.phone || '--'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowPaymentModal(true)}
                                            className="px-4 py-2.5 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 shadow-sm text-xs flex items-center gap-1.5"
                                        >
                                            <Plus size={16}/> Lançar Recebimento
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const unsavedAppts = appointments.filter(a => a.status === AppointmentStatus.COMPLETED && a.patientId === selectedPatientId);
                                                const calc = patientCalculations[selectedPatient.id] || { balance: 0 };
                                                setBillForm({
                                                    amount: calc.balance > 0 ? calc.balance : 0,
                                                    selectedAppointmentIds: unsavedAppts.map(a => a.id),
                                                    paymentMethod: 'PIX'
                                                });
                                                setShowBillingModal(true);
                                            }}
                                            className="px-4 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-sm text-xs flex items-center gap-1.5"
                                        >
                                            <Receipt size={16}/> Emitir Cobrança
                                        </button>
                                    </div>
                                </div>

                                {/* Patient KPI balance */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ajustado Fechados</p>
                                        <p className="text-lg font-black text-slate-800">
                                            R$ {(patientCalculations[selectedPatient.id]?.proceduresTotal || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-bold">Total Liquidado</p>
                                        <p className="text-lg font-black text-teal-600">
                                            R$ {(patientCalculations[selectedPatient.id]?.paidTotal || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="border-l border-slate-200 pl-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-bold">Saldo Aberto</p>
                                        <p className={`text-lg font-black ${(patientCalculations[selectedPatient.id]?.balance || 0) > 0 ? 'text-red-500' : 'text-teal-600'}`}>
                                            R$ {(patientCalculations[selectedPatient.id]?.balance || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Extrato de Prontuário Clínico</h3>
                                    <div className="space-y-4 border-l-2 border-slate-100 pl-4 ml-2">
                                        {selectedPatientHistory.map((h, index) => (
                                            <div key={index} className="relative group/time">
                                                <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border border-teal-500 bg-white" />
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-400">{new Date(h.date).toLocaleDateString()}</p>
                                                        <h4 className="font-bold text-sm text-slate-800 mt-0.5">{h.title}</h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black ${h.color}`}>
                                                            {h.type === 'PROCEDURE' ? '+' : '-'} R$ {h.amount.toFixed(2)}
                                                        </p>
                                                        {h.type === 'BATCH' && h.batch && (
                                                            <div className="flex gap-2 mt-1 justify-end">
                                                                <button 
                                                                    onClick={() => setCheckoutInvoice(h.batch)}
                                                                    className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                                                                >
                                                                    <Eye size={10}/> Ver Gateway
                                                                </button>
                                                                {h.batch.status === 'PENDING' && (
                                                                    <button 
                                                                        onClick={() => handleConfirmReceiptFromBatch(h.batch)}
                                                                        className="text-[10px] font-black text-teal-600 hover:underline flex items-center gap-0.5"
                                                                    >
                                                                        <Check size={10}/> Liquidar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedPatientHistory.length === 0 && (
                                            <p className="text-xs text-slate-400 italic">Nenhum evento financeiro associado a este paciente.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-12 rounded-[32px] border border-slate-150 text-center italic text-slate-500 font-medium">
                                Selecione um paciente ao lado para gerenciar seu faturamento, manual ou online.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ABA: CONFIGURAÇÃO DO ASAAS CLIENTE (WALLET) */}
            {activeTab === 'ASAAS_SETUP' && (
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-150 space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-100 pb-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <ShieldCheck className="text-teal-600" /> Recebimentos Online & Wallet ID (Asaas)
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">Gere cobranças recorrentes completas para seus pacientes via PIX, Boletos e Cartão de crédito de forma profissional.</p>
                        </div>
                        {asaasWalletId && (
                            <span className="bg-green-50 text-green-700 border border-green-200 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5">
                                <Check size={14}/> CONTA ATIVA NO ASAAS
                            </span>
                        )}
                    </div>

                    {!asaasWalletId ? (
                        <div>
                            {setupMode === 'CHOICE' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button 
                                        onClick={() => setSetupMode('CREATE')}
                                        className="p-8 border-2 border-slate-100 rounded-[24px] hover:border-teal-500 hover:bg-teal-50/30 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Plus size={24} />
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-800">Solicitar abertura de Wallet</h4>
                                        <p className="text-xs text-slate-500 mt-2">Desejo criar minha conta virtual gratuitamente através da Smileprox para faturar diretamente.</p>
                                    </button>

                                    <button 
                                        onClick={() => setSetupMode('MANUAL')}
                                        className="p-8 border-2 border-slate-100 rounded-[24px] hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Key size={24} />
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-800">Já possuo meu Wallet ID</h4>
                                        <p className="text-xs text-slate-500 mt-2">Insira sua chave Asaas existente para capturar os lançamentos dos pacientes.</p>
                                    </button>
                                </div>
                            )}

                            {setupMode === 'MANUAL' && (
                                <form onSubmit={handleManualAsaasLink} className="space-y-4 max-w-lg">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Wallet ID / Chave API Asaas</label>
                                        <input 
                                            required
                                            value={manualWalletId}
                                            onChange={e => setManualWalletId(e.target.value)}
                                            placeholder="Ex: $a.as.xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-mono text-xs" 
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setSetupMode('CHOICE')} className="px-5 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-xs">Cancelar</button>
                                        <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 shadow-md text-xs">VINCULAR CARTEIRA</button>
                                    </div>
                                </form>
                            )}

                            {setupMode === 'CREATE' && (
                                <form onSubmit={handleCreateWallet} className="space-y-5">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-3 text-xs text-slate-650 leading-relaxed">
                                        <Info className="text-teal-600 shrink-0" size={16} />
                                        <div>
                                            <p className="font-black uppercase text-teal-800">Processamento de Abertura:</p>
                                            <p className="mt-1">Ao preencher esses dados, solicitaremos sua subconta diretamente integracional. A liberação de boletos e faturas é imediata.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo / Razão Social</label>
                                            <input required name="name" value={kycData.name} onChange={handleKycChange} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CPF ou CNPJ</label>
                                            <input required name="cpfCnpj" value={kycData.cpfCnpj} onChange={handleKycChange} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Clínico</label>
                                            <input required type="email" name="email" value={kycData.email} onChange={handleKycChange} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Celular Responsável</label>
                                            <input required name="mobilePhone" value={kycData.mobilePhone} onChange={handleKycChange} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Endereço Clínica</label>
                                            <input required name="address" value={kycData.address} onChange={handleKycChange} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CEP</label>
                                                <input required name="postalCode" value={kycData.postalCode} onChange={handleKycChange} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Número</label>
                                                <input required name="addressNumber" value={kycData.addressNumber} onChange={handleKycChange} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-6 border-t border-slate-100">
                                        <button type="button" onClick={() => setSetupMode('CHOICE')} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-xs">Cancelar</button>
                                        <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 shadow-md text-xs flex justify-center items-center">
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'SOLICITAR CONTA AUTOMÁTICA'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <p className="text-xs font-bold text-slate-400">Wallet ID de Transação Integrada:</p>
                                <p className="font-mono text-sm font-bold text-slate-700 mt-1">{asaasWalletId}</p>
                                <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1">
                                    <CheckCircle2 size={14}/> Sincronização e Split de Paciente Ativados
                                </p>
                            </div>
                            <button 
                                onClick={handleRemoveAsaas}
                                className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 text-xs font-black rounded-xl transition-colors"
                            >
                                Desconectar Integração
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: LANÇAMENTO MANUAL CAIXA GENERAL */}
            {showEntryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[32px]">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                {entryType === 'INCOME' ? 'Lançar Receita extra' : 'Lançar Despesa extra'}
                            </h3>
                            <button onClick={() => setShowEntryModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddEntry} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
                                <input value={description} onChange={e => setDescription(e.target.value)} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" placeholder="Ex: Conta de Luz" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor (R$)</label>
                                    <input type="number" step="0.01" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value))} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-black text-lg" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria de Custo</label>
                                <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold bg-white">
                                    <option value="OFFICE">Escritório / Administrativo</option>
                                    <option value="SUPPLIES">Materiais Clínicos</option>
                                    <option value="RENT">Aluguel / Condomínio</option>
                                    <option value="SALARY">Salários / Pró-labore</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="TAX">Impostos</option>
                                    <option value="OTHER">Outros</option>
                                </select>
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 ${entryType === 'INCOME' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-100' : 'bg-red-650 hover:bg-red-700 shadow-red-100'}`}>
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
                                {entryType === 'INCOME' ? 'CONFIRMAR RECEITA' : 'CONFIRMAR SAÍDA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: REGISTRAR RECEBIMENTO MANUAL PATIENTE */}
            {showPaymentModal && selectedPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[32px]">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                                Registrar Recebimento Manual - {selectedPatient.name}
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddPatientPaymentSubmit} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor do Pagamento (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    value={payForm.amount || ''}
                                    onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-black text-xl" 
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Desconto Concedido</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={payForm.discount || ''}
                                        onChange={e => setPayForm({ ...payForm, discount: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" 
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo Lançamento</label>
                                    <select 
                                        value={payForm.type}
                                        onChange={e => setPayForm({ ...payForm, type: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold bg-white"
                                    >
                                        <option value="PAYMENT">Pagamento</option>
                                        <option value="DISCOUNT">Desconto Extra</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Método de Pagamento</label>
                                <select 
                                    value={payForm.paymentMethod}
                                    onChange={e => setPayForm({ ...payForm, paymentMethod: e.target.value as any })}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold bg-white"
                                >
                                    <option value="CASH">Dinheiro Espécie</option>
                                    <option value="PIX">Transferência PIX</option>
                                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                                    <option value="BOLETO">Boleto Bancário</option>
                                    <option value="OTHER">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 font-bold">Observações / Notas</label>
                                <input 
                                    value={payForm.notes}
                                    onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold" 
                                    placeholder="Ex: Recibo emitido manualmente"
                                />
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl hover:bg-teal-700 flex justify-center items-center">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'CONFIRMAR LIQUIDAÇÃO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EMITIR FATURA (BOLETO/PIX/CARTÃO) PATIENTE */}
            {showBillingModal && selectedPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[32px]">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                Emitir Fatura Online - {selectedPatient.name}
                            </h3>
                            <button onClick={() => setShowBillingModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddBillingBatchSubmit} className="p-8 space-y-5">
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-2 text-xs text-amber-900 leading-relaxed font-medium">
                                <Info size={16} className="shrink-0 text-amber-600" />
                                <div>
                                    Como integrado do Asaas, as cobranças do paciente serão enviadas por SMS, e-mail e Link Direto com Boleto ou PIX dinâmicos.
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor da Fatura Geral (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    value={billForm.amount || ''}
                                    onChange={e => setBillForm({ ...billForm, amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 font-bold">Modo de Arrecadação Prioritária</label>
                                <select 
                                    value={billForm.paymentMethod}
                                    onChange={e => setBillForm({ ...billForm, paymentMethod: e.target.value as any })}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold bg-white"
                                >
                                    <option value="PIX">PIX (Imediato com desconto)</option>
                                    <option value="BOLETO">Boleto Bancário Digital (D+1 pós recebimento)</option>
                                    <option value="CREDIT_CARD">Cartão de Crédito Parcelado Asaas</option>
                                </select>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex justify-center items-center">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'EMITIR COBRANÇA AUTOMÁTICA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* SIMULADOR DE GATEWAY DE CHECKOUT DE PACIENTE (HIGH-FIDELITY OVERLAY) */}
            {checkoutInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-350">
                    <div className="bg-white rounded-[36px] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                        
                        {/* Header do Checkout */}
                        <div className="bg-slate-900 text-white p-6 relative">
                            <button 
                                onClick={() => setCheckoutInvoice(null)}
                                className="absolute top-6 right-6 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <X size={18}/>
                            </button>
                            <span className="text-[9px] font-black uppercase text-teal-400 px-2 py-0.5 bg-teal-950/40 border border-teal-800 rounded">Portal de Pagamento Asaas</span>
                            <div className="mt-4 flex justify-between items-end gap-2 flex-wrap">
                                <div>
                                    <h3 className="text-lg font-black tracking-tight">{currentOrg?.name || 'Smileprox Clinic'}</h3>
                                    <p className="text-xs text-slate-400 font-medium">Boleto e cobranças online integradas</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total devido</p>
                                    <p className="text-2xl font-black text-white">R$ {checkoutInvoice.totalAmount.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Corpo do Checkout */}
                        <div className="p-8 space-y-6 overflow-y-auto flex-1">
                            <div className="flex gap-4 border-b border-slate-100 pb-4">
                                <div className="w-full text-xs font-bold space-y-2">
                                    <div className="flex justify-between"><span className="text-slate-400">Paciente:</span> <span className="text-slate-700">{selectedPatient?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Nº do Lote:</span> <span className="text-slate-700 font-mono">#{checkoutInvoice.id.substring(0,8).toUpperCase()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Vencimento:</span> <span className="text-slate-700">{new Date(checkoutInvoice.dueDate).toLocaleDateString()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Status Invoice:</span> <span className="text-amber-600 bg-amber-50 px-2 py-0.5 font-bold rounded uppercase text-[10px] tracking-wider">{checkoutInvoice.status}</span></div>
                                </div>
                            </div>

                            {/* Pix/Boleto interactive section */}
                            <div className="space-y-6">
                                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-150 rounded-3xl bg-slate-50/50">
                                    <QrCode size={140} className="text-slate-800" />
                                    <p className="text-xs font-bold text-slate-500 mt-4 text-center">Escaneie o QR Code acima usando seu aplicativo de banco para pagar via PIX imediatamente.</p>
                                    
                                    <div className="mt-4 w-full flex gap-2">
                                        <input 
                                            readOnly 
                                            value={checkoutInvoice.pixCopyPaste || ''} 
                                            className="font-mono text-[10px] text-slate-400 bg-white border border-slate-200 p-3 rounded-xl flex-1 outline-none select-all" 
                                        />
                                        <button 
                                            onClick={() => handleCopyPix(checkoutInvoice.pixCopyPaste || '')}
                                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5"
                                        >
                                            {copiedContent ? <><Check size={14}/> Copiado</> : <><Copy size={14}/> Copiar PIX</>}
                                        </button>
                                    </div>
                                </div>

                                {/* Boleto Button */}
                                <div className="flex items-center justify-between p-4 border border-slate-150 rounded-2xl hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-slate-100 text-slate-750 rounded-xl"><FileText size={22}/></div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Visualizar Boleto Bancário</p>
                                            <p className="text-[10px] text-slate-400 font-bold">Linha digitável em anexo PDF</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => window.print()}
                                        className="p-3 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors"
                                    >
                                        <Printer size={18}/>
                                    </button>
                                </div>

                                {/* Card payment emulation */}
                                <div className="p-4 border border-slate-150 rounded-2xl bg-white space-y-3">
                                    <p className="text-xs font-black text-slate-800 flex items-center gap-2">
                                        <CreditCard size={18} className="text-teal-600"/> Pagar com Cartão de Crédito Asaas
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input placeholder="Número do Cartão" className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                                        <input placeholder="Nome impresso no Cartão" className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            alert("Simulação de transação de crédito aprovada via sandbox Asaas!");
                                            setCheckoutInvoice(null);
                                        }}
                                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl"
                                    >
                                        PAGAR R$ {checkoutInvoice.totalAmount.toFixed(2)} NO CRÉDITO
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
