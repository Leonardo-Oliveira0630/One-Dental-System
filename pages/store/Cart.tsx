import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Trash2, ArrowRight, CreditCard, Calendar, UploadCloud, File, X, Loader2, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Attachment } from '../../types';

export const Cart = () => {
  const { cart, removeFromCart, createWebOrder, uploadFile, activeOrganization } = useApp();
  const navigate = useNavigate();
  
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const total = cart.reduce((acc, item) => acc + item.finalPrice, 0);

  // --- SAFEGUARD: DENTIST WITHOUT ACTIVE LAB ---
  if (!activeOrganization) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <Building size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum Laboratório Selecionado</h2>
                <p className="text-slate-500 mb-6">
                    Selecione um laboratório parceiro para finalizar sua compra.
                </p>
                <button 
                    onClick={() => navigate('/dentist/partnerships')}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors w-full"
                >
                    Gerenciar Parcerias
                </button>
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
    
    // Validate File Upload
    if (selectedFiles.length === 0) {
        alert("É OBRIGATÓRIO enviar os arquivos digitais (STL/Imagens) para prosseguir.");
        return;
    }

    setIsUploading(true);
    const uploadedAttachments: Attachment[] = [];

    try {
        // Upload each file
        for (const file of selectedFiles) {
            const url = await uploadFile(file);
            uploadedAttachments.push({
                id: Math.random().toString(),
                name: file.name,
                url: url,
                uploadedAt: new Date()
            });
        }

        // Create Order with Attachments
        createWebOrder(patientName, new Date(date), notes, uploadedAttachments);
        navigate('/my-orders');

    } catch (error) {
        console.error("Erro no checkout:", error);
        alert("Erro ao enviar arquivos. Tente novamente.");
    } finally {
        setIsUploading(false);
    }
  };

  const getVariationDetails = (item: import('../../types').CartItem) => {
    if (item.selectedVariationIds.length === 0) return 'Configuração padrão';
    
    const details = item.selectedVariationIds.map(id => {
      let optionName = '';
      let groupType = '';
      
      for (const group of item.jobType.variationGroups) {
        const option = group.options.find(opt => opt.id === id);
        if (option) {
            optionName = option.name;
            groupType = group.selectionType;
            break;
        }
      }
      
      if (groupType === 'TEXT' && item.variationValues && item.variationValues[id]) {
          return `${optionName}: ${item.variationValues[id]}`;
      }
      return optionName;
    }).filter(Boolean);

    return details.join(', ');
  };

  if (cart.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-6 bg-indigo-50 rounded-full mb-4 text-indigo-300"><ArrowRight size={48} /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Seu carrinho está vazio</h2>
            <p className="text-slate-500 mb-6">Inicie um novo trabalho selecionando produtos do catálogo.</p>
            <button onClick={() => navigate('/store')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                Ir para o Catálogo
            </button>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Itens do Pedido ({cart.length})</h2>
        {cart.map(item => (
            <div key={item.cartItemId} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg" />
                    <div>
                        <h4 className="font-bold text-slate-800">{item.jobType.name}</h4>
                        <p className="text-sm text-slate-500 line-clamp-1" title={getVariationDetails(item)}>
                            {getVariationDetails(item)}
                        </p>
                        <p className="text-sm font-medium text-slate-600">Qtd: {item.quantity}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="font-bold text-slate-700">R$ {item.finalPrice.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 block">Un: R$ {item.unitPrice.toFixed(2)}</span>
                    </div>
                    <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* Checkout Form */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><CreditCard className="text-indigo-600" /> Detalhes do Trabalho</h2>
        <form onSubmit={handleCheckout} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente</label>
                <input required value={patientName} onChange={e => setPatientName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: João da Silva" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega Desejada</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
            </div>
            
            {/* File Upload Section */}
            <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Arquivos do Caso (STL/Fotos) <span className="text-red-500">* Obrigatório</span></label>
                <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center hover:bg-indigo-50 transition-colors relative">
                    <input 
                        type="file" 
                        multiple 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileSelect}
                    />
                    <div className="flex flex-col items-center gap-2 text-indigo-400">
                        <UploadCloud size={32} />
                        <span className="text-sm font-medium text-indigo-600">Clique ou arraste arquivos aqui</span>
                    </div>
                </div>
                
                {/* File List */}
                {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-sm border border-slate-200">
                                <div className="flex items-center gap-2 truncate">
                                    <File size={14} className="text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <button type="button" onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500">
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Cor, Instruções)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Cor A2, entregar urgente..." />
            </div>
            <div className="pt-4 border-t border-slate-100 mt-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500">Total Estimado</span>
                    <span className="text-2xl font-bold text-slate-900">R$ {total.toFixed(2)}</span>
                </div>
                <button 
                    type="submit" 
                    disabled={isUploading}
                    className={`w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isUploading ? <><Loader2 className="animate-spin" /> Enviando Arquivos...</> : 'Enviar Pedido'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};