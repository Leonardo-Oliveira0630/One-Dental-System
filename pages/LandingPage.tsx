import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Logo, 
  LogoIcon 
} from '../components/Logo';
import { 
  Building2, 
  Users, 
  Calendar, 
  Wallet, 
  FileText, 
  Bot, 
  Truck, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Play, 
  Download, 
  Menu, 
  X, 
  FilePlus2, 
  Check, 
  Sparkles, 
  DollarSign, 
  ChevronRight, 
  Star,
  Layers,
  Inbox,
  Clock,
  AlertTriangle,
  Search,
  Grid
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { allPlans } = useApp();
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const [mobileMenuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'NOVA_OS' | 'AGENDA'>('DASHBOARD');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', phone: '', email: '', labName: '' });
  const [isDemoSubmitted, setIsDemoSent] = useState(false);

  // Stats / Metrics Mockup State for Interactive Dashboard
  const [activeProductionCount, setActiveProductionCount] = useState(690);
  const [urgentsCount, setUrgentsCount] = useState(19);
  const [showAIInsight, setShowAIInsight] = useState(false);

  // Nova OS Interactive State
  const [osPatient, setOsPatient] = useState('Mariana das Dores');
  const [osProsthesisType, setOsProsthesisType] = useState('Coroa Monolítica');
  const [osMaterial, setOsMaterial] = useState<'ZIRCONIA' | 'EMAX' | 'RESINA_HIBRIDA'>('ZIRCONIA');
  const [osPriority, setOsMaterialPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'VIP'>('NORMAL');
  const [osBoxColor, setOsBoxColor] = useState<string>('blue');
  const [osTotal, setOsTotal] = useState(409.00);
  const [osSaved, setOsSaved] = useState(false);

  // Agenda Interactive State
  const [agendaFilter, setAgendaFilter] = useState<'ALL' | 'ATRASADOS' | 'URGENTES' | 'CORREIOS'>('ALL');

  // Testimonials state
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Auto-calculation of mock total when OS form options change
  useEffect(() => {
    let basePrice = 300;
    if (osMaterial === 'ZIRCONIA') basePrice = 409.00;
    else if (osMaterial === 'EMAX') basePrice = 480.00;
    else basePrice = 280.00;

    let multiplier = 1;
    if (osPriority === 'VIP') multiplier = 1.35;
    else if (osPriority === 'HIGH') multiplier = 1.15;
    else if (osPriority === 'LOW') multiplier = 0.90;

    setOsTotal(Math.round(basePrice * multiplier * 100) / 100);
  }, [osMaterial, osPriority]);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.email) return;
    setIsDemoSent(true);
    setTimeout(() => {
      setShowDemoModal(false);
      setIsDemoSent(false);
      setDemoForm({ name: '', phone: '', email: '', labName: '' });
      alert('Demonstração agendada com sucesso! Nossa equipe entrará em contato em breve.');
    }, 1800);
  };

  const testimonials = [
    {
      text: "O SmileProX revolucionou como controlamos as mais de 600 caixas físicas de produção ativa no laboratório. A precisão no controle de etapas reduziu nossos atrasos em incríveis 90% logo no primeiro mês!",
      author: "Charles Martins",
      role: "Diretor Comercial do Laboratório Padilha",
      avatar: "C",
      stats: "690+ casos rastreados por mês"
    },
    {
      text: "As clínicas parceiras pararam de ligar perguntando o status das próteses. Agora, elas enviam os pedidos e arquivos, acompanham o gesso até a finalização, e realizam faturamento diretamente pelo celular.",
      author: "Dra. Mariana Santos",
      role: "Ortodontista e Diretora Operacional da OrthoDental",
      avatar: "M",
      stats: "Redução de 75% no tempo de ligação"
    },
    {
      text: "Calcular comissões de bancada no fechamento da semana sempre foi um pesadelo demorado. Com o SmileProX, cada setor lança seu trabalho e a folha se auto-compõe conforme o material (Zircônia, Emax, etc.). Recomendadíssimo!",
      author: "Felipe Assis",
      role: "Protético-Chefe e Reabilitador Oral",
      avatar: "F",
      stats: "Economia de 5 horas todas as sextas-feiras"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      
      {/* 1. TOP PREMIUM HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo size="md" variant="colored" />
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
              <a href="#recursos" onClick={(e) => scrollToSection(e, 'recursos')} className="hover:text-blue-600 transition-colors">Recursos</a>
              <a href="#experiencia" onClick={(e) => scrollToSection(e, 'experiencia')} className="hover:text-blue-600 transition-colors">Demonstração Interativa</a>
              <a href="#diferenciais" onClick={(e) => scrollToSection(e, 'diferenciais')} className="hover:text-blue-600 transition-colors">Diferenciais</a>
              <a href="#preco" onClick={(e) => scrollToSection(e, 'preco')} className="hover:text-blue-600 transition-colors">Planos</a>
              <a href="#depoimentos" onClick={(e) => scrollToSection(e, 'depoimentos')} className="hover:text-blue-600 transition-colors">Depoimentos</a>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">
              Entrar no Sistema
            </Link>
            <Link 
              to="/register-lab" 
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-input shadow-soft flex items-center gap-1.5 transition-all transform hover:scale-[1.02]"
            >
              Criar Conta Gratuita <ChevronRight size={14} />
            </Link>
          </div>

          {/* Mobile Login & menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login" className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors">
              Fazer Login
            </Link>
            <button onClick={() => setMenuOpen(!mobileMenuOpen)} className="p-1.5 text-slate-600 hover:text-slate-900">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-200/80 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4 flex flex-col text-base font-semibold text-slate-700">
                <a onClick={(e) => { setMenuOpen(false); scrollToSection(e, 'recursos'); }} href="#recursos" className="hover:text-blue-600 transition-colors py-1">Recursos</a>
                <a onClick={(e) => { setMenuOpen(false); scrollToSection(e, 'experiencia'); }} href="#experiencia" className="hover:text-blue-600 transition-colors py-1">Demonstração Interativa</a>
                <a onClick={(e) => { setMenuOpen(false); scrollToSection(e, 'diferenciais'); }} href="#diferenciais" className="hover:text-blue-600 transition-colors py-1">Diferenciais</a>
                <a onClick={(e) => { setMenuOpen(false); scrollToSection(e, 'preco'); }} href="#preco" className="hover:text-blue-600 transition-colors py-1">Planos</a>
                <a onClick={(e) => { setMenuOpen(false); scrollToSection(e, 'depoimentos'); }} href="#depoimentos" className="hover:text-blue-600 transition-colors py-1">Depoimentos</a>
                <hr className="border-slate-100" />
                <Link to="/login" className="py-2 text-sm font-bold text-slate-700 hover:text-blue-600">Entrar no Sistema</Link>
                <Link 
                  to="/register-lab" 
                  className="w-full text-center py-3 bg-blue-600 text-white text-sm font-bold rounded-input shadow-soft"
                >
                  Experimentar Grátis
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. ENTERPRISE HERO SECTION */}
      <section className="relative pt-10 pb-20 md:py-24 bg-gradient-to-b from-white via-slate-50/50 to-slate-100 overflow-hidden">
        
        {/* Abstract metallic graphic accents behind to mirror premium visual teeth orbits */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1600px] h-[600px] bg-gradient-radial from-blue-100/30 via-teal-100/10 to-transparent blur-[120px] pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Copy Panel */}
            <div className="lg:col-span-5 text-center lg:text-left space-y-6 md:space-y-8 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.2 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-700 tracking-wide uppercase animate-pulse">
                <Sparkles size={12} className="text-blue-600" /> Versão Profissional Pronta para Uso
              </span>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-[#0F172A] leading-[1.15]">
                O sistema operacional para laboratórios de <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">prótese dentária</span>
              </h1>
              
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Controle produção ativa, faturamento, clientes, comissões de bancada, entregas logísticas e comunicação direta com clínicas em uma única plataforma integrada de alta velocidade.
              </p>

              <div className="flex flex-col xs:flex-row items-center justify-center lg:justify-start gap-4">
                <button 
                  onClick={() => setShowDemoModal(true)} 
                  className="w-full xs:w-auto px-7 py-4 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-sm rounded-input shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]"
                >
                  Solicitar Demonstração <ArrowRight size={16} />
                </button>
                <Link 
                  to="/register-lab" 
                  className="w-full xs:w-auto px-7 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-input shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.01]"
                >
                  Criar Conta Gratuita
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-teal-500" />
                  <span>Sem Cartão de Crédito</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-teal-500" />
                  <span>Teste Grátis de 7 dias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-teal-500" />
                  <span>Migração de dados inclusa</span>
                </div>
              </div>
            </div>

            {/* Right Product Composition Player (Fidelity clone) */}
            <div className="lg:col-span-7 relative">
              <div className="relative mx-auto max-w-[680px]">
                
                {/* Visual stacked layers background triggers */}
                <div className="absolute -top-6 -right-6 w-72 h-72 bg-teal-400/20 rounded-full blur-[80px] pointer-events-none -z-10" />
                <div className="absolute -bottom-6 -left-6 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />

                {/* Sub title toggles simulating Kiwid depth with nice shadows */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-200/60 rounded-input max-w-sm mx-auto mb-4 border border-slate-200 relative z-20">
                  <button 
                    onClick={() => setActiveTab('DASHBOARD')}
                    className={`flex-1 text-center py-2 px-3 text-xs font-extrabold rounded-input transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => setActiveTab('NOVA_OS')}
                    className={`flex-1 text-center py-2 px-3 text-xs font-extrabold rounded-input transition-all ${activeTab === 'NOVA_OS' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Nova OS
                  </button>
                  <button 
                    onClick={() => setActiveTab('AGENDA')}
                    className={`flex-1 text-center py-2 px-3 text-xs font-extrabold rounded-input transition-all ${activeTab === 'AGENDA' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Agenda
                  </button>
                </div>

                {/* Main Dynamic View Frame */}
                <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-3xl relative z-10 transition-all duration-500">
                  
                  {/* Browser Bar Mockup */}
                  <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                    </div>
                    <div className="bg-[#131A23] border border-slate-800 text-[10px] text-slate-500 py-1 px-8 rounded-full font-mono max-w-xs truncate">
                      www.smileprox.com.br
                    </div>
                    <div className="w-8" />
                  </div>

                  <div className="pt-4 bg-slate-50 rounded-2xl overflow-hidden min-h-[360px] xs:min-h-[440px] text-slate-700 flex flex-col text-left">
                    
                    {/* Header bar clone */}
                    <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1 font-extrabold text-blue-900 text-sm">
                        <LogoIcon size="sm" />
                        <span className="tracking-tight uppercase font-black text-xs font-display">Smile<span className="text-[#00B8D9]">ProX</span></span>
                      </div>
                      <div className="relative max-w-xs hidden sm:block">
                        <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                        <input 
                          type="text" 
                          disabled
                          placeholder="Buscar trabalho (OS, Paciente...)" 
                          className="bg-slate-100 border border-slate-200 pl-8 pr-3 py-1 rounded-full text-[10px] outline-none w-48"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right hidden xs:block">
                          <p className="text-[10px] font-black text-slate-800">Técnico Carlos </p>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest leading-none font-bold">Lab SmileProX</p>
                        </div>
                        <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center text-white text-xs font-extrabold">C</div>
                      </div>
                    </div>

                    {/* Left side minimal navigation list overlayed on tabs */}
                    <div className="flex flex-1">
                      <div className="w-12 sm:w-16 bg-[#0F172A] text-slate-400 p-2 flex flex-col items-center gap-4 text-xs font-bold border-r border-slate-800">
                        <div className="p-1 px-2 rounded-lg bg-blue-600/10 text-blue-400 flex flex-col items-center gap-0.5"><Grid size={14} /></div>
                        <div className="flex flex-col items-center opacity-70"><FilePlus2 size={14} /></div>
                        <div className="flex flex-col items-center opacity-70"><Calendar size={14} /></div>
                        <div className="flex flex-col items-center opacity-70"><Wallet size={14} /></div>
                      </div>

                      {/* Content Section (Reactive to tabs) */}
                      <div className="flex-1 p-3 sm:p-5 relative bg-slate-50 overflow-y-auto max-h-[380px] no-scrollbar">
                        
                        {/* TAB 1: DASHBOARD MOCKUP */}
                        {activeTab === 'DASHBOARD' && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                              <div>
                                <h3 className="text-base font-black text-slate-800 leading-tight">Painel de Controle</h3>
                                <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">Visão geral e indicadores em tempo real</p>
                              </div>
                              <button 
                                onClick={() => setShowAIInsight(!showAIInsight)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F4C81] hover:bg-indigo-600 text-white text-[10px] font-black rounded-lg shadow-sm transition-all shrink-0"
                              >
                                <Bot size={13} /> {showAIInsight ? 'Ocultar Insights' : 'Insights com IA'}
                              </button>
                            </div>

                            {/* AI Insight banner if toggled */}
                            <AnimatePresence>
                              {showAIInsight && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }} 
                                  animate={{ opacity: 1, y: 0 }} 
                                  exit={{ opacity: 0, y: -10 }}
                                  className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-xl shadow-soft space-y-2 text-[#0F172A]"
                                >
                                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[11px]">
                                    <Sparkles size={14} /> INSIGHT DE IA ATIVO
                                  </div>
                                  <p className="text-[10px] leading-relaxed text-slate-600 font-medium">
                                    Olá, laboratório Padilha. Identificamos que a etapa de <strong className="text-indigo-800">Prótese Fixa - Transição</strong> acumulou 15 casos na última terça-feira. Para garantir o prazo das 19 OS urgentes, sugerimos realocar foca de trabalho do técnico Charles para suporte e evitar gargalos semanais de cimentação.
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-soft hover:shadow-md transition-shadow relative">
                                <span className="absolute top-2 right-2 p-1 rounded-full bg-blue-50 text-blue-600 animate-pulse"><Check size={12} /></span>
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Produção Ativa</p>
                                <p className="text-xl font-black text-slate-800 mt-1">{activeProductionCount}</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-soft">
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Prontos Hoje</p>
                                <p className="text-xl font-black text-[#10B981] mt-1">0</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100 hover:border-orange-200 cursor-pointer transition-colors relative" onClick={() => setUrgentsCount(v => v + 1)}>
                                <span className="absolute top-2 right-2 p-0.5 rounded-full text-orange-600"><AlertTriangle size={12} /></span>
                                <p className="text-[8px] text-slate-400 font-bold uppercase">VIP/Urgente</p>
                                <p className="text-xl font-black text-orange-600 mt-1">{urgentsCount}</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-soft">
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Atrasados</p>
                                <p className="text-xl font-black text-red-500 mt-1">426</p>
                              </div>
                            </div>

                            {/* Charts Visualization Layout */}
                            <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
                              
                              {/* STATUS DISTRIBUTION HISTOGRAM */}
                              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Distribuição de Status</p>
                                <div className="flex items-end justify-between h-24 pt-4 px-2">
                                  <div className="flex flex-col items-center gap-1.5 w-6">
                                    <div className="w-full bg-[#0F4C81] rounded-t-sm h-12" />
                                    <span className="text-[7px] text-slate-400 font-bold">Pendente</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5 w-6">
                                    <div className="w-full bg-blue-500 rounded-t-sm h-20" />
                                    <span className="text-[7px] text-slate-400 font-bold">Transição</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5 w-6">
                                    <div className="w-full bg-indigo-600 rounded-t-sm h-8" />
                                    <span className="text-[7px] text-slate-400 font-bold">Produção</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5 w-6">
                                    <div className="w-full bg-slate-300 rounded-t-sm h-4" />
                                    <span className="text-[7px] text-slate-400 font-bold">Aprov</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5 w-6">
                                    <div className="w-full bg-[#00B8D9] rounded-t-sm h-16" />
                                    <span className="text-[7px] text-slate-400 font-bold">Pronto</span>
                                  </div>
                                </div>
                              </div>

                              {/* LOADING APPORTIONMENT PIE CHART */}
                              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Equilíbrio de Carga</p>
                                <div className="flex items-center justify-center gap-4 h-24 pt-2">
                                  {/* Custom circular SVG segment */}
                                  <div className="w-16 h-16 relative">
                                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="4.2" />
                                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="4.2" strokeDasharray="30 100" />
                                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" strokeWidth="4.2" strokeDasharray="40 100" strokeDashoffset="-30" />
                                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="4.2" strokeDasharray="30 100" strokeDashoffset="-70" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-[10px] font-black text-slate-800">88%</span>
                                      <span className="text-[6px] text-slate-400 uppercase tracking-widest font-extrabold leading-none">Carga</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1 text-[8px] font-extrabold text-slate-600">
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Reabilitações (30%)</div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Prototipagem (40%)</div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Ortodontia (30%)</div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}

                        {/* TAB 2: NOVA OS INTERACTIVE FORM */}
                        {activeTab === 'NOVA_OS' && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                              <h3 className="text-base font-black text-slate-800 leading-tight">Nova OS de Bancada</h3>
                              <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">Entrada física de trabalhos no laboratório</p>
                            </div>

                            {osSaved ? (
                              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-4 py-8">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                                  <CheckCircle2 size={24} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Caso Salvo no Sistema!</h4>
                                <p className="text-[10px] text-slate-500">O caso físico da caixa foi registrado, seu QR Code foi gerado e o laboratório pode iniciar as etapas de produção.</p>
                                <button 
                                  onClick={() => { setOsSaved(false); setOsPatient(''); }}
                                  className="px-4 py-1.5 bg-[#0F4C81] text-white text-[10px] font-bold rounded-lg shadow-sm"
                                >
                                  Preencher Nova Caso
                                </button>
                              </div>
                            ) : (
                              <div className="grid sm:grid-cols-5 gap-3.5">
                                
                                {/* Form Left (Fields) */}
                                <div className="sm:col-span-3 space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-soft">
                                  <p className="text-[10px] font-black text-blue-900 uppercase border-b border-slate-100 pb-1.5">Identificação</p>
                                  
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Nº OS</label>
                                      <input type="text" disabled value="19472" className="w-full bg-slate-100 text-[10px] p-1.5 rounded-lg border border-slate-200 font-mono shadow-inner outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Paciente</label>
                                      <input 
                                        type="text" 
                                        value={osPatient}
                                        onChange={(e) => setOsPatient(e.target.value)}
                                        placeholder="Digite o nome..."
                                        className="w-full bg-white text-[10px] p-1.5 rounded-lg border border-slate-200 font-semibold focus:border-blue-600 outline-none" 
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 pt-1.5">
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Material de Prótese</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      <button 
                                        onClick={() => setOsMaterial('ZIRCONIA')}
                                        className={`py-1.5 rounded-lg text-[9px] font-black border transition-all ${osMaterial === 'ZIRCONIA' ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'}`}
                                      >
                                        Zircônia
                                      </button>
                                      <button 
                                        onClick={() => setOsMaterial('EMAX')}
                                        className={`py-1.5 rounded-lg text-[9px] font-black border transition-all ${osMaterial === 'EMAX' ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'}`}
                                      >
                                        Emax
                                      </button>
                                      <button 
                                        onClick={() => setOsMaterial('RESINA_HIBRIDA')}
                                        className={`py-1.5 rounded-lg text-[9px] font-black border transition-all ${osMaterial === 'RESINA_HIBRIDA' ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'}`}
                                      >
                                        Híbrida
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Form Right (Logistics) */}
                                <div className="sm:col-span-2 space-y-3.5 flex flex-col justify-between">
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-soft space-y-3">
                                    <p className="text-[10px] font-black text-blue-900 uppercase border-b border-slate-100 pb-1.5">Logística</p>
                                    
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Prioridade</label>
                                      <div className="grid grid-cols-4 gap-1">
                                        {(['LOW', 'NORMAL', 'HIGH', 'VIP'] as const).map(p => (
                                          <button 
                                            key={p}
                                            onClick={() => setOsMaterialPriority(p)}
                                            className={`py-1 rounded text-[7px] font-black text-center ${osPriority === p ? 'bg-blue-600 text-white font-extrabold shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                          >
                                            {p}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                      <span className="text-[9px] font-black text-slate-600">Cor da Caixa:</span>
                                      <div className="flex items-center gap-1">
                                        {['red', 'pink', 'orange', 'yellow', 'green', 'blue'].map(c => (
                                          <button 
                                            key={c}
                                            onClick={() => setOsBoxColor(c)}
                                            style={{ backgroundColor: c === 'pink' ? '#EC4899' : c === 'blue' ? '#3B82F6' : c === 'green' ? '#10B981' : c === 'red' ? '#EF4444' : c === 'orange' ? '#F97316' : '#FBBF24' }}
                                            className={`w-3.5 h-3.5 rounded-full border transform active:scale-95 transition-transform ${osBoxColor === c ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-50' : 'border-slate-300'}`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Subtotal Action panel */}
                                  <div className="bg-blue-900 p-3 rounded-xl text-white flex items-center justify-between gap-1 shadow-md">
                                    <div>
                                      <p className="text-[8px] text-blue-300 font-bold uppercase">Total do Caso</p>
                                      <p className="text-sm font-black">R$ {osTotal.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        if(!osPatient) return alert('Por favor, informe o paciente');
                                        setOsSaved(true);
                                        setActiveProductionCount(v => v + 1);
                                      }}
                                      className="px-3.5 py-1.8 bg-teal-400 hover:bg-teal-500 text-blue-950 text-[10px] font-black rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                                    >
                                      <Check size={12} /> Salvar OS
                                    </button>
                                  </div>

                                </div>

                              </div>
                            )}

                          </div>
                        )}

                        {/* TAB 3: AGENDA INTERACTIVE CALENDAR */}
                        {activeTab === 'AGENDA' && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                              <div>
                                <h3 className="text-base font-black text-slate-800 leading-tight">Agenda de Bancada</h3>
                                <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">Faturamento e Fluxo Diário</p>
                              </div>
                              <div className="text-[9px] font-black text-slate-700 bg-white border border-slate-200 py-1 px-3.5 rounded-lg flex items-center gap-2">
                                <span>&lt;</span> <span className="uppercase text-blue-900">Junho 2026</span> <span>&gt;</span>
                              </div>
                            </div>

                            {/* Filtration button tabs */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[9px] font-black text-slate-400 mr-1 uppercase">Filtrar:</span>
                              {(['ALL', 'ATRASADOS', 'URGENTES', 'CORREIOS'] as const).map(f => (
                                <button 
                                  key={f}
                                  onClick={() => setAgendaFilter(f)}
                                  className={`px-3 py-1 text-[8px] font-black rounded-lg border uppercase tracking-wider transition-colors ${
                                    agendaFilter === f 
                                      ? f === 'ATRASADOS' ? 'bg-red-500 border-red-500 text-white font-extrabold shadow-sm'
                                        : f === 'URGENTES' ? 'bg-orange-500 border-orange-500 text-white font-extrabold shadow-sm'
                                        : f === 'CORREIOS' ? 'bg-blue-500 border-blue-500 text-white font-extrabold shadow-sm'
                                        : 'bg-[#0F4C81] border-[#0F4C81] text-white font-extrabold shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  {f === 'ALL' ? 'Todos' : f}
                                </button>
                              ))}
                            </div>

                            {/* Calendar Grid Representation of Screenshot 2 */}
                            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
                              <div className="grid grid-cols-7 text-center bg-slate-100 border-b border-slate-200 py-1.5 text-[8px] font-black text-slate-500">
                                <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
                              </div>
                              <div className="grid grid-cols-7 grid-rows-3 text-[8px] min-h-[180px] bg-slate-50/50">
                                
                                {/* Row 1 */}
                                <div className="border-r border-b border-slate-100 p-1 bg-white relative flex flex-col gap-1">
                                  <span className="font-extrabold text-slate-400">7</span>
                                  <div className="space-y-0.5">
                                    {(agendaFilter === 'ALL' || agendaFilter === 'URGENTES') && (
                                      <div className="bg-orange-100 text-orange-800 text-[6px] p-0.5 rounded leading-none truncate font-bold border-l-2 border-orange-500">Dr. Ricardo - 10P</div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="border-r border-b border-slate-100 p-1 bg-white relative flex flex-col gap-1">
                                  <span className="font-extrabold text-[#00B8D9]">8</span>
                                  <div className="space-y-0.5">
                                    {(agendaFilter === 'ALL' || agendaFilter === 'ATRASADOS') && (
                                      <div className="bg-red-100 text-red-800 text-[6px] p-0.5 rounded leading-none truncate font-bold border-l-2 border-red-500">Dra. Flavia (Luciene)</div>
                                    )}
                                    <div className="bg-slate-100 text-slate-700 text-[6px] p-0.5 rounded leading-none truncate font-bold">Dr. Patrik - Coroa</div>
                                  </div>
                                </div>

                                <div className="border-r border-b border-slate-100 p-1 bg-white relative flex flex-col gap-1">
                                  <span className="font-extrabold text-slate-400 font-bold">9</span>
                                  <div className="space-y-0.5 animate-pulse">
                                    {(agendaFilter === 'ALL' || agendaFilter === 'URGENTES') && (
                                      <div className="bg-orange-100 text-orange-800 text-[6px] p-0.5 rounded leading-none truncate font-bold border-l-2 border-orange-500">Dr. Luciano - Implante V...</div>
                                    )}
                                    <div className="bg-slate-100 text-slate-700 text-[6px] p-0.5 rounded leading-none truncate">Dr. Paulo - Onlay Zirconia</div>
                                  </div>
                                </div>

                                <div className="border-r border-b border-slate-100 p-1 bg-white relative flex flex-col justify-between">
                                  <span className="font-extrabold text-slate-400">10</span>
                                  <div className="space-y-0.5">
                                    {(agendaFilter === 'ALL' || agendaFilter === 'CORREIOS') && (
                                      <div className="bg-blue-100 text-blue-800 text-[6px] p-0.5 rounded leading-none truncate font-bold border-l-2 border-blue-500">Dra. Heloisa (Correios)</div>
                                    )}
                                    <span className="text-[6px] text-slate-400 font-extrabold inline-block text-center w-full bg-slate-50 py-0.5 rounded">+12 mais</span>
                                  </div>
                                </div>

                                <div className="border-r border-b border-slate-100 p-1 bg-blue-50/50 relative flex flex-col gap-1">
                                  <span className="font-extrabold text-blue-700 text-[9px] font-black">11</span>
                                  <div className="space-y-0.5">
                                    {(agendaFilter === 'ALL' || agendaFilter === 'ATRASADOS') && (
                                      <div className="bg-red-50 text-red-500 text-[6px] p-0.5 rounded leading-none truncate font-bold border border-red-200">Dra. Elza (Atrasado)</div>
                                    )}
                                    {(agendaFilter === 'ALL' || agendaFilter === 'URGENTES') && (
                                      <div className="bg-orange-50 text-orange-700 text-[6px] p-0.5 rounded leading-none truncate font-bold border border-orange-200">Dra. Luiza (VIP Expresso)</div>
                                    )}
                                    <span className="text-[6px] text-blue-800 font-extrabold inline-block text-center w-full bg-blue-100/50 py-0.5 rounded">+116 casos</span>
                                  </div>
                                </div>

                                <div className="border-r border-b border-slate-100 p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">12</span>
                                  <div className="space-y-0.5">
                                    <div className="bg-slate-100 text-slate-700 text-[6px] p-0.5 rounded leading-none truncate">Dr. Welinton - Casos</div>
                                  </div>
                                </div>

                                <div className="border-b border-slate-100 p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">13</span>
                                  <div className="space-y-0.5">
                                    <div className="bg-slate-100 text-slate-700 text-[6px] p-0.5 rounded leading-none truncate">Dra. Camila - Terminado</div>
                                  </div>
                                </div>

                                {/* Row 2 */}
                                <div className="border-r border-slate-100 p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">14</span>
                                  <p className="text-[6px] text-slate-300 text-center py-2 font-bold uppercase">Domingo</p>
                                </div>

                                <div className="border-r border-slate-100 p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">15</span>
                                  <div className="bg-slate-100 text-slate-700 text-[6px] p-0.5 rounded leading-none truncate">Dr. Luis Henrique</div>
                                </div>

                                <div className="border-r border-slate-100 p-1 bg-white relative flex flex-col justify-between">
                                  <span className="font-bold text-slate-600">16</span>
                                  <div className="bg-slate-100 text-slate-700 text-[6px] p-0.5 rounded leading-none truncate">Dr. Ricardo - Prototipagem</div>
                                  <span className="text-[6px] text-slate-400 font-extrabold inline-block text-center w-full bg-slate-50 py-0.5 rounded">+24 mais</span>
                                </div>

                                <div className="border-r border-slate-100 p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">17</span>
                                </div>
                                <div className="border-r border-slate-100 p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">18</span>
                                </div>
                                <div className="border-r border-slate-100 p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">19</span>
                                </div>
                                <div className="p-1 bg-white relative">
                                  <span className="font-extrabold text-slate-400">20</span>
                                </div>

                              </div>
                            </div>

                          </div>
                        )}

                      </div>
                    </div>

                  </div>

                </div>

                {/* Floating overlay mockup mimicking Kiwid with depth perspective style and glassmorphism */}
                <div className="absolute -bottom-8 -right-4 sm:-right-8 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xl flex items-center gap-3.5 max-w-[240px] z-20 animate-bounce duration-10000">
                  <div className="w-10 h-10 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center text-teal-600 shadow-inner">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Faturamento Diário</p>
                    <h4 className="text-base font-extrabold text-slate-900">R$ 12.840,00</h4>
                    <span className="text-[9px] text-emerald-500 font-black">+18% vs ontem</span>
                  </div>
                </div>

                <div className="absolute -top-8 -left-4 sm:-left-8 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 shadow-xl flex items-center gap-2 max-w-[200px] z-20">
                  <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-slate-800 font-extrabold leading-none">Cloud Ingress</p>
                    <span className="text-[8px] text-emerald-500 font-extrabold">● Sistema Online</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES GRID SECTION */}
      <section id="recursos" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#0F172A]">
              Uma suíte de ferramentas projetadas sob medida
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Acabe com a confusão de anotações manuais, planilhas de comissão duplicadas e faturamento perdido. Mantenha seu laboratório operando em velocidade máxima.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: <FilePlus2 className="text-blue-600" />,
                title: "Produção Ativa",
                desc: "Rastreie o status do trabalho por seções físicas e cores de caixas, sabendo exatamente quem produziu o quê."
              },
              {
                icon: <Wallet className="text-emerald-500" />,
                title: "Faturamento Financeiro",
                desc: "Fechamentos de contas simplificados de faturamento diário, repasses, recibos e relatórios de fluxo de caixa."
              },
              {
                icon: <Calendar className="text-indigo-600" />,
                title: "Agenda de Bancadas",
                desc: "Previsão inteligente de datas de entrega, evitando sobreposição de demandas ou falha de entrega física para clínicas."
              },
              {
                icon: <Users className="text-blue-500" />,
                title: "Painel de Clínicas",
                desc: "Área customizada para cada dentista cadastrado fazer pedidos de prótese à distância e acompanhar o progresso."
              },
              {
                icon: <DollarSign className="text-emerald-600" />,
                title: "Comissões Automatizadas",
                desc: "Divisão do valor de trabalho automática. Calcule frações de pagamento para todo o gesso, fundição, cerâmica etc."
              },
              {
                icon: <Layers className="text-[#00B8D9]" />,
                title: "Estoque e Insumos",
                desc: "Tenha relatórios claros de ligas físicas, resinas acrílicas e blocos de cerâmica ativos no laboratório."
              },
              {
                icon: <Truck className="text-amber-500" />,
                title: "Roteirizador de Entregas",
                desc: "Planejamento integrado de entregas e roteirização inteligente vinculada ao endereço das clínicas."
              },
              {
                icon: <Inbox className="text-teal-600" />,
                title: "Catálogo & Loja Virtual",
                desc: "O laboratório pode expor e vender itens diretamente por uma loja logada que se conecta à contabilidade central."
              },
              {
                icon: <Bot className="text-indigo-500" />,
                title: "Auditoria com IA",
                desc: "Nossa IA exclusiva prevê sobrecarga de faturamento, atraso iminente no frete e orienta decisões de produção em segundos."
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -4 }}
                className="bg-slate-50 border border-slate-200/80 p-6 sm:p-7 rounded-2xl text-left space-y-4 shadow-soft hover:shadow-md hover:border-slate-300 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
                  {item.icon}
                </div>
                <h3 className="text-base font-extrabold text-[#0F172A]">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">{item.desc}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. PRODUCT SECTION: NO MOCKUP GENERIC - REAL CSS EMBEDDED SHOWCASE (PRODUÇÃO & AGENDA) */}
      <section id="experiencia" className="py-20 bg-slate-100 border-y border-slate-200/60 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          {/* SECTION 4.1: PRODUCTION FOCUS */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6 text-left">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">CONTROLE TOTAL</span>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0F172A]">
                Organize e acelere toda a produção do seu laboratório
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                As caixas físicas do laboratório são integradas à identificação obrigatória da plataforma. Conectamos gesseiros, ceramistas e cadistas em um fluxo de acompanhamento contínuo onde nenhum detalhe é esquecido.
              </p>
              
              <ul className="space-y-4">
                {[
                  { label: "Controle de etapas automatizado", color: "border-blue-500" },
                  { label: "Prioridades vip e controle de prazos", color: "border-orange-500" },
                  { label: "Organização por caixas e cores físicas", color: "border-teal-500" },
                  { label: "Histórico detalhado por caso e técnico", color: "border-slate-800" }
                ].map((item, id) => (
                  <li key={id} className="flex items-center gap-3">
                    <span className="bg-emerald-50 text-emerald-600 p-0.5 rounded-full border border-emerald-200"><Check size={14} className="font-extrabold" /></span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">{item.label}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <button onClick={() => setShowDemoModal(true)} className="inline-flex items-center gap-2 group px-5 py-3 bg-[#0F172A] hover:bg-slate-800 text-white rounded-input font-bold text-xs shadow-md transition-all">
                  Conhecer Módulo de Produção <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* High fidelity simulation card block (Screenshot 3) */}
            <div className="bg-[#0F172A] p-4 rounded-3xl border border-slate-800 shadow-2xl relative">
              <span className="absolute -top-3 left-6 px-3 py-1 bg-teal-400 rounded-full text-blue-950 font-black text-[9px] uppercase tracking-wide">Módulo Ativo</span>
              
              <div className="bg-white rounded-2xl p-4 sm:p-5 flex flex-col text-slate-800 text-left min-h-[360px] justify-between shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 leading-tight">Nova OS de Bancada</h3>
                    <p className="text-[9px] text-[#00B8D9] font-black uppercase tracking-wider">ENTRADA FÍSICA NO LABORATÓRIO</p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[8px] font-black rounded-lg">Físico</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[8px] font-black rounded-lg">Retorno</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Nome do Paciente</label>
                      <input 
                        type="text" 
                        value={osPatient} 
                        onChange={(e) => setOsPatient(e.target.value)}
                        className="w-full text-[10px] p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:border-blue-600 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Tipo de Prótese</label>
                      <select 
                        value={osProsthesisType} 
                        onChange={(e) => setOsProsthesisType(e.target.value)}
                        className="w-full text-[10px] p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:border-blue-600 outline-none"
                      >
                        <option value="Coroa Monolítica">Coroa Monolítica (Zircônia)</option>
                        <option value="Inlay / Onlay Porcelain">Inlay / Onlay Emax</option>
                        <option value="Prótese Total Provisória">Prótese Acrílica Total</option>
                        <option value="Pino de Fibra Metálica">Núcleo Fundido Metálico</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Nível de Urgência</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['LOW', 'NORMAL', 'HIGH', 'VIP'] as const).map(p => (
                          <button 
                            key={p} 
                            onClick={() => setOsMaterialPriority(p)} 
                            className={`py-1 text-[7px] rounded text-center transition-colors font-black ${osPriority === p ? 'bg-blue-600 text-white shadow-soft font-extrabold' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Caixa de Bancada</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-700 bg-slate-100 py-1 px-3 border rounded-lg">Caixa #03</span>
                        <div className="flex gap-1">
                          {['red', 'pink', 'orange', 'yellow', 'green', 'blue'].map(color => (
                            <button 
                              key={color} 
                              onClick={() => setOsBoxColor(color)}
                              style={{ backgroundColor: color === 'pink' ? '#EC4899' : color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : color === 'red' ? '#EF4444' : color === 'orange' ? '#F97316' : '#FBBF24' }}
                              className={`w-3.5 h-3.5 rounded-full border ${osBoxColor === color ? 'ring-2 ring-blue-500 border-white' : 'border-slate-300 opacity-60'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <div className="text-left font-black">
                    <p className="text-[8px] text-slate-400 uppercase leading-none font-bold">Total Estimado</p>
                    <span className="text-lg text-slate-800 font-extrabold">R$ {osTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg animate-pulse">
                    <span>💡 Clique nos botões acima para recalcular em tempo real.</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* SECTION 4.2: CALENDAR AGENDA FOCUS */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Interactive agenda mockup container */}
            <div className="bg-[#0F172A] p-4 rounded-3xl border border-slate-800 shadow-2xl relative lg:order-last">
              <span className="absolute -top-3 right-6 px-3 py-1 bg-indigo-600 rounded-full text-white font-black text-[9px] uppercase tracking-wide">Faturamento Diário</span>
              
              <div className="bg-white rounded-2xl p-4 sm:p-5 flex flex-col text-slate-800 text-left min-h-[360px] justify-between shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800 leading-tight">Agenda de Bancada</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">FATURAMENTO E FLUXO DIÁRIO</p>
                  </div>
                  <div className="text-[9px] font-black text-slate-600 bg-slate-100 border py-1 px-3.5 rounded-lg flex items-center gap-1.5">
                    <span>📅 JUNHO 2026</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center bg-slate-100 border-b py-1.5 text-[8px] font-black text-slate-500 rounded-t-lg mt-3">
                  <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
                </div>
                <div className="grid grid-cols-7 grid-rows-2 text-[8px] bg-slate-50/50 min-h-[140px] border-x border-b rounded-b-lg">
                  <div className="border-r border-b border-slate-200/60 p-1.5 bg-white flex flex-col justify-between">
                    <span className="font-bold text-slate-400">14</span>
                    <span className="text-[6px] text-slate-300 font-extrabold uppercase text-center block py-1">Folga</span>
                  </div>
                  <div className="border-r border-b border-slate-200/60 p-1.5 bg-white relative flex flex-col gap-1">
                    <span className="font-bold text-slate-400">15</span>
                    <div className="bg-red-100 text-red-800 p-0.5 rounded leading-none truncate font-bold">Dra. Elza (Luciene)</div>
                    <div className="bg-slate-100 text-slate-600 p-0.5 rounded leading-none truncate font-semibold">Dr. Luis - Pino</div>
                  </div>
                  <div className="border-r border-b border-slate-200/60 p-1.5 bg-blue-50/50 relative flex flex-col gap-1">
                    <span className="font-black text-blue-700 text-[10px]">16</span>
                    <div className="bg-orange-100 text-orange-800 p-0.5 rounded leading-none truncate font-bold">Dr. Carlos - Emax V...</div>
                    <span className="text-[6px] text-blue-800 font-extrabold inline-block text-center w-full bg-blue-100 py-0.5 rounded">+48 casos</span>
                  </div>
                  <div className="border-r border-b border-slate-200/60 p-1.5 bg-white relative">
                    <span className="font-bold text-slate-400">17</span>
                    <div className="bg-slate-100 text-slate-600 p-0.5 rounded leading-none truncate">Dr. Cristiano</div>
                  </div>
                  <div className="border-r border-b border-slate-200/60 p-1.5 bg-white relative">
                    <span className="font-bold text-slate-400">18</span>
                  </div>
                  <div className="border-r border-b border-slate-200/60 p-1.5 bg-white relative">
                    <span className="font-bold text-slate-400">19</span>
                  </div>
                  <div className="border-b border-slate-200/60 p-1.5 bg-white relative">
                    <span className="font-bold text-slate-400">20</span>
                  </div>

                  {/* Segunda fileira */}
                  <div className="border-r border-slate-200/60 p-1.5 bg-white">
                    <span className="font-bold text-slate-400">21</span>
                  </div>
                  <div className="border-r border-slate-200/60 p-1.5 bg-white flex flex-col justify-between">
                    <span className="font-bold text-slate-400">22</span>
                    <div className="bg-blue-100 text-blue-800 p-0.5 rounded leading-none truncate font-bold">Dr. Felipe (Correio)</div>
                  </div>
                  <div className="border-r border-slate-200/60 p-1.5 bg-white">
                    <span className="font-bold text-slate-400">23</span>
                  </div>
                  <div className="border-r border-slate-200/60 p-1.5 bg-white">
                    <span className="font-bold text-slate-400">24</span>
                  </div>
                  <div className="border-r border-slate-200/60 p-1.5 bg-white">
                    <span className="font-bold text-slate-400">25</span>
                  </div>
                  <div className="border-r border-slate-200/60 p-1.5 bg-white">
                    <span className="font-bold text-slate-400">26</span>
                  </div>
                  <div className="p-1.5 bg-white">
                    <span className="font-bold text-slate-400">27</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-[9px] font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full" /> <span>Atrasados</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> <span>Urgentes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> <span>Envios de Correio</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 text-left">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">AGENDAMENTO INTELIGENTE</span>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0F172A]">
                Nunca mais atrase uma entrega de prótese
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
                Nossa Agenda de Bancada organiza sua rotina para evitar gargalos na data combinada com o cirurgião-dentista, calculando o fluxo de faturamento diário operacional automaticamente.
              </p>

              <ul className="space-y-4">
                {[
                  { label: "Calendário produtivo com carregamento automático", color: "border-blue-500" },
                  { label: "Filtros rápidos para atrasos, urgências e envios físicos", color: "border-orange-500" },
                  { label: "Acompanhamento de rotas logísticas integradas", color: "border-teal-500" },
                  { label: "Cálculo instantâneo de faturamento e taxas", color: "border-slate-800" }
                ].map((item, id) => (
                  <li key={id} className="flex items-center gap-3">
                    <span className="bg-emerald-50 text-emerald-600 p-0.5 rounded-full border border-emerald-200"><Check size={14} className="font-extrabold" /></span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">{item.label}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <button onClick={() => setShowDemoModal(true)} className="inline-flex items-center gap-2 group px-5 py-3 bg-[#0F172A] hover:bg-slate-800 text-white rounded-input font-bold text-xs shadow-md transition-all">
                  Conhecer Calendário Operacional <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

       {/* 6. ADVANCED DIFFERENTIATORS (DIFERENCIAIS) */}
      <section id="diferenciais" className="py-20 bg-slate-50 border-t border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0F172A]">
              Por que laboratórios líderes escolhem o SmileProX?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
              Estudamos de perto a mecânica diária de laboratórios de prótese para eliminar as maiores dores administrativas do negócio.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                title: "Foco 100% em Prótese",
                desc: "Esqueça ERPs genéricos de comércio. Nossa plataforma entende o que são cores Vita, dentes, CadCam, gesseiros e entrega física de caixinhas."
              },
              {
                num: "02",
                title: "Controle Operacional Integrado",
                desc: "Desde a entrada física e emissão imediata da etiqueta com QR Code, até a liquidação financeira no contas a receber de clínicas parceiras."
              },
              {
                num: "03",
                title: "Fim da Redigitação",
                desc: "Sua clínica escreve os dados do paciente diretamente no app ou no consultório e sua recepção só confere a entrada e salva em 1 clique."
              },
              {
                num: "04",
                title: "Insights Recomendados",
                desc: "Gráficos limpos analísticos mostram produtividade por técnico responsável. Nossa IA sugere remanejamento de pessoal para evitar perdas de faturamento."
              }
            ].map((item, id) => (
              <div key={id} className="bg-white border border-slate-200/80 p-6 rounded-2xl text-left space-y-4 hover:border-blue-300 transition-colors shadow-soft">
                <span className="text-2xl font-black text-blue-600 bg-blue-50/50 w-12 h-12 flex items-center justify-center rounded-xl">{item.num}</span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">{item.title}</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. PREMIUM PLAN TABLE (PREÇOS INTEGRADO COM LINKS) */}
      <section id="preco" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0F172A]">
              Planos transparentes para o tamanho do seu negócio
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
              Aproveite 7 dias gratuitos para explorar todos os recursos, sem compromisso e sem cartão de crédito.
            </p>
          </div>

          {/* LAB PLANS SECTION (ROW 1) */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
              <span className="w-2.5 h-6 bg-blue-600 rounded-full" />
              <h3 className="text-xl font-extrabold text-[#0F172A] font-display">Para Laboratórios de Prótese</h3>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Gestão Protética Completa</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-8 justify-center items-stretch">
              {allPlans && allPlans.filter(p => p.isPublic && p.active && p.targetAudience !== 'CLINIC').length > 0 ? (
                allPlans.filter(p => p.isPublic && p.active && p.targetAudience !== 'CLINIC').map((plan) => {
                  const isRecommended = plan.price > 150 && plan.price < 400; // Highlight intermediate plans
                  
                  return (
                    <div 
                      key={plan.id} 
                      className={`border p-8 rounded-3xl text-left flex flex-col justify-between space-y-8 relative transition-all duration-300 hover:scale-[1.02] ${
                        isRecommended 
                          ? 'bg-blue-900 border-blue-950 text-white shadow-2xl relative'
                          : 'bg-white border-slate-200 text-slate-800 shadow-soft hover:border-blue-400'
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-3.5 left-8 px-4 py-1 bg-teal-400 rounded-full text-blue-950 font-black text-[9px] uppercase tracking-wider shadow-md">
                          RECOMENDADO
                        </span>
                      )}
                      
                      <div className="space-y-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isRecommended 
                            ? 'bg-blue-800 text-blue-300' 
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          Laboratório
                        </span>
                        <h3 className={`text-lg font-black leading-tight ${isRecommended ? 'text-white' : 'text-[#0F172A]'}`}>
                          {plan.name}
                        </h3>
                        <p className={`text-xs font-semibold leading-relaxed ${isRecommended ? 'text-blue-200' : 'text-slate-500'}`}>
                          Gestão completa do recebimento, modelagem, CAD/CAM, faturamento e entrega com rastreio inteligente.
                        </p>
                        <div className="pt-2">
                          <span className={`text-3xl font-black ${isRecommended ? 'text-white' : 'text-slate-900'}`}>
                            R$ {plan.price}
                          </span>
                          <span className={`${isRecommended ? 'text-blue-300' : 'text-slate-400'} text-xs font-semibold`}>
                            {' '}/ mês
                          </span>
                          {plan.trialDays && plan.trialDays > 0 ? (
                            <div className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${isRecommended ? 'text-teal-400' : 'text-blue-600'}`}>
                              {plan.trialDays} Dias de Teste Grátis
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <ul className={`space-y-3.5 border-t pt-6 text-xs font-semibold ${
                        isRecommended ? 'border-blue-800 text-blue-100' : 'border-slate-200 text-slate-700'
                      }`}>
                        <li className="flex items-center gap-2.5">
                          <Check size={16} className={isRecommended ? 'text-teal-400 font-extrabold' : 'text-blue-600 font-extrabold'} />
                          <span>Até {plan.features?.maxUsers === -1 || plan.features?.maxUsers === 99999 ? 'Ilimitados' : plan.features?.maxUsers} usuários</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check size={16} className={isRecommended ? 'text-teal-400' : 'text-blue-600'} />
                          <span>Armazenamento: {plan.features?.maxStorageGB === -1 || plan.features?.maxStorageGB === 99999 ? 'Ilimitado' : `${plan.features?.maxStorageGB} GB`}</span>
                        </li>
                        {plan.features?.maxJobsPerMonth !== undefined && (
                          <li className="flex items-center gap-2.5">
                            <Check size={16} className={isRecommended ? 'text-teal-400' : 'text-blue-600'} />
                            <span>Casos / Mês: {plan.features?.maxJobsPerMonth === -1 || plan.features?.maxJobsPerMonth === 99999 ? 'Ilimitados' : plan.features?.maxJobsPerMonth}</span>
                          </li>
                        )}
                        {plan.features?.hasStoreModule && (
                          <li className="flex items-center gap-2.5">
                            <Check size={16} className={isRecommended ? 'text-teal-400' : 'text-blue-600'} />
                            <span>Módulo de Loja Ativo</span>
                          </li>
                        )}
                      </ul>

                      <Link 
                        to={`/register-lab?plan=${plan.id}&type=LAB`} 
                        className={`w-full text-center py-3.5 font-bold text-xs rounded-input shadow-md block transition-colors ${
                          isRecommended 
                            ? 'bg-teal-400 hover:bg-teal-500 text-blue-950 font-black shadow-lg shadow-teal-400/20' 
                            : 'bg-slate-800 hover:bg-slate-900 text-white'
                        }`}
                      >
                        {plan.trialDays && plan.trialDays > 0 ? `Começar Teste Grátis de ${plan.trialDays} Dias` : 'Criar Conta e Começar'}
                      </Link>
                    </div>
                  );
                })
              ) : (
                <>
                  {/* Fallback Lab Essencial */}
                  <div className="bg-white border border-slate-200 p-8 rounded-3xl text-left flex flex-col justify-between space-y-8 shadow-soft hover:border-blue-400">
                    <div className="space-y-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-wider">Essencial</span>
                      <h3 className="text-lg font-black text-[#0F172A] leading-tight">Laboratório Essencial</h3>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">O conjunto ideal para digitalizar e acabar de vez com planilhas e fechar as caixas diárias do laboratório.</p>
                      <div className="pt-2">
                        <span className="text-3xl font-black text-slate-900">R$ 149</span>
                        <span className="text-slate-400 text-xs font-semibold"> / mês</span>
                      </div>
                    </div>
                    <ul className="space-y-3.5 border-t border-slate-200 pt-6 text-xs text-slate-700 font-semibold">
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-blue-600 font-extrabold" />
                        <span>Até 1000 casos por mês</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-blue-600" />
                        <span>Painel de Clínicas e Pedidos Web</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-blue-600" />
                        <span>Fechamento Financeiro e Contas</span>
                      </li>
                    </ul>
                    <Link 
                      to="/register-lab?plan=essencial&type=LAB" 
                      className="w-full text-center py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-input shadow-md block transition-colors"
                    >
                      Começar Teste de 7 Dias
                    </Link>
                  </div>

                  {/* Fallback Lab Completo */}
                  <div className="bg-blue-900 border border-blue-950 p-8 rounded-3xl text-left flex flex-col justify-between space-y-8 shadow-2xl relative text-white">
                    <span className="absolute -top-3.5 left-8 px-4 py-1 bg-teal-400 rounded-full text-blue-950 font-black text-[9px] uppercase tracking-wider shadow-md">RECOMENDADO</span>
                    <div className="space-y-4">
                      <span className="px-3 py-1 bg-blue-800 text-blue-300 rounded-full text-[9px] font-black uppercase tracking-wider">Completo</span>
                      <h3 className="text-lg font-black leading-tight text-white">Laboratório Completo</h3>
                      <p className="text-xs text-blue-200 leading-relaxed font-semibold">Aceleração operacional de grandes laboratórios e franquias que necessitam de IA e integrações logísticas complexas.</p>
                      <div className="pt-2">
                        <span className="text-4xl font-black text-white">R$ 299</span>
                        <span className="text-blue-300 text-xs font-semibold"> / mês</span>
                      </div>
                    </div>
                    <ul className="space-y-3.5 border-t border-blue-800 pt-6 text-xs text-blue-100 font-semibold">
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-teal-400 font-extrabold" />
                        <span>Casos e produções ilimitados</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-teal-400" />
                        <span>Auditor de Insights Inteligentes com IA</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-teal-400" />
                        <span>Suporte prioritário e migração VIP</span>
                      </li>
                    </ul>
                    <Link 
                      to="/register-lab?plan=completo&type=LAB" 
                      className="w-full text-center py-4 bg-teal-400 hover:bg-teal-500 text-blue-950 font-black text-xs rounded-input shadow-lg block transition-colors"
                    >
                      Garantir Licença Gratuita
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CLINIC/DENTIST PLANS SECTION (ROW 2) */}
          <div>
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
              <span className="w-2.5 h-6 bg-teal-600 rounded-full" />
              <h3 className="text-xl font-extrabold text-[#0F172A] font-display">Para Clínicas & Dentistas</h3>
              <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Clínica Digital Conectada</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-8 justify-center items-stretch">
              {allPlans && allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'CLINIC').length > 0 ? (
                allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'CLINIC').map((plan) => {
                  const isRecommended = plan.price > 120; // Highlight premium clinic plan
                  
                  return (
                    <div 
                      key={plan.id} 
                      className={`border p-8 rounded-3xl text-left flex flex-col justify-between space-y-8 relative transition-all duration-300 hover:scale-[1.02] ${
                        isRecommended 
                          ? 'bg-teal-950 border-teal-900 text-white shadow-2xl relative'
                          : 'bg-teal-50/40 border-teal-100 text-slate-800 shadow-soft hover:border-teal-400'
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-3.5 left-8 px-4 py-1 bg-emerald-400 rounded-full text-teal-950 font-black text-[9px] uppercase tracking-wider shadow-md">
                          MAIS PROCURADO
                        </span>
                      )}
                      
                      <div className="space-y-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isRecommended 
                            ? 'bg-teal-900 text-teal-300' 
                            : 'bg-teal-50 text-teal-700 font-bold border border-teal-200'
                        }`}>
                          Dentistas & Clínicas
                        </span>
                        <h3 className={`text-lg font-black leading-tight ${isRecommended ? 'text-white' : 'text-slate-900'}`}>
                          {plan.name}
                        </h3>
                        <p className={`text-xs font-semibold leading-relaxed ${isRecommended ? 'text-teal-200' : 'text-slate-500'}`}>
                          Envio de pedidos para laboratórios, controle financeiro, gestão de prontuários e comissões integradas.
                        </p>
                        <div className="pt-2">
                          <span className={`text-3xl font-black ${isRecommended ? 'text-white' : 'text-slate-900'}`}>
                            R$ {plan.price}
                          </span>
                          <span className={`${isRecommended ? 'text-teal-300' : 'text-slate-400'} text-xs font-semibold`}>
                            {' '}/ mês
                          </span>
                          {plan.trialDays && plan.trialDays > 0 ? (
                            <div className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${isRecommended ? 'text-emerald-400' : 'text-teal-600'}`}>
                              {plan.trialDays} Dias de Teste Grátis
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <ul className={`space-y-3.5 border-t pt-6 text-xs font-semibold ${
                        isRecommended ? 'border-teal-900 text-teal-100' : 'border-slate-200 text-slate-700'
                      }`}>
                        <li className="flex items-center gap-2.5">
                          <Check size={16} className={isRecommended ? 'text-emerald-400 font-extrabold' : 'text-teal-600 font-extrabold'} />
                          <span>Até {plan.features?.maxUsers === -1 || plan.features?.maxUsers === 99999 ? 'Ilimitados' : plan.features?.maxUsers} usuários</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check size={16} className={isRecommended ? 'text-emerald-400' : 'text-teal-600'} />
                          <span>Armazenamento: {plan.features?.maxStorageGB === -1 || plan.features?.maxStorageGB === 99999 ? 'Ilimitado' : `${plan.features?.maxStorageGB} GB`}</span>
                        </li>
                        {plan.features?.hasClinicModule && (
                          <li className="flex items-center gap-2.5">
                            <Check size={16} className={isRecommended ? 'text-emerald-400' : 'text-teal-600'} />
                            <span>Módulo de Gestão Odonto Ativo</span>
                          </li>
                        )}
                      </ul>

                      <Link 
                        to={`/register-lab?plan=${plan.id}&type=DENTIST`} 
                        className={`w-full text-center py-3.5 font-bold text-xs rounded-input shadow-md block transition-colors ${
                          isRecommended 
                            ? 'bg-emerald-400 hover:bg-emerald-500 text-teal-950 font-black shadow-lg shadow-emerald-400/20' 
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      >
                        {plan.trialDays && plan.trialDays > 0 ? `Começar Teste Grátis de ${plan.trialDays} Dias` : 'Criar Conta de Dentista'}
                      </Link>
                    </div>
                  );
                })
              ) : (
                <>
                  {/* Fallback Clinic Básico */}
                  <div className="bg-teal-50/40 border border-teal-100 p-8 rounded-3xl text-left flex flex-col justify-between space-y-8 shadow-soft hover:border-teal-400 text-slate-800">
                    <div className="space-y-4">
                      <span className="px-3 py-1 bg-teal-50 text-teal-700 font-bold border border-teal-100 rounded-full text-[9px] uppercase tracking-wider">Clínica Light</span>
                      <h3 className="text-lg font-black text-slate-900 leading-tight font-display">Clínica Essencial</h3>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">Painel de pedidos integrados, envio rápido de moldes e imagens 3D e rastreio de prazos do laboratório.</p>
                      <div className="pt-2">
                        <span className="text-3xl font-black text-slate-900">R$ 99</span>
                        <span className="text-slate-400 text-xs font-semibold"> / mês</span>
                      </div>
                    </div>
                    <ul className="space-y-3.5 border-t border-slate-200 pt-6 text-xs text-slate-700 font-semibold">
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-teal-600 font-extrabold" />
                        <span>Pedidos e envios ilimitados</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-teal-600" />
                        <span>Até 3 Dentistas cadastrados</span>
                      </li>
                    </ul>
                    <Link 
                      to="/register-lab?plan=clinica-light&type=DENTIST" 
                      className="w-full text-center py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-input shadow-md block transition-colors"
                    >
                      Começar Teste de 7 Dias
                    </Link>
                  </div>

                  {/* Fallback Clinic Premium */}
                  <div className="bg-teal-950 border border-teal-900 p-8 rounded-3xl text-left flex flex-col justify-between space-y-8 shadow-2xl relative text-white">
                    <span className="absolute -top-3.5 left-8 px-4 py-1 bg-emerald-400 rounded-full text-teal-950 font-black text-[9px] uppercase tracking-wider shadow-md">MAIS PROCURADO</span>
                    <div className="space-y-4">
                      <span className="px-3 py-1 bg-teal-900 text-teal-300 rounded-full text-[9px] font-black uppercase tracking-wider">Clínica Pro</span>
                      <h3 className="text-lg font-black leading-tight text-white font-display">Clínica Total + Prontuário</h3>
                      <p className="text-xs text-teal-200 leading-relaxed font-semibold">Prontuário clínico digital completo, controle financeiro de caixa, cálculo automático de comissão de equipe e envio express.</p>
                      <div className="pt-2">
                        <span className="text-3xl font-black text-white">R$ 189</span>
                        <span className="text-teal-300 text-xs font-semibold"> / mês</span>
                      </div>
                    </div>
                    <ul className="space-y-3.5 border-t border-teal-900 pt-6 text-xs text-teal-100 font-semibold">
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-emerald-400 font-extrabold" />
                        <span>Prontuário completo ativo</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-emerald-400" />
                        <span>Dentistas e secretárias ilimitados</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check size={16} className="text-emerald-400" />
                        <span>Controle de recebíveis e faturamento</span>
                      </li>
                    </ul>
                    {/* Link fallback */}
                    <Link 
                      to="/register-lab?plan=clinica-pro&type=DENTIST" 
                      className="w-full text-center py-3.5 bg-emerald-400 hover:bg-emerald-500 text-teal-950 font-black text-xs rounded-input shadow-lg block transition-colors"
                    >
                      Garantir Teste Corporativo
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 8. MODERN TESTIMONIAL SLIDER */}
      <section id="depoimentos" className="py-20 bg-slate-100 border-t border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0F172A]">
              Validado por quem entende de prótese
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
              Confira os relatos de laboratórios e profissionais que elevaram o patamar de seu faturamento semanal.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 p-8 md:p-10 rounded-[32px] shadow-premium text-left space-y-8 relative">
            <span className="text-6xl text-slate-200 font-serif absolute -top-4 -left-2 select-none">“</span>
            
            <p className="text-sm sm:text-base text-slate-700 italic font-semibold leading-relaxed relative z-10">
              {testimonials[testimonialIndex].text}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center text-white text-base font-extrabold shadow-sm">
                  {testimonials[testimonialIndex].avatar}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">{testimonials[testimonialIndex].author}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{testimonials[testimonialIndex].role}</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-[10px] text-blue-700 font-black text-center sm:text-right">
                {testimonials[testimonialIndex].stats}
              </div>
            </div>

            {/* Testimonials controls */}
            <div className="flex justify-center gap-2 pt-2">
              {testimonials.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setTestimonialIndex(i)} 
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${testimonialIndex === i ? 'bg-[#0F4C81] border-[#0F4C81] scale-110' : 'bg-slate-200 border-transparent hover:bg-slate-300'}`} 
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 9. DARK CTA FINAL BLOCK */}
      <section className="py-20 bg-[#0F172A] relative overflow-hidden text-center text-white">
        
        {/* Glow orbit tech references */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black font-display tracking-tight leading-tight">
            Pronto para modernizar seu laboratório?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Elimine as planilhas manuais, reduza custos, otimize o cálculo de repasses semanais e ofereça um canal digital premium para suas clínicas parceiras hoje mesmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setShowDemoModal(true)} 
              className="w-full sm:w-auto px-8 py-4 bg-teal-400 hover:bg-teal-500 text-blue-950 font-black text-xs rounded-input shadow-lg tracking-wide transition-all transform hover:scale-[1.01]"
            >
              Agendar Demonstração Grátis
            </button>
            <Link 
              to="/register-lab" 
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-input shadow-lg shadow-blue-500/10 tracking-wide transition-all transform hover:scale-[1.01]"
            >
              Criar Conta Gratuita
            </Link>
          </div>
        </div>
      </section>

      {/* 10. RODAPÉ */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-16 text-xs text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            
            {/* Column 1: Brand details */}
            <div className="space-y-4">
              <Logo size="md" variant="light" />
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed max-w-xs">
                O ecossistema definitivo para controle operacional de laboratórios protéticos e clínicas odontológicas conectadas de alta velocidade.
              </p>
              <span className="text-[9px] text-[#00B8D9] font-black uppercase block">Feito com carinho no Brasil 🇧🇷</span>
            </div>

            {/* Column 2: Resources and details */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Módulos do Sistema</h4>
              <ul className="space-y-2.5 font-bold">
                <li><a href="#recursos" className="hover:text-white transition-colors">Produção Ativa</a></li>
                <li><a href="#recursos" className="hover:text-white transition-colors">Relatórios Financeiros</a></li>
                <li><a href="#recursos" className="hover:text-white transition-colors">Cálculo de Comissão</a></li>
                <li><a href="#recursos" className="hover:text-white transition-colors">Agenda Inteligente</a></li>
              </ul>
            </div>

            {/* Column 3: Navigation links and register profiles */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Acesso e Experimentações</h4>
              <ul className="space-y-2.5 font-bold">
                <li><Link to="/login" className="hover:text-white transition-colors">Entrar na Conta</Link></li>
                <li><Link to="/register-lab" className="hover:text-white transition-colors">Cadastro Laboratório</Link></li>
                <li><Link to="/register-lab?profile=dentista" className="hover:text-white transition-colors">Cadastro Dentista</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>

            {/* Column 4: App Store downloads indicators */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Aplicações Móveis</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Baixe nossa plataforma web progressiva (PWA) direto de seu smartphone.</p>
              <div className="flex flex-col gap-2">
                <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors w-36">
                  <Download size={14} />
                  <div className="text-[8px] font-bold text-left leading-none">Disponível no <span className="block text-[10px] font-extrabold">Google Play</span></div>
                </a>
                <a href="https://apple.com/app-store" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors w-36">
                  <Download size={14} />
                  <div className="text-[8px] font-bold text-left leading-none">Baixar na <span className="block text-[10px] font-extrabold">App Store</span></div>
                </a>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
            <span>© 2026 SmileProX Operating System. Todos os direitos reservados.</span>
            <span>CNPJ: 00.000.000/0001-00 · Contato: comercial@smileprox.app</span>
          </div>
        </div>
      </footer>

      {/* 11. DEMONSTRATION BOOKING MODAL */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 sm:p-8 rounded-card max-w-md w-full shadow-2xl relative text-left border border-slate-200"
            >
              <button 
                onClick={() => setShowDemoModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                aria-label="Minimizar formulário"
              >
                <X size={18} />
              </button>

              <div className="text-left space-y-2 mb-6">
                <h3 className="text-lg font-black text-slate-900">Solicitar demonstração comercial</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">Preencha os campos abaixo e agende uma vídeo-chamada rápida de 15 minutos para conhecer a ferramenta na prática.</p>
              </div>

              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Seu Nome</label>
                  <input 
                    type="text" 
                    required
                    value={demoForm.name} 
                    onChange={e => setDemoForm({...demoForm, name: e.target.value})}
                    placeholder="Seu nome completo..." 
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    required
                    value={demoForm.email} 
                    onChange={e => setDemoForm({...demoForm, email: e.target.value})}
                    placeholder="exemplo@laboratorio.com" 
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-semibold text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">WhatsApp / Telefone</label>
                    <input 
                      type="text" 
                      value={demoForm.phone} 
                      onChange={e => setDemoForm({...demoForm, phone: e.target.value})}
                      placeholder="(00) 99999-0000" 
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nome do Laboratório</label>
                    <input 
                      type="text" 
                      value={demoForm.labName} 
                      onChange={e => setDemoForm({...demoForm, labName: e.target.value})}
                      placeholder="Lab Padilha, etc." 
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-input font-bold text-xs shadow-md transition-colors"
                >
                  Agendar Demonstração Comercial
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
