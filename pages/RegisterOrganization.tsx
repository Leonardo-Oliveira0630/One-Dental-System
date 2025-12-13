import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building, User, Mail, Lock, CheckCircle, ShieldCheck, Stethoscope, Store, Activity, Database, Users, Ticket, Loader2 } from 'lucide-react';
import { Coupon } from '../types';

export const RegisterOrganization = () => {
  const { registerOrganization, registerDentist, allPlans, validateCoupon } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [regType, setRegType] = useState<'LAB' | 'DENTIST'>('LAB');
  
  // Separated State for clarity
  const [labName, setLabName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [planId, setPlanId] = useState('');
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Filter plans based on Registration Type (LAB vs CLINIC)
  const publicPlans = allPlans.filter(p => p.isPublic && p.active && (p.targetAudience === (regType === 'LAB' ? 'LAB' : 'CLINIC')));
  
  // Use displayPlans for rendering
  const displayPlans = publicPlans; 

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    const selectedPlanId = planId || (displayPlans.length > 0 ? displayPlans[0].id : '');
    const coupon = await validateCoupon(couponCode, selectedPlanId);
    if (coupon) {
        setAppliedCoupon(coupon);
        alert("Cupom aplicado com sucesso!");
    } else {
        alert("Cupom inválido ou expirado.");
        setAppliedCoupon(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // If no plan selected, pick the first one available
      const selectedPlanId = planId || (displayPlans.length > 0 ? displayPlans[0].id : '');
      if (!selectedPlanId) {
          throw new Error("Nenhum plano de assinatura disponível.");
      }

      const plan = displayPlans.find(p => p.id === selectedPlanId);
      
      let trialEnd = undefined;
      if (plan && plan.trialDays && plan.trialDays > 0) {
          const d = new Date();
          d.setDate(d.getDate() + plan.trialDays);
          if (appliedCoupon && appliedCoupon.discountType === 'TRIAL_EXT') {
              d.setDate(d.getDate() + appliedCoupon.discountValue);
          }
          trialEnd = d;
      }
      if (appliedCoupon && appliedCoupon.discountType === 'FREE_FOREVER') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 10); trialEnd = d;
      }

      if (regType === 'LAB') {
          await registerOrganization(email, password, ownerName, labName, selectedPlanId, trialEnd, appliedCoupon?.code);
          navigate('/dashboard');
      } else {
          // Register Dentist (Now includes Plan & Org creation)
          await registerDentist(email, password, ownerName, clinicName || 'Consultório Particular', selectedPlanId, trialEnd, appliedCoupon?.code);
          navigate('/store'); // Goes to store (or clinic dashboard if feature enabled)
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao registrar: " + (err.message || "Tente novamente."));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-5xl p-8 rounded-3xl shadow-2xl border border-slate-700 flex flex-col lg:flex-row gap-8">
        
        <div className="flex-1 space-y-6">
            <div className="text-left mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-black/20 ${regType === 'LAB' ? 'bg-blue-600' : 'bg-teal-600'}`}>
                    {regType === 'LAB' ? <ShieldCheck size={32} className="text-white" /> : <Stethoscope size={32} className="text-white" />}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Crie sua Conta</h1>
                <p className="text-slate-400">
                    {regType === 'LAB' ? 'Gestão completa para seu Laboratório.' : 'Gestão clínica e pedidos para Dentistas.'}
                </p>
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-700">
                <button type="button" onClick={() => { setRegType('LAB'); setPlanId(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${regType === 'LAB' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Building size={18} /> Sou Laboratório</button>
                <button type="button" onClick={() => { setRegType('DENTIST'); setPlanId(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${regType === 'DENTIST' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Stethoscope size={18} /> Sou Dentista</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regType === 'LAB' ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Laboratório</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 text-slate-500" size={18}/>
                                <input required value={labName} onChange={e => setLabName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-600" placeholder="Ex: Laboratório Smile" />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Clínica</label>
                            <div className="relative">
                                <Store className="absolute left-3 top-3 text-slate-500" size={18}/>
                                <input required value={clinicName} onChange={e => setClinicName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-teal-500 outline-none placeholder-slate-600" placeholder="Ex: Clínica Sorriso" />
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Seu Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-500" size={18}/>
                            <input required value={ownerName} onChange={e => setOwnerName(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="Ex: João da Silva" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email de Acesso</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-500" size={18}/>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="seu@email.com" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-500" size={18}/>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={`w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-2 ${regType === 'LAB' ? 'focus:ring-blue-500' : 'focus:ring-teal-500'}`} placeholder="••••••••" minLength={6} />
                    </div>
                </div>

                {/* Cupom Section Available for BOTH */}
                <div className="flex gap-2 items-end pt-2">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cupom de Desconto</label>
                        <div className="relative">
                            <Ticket className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="Código Promocional" disabled={!!appliedCoupon} />
                        </div>
                    </div>
                    <button type="button" onClick={handleApplyCoupon} disabled={!!appliedCoupon || !couponCode} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-600 disabled:opacity-50 h-[42px]">{appliedCoupon ? 'Aplicado' : 'Validar'}</button>
                </div>
                {appliedCoupon && <div className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> {appliedCoupon.discountType === 'FREE_FOREVER' ? 'Acesso Gratuito Vitalício' : appliedCoupon.discountType === 'TRIAL_EXT' ? `+${appliedCoupon.discountValue} dias de teste` : 'Desconto aplicado'}</div>}

                {error && <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm text-center border border-red-500/30 font-medium">{error}</div>}

                <button type="submit" disabled={loading} className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 text-white mt-4 flex items-center justify-center gap-2 ${regType === 'LAB' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50' : 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/50'}`}>
                    {loading ? 'Processando...' : 'Finalizar Cadastro'}
                </button>
                
                <div className="text-center pt-2">
                    <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors">Já tem conta? <span className="font-bold underline">Fazer Login</span></Link>
                </div>
            </form>
        </div>

        {/* Painel Informativo Direito */}
        <div className="flex-1 space-y-4">
            <div className={`flex items-center gap-2 text-white mb-4 ${regType === 'LAB' ? 'text-blue-100' : 'text-teal-100'}`}>
                <Activity className={regType === 'LAB' ? 'text-blue-500' : 'text-teal-500'}/>
                <h3 className="text-xl font-bold">Escolha seu Plano</h3>
            </div>
            
            {displayPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-700 rounded-2xl">
                    <Loader2 className="animate-spin mb-2 text-blue-500" />
                    <p>Carregando planos para {regType === 'LAB' ? 'Laboratórios' : 'Dentistas'}...</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayPlans.map(plan => (
                        <div key={plan.id} onClick={() => setPlanId(plan.id)} className={`cursor-pointer border-2 rounded-2xl p-5 transition-all relative overflow-hidden group ${planId === plan.id || (!planId && plan.id === displayPlans[0].id) ? (regType === 'LAB' ? 'border-blue-500 bg-slate-800' : 'border-teal-500 bg-slate-800') + ' shadow-lg shadow-black/20' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}`}>
                            {plan.trialDays && plan.trialDays > 0 && (<div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm">{plan.trialDays} DIAS GRÁTIS</div>)}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-white font-bold uppercase tracking-wider text-sm">{plan.name}</h4>
                                    <p className={`text-2xl font-bold mt-1 ${regType === 'LAB' ? 'text-blue-400' : 'text-teal-400'}`}>R$ {plan.price.toFixed(2)}<span className="text-sm text-slate-500 font-normal">/mês</span></p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${planId === plan.id || (!planId && plan.id === displayPlans[0].id) ? (regType === 'LAB' ? 'border-blue-500 bg-blue-500' : 'border-teal-500 bg-teal-500') : 'border-slate-600'}`}>
                                    {(planId === plan.id || (!planId && plan.id === displayPlans[0].id)) && <CheckCircle size={14} className="text-white" />}
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-400">
                                {regType === 'LAB' ? (
                                    <>
                                        <div className="flex items-center gap-2"><Users size={14} className="text-blue-500"/>{plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</div>
                                        <div className="flex items-center gap-2"><Database size={14} className="text-blue-500"/>{plan.features.maxStorageGB} GB de Armazenamento</div>
                                        <div className={`flex items-center gap-2 ${plan.features.hasStoreModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}><Store size={14} className={plan.features.hasStoreModule ? 'text-green-500' : 'text-slate-600'}/>Loja Virtual</div>
                                        <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}><Activity size={14} className={plan.features.hasClinicModule ? 'text-green-500' : 'text-slate-600'}/>Gestão Clínica (Demo)</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2"><CheckCircle size={14} className="text-teal-500"/>Pedidos Online Ilimitados</div>
                                        <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}><Activity size={14} className={plan.features.hasClinicModule ? 'text-green-500' : 'text-slate-600'}/>Gestão de Consultório</div>
                                        <div className={`flex items-center gap-2 ${plan.features.hasClinicModule ? 'text-slate-300' : 'text-slate-600 line-through'}`}><Users size={14} className={plan.features.hasClinicModule ? 'text-green-500' : 'text-slate-600'}/>Cadastro de Pacientes</div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
