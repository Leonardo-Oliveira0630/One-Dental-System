import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, CreditCard, ShieldCheck, Loader2, Star, AlertTriangle, ArrowLeft, Mail } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const Subscribe = () => {
    const { currentOrg, createSubscription, allPlans, currentUser } = useApp();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Initial Plan ID from URL or Current Org
    const initialPlanId = searchParams.get('plan') || currentOrg?.planId || 'pro';
    const initialCoupon = searchParams.get('coupon') || '';

    const [loading, setLoading] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [billingEmail, setBillingEmail] = useState(currentUser?.email || '');
    const [error, setError] = useState('');
    const [couponCode, setCouponCode] = useState(initialCoupon);

    const publicPlans = allPlans.filter(p => p.isPublic && p.active);
    const displayPlans = publicPlans.length > 0 ? publicPlans : [
        { id: 'basic', name: 'Básico', price: 99, features: { maxUsers: 2, maxStorageGB: 5 } },
        { id: 'pro', name: 'Profissional', price: 199, features: { maxUsers: 10, maxStorageGB: 50 } },
        { id: 'enterprise', name: 'Enterprise', price: 499, features: { maxUsers: -1, maxStorageGB: 1000 } }
    ];

    useEffect(() => {
        if (currentUser?.email) {
            setBillingEmail(currentUser.email);
        }
    }, [currentUser]);

    if (!currentOrg) return null;

    const handleSubscribe = async () => {
        // Sanitize CPF/CNPJ (Remove dots, dashes, slashes)
        const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');

        if (!cleanCpfCnpj) { 
            setError("Informe CPF ou CNPJ."); 
            return; 
        }

        if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
            setError("Documento inválido. CPF deve ter 11 números, CNPJ deve ter 14.");
            return;
        }

        if (!billingEmail || !billingEmail.includes('@')) {
            setError("Informe um email válido para faturamento.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await createSubscription(
                currentOrg.id, 
                selectedPlanId, 
                billingEmail, 
                currentOrg.name, 
                cleanCpfCnpj
            );

            if (result.success && result.paymentLink) {
                window.location.href = result.paymentLink;
            } else {
                setError("Erro ao gerar pagamento. Tente novamente.");
            }
        } catch (err: any) {
            console.error(err);
            // Extract meaningful message from Firebase Error if possible
            const message = err.message || "Erro de conexão com servidor de pagamento.";
            // Remove "FirebaseError: " prefix if present for cleaner UI
            setError(message.replace('FirebaseError: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-5xl w-full">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 font-bold">
                    <ArrowLeft size={20}/> Voltar ao Painel
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Assinatura One Dental</h1>
                    <p className="text-slate-500">Escolha o plano ideal para o seu laboratório.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {displayPlans.map(plan => (
                        <div 
                            key={plan.id}
                            className={`bg-white p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? 'border-blue-600 shadow-xl ring-2 ring-blue-100 scale-105 z-10' : 'border-slate-100 shadow-sm opacity-80 hover:opacity-100'}`} 
                            onClick={() => setSelectedPlanId(plan.id)}
                        >
                            <h3 className="font-bold text-lg text-slate-800 uppercase tracking-wide">{plan.name}</h3>
                            <p className="text-3xl font-bold text-slate-900 mt-2">R$ {plan.price}<span className="text-sm text-slate-400 font-normal">/mês</span></p>
                            <ul className="mt-4 space-y-2 text-sm text-slate-600">
                                <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> {plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</li>
                                <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> {plan.features.maxStorageGB}GB Armazenamento</li>
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-lg mx-auto">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><CreditCard /> Dados de Faturamento</h3>
                    <div className="space-y-5">
                        <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-100">
                            <p className="flex justify-between font-bold mb-1"><span>Plano Selecionado:</span> <span>{displayPlans.find(p => p.id === selectedPlanId)?.name}</span></p>
                            <p className="flex justify-between"><span>Valor Mensal:</span> <span>R$ {displayPlans.find(p => p.id === selectedPlanId)?.price.toFixed(2)}</span></p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email Financeiro</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    type="email"
                                    value={billingEmail}
                                    onChange={e => setBillingEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    placeholder="financeiro@laboratorio.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                            <input 
                                value={cpfCnpj}
                                onChange={e => setCpfCnpj(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                placeholder="000.000.000-00 (Apenas números)"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">Digite apenas os números.</p>
                        </div>
                        
                        {couponCode && (
                             <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg font-bold border border-green-200">
                                 Cupom aplicado: {couponCode}
                             </div>
                        )}
                        
                        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 font-medium"><AlertTriangle size={16} className="shrink-0"/> {error}</div>}

                        <button 
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Ir para Pagamento Seguro'}
                        </button>
                        <p className="text-center text-xs text-slate-400">Ambiente seguro. Processado via Asaas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};