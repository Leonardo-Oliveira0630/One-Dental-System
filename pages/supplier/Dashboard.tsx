import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, DollarSign, Package, Clock, Truck, CheckCircle2, 
  MapPin, User, Mail, Phone, Calendar, Info, Search, RefreshCw 
} from 'lucide-react';

export const SupplierDashboard = () => {
  const { currentOrg, supplierOrders, updateSupplierOrder, inventoryItems } = useApp();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SHIPPED' | 'DELIVERED'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Filter orders for this supplier
  const myOrders = supplierOrders || [];

  const filteredOrders = myOrders.filter(o => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  // Calculate metrics
  const pendingOrders = myOrders.filter(o => o.status === 'PENDING').length;
  const shippedOrders = myOrders.filter(o => o.status === 'SHIPPED').length;
  const deliveredOrders = myOrders.filter(o => o.status === 'DELIVERED').length;
  const totalSales = myOrders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalValue || 0), 0);

  const handleUpdateStatus = async (orderId: string, nextStatus: 'SHIPPED' | 'DELIVERED' | 'CANCELLED') => {
    try {
      await updateSupplierOrder(orderId, { status: nextStatus });
      alert(`Status do pedido atualizado para ${nextStatus}!`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status do pedido.');
    }
  };

  return (
    <main id="supplier-dashboard" className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-950 text-slate-100 min-h-screen">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel do Fornecedor</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie novos pedidos, atualize o status de entrega e monitore o estoque dos seus produtos da loja.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {currentOrg?.name || 'Fornecedor Parceiro'}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">FATURAMENTO TOTAL</p>
            <h3 className="text-xl font-bold mt-1 text-emerald-400 font-mono">
              R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">PEDIDOS PENDENTES</p>
            <h3 className="text-xl font-bold mt-1 text-yellow-500 font-mono">{pendingOrders}</h3>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">EM TRÂNSITO</p>
            <h3 className="text-xl font-bold mt-1 text-indigo-400 font-mono">{shippedOrders}</h3>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono">ENTREGUES</p>
            <h3 className="text-xl font-bold mt-1 text-blue-400 font-mono">{deliveredOrders}</h3>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Section Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Pedidos Recebidos</h2>
            <p className="text-slate-400 text-xs mt-0.5">Visualize e despache os pedidos efetuados pelos clientes.</p>
          </div>

          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl gap-1">
            {(['ALL', 'PENDING', 'SHIPPED', 'DELIVERED'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f 
                    ? 'bg-indigo-650 text-white bg-indigo-600 shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendentes' : f === 'SHIPPED' ? 'Em trânsito' : 'Entregues'}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-1" />
              <p className="text-sm">Nenhum pedido encontrado com este status.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs font-mono">
                  <th className="p-4">PEDIDO</th>
                  <th className="p-4">COMPRADOR</th>
                  <th className="p-4">ITENS</th>
                  <th className="p-4 text-right">TOTAL</th>
                  <th className="p-4">DATA</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredOrders.map(o => {
                  const date = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
                  return (
                    <tr key={o.id} className="hover:bg-slate-850/35 transition-colors">
                      <td className="p-4 font-mono text-xs font-semibold text-slate-300">
                        #{o.id.substring(o.id.length - 6).toUpperCase()}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">{o.buyerOrgName}</div>
                        <div className="text-slate-400 text-xs">{o.buyerName}</div>
                      </td>
                      <td className="p-4 text-sm max-w-[200px] truncate message-span text-wrap">
                        {o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                      </td>
                      <td className="p-4 text-right font-mono text-xs font-semibold text-teal-400">
                        R$ {o.totalValue.toFixed(2)}
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-mono">
                        {date.toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                          o.status === 'PENDING' 
                            ? 'bg-yellow-505/10 bg-yellow-500/10 text-yellow-405 text-yellow-400' 
                            : o.status === 'SHIPPED' 
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            o.status === 'PENDING' ? 'bg-yellow-400' : o.status === 'SHIPPED' ? 'bg-indigo-400' : 'bg-blue-400'
                          }`} />
                          {o.status === 'PENDING' ? 'Pendente' : o.status === 'SHIPPED' ? 'Enviado' : 'Entregue'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-semibold text-slate-350 transition-all border border-slate-700"
                          >
                            Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Side-Drawer/Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end animate-fade-in">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col text-slate-100 shadow-2xl relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">DETALHES DO PEDIDO</span>
                <h3 className="text-lg font-bold font-mono text-indigo-400">
                  #{selectedOrder.id.substring(selectedOrder.id.length - 8).toUpperCase()}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Action Header */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400 uppercase">STATUS ATUAL:</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                    selectedOrder.status === 'PENDING' ? 'bg-yellow-405/10 text-yellow-450 bg-yellow-500/10 text-yellow-400' : selectedOrder.status === 'SHIPPED' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {selectedOrder.status === 'PENDING' ? 'Pendente' : selectedOrder.status === 'SHIPPED' ? 'Enviado' : 'Entregue'}
                  </span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-850">
                  {selectedOrder.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')}
                      className="flex-1 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-900/30 flex items-center justify-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" /> Marcar Como Despachado
                    </button>
                  )}
                  {selectedOrder.status === 'SHIPPED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                      className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Como Entregue
                    </button>
                  )}
                  {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                      className="py-2 px-3 text-xs font-bold bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 hover:border-red-550 rounded-lg transition-all"
                    >
                      Cancelar Pedido
                    </button>
                  )}
                </div>
              </div>

              {/* Items Card */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Produtos do Pedido</h4>
                <div className="divide-y divide-slate-850">
                  {selectedOrder.items.map((i: any, idx: number) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-semibold text-slate-200">{i.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">Quantidade: {i.quantity}</p>
                      </div>
                      <span className="font-mono text-slate-300">
                        R$ {(i.price * i.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-350">Valor Total:</span>
                  <span className="font-mono font-bold text-teal-400 text-base">
                    R$ {selectedOrder.totalValue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buyer Information */}
              <div className="p-5 bg-slate-950 border border-slate-850 rounded-xl space-y-3.5 text-sm">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Dados do Comprador</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Organização</p>
                      <p className="font-medium">{selectedOrder.buyerOrgName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Contato Responsável</p>
                      <p className="font-medium">{selectedOrder.buyerName} ({selectedOrder.buyerEmail})</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.buyerAddress && (
                <div className="p-5 bg-slate-950 border border-slate-850 rounded-xl space-y-3.5 text-sm">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widerSpecial flex items-center gap-1.5 uppercase">
                    <MapPin className="w-4 h-4 text-indigo-400" /> Endereço de Entrega
                  </h4>
                  <div className="space-y-1 text-slate-300">
                    <p className="font-medium">
                      {selectedOrder.buyerAddress.street}, {selectedOrder.buyerAddress.number}
                    </p>
                    {selectedOrder.buyerAddress.complement && (
                      <p className="text-xs text-slate-400">
                        Comp: {selectedOrder.buyerAddress.complement}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      Bairro: {selectedOrder.buyerAddress.neighborhood}
                    </p>
                    <p className="text-xs">
                      {selectedOrder.buyerAddress.city} - {selectedOrder.buyerAddress.state}
                    </p>
                    <p className="text-xs font-mono text-slate-500">
                      CEP: {selectedOrder.buyerAddress.zipCode}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-5 bg-slate-950 border border-slate-850 rounded-xl space-y-2 text-sm text-slate-300">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 uppercase">
                    <Info className="w-4 h-4 text-amber-500" /> Observações do Cliente
                  </h4>
                  <p className="text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg italic">
                    "{selectedOrder.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
