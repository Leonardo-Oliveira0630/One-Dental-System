import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, CreditCard, ShieldCheck, Loader2, Star, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Subscribe = () => {
    const { currentOrg, createSubscription, allPlans } = useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(currentOrg?.planId || 'pro');
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [error, setError] = useState('');

    const publicPlans = allPlans.filter(p => p.isPublic && p.active);
    const displayPlans = publicPlans.length > 0 ? publicPlans : [
        { id: 'basic', name: 'Básico', price: 99, features: { maxUsers: 2, maxStorageGB: 5 } },
        { id: 'pro', name: 'Profissional', price: 199, features: { maxUsers: 10, maxStorageGB: 50 } },
        { id: 'enterprise', name: 'Enterprise', price: 499, features: { maxUsers: -1, maxStorageGB: 1000 } }
    ];

    if (!currentOrg) return null;

    const handleSubscribe = async () => {
        if (!cpfCnpj) { setError("Informe CPF ou CNPJ."); return; }
        setLoading(true);
        setError('');

        try {
            const result = await createSubscription(
                currentOrg.id, 
                selectedPlanId, 
                currentOrg.ownerId, 
                currentOrg.name, 
                cpfCnpj
            );

            if (result.success && result.paymentLink) {
                window.location.href = result.paymentLink;
            } else {
                setError("Erro ao gerar pagamento. Tente novamente.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro de conexão com servidor de pagamento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Assinatura One Dental</h1>
                    <p className="text-slate-500">Escolha o plano ideal para o seu laboratório.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {displayPlans.map(plan => (
                        <div 
                            key={plan.id}
                            className={`bg-white p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? 'border-blue-600 shadow-xl ring-2 ring-blue-100' : 'border-slate-100 shadow-sm'}`} 
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

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 max-w-md mx-auto">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><CreditCard /> Dados de Faturamento</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                            <input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000.000.000-00" />
                        </div>
                        
                        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

                        <button onClick={handleSubscribe} disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                            {loading ? <Loader2 className="animate-spin" /> : 'Ir para Pagamento Seguro'}
                        </button>
                        <p className="text-center text-xs text-slate-400">Processado via Asaas. Boleto ou Pix.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};