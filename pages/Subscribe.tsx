import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, CreditCard, ShieldCheck, Loader2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Subscribe = () => {
    const { currentOrg, updateOrganization } = useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('pro');

    if (!currentOrg) return null;

    const handleSubscribe = async () => {
        setLoading(true);
        // SIMULATION OF STRIPE CHECKOUT
        setTimeout(async () => {
            await updateOrganization(currentOrg.id, { subscriptionStatus: 'ACTIVE' });
            setLoading(false);
            alert("Pagamento simulado com sucesso! Assinatura ATIVA.");
            navigate('/dashboard');
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Escolha seu Plano</h1>
                    <p className="text-slate-500">Desbloqueie todo o potencial do One Dental System.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Basic */}
                    <div className={`bg-white p-8 rounded-2xl border-2 ${selectedPlan === 'basic' ? 'border-blue-600 shadow-xl' : 'border-slate-100 shadow-sm'} cursor-pointer transition-all`} onClick={() => setSelectedPlan('basic')}>
                        <h3 className="font-bold text-xl text-slate-800">Básico</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-4">R$ 99<span className="text-sm text-slate-400 font-normal">/mês</span></p>
                        <ul className="mt-6 space-y-3 text-sm text-slate-600">
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> 2 Usuários</li>
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> 5GB Armazenamento</li>
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Controle de Produção</li>
                        </ul>
                    </div>

                    {/* Pro */}
                    <div className={`bg-white p-8 rounded-2xl border-2 relative ${selectedPlan === 'pro' ? 'border-indigo-600 shadow-2xl scale-105' : 'border-slate-100 shadow-sm'} cursor-pointer transition-all`} onClick={() => setSelectedPlan('pro')}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">RECOMENDADO</div>
                        <h3 className="font-bold text-xl text-indigo-800">Profissional</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-4">R$ 199<span className="text-sm text-slate-400 font-normal">/mês</span></p>
                        <ul className="mt-6 space-y-3 text-sm text-slate-600">
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> 10 Usuários</li>
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> 50GB Armazenamento</li>
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Loja Virtual</li>
                        </ul>
                    </div>

                    {/* Enterprise */}
                    <div className={`bg-white p-8 rounded-2xl border-2 ${selectedPlan === 'ent' ? 'border-blue-600 shadow-xl' : 'border-slate-100 shadow-sm'} cursor-pointer transition-all`} onClick={() => setSelectedPlan('ent')}>
                        <h3 className="font-bold text-xl text-slate-800">Enterprise</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-4">R$ 499<span className="text-sm text-slate-400 font-normal">/mês</span></p>
                        <ul className="mt-6 space-y-3 text-sm text-slate-600">
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Ilimitados</li>
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> 1TB Armazenamento</li>
                            <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Gestão de Clínicas</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button 
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-70 flex items-center gap-2 mx-auto"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><CreditCard /> Assinar Agora</>}
                    </button>
                    <p className="mt-4 text-xs text-slate-400 flex items-center justify-center gap-1">
                        <ShieldCheck size={12} /> Pagamento seguro via Stripe (Simulado)
                    </p>
                </div>
            </div>
        </div>
    );
};