
import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  Calendar, ArrowUpRight, ArrowDownRight, 
  Download, Filter, Search, CreditCard, 
  Clock, CheckCircle, XCircle, AlertTriangle,
  BarChart3
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Finance: React.FC = () => {
  const { allPayments, allOrganizations, allPlans } = useApp();
  const [timeRange, setTimeRange] = useState<'30' | '90' | '365'>('30');

  // Métricas Financeiras
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthPayments = allPayments.filter(p => 
      p.status === 'PAID' && p.paymentDate && p.paymentDate >= currentMonthStart
    );

    const lastMonthPayments = allPayments.filter(p => 
      p.status === 'PAID' && p.paymentDate && 
      p.paymentDate >= lastMonthStart && p.paymentDate <= lastMonthEnd
    );

    const currentRevenue = currentMonthPayments.reduce((acc, p) => acc + p.amount, 0);
    const lastRevenue = lastMonthPayments.reduce((acc, p) => acc + p.amount, 0);
    
    const revenueGrowth = lastRevenue === 0 ? 100 : ((currentRevenue - lastRevenue) / lastRevenue) * 100;

    // MRR (Monthly Recurring Revenue) - Baseado em assinaturas ativas
    const activeOrgs = allOrganizations.filter(org => org.subscriptionStatus === 'ACTIVE');
    const mrr = activeOrgs.reduce((acc, org) => {
      const plan = allPlans.find(p => p.id === org.planId);
      return acc + (plan?.price || 0);
    }, 0);

    // Projeções
    const annualProjection = mrr * 12;
    const nextMonthProjection = mrr * 1.05; // Estimativa conservadora de 5% de crescimento

    return {
      currentRevenue,
      revenueGrowth,
      mrr,
      totalCustomers: allOrganizations.length,
      activeSubscriptions: activeOrgs.length,
      annualProjection,
      nextMonthProjection
    };
  }, [allPayments, allOrganizations, allPlans]);

  // Dados para o gráfico de Receita
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthPayments = allPayments.filter(p => 
        p.status === 'PAID' && p.paymentDate && 
        p.paymentDate >= start && p.paymentDate <= end
      );
      return {
        name: format(month, 'MMM', { locale: ptBR }),
        revenue: monthPayments.reduce((acc, p) => acc + p.amount, 0)
      };
    });
  }, [allPayments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-50';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'OVERDUE': return 'text-red-600 bg-red-50';
      case 'CANCELLED': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro SaaS</h1>
          <p className="text-gray-500">Acompanhe a saúde financeira da plataforma</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.revenueGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(metrics.revenueGrowth).toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Receita Mensal</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.currentRevenue)}
          </h2>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">MRR Projetado</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
          </h2>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Assinantes Ativos</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">{metrics.activeSubscriptions}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Ticket Médio</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr / (metrics.activeSubscriptions || 1))}
          </h2>
        </div>
      </div>

      {/* Projeções */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Projeção Anual (ARR)</h3>
          </div>
          <p className="text-blue-100 text-sm">Estimativa baseada no MRR atual</p>
          <h2 className="text-4xl font-black mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.annualProjection)}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-xs text-blue-100">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Projeção para os próximos 12 meses</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Projeção Próximo Mês</h3>
          </div>
          <p className="text-emerald-100 text-sm">Crescimento estimado de 5%</p>
          <h2 className="text-4xl font-black mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.nextMonthProjection)}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100">
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            <span>Meta de faturamento para {format(addMonths(new Date(), 1), 'MMMM', { locale: ptBR })}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Receita */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Evolução da Receita</h3>
            <select 
              className="text-sm border-gray-200 rounded-lg focus:ring-blue-500"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val), 'Receita']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Planos */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição por Plano</h3>
          <div className="space-y-6">
            {allPlans.map(plan => {
              const count = allOrganizations.filter(org => org.planId === plan.id).length;
              const percentage = (count / (allOrganizations.length || 1)) * 100;
              return (
                <div key={plan.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{plan.name}</span>
                    <span className="text-gray-500">{count} assinantes ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Histórico de Pagamentos</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar pagamento..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Organização</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allPayments.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{payment.organizationName}</div>
                    <div className="text-xs text-gray-500">ID: {payment.organizationId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{payment.planName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {payment.paymentDate && !isNaN(new Date(payment.paymentDate).getTime()) ? format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {allPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    Nenhum pagamento registrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
