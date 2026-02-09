
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, CreditCard, Loader2, AlertTriangle, ArrowLeft, Mail, FileText, ExternalLink, Stethoscope, Store, RefreshCw, Ticket, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserRole, Coupon } from '../types';

export const Subscribe = () => {
    const { currentOrg, createSubscription, allPlans, currentUser, checkSubscriptionStatus, validateCoupon } = useApp();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const initialPlanId = searchParams.get('plan') || currentOrg?.planId || '';
    const initialCoupon = searchParams.get('coupon') || '';

    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [billingEmail, setBillingEmail] = useState(currentUser?.email || '');
    const [error, setError] = useState('');
    
    // Coupon States
    const [couponInput, setCouponInput] = useState(initialCoupon);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    
    // State para o link de pagamento gerado
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    // Determine target audience based on Org Type or User Role fallback
    const targetAudience = currentOrg?.orgType || (currentUser?.role === UserRole.CLIENT ? 'CLINIC' : 'LAB');

    const displayPlans = allPlans.filter(p => p.isPublic && p.active && p.targetAudience === targetAudience);

    useEffect(() => {
        if (currentUser?.email && !billingEmail) {
            setBillingEmail(currentUser.email);
        }
        if (initialCoupon) {
            handleApplyCoupon(initialCoupon);
        }
    }, [currentUser, initialCoupon]);

    // Set default selected plan if none selected or if selected is not in list
    useEffect(() => {
        if (displayPlans.length > 0 && !displayPlans.find(p => p.id === selectedPlanId)) {
            setSelectedPlanId(displayPlans[0].id);
        }
    }, [displayPlans, selectedPlanId]);

    const handleApplyCoupon = async (codeToUse?: string) => {
        const code = codeToUse || couponInput;
        if (!code) return;
        
        setIsValidatingCoupon(true);
        try {
            const coupon = await validateCoupon(code, selectedPlanId);
            if (coupon) {
                setAppliedCoupon(coupon);
                setCouponInput(coupon.code);
            } else {
                alert("Cupom inválido, expirado ou não aplicável a este plano.");
                setAppliedCoupon(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    if (!currentOrg) return null;

    const handleSubscribe = async () => {
        const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');

        if (!cleanCpfCnpj) { setError("Informe CPF ou CNPJ."); return; }
        if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) { setError("Documento inválido (CPF 11 / CNPJ 14)."); return; }
        
        if (!billingEmail || !billingEmail.trim().includes('@')) { 
            setError("O campo de Email é obrigatório e deve ser válido."); 
            return; 
        }

        setLoading(true);
        setError('');
        setGeneratedLink(null);

        try {
            const result = await createSubscription(
                currentOrg.id, 
                selectedPlanId, 
                billingEmail.trim(), 
                currentOrg.name, 
                cleanCpfCnpj,
                appliedCoupon?.code // Passamos o cupom se houver
            );

            if (result && result.success) {
                if (result.isMock) {
                    alert("Ambiente de Teste: Plano ativado (Simulação).");
                    navigate('/dashboard');
                } else if (result.paymentLink) {
                    setGeneratedLink(result.paymentLink);
                    window.open(result.paymentLink, '_blank');
                } else {
                    setError("Plano ativado, mas link de pagamento não gerado. Verifique seu painel.");
                    navigate('/dashboard');
                }
            } else {
                setError(result?.message || "O sistema retornou uma resposta inválida. Tente novamente.");
            }
        } catch (err: any) {
            console.error("Erro CRÍTICO no pagamento:", err);
            const message = err.message || "Erro de conexão.";
            setError(message.replace('FirebaseError: ', '').replace('Cloud Function Error: ', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPayment = async () => {
        if (!currentOrg) return;
        setVerifying(true);
        try {
            const result = await checkSubscriptionStatus(currentOrg.id);
            if (result.status === 'ACTIVE') {
                alert("Pagamento confirmado! Sua assinatura está ativa.");
                navigate('/dashboard');
            } else {
                alert("O pagamento ainda não foi identificado. Aguarde alguns instantes e tente novamente.");
            }
        } catch (error: any) {
            console.error("Erro ao verificar:", error);
            alert("Erro ao verificar pagamento: " + error.message);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-5xl w-full">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 font-bold">
                    <ArrowLeft size={20}/> Voltar
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Finalizar Assinatura</h1>
                    <p className="text-slate-500 flex items-center justify-center gap-2 font-medium">
                        {targetAudience === 'CLINIC' ? <Stethoscope size={16} className="text-teal-500"/> : <Store size={16} className="text-blue-500"/>}
                        Planos para {targetAudience === 'CLINIC' ? 'Clínicas Odontológicas' : 'Laboratórios de Prótese'}
                    </p>
                </div>

                {/* SELEÇÃO DE PLANOS */}
                {!generatedLink && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {displayPlans.length === 0 ? (
                            <div className="col-span-3 text-center py-12 text-slate-400 border-2 border-dashed rounded-[32px] bg-white">
                                Nenhum plano disponível para este perfil no momento.
                            </div>
                        ) : (
                            displayPlans.map(plan => (
                                <div 
                                    key={plan.id}
                                    className={`bg-white p-6 rounded-[32px] border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? 'border-blue-600 shadow-xl ring-4 ring-blue-100 scale-105 z-10' : 'border-slate-100 shadow-sm opacity-80 hover:opacity-100'}`} 
                                    onClick={() => setSelectedPlanId(plan.id)}
                                >
                                    <h3 className="font-black text-lg text-slate-800 uppercase tracking-wide">{plan.name}</h3>
                                    <p className="text-3xl font-black text-slate-900 mt-2">
                                        {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                                        <span className="text-sm text-slate-400 font-normal">/mês</span>
                                    </p>
                                    <ul className="mt-6 space-y-3 text-xs font-bold text-slate-500 uppercase tracking-tight">
                                        <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-green-500"/> {plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</li>
                                        <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-green-500"/> {plan.features.maxStorageGB}GB Storage</li>
                                        {plan.features.hasStoreModule && <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-green-500"/> Loja Virtual</li>}
                                        {plan.features.hasClinicModule && <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-green-500"/> Gestão Clínica</li>}
                                    </ul>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 max-w-lg mx-auto overflow-hidden relative">
                    
                    {/* ESTADO: LINK GERADO (SUCESSO) */}
                    {generatedLink ? (
                        <div className="text-center space-y-6 animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <CheckCircle size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fatura Gerada!</h3>
                                <p className="text-slate-500 text-sm mt-2 font-medium leading-relaxed">
                                    Sua assinatura foi criada com sucesso. Para ativar sua conta imediatamente, acesse o link de pagamento abaixo.
                                </p>
                            </div>
                            
                            <a 
                                href={generatedLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-center hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <CreditCard size={24} /> ABRIR FATURA DE PAGAMENTO <ExternalLink size={18} />
                            </a>

                            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-xs text-amber-800 text-left space-y-2 font-medium">
                                <p className="font-black uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} className="text-amber-600"/> Importante:</p>
                                <p>O Asaas pode levar alguns minutos para processar o pagamento. Se já pagou e o sistema não liberou, use o botão de validação manual abaixo.</p>
                            </div>

                            <button 
                                onClick={handleVerifyPayment}
                                disabled={verifying}
                                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 font-black rounded-2xl hover:bg-slate-50 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {verifying ? <Loader2 className="animate-spin" /> : <><RefreshCw size={20} className="text-blue-600"/> VALIDAR PAGAMENTO AGORA</>}
                            </button>

                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest mt-4"
                            >
                                Pular e ir para o Painel
                            </button>
                        </div>
                    ) : (
                        /* ESTADO: FORMULÁRIO */
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                                <CreditCard className="text-blue-600" /> Dados de Faturamento
                            </h3>
                            
                            <div className="bg-slate-50 p-5 rounded-3xl text-sm text-slate-600 border border-slate-100">
                                <p className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-slate-400">Plano Escolhido:</span> <span className="font-black text-slate-800">{displayPlans.find(p => p.id === selectedPlanId)?.name}</span></p>
                                <p className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-slate-400">Mensalidade:</span> <span className="font-black text-blue-600 text-lg">R$ {displayPlans.find(p => p.id === selectedPlanId)?.price.toFixed(2) || '0.00'}</span></p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail para Nota Fiscal</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input 
                                            type="email"
                                            required
                                            value={billingEmail}
                                            onChange={e => setBillingEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                            placeholder="faturamento@empresa.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Documento (CPF ou CNPJ)</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input 
                                            value={cpfCnpj}
                                            onChange={e => setCpfCnpj(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                            placeholder="Somente números"
                                        />
                                    </div>
                                </div>

                                {/* RESTAURAÇÃO: SEÇÃO DE CUPOM */}
                                <div className="pt-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tem um Cupom?</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Ticket className="absolute left-4 top-3 text-slate-400" size={18} />
                                            <input 
                                                value={couponInput}
                                                onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                                placeholder="CÓDIGO"
                                                disabled={!!appliedCoupon}
                                                className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-black tracking-widest text-sm"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => appliedCoupon ? setAppliedCoupon(null) : handleApplyCoupon()}
                                            className={`px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${appliedCoupon ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                        >
                                            {isValidatingCoupon ? <Loader2 size={16} className="animate-spin" /> : appliedCoupon ? 'REMOVER' : 'APLICAR'}
                                        </button>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-100 p-2 rounded-xl text-green-700 text-[10px] font-black uppercase animate-in slide-in-from-top-1">
                                            <Check size={14}/> Cupom Ativado: {appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}% OFF` : 'Especial'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-xs rounded-2xl flex items-start gap-3 border border-red-100 font-bold leading-relaxed">
                                    <AlertTriangle size={18} className="shrink-0"/> 
                                    <span>{error}</span>
                                </div>
                            )}

                            <button 
                                onClick={handleSubscribe}
                                disabled={loading || displayPlans.length === 0}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><CreditCard /> GERAR PAGAMENTO AGORA</>}
                            </button>
                            <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Ambiente de Transação Segura via Asaas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
