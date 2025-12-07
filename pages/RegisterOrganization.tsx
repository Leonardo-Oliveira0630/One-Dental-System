import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building, User, Mail, Lock, CheckCircle, ShieldCheck, Stethoscope, Store, Activity, Database, Users } from 'lucide-react';
import { UserRole } from '../types';

export const RegisterOrganization = () => {
  const { registerOrganization, registerDentist, allPlans } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Registration Type: 'LAB' (Organization) or 'DENTIST' (Independent User)
  const [regType, setRegType] = useState<'LAB' | 'DENTIST'>('LAB');

  const [formData, setFormData] = useState({
    labName: '',
    clinicName: '',
    ownerName: '',
    email: '',
    password: '',
    planId: '' 
  });

  // Filter valid public plans for Labs
  const publicPlans = allPlans.filter(p => p.isPublic && p.active);
  // Default mock if no plans in DB yet (safe fallback)
  const displayPlans = publicPlans.length > 0 ? publicPlans : [
      { id: 'basic', name: 'Básico', price: 99, trialDays: 7, features: { maxUsers: 2, maxStorageGB: 5, hasStoreModule: false, hasClinicModule: false } },
      { id: 'pro', name: 'Profissional', price: 199, trialDays: 14, features: { maxUsers: 10, maxStorageGB: 50, hasStoreModule: true, hasClinicModule: false } },
      { id: 'enterprise', name: 'Enterprise', price: 499, trialDays: 30, features: { maxUsers: -1, maxStorageGB: 1000, hasStoreModule: true, hasClinicModule: true } }
  ];

  // Set default plan selection if not set
  if (regType === 'LAB' && !formData.planId && displayPlans.length > 0) {
     // Side-effect in render is generally bad, but safe here for simple init
     // Better handled by useEffect, but for simplicity:
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (regType === 'LAB') {
          // If no plan selected, force first one
          const selectedPlanId = formData.planId || displayPlans[0].id;
          const plan = displayPlans.find(p => p.id === selectedPlanId);
          
          let trialEnd = undefined;
          if (plan && plan.trialDays && plan.trialDays > 0) {
              const d = new Date();
              d.setDate(d.getDate() + plan.trialDays);
              trialEnd = d;
          }

          await registerOrganization(
            formData.email,
            formData.password,
            formData.ownerName,
            formData.labName,
            selectedPlanId,
            trialEnd
          );
          navigate('/dashboard');
      } else {
          await registerDentist(
            formData.email,
            formData.password,
            formData.ownerName,
            formData.clinicName
          );
          navigate('/store'); 
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao registrar: " + (err.message || "Tente novamente."));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-5xl p-8 rounded-3xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: FORM */}
        <div className="flex-1 space-y-6">
            <div className="text-left mb-6">
                <div className="inline-block p-3 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/50">
                    {regType === 'LAB' ? <ShieldCheck size={32} className="text-white" /> : <Stethoscope size={32} className="text-white" />}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Crie sua Conta</h1>
                <p className="text-slate-400">Comece a transformar sua gestão hoje.</p>
            </div>

            {/* TYPE SWITCHER */}
            <div className="flex bg-slate-900 p-1 rounded-xl mb-6">
                <button 
                    type="button"
                    onClick={() => setRegType('LAB')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                        regType === 'LAB' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Building size={18} /> Sou Laboratório
                </button>
                <button 
                    type="button"
                    onClick={() => setRegType('DENTIST')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                        regType === 'DENTIST' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Stethoscope size={18} /> Sou Dentista
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regType === 'LAB' ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Laboratório</label>
                            <input required value={formData.labName} onChange={e => setFormData({...formData, labName: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Laboratório Smile" />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Clínica</label>
                            <input required value={formData.clinicName} onChange={e => setFormData({...formData, clinicName: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ex: Clínica Sorriso" />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Seu Nome</label>
                        <input required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: João da Silva" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="seu@email.com" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha</label>
                    <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" minLength={6} />
                </div>

                {error && <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm text-center border border-red-500/30">{error}</div>}

                <button type="submit" disabled={loading} className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 text-white mt-4 ${regType === 'LAB' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-teal-600 hover:bg-teal-500'}`}>
                    {loading ? 'Criando conta...' : 'Finalizar Cadastro'}
                </button>
                
                <p className="text-center text-slate-400 text-sm mt-4">
                    Já tem conta? <Link to="/" className="text-white hover:underline font-bold">Fazer Login</Link>
                </p>
            </form>
        </div>

        {/* RIGHT COLUMN: PLANS (Only for Lab) */}
        {regType === 'LAB' && (
            <div className="flex-1 space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Escolha seu Plano</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayPlans.map(plan => (
                        <div 
                            key={plan.id}
                            onClick={() => setFormData({...formData, planId: plan.id})}
                            className={`cursor-pointer border-2 rounded-2xl p-5 transition-all relative overflow-hidden ${
                                formData.planId === plan.id 
                                    ? 'border-blue-500 bg-slate-800' 
                                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                            }`}
                        >
                            {plan.trialDays && plan.trialDays > 0 && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                                    {plan.trialDays} DIAS GRÁTIS
                                </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-white font-bold uppercase tracking-wider">{plan.name}</h4>
                                    <p className="text-2xl font-bold text-blue-400 mt-1">
                                        R$ {plan.price.toFixed(2)}<span className="text-sm text-slate-500 font-normal">/mês</span>
                                    </p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.planId === plan.id ? 'border-blue-500 bg-blue-500' : 'border-slate-600'}`}>
                                    {formData.planId === plan.id && <CheckCircle size={14} className="text-white" />}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-blue-500"/>
                                    {plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Database size={14} className="text-blue-500"/>
                                    {plan.features.maxStorageGB} GB de Armazenamento
                                </div>
                                <div className={`flex items-center gap-2 ${plan.features.hasStoreModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}>
                                    <Store size={14} className={plan.features.hasStoreModule ? 'text-green-500' : 'text-slate-600'}/>
                                    Loja Virtual
                                </div>
                                <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}>
                                    <Activity size={14} className={plan.features.hasClinicModule ? 'text-green-500' : 'text-slate-600'}/>
                                    Gestão Clínica
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* RIGHT COLUMN: DENTIST INTRO (Only for Dentist) */}
        {regType === 'DENTIST' && (
            <div className="flex-1 bg-gradient-to-br from-teal-900/50 to-slate-800 rounded-2xl p-8 flex flex-col justify-center items-center text-center border border-teal-500/30">
                <Stethoscope size={64} className="text-teal-400 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">Área do Dentista</h3>
                <p className="text-slate-300 leading-relaxed mb-6">
                    Conecte-se com seus laboratórios parceiros, envie pedidos digitais, envie arquivos 3D e gerencie seus pacientes em um só lugar.
                </p>
                <div className="space-y-2 text-left bg-black/20 p-4 rounded-xl w-full">
                    <p className="text-teal-300 flex items-center gap-2 text-sm"><CheckCircle size={14}/> Envio de STL simplificado</p>
                    <p className="text-teal-300 flex items-center gap-2 text-sm"><CheckCircle size={14}/> Rastreio em tempo real</p>
                    <p className="text-teal-300 flex items-center gap-2 text-sm"><CheckCircle size={14}/> Agenda clínica integrada</p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};