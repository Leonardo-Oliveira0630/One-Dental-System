
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { Trash2, ArrowRight, CreditCard, Calendar, UploadCloud, File, X, Loader2, Building, ShieldCheck, QrCode, CheckCircle, Copy, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Attachment, JobStatus, UrgencyLevel } from '../../types';
import * as api from '../../services/firebaseService';
import { smartCompress } from '../../services/compressionService';
import { StoreTopMenu } from '../../components/StoreTopMenu';

interface CartProps {
  onBackToStore?: () => void;
}

export const Cart = ({ onBackToStore }: CartProps = {}) => {
  const { t } = useTranslation();
  const { cart, removeFromCart, updateCartItemQty, uploadFile, activeOrganization, currentUser, currentOrg, clearCart, validateLabCoupon, updateLabCoupon, patients } = useApp();
  const navigate = useNavigate();
  
  const [patientName, setPatientName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX'>('CREDIT_CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');

  useEffect(() => {
    if (currentOrg?.cpfCnpj) {
      setCpfCnpj(currentOrg.cpfCnpj);
    } else if (currentOrg?.financialSettings?.techResponsibleCpf) {
      setCpfCnpj(currentOrg.financialSettings.techResponsibleCpf);
    } else if (currentUser?.cpfCnpj) {
      setCpfCnpj(currentUser.cpfCnpj);
    }
  }, [currentOrg, currentUser]);

  useEffect(() => {
    if (activeOrganization?.id && currentUser?.id) {
      api.apiGetMyVouchers(activeOrganization.id, currentUser.id)
        .then(res => {
          setMyVouchers(res || []);
        })
        .catch(err => console.error("Erro ao carregar vouchers:", err));
    }
  }, [activeOrganization, currentUser]);

  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVouchers, setAppliedVouchers] = useState<any[]>([]);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [voucherStatus, setVoucherStatus] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponStatus, setCouponStatus] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !activeOrganization) return;
    setValidatingVoucher(true);
    setVoucherStatus({ text: '', type: '' });
    try {
      const v = await api.apiGetVoucherByCode(activeOrganization.id, voucherCode.trim().toUpperCase());
      if (v) {
        if (v.remainingQuantity <= 0) {
            setVoucherStatus({ text: t('store.voucherEmptyBalance', 'Voucher sem saldo.'), type: 'error' });
            return;
        }
        if (appliedVouchers.find(av => av.id === v.id)) {
            setVoucherStatus({ text: t('store.voucherAlreadyApplied', 'Voucher já aplicado.'), type: 'error' });
            return;
        }
        // Verify if voucher jobTypeId matches any cart item
        const baseMatches = cart.filter(c => c.jobType.id === v.jobTypeId || c.jobType.originalJobTypeId === v.jobTypeId);
        if (baseMatches.length === 0) {
            setVoucherStatus({ text: t('store.voucherNotApplicable', 'O voucher não se aplica aos serviços do carrinho.'), type: 'error' });
            return;
        }

        const matchingItem = baseMatches.find(c => {
            if (v.applyToAllVariations === false) {
                if (v.promoVariationOptionIds && v.promoVariationOptionIds.length > 0) {
                    return !!(c.selectedVariationIds && c.selectedVariationIds.some(id => v.promoVariationOptionIds.includes(id)));
                } else if (v.promoVariationOptionId) {
                    return !!(c.selectedVariationIds && c.selectedVariationIds.includes(v.promoVariationOptionId));
                }
                return false;
            }
            return true;
        });

        if (!matchingItem) {
            const varName = v.promoVariationOptionName || "uma variação específica";
            setVoucherStatus({ text: t('store.voucherExclusiveVariation', { name: varName, defaultValue: `Este voucher é exclusivo para a variação "${varName}". Adicione-a ao serviço para aplicar.` }), type: 'error' });
            return;
        }
        setAppliedVouchers(prev => [...prev, v]);
        setVoucherCode('');
        setVoucherStatus({ text: t('store.voucherAppliedSuccess', { qty: v.remainingQuantity, defaultValue: `Voucher aplicado com sucesso! Saldo: ${v.remainingQuantity}` }), type: 'success' });
      } else {
        setVoucherStatus({ text: t('store.voucherNotFound', 'Voucher não encontrado ou inativo.'), type: 'error' });
      }
    } catch (err) {
      setVoucherStatus({ text: t('store.voucherValidateError', 'Erro ao validar voucher.'), type: 'error' });
    } finally {
      setValidatingVoucher(false);
    }
  };

  const removeVoucher = (vid: string) => {
    setAppliedVouchers(prev => prev.filter(v => v.id !== vid));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !activeOrganization) return;
    setValidatingCoupon(true);
    setCouponStatus({ text: '', type: '' });
    try {
      const res = await validateLabCoupon(activeOrganization.id, couponCode.trim().toUpperCase());
      if (res) {
        setAppliedCoupon(res);
        setCouponStatus({ text: t('store.couponAppliedSuccess', { code: res.code, defaultValue: `Cupom ${res.code} aplicado com sucesso!` }), type: 'success' });
      } else {
        setCouponStatus({ text: t('store.couponInvalid', 'Cupom inválido, expirado ou com limite atingido.'), type: 'error' });
      }
    } catch (err) {
      setCouponStatus({ text: t('store.couponValidateError', 'Erro ao validar o cupom.'), type: 'error' });
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Calculate voucher coverage and discount
  const voucherDiscountAmount = useMemo(() => {
    if (appliedVouchers.length === 0) return 0;
    
    // Copy applied vouchers to track remaining quantities
    const balanceMap: Record<string, number> = {};
    appliedVouchers.forEach(v => {
      balanceMap[v.id] = v.remainingQuantity;
    });

    let discountTotal = 0;

    cart.forEach(item => {
      const itemTypeIds = [item.jobType.id, item.jobType.originalJobTypeId].filter(Boolean);
      let remainingQtyToCover = item.quantity;
      let coveredQty = 0;

      for (const v of appliedVouchers) {
        let variationMatches = true;
        if (v.applyToAllVariations === false) {
          if (v.promoVariationOptionIds && v.promoVariationOptionIds.length > 0) {
            variationMatches = !!(item.selectedVariationIds && item.selectedVariationIds.some(id => v.promoVariationOptionIds.includes(id)));
          } else if (v.promoVariationOptionId) {
            variationMatches = !!(item.selectedVariationIds && item.selectedVariationIds.includes(v.promoVariationOptionId));
          } else {
            variationMatches = false;
          }
        }

        if (itemTypeIds.includes(v.jobTypeId) && variationMatches) {
          const available = balanceMap[v.id] || 0;
          if (available > 0 && remainingQtyToCover > 0) {
            const cover = Math.min(available, remainingQtyToCover);
            balanceMap[v.id] -= cover;
            remainingQtyToCover -= cover;
            coveredQty += cover;
          }
        }
      }

      discountTotal += coveredQty * item.unitPrice;
    });

    return discountTotal;
  }, [appliedVouchers, cart]);

  const originalTotal = cart.reduce((acc, item) => acc + item.finalPrice, 0);

  const subtotalAfterVouchers = Math.max(0, originalTotal - voucherDiscountAmount);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      return subtotalAfterVouchers * (appliedCoupon.discountValue / 100);
    } else {
      return Math.min(subtotalAfterVouchers, appliedCoupon.discountValue);
    }
  }, [appliedCoupon, subtotalAfterVouchers]);

  const finalTotal = Math.max(0, subtotalAfterVouchers - discountAmount);

  const getItemVoucherDiscount = (item: any) => {
    if (appliedVouchers.length === 0) return { coveredQty: 0, discount: 0 };
    
    const balanceMap: Record<string, number> = {};
    appliedVouchers.forEach(v => {
      balanceMap[v.id] = v.remainingQuantity;
    });

    let discount = 0;
    let totalCovered = 0;

    for (const cartItem of cart) {
      const itemTypeIds = [cartItem.jobType.id, cartItem.jobType.originalJobTypeId].filter(Boolean);
      let remainingQtyToCover = cartItem.quantity;
      let coveredQty = 0;

      for (const v of appliedVouchers) {
        let variationMatches = true;
        if (v.applyToAllVariations === false) {
          if (v.promoVariationOptionIds && v.promoVariationOptionIds.length > 0) {
            variationMatches = !!(cartItem.selectedVariationIds && cartItem.selectedVariationIds.some(id => v.promoVariationOptionIds.includes(id)));
          } else if (v.promoVariationOptionId) {
            variationMatches = !!(cartItem.selectedVariationIds && cartItem.selectedVariationIds.includes(v.promoVariationOptionId));
          } else {
            variationMatches = false;
          }
        }

        if (itemTypeIds.includes(v.jobTypeId) && variationMatches) {
          const available = balanceMap[v.id] || 0;
          if (available > 0 && remainingQtyToCover > 0) {
            const cover = Math.min(available, remainingQtyToCover);
            balanceMap[v.id] -= cover;
            remainingQtyToCover -= cover;
            coveredQty += cover;
          }
        }
      }

      if (cartItem.cartItemId === item.cartItemId) {
        discount = coveredQty * cartItem.unitPrice;
        totalCovered = coveredQty;
        break;
      }
    }

    return { coveredQty: totalCovered, discount };
  };

  if (!activeOrganization) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-8">
            <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 max-w-md w-full flex flex-col items-center transition-colors">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Building size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('store.noLabSelectedCartTitle', 'Nenhum Laboratório Selecionado')}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t('store.noLabSelectedCartDesc', 'Selecione um laboratório parceiro para finalizar sua compra.')}</p>
                <button onClick={() => navigate('/dentist/partnerships')} className="px-6 py-3 bg-indigo-600 dark:bg-blue-600 text-white font-bold rounded-xl hover:bg-indigo-700 dark:hover:bg-blue-700 transition-colors w-full">{t('store.managePartnerships', 'Gerenciar Parcerias')}</button>
            </div>
        </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isOwnStore = Boolean(
    (currentOrg?.id && activeOrganization?.id === currentOrg.id) || 
    (currentUser?.organizationId && activeOrganization?.id === currentUser.organizationId)
  );

  const isPromo = (jt: any) => {
    if (jt.isPromotion === true) return true;
    if (jt.isPromotion === false) return false;
    return !!jt.isPromotion || !!jt.originalJobTypeId || !!jt.promotionQuantity || jt.isVoucherCombo === true;
  };
  const onlyVouchers = cart.length > 0 && cart.every(item => item.jobType.isVoucherCombo === true);

  const hasPromoCombos = useMemo(() => cart.some(item => item.jobType.isVoucherCombo === true), [cart]);
  const hasCommonOrUnitPromos = useMemo(() => cart.some(item => item.jobType.isVoucherCombo !== true), [cart]);
  const hasMixedItems = hasPromoCombos && hasCommonOrUnitPromos;

  useEffect(() => {
    if (successData) {
      if (onlyVouchers) {
        const timer = setTimeout(() => {
          navigate('/store?tab=vouchers');
        }, 4000);
        return () => clearTimeout(timer);
      } else if (successData.paymentId === 'voucher_paid') {
        const timer = setTimeout(() => {
          navigate('/store?tab=my_orders');
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [successData, onlyVouchers, navigate]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOwnStore) {
        alert(t('store.ownStoreCheckoutError', 'Você está visualizando sua própria loja e não pode realizar pedidos para si mesmo.'));
        return;
    }

    if (hasMixedItems) {
        alert(t('store.mixedCartAlert', 'Não é possível prosseguir com o pagamento de um carrinho misto. Remova os Combos Promocionais ou os Serviços Comuns para continuar.'));
        return;
    }

    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
        alert(t('store.cpfCnpjRequired', 'Por favor, preencha o CPF ou CNPJ do comprador para faturamento.'));
        return;
    }

    if (!onlyVouchers) {
        if (!date || !patientName) return;
        if (selectedFiles.length === 0) {
            alert(t('store.digitalFilesRequired', 'É OBRIGATÓRIO enviar os arquivos digitais (STL/Imagens) para prosseguir.'));
            return;
        }
    }

    if (!currentUser) return;

    setIsProcessing(true);
    const uploadedAttachments: Attachment[] = [];

    try {
        // 1. COMPRESSÃO INTELIGENTE (Mobile First)
        setCompressionStatus(t('store.optimizingFiles', 'Otimizando arquivos para envio rápido...'));
        const processedFiles: File[] = [];
        for (const file of selectedFiles) {
            const compressed = await smartCompress(file);
            processedFiles.push(compressed);
        }

        // 2. UPLOAD DOS ARQUIVOS PROCESSADOS
        setCompressionStatus(t('store.uploadingFiles', 'Enviando arquivos para o laboratório...'));
        for (const file of processedFiles) {
            const url = await uploadFile(file);
            uploadedAttachments.push({
                id: Math.random().toString(),
                name: file.name,
                url: url,
                uploadedAt: new Date()
            });
        }

        setCompressionStatus(t('store.finalizingPayment', 'Finalizando pagamento...'));
        const jobData = {
            organizationId: activeOrganization.id, 
            patientName: patientName || 'Compra de Pacote/Voucher', 
            dentistId: currentUser.id, 
            dentistName: currentUser.name, 
            urgency: UrgencyLevel.NORMAL,
            status: JobStatus.WAITING_APPROVAL,
            origin: 'ONLINE_ORDER',
            items: cart.map(c => {
                const vars = getVariationDetails(c);
                const hasVars = vars && vars !== t('store.defaultConfig', 'Configuração padrão');
                return { 
                    id: `item_${c.cartItemId}`, 
                    jobTypeId: c.jobType.id, 
                    name: hasVars ? `${c.jobType.name} - ${vars}` : c.jobType.name, 
                    quantity: c.quantity, 
                    price: c.unitPrice, 
                    selectedVariationIds: c.selectedVariationIds || [], 
                    selectedTeeth: c.selectedTeeth || [],
                    variationValues: c.variationValues,
                    originalJobTypeId: c.jobType.originalJobTypeId,
                    promotionQuantity: c.jobType.promotionQuantity,
                    isPromo: isPromo(c.jobType),
                    isVoucherCombo: c.jobType.isVoucherCombo === true,
                    applyToAllVariations: c.jobType.applyToAllVariations !== false,
                    promoVariationOptionId: c.jobType.promoVariationOptionId || '',
                    promoVariationOptionIds: c.jobType.promoVariationOptionIds || [],
                    promoVariationOptionName: c.jobType.promoVariationOptionName || '',
                    promoVariationGroupName: c.jobType.promoVariationGroupName || ''
                };
            }),
            history: [{ id: `hist_${Date.now()}`, timestamp: new Date(), action: 'Criado via Loja Virtual', userId: currentUser.id, userName: currentUser.name }],
            attachments: uploadedAttachments, 
            createdAt: new Date(), 
            sentAt: new Date(),
            sectorEntryTime: new Date(),
            dueDate: date ? new Date(date) : new Date(), 
            totalValue: finalTotal, 
            notes,
            couponCode: appliedCoupon ? appliedCoupon.code : undefined,
            discountValue: discountAmount > 0 ? discountAmount : undefined,
            isComboPurchase: onlyVouchers,
            vouchersUsed: appliedVouchers.map(v => v.id)
        };

        const tab = onlyVouchers ? 'vouchers' : 'my_orders';
        const successUrl = `${window.location.origin}/store?tab=${tab}`;

        const paymentData = {
            method: 'UNDEFINED',
            cpfCnpj: cpfCnpj.replace(/\D/g, ''),
            successUrl
        };

        const result = await api.apiCreateOrderPayment(jobData, paymentData);

        if (result.success) {
            // Ensure connection exists so clinic can see the order in JobsList
            if (activeOrganization && currentUser?.organizationId) {
                try {
                    await api.apiAddConnectionByCode(currentUser.organizationId, currentUser.id, activeOrganization.id);
                } catch (err) {
                    console.warn("Erro ao auto-conectar clínica e laboratório:", err);
                }
            }

            if (appliedCoupon) {
                await updateLabCoupon(appliedCoupon.id, { usedCount: (appliedCoupon.usedCount || 0) + 1 });
            }

            // Save prosthesis history in selected patient clinical history records
            if (selectedPatientId && currentUser) {
                try {
                    const specsCompiled = cart.map(item => {
                        const qty = item.quantity;
                        let name = item.jobType.name.toLowerCase();
                        // Portuguese plurals
                        if (qty > 1) {
                            if (name === 'coroa') name = 'coroas';
                            else if (name === 'onlay') name = 'onlays';
                            else if (name === 'modelo') name = 'modelos';
                            else if (name.endsWith('r')) name = name + 'es';
                            else if (!name.endsWith('s')) name = name + 's';
                        }
                        const variations = getVariationDetails(item).toLowerCase();
                        const varText = variations && variations !== t('store.defaultConfig', 'configuração padrão').toLowerCase() ? ` em ${variations}` : '';
                        return `${qty} ${name}${varText}`;
                    }).join(', ');

                    const labName = activeOrganization?.name || 'Laboratório Virtual';
                    const descriptionText = `Serviço de Prótese - Laboratório: ${labName}. Especificação: ${specsCompiled}.`;

                    const historyRecord = {
                        id: `hist_${Date.now()}`,
                        patientId: selectedPatientId,
                        type: 'PROSTHESIS' as const,
                        description: descriptionText,
                        date: new Date(),
                        createdAt: new Date(),
                        professionalId: currentUser.id,
                        professionalName: currentUser.name,
                        labName: labName,
                        labId: activeOrganization?.id || '',
                        specs: specsCompiled,
                        attachments: uploadedAttachments || []
                    };

                    const dentistOrgId = currentUser.organizationId || activeOrganization?.id;
                    if (dentistOrgId) {
                        await api.apiAddPatientHistory(dentistOrgId, selectedPatientId, historyRecord);
                    }
                } catch (historyErr) {
                    console.error("Erro ao registrar histórico do paciente:", historyErr);
                }
            }

            clearCart();
            if (result.invoiceUrl) {
                window.location.href = result.invoiceUrl;
            } else {
                setSuccessData(result);
            }
        } else {
            alert("Falha no pagamento: " + result.message);
        }

    } catch (error: any) {
        console.error("Erro no checkout:", error);
        alert("Erro ao processar pedido: " + (error.message || "Tente novamente."));
    } finally {
        setIsProcessing(false);
        setCompressionStatus(null);
    }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const getVariationDetails = (item: import('../../types').CartItem) => {
    if (!item.selectedVariationIds || item.selectedVariationIds.length === 0) return t('store.defaultConfig', 'Configuração padrão');
    const details = item.selectedVariationIds.map(id => {
      let optionName = '';
      for (const group of item.jobType.variationGroups) {
        const option = group.options.find(opt => opt.id === id);
        if (option) { optionName = option.name; break; }
      }
      return optionName;
    }).filter(Boolean);
    return details.join(', ');
  };

  if (successData) {
      const isVoucherPaidOrder = successData.paymentId === 'voucher_paid';
      return (
          <div className="flex flex-col h-full -mt-4 md:-mt-8 -mx-4 md:-mx-8 bg-slate-50 dark:bg-[#0B0F17] transition-colors">
              <StoreTopMenu />
              <div className="flex-1 p-4 md:p-4 sm:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-950/60 rounded-full flex items-center justify-center mb-6"><CheckCircle size={40} className="text-green-600 dark:text-green-400" /></div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {isVoucherPaidOrder ? t('store.orderPlacedTitle', 'Pedido Realizado com Sucesso!') : t('store.orderSentTitle', 'Pedido Enviado com Sucesso!')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                  {isVoucherPaidOrder 
                    ? t('store.voucherPaidDesc', 'Seu pedido foi totalmente pago com saldo de voucher e enviado ao laboratório.') 
                    : t('store.orderRegisteredDesc', 'Seu pedido foi registrado. Aguarde a aprovação do laboratório para iniciar a produção.')}
              </p>
              
              {/* Redirect indicator */}
              {onlyVouchers && (
                  <div className="mb-6 p-4 bg-indigo-50 dark:bg-blue-950/40 border border-indigo-100 dark:border-blue-800/60 rounded-2xl max-w-sm mx-auto animate-pulse">
                      <p className="text-xs font-bold text-indigo-700 dark:text-blue-300">{t('store.redirectingVouchers', 'Redirecionando você para a aba de Vouchers em instantes...')}</p>
                  </div>
              )}
              {isVoucherPaidOrder && !onlyVouchers && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-800/60 rounded-2xl max-w-sm mx-auto animate-pulse">
                      <p className="text-xs font-bold text-green-700 dark:text-green-300">{t('store.redirectingOrders', 'Redirecionando você para a aba de Pedidos em instantes...')}</p>
                  </div>
              )}

              {paymentMethod === 'PIX' && successData.pixCopyPaste && (
                  <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 max-w-sm w-full mb-8">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">{t('store.pixPayment', 'Pagamento via PIX')}</h3>
                      {successData.pixQrCode && (
                          <div className="flex justify-center mb-4"><img src={`data:image/png;base64,${successData.pixQrCode}`} alt="QR Code PIX" className="w-48 h-48 border dark:border-slate-700 rounded-lg" /></div>
                      )}
                      <div className="relative">
                          <textarea readOnly value={successData.pixCopyPaste} className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 dark:text-slate-400 resize-none outline-none" />
                          <button onClick={() => copyToClipboard(successData.pixCopyPaste)} className="absolute bottom-2 right-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 flex items-center gap-1 transition-colors">
                              {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? t('store.copied', 'Copiado') : t('common.copy', 'Copiar')}
                          </button>
                      </div>
                  </div>
              )}
              {successData.invoiceUrl && (
                  <a href={successData.invoiceUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-blue-400 font-bold rounded-xl border-2 border-indigo-100 dark:border-slate-700 hover:border-indigo-200 shadow-sm mb-4 block w-fit mx-auto">
                      {t('store.openInvoiceAsaas', 'Abrir Fatura no Asaas')}
                  </a>
              )}
              <div className="flex gap-4 justify-center">
                  <button 
                      onClick={() => navigate(onlyVouchers ? '/store?tab=vouchers' : '/store?tab=my_orders')} 
                      className="px-8 py-3 bg-indigo-600 dark:bg-blue-600 text-white font-bold rounded-xl hover:bg-indigo-700 dark:hover:bg-blue-700 shadow-lg"
                  >
                      {onlyVouchers ? t('store.viewMyVouchers', 'Ver Meus Vouchers') : t('store.viewMyOrders', 'Ver Meus Pedidos')}
                  </button>
              </div>
          </div>
          </div>
      );
  }

  if (cart.length === 0) {
    const handleReturnToCatalog = () => {
      if (onBackToStore) {
        onBackToStore();
      }
      const targetSlug = activeOrganization?.storeSlug || activeOrganization?.id;
      if (targetSlug) {
        navigate(`/store/${targetSlug}`);
      } else {
        navigate('/store');
      }
    };

    return (
        <div className="flex flex-col h-full -mt-4 md:-mt-8 -mx-4 md:-mx-8 bg-slate-50 dark:bg-[#0B0F17] transition-colors">
            <StoreTopMenu />
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 md:p-4 sm:p-8">
                <div className="px-4 pb-4 sm:px-6 sm:pb-6 bg-indigo-50 dark:bg-slate-800 rounded-full mb-4 text-indigo-300 dark:text-slate-500"><ArrowRight size={48} /></div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('store.cartEmpty', 'Seu carrinho está vazio')}</h2>
                <button 
                    onClick={handleReturnToCatalog} 
                    className="px-6 py-3 bg-indigo-600 dark:bg-blue-600 text-white rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-blue-700 transition-colors"
                >
                    {t('store.returnToCatalog', 'Retornar ao Catálogo')}
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full -mt-4 md:-mt-8 -mx-4 md:-mx-8 bg-slate-50 dark:bg-[#0B0F17] transition-colors">
      <StoreTopMenu />
      <div className="flex-1 p-4 md:p-4 sm:p-8 overflow-y-auto">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:p-8 pb-12">
      <div className="lg:col-span-2 space-y-6">
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('store.orderItems', 'Itens do Pedido')} ({cart.length})</h2>
            <div className="space-y-4">
                {cart.map(item => {
                    const { coveredQty, discount } = getItemVoucherDiscount(item);
                    const itemFinalPaidPrice = Math.max(0, item.finalPrice - discount);
                    return (
                        <div key={item.cartItemId} className="bg-white dark:bg-[#131B2A] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">
                                        {item.jobType.name}
                                        {getVariationDetails(item) !== t('store.defaultConfig', 'Configuração padrão') && (
                                            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                                {` - ${getVariationDetails(item)}`}
                                            </span>
                                        )}
                                    </h4>
                                    {item.selectedTeeth && item.selectedTeeth.length > 0 && (
                                        <p className="text-xs text-indigo-500 dark:text-blue-400 mt-0.5 font-bold">
                                            {t('store.teeth', 'Dentes:')} {item.selectedTeeth.sort().join(', ')}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                        {t('store.unitPriceLabel', 'Preço unitário:')} R$ {item.unitPrice.toFixed(2)}
                                    </p>
                                    {coveredQty > 0 && (
                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-extrabold bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-lg border border-green-100 dark:border-green-800/60 w-fit">
                                            <Sparkles size={12} /> {t('store.voucherAppliedCoverage', { count: coveredQty, unit: coveredQty === 1 ? t('store.voucherUnitOne', 'unidade') : t('store.voucherUnitOther', 'unidades'), defaultValue: `Voucher aplicado: ${coveredQty} coberta(s)` })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 sm:p-6">
                                {/* Controller de Quantidade */}
                                <div className={`flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 ${item.selectedTeeth && item.selectedTeeth.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <button 
                                        type="button"
                                        disabled={item.selectedTeeth && item.selectedTeeth.length > 0}
                                        onClick={() => {
                                            if (item.quantity > 1) {
                                                updateCartItemQty(item.cartItemId, item.quantity - 1);
                                            } else {
                                                removeFromCart(item.cartItemId);
                                            }
                                        }}
                                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 active:scale-95 transition-all font-bold text-sm"
                                    >
                                        -
                                    </button>
                                    <input 
                                        type="number" 
                                        min="1"
                                        readOnly={item.selectedTeeth && item.selectedTeeth.length > 0}
                                        value={item.quantity} 
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val) && val >= 1) {
                                                updateCartItemQty(item.cartItemId, val);
                                            }
                                        }}
                                        className="w-10 text-center bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-100 font-mono focus:ring-0 p-0"
                                    />
                                    <button 
                                        type="button"
                                        disabled={item.selectedTeeth && item.selectedTeeth.length > 0}
                                        onClick={() => {
                                            updateCartItemQty(item.cartItemId, item.quantity + 1);
                                        }}
                                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 active:scale-95 transition-all font-bold text-sm"
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right min-w-[80px]">
                                        {discount > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 dark:text-slate-500 line-through">R$ {item.finalPrice.toFixed(2)}</span>
                                                <span className="font-bold text-green-600 dark:text-green-400">R$ {itemFinalPaidPrice.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-slate-700 dark:text-slate-200">R$ {item.finalPrice.toFixed(2)}</span>
                                        )}
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-400 hover:text-red-600 p-2" title={t('store.removeItem', 'Remover item')}><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-300 transition-colors">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                {finalTotal === 0 ? (
                    <><ShieldCheck className="text-green-600 dark:text-green-400"/> {t('store.orderCoveredByVoucher', 'Pedido Coberto por Voucher')}</>
                ) : (
                    <><CreditCard className="text-indigo-600 dark:text-blue-400"/> {t('store.paymentMethod', 'Forma de Pagamento')}</>
                )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                {finalTotal === 0 ? (
                    <span>{t('store.orderCoveredVoucherDesc', 'Este pedido possui valor final de R$ 0,00 devido à cobertura integral dos seus vouchers ativos. Nenhuma transação financeira será realizada.')}</span>
                ) : (
                    <span>{t('store.paymentRedirectDesc', 'Você será redirecionado para o ambiente seguro do Asaas para concluir seu pagamento por Cartão de Crédito, PIX ou Boleto Bancário.')}</span>
                )}
            </p>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('store.cpfCnpjBilling', 'CPF ou CNPJ para Faturamento')}</label>
                    <input 
                        type="text"
                        required 
                        value={cpfCnpj} 
                        onChange={e => setCpfCnpj(e.target.value)} 
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-800 dark:text-white bg-white dark:bg-slate-900 font-mono font-bold" 
                        placeholder="000.000.000-00 ou 00.000.000/0000-00" 
                    />
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#131B2A] p-6 rounded-2xl shadow-lg border border-indigo-100 dark:border-slate-800 h-fit sticky top-4 sm:p-6 transition-colors">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">{t('store.shippingDetails', 'Detalhes do Envio')}</h2>
        <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-2">
                {!cart.every(item => isPromo(item.jobType)) && (
                    <>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('store.patient', 'Paciente')}</label>
                {patients && patients.length > 0 ? (
                    <div className="space-y-2">
                        <select 
                            value={selectedPatientId} 
                            onChange={e => {
                                const val = e.target.value;
                                setSelectedPatientId(val);
                                if (val) {
                                    const p = patients.find(pat => pat.id === val);
                                    if (p) {
                                        setPatientName(p.name);
                                    }
                                } else {
                                    setPatientName('');
                                }
                            }}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="">{t('store.selectRegisteredPatient', '-- Selecionar Paciente Cadastrado --')}</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <input 
                            required 
                            value={patientName} 
                            placeholder={t('store.patientFullNamePlaceholder', 'NOME COMPLETO DO PACIENTE')}
                            onChange={e => {
                                const typed = e.target.value.toUpperCase();
                                setPatientName(typed);
                                const matched = patients.find(p => p.name.toLowerCase() === typed.toLowerCase());
                                if (matched) {
                                    setSelectedPatientId(matched.id);
                                } else {
                                    setSelectedPatientId('');
                                }
                            }} 
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm uppercase bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                        />
                    </div>
                ) : (
                    <input 
                        required 
                        value={patientName} 
                        placeholder={t('store.patientFullNamePlaceholder', 'NOME COMPLETO DO PACIENTE')}
                        onChange={e => setPatientName(e.target.value.toUpperCase())} 
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm uppercase bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                    />
                )}
                </>
                )}
            </div>
            {!cart.every(item => isPromo(item.jobType)) && (
            <>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('store.desiredDate', 'Data Desejada')}</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white" /></div>
            
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="case-observations-input">
                    {t('store.caseNotesLabel', 'Observações do Caso / Instruções')}
                </label>
                <textarea 
                    id="case-observations-input"
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder={t('store.caseNotesPlaceholder', 'Instruções especiais de cor, modelo, preparo, etc.')} 
                    rows={4} 
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium placeholder-slate-400 dark:placeholder-slate-500" 
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">{t('store.digitalFilesLabel', 'Arquivos (STL/Fotos)')} <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-indigo-200 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-indigo-50 dark:hover:bg-slate-800/60 transition-colors relative">
                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileSelect} />
                    <div className="flex flex-col items-center gap-2 text-indigo-400 dark:text-blue-400"><UploadCloud size={32} /><span className="text-sm font-medium text-indigo-600 dark:text-blue-400">{t('store.clickToUpload', 'Clique para enviar')}</span></div>
                </div>
                {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                                <span className="truncate max-w-[200px]">{file.name}</span>
                                <button type="button" onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </>
            )}

            {/* Vouchers Section */}
            {!cart.every(item => isPromo(item.jobType)) && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-3">
                <label className="block text-xs font-black uppercase text-indigo-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500 dark:text-blue-400" /> {t('store.servicesVoucher', 'Voucher de Serviços')}
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        disabled={validatingVoucher}
                        placeholder={t('store.voucherCodePlaceholder', 'Código do Voucher (Pacote)')}
                        value={voucherCode}
                        onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl uppercase font-bold tracking-widest text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                    <button 
                        type="button" 
                        onClick={handleApplyVoucher}
                        disabled={!voucherCode.trim() || validatingVoucher}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-black disabled:opacity-50 tracking-wider transition-all"
                    >
                        {validatingVoucher ? t('store.validating', 'Validando...') : t('store.add', 'Adicionar')}
                    </button>
                </div>
                {voucherStatus.text && (
                    <p className={`text-xs font-bold ${voucherStatus.type === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{voucherStatus.text}</p>
                )}
                {myVouchers.length > 0 && (
                    <div className="mt-2 text-xs flex flex-wrap gap-2">
                        {myVouchers.filter(mv => !appliedVouchers.find(av => av.id === mv.id)).map(v => (
                            <button 
                                key={v.id} 
                                type="button"
                                onClick={() => { setVoucherCode(v.code); setVoucherStatus({text:'', type:''}) }}
                                className="px-2 py-1 bg-indigo-50 dark:bg-blue-950/40 text-indigo-700 dark:text-blue-300 border border-indigo-200 dark:border-blue-800/60 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-blue-900/60 transition-colors"
                            >
                                {v.promotionName} ({t('store.remains', { qty: v.remainingQuantity, defaultValue: `Restam: ${v.remainingQuantity}` })})
                            </button>
                        ))}
                    </div>
                )}
                
                {appliedVouchers.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {appliedVouchers.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 p-2 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800/60">
                                <span>Voucher {v.code} ({v.jobTypeName})</span>
                                <button type="button" onClick={() => removeVoucher(v.id)} className="text-green-600 dark:text-green-400 hover:text-red-500"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}
            
            {/* Coupon Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-3">
                <label className="block text-xs font-black uppercase text-indigo-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500 dark:text-blue-400" /> {t('store.discountCoupon', 'Cupom de Desconto')}
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        disabled={!!appliedCoupon || validatingCoupon}
                        placeholder={t('store.couponPlaceholder', 'Código Promocional')}
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl uppercase font-bold tracking-widest text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white"
                    />
                    <button 
                        type="button" 
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || !!appliedCoupon || validatingCoupon}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-black disabled:opacity-50 tracking-wider transition-all"
                    >
                        {validatingCoupon ? t('store.validating', 'Validando...') : appliedCoupon ? t('store.applied', 'Aplicado') : t('store.validate', 'Validar')}
                    </button>
                </div>
                {couponStatus.text && (
                    <p className={`text-[11px] mt-1 font-bold ${couponStatus.type === 'success' ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/40 px-2.5 py-1 rounded-lg border border-green-100/50 dark:border-green-800/60' : 'text-red-500 bg-red-50/50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-100/50 dark:border-red-800/60'}`}>
                        {couponStatus.type === 'success' ? '✓ ' : '✗ '} {couponStatus.text}
                    </p>
                )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-2">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                    <span>{t('store.subtotal', 'Subtotal')}</span>
                    <span>R$ {originalTotal.toFixed(2)}</span>
                </div>
                {voucherDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400 text-sm font-bold bg-green-50 dark:bg-green-950/40 px-2.5 py-1.5 rounded-xl border border-green-100/40 dark:border-green-800/40">
                        <span>{t('store.voucherDiscount', 'Desconto Voucher')}</span>
                        <span>- R$ {voucherDiscountAmount.toFixed(2)}</span>
                    </div>
                )}
                {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400 text-sm font-bold bg-green-50 dark:bg-green-950/40 px-2.5 py-1.5 rounded-xl border border-green-100/40 dark:border-green-800/40">
                        <span>{t('store.couponDiscount', 'Desconto Cupom')}</span>
                        <span>- R$ {discountAmount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-800 dark:text-slate-100 font-bold">{t('store.finalTotal', 'Total Final')}</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">R$ {finalTotal.toFixed(2)}</span>
                </div>
                
                {isOwnStore && (
                    <div className="mb-4 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start gap-3 text-blue-800 dark:text-blue-200">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div className="text-xs">
                            <p className="font-bold">{t('store.ownStoreCartTitle', 'Modo de Visualização da Sua Própria Loja')}</p>
                            <p className="mt-1">
                                {t('store.ownStoreCartDesc', 'Você não pode realizar compras ou emitir pedidos para o seu próprio laboratório.')}
                            </p>
                        </div>
                    </div>
                )}
                
                {hasMixedItems && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-200">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="text-xs">
                            <p className="font-bold">{t('store.mixedCartNotAllowed', 'Carrinho Misto Não Permitido')}</p>
                            <p className="mt-1">
                                {t('store.mixedCartDesc', 'Não é possível comprar Combos Promocionais junto com Serviços Comuns ou Promoções Unitárias. Por favor, faça os pedidos separadamente.')}
                            </p>
                        </div>
                    </div>
                )}
                
                {compressionStatus && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center gap-3 text-blue-700 dark:text-blue-300 animate-pulse">
                        <Sparkles size={18} className="shrink-0" />
                        <span className="text-xs font-bold">{compressionStatus}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isProcessing || hasMixedItems || isOwnStore} 
                    className={`w-full py-4 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                        isOwnStore
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700'
                        : hasMixedItems
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700'
                        : finalTotal === 0 
                            ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 shadow-green-250' 
                            : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-indigo-200'
                    } ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : isOwnStore ? t('store.ownStoreBlocked', 'Visualização (Compras Próprias Desativadas)') : hasMixedItems ? t('store.mixedCartBlocked', 'Carrinho Misto Bloqueado') : finalTotal === 0 ? t('store.sendToLab', 'Enviar para o Laboratório') : t('store.confirmAndPay', 'Confirmar e Pagar')}
                </button>
            </div>
        </form>
      </div>
    </div>
    </div>
    </div>
  );
};
