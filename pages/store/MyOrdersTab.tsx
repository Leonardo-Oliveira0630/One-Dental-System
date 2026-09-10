import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SupplierOrder, ProductReview } from '../../types';
import { 
  subscribeBuyerSupplierOrders, 
  apiAddProductReview, 
  subscribeOrderReviews,
  apiCheckSupplierOrderPayment,
  apiCancelSupplierOrder
} from '../../services/firebaseService';
import { 
  Package, Truck, Clock, CheckCircle2, AlertCircle, 
  ExternalLink, Copy, Check, ChevronRight, X, Star, 
  Building2, MapPin, RefreshCw, ShoppingBag, ShieldCheck, 
  CreditCard, Search, ArrowRight, FileText, MessageSquare,
  AlertTriangle, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrderCancelReturnModal } from './components/OrderCancelReturnModal';
import { SupplierStoreChatModal } from './components/SupplierStoreChatModal';

export function MyOrdersTab() {
  const { currentOrg } = useApp();
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [filterTab, setFilterTab] = useState<'PAID' | 'PENDING' | 'ALL'>('PAID');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Return & Chat Modals state
  const [orderForReturnModal, setOrderForReturnModal] = useState<SupplierOrder | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatSupplierInfo, setChatSupplierInfo] = useState<{ id?: string; name?: string; orderId?: string }>({});

  useEffect(() => {
    if (!currentOrg) return;
    const unsub = subscribeBuyerSupplierOrders(currentOrg.id, (loadedOrders) => {
      setOrders(loadedOrders);
      // Keep selected order in sync if modal is open
      setSelectedOrder((prev) => {
        if (!prev) return null;
        const updated = loadedOrders.find((o) => o.id === prev.id);
        return updated || prev;
      });
      setOrderForReturnModal((prev) => {
        if (!prev) return null;
        const updated = loadedOrders.find((o) => o.id === prev.id);
        return updated || prev;
      });
    });
    return () => unsub();
  }, [currentOrg]);

  const handleOpenChat = (supplierId?: string, supplierName?: string, orderId?: string) => {
    setChatSupplierInfo({ id: supplierId, name: supplierName, orderId });
    setChatModalOpen(true);
  };

  // Filter orders based on user requirements:
  // "depois de pago ai sim o pedido vai para a aba meus pedidos"
  // Default tab shows PAID/Confirmed orders, with secondary tabs for pending & all.
  const filteredOrders = orders.filter((order) => {
    const isPaid = order.paymentStatus === 'PAID' || (order.status && order.status !== 'PENDING' && order.status !== 'CANCELLED');
    const isPending = order.paymentStatus === 'PENDING' && order.status !== 'CANCELLED';

    if (filterTab === 'PAID' && !isPaid) return false;
    if (filterTab === 'PENDING' && !isPending) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchSupplier = order.supplierName?.toLowerCase().includes(q);
      const matchProduct = order.items.some((it) => it.name.toLowerCase().includes(q));
      const matchTracking = order.trackingCode?.toLowerCase().includes(q);
      if (!matchId && !matchSupplier && !matchProduct && !matchTracking) return false;
    }

    return true;
  });

  const paidCount = orders.filter((o) => o.paymentStatus === 'PAID' || (o.status && o.status !== 'PENDING' && o.status !== 'CANCELLED')).length;
  const pendingCount = orders.filter((o) => o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED').length;

  const handleVerifyPayment = async (orderId: string) => {
    setIsCheckingPayment(orderId);
    setStatusMessage(null);
    try {
      const res = await apiCheckSupplierOrderPayment(orderId);
      if (res.paid) {
        setStatusMessage('Pagamento confirmado com sucesso! Seu pedido agora está em separação.');
      } else {
        setStatusMessage('Pagamento ainda não foi identificado pelo Asaas. Aguarde alguns instantes ou conclua a transação.');
      }
    } catch (e: any) {
      setStatusMessage('Erro ao consultar status no Asaas. Tente novamente.');
    } finally {
      setIsCheckingPayment(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(id);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const getDeliveryStatusBadge = (order: SupplierOrder) => {
    const status = order.deliveryStatus || (order.status === 'SHIPPED' ? 'SHIPPED' : order.status === 'DELIVERED' ? 'DELIVERED' : 'PENDING');
    
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} /> Entregue
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck size={13} /> Enviado / Em Trânsito
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Package size={13} /> Em Separação
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <Clock size={13} /> Aguardando Envio
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (order: SupplierOrder) => {
    if (order.paymentStatus === 'PAID' || (order.status && order.status !== 'PENDING' && order.status !== 'CANCELLED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} /> Pago
        </span>
      );
    }
    if (order.status === 'CANCELLED' || order.paymentStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle size={13} /> Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
        <Clock size={13} /> Aguardando Pagamento
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Meus Pedidos</h2>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Acompanhe pedidos confirmados, notas, detalhes dos itens e códigos de rastreamento de entrega.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por código, produto ou fornecedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => setFilterTab('PAID')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              filterTab === 'PAID'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            <span>Confirmados & Pagos</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${filterTab === 'PAID' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
              {paidCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              filterTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            <span>Aguardando Pagamento</span>
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${filterTab === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              filterTab === 'ALL'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            <span>Todos os Pedidos</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${filterTab === 'ALL' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
              {orders.length}
            </span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-zinc-900 text-white text-xs font-medium rounded-2xl flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Orders List Grid */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-zinc-200/80 text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
            <Package size={32} strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-zinc-900">
              Nenhum pedido encontrado
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {filterTab === 'PAID'
                ? 'Você ainda não possui compras com pagamento confirmado. Quando o pagamento for concluído na loja de fornecedores, seu pedido aparecerá aqui automaticamente.'
                : filterTab === 'PENDING'
                ? 'Nenhum pedido pendente de pagamento no momento.'
                : 'Nenhum pedido registrado no sistema.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPaid = order.paymentStatus === 'PAID' || (order.status && order.status !== 'PENDING' && order.status !== 'CANCELLED');
            const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-zinc-200/80 p-5 sm:p-6 hover:border-zinc-300 transition-all shadow-xs space-y-4"
              >
                {/* Order Summary Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-lg">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs text-zinc-400">•</span>
                      <span className="text-xs text-zinc-600 font-medium">
                        {order.createdAt ? format(new Date(order.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : 'Data indisponível'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-900 font-bold">
                      <Building2 size={14} className="text-zinc-400" />
                      <span>Fornecedor: {order.supplierName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {getPaymentStatusBadge(order)}
                    {getDeliveryStatusBadge(order)}
                  </div>
                </div>

                {/* Products Preview and Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Itens do Pedido ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2"
                        >
                          <span className="font-bold text-zinc-900">{item.name}</span>
                          <span className="text-zinc-500 font-mono">x{item.quantity}</span>
                          <span className="text-zinc-900 font-mono font-bold">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-xs text-zinc-500 font-medium self-center">
                          +{order.items.length - 3} mais
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100">
                    <div className="text-left md:text-right">
                      <span className="text-[11px] font-medium text-zinc-500 block">Valor Total</span>
                      <span className="text-lg font-black font-mono text-zinc-950">
                        R$ {order.totalValue.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>Ver Detalhes da Compra</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Return / Cancellation Request Status Banner if present */}
                {order.returnRequest && (
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    order.returnRequest.status === 'REFUNDED' || order.returnRequest.status === 'EXCHANGED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : order.returnRequest.status === 'REJECTED'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : order.returnRequest.status === 'APPROVED'
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <RotateCcw size={15} className="shrink-0" />
                      <div>
                        <span className="font-extrabold block">
                          {order.returnRequest.type === 'CANCEL' ? 'Solicitação de Cancelamento: ' : 'Solicitação de Devolução/Troca: '}
                          {order.returnRequest.status === 'PENDING' && 'Em Análise pelo Fornecedor'}
                          {order.returnRequest.status === 'APPROVED' && 'Aprovada (Aguardando Logística Reversa)'}
                          {order.returnRequest.status === 'POSTED_BY_BUYER' && 'Produto em Devolução (Postado)'}
                          {order.returnRequest.status === 'RECEIVED_BY_SUPPLIER' && 'Recebido pelo Fornecedor'}
                          {order.returnRequest.status === 'REFUNDED' && 'Estorno / Reembolso Concluído'}
                          {order.returnRequest.status === 'EXCHANGED' && 'Troca Concluída'}
                          {order.returnRequest.status === 'REJECTED' && 'Recusada pelo Fornecedor'}
                        </span>
                        <span className="text-[11px] opacity-80">{order.returnRequest.reasonLabel}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOrderForReturnModal(order)}
                      className="px-3 py-1.5 bg-white/90 hover:bg-white text-zinc-900 rounded-xl text-[11px] font-bold shadow-xs shrink-0 transition-all"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                )}

                {/* Tracking alert if available */}
                {order.trackingCode && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900 gap-2">
                    <div className="flex items-center gap-2">
                      <Truck size={15} className="text-blue-600" />
                      <span>Rastreio Correios / Transportadora:</span>
                      <span className="font-mono font-bold">{order.trackingCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.trackingCode!, order.id)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100/60 border border-blue-200 text-blue-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      {copiedTracking === order.id ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedTracking === order.id ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                )}

                {/* Card Quick Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenChat(order.supplierId, order.supplierName, order.id)}
                    className="text-zinc-600 hover:text-zinc-950 font-bold flex items-center gap-1.5 transition-colors py-1"
                  >
                    <MessageSquare size={14} className="text-zinc-400" />
                    <span>Chat com Fornecedor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderForReturnModal(order)}
                    className="text-zinc-500 hover:text-zinc-800 font-medium flex items-center gap-1 transition-colors py-1 text-[11px]"
                  >
                    <RotateCcw size={12} />
                    <span>{order.returnRequest ? 'Acompanhar Devolução' : 'Devolução / Cancelamento'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL ORDER DETAIL MODAL */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onVerifyPayment={handleVerifyPayment}
          isCheckingPayment={isCheckingPayment === selectedOrder.id}
          getPaymentStatusBadge={getPaymentStatusBadge}
          getDeliveryStatusBadge={getDeliveryStatusBadge}
          onOpenChat={(supplierId, name, orderId) => handleOpenChat(supplierId, name, orderId)}
          onOpenReturnModal={(ord) => setOrderForReturnModal(ord)}
        />
      )}

      {/* RETURN / CANCELLATION MODAL */}
      {orderForReturnModal && (
        <OrderCancelReturnModal
          order={orderForReturnModal}
          onClose={() => setOrderForReturnModal(null)}
          onSuccess={() => {
            setStatusMessage('Solicitação registrada com sucesso! O fornecedor foi notificado.');
          }}
        />
      )}

      {/* SUPPLIER STORE CHAT MODAL */}
      <SupplierStoreChatModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        initialSupplierId={chatSupplierInfo.id}
        initialSupplierName={chatSupplierInfo.name}
        initialOrderId={chatSupplierInfo.orderId}
      />
    </div>
  );
}

interface OrderDetailModalProps {
  order: SupplierOrder;
  onClose: () => void;
  onVerifyPayment: (orderId: string) => Promise<void>;
  isCheckingPayment: boolean;
  getPaymentStatusBadge: (order: SupplierOrder) => React.ReactNode;
  getDeliveryStatusBadge: (order: SupplierOrder) => React.ReactNode;
  onOpenChat: (supplierId?: string, name?: string, orderId?: string) => void;
  onOpenReturnModal: (order: SupplierOrder) => void;
}

function OrderDetailModal({
  order,
  onClose,
  onVerifyPayment,
  isCheckingPayment,
  getPaymentStatusBadge,
  getDeliveryStatusBadge,
  onOpenChat,
  onOpenReturnModal
}: OrderDetailModalProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  useEffect(() => {
    const unsub = subscribeOrderReviews(order.id, setReviews);
    return () => unsub();
  }, [order.id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const isPaid = order.paymentStatus === 'PAID' || (order.status && order.status !== 'PENDING' && order.status !== 'CANCELLED');

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 bg-zinc-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-zinc-950">
                  Pedido #{order.id.substring(0, 8).toUpperCase()}
                </h3>
                {getPaymentStatusBadge(order)}
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Fornecedor: <strong>{order.supplierName}</strong> • {order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm") : ''}
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

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Return / Cancellation Status Alert inside Modal */}
          {order.returnRequest && (
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              order.returnRequest.status === 'REFUNDED' || order.returnRequest.status === 'EXCHANGED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : order.returnRequest.status === 'REJECTED'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : order.returnRequest.status === 'APPROVED'
                ? 'bg-blue-50 border-blue-200 text-blue-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  <RotateCcw size={13} />
                  <span>
                    {order.returnRequest.type === 'CANCEL' ? 'Processo de Cancelamento' : 'Processo de Devolução / Troca'}
                  </span>
                </div>
                <h5 className="font-extrabold text-sm">
                  {order.returnRequest.status === 'PENDING' && 'Solicitação em análise pelo fornecedor'}
                  {order.returnRequest.status === 'APPROVED' && 'Solicitação Aprovada - Logística Reversa Liberada'}
                  {order.returnRequest.status === 'POSTED_BY_BUYER' && 'Produto Postado (Aguardando Recebimento na Fábrica)'}
                  {order.returnRequest.status === 'RECEIVED_BY_SUPPLIER' && 'Produto Recebido pelo Fornecedor'}
                  {order.returnRequest.status === 'REFUNDED' && 'Estorno / Reembolso Concluído'}
                  {order.returnRequest.status === 'EXCHANGED' && 'Troca Concluída'}
                  {order.returnRequest.status === 'REJECTED' && 'Solicitação Recusada pelo Fornecedor'}
                </h5>
                <p className="text-xs opacity-85">
                  Motivo: <strong>{order.returnRequest.reasonLabel}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenReturnModal(order)}
                className="px-4 py-2 bg-zinc-950 text-white rounded-xl font-bold text-xs shadow-xs shrink-0 hover:bg-zinc-800 transition-all"
              >
                Ver Detalhes do Processo
              </button>
            </div>
          )}

          {/* Pending Payment Callout */}
          {!isPaid && order.status !== 'CANCELLED' && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                    Aguardando Confirmação do Pagamento
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    O fornecedor iniciará o processo de separação e envio logo após a identificação da liquidação bancária.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-amber-200/70">
                {order.asaasInvoiceUrl && (
                  <a
                    href={order.asaasInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <span>Abrir Fatura / Pagar no Asaas (PIX / Boleto)</span>
                    <ExternalLink size={14} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onVerifyPayment(order.id)}
                  disabled={isCheckingPayment}
                  className="py-2.5 px-4 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isCheckingPayment ? 'animate-spin' : ''} />
                  <span>{isCheckingPayment ? 'Verificando...' : 'Verificar Pagamento'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 1. DELIVERY & SHIPPING SECTION */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
              <div className="flex items-center gap-2 text-xs font-black text-zinc-900 uppercase tracking-wider">
                <Truck size={16} className="text-zinc-600" />
                <span>Modo & Status da Entrega</span>
              </div>
              {getDeliveryStatusBadge(order)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">Modo de Envio</span>
                <p className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Package size={14} className="text-zinc-500" />
                  {order.shippingMethod === 'FRENET'
                    ? 'Frenet (Cotação Integrada)'
                    : order.shippingMethod === 'SEDEX'
                    ? 'Correios SEDEX'
                    : order.shippingMethod === 'PAC'
                    ? 'Correios PAC'
                    : 'A Combinar / Entrega Direta'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">Custo do Frete</span>
                <p className="font-mono font-bold text-zinc-900">
                  {order.shippingCost ? `R$ ${order.shippingCost.toFixed(2)}` : 'Incluso ou a combinar'}
                </p>
              </div>
            </div>

            {/* Tracking Code Box */}
            {order.trackingCode ? (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Código de Rastreamento
                  </span>
                  <p className="font-mono font-black text-sm text-blue-950">
                    {order.trackingCode}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(order.trackingCode!)}
                    className="px-3 py-1.5 bg-white hover:bg-blue-100/60 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    {copiedTracking ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedTracking ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>

                  <a
                    href={`https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(order.trackingCode)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Rastrear</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-zinc-100 rounded-xl text-xs text-zinc-500 flex items-center gap-2">
                <Clock size={14} className="text-zinc-400" />
                <span>Código de rastreio será disponibilizado assim que o pedido for despachado.</span>
              </div>
            )}

            {/* Delivery Address */}
            {order.buyerAddress && (
              <div className="space-y-1 pt-2 border-t border-zinc-200/60 text-xs">
                <span className="text-[11px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                  <MapPin size={12} /> Endereço de Entrega
                </span>
                <p className="text-zinc-800 leading-relaxed font-medium">
                  {order.buyerAddress.street}
                  {order.buyerAddress.number && `, ${order.buyerAddress.number}`}
                  {order.buyerAddress.complement && ` - ${order.buyerAddress.complement}`}
                  {order.buyerAddress.neighborhood && `, ${order.buyerAddress.neighborhood}`}
                  {order.buyerAddress.city && ` - ${order.buyerAddress.city}`}
                  {order.buyerAddress.state && ` / ${order.buyerAddress.state}`}
                  {order.buyerAddress.zipCode && ` • CEP: ${order.buyerAddress.zipCode}`}
                </p>
              </div>
            )}

            {order.notes && (
              <div className="space-y-1 pt-2 border-t border-zinc-200/60 text-xs">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">Observações para Despacho</span>
                <p className="text-zinc-700 italic bg-white p-2.5 rounded-lg border border-zinc-200">
                  "{order.notes}"
                </p>
              </div>
            )}
          </div>

          {/* 2. PURCHASED PRODUCTS LIST */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} className="text-zinc-600" />
              <span>Produtos Comprados & Avaliação</span>
            </h4>

            <div className="space-y-3">
              {order.items.map((item, idx) => {
                const existingReview = reviews.find((r) => r.productId === item.productId);
                const itemTotal = item.price * item.quantity;

                return (
                  <div 
                    key={idx}
                    className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <h5 className="font-extrabold text-sm text-zinc-950">{item.name}</h5>
                        
                        {item.variationName && (
                          <span className="inline-block text-[11px] font-bold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                            Opção: {item.variationName}
                          </span>
                        )}

                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.selectedOptions.map((opt, i) => (
                              <span key={i} className="text-[10px] bg-white border border-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded">
                                {opt.groupName}: {opt.optionName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right space-y-0.5">
                        <div className="text-xs text-zinc-500 font-mono">
                          <span className="font-bold text-zinc-800">{item.quantity} un</span> x R$ {item.price.toFixed(2)}
                        </div>
                        <div className="font-mono font-black text-sm text-zinc-950">
                          Total: R$ {itemTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Review Section per item */}
                    <div className="pt-3 border-t border-zinc-200/80">
                      {existingReview ? (
                        <div className="space-y-1.5 bg-white p-3 rounded-xl border border-zinc-200 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-700">Sua Avaliação:</span>
                            <div className="flex gap-1 text-amber-400">
                              {Array.from({ length: existingReview.rating }).map((_, i) => (
                                <Star key={i} size={14} fill="currentColor" />
                              ))}
                            </div>
                          </div>
                          {existingReview.feedbackText && (
                            <p className="text-zinc-600 italic">"{existingReview.feedbackText}"</p>
                          )}
                          {existingReview.imageUrls && existingReview.imageUrls.length > 0 && (
                            <div className="flex gap-2 pt-1">
                              {existingReview.imageUrls.map((url, i) => (
                                <img key={i} src={url} alt="Review" className="w-12 h-12 object-cover rounded-lg border border-zinc-200" />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {reviewingItemId === item.productId ? (
                            <ReviewForm 
                              order={order} 
                              item={item} 
                              onSuccess={() => setReviewingItemId(null)} 
                              onCancel={() => setReviewingItemId(null)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReviewingItemId(item.productId)}
                              className="text-xs font-bold text-zinc-900 hover:text-zinc-700 underline flex items-center gap-1.5"
                            >
                              <Star size={13} className="text-amber-500" />
                              <span>Avaliar este produto</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. FINANCIAL SUMMARY */}
          <div className="p-5 bg-zinc-900 text-white rounded-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-zinc-800">
              <span className="font-bold uppercase tracking-wider">Resumo Financeiro</span>
              <span className="font-mono">#{order.id.substring(0, 8)}</span>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>Subtotal dos Produtos</span>
              <span className="font-mono">
                R$ {order.items.reduce((s, it) => s + (it.price * it.quantity), 0).toFixed(2)}
              </span>
            </div>

            {order.discountValue && order.discountValue > 0 && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Desconto Aplicado {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span className="font-mono">- R$ {order.discountValue.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-zinc-300">
              <span>Custo de Frete</span>
              <span className="font-mono">
                {order.shippingCost ? `R$ ${order.shippingCost.toFixed(2)}` : 'R$ 0,00'}
              </span>
            </div>

            <div className="flex justify-between text-white font-black text-base pt-2 border-t border-zinc-800">
              <span>Valor Total</span>
              <span className="font-mono text-lg text-emerald-400">
                R$ {order.totalValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChat(order.supplierId, order.supplierName, order.id);
              }}
              className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 border border-zinc-300 shadow-xs"
            >
              <MessageSquare size={15} className="text-zinc-700" />
              <span>Chat com Fornecedor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReturnModal(order);
              }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
                order.returnRequest
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
            >
              <RotateCcw size={14} />
              <span>{order.returnRequest ? 'Acompanhar Solicitação' : 'Solicitar Cancelamento / Devolução'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ 
  order, 
  item, 
  onSuccess,
  onCancel 
}: { 
  order: SupplierOrder; 
  item: any; 
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const { currentOrg, currentUser } = useApp();
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !currentUser) return;
    setSubmitting(true);
    try {
      const review: ProductReview = {
        id: `${order.id}_${item.productId}`,
        orderId: order.id,
        productId: item.productId,
        supplierId: order.supplierId,
        buyerOrgId: currentOrg.id,
        buyerName: currentUser.name || currentOrg.name || 'Comprador',
        rating,
        feedbackText: feedback,
        createdAt: new Date()
      };
      await apiAddProductReview(review);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-xl border border-zinc-200 space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-900">Sua nota para o item:</span>
        <div className="flex gap-1 text-amber-400">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star size={18} fill={s <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>

      <textarea
        placeholder="Escreva seu comentário sobre a qualidade, embalagem ou acabamento do produto..."
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 outline-none focus:border-zinc-900 h-20 resize-none"
      />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          {submitting ? 'Enviando...' : 'Publicar Avaliação'}
        </button>
      </div>
    </form>
  );
}
