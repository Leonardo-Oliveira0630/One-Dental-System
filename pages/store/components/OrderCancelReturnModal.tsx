import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setErrorMsg(t('store.describeReturnReasonAlert', 'Por favor, descreva o motivo da sua solicitação.'));
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const reasonLabels: Record<ReturnRequestReason, string> = {
        'CDC_7_DAYS': t('store.reasonCdc7Days', 'Direito de Arrependimento (Art. 49 CDC - 7 Dias)'),
        'DEFECT_WARRANTY': t('store.reasonDefectWarranty', 'Defeito de Fabricação / Garantia Técnica (90 dias)'),
        'SHIPPING_DAMAGE': t('store.reasonShippingDamage', 'Avaria ou Dano durante o Transporte'),
        'DIVERGENT_PRODUCT': t('store.reasonDivergentProduct', 'Produto Divergente do Anunciado / Incompatível'),
        'DISPATCH_DELAY': t('store.reasonDispatchDelay', 'Atraso no Prazo de Despacho / Entrega'),
        'BUYER_REMORSE_PRE_DISPATCH': t('store.reasonBuyerRemorse', 'Desistência da Compra antes do Envio'),
        'OTHER': t('store.reasonOther', 'Outro Motivo')
      };

      const newRequest: OrderReturnRequest = {
        id: `req_${Date.now()}`,
        orderId: order.id,
        type: requestType,
        reason,
        reasonLabel: reasonLabels[reason] || t('store.returnOrCancelRequest', 'Solicitação de Devolução/Cancelamento'),
        details: details.trim(),
        requestedResolution: resolution,
        status: 'PENDING',
        requestedAt: new Date(),
        photos: photos.length > 0 ? photos : undefined,
        requestedByUserId: currentUser?.id || '',
        requestedByUserName: currentUser?.name || currentOrg?.name || t('store.buyer', 'Cliente Comprador'),
        requestedByUserEmail: currentUser?.email || '',
        requestedByOrgId: currentOrg?.id || '',
        requestedByOrgName: currentOrg?.name || t('store.clientOrg', 'Organização Cliente')
      };

      await apiSubmitOrderReturnRequest(order.id, newRequest);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t('store.errorSubmittingReturn', 'Erro ao enviar solicitação. Tente novamente.'));
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
      setErrorMsg(t('store.errorRegisteringPostageCode', 'Erro ao registrar código de postagem.'));
    } finally {
      setSavingPostage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#131B2A] rounded-3xl border border-zinc-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-slate-800 bg-zinc-50/80 dark:bg-slate-900/80">
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
              <h3 className="font-black text-base text-zinc-950 dark:text-slate-100">
                {existingReq ? t('store.trackCancelOrReturn', 'Acompanhar Cancelamento / Devolução') : t('store.requestCancelOrReturnHeader', 'Solicitar Cancelamento ou Devolução')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-slate-400 font-medium">
                {t('store.orderNumberLabel', 'Pedido')} #{order.id.substring(0, 8).toUpperCase()} • {t('store.supplierLabel', 'Fornecedor:')} <strong>{order.supplierName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
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
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                  : existingReq.status === 'REJECTED'
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                  : existingReq.status === 'APPROVED'
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200'
                  : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block opacity-75">
                      {t('store.requestStatus', 'Status da Solicitação')}
                    </span>
                    <h4 className="font-black text-base">
                      {existingReq.status === 'PENDING' && t('store.returnUnderReview', 'Em Análise pelo Fornecedor')}
                      {existingReq.status === 'APPROVED' && t('store.returnApprovedAwaitingLogistics', 'Solicitação Aprovada - Aguardando Devolução / Logística Reversa')}
                      {existingReq.status === 'POSTED_BY_BUYER' && t('store.returnPostedInTransit', 'Produto Postado pelo Cliente (Em Trânsito Recluso)')}
                      {existingReq.status === 'RECEIVED_BY_SUPPLIER' && t('store.returnReceivedInspection', 'Produto Recebido pelo Fornecedor (Em Vistoria Final)')}
                      {existingReq.status === 'REFUNDED' && t('store.returnRefundCompleted', 'Cancelamento Concluído & Estorno / Reembolso Efetuado')}
                      {existingReq.status === 'EXCHANGED' && t('store.returnExchangeSuccess', 'Troca Concluída com Sucesso')}
                      {existingReq.status === 'REJECTED' && t('store.returnRejectedSupplier', 'Solicitação Recusada pelo Fornecedor')}
                    </h4>
                    <p className="text-xs opacity-90">
                      {existingReq.status === 'PENDING' && t('store.supplierPendingAnalysisMsg', 'O fornecedor tem até 24h a 48h úteis para analisar o pedido de cancelamento/devolução.')}
                      {existingReq.status === 'APPROVED' && t('store.supplierApprovedFollowInstructions', 'Siga as orientações de postagem reversa abaixo para enviar o produto sem custos.')}
                      {existingReq.status === 'REFUNDED' && t('store.refundCompletedMsg', 'O valor foi estornado ou creditado conforme o método original da compra.')}
                      {existingReq.status === 'REJECTED' && `${t('store.rejectionReasonLabel', 'Justificativa do fornecedor:')} "${existingReq.rejectionReason || t('store.rejectionDefaultMsg', 'Não atende aos critérios do CDC ou prazo expirado')}"`}
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-white/80 dark:bg-slate-800 rounded-lg text-xs font-mono font-bold shadow-xs text-zinc-800 dark:text-slate-200">
                    {existingReq.type === 'CANCEL' ? t('store.cancellation', 'Cancelamento') : existingReq.type === 'EXCHANGE' ? t('store.exchange', 'Troca') : t('store.return', 'Devolução')}
                  </span>
                </div>
              </div>

              {/* Reverse Postage Code Box if Approved */}
              {existingReq.status === 'APPROVED' && (
                <div className="p-5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold text-sm">
                    <Truck size={16} className="text-blue-600 dark:text-blue-400" />
                    <span>{t('store.reversePostageAuth', 'Autorização de Postagem Reversa (Logística Gratuita)')}</span>
                  </div>

                  {existingReq.reversePostageCode ? (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-slate-400 uppercase">{t('store.carrierPostageCode', 'Código de Postagem Correios / Transportadora')}</span>
                      <p className="font-mono font-black text-lg text-blue-900 dark:text-blue-300 tracking-wider">
                        {existingReq.reversePostageCode}
                      </p>
                      {existingReq.reversePostageDeadline && (
                        <p className="text-zinc-600 dark:text-slate-300 text-xs">
                          {t('store.validUntil', 'Válido até:')} <strong>{existingReq.reversePostageDeadline}</strong>
                        </p>
                      )}
                      {existingReq.reverseInstructions && (
                        <p className="text-zinc-700 dark:text-slate-300 italic pt-1 border-t border-zinc-100 dark:border-slate-800">
                          {t('store.instructionsLabel', 'Instruções:')} "{existingReq.reverseInstructions}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-blue-800 dark:text-blue-300">
                      {t('store.awaitingPostageCodeMsg', 'O fornecedor aprovou sua devolução. Aguarde a emissão do código de postagem reversa ou entre em contato pelo chat da loja.')}
                    </p>
                  )}

                  {/* Input for Buyer to confirm posting tracking code */}
                  <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60 space-y-2">
                    <label className="font-bold text-blue-950 dark:text-blue-200 block">
                      {t('store.alreadyPostedQuestion', 'Já postou o item nos Correios? Informe o código de rastreamento do envio de retorno:')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: QB123456789BR"
                        value={buyerPostageCode}
                        onChange={(e) => setBuyerPostageCode(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-zinc-900 dark:text-white outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={handleSavePostageCode}
                        disabled={savingPostage || !buyerPostageCode.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                      >
                        {savingPostage ? t('common.saving', 'Salvando...') : t('store.confirmShipment', 'Confirmar Envio')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Details Summary */}
              <div className="p-5 bg-zinc-50 dark:bg-slate-900/50 border border-zinc-200 dark:border-slate-800 rounded-2xl space-y-3 text-xs">
                <h5 className="font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                  {t('store.requestRegisteredData', 'Dados Registrados da Solicitação')}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700 dark:text-slate-300">
                  <div>
                    <span className="text-zinc-400 dark:text-slate-500 block text-[10px] uppercase font-bold">{t('store.selectedReason', 'Motivo Selecionado')}</span>
                    <span className="font-bold text-zinc-900 dark:text-slate-100">{existingReq.reasonLabel}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-slate-500 block text-[10px] uppercase font-bold">{t('store.requestedResolution', 'Resolução Solicitada')}</span>
                    <span className="font-bold text-zinc-900 dark:text-slate-100">
                      {existingReq.requestedResolution === 'REFUND' ? t('store.fullRefund', 'Estorno / Reembolso Integral') : existingReq.requestedResolution === 'EXCHANGE' ? t('store.exchangeForNew', 'Troca por Novo Produto') : t('store.storeCredit', 'Crédito na Loja')}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-zinc-400 dark:text-slate-500 block text-[10px] uppercase font-bold">{t('store.explanationProvided', 'Explicação Fornecida')}</span>
                    <p className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-200 mt-1">
                      "{existingReq.details}"
                    </p>
                  </div>
                </div>

                {existingReq.photos && existingReq.photos.length > 0 && (
                  <div className="pt-2">
                    <span className="text-zinc-400 dark:text-slate-500 block text-[10px] uppercase font-bold mb-2">{t('store.attachedPhotos', 'Fotos Anexadas')}</span>
                    <div className="flex gap-2 flex-wrap">
                      {existingReq.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="Evidência" className="w-16 h-16 object-cover rounded-xl border border-zinc-300 dark:border-slate-700 hover:scale-105 transition-transform" />
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
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                <ShieldCheck size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-extrabold text-emerald-950 dark:text-emerald-100">{t('store.guaranteeNoticeTitle', 'Garantia Labprox & Código de Defesa do Consumidor')}</h5>
                  <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    {t('store.guaranteeNoticeDesc', 'Você tem direito a 7 dias corridos para arrependimento e devolução total (Art. 49 do CDC) a contar do recebimento, ou 90 dias para acionar a garantia legal em caso de vício ou defeito de fabricação.')}
                  </p>
                </div>
              </div>

              {/* Action Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-wider block">
                  {t('store.requestTypeLabel', 'Tipo de Solicitação')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('CANCEL');
                      setReason('BUYER_REMORSE_PRE_DISPATCH');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      requestType === 'CANCEL'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'bg-zinc-50 dark:bg-slate-900/50 border-zinc-200 dark:border-slate-800 text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold text-xs block">{t('store.cancelOrder', 'Cancelar Pedido')}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-slate-400 mt-0.5 block">
                      {t('store.beforeShipment', 'Antes do envio ou despacho')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('RETURN');
                      setReason('CDC_7_DAYS');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      requestType === 'RETURN'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20'
                        : 'bg-zinc-50 dark:bg-slate-900/50 border-zinc-200 dark:border-slate-800 text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold text-xs block">{t('store.returnProduct', 'Devolver Produto')}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-slate-400 mt-0.5 block">
                      {t('store.cdcRegretOrDamage', 'Arrependimento CDC ou avaria')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('EXCHANGE');
                      setReason('DEFECT_WARRANTY');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      requestType === 'EXCHANGE'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'bg-zinc-50 dark:bg-slate-900/50 border-zinc-200 dark:border-slate-800 text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-bold text-xs block">{t('store.exchangeProduct', 'Trocar Produto')}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-slate-400 mt-0.5 block">
                      {t('store.defectOrIncompatible', 'Defeito ou item incompatível')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Reason Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-wider block">
                  {t('store.primaryReasonLabel', 'Motivo Principal')}
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnRequestReason)}
                  className="w-full bg-zinc-50 dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-zinc-900 dark:text-white font-medium outline-none focus:border-zinc-900 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
                >
                  <option value="CDC_7_DAYS">{t('store.reasonCdc7DaysOpt', 'Direito de Arrependimento (Art. 49 CDC - até 7 dias da entrega)')}</option>
                  <option value="DEFECT_WARRANTY">{t('store.reasonDefectWarrantyOpt', 'Defeito de Fabricação / Garantia Legal (até 90 dias)')}</option>
                  <option value="SHIPPING_DAMAGE">{t('store.reasonShippingDamageOpt', 'Avaria ou Dano durante o Transporte')}</option>
                  <option value="DIVERGENT_PRODUCT">{t('store.reasonDivergentProductOpt', 'Produto Recebido Diferente do Anunciado / Incompatível')}</option>
                  <option value="DISPATCH_DELAY">{t('store.reasonDispatchDelayOpt', 'Atraso excessivo no envio pelo fornecedor')}</option>
                  <option value="BUYER_REMORSE_PRE_DISPATCH">{t('store.reasonBuyerRemorseOpt', 'Desistência da compra antes do despacho')}</option>
                  <option value="OTHER">{t('store.reasonOtherOpt', 'Outro Motivo')}</option>
                </select>
              </div>

              {/* Resolution Preference */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-wider block">
                  {t('store.howPreferToResolve', 'Como prefere resolver?')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('REFUND')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      resolution === 'REFUND'
                        ? 'bg-zinc-950 dark:bg-blue-600 text-white border-zinc-950 dark:border-blue-600 shadow-xs'
                        : 'bg-zinc-50 dark:bg-slate-900 border-zinc-200 dark:border-slate-800 text-zinc-700 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <DollarSign size={14} />
                    <span>{t('store.fullRefund', 'Estorno Integral (Reembolso)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution('EXCHANGE')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      resolution === 'EXCHANGE'
                        ? 'bg-zinc-950 dark:bg-blue-600 text-white border-zinc-950 dark:border-blue-600 shadow-xs'
                        : 'bg-zinc-50 dark:bg-slate-900 border-zinc-200 dark:border-slate-800 text-zinc-700 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <RefreshCw size={14} />
                    <span>{t('store.exchangeForNewProduct', 'Troca por Novo Produto')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution('STORE_CREDIT')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      resolution === 'STORE_CREDIT'
                        ? 'bg-zinc-950 dark:bg-blue-600 text-white border-zinc-950 dark:border-blue-600 shadow-xs'
                        : 'bg-zinc-50 dark:bg-slate-900 border-zinc-200 dark:border-slate-800 text-zinc-700 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Package size={14} />
                    <span>{t('store.storeCreditShopping', 'Crédito para Compras')}</span>
                  </button>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-wider block">
                  {t('store.detailedExplanationRequired', 'Explicação Detalhada do Motivo *')}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={t('store.detailsPlaceholder', 'Por favor descreva detalhadamente a situação, estado da embalagem, vício do produto ou motivo de cancelamento...')}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 resize-none"
                />
              </div>

              {/* Photos Attachment */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-slate-100 uppercase tracking-wider block">
                  {t('store.productPhotosOptional', 'Fotos / Evidências do Produto (Opcional)')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder={t('store.photoUrlPlaceholder', 'Cole a URL da imagem da avaria/produto...')}
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    className="flex-1 bg-zinc-50 dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="px-4 py-2 bg-zinc-200 dark:bg-slate-800 hover:bg-zinc-300 dark:hover:bg-slate-700 text-zinc-900 dark:text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer"
                  >
                    {t('store.addPhoto', 'Adicionar Foto')}
                  </button>
                </div>

                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-2">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-zinc-300 dark:border-slate-700">
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {t('common.back', 'Voltar')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                    requestType === 'CANCEL'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-zinc-950 dark:bg-blue-600 hover:bg-zinc-800 dark:hover:bg-blue-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{t('store.sending', 'Enviando...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{requestType === 'CANCEL' ? t('store.confirmCancellation', 'Confirmar Cancelamento') : t('store.sendReturnRequest', 'Enviar Solicitação de Devolução')}</span>
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
