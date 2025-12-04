
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building, User, Mail, Lock, Loader2, CheckCircle, Stethoscope, Briefcase } from 'lucide-react';

type RegType = 'LAB' | 'DENTIST';

export const RegisterOrganization = () => {
    const { registerOrganization, registerDentist, allPlans } = useApp();
    const navigate = useNavigate();
    
    const [regType, setRegType] = useState<RegType>('LAB');

    // Common Fields
    const [name, setName] = useState(''); // Owner name or Dentist name
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Lab Specific
    const [labName, setLabName] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState('');

    // Dentist Specific
    const [clinicName, setClinicName] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (allPlans.length > 0) {
            setSelectedPlanId(allPlans[0].id);
        }
    }, [allPlans]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (regType === 'LAB') {
                if (!selectedPlanId) throw new Error("Selecione um plano.");
                await registerOrganization(email, password, name, labName, selectedPlanId);
            } else {
                await registerDentist(email, password, name, clinicName || 'Consultório Particular');
            }
            setSuccess(true);
            setTimeout(() => navigate(regType === 'LAB' ? '/dashboard' : '/store'), 2000);
        } catch (err: any) {
            setError(err.message || "Falha ao registrar.");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
                <div className="text-white">
                    <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
                    <h1 className="text-3xl font-bold">Cadastro Realizado!</h1>
                    <p className="text-slate-300 mt-2">Redirecionando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-700">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
                    <p className="text-slate-400">Escolha seu perfil para começar.</p>
                </div>

                <div className="flex bg-slate-900 p-1 rounded-xl mb-6">
                    <button type="button" onClick={() => setRegType('LAB')} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${regType === 'LAB' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Briefcase size={18} /> Laboratório
                    </button>
                    <button type="button" onClick={() => setRegType('DENTIST')} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${regType === 'DENTIST' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Stethoscope size={18} /> Dentista
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Seu Nome</label>
                        <div className="relative"><User className="absolute left-3 top-3.5 text-slate-500" size={18} /><input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
                    </div>

                    {regType === 'LAB' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Laboratório</label>
                            <div className="relative"><Building className="absolute left-3 top-3.5 text-slate-500" size={18} /><input required value={labName} onChange={e => setLabName(e.target.value)} placeholder="Ex: Precision Lab" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
                        </div>
                    )}

                    {regType === 'DENTIST' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Clínica (Opcional)</label>
                            <div className="relative"><Building className="absolute left-3 top-3.5 text-slate-500" size={18} /><input value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Ex: Clínica Sorriso" className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-teal-500" /></div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                            <div className="relative"><Mail className="absolute left-3 top-3.5 text-slate-500" size={18} /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
                            <div className="relative"><Lock className="absolute left-3 top-3.5 text-slate-500" size={18} /><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
                        </div>
                    </div>

                    {regType === 'LAB' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Selecione seu Plano</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {allPlans.map(plan => (
                                    <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)}
                                        className={`p-3 text-center border-2 rounded-lg transition-all ${selectedPlanId === plan.id ? 'border-blue-500 bg-blue-900/50 shadow-lg' : 'border-slate-700 hover:border-blue-600'}`}>
                                        <span className="font-bold text-white text-sm">{plan.name}</span>
                                        <span className="text-xs text-slate-400 block">R$ {plan.price}/mês</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">{error}</div>}
                    
                    <button type="submit" disabled={loading} className={`w-full py-4 mt-4 rounded-xl font-bold text-lg text-white flex items-center justify-center gap-2 ${regType === 'LAB' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
                    </button>
                </form>
            </div>
        </div>
    );
};
