import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Clock, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { getProductionInsights } from '../services/geminiService';

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
  const { jobs } = useApp();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

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

  return (
    <div className="space-y-8">
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