import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Building, Crown, Save, Check, Ticket, ArrowUpCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ClinicSettings = () => {
  const { currentOrg, currentPlan, allPlans, updateOrganization, validateCoupon, currentUser } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'INFO' | 'SUBSCRIPTION'>('SUBSCRIPTION');
  const [clinicName, setClinicName] = useState(currentOrg?.name || '');
  
  // Subscription State
  const [upgradeCoupon, setUpgradeCoupon] = useState('');
  const [appliedUpgradeCoupon, setAppliedUpgradeCoupon] = useState<any>(null);

  // Status Check Helper
  const isTrial = currentOrg?.subscriptionStatus === 'TRIAL' || (!currentOrg?.subscriptionStatus && !!currentOrg?.trialEndsAt);
  const isPaid = currentOrg?.subscriptionStatus === 'ACTIVE';
  const displayStatus = currentOrg?.subscriptionStatus || (isTrial ? 'TRIAL' : 'N/A');

  // Fallback if currentPlan is missing but we have currentOrg.planId
  const activePlan = currentPlan || allPlans.find(p => p.id === currentOrg?.planId);

  const handleSaveInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, { name: clinicName });
      alert("Dados atualizados com sucesso!");
  };

  const handleValidateUpgradeCoupon = async () => {
    if (!upgradeCoupon) return;
    const coupon = await validateCoupon(upgradeCoupon, 'ANY');
    if (coupon) {
        setAppliedUpgradeCoupon(coupon);
        alert("Cupom válido!");
    } else {
        alert("Cupom inválido ou expirado.");
        setAppliedUpgradeCoupon(null);
    }
  };

  const handleUpgrade = async (planId: string) => {
      if (!currentOrg) return;
      navigate(`/subscribe?plan=${planId}${appliedUpgradeCoupon ? `&coupon=${appliedUpgradeCoupon.code}` : ''}`);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Configurações da Clínica</h1>
            <p className="text-slate-500">Gerencie sua assinatura e dados da clínica.</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
        <button onClick={() => setActiveTab('SUBSCRIPTION')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'SUBSCRIPTION' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}><Crown size={18} /> Assinatura</button>
        <button onClick={() => setActiveTab('INFO')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'INFO' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}><Building size={18} /> Dados da Clínica</button>
      </div>

      {/* INFO CONTENT */}
      {activeTab === 'INFO' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                     <Building size={20} className="text-teal-500" /> Dados Gerais
                 </h3>
                 <form onSubmit={handleSaveInfo} className="space-y-6">
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Clínica</label>
                         <input value={clinicName} onChange={e => setClinicName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
                     </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">ID do Usuário Admin</label>
                         <input value={currentUser?.id} disabled className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-slate-500 font-mono text-sm" />
                     </div>
                     <div className="pt-4 border-t border-slate-100 flex justify-end">
                         <button type="submit" className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg">Salvar Alterações</button>
                     </div>
                 </form>
             </div>
        </div>
      )}

      {/* SUBSCRIPTION CONTENT */}
      {activeTab === 'SUBSCRIPTION' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="text-slate-400 text-sm font-bold uppercase mb-1">Seu Plano Atual</p>
                          <h2 className="text-3xl font-bold">{activePlan?.name || 'Não Identificado'}</h2>
                          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-bold ${isPaid ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>
                             {isPaid ? <Check size={12}/> : <ArrowUpCircle size={12}/>}
                             STATUS: {displayStatus}
                          </div>
                      </div>
                      <div className="text-right">
                           <p className="text-3xl font-bold text-teal-400">
                               {activePlan ? `R$ ${activePlan.price.toFixed(2)}` : '--'}
                           </p>
                           <p className="text-sm text-slate-400">/mês</p>
                      </div>
                  </div>
                  {isTrial && (
                      <div className="mt-4 bg-orange-500/20 border border-orange-500/50 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-orange-200">Seu período de teste está ativo.</p>
                            <p className="text-xs text-orange-300/80">Aproveite para testar todas as funcionalidades.</p>
                          </div>
                          <button 
                              onClick={() => navigate(`/subscribe?plan=${activePlan?.id}`)} 
                              className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-lg flex items-center gap-2"
                          >
                              <Zap size={16} /> Ativar Assinatura Definitiva
                          </button>
                      </div>
                  )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpCircle className="text-teal-600"/> Upgrade de Plano (Clínica)</h3>
                  
                  {allPlans.length === 0 ? (
                      <div className="text-center text-slate-400 py-10">Carregando opções de planos...</div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          {/* FILTER ONLY CLINIC PLANS */}
                          {allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'CLINIC').map(plan => {
                              const isCurrentPlan = plan.id === activePlan?.id;
                              
                              if (isCurrentPlan && isPaid) return null;

                              return (
                                <div key={plan.id} className={`border rounded-xl p-4 transition-all flex flex-col ${isCurrentPlan ? 'border-teal-500 bg-teal-50/50 relative' : 'border-slate-200 hover:border-teal-300'}`}>
                                    {isCurrentPlan && <span className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">PLANO ATUAL</span>}
                                    
                                    <h4 className="font-bold text-slate-800">{plan.name}</h4>
                                    <p className="text-2xl font-bold text-teal-600 my-2">R$ {plan.price.toFixed(2)}</p>
                                    <ul className="text-xs text-slate-500 space-y-1 mb-4 flex-1">
                                        {plan.features.hasClinicModule && <li>• Gestão Completa</li>}
                                        <li>• Pedidos Ilimitados</li>
                                    </ul>
                                    <button 
                                        onClick={() => handleUpgrade(plan.id)} 
                                        className={`w-full py-2 font-bold rounded-lg transition-all text-sm ${isCurrentPlan ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-teal-600 hover:text-white'}`}
                                    >
                                        {isCurrentPlan ? 'Contratar Agora' : 'Mudar para este'}
                                    </button>
                                </div>
                              );
                          })}
                      </div>
                  )}

                  <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Ticket size={18} className="text-green-600"/> Cupom de Desconto</h4>
                      <div className="flex gap-2 max-w-md">
                          <input 
                              value={upgradeCoupon}
                              onChange={e => setUpgradeCoupon(e.target.value.toUpperCase())}
                              placeholder="Código Promocional"
                              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                              disabled={!!appliedUpgradeCoupon}
                          />
                          <button 
                             onClick={handleValidateUpgradeCoupon}
                             disabled={!!appliedUpgradeCoupon}
                             className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                              {appliedUpgradeCoupon ? 'Aplicado' : 'Validar'}
                          </button>
                      </div>
                      {appliedUpgradeCoupon && <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1"><Check size={12}/> Cupom {appliedUpgradeCoupon.code} aplicado!</p>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};