import React, { useState, useMemo } from 'react';
import { SupplierOrder } from '../../../types';
import { 
  DollarSign, TrendingUp, Calendar, Filter, Download, 
  Printer, ArrowUpRight, ArrowDownRight, Package, CreditCard, 
  ShoppingBag, Search, ChevronDown, CheckCircle2, Clock, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface SupplierFinancialTabProps {
  orders: SupplierOrder[];
  onSelectOrder: (order: SupplierOrder) => void;
  supplierName?: string;
}

type PeriodPreset = 'TODAY' | 'YESTERDAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';

export const SupplierFinancialTab: React.FC<SupplierFinancialTabProps> = ({
  orders,
  onSelectOrder,
  supplierName
}) => {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'REFUNDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Date Ranges
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (periodPreset === 'TODAY') {
      return { start: todayStart, end: todayEnd, label: 'Hoje' };
    }
    if (periodPreset === 'YESTERDAY') {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayEnd);
      yEnd.setDate(yEnd.getDate() - 1);
      return { start: yStart, end: yEnd, label: 'Ontem' };
    }
    if (periodPreset === '7_DAYS') {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 6);
      return { start: s, end: todayEnd, label: 'Últimos 7 Dias' };
    }
    if (periodPreset === '30_DAYS') {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 29);
      return { start: s, end: todayEnd, label: 'Últimos 30 Dias' };
    }
    if (periodPreset === 'THIS_MONTH') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start: s, end: e, label: 'Este Mês' };
    }
    if (periodPreset === 'LAST_MONTH') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start: s, end: e, label: 'Mês Anterior' };
    }
    if (periodPreset === 'THIS_YEAR') {
      const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { start: s, end: e, label: 'Este Ano' };
    }
    if (periodPreset === 'CUSTOM' && customStartDate && customEndDate) {
      const s = new Date(`${customStartDate}T00:00:00`);
      const e = new Date(`${customEndDate}T23:59:59`);
      return { start: s, end: e, label: 'Período Personalizado' };
    }
    return { start: null, end: null, label: 'Todo o Período' };
  }, [periodPreset, customStartDate, customEndDate]);

  // Filter orders by date, status, search
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Date filter
      if (dateRange.start && dateRange.end) {
        const orderDate = new Date(o.createdAt);
        if (orderDate < dateRange.start || orderDate > dateRange.end) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'PAID') {
        if (o.paymentStatus !== 'PAID' && o.status !== 'DELIVERED' && o.status !== 'SHIPPED' && o.status !== 'SEPARATION' && o.status !== 'READY_TO_SHIP') {
          return false;
        }
      } else if (statusFilter === 'PENDING') {
        if (o.paymentStatus !== 'PENDING') return false;
      } else if (statusFilter === 'REFUNDED') {
        if (o.paymentStatus !== 'REFUNDED' && o.status !== 'RETURNED') return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const shortId = o.id.replace('order_sup_', '').toLowerCase();
        const buyer = (o.buyerOrgName || o.buyerName || '').toLowerCase();
        if (!shortId.includes(q) && !buyer.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, dateRange, statusFilter, searchQuery]);

  // Key Financial KPIs
  const metrics = useMemo(() => {
    let grossSales = 0;
    let paidOrdersCount = 0;
    let totalItemsSold = 0;
    let totalShippingCollected = 0;
    let totalDiscountsGiven = 0;
    let totalRefunded = 0;
    let pendingValue = 0;

    filteredOrders.forEach((o) => {
      const isRefunded = o.paymentStatus === 'REFUNDED' || o.status === 'RETURNED';
      const isCancelled = o.status === 'CANCELLED';

      if (isRefunded) {
        totalRefunded += o.totalValue || 0;
      } else if (isCancelled) {
        // Ignored from sales
      } else if (o.paymentStatus === 'PENDING') {
        pendingValue += o.totalValue || 0;
      } else {
        // Paid / active orders
        grossSales += o.totalValue || 0;
        paidOrdersCount += 1;
        totalShippingCollected += o.shippingCost || 0;
        totalDiscountsGiven += o.discountValue || 0;
        
        o.items?.forEach((item) => {
          totalItemsSold += item.quantity || 0;
        });
      }
    });

    const averageTicket = paidOrdersCount > 0 ? grossSales / paidOrdersCount : 0;
    const netProductsSales = Math.max(0, grossSales - totalShippingCollected);

    return {
      grossSales,
      netProductsSales,
      paidOrdersCount,
      averageTicket,
      totalItemsSold,
      totalShippingCollected,
      totalDiscountsGiven,
      totalRefunded,
      pendingValue
    };
  }, [filteredOrders]);

  // Chart Data: Group by Date
  const chartData = useMemo(() => {
    const map: Record<string, { dateStr: string; faturamento: number; pedidos: number }> = {};

    filteredOrders.forEach((o) => {
      if (o.status === 'CANCELLED' || o.paymentStatus === 'REFUNDED') return;
      const d = new Date(o.createdAt);
      const dateKey = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!map[dateKey]) {
        map[dateKey] = { dateStr: dateKey, faturamento: 0, pedidos: 0 };
      }
      map[dateKey].faturamento += o.totalValue || 0;
      map[dateKey].pedidos += 1;
    });

    return Object.values(map);
  }, [filteredOrders]);

  // Payment Method Breakdown
  const paymentMethodsData = useMemo(() => {
    const counts: Record<string, { name: string; value: number; count: number }> = {
      PIX: { name: 'PIX', value: 0, count: 0 },
      CREDIT_CARD: { name: 'Cartão de Crédito', value: 0, count: 0 },
      BOLETO: { name: 'Boleto Bancário', value: 0, count: 0 }
    };

    filteredOrders.forEach((o) => {
      if (o.status === 'CANCELLED') return;
      const method = o.paymentMethod || 'PIX';
      if (counts[method]) {
        counts[method].value += o.totalValue || 0;
        counts[method].count += 1;
      }
    });

    return Object.values(counts).filter(c => c.count > 0);
  }, [filteredOrders]);

  // Top Products Ranking
  const topProducts = useMemo(() => {
    const prodMap: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      if (o.status === 'CANCELLED' || o.paymentStatus === 'REFUNDED') return;
      o.items?.forEach((item) => {
        const prodId = item.productId || item.name;
        if (!prodMap[prodId]) {
          prodMap[prodId] = { id: prodId, name: item.name, quantity: 0, revenue: 0 };
        }
        prodMap[prodId].quantity += item.quantity || 1;
        prodMap[prodId].revenue += (item.price * (item.quantity || 1));
      });
    });

    return Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredOrders]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Não há dados no período selecionado para exportação.');
      return;
    }

    const headers = [
      'ID Pedido',
      'Data/Hora',
      'Comprador',
      'CNPJ/CPF',
      'Forma Pagamento',
      'Status Pagamento',
      'Status Pedido',
      'Subtotal Produtos (R$)',
      'Frete (R$)',
      'Desconto (R$)',
      'Total Geral (R$)'
    ];

    const rows = filteredOrders.map((o) => {
      const orderShortId = o.id.replace('order_sup_', '').substring(0, 10).toUpperCase();
      const dateStr = new Date(o.createdAt).toLocaleString('pt-BR');
      const buyer = (o.buyerOrgName || o.buyerName || '').replace(/,/g, ' ');
      const subtotal = (o.subtotalProducts || (o.totalValue - (o.shippingCost || 0) + (o.discountValue || 0))).toFixed(2);
      const shipping = (o.shippingCost || 0).toFixed(2);
      const discount = (o.discountValue || 0).toFixed(2);
      const total = (o.totalValue || 0).toFixed(2);

      return [
        orderShortId,
        dateStr,
        `"${buyer}"`,
        `"${o.buyerCpfCnpj || ''}"`,
        o.paymentMethod || 'PIX',
        o.paymentStatus || 'PAID',
        o.status || 'PENDING',
        subtotal,
        shipping,
        discount,
        total
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_financeiro_${supplierName || 'fornecedor'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Filter and Controls Bar */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Period Presets Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Filtrar Faturamento por Período:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'TODAY', label: 'Hoje' },
                { id: 'YESTERDAY', label: 'Ontem' },
                { id: '7_DAYS', label: '7 Dias' },
                { id: '30_DAYS', label: '30 Dias' },
                { id: 'THIS_MONTH', label: 'Este Mês' },
                { id: 'LAST_MONTH', label: 'Mês Anterior' },
                { id: 'THIS_YEAR', label: 'Este Ano' },
                { id: 'ALL', label: 'Todo o Histórico' },
                { id: 'CUSTOM', label: 'Personalizado' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPeriodPreset(preset.id as PeriodPreset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    periodPreset === preset.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: Export & Print */}
          <div className="flex items-center gap-2 self-start lg:self-end">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Exportar dados para planilha Excel / CSV"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Imprimir Relatório Financeiro"
            >
              <Printer size={15} />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Custom Date Picker (when Custom is selected) */}
        {periodPreset === 'CUSTOM' && (
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600"
              />
            </div>
          </div>
        )}

        {/* Secondary Filter Bar: Status & Search */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status Financeiro:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-indigo-600"
            >
              <option value="ALL">Todos os Lançamentos</option>
              <option value="PAID">Pagos / Faturados</option>
              <option value="PENDING">Aguardando Pagamento</option>
              <option value="REFUNDED">Estornados / Devolvidos</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por comprador ou pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* KPI Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Total</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 font-mono">
            R$ {metrics.grossSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500">
            {metrics.paidOrdersCount} pedido(s) faturado(s) no período
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Médio</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-indigo-600 font-mono">
            R$ {metrics.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500">
            Média de receita por pedido concluído
          </p>
        </div>

        {/* Volume de Produtos */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidades Vendidas</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-purple-700 font-mono">
            {metrics.totalItemsSold} un
          </h3>
          <p className="text-[11px] text-slate-500">
            Produtos expedidos no período
          </p>
        </div>

        {/* Frete & Descontos */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frete & Repasses</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-blue-700 font-mono">
            R$ {metrics.totalShippingCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500">
            Descontos/Cupons: <strong className="text-amber-700">R$ {metrics.totalDiscountsGiven.toFixed(2)}</strong>
          </p>
        </div>
      </div>

      {/* Visual Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Evolution Chart */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Evolução do Faturamento no Período</h4>
              <p className="text-slate-500 text-xs">Vendas diárias e volume de pedidos</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateStr" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area type="monotone" dataKey="faturamento" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                <DollarSign size={28} />
                <p className="text-xs font-bold">Nenhum faturamento registrado no período selecionado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown Chart */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Meios de Pagamento</h4>
            <p className="text-slate-500 text-xs">Distribuição por PIX, Cartão e Boleto</p>
          </div>

          <div className="h-44 w-full">
            {paymentMethodsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Valor Total']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                Sem transações
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {paymentMethodsData.map((pm, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-700">{pm.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  R$ {pm.value.toFixed(2)} ({pm.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <ShoppingBag size={16} className="text-indigo-600" />
          <span>Top Produtos Mais Vendidos no Período</span>
        </h4>

        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="pb-2.5">Produto</th>
                  <th className="pb-2.5 text-center">Unidades Vendidas</th>
                  <th className="pb-2.5 text-right">Faturamento Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">
                      <span className="text-slate-400 mr-2">#{idx + 1}</span>
                      {p.name}
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold text-slate-700">{p.quantity} un</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-600">
                      R$ {p.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Nenhum produto vendido no período.</p>
        )}
      </div>

      {/* Detailed Sales Ledger Table */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Extrato Discriminado de Vendas</h4>
            <p className="text-slate-500 text-xs">Listagem completa das transações e pedidos</p>
          </div>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold font-mono">
            {filteredOrders.length} registros
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold text-[11px]">
              <tr>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Pedido #ID</th>
                <th className="p-3">Comprador</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3 text-right">Produtos</th>
                <th className="p-3 text-right">Frete</th>
                <th className="p-3 text-right">Total Líquido</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Nenhum pedido encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const orderShortId = o.id.replace('order_sup_', '').substring(0, 10).toUpperCase();
                  const dateStr = new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const isPaid = o.paymentStatus === 'PAID' || o.status === 'DELIVERED' || o.status === 'SHIPPED' || o.status === 'SEPARATION' || o.status === 'READY_TO_SHIP';
                  const isRefunded = o.paymentStatus === 'REFUNDED' || o.status === 'RETURNED';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        #{orderShortId}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        <p className="truncate max-w-[180px]">{o.buyerOrgName || o.buyerName}</p>
                        {o.buyerCpfCnpj && <span className="text-[10px] text-slate-400 font-mono">{o.buyerCpfCnpj}</span>}
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        {o.paymentMethod === 'PIX' ? 'PIX' : o.paymentMethod === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        R$ {(o.subtotalProducts || (o.totalValue - (o.shippingCost || 0) + (o.discountValue || 0))).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        R$ {(o.shippingCost || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        R$ {o.totalValue.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isRefunded ? 'bg-amber-100 text-amber-800' :
                          isPaid ? 'bg-emerald-100 text-emerald-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isRefunded ? 'Estornado' : isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onSelectOrder(o)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
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
  );
};
