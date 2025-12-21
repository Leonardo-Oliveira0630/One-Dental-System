
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Clock, AlertTriangle, CheckCircle, Sparkles, ShoppingBag, Building, Handshake } from 'lucide-react';
import { getProductionInsights } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}

const StatCard = ({ title, value, icon, color, subtext }: StatCardProps) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
    </div>
    {subtext && <p className="text-xs text-slate-400 mt-4">{subtext}</p>}
  </div>
);

export const Dashboard = () => {
  const { jobs, currentUser, activeOrganization, userConnections } = useApp();
  const navigate = useNavigate();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const isClient = currentUser?.role === UserRole.CLIENT;

  // KPIs
  const totalActive = jobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.DELIVERED).length;
  const completedToday = jobs.filter(j => j.status === JobStatus.COMPLETED && new Date(j.history[j.history.length-1]?.timestamp).toDateString() === new Date().toDateString()).length;
  const urgent = jobs.filter(j => j.urgency === UrgencyLevel.VIP || j.urgency === UrgencyLevel.HIGH).length;
  const delayed = jobs.filter(j => new Date(j.dueDate) < new Date() && j.status !== JobStatus.COMPLETED).length;

  // Chart Data: Status Distribution
  const statusData = [
    { name: 'Pendente', value: jobs.filter(j => j.status === JobStatus.PENDING).length },
    { name: 'Em Prod.', value: jobs.filter(j => j.status === JobStatus.IN_PROGRESS).length },
    { name: 'Aguardando', value: jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length },
    { name: 'Concluído', value: jobs.filter(j => j.status === JobStatus.COMPLETED).length },
  ];
  
  const COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6', '#22c55e'];

  // Gemini Handler
  const handleGenerateInsights = async () => {
    setLoadingAi(true);
    const result = await getProductionInsights(jobs);
    setAiInsights(result);
    setLoadingAi(false);
  };

  // --- DENTIST SPECIFIC VIEW ---
  if (isClient) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-slate-900">Olá, Dr(a). {currentUser.name}</h1>
                    <p className="text-slate-500">Gerencie seus casos e acompanhe a produção em tempo real.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/store')}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105"
                  >
                    <ShoppingBag size={20} /> Novo Pedido Web
                  </button>
              </div>

              {/* Active Partnership Banner */}
              {!activeOrganization ? (
                  <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4 text-center md:text-left">
                          <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl"><Handshake size={32} /></div>
                          <div>
                              <h3 className="text-xl font-bold text-orange-900">Nenhum Laboratório Selecionado</h3>
                              <p className="text-orange-700">Para ver o catálogo e seus pedidos, conecte-se a um laboratório ou selecione um parceiro existente.</p>
                          </div>
                      </div>
                      <button onClick={() => navigate('/dentist/partnerships')} className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl whitespace-nowrap shadow-lg shadow-orange-200">Adicionar Laboratório</button>
                  </div>
              ) : (
                  <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                          <Building size={120} />
                      </div>
                      <div className="flex-1">
                          <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase text-[10px] tracking-widest mb-2">
                             <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> Parceria Ativa
                          </div>
                          <h2 className="text-3xl font-black mb-1">{activeOrganization.name}</h2>
                          <p className="text-indigo-200 text-sm">Visualizando catálogo e {jobs.length} pedidos vinculados a este laboratório.</p>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => navigate('/jobs')} className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 font-bold rounded-xl transition-all">Ver Meus Pedidos</button>
                          <button onClick={() => navigate('/store')} className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl shadow-lg transition-all hover:scale-105">Abrir Loja Web</button>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Em Produção" value={totalActive} icon={<Activity size={24} className="text-blue-600" />} color="bg-blue-50" />
                  <StatCard title="Aguardando Aprovação" value={jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length} icon={<Clock size={24} className="text-purple-600" />} color="bg-purple-50" />
                  <StatCard title="Concluídos" value={jobs.filter(j => j.status === JobStatus.COMPLETED).length} icon={<CheckCircle size={24} className="text-green-600" />} color="bg-green-50" />
                  <StatCard title="Alertas Ativos" value={0} icon={<AlertTriangle size={24} className="text-red-600" />} color="bg-red-50" />
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral da Produção</h1>
          <p className="text-slate-500">Métricas e desempenho do laboratório em tempo real.</p>
        </div>
        <button 
            onClick={handleGenerateInsights}
            disabled={loadingAi}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-70"
        >
            <Sparkles size={18} className={loadingAi ? "animate-spin" : ""} />
            {loadingAi ? 'Analisando Dados...' : 'Insights IA'}
        </button>
      </div>

      {/* AI Panel */}
      {aiInsights && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={100} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <Sparkles size={20} /> Análise de Produção Gemini
            </h3>
            <div className="prose prose-sm text-indigo-800 max-w-none">
                <pre className="whitespace-pre-wrap font-sans">{aiInsights}</pre>
            </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Produção Ativa" 
            value={totalActive} 
            icon={<Activity size={24} className="text-blue-600" />} 
            color="bg-blue-50" 
            subtext="+12% desde a semana passada"
        />
        <StatCard 
            title="Concluídos Hoje" 
            value={completedToday} 
            icon={<CheckCircle size={24} className="text-green-600" />} 
            color="bg-green-50" 
            subtext="Dentro da meta diária"
        />
         <StatCard 
            title="Urgente / VIP" 
            value={urgent} 
            icon={<AlertTriangle size={24} className="text-orange-600" />} 
            color="bg-orange-50" 
            subtext="Requer atenção imediata"
        />
        <StatCard 
            title="Atrasados" 
            value={delayed} 
            icon={<Clock size={24} className="text-red-600" />} 
            color="bg-red-50" 
            subtext="Ação necessária"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição por Status</h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Equilíbrio de Carga</h3>
             <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
    </div>
  );
};
