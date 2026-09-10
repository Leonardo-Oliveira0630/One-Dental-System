import React, { useState } from 'react';
import { SupplierOrder, OrderReturnRequest, ReturnRequestType, ReturnRequestReason } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { 
  apiSubmitOrderReturnRequest, 
  apiPostReturnTrackingCode 
} from '../../../services/firebaseService';
import { 
  X, AlertTriangle, ShieldCheck, RefreshCw, Truck, Clock, 
  CheckCircle2, ArrowRight, FileText, Image as ImageIcon,
  DollarSign, Package, HelpCircle, ChevronRight, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderCancelReturnModalProps {
  order: SupplierOrder;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OrderCancelReturnModal: React.FC<OrderCancelReturnModalProps> = ({
  order,
  onClose,
  onSuccess
}) => {
  const { currentOrg, currentUser } = useApp();
  
  const existingReq = order.returnRequest;
  const isDelivered = order.deliveryStatus === 'DELIVERED' || order.status === 'DELIVERED';
  const isShipped = order.deliveryStatus === 'SHIPPED' || order.status === 'SHIPPED';
  
  // Default mode: if delivered -> RETURN/EXCHANGE; if not yet shipped -> CANCEL
  const defaultType: ReturnRequestType = isDelivered ? 'RETURN' : isShipped ? 'RETURN' : 'CANCEL';
  
  const [requestType, setRequestType] = useState<ReturnRequestType>(defaultType);
  const [reason, setReason] = useState<ReturnRequestReason>(
    isDelivered ? 'CDC_7_DAYS' : 'BUYER_REMORSE_PRE_DISPATCH'
  );
  const [details, setDetails] = useState('');
  const [resolution, setResolution] = useState<'REFUND' | 'EXCHANGE' | 'STORE_CREDIT'>('REFUND');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Client posting tracking code state (when approved by supplier)
  const [buyerPostageCode, setBuyerPostageCode] = useState('');
  const [savingPostage, setSavingPostage] = useState(false);

  const handleAddPhoto = () => {
    if (photoUrlInput.trim()) {
      setPhotos([...photos, photoUrlInput.trim()]);
      setPhotoUrlInput('');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setErrorMsg('Por favor, descreva o motivo da sua solicitação.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const reasonLabels: Record<ReturnRequestReason, string> = {
        'CDC_7_DAYS': 'Direito de Arrependimento (Art. 49 CDC - 7 Dias)',
        'DEFECT_WARRANTY': 'Defeito de Fabricação / Garantia Técnica (90 dias)',
        'SHIPPING_DAMAGE': 'Avaria ou Dano durante o Transporte',
        'DIVERGENT_PRODUCT': 'Produto Divergente do Anunciado / Incompatível',
        'DISPATCH_DELAY': 'Atraso no Prazo de Despacho / Entrega',
        'BUYER_REMORSE_PRE_DISPATCH': 'Desistência da Compra antes do Envio',
        'OTHER': 'Outro Motivo'
      };

      const newRequest: OrderReturnRequest = {
        id: `req_${Date.now()}`,
        orderId: order.id,
        type: requestType,
        reason,
        reasonLabel: reasonLabels[reason] || 'Solicitação de Devolução/Cancelamento',
        details: details.trim(),
        requestedResolution: resolution,
        status: 'PENDING',
        requestedAt: new Date(),
        photos: photos.length > 0 ? photos : undefined,
        requestedByUserId: currentUser?.id || '',
        requestedByUserName: currentUser?.name || currentOrg?.name || 'Cliente Comprador',
        requestedByUserEmail: currentUser?.email || '',
        requestedByOrgId: currentOrg?.id || '',
        requestedByOrgName: currentOrg?.name || 'Organização Cliente'
      };

      await apiSubmitOrderReturnRequest(order.id, newRequest);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePostageCode = async () => {
    if (!buyerPostageCode.trim()) return;
    setSavingPostage(true);
    try {
      await apiPostReturnTrackingCode(order.id, buyerPostageCode.trim());
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao registrar código de postagem.');
    } finally {
      setSavingPostage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 bg-zinc-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              existingReq 
                ? 'bg-indigo-600 text-white' 
                : requestType === 'CANCEL' 
                ? 'bg-rose-500 text-white' 
                : 'bg-amber-500 text-white'
            }`}>
              {existingReq ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-950">
                {existingReq ? 'Acompanhar Cancelamento / Devolução' : 'Solicitar Cancelamento ou Devolução'}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Pedido #{order.id.substring(0, 8).toUpperCase()} • Fornecedor: <strong>{order.supplierName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* If there is already an active return request, show status and progress */}
          {existingReq ? (
            <div className="space-y-6">
              {/* Status Header Box */}
              <div className={`p-5 rounded-2xl border ${
                existingReq.status === 'REFUNDED' || existingReq.status === 'EXCHANGED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : existingReq.status === 'REJECTED'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : existingReq.status === 'APPROVED'
                  ? 'bg-blue-50 border-blue-200 text-blue-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block opacity-75">
                      Status da Solicitação
                    </span>
                    <h4 className="font-black text-base">
                      {existingReq.status === 'PENDING' && 'Em Análise pelo Fornecedor'}
                      {existingReq.status === 'APPROVED' && 'Solicitação Aprovada - Aguardando Devolução / Logística Reversa'}
                      {existingReq.status === 'POSTED_BY_BUYER' && 'Produto Postado pelo Cliente (Em Trânsito Recluso)'}
                      {existingReq.status === 'RECEIVED_BY_SUPPLIER' && 'Produto Recebido pelo Fornecedor (Em Vistoria Final)'}
                      {existingReq.status === 'REFUNDED' && 'Cancelamento Concluído & Estorno / Reembolso Efetuado'}
                      {existingReq.status === 'EXCHANGED' && 'Troca Concluída com Sucesso'}
                      {existingReq.status === 'REJECTED' && 'Solicitação Recusada pelo Fornecedor'}
                    </h4>
                    <p className="text-xs opacity-90">
                      {existingReq.status === 'PENDING' && 'O fornecedor tem até 24h a 48h úteis para analisar o pedido de cancelamento/devolução.'}
                      {existingReq.status === 'APPROVED' && 'Siga as orientações de postagem reversa abaixo para enviar o produto sem custos.'}
                      {existingReq.status === 'REFUNDED' && 'O valor foi estornado ou creditado conforme o método original da compra.'}
                      {existingReq.status === 'REJECTED' && `Justificativa do fornecedor: "${existingReq.rejectionReason || 'Não atende aos critérios do CDC ou prazo expirado'}"`}
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-white/80 rounded-lg text-xs font-mono font-bold shadow-xs">
                    {existingReq.type === 'CANCEL' ? 'Cancelamento' : existingReq.type === 'EXCHANGE' ? 'Troca' : 'Devolução'}
                  </span>
                </div>
              </div>

              {/* Reverse Postage Code Box if Approved */}
              {existingReq.status === 'APPROVED' && (
                <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                    <Truck size={16} className="text-blue-600" />
                    <span>Autorização de Postagem Reversa (Logística Gratuita)</span>
                  </div>

                  {existingReq.reversePostageCode ? (
                    <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-2">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase">Código de Postagem Correios / Transportadora</span>
                      <p className="font-mono font-black text-lg text-blue-900 tracking-wider">
                        {existingReq.reversePostageCode}
                      </p>
                      {existingReq.reversePostageDeadline && (
                        <p className="text-zinc-600 text-xs">
                          Válido até: <strong>{existingReq.reversePostageDeadline}</strong>
                        </p>
                      )}
                      {existingReq.reverseInstructions && (
                        <p className="text-zinc-700 italic pt-1 border-t border-zinc-100">
                          Instruções: "{existingReq.reverseInstructions}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-blue-800">
                      O fornecedor aprovou sua devolução. Aguarde a emissão do código de postagem reversa ou entre em contato pelo chat da loja.
                    </p>
                  )}

                  {/* Input for Buyer to confirm posting tracking code */}
                  <div className="pt-2 border-t border-blue-200/60 space-y-2">
                    <label className="font-bold text-blue-950 block">
                      Já postou o item nos Correios? Informe o código de rastreamento do envio de retorno:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: QB123456789BR"
                        value={buyerPostageCode}
                        onChange={(e) => setBuyerPostageCode(e.target.value)}
                        className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono uppercase text-zinc-900 outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={handleSavePostageCode}
                        disabled={savingPostage || !buyerPostageCode.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-xs shrink-0"
                      >
                        {savingPostage ? 'Salvando...' : 'Confirmar Envio'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Details Summary */}
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3 text-xs">
                <h5 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                  Dados Registrados da Solicitação
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Motivo Selecionado</span>
                    <span className="font-bold text-zinc-900">{existingReq.reasonLabel}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Resolução Solicitada</span>
                    <span className="font-bold text-zinc-900">
                      {existingReq.requestedResolution === 'REFUND' ? 'Estorno / Reembolso Integral' : existingReq.requestedResolution === 'EXCHANGE' ? 'Troca por Novo Produto' : 'Crédito na Loja'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Explicação Fornecida</span>
                    <p className="bg-white p-3 rounded-xl border border-zinc-200 text-zinc-800 mt-1">
                      "{existingReq.details}"
                    </p>
                  </div>
                </div>

                {existingReq.photos && existingReq.photos.length > 0 && (
                  <div className="pt-2">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold mb-2">Fotos Anexadas</span>
                    <div className="flex gap-2 flex-wrap">
                      {existingReq.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="Evidência" className="w-16 h-16 object-cover rounded-xl border border-zinc-300 hover:scale-105 transition-transform" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* New Request Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Guidelines & CDC Notice Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
                <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-extrabold text-emerald-950">Garantia LabProx & Código de Defesa do Consumidor</h5>
                  <p className="text-emerald-800 leading-relaxed">
                    Você tem direito a <strong>7 dias corridos</strong> para arrependimento e devolução total (Art. 49 do CDC) a contar do recebimento, ou <strong>90 dias</strong> para acionar a garantia legal em caso de vício ou defeito de fabricação.
                  </p>
                </div>
              </div>

              {/* Action Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                  Tipo de Solicitação
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('CANCEL');
                      setReason('BUYER_REMORSE_PRE_DISPATCH');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      requestType === 'CANCEL'
                        ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="font-bold text-xs block">Cancelar Pedido</span>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                      Antes do envio ou despacho
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('RETURN');
                      setReason('CDC_7_DAYS');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      requestType === 'RETURN'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="font-bold text-xs block">Devolver Produto</span>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                      Arrependimento CDC ou avaria
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('EXCHANGE');
                      setReason('DEFECT_WARRANTY');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      requestType === 'EXCHANGE'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="font-bold text-xs block">Trocar Produto</span>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                      Defeito ou item incompatível
                    </span>
                  </button>
                </div>
              </div>

              {/* Reason Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                  Motivo Principal
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnRequestReason)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-xs text-zinc-900 font-medium outline-none focus:border-zinc-900 focus:bg-white"
                >
                  <option value="CDC_7_DAYS">Direito de Arrependimento (Art. 49 CDC - até 7 dias da entrega)</option>
                  <option value="DEFECT_WARRANTY">Defeito de Fabricação / Garantia Legal (até 90 dias)</option>
                  <option value="SHIPPING_DAMAGE">Avaria ou Dano durante o Transporte</option>
                  <option value="DIVERGENT_PRODUCT">Produto Recebido Diferente do Anunciado / Incompatível</option>
                  <option value="DISPATCH_DELAY">Atraso excessivo no envio pelo fornecedor</option>
                  <option value="BUYER_REMORSE_PRE_DISPATCH">Desistência da compra antes do despacho</option>
                  <option value="OTHER">Outro Motivo</option>
                </select>
              </div>

              {/* Resolution Preference */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                  Como prefere resolver?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('REFUND')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      resolution === 'REFUND'
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <DollarSign size={14} />
                    <span>Estorno Integral (Reembolso)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution('EXCHANGE')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      resolution === 'EXCHANGE'
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <RefreshCw size={14} />
                    <span>Troca por Novo Produto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution('STORE_CREDIT')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      resolution === 'STORE_CREDIT'
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <Package size={14} />
                    <span>Crédito para Compras</span>
                  </button>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                  Explicação Detalhada do Motivo *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Por favor descreva detalhadamente a situação, estado da embalagem, vício do produto ou motivo de cancelamento..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:bg-white resize-none"
                />
              </div>

              {/* Photos Attachment (Optional but recommended for damaged items) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                  Fotos / Evidências do Produto (Opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Cole a URL da imagem da avaria/produto..."
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-xs font-bold rounded-xl transition-all shrink-0"
                  >
                    Adicionar Foto
                  </button>
                </div>

                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-2">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-zinc-300">
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 ${
                    requestType === 'CANCEL'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-zinc-950 hover:bg-zinc-800'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span>{requestType === 'CANCEL' ? 'Confirmar Cancelamento' : 'Enviar Solicitação de Devolução'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
