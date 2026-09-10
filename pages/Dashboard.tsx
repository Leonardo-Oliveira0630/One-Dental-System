
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Clock, AlertTriangle, CheckCircle, Sparkles, ShoppingBag, Building, Handshake, ArrowUpRight } from 'lucide-react';
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
  <div className="bg-white dark:bg-[#131B2A] p-5 md:p-4 sm:p-6 rounded-card shadow-soft border border-slate-100 dark:border-slate-800 hover:shadow-premium transition-all duration-300 transform hover:-translate-y-0.5 h-full flex flex-col justify-between overflow-hidden">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 truncate">{title}</p>
        <h3 className="text-2xl md:text-3.5xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{value}</h3>
      </div>
      <div className={`p-3 rounded-[12px] ${color} shrink-0 flex items-center justify-center`}>
        {icon}
      </div>
    </div>
    {subtext && <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 mt-4 font-normal tracking-wide truncate">{subtext}</p>}
  </div>
);

export const Dashboard = () => {
  const { jobs, currentUser, activeOrganization, theme } = useApp();
  const navigate = useNavigate();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const isClient = currentUser?.role === UserRole.CLIENT;

  // KPIs memoizados para performance
  const { totalActive, completedToday, urgent, delayed, statusData } = React.useMemo(() => {
    const active = jobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.DELIVERED).length;
    const completed = jobs.filter(j => 
      j.status === JobStatus.COMPLETED && 
      j.history && 
      j.history.length > 0 && 
      new Date(j.history[j.history.length-1]?.timestamp).toDateString() === new Date().toDateString()
    ).length;
    const isUrgent = jobs.filter(j => j.urgency === UrgencyLevel.VIP || j.urgency === UrgencyLevel.HIGH).length;
    const isDelayed = jobs.filter(j => new Date(j.dueDate) < new Date() && j.status !== JobStatus.COMPLETED).length;

    const sData = [
      { name: 'Pendente', value: jobs.filter(j => j.status === JobStatus.PENDING).length },
      { name: 'Transição', value: jobs.filter(j => j.status === JobStatus.SECTOR_TRANSITION).length },
      { name: 'Produção', value: jobs.filter(j => j.status === JobStatus.IN_PROGRESS).length },
      { name: 'Aprovação', value: jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length },
      { name: 'Pronto', value: jobs.filter(j => j.status === JobStatus.COMPLETED).length },
    ];

    return { totalActive: active, completedToday: completed, urgent: isUrgent, delayed: isDelayed, statusData: sData };
  }, [jobs]);
  
  // Custom colors matching the requested SaaS visual theme (Primary and Secondary accents)
  const COLORS = ['#94A3B8', '#F59E0B', '#3B82F6', '#00B8D9', '#10B981'];

  const handleGenerateInsights = async () => {
    setLoadingAi(true);
    const result = await getProductionInsights(jobs);
    setAiInsights(result);
    setLoadingAi(false);
  };

  if (isClient) {
      return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full overflow-hidden text-slate-800 dark:text-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-3.5xl font-bold text-slate-900 dark:text-white tracking-tight truncate">Olá, Dr(a). {currentUser.name}</h1>
                    <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest mt-1 truncate">Acompanhamento e solicitações em tempo real</p>
                  </div>
                  <button onClick={() => navigate('/store')} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-card shadow-premium hover:shadow-xl transition-all duration-300 uppercase text-xs tracking-wider shrink-0"><ShoppingBag size={18} /> Novo Pedido Web</button>
              </div>

              {!activeOrganization ? (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-dashed border-orange-200 dark:border-orange-900/40 p-6 md:p-10 rounded-card flex flex-col md:flex-row items-center justify-between gap-4 sm:p-6 transition-all">
                      <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left min-w-0">
                          <div className="p-4 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-card shrink-0"><Handshake size={32} /></div>
                          <div className="min-w-0">
                              <h3 className="text-lg font-semibold text-orange-950 dark:text-orange-200 uppercase tracking-wider mb-1">Sem Parceria Selecionada</h3>
                              <p className="text-orange-700 dark:text-orange-300 text-sm font-medium">Selecione ou adicione um laboratório parceiro para visualizar produtos e fazer pedidos.</p>
                          </div>
                      </div>
                      <button onClick={() => navigate('/dentist/partnerships')} className="w-full md:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-lg shadow-orange-100 dark:shadow-none uppercase text-xs shrink-0 transition-colors">Conectar agora</button>
                  </div>
              ) : (
                  <div className="bg-gradient-to-br from-[#0F4C81] to-[#0A365C] dark:from-[#0c2e4e] dark:to-[#081b2e] text-white p-6 md:p-10 rounded-card shadow-premium border border-slate-700/40 flex flex-col md:flex-row items-center justify-between gap-4 sm:p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10 pointer-events-none transform translate-x-10 translate-y-2"><Building size={160} /></div>
                      <div className="flex-1 relative z-10 text-center md:text-left min-w-0">
                          <div className="flex items-center justify-center md:justify-start gap-2 text-[#00B8D9] font-bold uppercase text-[10px] tracking-widest mb-3 truncate">
                            <div className="w-2.5 h-2.5 bg-[#00B8D9] rounded-full animate-ping shrink-0" />
                            Laboratório Ativo
                          </div>
                          <h2 className="text-2xl md:text-4.5xl font-bold mb-2 tracking-tight truncate text-white">{activeOrganization.name}</h2>
                          <p className="text-slate-100/90 text-sm font-normal">Acompanhando {jobs.length} pedidos em andamento neste parceiro.</p>
                      </div>
                      <div className="flex flex-col xs:flex-row gap-3 w-full md:w-auto relative z-10">
                          <button onClick={() => navigate('/jobs')} className="flex-1 px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/10 font-bold rounded-input transition-all uppercase text-[10px] tracking-widest truncate text-white">Meus Pedidos</button>
                          <button onClick={() => navigate('/store')} className="flex-1 px-8 py-3.5 bg-white hover:bg-slate-50 text-[#0F4C81] font-bold rounded-input shadow-soft transition-all hover:scale-[1.02] uppercase text-[10px] tracking-widest truncate">Consultar Catálogo</button>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4 sm:p-6">
                  <StatCard title="Em Produção" value={totalActive} icon={<Activity size={20} className="text-[#00B8D9]" />} color="bg-[#00B8D9]/10 dark:bg-[#00B8D9]/20" />
                  <StatCard title="Aguardando Aprovação" value={jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length} icon={<Clock size={20} className="text-[#2F80ED]" />} color="bg-[#2F80ED]/10 dark:bg-[#2F80ED]/20" />
                  <StatCard title="Concluídos" value={jobs.filter(j => j.status === JobStatus.COMPLETED).length} icon={<CheckCircle size={20} className="text-[#10B981]" />} color="bg-[#10B981]/10 dark:bg-[#10B981]/20" />
                  <StatCard title="Urgências" value={urgent} icon={<AlertTriangle size={20} className="text-[#F59E0B]" />} color="bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20" />
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full overflow-hidden text-slate-800 dark:text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3.5xl font-bold text-slate-900 dark:text-white tracking-tight">Painel de Controle</h1>
          <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest mt-1">Visão Geral da Produção e Indicadores em Tempo Real</p>
        </div>
        <button onClick={handleGenerateInsights} disabled={loadingAi} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-card font-semibold shadow-premium hover:shadow-xl transition-all disabled:opacity-70 text-xs tracking-wider uppercase shrink-0"><Sparkles size={16} className={loadingAi ? "animate-spin shrink-0" : "shrink-0 text-cyan-300"} /> {loadingAi ? 'Analisando...' : 'Insights com IA'}</button>
      </div>

      {aiInsights && (
        <div className="bg-gradient-to-r from-blue-950/40 to-cyan-950/20 border border-l-4 border-l-blue-500 border-blue-500/30 rounded-card p-4 sm:p-6 md:p-4 sm:p-8 relative overflow-hidden animate-in zoom-in duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><Sparkles size={160} className="text-blue-400" /></div>
            <h3 className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2 uppercase tracking-widest"><Sparkles size={16} className="text-cyan-400" /> Relatório Estratégico AI</h3>
            <div className="text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">{aiInsights}</div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4 sm:p-6">
        <StatCard title="Produção Ativa" value={totalActive} icon={<Activity size={20} className="text-[#00B8D9]" />} color="bg-[#00B8D9]/10 dark:bg-[#00B8D9]/20" />
        <StatCard title="Prontos Hoje" value={completedToday} icon={<CheckCircle size={20} className="text-[#10B981]" />} color="bg-[#10B981]/10 dark:bg-[#10B981]/20" />
        <StatCard title="VIP/Urgente" value={urgent} icon={<AlertTriangle size={20} className="text-[#F59E0B]" />} color="bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20" />
        <StatCard title="Atrasados" value={delayed} icon={<Clock size={20} className="text-[#EF4444]" />} color="bg-[#EF4444]/10 dark:bg-[#EF4444]/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 md:gap-4 sm:p-8">
        <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 md:p-4 sm:p-8 rounded-card shadow-soft border border-slate-100 dark:border-slate-800 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Distribuição de Status</h3>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-1 rounded-md">Atalhos</span>
            </div>
            <div className="h-[250px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1E293B' : '#E2E8F0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 'medium' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94A3B8' : '#64748B', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#131B2A' : '#FFFFFF', 
                            borderColor: theme === 'dark' ? '#1E293B' : '#E2E8F0', 
                            color: theme === 'dark' ? '#F8FAFC' : '#0F172A', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' 
                          }} 
                          cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC' }} 
                        />
                        <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 md:p-4 sm:p-8 rounded-card shadow-soft border border-slate-100 dark:border-slate-800 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Equilíbrio de Carga</h3>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-1 rounded-md">Porcentagem</span>
            </div>
             <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={4} dataKey="value">
                            {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={theme === 'dark' ? '#131B2A' : '#fff'} strokeWidth={2} />))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#131B2A' : '#FFFFFF', 
                            borderColor: theme === 'dark' ? '#1E293B' : '#E2E8F0', 
                            color: theme === 'dark' ? '#F8FAFC' : '#0F172A', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' 
                          }}
                        />
                    </PieChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
    </div>
  );
};
