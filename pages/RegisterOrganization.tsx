
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building, User, Mail, Lock, CheckCircle, ShieldCheck } from 'lucide-react';

export const RegisterOrganization = () => {
  const { registerOrganization } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    labName: '',
    ownerName: '',
    email: '',
    password: '',
    planId: 'basic' // Default plan
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await registerOrganization(
        formData.email,
        formData.password,
        formData.ownerName,
        formData.labName,
        formData.planId
      );
      // Success - Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError("Erro ao registrar: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-2xl p-8 rounded-3xl shadow-2xl border border-slate-700">
        
        <div className="text-center mb-8">
            <div className="inline-block p-3 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/50">
                <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Comece seu SaaS</h1>
            <p className="text-slate-400">Registre seu laboratório e profissionalize sua gestão.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Nome do Laboratório</label>
                    <div className="relative">
                        <Building className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                            required
                            value={formData.labName}
                            onChange={e => setFormData({...formData, labName: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: Laboratório Smile"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Seu Nome (Admin)</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input 
                            required
                            value={formData.ownerName}
                            onChange={e => setFormData({...formData, ownerName: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: João da Silva"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Email de Acesso</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="seu@email.com"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input 
                        type="password"
                        required
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>
            </div>

            {/* Plan Selection Simplified */}
            <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Escolha seu Plano</label>
                <div className="grid grid-cols-3 gap-4">
                    {['basic', 'pro', 'enterprise'].map(plan => (
                        <div 
                            key={plan}
                            onClick={() => setFormData({...formData, planId: plan})}
                            className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${
                                formData.planId === plan 
                                    ? 'border-blue-500 bg-blue-500/10' 
                                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                            }`}
                        >
                            <h3 className="text-white font-bold uppercase text-sm">{plan}</h3>
                            {formData.planId === plan && <CheckCircle size={16} className="text-blue-500 mx-auto mt-2" />}
                        </div>
                    ))}
                </div>
            </div>

            {error && <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm text-center">{error}</div>}

            <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all disabled:opacity-50"
            >
                {loading ? 'Criando sua conta...' : 'Finalizar Cadastro'}
            </button>

            <div className="text-center">
                <Link to="/" className="text-slate-400 hover:text-white text-sm">
                    Já tem uma conta? Fazer Login
                </Link>
            </div>
        </form>
      </div>
    </div>
  );
};
