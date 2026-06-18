import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building, Crown, Save, Check, Ticket, ArrowUpCircle, Zap,
  Receipt, ExternalLink, Calendar, CreditCard, Landmark, Banknote, HelpCircle,
  CheckCircle, RefreshCw, X, Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/firebaseService';

export const ClinicSettings = () => {
  const { currentOrg, currentPlan, allPlans, updateOrganization, validateCoupon, currentUser, getSaaSInvoices } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'INFO' | 'SUBSCRIPTION'>('SUBSCRIPTION');
  const [clinicName, setClinicName] = useState(currentOrg?.name || '');
  
  // Subscription State
  const [upgradeCoupon, setUpgradeCoupon] = useState('');
  const [appliedUpgradeCoupon, setAppliedUpgradeCoupon] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Status Check Helper
  const isTrial = currentOrg?.subscriptionStatus === 'TRIAL' || (!currentOrg?.subscriptionStatus && !!currentOrg?.trialEndsAt);
  const isPaid = currentOrg?.subscriptionStatus === 'ACTIVE';
  const displayStatus = currentOrg?.subscriptionStatus || (isTrial ? 'TRIAL' : 'N/A');

  // Fallback if currentPlan is missing but we have currentOrg.planId
  const activePlan = currentPlan || allPlans.find(p => p.id === currentOrg?.planId);
  const isFreePlan = !activePlan || activePlan.id === 'basic' || activePlan.price === 0;

  const isTrialActive = currentOrg?.trialEndsAt && (() => {
    let trialDate: Date;
    if (typeof currentOrg.trialEndsAt === 'object' && 'seconds' in (currentOrg.trialEndsAt as any)) {
      trialDate = new Date((currentOrg.trialEndsAt as any).seconds * 1000);
    } else if (currentOrg.trialEndsAt instanceof Date) {
      trialDate = currentOrg.trialEndsAt;
    } else {
      trialDate = new Date(currentOrg.trialEndsAt);
    }
    return new Date() < trialDate;
  })();

  useEffect(() => {
     if (currentOrg?.id && !isFreePlan) {
         setLoadingInvoices(true);
         getSaaSInvoices(currentOrg.id)
            .then(data => setInvoices(data || []))
            .catch(err => console.error(err))
            .finally(() => setLoadingInvoices(false));
     }
  }, [currentOrg?.id, isFreePlan]);

  const handleSaveInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, { name: clinicName });
      alert("Dados atualizados com sucesso!");
  };

  const handleValidateUpgradeCoupon = async () => {
    if (!upgradeCoupon || !currentOrg) return;
    try {
      // Validate coupon for general audience or target clinic
      const coupon = await api.apiValidateCoupon(upgradeCoupon, activePlan?.id || 'basic');
      if (coupon) {
          if ((coupon.discountType === 'PERCENTAGE' && coupon.discountValue === 100) || coupon.discountType === 'FREE_FOREVER') {
              await updateOrganization(currentOrg.id, { subscriptionStatus: 'ACTIVE' });
              await api.apiUpdateCoupon(coupon.id, { usedCount: coupon.usedCount + 1 });
              alert("Cupom aplicado com sucesso! Seu plano foi ativado.");
              window.location.reload();
          } else {
              setAppliedUpgradeCoupon(coupon);
              alert("Cupom de desconto válido! O desconto será aplicado na finalização do upgrade.");
          }
      } else {
          alert("Cupom inválido ou expirado.");
          setAppliedUpgradeCoupon(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao aplicar cupom.");
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
              <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Crown size={120} /></div>
                  <div className="relative z-10">
                      <p className="text-teal-400 font-bold uppercase text-xs tracking-widest mb-1">Plano Atual</p>
                      <h2 className="text-4xl font-black mb-4">{activePlan?.name || 'Carregando...'}</h2>
                      <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-300 mb-6">
                          <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> {activePlan?.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${activePlan?.features.maxUsers || 1} Usuários`}</div>
                          <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> {activePlan?.features.maxStorageGB || 1}GB Armazenamento</div>
                          <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-400" /> {activePlan?.features.hasClinicModule ? 'Prontuário & Agenda Inclusos' : 'Módulo de Pedidos'}</div>
                      </div>

                      <div className="flex items-baseline gap-2 border-t border-white/10 pt-4">
                          <span className="text-3xl font-black text-teal-400">R$ {activePlan?.price.toFixed(2) || '0,00'}</span>
                          <span className="text-xs text-slate-400">/mês</span>
                      </div>

                      {currentOrg?.subscriptionStatus === 'OVERDUE' && (
                          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center justify-between">
                              <div>
                                  <p className="font-bold text-red-400">Plano Vencido</p>
                                  <p className="text-xs">Regularize sua assinatura clínica para liberar todos os recursos do sistema.</p>
                              </div>
                              <button onClick={() => navigate('/subscribe')} className="px-6 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-900/40">
                                  <Zap size={16}/> REGULARIZAR
                              </button>
                          </div>
                      )}

                      {(currentOrg?.subscriptionStatus === 'FREE' || isFreePlan) && (
                          <div className="mt-6 p-4 bg-teal-500/20 border border-teal-500/50 rounded-2xl flex items-center justify-between">
                              <div>
                                  <p className="font-bold text-teal-400">Conta no Plano Básico Conectado</p>
                                  <p className="text-xs">Você está utilizando a licença para envio de requisições de prótese ilimitadas.</p>
                              </div>
                              <div className="p-2 bg-teal-600 text-white rounded-xl">
                                  <Crown size={20} />
                              </div>
                          </div>
                      )}

                      {(currentOrg?.subscriptionStatus === 'TRIAL' || isTrialActive) && currentOrg?.subscriptionStatus !== 'FREE' && !isFreePlan && (
                          <div className="mt-6 p-4 bg-orange-500/20 border border-orange-500/50 rounded-2xl flex items-center justify-between">
                              <div>
                                  <p className="font-bold text-orange-400 font-sans tracking-tight">Período de Avaliação Ativo</p>
                                  <p className="text-xs text-slate-300">Sua conta clínica está liberada para testes. Acesse a área de pagamento para ativar de forma definitiva.</p>
                              </div>
                              <button onClick={() => navigate('/subscribe')} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/40">
                                  <Zap size={16}/> ATIVAR ASSINATURA
                              </button>
                          </div>
                      )}

                      {currentOrg?.subscriptionStatus === 'PENDING' && !isTrialActive && (
                          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center justify-between">
                              <div>
                                  <p className="font-bold text-red-400 font-sans tracking-tight">Faturamento Pendente</p>
                                  <p className="text-xs text-slate-300">Seu período de testes expirou e a primeira mensalidade está aberta. Regularize para reativar sua agenda e finanças.</p>
                              </div>
                              <button onClick={() => navigate('/subscribe')} className="px-6 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-900/40">
                                  <Zap size={16}/> PAGAR AGORA
                              </button>
                          </div>
                      )}
                  </div>
              </div>

              {/* Upgrade list */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <ArrowUpCircle className="text-teal-600"/> {isFreePlan ? 'Adquirir / Upgrade de Plano' : 'Alterar Assinatura Odontológica'}
                  </h3>
                  
                  {allPlans.length === 0 ? (
                      <div className="text-center text-slate-400 py-10">Carregando opções de planos...</div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          {/* FILTER ONLY CLINIC PLANS */}
                          {allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'CLINIC').map(plan => {
                              const isCurrentPlan = plan.id === activePlan?.id;
                              
                              if (isCurrentPlan && isPaid && !isFreePlan) return null;

                              return (
                                <div key={plan.id} className={`border rounded-xl p-4 transition-all flex flex-col ${isCurrentPlan ? 'border-teal-500 bg-teal-50/50 relative' : 'border-slate-200 hover:border-teal-300'}`}>
                                    {isCurrentPlan && <span className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">PLANO ATUAL</span>}
                                    
                                    <h4 className="font-bold text-slate-800 uppercase tracking-tight">{plan.name}</h4>
                                    <p className="text-2xl font-black text-teal-600 my-2">R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-400 font-normal">/mês</span></p>
                                    
                                    <ul className="text-xs text-slate-500 space-y-2 mb-6 flex-1 pt-2">
                                        <li className="flex items-center gap-1 text-slate-600 font-medium">• Max. Usuários: {plan.features.maxUsers === -1 ? 'Ilimitados' : plan.features.maxUsers}</li>
                                        <li className="flex items-center gap-1 text-slate-600 font-medium">• Armazenamento: {plan.features.maxStorageGB}GB</li>
                                        {plan.features.hasClinicModule && <li className="text-teal-700 font-bold flex items-center gap-1">✔ Inclui Prontuário, Agenda e CRM</li>}
                                        {plan.features.hasStoreModule && <li className="text-slate-600 font-medium">• Acesso completo à Loja de Próteses</li>}
                                    </ul>
                                    <button 
                                        onClick={() => handleUpgrade(plan.id)} 
                                        disabled={isCurrentPlan && (currentOrg?.subscriptionStatus === 'ACTIVE' || currentOrg?.subscriptionStatus === 'FREE')}
                                        className={`w-full py-2.5 font-bold rounded-xl transition-all text-sm shadow-sm ${isCurrentPlan ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-900 text-white hover:bg-teal-600'}`}
                                    >
                                        {isCurrentPlan ? 'Seu Plano Atual' : 'Contratar'}
                                    </button>
                                </div>
                              );
                          })}
                      </div>
                  )}

                  <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Ticket size={18} className="text-emerald-600"/> Cupom de Desconto / Ativação</h4>
                      <p className="text-xs text-slate-500 mb-4">Insira um código de cupom promocional para ativar 100% de desconto ou obter preços especiais.</p>
                      <div className="flex gap-2 max-w-md">
                          <input 
                              value={upgradeCoupon}
                              onChange={e => setUpgradeCoupon(e.target.value.toUpperCase())}
                              placeholder="CÓDIGO DO CUPOM"
                              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 uppercase font-black tracking-widest text-sm"
                              disabled={!!appliedUpgradeCoupon}
                          />
                          <button 
                             onClick={handleValidateUpgradeCoupon}
                             disabled={!upgradeCoupon.trim() || !!appliedUpgradeCoupon}
                             className="px-6 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                          >
                              {appliedUpgradeCoupon ? 'Aplicado' : 'Validar'}
                          </button>
                      </div>
                      {appliedUpgradeCoupon && (
                          <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1">
                              <Check size={12}/> Cupom {appliedUpgradeCoupon.code} pronto para aplicação!
                          </p>
                      )}
                  </div>
              </div>

              {/* Invoice section for paid plans */}
              {!isFreePlan && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
                     <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Receipt className="text-teal-600" /> Histórico de Faturas e Histórico Financeiro da Assinatura
                     </h3>
                     
                     {loadingInvoices ? (
                         <div className="flex items-center gap-2 py-4">
                             <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-500 border-t-transparent"></div>
                             <p className="text-sm font-bold text-slate-400">Buscando faturas Asaas integradas...</p>
                         </div>
                     ) : invoices.length === 0 ? (
                         <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <p className="text-sm font-bold text-slate-500 mb-1">Nenhuma fatura pendente ou liquidada encontrada</p>
                             <p className="text-xs text-slate-400">As faturas Asaas emitidas para o CNPJ/CPF cadastrado constarão nesta aba automaticamente.</p>
                         </div>
                     ) : (
                         <div className="space-y-4">
                             {invoices.map((inv: any) => {
                                 const isInvoicePaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'PAYMENT_RECEIVED_IN_CASH_CONFIRMED'].includes(inv.status);
                                 const isOverdue = inv.status === 'OVERDUE';
                                 const isDeleted = inv.status === 'DELETED' || inv.status === 'REFUNDED';
                                 if (isDeleted) return null;

                                 return (
                                     <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 gap-4">
                                         <div className="flex items-center gap-4">
                                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isInvoicePaid ? 'bg-emerald-100 text-emerald-600' : isOverdue ? 'bg-red-100 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
                                                 {inv.billingType === 'PIX' ? <Banknote size={24} /> : inv.billingType === 'CREDIT_CARD' ? <CreditCard size={24} /> : <Landmark size={24}/>}
                                             </div>
                                             <div>
                                                 <p className="font-bold text-slate-800 flex items-center gap-2">
                                                     Fatura {inv.invoiceNumber || inv.id?.split('_').pop()}
                                                     <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${isInvoicePaid ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                                                         {isInvoicePaid ? 'Pago / Liquidado' : isOverdue ? 'Atrasado' : 'Processando'}
                                                     </span>
                                                 </p>
                                                 <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 mt-1">
                                                     <p className="flex items-center gap-1"><Calendar size={12}/> Vencimento: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                                     <p className="flex items-center gap-1"><Tag size={12}/> {inv.billingType === 'PIX' ? 'Pix' : inv.billingType === 'CREDIT_CARD' ? 'Cartão de Crédito' : inv.billingType === 'BOLETO' ? 'Boleto Bancário' : 'Meio Sob Consulta'}</p>
                                                     {isInvoicePaid && inv.paymentDate && (
                                                        <p className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> Pago em: {new Date(inv.paymentDate).toLocaleDateString('pt-BR')}</p>
                                                     )}
                                                 </div>
                                             </div>
                                         </div>
                                         
                                         <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-200 pt-4 md:pt-0">
                                             <div className="text-right">
                                                 <p className="text-[10px] font-black uppercase text-slate-400">Total Líquido</p>
                                                 <p className="font-bold text-slate-800 text-lg">R$ {parseFloat(inv.value).toFixed(2)}</p>
                                             </div>
                                             {!isInvoicePaid && inv.invoiceUrl && (
                                                 <a 
                                                     href={inv.invoiceUrl} 
                                                     target="_blank" 
                                                     rel="noopener noreferrer"
                                                     className="px-4 py-2 bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-slate-900/20"
                                                 >
                                                     Pagar Agora <ExternalLink size={14}/>
                                                 </a>
                                             )}
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};