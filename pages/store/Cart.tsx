
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Trash2, ArrowRight, CreditCard, Calendar, UploadCloud, File, X, Loader2, Building, ShieldCheck, QrCode, CheckCircle, Copy, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Attachment, JobStatus, UrgencyLevel } from '../../types';
import * as api from '../../services/firebaseService';
import { smartCompress } from '../../services/compressionService';

export const Cart = () => {
  const { cart, removeFromCart, uploadFile, activeOrganization, currentUser, clearCart } = useApp();
  const navigate = useNavigate();
  
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX'>('CREDIT_CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const total = cart.reduce((acc, item) => acc + item.finalPrice, 0);

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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !patientName) return;
    if (selectedFiles.length === 0) {
        alert("É OBRIGATÓRIO enviar os arquivos digitais (STL/Imagens) para prosseguir.");
        return;
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
            patientName, 
            dentistId: currentUser.id, 
            dentistName: currentUser.name, 
            urgency: UrgencyLevel.NORMAL,
            items: cart.map(c => ({ 
                id: `item_${c.cartItemId}`, 
                jobTypeId: c.jobType.id, 
                name: c.jobType.name, 
                quantity: c.quantity, 
                price: c.unitPrice, 
                selectedVariationIds: c.selectedVariationIds, 
                variationValues: c.variationValues 
            })),
            history: [{ id: `hist_${Date.now()}`, timestamp: new Date(), action: 'Criado via Loja Virtual (Otimizado)', userId: currentUser.id, userName: currentUser.name }],
            attachments: uploadedAttachments, 
            createdAt: new Date(), 
            dueDate: new Date(date), 
            totalValue: total, 
            notes
        };

        const paymentData = {
            method: paymentMethod,
            cpfCnpj: cpfCnpj.replace(/\D/g, ''),
            creditCard: paymentMethod === 'CREDIT_CARD' ? {
                number: cardNumber.replace(/\s/g, ''),
                holderName: cardHolder,
                expiry: cardExpiry,
                cvv: cardCvv
            } : undefined
        };

        const result = await api.apiCreateOrderPayment(jobData, paymentData);

        if (result.success) {
            clearCart();
            setSuccessData(result);
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
    if (item.selectedVariationIds.length === 0) return 'Configuração padrão';
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
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"><CheckCircle size={40} className="text-green-600" /></div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Pedido Enviado com Sucesso!</h2>
              <p className="text-slate-500 mb-8 max-w-md">Seu pedido foi registrado. Aguarde a aprovação do laboratório para iniciar a produção.</p>
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
              <button onClick={() => navigate('/jobs')} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">Ir para Meus Pedidos</button>
          </div>
      );
  }

  if (cart.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-6 bg-indigo-50 rounded-full mb-4 text-indigo-300"><ArrowRight size={48} /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Seu carrinho está vazio</h2>
            <button onClick={() => navigate('/store')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Ir para o Catálogo</button>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      <div className="lg:col-span-2 space-y-6">
        <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Itens do Pedido ({cart.length})</h2>
            <div className="space-y-4">
                {cart.map(item => (
                    <div key={item.cartItemId} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-lg" />
                            <div>
                                <h4 className="font-bold text-slate-800">{item.jobType.name}</h4>
                                <p className="text-sm text-slate-500 line-clamp-1">{getVariationDetails(item)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-700">R$ {item.finalPrice.toFixed(2)}</span>
                            <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="text-indigo-600"/> Forma de Pagamento</h3>
            <div className="flex gap-4 mb-6">
                <button type="button" onClick={() => setPaymentMethod('CREDIT_CARD')} className={`flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'CREDIT_CARD' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}><CreditCard size={20}/> Cartão</button>
                <button type="button" onClick={() => setPaymentMethod('PIX')} className={`flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'PIX' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}><QrCode size={20}/> PIX</button>
            </div>
            <div className="space-y-4">
                <div><label className="block text-sm font-bold text-slate-700 mb-1">CPF do Titular</label><input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="000.000.000-00" /></div>
                {paymentMethod === 'CREDIT_CARD' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">Número do Cartão</label><input value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="0000 0000 0000 0000" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">Validade</label><input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="MM/AA" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-1">CVV</label><input value={cardCvv} onChange={e => setCardCvv(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="123" /></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">Detalhes do Envio</h2>
        <form onSubmit={handleCheckout} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label><input required value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Data Desejada</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg" /></div>
            
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

            <div className="pt-4 border-t border-slate-100 mt-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500 font-bold">Total</span>
                    <span className="text-2xl font-black text-slate-900">R$ {total.toFixed(2)}</span>
                </div>
                
                {compressionStatus && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-700 animate-pulse">
                        <Sparkles size={18} className="shrink-0" />
                        <span className="text-xs font-bold">{compressionStatus}</span>
                    </div>
                )}

                <button type="submit" disabled={isProcessing} className={`w-full py-4 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}>
                    {isProcessing ? <Loader2 className="animate-spin" /> : 'Confirmar e Pagar'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
