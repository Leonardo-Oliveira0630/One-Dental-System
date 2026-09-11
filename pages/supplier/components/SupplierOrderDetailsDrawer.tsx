import React, { useState } from 'react';
import { SupplierOrder, ReturnRequestStatus } from '../../../types';
import { 
  X, Package, MapPin, User, Mail, Phone, Calendar, Truck, 
  CheckCircle2, AlertTriangle, ShieldCheck, Printer, MessageSquare, 
  Copy, ExternalLink, Clock, FileText, ArrowRight, CheckSquare, 
  Square, RefreshCw, Send, DollarSign, AlertCircle, ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SupplierOrderDetailsDrawerProps {
  order: SupplierOrder | null;
  onClose: () => void;
  onUpdateStatus: (orderId: string, nextStatus: any, additionalData?: Partial<SupplierOrder>) => Promise<void>;
  onOpenPackingSlip: (order: SupplierOrder) => void;
}

export const SupplierOrderDetailsDrawer: React.FC<SupplierOrderDetailsDrawerProps> = ({
  order,
  onClose,
  onUpdateStatus,
  onOpenPackingSlip,
}) => {
  const navigate = useNavigate();
  const [trackingInput, setTrackingInput] = useState(order?.trackingCode || '');
  const [trackingInfoInput, setTrackingInfoInput] = useState(order?.trackingInfo || '');
  const [internalNotesInput, setInternalNotesInput] = useState(order?.internalNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reverse logistics state
  const [reversePostageCodeInput, setReversePostageCodeInput] = useState(order?.returnRequest?.reversePostageCode || '');
  const [supplierRejectionReason, setSupplierRejectionReason] = useState('');

  if (!order) return null;

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const formattedDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

  const orderShortId = order.id ? order.id.replace('order_sup_', '').substring(0, 10).toUpperCase() : '---';

  const fullAddressString = order.buyerAddress
    ? `${order.buyerAddress.street || ''}, ${order.buyerAddress.number || 'S/N'} ${order.buyerAddress.complement ? `(${order.buyerAddress.complement})` : ''} - ${order.buyerAddress.neighborhood || ''}, ${order.buyerAddress.city || ''}/${order.buyerAddress.state || ''} - CEP: ${order.buyerAddress.zipCode || ''}`
    : 'Endereço não informado';

  // Toggle item picking checklist
  const handleTogglePicking = async (itemIndex: number) => {
    const key = `item_${itemIndex}`;
    const currentChecklist = order.pickingChecklist || {};
    const updatedChecklist = {
      ...currentChecklist,
      [key]: !currentChecklist[key]
    };

    try {
      await onUpdateStatus(order.id, order.status, { pickingChecklist: updatedChecklist });
    } catch (err) {
      console.error('Erro ao atualizar checklist de picking:', err);
    }
  };

  // Save internal notes
  const handleSaveInternalNotes = async () => {
    setIsSavingNotes(true);
    try {
      await onUpdateStatus(order.id, order.status, { internalNotes: internalNotesInput });
      alert('Notas internas salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar notas.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Status transitions
  const handleAdvanceToReadyToShip = async () => {
    if (!confirm('Confirmar que todos os itens foram separados e o pedido está embalado e pronto para despacho?')) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(order.id, 'READY_TO_SHIP', {
        deliveryStatus: 'READY_TO_SHIP',
        separatedAt: new Date(),
        packedAt: new Date()
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDispatchOrder = async () => {
    if (!trackingInput.trim()) {
      const proceed = confirm('Deseja despachar sem código de rastreamento? É altamente recomendável informar o rastreio.');
      if (!proceed) return;
    }

    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(order.id, 'SHIPPED', {
        deliveryStatus: 'SHIPPED',
        trackingCode: trackingInput.trim() || undefined,
        trackingInfo: trackingInfoInput.trim() || undefined,
        shippedAt: new Date()
      });
      alert('Pedido marcado como Enviado / Em Trânsito!');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmDelivered = async () => {
    if (!confirm('Confirmar que o pedido foi entregue ao destinatário?')) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(order.id, 'DELIVERED', {
        deliveryStatus: 'DELIVERED',
        deliveredAt: new Date()
      });
      alert('Pedido marcado como Entregue!');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Reverse Logistics Actions
  const handleApproveReturn = async () => {
    if (!order.returnRequest) return;
    setIsUpdatingStatus(true);
    try {
      const updatedReturn = {
        ...order.returnRequest,
        status: 'APPROVED' as ReturnRequestStatus,
        reversePostageCode: reversePostageCodeInput.trim() || undefined,
        updatedAt: new Date()
      };
      await onUpdateStatus(order.id, 'RETURNED', {
        returnRequest: updatedReturn
      });
      alert('Solicitação de devolução aprovada! Código de postagem reversa registrado.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmReceivedReturn = async () => {
    if (!order.returnRequest) return;
    setIsUpdatingStatus(true);
    try {
      const updatedReturn = {
        ...order.returnRequest,
        status: 'RECEIVED_BY_SUPPLIER' as ReturnRequestStatus,
        updatedAt: new Date()
      };
      await onUpdateStatus(order.id, 'RETURNED', {
        returnRequest: updatedReturn,
        returnedAt: new Date()
      });
      alert('Recebimento do produto devolvido confirmado na fábrica.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFinalizeRefund = async () => {
    if (!order.returnRequest) return;
    if (!confirm('Confirmar a conclusão do estorno / reembolso para o comprador?')) return;
    setIsUpdatingStatus(true);
    try {
      const updatedReturn = {
        ...order.returnRequest,
        status: 'REFUNDED' as ReturnRequestStatus,
        resolvedAt: new Date(),
        updatedAt: new Date()
      };
      await onUpdateStatus(order.id, 'RETURNED', {
        paymentStatus: 'REFUNDED',
        returnRequest: updatedReturn
      });
      alert('Reembolso concluído com sucesso.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Determine current lifecycle step
  const isSeparation = order.status === 'PENDING' || order.status === 'PAID' || order.status === 'SEPARATION';
  const isReadyToShip = order.status === 'READY_TO_SHIP' || order.deliveryStatus === 'READY_TO_SHIP';
  const isShipped = order.status === 'SHIPPED' || order.deliveryStatus === 'SHIPPED';
  const isDelivered = order.status === 'DELIVERED' || order.deliveryStatus === 'DELIVERED';
  const isReturned = order.status === 'RETURNED' || !!order.returnRequest;
  const isCancelled = order.status === 'CANCELLED';

  const allItemsPicked = order.items?.every((_, idx) => order.pickingChecklist?.[`item_${idx}`] === true);

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Top Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-md font-mono text-xs font-bold">
                #{orderShortId}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                isDelivered ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                isShipped ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                isReadyToShip ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                isReturned ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                isCancelled ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`}>
                {isDelivered ? 'Entregue' :
                 isShipped ? 'Enviado / Em Trânsito' :
                 isReadyToShip ? 'Pronto para Despacho' :
                 isReturned ? 'Devolução / Reversa' :
                 isCancelled ? 'Cancelado' :
                 'A Separar (Pago)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Calendar size={13} />
              <span>Realizado em: {formattedDate}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPackingSlip(order)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Imprimir Ficha de Separação / Espelho"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Ficha de Separação</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lifecycle Stepper / Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <div className={`flex items-center gap-1.5 ${isSeparation || isReadyToShip || isShipped || isDelivered ? 'text-indigo-600 font-black' : ''}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                isSeparation ? 'bg-indigo-600 text-white ring-2 ring-indigo-200' : 'bg-emerald-500 text-white'
              }`}>
                1
              </div>
              <span>A Separar</span>
            </div>

            <div className="flex-1 h-0.5 bg-slate-200 mx-2">
              <div className={`h-full ${isReadyToShip || isShipped || isDelivered ? 'bg-emerald-500' : 'bg-transparent'}`} />
            </div>

            <div className={`flex items-center gap-1.5 ${isReadyToShip ? 'text-purple-700 font-black' : isShipped || isDelivered ? 'text-emerald-600 font-black' : ''}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                isReadyToShip ? 'bg-purple-600 text-white ring-2 ring-purple-200' : isShipped || isDelivered ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </div>
              <span>A Despachar</span>
            </div>

            <div className="flex-1 h-0.5 bg-slate-200 mx-2">
              <div className={`h-full ${isShipped || isDelivered ? 'bg-emerald-500' : 'bg-transparent'}`} />
            </div>

            <div className={`flex items-center gap-1.5 ${isShipped ? 'text-blue-700 font-black' : isDelivered ? 'text-emerald-600 font-black' : ''}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                isShipped ? 'bg-blue-600 text-white ring-2 ring-blue-200' : isDelivered ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                3
              </div>
              <span>Enviado</span>
            </div>

            <div className="flex-1 h-0.5 bg-slate-200 mx-2">
              <div className={`h-full ${isDelivered ? 'bg-emerald-500' : 'bg-transparent'}`} />
            </div>

            <div className={`flex items-center gap-1.5 ${isDelivered ? 'text-emerald-700 font-black' : ''}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                isDelivered ? 'bg-emerald-600 text-white ring-2 ring-emerald-200' : 'bg-slate-200 text-slate-600'
              }`}>
                4
              </div>
              <span>Entregue</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-900 text-xs">
          
          {/* Quick Action Banner based on Lifecycle */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/40 border border-indigo-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Próxima Ação Recomendada:</span>
              </div>
              {order.paymentStatus === 'PAID' && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] flex items-center gap-1">
                  <ShieldCheck size={12} />
                  Pagamento Confirmado
                </span>
              )}
            </div>

            {isSeparation && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <p className="text-slate-600 text-xs">
                  Faça a conferência dos itens no checklist abaixo e avance para <strong>Pronto para Despacho</strong>.
                </p>
                <button
                  onClick={handleAdvanceToReadyToShip}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  <span>Concluir Separação & Embalar</span>
                </button>
              </div>
            )}

            {isReadyToShip && (
              <div className="space-y-3 pt-1">
                <p className="text-slate-600 text-xs">
                  Pedido embalado! Insira o código de rastreamento para notificar o comprador e despachar o pacote.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ex: BR123456789BR ou Código Transportadora"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <button
                    onClick={handleDispatchOrder}
                    disabled={isUpdatingStatus}
                    className="w-full sm:w-auto px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Truck size={15} />
                    <span>Despachar / Marcar como Enviado</span>
                  </button>
                </div>
              </div>
            )}

            {isShipped && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div>
                  <p className="text-slate-700 font-bold">Pacote em trânsito com a transportadora</p>
                  <p className="text-slate-500 text-[11px]">
                    Rastreio: <strong className="font-mono text-slate-800">{order.trackingCode || 'Não informado'}</strong>
                  </p>
                </div>
                <button
                  onClick={handleConfirmDelivered}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  <span>Confirmar Entrega</span>
                </button>
              </div>
            )}

            {isDelivered && (
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Pedido finalizado com sucesso e entregue ao cliente.</span>
              </div>
            )}
          </div>

          {/* Section: Reverse Logistics / Returns (if applicable) */}
          {order.returnRequest && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Solicitação de Devolução / Logística Reversa</span>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-md font-bold text-[10px]">
                  {order.returnRequest.status === 'PENDING' ? 'Aguardando Análise' :
                   order.returnRequest.status === 'APPROVED' ? 'Devolução Aprovada' :
                   order.returnRequest.status === 'RECEIVED_BY_SUPPLIER' ? 'Recebido na Fábrica' :
                   order.returnRequest.status === 'REFUNDED' ? 'Estorno Concluído' :
                   order.returnRequest.status}
                </span>
              </div>

              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-amber-200 text-slate-700 text-[11px]">
                <p><strong>Motivo:</strong> {order.returnRequest.reasonLabel || order.returnRequest.reason}</p>
                <p><strong>Resolução Solicitada:</strong> {order.returnRequest.requestedResolution === 'REFUND' ? 'Estorno do Valor' : order.returnRequest.requestedResolution === 'EXCHANGE' ? 'Troca do Produto' : 'Crédito na Loja'}</p>
                <p><strong>Detalhes informados:</strong> {order.returnRequest.details}</p>
                <p className="text-slate-400">Solicitado em: {new Date(order.returnRequest.requestedAt).toLocaleDateString('pt-BR')}</p>
              </div>

              {/* Reverse Postage Input & Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-amber-200">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Código de Postagem Reversa (Correios / Transportadora):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ex: PAC Reverso 987654321"
                    value={reversePostageCodeInput}
                    onChange={(e) => setReversePostageCodeInput(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono"
                  />
                  {order.returnRequest.status === 'PENDING' && (
                    <button
                      onClick={handleApproveReturn}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0"
                    >
                      Aprovar Devolução
                    </button>
                  )}
                </div>

                {order.returnRequest.status === 'APPROVED' && (
                  <button
                    onClick={handleConfirmReceivedReturn}
                    disabled={isUpdatingStatus}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Package size={14} />
                    <span>Confirmar Recebimento da Devolução na Fábrica</span>
                  </button>
                )}

                {order.returnRequest.status === 'RECEIVED_BY_SUPPLIER' && (
                  <button
                    onClick={handleFinalizeRefund}
                    disabled={isUpdatingStatus}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <DollarSign size={14} />
                    <span>Concluir Estorno / Reembolso Financeiro</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section: Buyer & Shipping Address (Discriminated Fields) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buyer Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-black text-xs uppercase text-slate-700 flex items-center gap-1.5">
                  <User size={14} className="text-indigo-600" />
                  Dados do Comprador
                </h4>
                <button
                  onClick={() => navigate(`/supplier/chat?orderId=${order.id}&buyerOrgId=${order.buyerOrgId}&buyerOrgName=${encodeURIComponent(order.buyerOrgName || '')}&buyerUserId=${order.buyerUserId || ''}&buyerUserName=${encodeURIComponent(order.buyerName || '')}`)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare size={12} />
                  <span>Chat Direto</span>
                </button>
              </div>

              <div className="space-y-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Razão Social / Nome da Conta</span>
                  <p className="font-bold text-slate-900 text-xs">{order.buyerOrgName || order.buyerName}</p>
                </div>

                {order.buyerCpfCnpj && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">CNPJ / CPF</span>
                    <p className="font-mono font-bold text-slate-800">{order.buyerCpfCnpj}</p>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Responsável pelo Pedido</span>
                  <p className="text-slate-800 font-medium">{order.buyerName}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">E-mail para Contato</span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 truncate font-mono">{order.buyerEmail}</span>
                    <button
                      onClick={() => handleCopy(order.buyerEmail, 'email')}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      title="Copiar e-mail"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                {order.buyerPhone && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Telefone / WhatsApp</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-800 font-mono">{order.buyerPhone}</span>
                      <a
                        href={`https://wa.me/55${order.buyerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline flex items-center gap-1 text-[10px] font-bold"
                      >
                        <span>WhatsApp</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-black text-xs uppercase text-slate-700 flex items-center gap-1.5">
                    <MapPin size={14} className="text-indigo-600" />
                    Endereço de Entrega
                  </h4>
                  <button
                    onClick={() => handleCopy(fullAddressString, 'address')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Copiar endereço completo para etiqueta"
                  >
                    <Copy size={12} />
                    <span>{copiedField === 'address' ? 'Copiado!' : 'Copiar Etiqueta'}</span>
                  </button>
                </div>

                {order.buyerAddress ? (
                  <div className="space-y-1.5 text-[11px] text-slate-800 pt-2 leading-relaxed">
                    <p>
                      <strong>Rua/Av:</strong> {order.buyerAddress.street || 'Não informado'}, Nº {order.buyerAddress.number || 'S/N'}
                    </p>
                    {order.buyerAddress.complement && (
                      <p><strong>Complemento:</strong> {order.buyerAddress.complement}</p>
                    )}
                    <p><strong>Bairro:</strong> {order.buyerAddress.neighborhood || '-'}</p>
                    <p><strong>Cidade/UF:</strong> {order.buyerAddress.city || '-'} - {order.buyerAddress.state || '-'}</p>
                    <p><strong>CEP:</strong> <span className="font-mono font-bold text-indigo-700">{order.buyerAddress.zipCode || '-'}</span></p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic pt-2">Endereço de entrega não cadastrado.</p>
                )}
              </div>

              {/* Shipping Logistics method */}
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span>Modalidade de Frete:</span>
                  <strong className="text-slate-900">{order.shippingMethod || 'Padrão / Frenet'}</strong>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span>Custo do Frete:</span>
                  <strong className="text-slate-900">
                    {order.shippingCost ? `R$ ${order.shippingCost.toFixed(2)}` : 'Frete Grátis'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Items & Interactive Picking Checklist */}
          <div className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <h4 className="font-black text-xs uppercase text-slate-800">
                  Itens do Pedido & Checklist de Separação (Picking)
                </h4>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                allItemsPicked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {allItemsPicked ? 'Todos Conferidos' : 'Clique no item para marcar como separado'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {order.items?.map((item, idx) => {
                const isChecked = order.pickingChecklist?.[`item_${idx}`] === true;
                return (
                  <div 
                    key={idx}
                    onClick={() => handleTogglePicking(idx)}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isChecked ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1 rounded-md transition-colors ${
                        isChecked ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                      }`}>
                        {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>

                      <div className="min-w-0">
                        <p className={`font-bold text-xs ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {item.name}
                        </p>
                        {item.variationName && (
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium mr-1.5">
                            {item.variationName}
                          </span>
                        )}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {item.selectedOptions.map(o => `${o.groupName}: ${o.optionName}`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-xs text-slate-900">
                        {item.quantity} un × R$ {item.price.toFixed(2)}
                      </p>
                      <p className="font-mono font-bold text-xs text-indigo-700">
                        R$ {(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Financial Breakdown & Payment Info */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="font-black text-xs uppercase text-slate-700 flex items-center gap-1.5">
              <DollarSign size={14} className="text-indigo-600" />
              Resumo Financeiro & Faturamento
            </h4>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal dos Produtos:</span>
                <span>R$ {(order.subtotalProducts || (order.totalValue - (order.shippingCost || 0) + (order.discountValue || 0))).toFixed(2)}</span>
              </div>
              {order.shippingCost ? (
                <div className="flex justify-between text-slate-600">
                  <span>Valor do Frete ({order.shippingMethod || 'Transportadora'}):</span>
                  <span>+ R$ {order.shippingCost.toFixed(2)}</span>
                </div>
              ) : null}
              {order.discountValue ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Desconto {order.couponCode ? `(Cupom: ${order.couponCode})` : ''}:</span>
                  <span>- R$ {order.discountValue.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>TOTAL LÍQUIDO DO PEDIDO:</span>
                <span className="text-indigo-700">R$ {order.totalValue.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div>
                Meio de Pagamento: <strong className="text-slate-900">{order.paymentMethod === 'PIX' ? 'PIX' : order.paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Boleto Bancário'}</strong>
              </div>
              <div>
                Status Financeiro: <strong className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.paymentStatus === 'PAID' ? 'PAGO / APROVADO' : order.paymentStatus || 'EM ANÁLISE'}
                </strong>
              </div>
            </div>
          </div>

          {/* Section: Internal Expedition Notes */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-500" />
                Notas Internas da Equipe de Expedição:
              </label>
              <button
                onClick={handleSaveInternalNotes}
                disabled={isSavingNotes}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingNotes ? 'Salvando...' : 'Salvar Notas'}
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Ex: Embalado na caixa nº 2, aguardando coleta das 14h..."
              value={internalNotesInput}
              onChange={(e) => setInternalNotesInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
            />
          </div>

        </div>

        {/* Bottom Bar Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => onOpenPackingSlip(order)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir Espelho</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};
