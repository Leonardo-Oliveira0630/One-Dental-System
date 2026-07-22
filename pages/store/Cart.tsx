
import React, { useState, useMemo, useEffect } from 'react';
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
            setVoucherStatus({ text: 'Voucher sem saldo.', type: 'error' });
            return;
        }
        if (appliedVouchers.find(av => av.id === v.id)) {
            setVoucherStatus({ text: 'Voucher já aplicado.', type: 'error' });
            return;
        }
        // Verify if voucher jobTypeId matches any cart item
        const baseMatches = cart.filter(c => c.jobType.id === v.jobTypeId || c.jobType.originalJobTypeId === v.jobTypeId);
        if (baseMatches.length === 0) {
            setVoucherStatus({ text: 'O voucher não se aplica aos serviços do carrinho.', type: 'error' });
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
            setVoucherStatus({ text: `Este voucher é exclusivo para a variação "${varName}". Adicione-a ao serviço para aplicar.`, type: 'error' });
            return;
        }
        setAppliedVouchers(prev => [...prev, v]);
        setVoucherCode('');
        setVoucherStatus({ text: `Voucher aplicado com sucesso! Saldo: ${v.remainingQuantity}`, type: 'success' });
      } else {
        setVoucherStatus({ text: 'Voucher não encontrado ou inativo.', type: 'error' });
      }
    } catch (err) {
      setVoucherStatus({ text: 'Erro ao validar voucher.', type: 'error' });
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
        setCouponStatus({ text: `Cupom ${res.code} aplicado com sucesso!`, type: 'success' });
      } else {
        setCouponStatus({ text: 'Cupom inválido, expirado ou com limite atingido.', type: 'error' });
      }
    } catch (err) {
      setCouponStatus({ text: 'Erro ao validar o cupom.', type: 'error' });
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
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Building size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum Laboratório Selecionado</h2>
                <p className="text-slate-500 mb-6">Selecione um laboratório parceiro para finalizar sua compra.</p>
                <button onClick={() => navigate('/dentist/partnerships')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors w-full">Gerenciar Parcerias</button>
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

    if (hasMixedItems) {
        alert("Não é possível prosseguir com o pagamento de um carrinho misto. Remova os Combos Promocionais ou os Serviços Comuns para continuar.");
        return;
    }

    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
        alert("Por favor, preencha o CPF ou CNPJ do comprador para faturamento.");
        return;
    }

    if (!onlyVouchers) {
        if (!date || !patientName) return;
        if (selectedFiles.length === 0) {
            alert("É OBRIGATÓRIO enviar os arquivos digitais (STL/Imagens) para prosseguir.");
            return;
        }
    }

    if (!currentUser) return;

    setIsProcessing(true);
    const uploadedAttachments: Attachment[] = [];

    try {
        // 1. COMPRESSÃO INTELIGENTE (Mobile First)
        setCompressionStatus("Otimizando arquivos para envio rápido...");
        const processedFiles: File[] = [];
        for (const file of selectedFiles) {
            const compressed = await smartCompress(file);
            processedFiles.push(compressed);
        }

        // 2. UPLOAD DOS ARQUIVOS PROCESSADOS
        setCompressionStatus("Enviando arquivos para o laboratório...");
        for (const file of processedFiles) {
            const url = await uploadFile(file);
            uploadedAttachments.push({
                id: Math.random().toString(),
                name: file.name,
                url: url,
                uploadedAt: new Date()
            });
        }

        setCompressionStatus("Finalizando pagamento...");
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
                const hasVars = vars && vars !== 'Configuração padrão';
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
                        const varText = variations && variations !== 'configuração padrão' ? ` em ${variations}` : '';
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
    if (!item.selectedVariationIds || item.selectedVariationIds.length === 0) return 'Configuração padrão';
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
          <div className={`flex flex-col h-full -mt-4 md:-mt-8 -mx-4 md:-mx-8 bg-slate-50`}>
              <StoreTopMenu />
              <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"><CheckCircle size={40} className="text-green-600" /></div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {isVoucherPaidOrder ? "Pedido Realizado com Sucesso!" : "Pedido Enviado com Sucesso!"}
              </h2>
              <p className="text-slate-500 mb-8 max-w-md">
                  {isVoucherPaidOrder 
                    ? "Seu pedido foi totalmente pago com saldo de voucher e enviado ao laboratório." 
                    : "Seu pedido foi registrado. Aguarde a aprovação do laboratório para iniciar a produção."}
              </p>
              
              {/* Redirect indicator */}
              {onlyVouchers && (
                  <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl max-w-sm mx-auto animate-pulse">
                      <p className="text-xs font-bold text-indigo-700">Redirecionando você para a aba de Vouchers em instantes...</p>
                  </div>
              )}
              {isVoucherPaidOrder && !onlyVouchers && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl max-w-sm mx-auto animate-pulse">
                      <p className="text-xs font-bold text-green-700">Redirecionando você para a aba de Pedidos em instantes...</p>
                  </div>
              )}

              {paymentMethod === 'PIX' && successData.pixCopyPaste && (
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 max-w-sm w-full mb-8">
                      <h3 className="font-bold text-slate-800 mb-4">Pagamento via PIX</h3>
                      {successData.pixQrCode && (
                          <div className="flex justify-center mb-4"><img src={`data:image/png;base64,${successData.pixQrCode}`} alt="QR Code PIX" className="w-48 h-48 border rounded-lg" /></div>
                      )}
                      <div className="relative">
                          <textarea readOnly value={successData.pixCopyPaste} className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 resize-none outline-none" />
                          <button onClick={() => copyToClipboard(successData.pixCopyPaste)} className="absolute bottom-2 right-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 flex items-center gap-1 transition-colors">
                              {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? 'Copiado' : 'Copiar'}
                          </button>
                      </div>
                  </div>
              )}
              {successData.invoiceUrl && (
                  <a href={successData.invoiceUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-white text-indigo-600 font-bold rounded-xl border-2 border-indigo-100 hover:border-indigo-200 shadow-sm mb-4 block w-fit mx-auto">
                      Abrir Fatura no Asaas
                  </a>
              )}
              <div className="flex gap-4 justify-center">
                  <button 
                      onClick={() => navigate(onlyVouchers ? '/store?tab=vouchers' : '/store?tab=my_orders')} 
                      className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg"
                  >
                      {onlyVouchers ? 'Ver Meus Vouchers' : 'Ver Meus Pedidos'}
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
        <div className={`flex flex-col h-full -mt-4 md:-mt-8 -mx-4 md:-mx-8 bg-slate-50`}>
            <StoreTopMenu />
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 md:p-8">
                <div className="p-6 bg-indigo-50 rounded-full mb-4 text-indigo-300"><ArrowRight size={48} /></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Seu carrinho está vazio</h2>
                <button 
                    onClick={handleReturnToCatalog} 
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                    Retornar ao Catálogo
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className={`flex flex-col h-full -mt-4 md:-mt-8 -mx-4 md:-mx-8 bg-slate-50`}>
      <StoreTopMenu />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      <div className="lg:col-span-2 space-y-6">
        <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Itens do Pedido ({cart.length})</h2>
            <div className="space-y-4">
                {cart.map(item => {
                    const { coveredQty, discount } = getItemVoucherDiscount(item);
                    const itemFinalPaidPrice = Math.max(0, item.finalPrice - discount);
                    return (
                        <div key={item.cartItemId} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-slate-800">
                                        {item.jobType.name}
                                        {getVariationDetails(item) !== 'Configuração padrão' && (
                                            <span className="text-sm font-normal text-slate-500">
                                                {` - ${getVariationDetails(item)}`}
                                            </span>
                                        )}
                                    </h4>
                                    {item.selectedTeeth && item.selectedTeeth.length > 0 && (
                                        <p className="text-xs text-indigo-500 mt-0.5 font-bold">
                                            Dentes: {item.selectedTeeth.sort().join(', ')}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Preço unitário: R$ {item.unitPrice.toFixed(2)}
                                    </p>
                                    {coveredQty > 0 && (
                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-green-600 font-extrabold bg-green-50 px-2 py-0.5 rounded-lg border border-green-100 w-fit">
                                            <Sparkles size={12} /> Voucher aplicado: {coveredQty} {coveredQty === 1 ? 'unidade' : 'unidades'} coberta(s)
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6">
                                {/* Controller de Quantidade */}
                                <div className={`flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-slate-50 ${item.selectedTeeth && item.selectedTeeth.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
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
                                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 active:scale-95 transition-all font-bold text-sm"
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
                                        className="w-10 text-center bg-transparent border-none text-sm font-bold text-slate-700 font-mono focus:ring-0 p-0"
                                    />
                                    <button 
                                        type="button"
                                        disabled={item.selectedTeeth && item.selectedTeeth.length > 0}
                                        onClick={() => {
                                            updateCartItemQty(item.cartItemId, item.quantity + 1);
                                        }}
                                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 active:scale-95 transition-all font-bold text-sm"
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right min-w-[80px]">
                                        {discount > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 line-through">R$ {item.finalPrice.toFixed(2)}</span>
                                                <span className="font-bold text-green-600">R$ {itemFinalPaidPrice.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-slate-700">R$ {item.finalPrice.toFixed(2)}</span>
                                        )}
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-400 hover:text-red-600 p-2" title="Remover item"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                {finalTotal === 0 ? (
                    <><ShieldCheck className="text-green-600"/> Pedido Coberto por Voucher</>
                ) : (
                    <><CreditCard className="text-indigo-600"/> Forma de Pagamento</>
                )}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                {finalTotal === 0 ? (
                    <span>Este pedido possui valor final de <strong>R$ 0,00</strong> devido à cobertura integral dos seus vouchers ativos. Nenhuma transação financeira será realizada.</span>
                ) : (
                    <span>Você será redirecionado para o ambiente seguro do <strong>Asaas</strong> para concluir seu pagamento por Cartão de Crédito, PIX ou Boleto Bancário.</span>
                )}
            </p>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CPF ou CNPJ para Faturamento</label>
                    <input 
                        type="text"
                        required 
                        value={cpfCnpj} 
                        onChange={e => setCpfCnpj(e.target.value)} 
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-800 font-mono font-bold" 
                        placeholder="000.000.000-00 ou 00.000.000/0000-00" 
                    />
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">Detalhes do Envio</h2>
        <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-2">
                {!cart.every(item => isPromo(item.jobType)) && (
                    <>
                    <label className="block text-sm font-medium text-slate-700">Paciente</label>
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
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="">-- Selecionar Paciente Cadastrado --</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <input 
                            required 
                            value={patientName} 
                            placeholder="NOME COMPLETO DO PACIENTE"
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
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm uppercase" 
                        />
                    </div>
                ) : (
                    <input 
                        required 
                        value={patientName} 
                        placeholder="NOME COMPLETO DO PACIENTE"
                        onChange={e => setPatientName(e.target.value.toUpperCase())} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm uppercase" 
                    />
                )}
                </>
                )}
            </div>
            {!cart.every(item => isPromo(item.jobType)) && (
            <>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Data Desejada</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg" /></div>
            
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700" htmlFor="case-observations-input">
                    Observações do Caso / Instruções
                </label>
                <textarea 
                    id="case-observations-input"
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Instruções especiais de cor, modelo, preparo, etc." 
                    rows={4} 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium placeholder-slate-400" 
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Arquivos (STL/Fotos) <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center hover:bg-indigo-50 transition-colors relative">
                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileSelect} />
                    <div className="flex flex-col items-center gap-2 text-indigo-400"><UploadCloud size={32} /><span className="text-sm font-medium text-indigo-600">Clique para enviar</span></div>
                </div>
                {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-sm border border-slate-200">
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
            <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
                <label className="block text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" /> Voucher de Serviços
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        disabled={validatingVoucher}
                        placeholder="Código do Voucher (Pacote)"
                        value={voucherCode}
                        onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl uppercase font-bold tracking-widest text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50"
                    />
                    <button 
                        type="button" 
                        onClick={handleApplyVoucher}
                        disabled={!voucherCode.trim() || validatingVoucher}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black disabled:opacity-50 tracking-wider transition-all"
                    >
                        {validatingVoucher ? 'Validando...' : 'Adicionar'}
                    </button>
                </div>
                {voucherStatus.text && (
                    <p className={`text-xs font-bold ${voucherStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{voucherStatus.text}</p>
                )}
                {myVouchers.length > 0 && (
                    <div className="mt-2 text-xs flex flex-wrap gap-2">
                        {myVouchers.filter(mv => !appliedVouchers.find(av => av.id === mv.id)).map(v => (
                            <button 
                                key={v.id} 
                                type="button"
                                onClick={() => { setVoucherCode(v.code); setVoucherStatus({text:'', type:''}) }}
                                className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                            >
                                {v.promotionName} (Restam: {v.remainingQuantity})
                            </button>
                        ))}
                    </div>
                )}
                
                {appliedVouchers.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {appliedVouchers.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-green-50 text-green-800 p-2 rounded-lg text-xs font-bold border border-green-200">
                                <span>Voucher {v.code} ({v.jobTypeName})</span>
                                <button type="button" onClick={() => removeVoucher(v.id)} className="text-green-600 hover:text-red-500"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}
            
            {/* Coupon Section */}
            <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
                <label className="block text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" /> Cupom de Desconto
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        disabled={!!appliedCoupon || validatingCoupon}
                        placeholder="Código Promocional"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl uppercase font-bold tracking-widest text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50"
                    />
                    <button 
                        type="button" 
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || !!appliedCoupon || validatingCoupon}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black disabled:opacity-50 tracking-wider transition-all"
                    >
                        {validatingCoupon ? 'Validando...' : appliedCoupon ? 'Aplicado' : 'Validar'}
                    </button>
                </div>
                {couponStatus.text && (
                    <p className={`text-[11px] mt-1 font-bold ${couponStatus.type === 'success' ? 'text-green-600 bg-green-50/50 px-2.5 py-1 rounded-lg border border-green-100/50' : 'text-red-500 bg-red-50/50 px-2.5 py-1 rounded-lg border border-red-100/50'}`}>
                        {couponStatus.type === 'success' ? '✓ ' : '✗ '} {couponStatus.text}
                    </p>
                )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                <div className="flex justify-between items-center text-slate-500 text-sm font-medium">
                    <span>Subtotal</span>
                    <span>R$ {originalTotal.toFixed(2)}</span>
                </div>
                {voucherDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600 text-sm font-bold bg-green-50 px-2.5 py-1.5 rounded-xl border border-green-100/40">
                        <span>Desconto Voucher</span>
                        <span>- R$ {voucherDiscountAmount.toFixed(2)}</span>
                    </div>
                )}
                {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600 text-sm font-bold bg-green-50 px-2.5 py-1.5 rounded-xl border border-green-100/40">
                        <span>Desconto Cupom</span>
                        <span>- R$ {discountAmount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-slate-800 font-bold">Total Final</span>
                    <span className="text-2xl font-black text-slate-900">R$ {finalTotal.toFixed(2)}</span>
                </div>
                
                {hasMixedItems && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                        <div className="text-xs">
                            <p className="font-bold">Carrinho Misto Não Permitido</p>
                            <p className="mt-1">
                                Não é possível comprar <strong>Combos Promocionais</strong> junto com <strong>Serviços Comuns ou Promoções Unitárias</strong>. Por favor, faça os pedidos separadamente.
                            </p>
                        </div>
                    </div>
                )}
                
                {compressionStatus && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-700 animate-pulse">
                        <Sparkles size={18} className="shrink-0" />
                        <span className="text-xs font-bold">{compressionStatus}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isProcessing || hasMixedItems} 
                    className={`w-full py-4 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                        hasMixedItems
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none border border-slate-200'
                        : finalTotal === 0 
                            ? 'bg-green-600 hover:bg-green-700 shadow-green-250' 
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    } ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : hasMixedItems ? 'Carrinho Misto Bloqueado' : finalTotal === 0 ? 'Enviar para o Laboratório' : 'Confirmar e Pagar'}
                </button>
            </div>
        </form>
      </div>
    </div>
    </div>
    </div>
  );
};
