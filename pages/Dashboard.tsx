
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Added Layers to the lucide-react imports
import { Activity, Clock, AlertTriangle, CheckCircle, Sparkles, ShoppingBag, Building, Handshake, DollarSign, Inbox, ShoppingCart, Layers } from 'lucide-react';
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
  <div className="bg-white p-4 xs:p-5 md:p-6 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-shadow h-full flex flex-col justify-between overflow-hidden">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{title}</p>
        <h3 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight truncate">{value}</h3>
      </div>
      <div className={`p-2 md:p-3 rounded-xl ${color} shadow-sm shrink-0`}>
        {icon}
      </div>
    </div>
    {subtext && <p className="text-[9px] md:text-[10px] text-slate-400 mt-3 md:mt-4 font-bold italic truncate">{subtext}</p>}
  </div>
);

export const Dashboard = () => {
  const { jobs, currentUser, activeOrganization, currentPlan, currentOrg } = useApp();
  const navigate = useNavigate();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const isClient = currentUser?.role === UserRole.CLIENT;
  const isLiteLab = currentUser?.role !== UserRole.CLIENT && !currentPlan?.features.hasInternalManagement && currentUser?.role !== UserRole.SUPER_ADMIN;

  // KPIs de Produção
  const totalActive = jobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.DELIVERED).length;
  const completedToday = jobs.filter(j => j.status === JobStatus.COMPLETED && new Date(j.history[j.history.length-1]?.timestamp).toDateString() === new Date().toDateString()).length;
  
  // KPIs de Vendas Online
  const onlineSalesToday = jobs.filter(j => j.paymentStatus === 'PAID' && new Date(j.createdAt).toDateString() === new Date().toDateString()).length;
  const pendingOrders = jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length;
  const totalRevenue = jobs.filter(j => j.paymentStatus === 'PAID').reduce((acc, curr) => acc + curr.totalValue, 0);

  const handleGenerateInsights = async () => {
    setLoadingAi(true);
    const result = await getProductionInsights(jobs);
    setAiInsights(result);
    setLoadingAi(false);
  };

  // DASHBOARD DO DENTISTA
  if (isClient) {
      return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter truncate">Olá, Dr(a). {currentUser.name}</h1>
                    <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest opacity-60 truncate">Status da sua produção digital</p>
                  </div>
                  <button onClick={() => navigate('/store')} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 uppercase text-xs tracking-widest shrink-0"><ShoppingBag size={18} /> Novo Pedido Web</button>
              </div>

              {!activeOrganization ? (
                  <div className="bg-orange-50 border-2 border-dashed border-orange-200 p-6 md:p-10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left min-w-0">
                          <div className="p-4 bg-orange-100 text-orange-600 rounded-3xl shrink-0"><Handshake size={32} /></div>
                          <div className="min-w-0"><h3 className="text-xl font-black text-orange-900 uppercase tracking-tighter truncate">Sem Parceria Selecionada</h3><p className="text-orange-700 text-sm font-medium">Escolha um laboratório parceiro para visualizar o catálogo.</p></div>
                      </div>
                      <button onClick={() => navigate('/dentist/partnerships')} className="w-full md:w-auto px-8 py-3.5 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-100 uppercase text-xs shrink-0">Conectar agora</button>
                  </div>
              ) : (
                  <div className="bg-indigo-900 text-white p-6 md:p-10 rounded-[32px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Building size={120} /></div>
                      <div className="flex-1 relative z-10 text-center md:text-left min-w-0">
                          <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-300 font-black uppercase text-[10px] tracking-widest mb-3 truncate"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></div> Parceria Ativa</div>
                          <h2 className="text-2xl md:text-4xl font-black mb-2 uppercase tracking-tighter truncate">{activeOrganization.name}</h2>
                          <p className="text-indigo-200 text-sm font-medium">Acompanhando {jobs.length} pedidos neste laboratório.</p>
                      </div>
                      <div className="flex flex-col xs:flex-row gap-3 w-full md:w-auto relative z-10">
                          <button onClick={() => navigate('/jobs')} className="flex-1 px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/10 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest truncate">Meus Pedidos</button>
                          <button onClick={() => navigate('/store')} className="flex-1 px-8 py-3.5 bg-white text-indigo-900 font-black rounded-2xl shadow-xl transition-all hover:scale-105 uppercase text-[10px] tracking-widest truncate">Catálogo</button>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <StatCard title="Em Produção" value={totalActive} icon={<Activity size={20} className="text-blue-600" />} color="bg-blue-50" />
                  <StatCard title="Aprovação" value={jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length} icon={<Clock size={20} className="text-purple-600" />} color="bg-purple-50" />
                  <StatCard title="Concluídos" value={jobs.filter(j => j.status === JobStatus.COMPLETED).length} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
                  <StatCard title="Urgências" value={jobs.filter(j => j.urgency === UrgencyLevel.VIP).length} icon={<AlertTriangle size={20} className="text-orange-600" />} color="bg-orange-50" />
              </div>
          </div>
      );
  }

  // DASHBOARD DO LABORATÓRIO "FREE / STORE ONLY"
  if (isLiteLab) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter truncate">Gestão da Loja Virtual</h1>
                    <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest opacity-60 truncate">Monitoramento de vendas e recebíveis online</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <StatCard title="Novos Pedidos" value={pendingOrders} icon={<Inbox size={20} className="text-purple-600" />} color="bg-purple-50" subtext="Aguardando sua aprovação" />
                  <StatCard title="Vendas Hoje" value={onlineSalesToday} icon={<ShoppingCart size={20} className="text-teal-600" />} color="bg-teal-50" subtext="Pagamentos confirmados" />
                  <StatCard title="Saldo em Conta" value={`R$ ${(currentOrg?.financialSettings?.balance || 0).toFixed(2)}`} icon={<DollarSign size={20} className="text-blue-600" />} color="bg-blue-50" subtext="Saldo disponível p/ saque" />
                  <StatCard title="Faturamento Total" value={`R$ ${totalRevenue.toFixed(2)}`} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" subtext="Acumulado via Loja" />
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Layers size={150} /></div>
                  <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center shrink-0 shadow-2xl shadow-blue-100">
                      <Sparkles size={48} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Potencialize sua operação</h3>
                      <p className="text-slate-500 mt-2 font-medium max-w-xl">
                          Você está usando a versão **Lite**. Libere agora a gestão interna completa: rastreio por QR Code, calendário de produção, controle de motoboys e muito mais.
                      </p>
                  </div>
                  <button onClick={() => navigate('/admin/assinatura')} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-blue-600 transition-all uppercase text-xs tracking-widest shrink-0">Upgrade para Gestão Total</button>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Últimas Vendas Online</h3>
                  <div className="space-y-3">
                      {jobs.filter(j => !j.osNumber?.includes('MANUAL')).slice(0, 5).map(job => (
                          <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-white hover:border-blue-200 transition-all cursor-pointer">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bold shadow-sm">{job.patientName.charAt(0)}</div>
                                  <div>
                                      <p className="font-bold text-slate-800 text-sm">{job.patientName}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Dr. {job.dentistName}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="font-black text-blue-600">R$ {job.totalValue.toFixed(2)}</p>
                                  <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(job.createdAt).toLocaleDateString()}</span>
                              </div>
                          </div>
                      ))}
                      {jobs.length === 0 && <div className="py-12 text-center text-slate-300 italic">Nenhum pedido recebido ainda.</div>}
                  </div>
              </div>
          </div>
      );
  }

  // DASHBOARD FULL (Admin / Staff)
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
        {/* ... (conteúdo do Dashboard full permanece igual ao arquivo original) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter truncate">Painel de Produção</h1>
          <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest opacity-60 truncate">Visão Geral da Bancada e Fluxo</p>
        </div>
        <button onClick={handleGenerateInsights} disabled={loadingAi} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all disabled:opacity-70 text-[10px] md:text-xs tracking-widest uppercase shrink-0"><Sparkles size={18} className={loadingAi ? "animate-spin shrink-0" : "shrink-0"} /> {loadingAi ? 'Analisando...' : 'Insights com IA'}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Produção Ativa" value={totalActive} icon={<Activity size={20} className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Prontos Hoje" value={completedToday} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
        <StatCard title="VIP/Urgente" value={jobs.filter(j => j.urgency === UrgencyLevel.VIP || j.urgency === UrgencyLevel.HIGH).length} icon={<AlertTriangle size={20} className="text-orange-600" />} color="bg-orange-50" />
        <StatCard title="Atrasados" value={jobs.filter(j => new Date(j.dueDate) < new Date() && j.status !== JobStatus.COMPLETED).length} icon={<Clock size={20} className="text-red-600" />} color="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-5 md:p-8 rounded-[32px] shadow-sm border border-slate-200 w-full overflow-hidden">
            <h3 className="text-[10px] md:text-xs font-black text-slate-800 mb-6 md:mb-8 uppercase tracking-widest">Carga por Status</h3>
            <div className="h-[250px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                        { name: 'Pendente', value: jobs.filter(j => j.status === JobStatus.PENDING).length },
                        { name: 'Produção', value: jobs.filter(j => j.status === JobStatus.IN_PROGRESS).length },
                        { name: 'Aprovação', value: jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL).length },
                        { name: 'Pronto', value: jobs.filter(j => j.status === JobStatus.COMPLETED).length },
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className="bg-white p-5 md:p-8 rounded-[32px] shadow-sm border border-slate-200 w-full overflow-hidden text-center flex flex-col justify-center">
            <h3 className="text-[10px] md:text-xs font-black text-slate-800 mb-6 md:mb-8 uppercase tracking-widest">Resumo de Saídas</h3>
            <div className="space-y-4">
                <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-500">Trabalhos p/ Hoje</span>
                    <span className="font-black text-slate-800 text-lg">{jobs.filter(j => new Date(j.dueDate).toDateString() === new Date().toDateString()).length}</span>
                </div>
                <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-500">Trabalhos p/ Amanhã</span>
                    <span className="font-black text-slate-800 text-lg">{jobs.filter(j => {
                        const d = new Date(); d.setDate(d.getDate() + 1);
                        return new Date(j.dueDate).toDateString() === d.toDateString();
                    }).length}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
