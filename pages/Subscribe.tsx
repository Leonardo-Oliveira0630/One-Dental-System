
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
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [billingEmail, setBillingEmail] = useState(currentUser?.email || '');
    const [error, setError] = useState('');
    const [couponCode, setCouponCode] = useState(initialCoupon);
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
    }, [currentUser]);

    // Set default selected plan if none selected or if selected is not in list
    useEffect(() => {
        if (displayPlans.length > 0 && !displayPlans.find(p => p.id === selectedPlanId)) {
            setSelectedPlanId(displayPlans[0].id);
        }
    }, [displayPlans, selectedPlanId]);

    // Auto-validate coupon if coming from URL
    useEffect(() => {
        if (initialCoupon) {
            handleApplyCoupon(initialCoupon);
        }
    }, [initialCoupon]);

    if (!currentOrg) return null;

    const handleApplyCoupon = async (codeOverride?: string) => {
        const codeToUse = codeOverride || couponCode;
        if (!codeToUse) return;
        
        setValidatingCoupon(true);
        try {
            const coupon = await validateCoupon(codeToUse.toUpperCase(), selectedPlanId || 'ANY');
            if (coupon) {
                setAppliedCoupon(coupon);
                setCouponCode(coupon.code);
            } else {
                alert("Cupom inválido para este plano ou expirado.");
                setAppliedCoupon(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setValidatingCoupon(false);
        }
    };

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
            console.log("Iniciando processo de assinatura...", { 
                orgId: currentOrg.id, 
                plan: selectedPlanId,
                coupon: appliedCoupon?.code
            });

            // O backend precisa suportar o envio do cupom se quisermos o desconto real na fatura do Asaas
            const result = await createSubscription(
                currentOrg.id, 
                selectedPlanId, 
                billingEmail.trim(), 
                currentOrg.name, 
                cleanCpfCnpj
            );

            console.log("Resultado da Assinatura:", result);

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
                setError("O sistema retornou uma resposta inválida. Tente novamente ou contate o suporte.");
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
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Finalizar Assinatura</h1>
                    <p className="text-slate-500 flex items-center justify-center gap-2">
                        {targetAudience === 'CLINIC' ? <Stethoscope size={16}/> : <Store size={16}/>}
                        Planos para {targetAudience === 'CLINIC' ? 'Clínicas' : 'Laboratórios'}
                    </p>
                </div>

                {/* SELEÇÃO DE PLANOS (Desativada se já gerou link) */}
                {!generatedLink && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {displayPlans.length === 0 ? (
                            <div className="col-span-3 text-center py-8 text-slate-400 border-2 border-dashed rounded-xl">
                                Nenhum plano disponível para este perfil no momento.
                            </div>
                        ) : (
                            displayPlans.map(plan => (
                                <div 
                                    key={plan.id}
                                    className={`bg-white p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? 'border-blue-600 shadow-xl ring-2 ring-blue-100 scale-105 z-10' : 'border-slate-100 shadow-sm opacity-80 hover:opacity-100'}`} 
                                    onClick={() => {
                                        setSelectedPlanId(plan.id);
                                        setAppliedCoupon(null); // Reset coupon if plan changes as it might not be applicable
                                    }}
                                >
                                    <h3 className="font-bold text-lg text-slate-800 uppercase tracking-wide">{plan.name}</h3>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">
                                        {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                                        <span className="text-sm text-slate-400 font-normal">/mês</span>
                                    </p>
                                    <ul className="mt-4 space-y-2 text-sm text-slate-600">
                                        <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> {plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</li>
                                        <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> {plan.features.maxStorageGB}GB Armazenamento</li>
                                        {plan.features.hasStoreModule && <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Loja Virtual</li>}
                                        {plan.features.hasClinicModule && <li className="flex gap-2"><CheckCircle size={16} className="text-green-500"/> Gestão Clínica</li>}
                                    </ul>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-lg mx-auto">
                    
                    {/* ESTADO: LINK GERADO (SUCESSO) */}
                    {generatedLink ? (
                        <div className="text-center space-y-6 animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Fatura Gerada!</h3>
                                <p className="text-slate-500 text-sm mt-2">
                                    Sua assinatura foi criada. Para ativar sua conta imediatamente, realize o pagamento no link abaixo.
                                </p>
                            </div>
                            
                            <a 
                                href={generatedLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-center hover:bg-blue-700 shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <CreditCard size={20} /> Acessar Fatura de Pagamento <ExternalLink size={16} />
                            </a>

                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-xs text-yellow-800 text-left">
                                <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Atenção:</p>
                                <p>Após pagar, clique no botão abaixo para forçar a atualização do sistema caso não ocorra automaticamente.</p>
                            </div>

                            <button 
                                onClick={handleVerifyPayment}
                                disabled={verifying}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {verifying ? <Loader2 className="animate-spin" /> : <><RefreshCw size={18}/> Já Paguei / Validar Agora</>}
                            </button>

                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold mt-4"
                            >
                                Voltar para o Dashboard (Aguardar)
                            </button>
                        </div>
                    ) : (
                        /* ESTADO: FORMULÁRIO */
                        <div className="space-y-6">
                            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><CreditCard /> Dados de Cobrança</h3>
                            
                            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-100">
                                <p className="flex justify-between font-bold mb-1"><span>Plano Selecionado:</span> <span>{displayPlans.find(p => p.id === selectedPlanId)?.name}</span></p>
                                <p className="flex justify-between"><span>Valor Mensal:</span> <span>R$ {displayPlans.find(p => p.id === selectedPlanId)?.price.toFixed(2) || '0.00'}</span></p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email para Fatura (Obrigatório)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    <input 
                                        type="email"
                                        required
                                        value={billingEmail}
                                        onChange={e => setBillingEmail(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 outline-none font-medium ${!billingEmail ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`}
                                        placeholder="seuemail@empresa.com"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Este email receberá o boleto e a nota fiscal.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    <input 
                                        value={cpfCnpj}
                                        onChange={e => setCpfCnpj(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        placeholder="000.000.000-00 (Números)"
                                    />
                                </div>
                            </div>

                            {/* CAMPO DE CUPOM NO CHECKOUT */}
                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                                    <Ticket size={16} className="text-blue-600"/> Cupom de Desconto
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        value={couponCode}
                                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="CÓDIGO"
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                        disabled={!!appliedCoupon || validatingCoupon}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => handleApplyCoupon()}
                                        disabled={!!appliedCoupon || validatingCoupon || !couponCode}
                                        className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 font-bold text-sm transition-colors disabled:opacity-50"
                                    >
                                        {validatingCoupon ? <Loader2 size={16} className="animate-spin"/> : (appliedCoupon ? <Check size={16} className="text-green-600"/> : 'Aplicar')}
                                    </button>
                                </div>
                                {appliedCoupon && (
                                    <div className="mt-2 flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                                        <span className="text-xs text-green-700 font-bold">Cupom {appliedCoupon.code} aplicado!</span>
                                        <button onClick={() => {setAppliedCoupon(null); setCouponCode('');}} className="text-[10px] text-red-500 font-bold hover:underline">Remover</button>
                                    </div>
                                )}
                            </div>
                            
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100 font-medium">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5"/> 
                                    <span>{error}</span>
                                </div>
                            )}

                            <button 
                                onClick={handleSubscribe}
                                disabled={loading || displayPlans.length === 0}
                                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Gerar Pagamento'}
                            </button>
                            <p className="text-center text-xs text-slate-400">Ambiente seguro via Asaas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
