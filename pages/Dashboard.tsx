
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
  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
      </div>
      <div className={`p-2.5 md:p-3 rounded-xl ${color} shadow-sm`}>
        {icon}
      </div>
    </div>
    {subtext && <p className="text-[10px] text-slate-400 mt-4 font-bold italic">{subtext}</p>}
  </div>
);

export const Dashboard = () => {
  const { jobs, currentUser, activeOrganization } = useApp();
  const navigate = useNavigate();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const isClient = currentUser?.role === UserRole.CLIENT;

  // KPIs
  const totalActive = jobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.DELIVERED).length;
  const completedToday = jobs.filter(j => j.status === JobStatus.COMPLETED && new Date(j.history[j.history.length-1]?.timestamp).toDateString() === new Date().toDateString()).length;
  const urgent = jobs.filter(j => j.urgency === UrgencyLevel.VIP || j.urgency === UrgencyLevel.HIGH).length;
  const delayed = jobs.filter(j => new Date(j.dueDate) < new Date() && j.status !== JobStatus.COMPLETED).length;

  const statusData = [
    { name: 'Pendente', value: jobs.filter(j => j.status === JobStatus.PENDING).length },
    { name: 'Produção', value: jobs.filter(j => j.status === JobStatus.IN_PROGRESS).length },
    { name: 'Aprovação', value: jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length },
    { name: 'Pronto', value: jobs.filter(j => j.status === JobStatus.COMPLETED).length },
  ];
  
  const COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6', '#22c55e'];

  const handleGenerateInsights = async () => {
    setLoadingAi(true);
    const result = await getProductionInsights(jobs);
    setAiInsights(result);
    setLoadingAi(false);
  };

  if (isClient) {
      return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Olá, Dr(a). {currentUser.name}</h1>
                    <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest opacity-60">Status da sua produção digital</p>
                  </div>
                  <button onClick={() => navigate('/store')} className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 uppercase text-xs tracking-widest"><ShoppingBag size={18} /> Novo Pedido Web</button>
              </div>

              {!activeOrganization ? (
                  <div className="bg-orange-50 border-2 border-dashed border-orange-200 p-6 md:p-10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                          <div className="p-4 bg-orange-100 text-orange-600 rounded-3xl"><Handshake size={32} /></div>
                          <div><h3 className="text-xl font-black text-orange-900 uppercase tracking-tighter">Sem Parceria Selecionada</h3><p className="text-orange-700 text-sm font-medium">Escolha um laboratório parceiro para visualizar o catálogo.</p></div>
                      </div>
                      <button onClick={() => navigate('/dentist/partnerships')} className="w-full md:w-auto px-8 py-3.5 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-100 uppercase text-xs">Conectar agora</button>
                  </div>
              ) : (
                  <div className="bg-indigo-900 text-white p-6 md:p-10 rounded-[32px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Building size={120} /></div>
                      <div className="flex-1 relative z-10 text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-300 font-black uppercase text-[10px] tracking-widest mb-3"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> Parceria Ativa</div>
                          <h2 className="text-3xl md:text-4xl font-black mb-2 uppercase tracking-tighter">{activeOrganization.name}</h2>
                          <p className="text-indigo-200 text-sm font-medium">Acompanhando {jobs.length} pedidos neste laboratório.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
                          <button onClick={() => navigate('/jobs')} className="flex-1 px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/10 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest">Meus Pedidos</button>
                          <button onClick={() => navigate('/store')} className="flex-1 px-8 py-3.5 bg-white text-indigo-900 font-black rounded-2xl shadow-xl transition-all hover:scale-105 uppercase text-[10px] tracking-widest">Abrir Catálogo</button>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <StatCard title="Em Produção" value={totalActive} icon={<Activity size={20} className="text-blue-600" />} color="bg-blue-50" />
                  <StatCard title="Aprovação" value={jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length} icon={<Clock size={20} className="text-purple-600" />} color="bg-purple-50" />
                  <StatCard title="Concluídos" value={jobs.filter(j => j.status === JobStatus.COMPLETED).length} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
                  <StatCard title="Urgências" value={urgent} icon={<AlertTriangle size={20} className="text-orange-600" />} color="bg-orange-50" />
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Painel de Controle</h1>
          <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest opacity-60">Visão Geral da Produção em Tempo Real</p>
        </div>
        <button onClick={handleGenerateInsights} disabled={loadingAi} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all disabled:opacity-70 text-xs tracking-widest uppercase"><Sparkles size={18} className={loadingAi ? "animate-spin" : ""} /> {loadingAi ? 'Analisando...' : 'Insights com IA'}</button>
      </div>

      {aiInsights && (
        <div className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 relative overflow-hidden animate-in zoom-in duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={100} className="text-blue-600" /></div>
            <h3 className="text-sm font-black text-blue-900 mb-4 flex items-center gap-2 uppercase tracking-widest"><Sparkles size={16} /> Relatório Estratégico AI</h3>
            <div className="text-sm text-blue-800 leading-relaxed font-bold whitespace-pre-wrap">{aiInsights}</div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Produção Ativa" value={totalActive} icon={<Activity size={20} className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Prontos Hoje" value={completedToday} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
        <StatCard title="VIP/Urgente" value={urgent} icon={<AlertTriangle size={20} className="text-orange-600" />} color="bg-orange-50" />
        <StatCard title="Atrasados" value={delayed} icon={<Clock size={20} className="text-red-600" />} color="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest">Distribuição de Status</h3>
            <div className="h-[250px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest">Equilíbrio de Carga</h3>
             <div className="h-[250px] md:h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value">
                            {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
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
