import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, DollarSign, Package, Clock, Truck, CheckCircle2, 
  MapPin, User, Mail, Phone, Calendar, Info, Search, RefreshCw,
  Scale, ShieldAlert, ShieldCheck, ChevronRight, MessageSquare, AlertTriangle,
  FileSpreadsheet, Printer, ArrowRight, CheckSquare, Layers,
  Building2, ExternalLink, Filter
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { subscribeSupplierConversations } from '../../services/firebaseService';
import { SupplierOrder } from '../../types';
import { SupplierOrderDetailsDrawer } from './components/SupplierOrderDetailsDrawer';
import { SupplierOrderPackingSlipModal } from './components/SupplierOrderPackingSlipModal';
import { SupplierFinancialTab } from './components/SupplierFinancialTab';

export type SupplierOrderTab = 'SEPARATION' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'RETURNED' | 'ALL';

export const SupplierDashboard = () => {
  const { currentOrg, supplierOrders, updateSupplierOrder } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Top Level View Mode: Orders vs Finance
  const initialMainTab = searchParams.get('view') === 'finance' ? 'FINANCE' : 'ORDERS';
  const [mainView, setMainView] = useState<'ORDERS' | 'FINANCE'>(initialMainTab);

  // Orders Sub-tab
  const initialOrderTab = (searchParams.get('tab') as SupplierOrderTab) || 'SEPARATION';
  const [orderTab, setOrderTab] = useState<SupplierOrderTab>(initialOrderTab);

  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<SupplierOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Sync searchParams when mainView changes
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'finance' && mainView !== 'FINANCE') {
      setMainView('FINANCE');
    } else if (viewParam !== 'finance' && mainView === 'FINANCE') {
      // Keep state in sync
    }
  }, [searchParams]);

  // Subscribe to real-time chat unread count
  useEffect(() => {
    if (!currentOrg?.id) return;
    const unsub = subscribeSupplierConversations(currentOrg.id, true, (convs) => {
      const unread = convs.reduce((sum, c) => sum + (c.unreadCountSupplier || 0), 0);
      setUnreadChatCount(unread);
    });
    return () => unsub();
  }, [currentOrg?.id]);

  const isPoliciesPending = !currentOrg?.storeSettings?.policies?.termsAcceptance?.accepted;

  // Filter orders for this supplier
  const myOrders: SupplierOrder[] = useMemo(() => {
    return supplierOrders || [];
  }, [supplierOrders]);

  // Categorize order into standard tab
  const getOrderCategory = (o: SupplierOrder): SupplierOrderTab => {
    if (o.status === 'RETURNED' || !!o.returnRequest || o.deliveryStatus === 'RETURNED' || o.paymentStatus === 'REFUNDED') {
      return 'RETURNED';
    }
    if (o.status === 'DELIVERED' || o.deliveryStatus === 'DELIVERED') {
      return 'DELIVERED';
    }
    if (o.status === 'SHIPPED' || o.deliveryStatus === 'SHIPPED') {
      return 'SHIPPED';
    }
    if (o.status === 'READY_TO_SHIP' || o.deliveryStatus === 'READY_TO_SHIP') {
      return 'READY_TO_SHIP';
    }
    // Default: paid or waiting for separation
    return 'SEPARATION';
  };

  // Counts for each tab badge
  const tabCounts = useMemo(() => {
    let separation = 0;
    let readyToShip = 0;
    let shipped = 0;
    let delivered = 0;
    let returned = 0;

    myOrders.forEach((o) => {
      const cat = getOrderCategory(o);
      if (cat === 'SEPARATION') separation++;
      else if (cat === 'READY_TO_SHIP') readyToShip++;
      else if (cat === 'SHIPPED') shipped++;
      else if (cat === 'DELIVERED') delivered++;
      else if (cat === 'RETURNED') returned++;
    });

    return {
      SEPARATION: separation,
      READY_TO_SHIP: readyToShip,
      SHIPPED: shipped,
      DELIVERED: delivered,
      RETURNED: returned,
      ALL: myOrders.length
    };
  }, [myOrders]);

  // Filter orders by active tab and search query
  const filteredOrders = useMemo(() => {
    return myOrders.filter((o) => {
      if (orderTab !== 'ALL') {
        const cat = getOrderCategory(o);
        if (cat !== orderTab) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const shortId = o.id.replace('order_sup_', '').toLowerCase();
        const buyerName = (o.buyerOrgName || o.buyerName || '').toLowerCase();
        const buyerDoc = (o.buyerCpfCnpj || '').toLowerCase();
        const tracking = (o.trackingCode || '').toLowerCase();
        const itemMatch = o.items?.some(i => i.name.toLowerCase().includes(q));

        if (!shortId.includes(q) && !buyerName.includes(q) && !buyerDoc.includes(q) && !tracking.includes(q) && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [myOrders, orderTab, searchQuery]);

  // Overall Financial metrics for Top bar
  const totalFaturado = useMemo(() => {
    return myOrders
      .filter(o => o.status !== 'CANCELLED' && o.paymentStatus !== 'REFUNDED')
      .reduce((sum, o) => sum + (o.totalValue || 0), 0);
  }, [myOrders]);

  // Update order status wrapper
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: any, additionalData?: Partial<SupplierOrder>) => {
    try {
      const updates: Partial<SupplierOrder> = {
        status: nextStatus,
        ...(additionalData || {})
      };
      await updateSupplierOrder(orderId, updates);
      
      // Update selected order in state if currently open
      setSelectedOrder((prev) => {
        if (prev && prev.id === orderId) {
          return { ...prev, ...updates } as SupplierOrder;
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status do pedido.');
      throw err;
    }
  };

  return (
    <main id="supplier-dashboard" className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50 text-slate-900 min-h-screen">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Painel do Fornecedor</h1>
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-mono text-xs font-bold rounded-md">
              Labprox Hub
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Gestão de pedidos em tempo real, expedição com picking list, rastreamento e controle financeiro completo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold text-xs flex items-center gap-2">
            <Building2 size={15} className="text-indigo-600" />
            <span>{currentOrg?.name || 'Fornecedor Oficial'}</span>
          </div>

          <button
            onClick={() => navigate('/supplier/chat')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <MessageSquare size={15} />
            <span>Chat com Clientes</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Compliance / Terms Notice (if needed) */}
      {isPoliciesPending && (
        <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">Homologação da Loja & Aceite dos Termos Pendente</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Configure suas políticas de envio, devolução (CDC), conformidade ANVISA e homologue os Termos do Marketplace para ativar o selo de garantia oficial.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/supplier/settings')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Configurar Políticas</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Main Mode Navigation: Orders vs Finance */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMainView('ORDERS');
              setSearchParams({});
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              mainView === 'ORDERS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Package size={16} />
            <span>Gestão de Pedidos & Expedição</span>
            <span className="px-2 py-0.5 bg-slate-800 text-white rounded-full text-[10px] font-mono">
              {tabCounts.SEPARATION + tabCounts.READY_TO_SHIP + tabCounts.SHIPPED} ativos
            </span>
          </button>

          <button
            onClick={() => {
              setMainView('FINANCE');
              setSearchParams({ view: 'finance' });
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              mainView === 'FINANCE'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <DollarSign size={16} className="text-emerald-500" />
            <span>Financeiro & Faturamento</span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-emerald-600 font-black">
              R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </button>
        </div>

        {mainView === 'ORDERS' && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sincronização em tempo real</span>
          </div>
        )}
      </div>

      {/* MAIN VIEW: FINANCIAL TAB */}
      {mainView === 'FINANCE' && (
        <SupplierFinancialTab
          orders={myOrders}
          onSelectOrder={(order) => setSelectedOrder(order)}
          supplierName={currentOrg?.name}
        />
      )}

      {/* MAIN VIEW: ORDERS MANAGEMENT */}
      {mainView === 'ORDERS' && (
        <div className="space-y-5">
          {/* Sub-Tabs: Orders Lifecycle */}
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Tab navigation pills */}
            <div className="flex flex-wrap gap-1.5">
              {/* 1. A Separar */}
              <button
                onClick={() => setOrderTab('SEPARATION')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  orderTab === 'SEPARATION'
                    ? 'bg-yellow-500 text-slate-950 shadow-xs ring-2 ring-yellow-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Clock size={14} />
                <span>A Separar</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  orderTab === 'SEPARATION' ? 'bg-slate-950 text-white' : 'bg-yellow-200 text-yellow-900'
                }`}>
                  {tabCounts.SEPARATION}
                </span>
              </button>

              {/* 2. A Despachar */}
              <button
                onClick={() => setOrderTab('READY_TO_SHIP')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  orderTab === 'READY_TO_SHIP'
                    ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Package size={14} />
                <span>A Despachar</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  orderTab === 'READY_TO_SHIP' ? 'bg-white text-purple-900' : 'bg-purple-100 text-purple-800'
                }`}>
                  {tabCounts.READY_TO_SHIP}
                </span>
              </button>

              {/* 3. Enviados */}
              <button
                onClick={() => setOrderTab('SHIPPED')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  orderTab === 'SHIPPED'
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Truck size={14} />
                <span>Enviados</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  orderTab === 'SHIPPED' ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-800'
                }`}>
                  {tabCounts.SHIPPED}
                </span>
              </button>

              {/* 4. Entregues */}
              <button
                onClick={() => setOrderTab('DELIVERED')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  orderTab === 'DELIVERED'
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>Entregues</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  orderTab === 'DELIVERED' ? 'bg-white text-emerald-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {tabCounts.DELIVERED}
                </span>
              </button>

              {/* 5. Devolvidos */}
              <button
                onClick={() => setOrderTab('RETURNED')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  orderTab === 'RETURNED'
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <AlertTriangle size={14} />
                <span>Devolvidos</span>
                {tabCounts.RETURNED > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    orderTab === 'RETURNED' ? 'bg-white text-amber-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {tabCounts.RETURNED}
                  </span>
                )}
              </button>

              {/* 6. Todos */}
              <button
                onClick={() => setOrderTab('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  orderTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Todos ({tabCounts.ALL})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar pedido, cliente, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Orders Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900">
                  {orderTab === 'SEPARATION' ? '📦 Pedidos Pagos a Separar (Picking List)' :
                   orderTab === 'READY_TO_SHIP' ? '🏷️ Pedidos Separados e Prontos para Despacho' :
                   orderTab === 'SHIPPED' ? '🚚 Pedidos em Trânsito com Rastreio' :
                   orderTab === 'DELIVERED' ? '✅ Pedidos Concluídos e Entregues' :
                   orderTab === 'RETURNED' ? '⚠️ Pedidos com Devolução / Logística Reversa' :
                   '📋 Todos os Pedidos Recebidos'}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  ({filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''})
                </span>
              </div>

              {orderTab === 'SEPARATION' && (
                <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  <span>Pagamentos confirmados automaticamente via PIX/Cartão</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Pedido / Data</th>
                    <th className="p-3.5">Comprador (Cliente)</th>
                    <th className="p-3.5">Itens Discriminados</th>
                    <th className="p-3.5">Destino / Frete</th>
                    <th className="p-3.5 text-right">Valor Total</th>
                    <th className="p-3.5 text-center">Status Pagamento</th>
                    <th className="p-3.5 text-center">Status Expedição</th>
                    <th className="p-3.5 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <Package size={24} />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">Nenhum pedido nesta aba</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {orderTab === 'SEPARATION' ? 'Novos pedidos pagos pelos clientes aparecerão aqui automaticamente.' : 'Nenhum pedido encontrado para o filtro selecionado.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const orderShortId = o.id.replace('order_sup_', '').substring(0, 10).toUpperCase();
                      const dateStr = new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                      const isPaid = o.paymentStatus === 'PAID' || o.status === 'DELIVERED' || o.status === 'SHIPPED' || o.status === 'SEPARATION' || o.status === 'READY_TO_SHIP';
                      const isRefunded = o.paymentStatus === 'REFUNDED' || o.status === 'RETURNED';

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Order ID & Date */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-mono font-black text-slate-900 block text-xs">
                              #{orderShortId}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} />
                              {dateStr}
                            </span>
                          </td>

                          {/* Buyer Information */}
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900 truncate max-w-[180px]">
                              {o.buyerOrgName || o.buyerName}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {o.buyerName} {o.buyerPhone ? `• ${o.buyerPhone}` : ''}
                            </p>
                            {o.buyerCpfCnpj && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {o.buyerCpfCnpj}
                              </span>
                            )}
                          </td>

                          {/* Items Breakdown */}
                          <td className="p-3.5">
                            <div className="space-y-1 max-w-[220px]">
                              {o.items?.map((it, idx) => (
                                <p key={idx} className="text-slate-800 text-[11px] truncate">
                                  <strong className="text-indigo-600 font-mono">{it.quantity}x</strong> {it.name}
                                  {it.variationName ? ` (${it.variationName})` : ''}
                                </p>
                              ))}
                            </div>
                          </td>

                          {/* Shipping Destination */}
                          <td className="p-3.5 text-[11px] text-slate-700">
                            {o.buyerAddress ? (
                              <div>
                                <p className="font-medium text-slate-900">
                                  {o.buyerAddress.city || '-'} / {o.buyerAddress.state || '-'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  CEP: {o.buyerAddress.zipCode || '-'} • {o.shippingMethod || 'Frete'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">A combinar</span>
                            )}
                          </td>

                          {/* Total Value */}
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            R$ {o.totalValue.toFixed(2)}
                          </td>

                          {/* Payment Status Badge */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isRefunded ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                              {isRefunded ? 'Reembolsado' : isPaid ? 'Pago' : 'Pendente'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {o.paymentMethod === 'PIX' ? 'PIX' : o.paymentMethod === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}
                            </span>
                          </td>

                          {/* Shipping Status */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                              o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              o.status === 'SHIPPED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              o.status === 'READY_TO_SHIP' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              o.status === 'RETURNED' || !!o.returnRequest ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            }`}>
                              {o.status === 'DELIVERED' ? 'Entregue' :
                               o.status === 'SHIPPED' ? 'Em Trânsito' :
                               o.status === 'READY_TO_SHIP' ? 'A Despachar' :
                               o.status === 'RETURNED' || !!o.returnRequest ? 'Devolução' :
                               'A Separar'}
                            </span>
                            {o.trackingCode && (
                              <span className="text-[10px] font-mono text-indigo-700 font-bold block mt-0.5 truncate max-w-[100px] mx-auto">
                                {o.trackingCode}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Open Details */}
                              <button
                                onClick={() => setSelectedOrder(o)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                Detalhes
                              </button>

                              {/* Print Packing Slip */}
                              <button
                                onClick={() => setOrderToPrint(o)}
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 cursor-pointer"
                                title="Imprimir Ficha de Separação (Picking Slip)"
                              >
                                <Printer size={14} />
                              </button>

                              {/* Open Chat */}
                              <button
                                onClick={() => navigate(`/supplier/chat?orderId=${o.id}&buyerOrgId=${o.buyerOrgId}&buyerOrgName=${encodeURIComponent(o.buyerOrgName || '')}&buyerUserId=${o.buyerUserId || ''}&buyerUserName=${encodeURIComponent(o.buyerName || '')}`)}
                                className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all border border-indigo-200 cursor-pointer"
                                title="Conversar com o Cliente no Chat"
                              >
                                <MessageSquare size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Drawer */}
      {selectedOrder && (
        <SupplierOrderDetailsDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          onOpenPackingSlip={(o) => setOrderToPrint(o)}
        />
      )}

      {/* Printable Packing Slip Modal */}
      {orderToPrint && (
        <SupplierOrderPackingSlipModal
          order={orderToPrint}
          onClose={() => setOrderToPrint(null)}
          supplierName={currentOrg?.name}
          supplierAddress={currentOrg?.address}
          supplierPhone={currentOrg?.phone}
        />
      )}
    </main>
  );
};
