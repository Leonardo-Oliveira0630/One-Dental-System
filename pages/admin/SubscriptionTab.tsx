
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Crown, CheckCircle, Zap, ArrowUpCircle, Check, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/firebaseService';

export const SubscriptionTab = () => {
  const { currentPlan, currentOrg, allPlans, updateOrganization } = useApp();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !currentPlan || !currentOrg) return;
    setCouponLoading(true);
    setCouponMessage({ text: '', type: '' });
    try {
      const coupon = await api.apiValidateCoupon(couponCode, currentPlan.id);
      if (!coupon) {
        setCouponMessage({ text: 'Cupom inválido ou expirado.', type: 'error' });
      } else {
        if ((coupon.discountType === 'PERCENTAGE' && coupon.discountValue === 100) || coupon.discountType === 'FREE_FOREVER') {
          await updateOrganization(currentOrg.id, { subscriptionStatus: 'ACTIVE' });
          await api.apiUpdateCoupon(coupon.id, { usedCount: coupon.usedCount + 1 });
          setCouponMessage({ text: 'Cupom aplicado com sucesso! Seu acesso foi restabelecido.', type: 'success' });
        } else {
          setCouponMessage({ text: 'Este cupom é válido, mas não concede 100% de desconto. Utilize a página de assinatura para aplicá-lo.', type: 'warning' });
        }
      }
    } catch (error) {
      console.error(error);
      setCouponMessage({ text: 'Erro ao validar cupom.', type: 'error' });
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10"><Crown size={120} /></div>
         <div className="relative z-10">
            <p className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-1">Plano Atual</p>
            <h2 className="text-4xl font-black mb-4">{currentPlan?.name || 'Carregando...'}</h2>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-300">
               <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-green-500" /> {currentPlan?.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${currentPlan?.features.maxUsers} Usuários`}</div>
               <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-green-500" /> {currentPlan?.features.maxStorageGB}GB Armazenamento</div>
            </div>
            
            {currentOrg?.subscriptionStatus === 'OVERDUE' && (
              <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center justify-between">
                <div><p className="font-bold text-red-400">Plano Vencido</p><p className="text-xs">Regularize sua assinatura para continuar usando o sistema.</p></div>
                <button onClick={() => navigate('/subscribe')} className="px-6 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-900/40"><Zap size={16}/> REGULARIZAR</button>
              </div>
            )}

            {currentOrg?.subscriptionStatus === 'TRIAL' && (
              <div className="mt-6 p-4 bg-orange-500/20 border border-orange-500/50 rounded-2xl flex items-center justify-between">
                <div><p className="font-bold text-orange-400">Modo de Avaliação</p><p className="text-xs">Ative agora para manter o acesso.</p></div>
                <button onClick={() => navigate('/subscribe')} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/40"><Zap size={16}/> ATIVAR</button>
              </div>
            )}
         </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
         <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Tag className="text-blue-600" /> Aplicar Cupom</h3>
         <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <input 
              type="text" 
              placeholder="Código do Cupom" 
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none uppercase font-bold tracking-widest"
            />
            <button 
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {couponLoading ? 'Validando...' : 'Aplicar Cupom'}
            </button>
         </div>
         {couponMessage.text && (
           <p className={`mt-4 text-sm font-bold ${couponMessage.type === 'error' ? 'text-red-500' : couponMessage.type === 'success' ? 'text-green-500' : 'text-orange-500'}`}>
             {couponMessage.text}
           </p>
         )}
      </div>
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
         <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpCircle className="text-blue-600" /> Upgrade de Plano</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'LAB').map(plan => (
              <div key={plan.id} className={`p-6 rounded-2xl border-2 transition-all flex flex-col ${plan.id === currentOrg?.planId ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 hover:border-blue-200'}`}>
                <h4 className="font-bold text-slate-800 uppercase tracking-tight mb-1">{plan.name}</h4>
                <p className="text-2xl font-black text-slate-900 mb-4">R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-400 font-normal">/mês</span></p>
                <ul className="text-xs space-y-2 text-slate-500 flex-1 mb-6">
                   <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> {plan.features.maxUsers === -1 ? 'Ilimitados' : plan.features.maxUsers} Usuários</li>
                   <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> {plan.features.maxStorageGB}GB Armazenamento</li>
                </ul>
                <button 
                  onClick={() => navigate(`/subscribe?plan=${plan.id}`)}
                  disabled={plan.id === currentOrg?.planId}
                  className={`w-full py-2.5 rounded-xl font-bold transition-all ${plan.id === currentOrg?.planId ? 'bg-blue-100 text-blue-600' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                >
                  {plan.id === currentOrg?.planId ? 'Plano Atual' : 'Contratar'}
                </button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};
