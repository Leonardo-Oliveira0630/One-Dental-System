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
  Grid,
  ShoppingBag,
  Store,
  Filter,
  Plus,
  ArrowUpRight,
  Eye,
  FileDown,
  Trash2,
  CreditCard,
  Upload
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

  // Active Landing Tab State
  const [landingPageTab, setLandingPageTab] = useState<'LABORATORIO' | 'LOJA_ONLINE' | 'GESTAO_CLINICA' | 'PRECOS'>('LABORATORIO');

  // Gestão Clínica Odontológica (Clinic Portal) State
  const [clinicSearch, setClinicSearch] = useState('');
  const [clinicFilterStatus, setClinicFilterStatus] = useState<'TODOS' | 'EM_BANCADA' | 'PRONTO' | 'ENVIADO'>('TODOS');
  const [odontogramToothSelected, setOdontogramToothSelected] = useState<number | null>(11);
  const [clinicSelectedCaseId, setClinicSelectedCaseId] = useState<string>('case_1');
  const [clinicNotification, setClinicNotification] = useState<string | null>(null);

  // Custom mock data for simulated Clinic portal
  const [clinicCases, setClinicCases] = useState([
    {
      id: 'case_1',
      patientName: 'LUCAS OLIVEIRA MENEZES',
      prosthesisName: 'Coroa de Zircônia',
      teeth: '11',
      price: 409.00,
      partnerLab: 'Laboratório Oliveira',
      status: 'EM_BANCADA',
      statusText: 'Usinagem de Bloco',
      date: '15/06/2026',
      paymentStatus: 'CONCILIADO',
      avatar: 'L'
    },
    {
      id: 'case_2',
      patientName: 'MARIANA SANTOS BARRETO',
      prosthesisName: 'Faceta Monolítica',
      teeth: '22, 23',
      price: 800.00,
      partnerLab: 'Laboratório Oliveira',
      status: 'ENVIADO',
      statusText: 'Saiu para Entrega Física',
      date: '14/06/2026',
      paymentStatus: 'CONCILIADO',
      avatar: 'M'
    },
    {
      id: 'case_3',
      patientName: 'DR. GUSTAVO HENRIQUE COSTA',
      prosthesisName: 'Inlay de Emax',
      teeth: '36',
      price: 600.00,
      partnerLab: 'Laboratório Vieira Digital',
      status: 'PRONTO',
      statusText: 'Pronto na Expedição',
      date: '12/06/2026',
      paymentStatus: 'AGUARDANDO_COBRANCA',
      avatar: 'G'
    }
  ]);

  // Dentist Online Store Presentation State
  const [storeSearch, setStoreSearch] = useState('');
  const [storeCategory, setStoreCategory] = useState<'ALL' | 'CHROME_MONOLITICO' | 'IMPRESSAO_MODELO' | 'EMAX'>('ALL');
  const [storeCart, setStoreCart] = useState<Array<{ id: string; name: string; price: number; categoryBadge: string }>>([
    // Initialize with a default product to make the cart feel alive immediately
    {
      id: 'prod_1',
      name: "Coroa Monolítica",
      categoryBadge: "CHROME_MONOLITICO",
      price: 500.00
    }
  ]);
  const [storeNotification, setStoreNotification] = useState<string | null>(null);
  const [selectedDemoProduct, setSelectedDemoProduct] = useState<any>(null);
  const [storeWorkflowStep, setStoreWorkflowStep] = useState<number>(0);
  const [digitalFileAttached, setDigitalFileAttached] = useState<boolean>(true); // Pre-attached for realism
  const [patientName, setPatientName] = useState<string>('LUCAS OLIVEIRA MENEZES');
  
  // Tabs & checkout mockup state variables
  const [storeTab, setStoreTab] = useState<'CATALOGO' | 'CARRINHO'>('CATALOGO');
  const [storePaymentMethod, setStorePaymentMethod] = useState<'CARTAO' | 'PIX'>('CARTAO');
  const [couponCode, setCouponCode] = useState<string>('LABPROX10');
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [simulatedCheckoutSuccess, setSimulatedCheckoutSuccess] = useState<boolean>(false);

  // Clinic Management (Dentist System Mockups) States
  const [clinicSubTab, setClinicSubTab] = useState<'PACIENTES' | 'PROCEDIMENTOS' | 'FINANCEIRO' | 'AGENDA'>('PACIENTES');
  const [mockPatients, setMockPatients] = useState([
    { id: 1, name: 'MARIA', date: '22/01/2026', phone: '27 99754-4638', email: 'mariateste@gmail.com' },
    { id: 2, name: 'MARCOS', date: '15/06/2026', phone: '27 99764-7581', email: 'teste@gmail.com' }
  ]);
  const [mockProcedures, setMockProcedures] = useState([
    { id: 1, name: 'Extração de Siso', category: 'Dentística', duration: 60, price: 120.00 },
    { id: 2, name: 'Limpeza', category: 'Limpeza', duration: 60, price: 180.00 },
    { id: 3, name: 'Restauração em Resina', category: 'Restauração', duration: 60, price: 600.00 }
  ]);
  const [mockAppointments, setMockAppointments] = useState([
    { id: 1, patient: 'MARIA', procedure: 'Extração de Siso', time: '09:00', sala: 'SALA 1', doctor: 'DR. LUCIO' },
    { id: 2, patient: 'MARIA', procedure: 'Restauração em Resina', time: '12:00', sala: 'SALA 1', doctor: 'DR. LEO' }
  ]);

  // Search local states in simulator
  const [clinicPatientSearch, setClinicPatientSearch] = useState('');
  const [clinicProcSearch, setClinicProcSearch] = useState('');

  // Form states for adding items in simulator
  const [newProcName, setNewProcName] = useState('');
  const [newProcCategory, setNewProcCategory] = useState('');
  const [newProcPrice, setNewProcPrice] = useState('');
  const [newProcDuration, setNewProcDuration] = useState('60');

  const [newPatName, setNewPatName] = useState('');
  const [newPatPhone, setNewPatPhone] = useState('');
  const [newPatEmail, setNewPatEmail] = useState('');
  const [showAddPatForm, setShowAddPatForm] = useState(false);

  const [newApptPatient, setNewApptPatient] = useState('MARIA');
  const [newApptProc, setNewApptProc] = useState('Extração de Siso');
  const [newApptTime, setNewApptTime] = useState('14:30');
  const [newApptDoctor, setNewApptDoctor] = useState('DR. LUCIO');
  const [showAddApptForm, setShowAddApptForm] = useState(false);

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
      text: "O LabProX revolucionou como controlamos as mais de 600 caixas físicas de produção ativa no laboratório. A precisão no controle de etapas reduziu nossos atrasos em incríveis 90% logo no primeiro mês!",
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
      text: "Calcular comissões de bancada no fechamento da semana sempre foi um pesadelo demorado. Com o LabProX, cada setor lança seu trabalho e a folha se auto-compõe conforme o material (Zircônia, Emax, etc.). Recomendadíssimo!",
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
            <nav className="hidden lg:flex items-center gap-6 text-xs font-black uppercase tracking-wider text-slate-600">
              <button 
                onClick={() => setLandingPageTab('LABORATORIO')} 
                className={`transition-colors py-2 relative ${landingPageTab === 'LABORATORIO' ? 'text-blue-600 font-black' : 'hover:text-blue-500 font-bold'}`}
              >
                Operacional Laboratório
                {landingPageTab === 'LABORATORIO' && (
                  <span className="absolute bottom-[-20px] left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button 
                onClick={() => setLandingPageTab('LOJA_ONLINE')} 
                className={`transition-colors py-2 relative ${landingPageTab === 'LOJA_ONLINE' ? 'text-blue-600 font-black' : 'hover:text-blue-500 font-bold'}`}
              >
                Loja Online
                {landingPageTab === 'LOJA_ONLINE' && (
                  <span className="absolute bottom-[-20px] left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button 
                onClick={() => setLandingPageTab('GESTAO_CLINICA')} 
                className={`transition-colors py-2 relative ${landingPageTab === 'GESTAO_CLINICA' ? 'text-blue-600 font-black' : 'hover:text-blue-500 font-bold'}`}
              >
                Gestão Clínica
                {landingPageTab === 'GESTAO_CLINICA' && (
                  <span className="absolute bottom-[-20px] left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button 
                onClick={() => setLandingPageTab('PRECOS')} 
                className={`transition-colors py-2 relative ${landingPageTab === 'PRECOS' ? 'text-blue-600 font-black' : 'hover:text-blue-500 font-bold'}`}
              >
                Preços e Planos
                {landingPageTab === 'PRECOS' && (
                  <span className="absolute bottom-[-20px] left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors uppercase tracking-wider">
              Entrar
            </Link>
            <Link 
              to="/register-lab" 
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-input shadow-soft flex items-center gap-1.5 transition-all transform hover:scale-[1.02]"
            >
              Criar Conta Gratuita <ChevronRight size={14} />
            </Link>
          </div>

          {/* Mobile Login & menu trigger */}
          <div className="flex lg:hidden items-center gap-2">
            <Link to="/login" className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 border border-blue-200 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors">
              Entrar
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
              className="lg:hidden bg-white border-b border-slate-200/80 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4 flex flex-col text-sm font-black uppercase tracking-wider text-slate-700">
                <button 
                  onClick={() => { setMenuOpen(false); setLandingPageTab('LABORATORIO'); }} 
                  className={`text-left py-2 hover:text-blue-600 transition-colors ${landingPageTab === 'LABORATORIO' ? 'text-blue-600 font-extrabold' : ''}`}
                >
                  Operacional Laboratório
                </button>
                <button 
                  onClick={() => { setMenuOpen(false); setLandingPageTab('LOJA_ONLINE'); }} 
                  className={`text-left py-2 hover:text-blue-600 transition-colors ${landingPageTab === 'LOJA_ONLINE' ? 'text-blue-600 font-extrabold' : ''}`}
                >
                  Loja Online
                </button>
                <button 
                  onClick={() => { setMenuOpen(false); setLandingPageTab('GESTAO_CLINICA'); }} 
                  className={`text-left py-2 hover:text-blue-600 transition-colors ${landingPageTab === 'GESTAO_CLINICA' ? 'text-blue-600 font-extrabold' : ''}`}
                >
                  Gestão Clínica
                </button>
                <button 
                  onClick={() => { setMenuOpen(false); setLandingPageTab('PRECOS'); }} 
                  className={`text-left py-2 hover:text-blue-600 transition-colors ${landingPageTab === 'PRECOS' ? 'text-blue-600 font-extrabold' : ''}`}
                >
                  Preços e Planos
                </button>
                <hr className="border-slate-100" />
                <Link to="/login" onClick={() => setMenuOpen(false)} className="py-2 text-xs font-black text-slate-700 hover:text-blue-600">Entrar no Sistema</Link>
                <Link 
                  to="/register-lab" 
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center py-3 bg-blue-600 text-white text-xs font-black rounded-input shadow-soft"
                >
                  Experimentar Grátis
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. ENTERPRISE HERO SECTION */}
      {landingPageTab === 'LABORATORIO' && (
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
                      www.labprox.com.br
                    </div>
                    <div className="w-8" />
                  </div>

                  <div className="pt-4 bg-slate-50 rounded-2xl overflow-hidden min-h-[360px] xs:min-h-[440px] text-slate-700 flex flex-col text-left">
                    
                    {/* Header bar clone */}
                    <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1 font-extrabold text-blue-900 text-sm">
                        <LogoIcon size="sm" />
                        <span className="tracking-tight uppercase font-black text-xs font-display">LAB<span className="text-[#00B8D9]">PROX</span></span>
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
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest leading-none font-bold">Lab LABPROX</p>
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
      )}

      {/* DENTIST ONLINE STORE PRESENTATION SECTION */}
      {landingPageTab === 'LOJA_ONLINE' && (
      <section id="loja-online" className="py-20 bg-slate-900 text-white relative overflow-hidden scroll-mt-20">
        {/* Background accent lights */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header block with badges */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full text-xs font-black text-teal-400 tracking-wide uppercase">
              <ShoppingBag size={12} className="text-teal-400" /> NOVIDADE: LOJA ONLINE INTEGRADA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
              Sua Clínica Conectada Diretamente à <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">Bancada do Laboratório</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Apresentamos o canal de vendas interativo para Clínicas e Dentistas. Compre serviços de próteses, envie escaneamentos digitais e acompanhe a produção em tempo real, sem ruídos na comunicação.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Left information column (workflow, advantages, stats) */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-teal-400 tracking-wide uppercase flex items-center gap-2">
                  <span className="w-2 h-5 bg-teal-500 rounded-full inline-block" /> Como Funciona o Fluxo?
                </h3>
                <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                  Elimine e-mails confusos, ligações de cobrança e arquivos perdidos no WhatsApp. O fluxo foi desenhado para ser totalmente digital e à prova de falhas:
                </p>
              </div>

              {/* Interactive Steps Workflow */}
              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    title: "Catálogo & Seleção",
                    desc: "O dentista acessa a loja exclusiva, navega pelo catálogo oficial do laboratório, escolhe os serviços desejados (Zircônia, Emax, etc.) e vê os preços acordados instantaneamente."
                  },
                  {
                    step: 2,
                    title: "Anexação de Arquivos 3D",
                    desc: "No carrinho de compras, o dentista informa os dados do paciente e faz o upload direto de arquivos STL/OBJ do escaneamento intraoral, ou solicita coleta física."
                  },
                  {
                    step: 3,
                    title: "Produção Automática de Bancada",
                    desc: "Ao fechar o pedido, as ordens são disparadas para o software de bancada do laboratório. Uma caixa física com QR Code de rastreio exclusivo é gerada automaticamente."
                  },
                  {
                    step: 4,
                    title: "Tracking em Tempo Real",
                    desc: "O dentista acompanha pelo celular cada fase de produção (Ex: Gesso, Fresagem CFD, Maquiagem, Prontos) e recebe avisos de expedição e faturamento transparente."
                  }
                ].map((item, index) => (
                  <div 
                    key={index} 
                    onClick={() => setStoreWorkflowStep(index)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex gap-4 ${
                      storeWorkflowStep === index 
                        ? 'bg-slate-800/80 border-teal-500/40 shadow-lg shadow-teal-500/5' 
                        : 'bg-slate-900/10 border-slate-800/60 hover:bg-slate-800/20 hover:border-slate-800'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-extrabold text-xs transition-colors ${
                      storeWorkflowStep === index ? 'bg-teal-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.step}
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-xs font-black tracking-wide uppercase ${
                        storeWorkflowStep === index ? 'text-teal-400' : 'text-slate-200'
                      }`}>{item.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-time notification if test interactive trigger matches */}
              {storeCart.length > 0 && (
                <div className="p-4 bg-teal-950/40 border border-teal-500/30 rounded-2xl animate-pulse flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                  <p className="text-[11px] font-bold text-teal-300">
                    Você selecionou {storeCart.length} item(s) no simulador. Clique em "Anexar Escaneamento" na loja para simular o pedido 3D!
                  </p>
                </div>
              )}
            </div>

            {/* Right Interactive Mockup Column - Replicates User's Screenshot exactly */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Eye size={12} className="text-teal-400" /> PREVIEW INTERATIVO DA LOJA DO LABORATÓRIO (MOCKUP REAL)
                </span>
                <p className="text-[11px] text-slate-400 font-semibold mb-4 leading-relaxed">
                  Explore e interaja com o simulador abaixo. Esta é a visão exata do seu cirurgião-dentista ao comprar suas próteses na plataforma:
                </p>
              </div>

              {/* Beautiful Simulated Browser Layout */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 relative">
                
                {/* Simulated Notification Toast inside Mockup */}
                <AnimatePresence>
                  {storeNotification && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.9 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm bg-slate-900 text-white border border-teal-500/40 p-4 rounded-2xl shadow-2xl flex gap-3 text-left items-start"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">✓</div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-teal-400">Sucesso na Simulação!</p>
                        <p className="text-[10px] leading-relaxed text-slate-350">{storeNotification}</p>
                        <button 
                          onClick={() => setStoreNotification(null)}
                          className="text-[9px] font-black text-white hover:underline uppercase pt-1"
                        >
                          Fechar Aviso
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Browser Header Bar */}
                <div className="bg-[#0b0e14] px-4 py-2 flex items-center justify-between border-b border-slate-900">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 text-[10px] text-slate-400 py-0.5 px-6 rounded-full font-mono max-w-xs truncate">
                    labprox.com.br/dentista/loja_oliveira
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black px-1.5 py-0.5 rounded uppercase">Ativo</span>
                  </div>
                </div>

                <div className="flex min-h-[500px]">
                  
                  {/* Left Sidebar Mockup (Dark Sidebar like in image) */}
                  <div className="w-48 bg-[#0b0f19] text-slate-300 p-3 flex flex-col justify-between border-r border-slate-900 text-left shrink-0 hidden sm:flex">
                    <div className="space-y-5">
                      {/* Logo and Lab Info */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase font-display border-b border-slate-900 pb-2.5">
                          <LogoIcon size="xs" />
                          <span>SMILE<span className="text-teal-400">PROX</span></span>
                        </div>
                        
                        <div className="mt-4 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 space-y-1">
                          <p className="text-[9px] font-black leading-none text-teal-400 uppercase tracking-widest">Laboratório Ativo</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white truncate max-w-[110px]">Laboratório Oliveira</span>
                            <span className="text-[8px] text-slate-400">▼</span>
                          </div>
                        </div>
                      </div>

                      {/* Menu links replicating exactly the image */}
                      <nav className="space-y-1 text-[11px] font-bold">
                        <button 
                          onClick={() => {
                            setStoreTab('CATALOGO');
                            setStoreNotification("Visualizando o Catálogo de Próteses");
                            setTimeout(() => setStoreNotification(null), 2000);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                            storeTab === 'CATALOGO' 
                              ? 'bg-teal-500/10 text-teal-450 border border-teal-500/20 font-extrabold' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                          }`}
                        >
                          <ShoppingBag size={13} className="text-teal-400" />
                          <span>Loja de Prótese</span>
                        </button>

                        <button 
                          onClick={() => {
                            setStoreTab('CARRINHO');
                            setStoreNotification("Visualizando o Carrinho de Envio");
                            setTimeout(() => setStoreNotification(null), 2000);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                            storeTab === 'CARRINHO' 
                              ? 'bg-teal-500/10 text-teal-450 border border-teal-500/20 font-extrabold' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                          }`}
                        >
                          <ShoppingBag size={13} className="text-emerald-400" />
                          <span>Carrinho</span>
                          {storeCart.length > 0 && (
                            <span className="ml-auto bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full text-[8.5px] leading-none">
                              {storeCart.length}
                            </span>
                          )}
                        </button>

                        <div className="px-5 py-0.5 text-[8px] text-slate-400 uppercase font-black tracking-widest text-left">Meus Serviços</div>
                        
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/50 cursor-not-allowed">
                          <Users size={13} />
                          <span>Parcerias Lab</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/50 cursor-not-allowed">
                          <Bot size={13} />
                          <span>Central de Ajuda</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/50 cursor-not-allowed">
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] font-extrabold text-teal-400">U</span>
                          <span>Meu Perfil</span>
                        </div>
                      </nav>
                    </div>

                    <div className="pt-4 border-t border-slate-900 text-slate-500 text-[10px] font-bold flex items-center gap-2">
                      <span className="text-red-500">←</span> Sair
                    </div>
                  </div>

                  {/* Main Store Mockup Workspace */}
                  <div className="flex-1 bg-slate-100 p-4 font-sans text-left flex flex-col justify-between overflow-y-auto max-h-[585px] relative">
                    
                    {/* Simulated payment success modal inside browser workspace */}
                    {simulatedCheckoutSuccess && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-40 rounded-r-2xl animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl p-6 max-w-sm text-center space-y-4 border border-slate-200 shadow-2xl">
                          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 font-bold text-2xl">
                            🎉
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-black text-slate-900 uppercase">OS Gerada com Sucesso!</h4>
                            <p className="text-[10.5px] text-slate-600 leading-relaxed font-semibold">
                              O faturamento automático LabPro via Asaas foi liquidado e o arquivo STL de escaneamento 3D do paciente <strong>{patientName || "LUCAS OLIVEIRA MENEZES"}</strong> foi enviado diretamente para o painel de bancada técnica do <strong>Laboratório Oliveira</strong>!
                            </p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left space-y-1">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Status de Sincronização</p>
                            <div className="flex items-center justify-between text-[10px] font-black text-slate-800">
                              <span>🧾 OS ID:</span>
                              <span className="text-teal-650">#OS-2026-94</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black text-slate-850">
                              <span>📦 Caixa de Coleta:</span>
                              <span className="text-orange-500 font-bold">Etiqueta Impressa</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setSimulatedCheckoutSuccess(false);
                              setStoreCart([
                                { id: 'prod_1', name: "Coroa Monolítica", categoryBadge: "CHROME_MONOLITICO", price: 500.00 }
                              ]);
                              setStoreTab('CATALOGO');
                              setCouponApplied(false);
                            }}
                            className="w-full py-2 px-4 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-[10px] rounded-xl transition-colors uppercase tracking-wider"
                          >
                            Simular Novo Pedido
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Top subheader with client details like in PDF */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-teal-500 text-sm">🦷</span>
                        <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest font-mono">LABPROX PRO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-800 leading-none">TESTE2</p>
                          <p className="text-[7.5px] text-slate-500 font-extrabold uppercase leading-none mt-0.5">Cirurgião-Dentista</p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[9px] font-black">
                          T
                        </div>
                      </div>
                    </div>

                    {/* Quick Horizontal Tab Indicator for clarity */}
                    <div className="flex bg-slate-200/50 p-1 rounded-xl mb-4 gap-1 border border-slate-300/40">
                      <button 
                        onClick={() => {
                          setStoreTab('CATALOGO');
                          setStoreNotification("Visualizando o Catálogo de Serviços.");
                          setTimeout(() => setStoreNotification(null), 2000);
                        }}
                        className={`flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${storeTab === 'CATALOGO' ? 'bg-white text-slate-900 shadow-sm border border-slate-300/30' : 'text-slate-605 hover:text-slate-900 hover:bg-slate-100/50'}`}
                      >
                        🛍️ 1. Catálogo de Próteses
                      </button>
                      <button 
                        onClick={() => {
                          setStoreTab('CARRINHO');
                          setStoreNotification("Visualizando o Carrinho de Envio.");
                          setTimeout(() => setStoreNotification(null), 2000);
                        }}
                        className={`flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${storeTab === 'CARRINHO' ? 'bg-white text-slate-900 shadow-sm border border-slate-300/30' : 'text-slate-655 hover:text-slate-900 hover:bg-slate-100/50'}`}
                      >
                        🛒 2. Carrinho & Envio STL
                        {storeCart.length > 0 && (
                          <span className="bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[8px] font-black ml-1">
                            {storeCart.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* ======================= CASE A: CATALOGUE OF PROSTHESES (Unobstructed grid layout) ======================= */}
                    {storeTab === 'CATALOGO' && (
                      <div className="space-y-4 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* Banner */}
                          <div className="bg-[#0b0f19] rounded-2xl relative overflow-hidden p-3.5 text-white flex flex-col justify-end min-h-[85px] border border-slate-800 shadow-sm">
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-900/10 z-10" />
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 w-24 h-24 border border-white/5 rounded-full pointer-events-none" />
                            
                            <div className="relative z-20 space-y-0.5">
                              <p className="text-[7px] tracking-widest text-teal-400 font-extrabold uppercase font-mono">SERVIÇOS DE PRÓTESE</p>
                              <h3 className="text-sm font-black tracking-tight text-white leading-none">
                                Catálogo Digital Oliveira
                              </h3>
                              <p className="text-[9px] text-slate-350">Selecione as peças para enviar escaneamento e emitir faturamento Asaas.</p>
                            </div>
                          </div>

                          {/* Search and Filters */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div className="sm:col-span-3 relative">
                              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                              <input 
                                type="text" 
                                value={storeSearch}
                                onChange={(e) => setStoreSearch(e.target.value)}
                                placeholder="Qual serviço você procura? Ex: Coroa, Faceta, Onlay..." 
                                className="w-full bg-white border border-slate-205 text-[10px] pl-8 pr-2.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium placeholder-slate-400 shadow-sm" 
                              />
                            </div>
                            <div>
                              <div className="bg-white border border-slate-205 py-2 px-2 rounded-xl text-[9px] font-black text-slate-705 text-center flex items-center justify-between gap-1 shadow-sm cursor-pointer hover:bg-slate-50">
                                <span className="uppercase">Categorias</span>
                                <span className="text-slate-400">▼</span>
                              </div>
                            </div>
                          </div>

                          {/* Filter chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {[
                              { id: 'ALL', label: 'Todos os Serviços' },
                              { id: 'CHROME_MONOLITICO', label: 'MONOLÍTICO' },
                              { id: 'IMPRESSAO_MODELO', label: 'IMPRESSÃO' },
                              { id: 'EMAX', label: 'EMAX' }
                            ].map(chip => (
                              <button 
                                key={chip.id}
                                onClick={() => setStoreCategory(chip.id as any)}
                                className={`px-2.5 py-1 text-[8px] font-black rounded-lg border uppercase tracking-wider transition-all ${
                                  storeCategory === chip.id 
                                    ? 'bg-teal-500 border-teal-500 text-slate-950 font-black shadow-sm' 
                                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100 font-bold'
                                }`}
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>

                          {/* Catalog Grid without bottom blocking panel */}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              {
                                id: 'prod_1',
                                name: "Coroa Monolítica",
                                categoryBadge: "CHROME_MONOLITICO",
                                labelText: "MONOLÍTICO / IMPLANTE",
                                priceVal: 500.00,
                                desc: "Zircônia pura usinada, alta resistência estética para posterior.",
                                svgSvg: (
                                  <svg viewBox="0 0 100 100" className="w-11 h-11 mx-auto drop-shadow-md">
                                    <rect x="30" y="55" width="40" height="25" rx="4" fill="#94a3b8" />
                                    <rect x="42" y="75" width="16" height="15" fill="#64748b" />
                                    <path d="M25 45 C25 25, 35 20, 50 25 C65 20, 75 25, 75 45 C75 58, 65 60, 50 60 C35 60, 25 58, 25 45 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
                                    <path d="M35 30 Q50 35 65 30" stroke="#cbd5e1" strokeWidth="1" fill="none" opacity="0.6" />
                                  </svg>
                                )
                              },
                              {
                                id: 'prod_2',
                                name: "Impressão de Modelo",
                                categoryBadge: "IMPRESSAO_MODELO",
                                labelText: "IMPRESSÃO 3D DETALHADA",
                                priceVal: 150.00,
                                desc: "Modelo físico 3D impresso em resina Premium clara de alta fidelidade.",
                                svgSvg: (
                                  <svg viewBox="0 0 100 100" className="w-11 h-11 mx-auto drop-shadow-md">
                                    <path d="M20 65 C20 30, 30 25, 50 25 C70 25, 80 30, 80 65 Q80 70 70 65 Q50 55 30 65 Q20 70 20 65 Z" fill="#fef3c7" stroke="#fde68a" strokeWidth="1.5" />
                                    <path d="M25 55 Q35 48 40 55 Q50 48 60 55 Q65 48 75 55" stroke="#fbcfe8" strokeWidth="2" fill="none" opacity="0.4" />
                                  </svg>
                                )
                              },
                              {
                                id: 'prod_12',
                                name: "Faceta Emax",
                                categoryBadge: "EMAX",
                                labelText: "PREMIUM DISSILICATO LÍTIO",
                                priceVal: 600.00,
                                desc: "Estrutura ultrafina injetada de Emax, alto brilho e excelente translucidez.",
                                svgSvg: (
                                  <svg viewBox="0 0 100 100" className="w-11 h-11 mx-auto drop-shadow-md">
                                    <path d="M30 30 C30 20, 70 20, 70 30 C70 50, 60 65, 50 65 C40 65, 30 50, 30 30 Z" fill="#f0fdfa" stroke="#ccfbf1" strokeWidth="1.5" />
                                    <path d="M25 35 C28 55, 38 75, 50 75 C62 75, 72 55, 75 35" stroke="#99f6e4" strokeWidth="1.5" fill="none" />
                                  </svg>
                                )
                              },
                              {
                                id: 'prod_4',
                                name: "Onlay Resina",
                                categoryBadge: "EMAX",
                                labelText: "MONOLÍTICO / RESINA",
                                priceVal: 450.00,
                                desc: "Preenchimento indireto ultra-resistente para dentes posteriores.",
                                svgSvg: (
                                  <svg viewBox="0 0 100 100" className="w-11 h-11 mx-auto drop-shadow-md">
                                    <rect x="25" y="25" width="25" height="35" rx="3" fill="#ddd6fe" stroke="#c4b5fd" strokeWidth="1" />
                                    <path d="M60 45 C60 30, 70 28, 75 35 Q85 45 75 55 C70 60, 60 55, 60 45 Z" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="1.5" />
                                  </svg>
                                )
                              }
                            ].filter(p => {
                              const matchesCategory = storeCategory === 'ALL' || p.categoryBadge === storeCategory;
                              const matchesQuery = p.name.toLowerCase().includes(storeSearch.toLowerCase());
                              return matchesCategory && matchesQuery;
                            }).map(p => {
                              const isInCart = storeCart.some(item => item.id === p.id);
                              return (
                                <div key={p.id} className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[7px] font-black text-slate-500 bg-slate-150/80 border border-slate-200 px-1 py-0.5 rounded uppercase tracking-wider">
                                        {p.labelText}
                                      </span>
                                      <span className="text-teal-600 font-extrabold text-[10.5px]">
                                        R$ {p.priceVal.toFixed(2).replace('.', ',')}
                                      </span>
                                    </div>
                                    <div className="h-10 flex items-center justify-center">
                                      {p.svgSvg}
                                    </div>
                                    <h4 className="text-[10px] font-extrabold text-slate-950 leading-tight">{p.name}</h4>
                                    <p className="text-[7.5px] text-slate-400 leading-tight mt-0.5 line-clamp-1">{p.desc}</p>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                    <button 
                                      onClick={() => {
                                        setStoreTab('CARRINHO');
                                        if (!isInCart) {
                                          setStoreCart([...storeCart, { id: p.id, name: p.name, price: p.priceVal, categoryBadge: p.categoryBadge }]);
                                        }
                                        setStoreNotification(`Pronto para enviar escaneamento do paciente para o caso de "${p.name}"!`);
                                        setTimeout(() => setStoreNotification(null), 3000);
                                      }}
                                      className="text-[8px] font-extrabold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 transition-all"
                                    >
                                      <Eye size={11} className="text-teal-500" /> Configurar STL
                                    </button>

                                    <button 
                                      onClick={() => {
                                        if (isInCart) {
                                          setStoreCart(storeCart.filter(item => item.id !== p.id));
                                          setStoreNotification(`Removido: ${p.name}`);
                                        } else {
                                          setStoreCart([...storeCart, { id: p.id, name: p.name, price: p.priceVal, categoryBadge: p.categoryBadge }]);
                                          setStoreNotification(`Adicionado ao Carrinho: ${p.name}`);
                                        }
                                        setTimeout(() => setStoreNotification(null), 3000);
                                      }}
                                      className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${isInCart ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                    >
                                      {isInCart ? 'Remover' : 'Adicionar'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Direct link guidance card */}
                        <div className="p-3 bg-teal-50 border border-teal-200/50 rounded-xl flex items-center mt-3 gap-2 text-slate-700">
                          <span className="text-sm">💬</span>
                          <p className="text-[9px] text-slate-650 leading-relaxed font-semibold">
                            <strong>Pronto para enviar arquivos e pagar?</strong> Selecione acima e clique em <strong>"Configurar STL"</strong> ou clique diretamente no carrinho na aba superior para ver o fluxo de checkout e faturamento seguro!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ======================= CASE B: SHOPPING CART & CASE DETAILS (Matching the PDF exactly) ======================= */}
                    {storeTab === 'CARRINHO' && (
                      <div className="space-y-4 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                        
                        {storeCart.length === 0 ? (
                          <div className="py-12 bg-white rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center p-6 space-y-3">
                            <span className="text-3xl">🛒</span>
                            <h4 className="text-xs font-black text-slate-800 uppercase">Seu carrinho está vazio</h4>
                            <p className="text-[9.5px] text-slate-500 leading-normal max-w-xs mx-auto">
                              Para simular as etapas de faturamento automático via Asaas, upload de STL e preenchimento de dentes, adicione um serviço do catálogo.
                            </p>
                            <button 
                              onClick={() => setStoreTab('CATALOGO')}
                              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-[9.5px] rounded-xl transition-all uppercase tracking-wider"
                            >
                              Ver Catálogo de Próteses
                            </button>
                          </div>
                        ) : (
                          <div className="grid lg:grid-cols-12 gap-4 items-start text-left">
                            
                            {/* Left Area - Items list & payment methods (2/3 width) */}
                            <div className="lg:col-span-7 space-y-4">
                              
                              {/* Request items section */}
                              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span>Itens do Pedido ({storeCart.length})</span>
                                  <span className="text-[9px] text-slate-400 font-mono">ID: #OS-SMPX</span>
                                </h4>

                                <div className="space-y-2">
                                  {storeCart.map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/10 flex items-center justify-center text-teal-600 text-sm font-bold">
                                          🦷
                                        </div>
                                        <div className="space-y-0.5">
                                          <p className="text-[10px] font-black text-slate-900 leading-none">{item.name}</p>
                                          <p className="text-[8px] text-slate-400 font-extrabold uppercase">Zircônia Estética</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10.5px] font-black text-slate-800">
                                          R$ {item.price.toFixed(2).replace('.', ',')}
                                        </span>
                                        <button 
                                          onClick={() => {
                                            setStoreCart(storeCart.filter(c => c.id !== item.id));
                                            setStoreNotification(`Removido: ${item.name}`);
                                            setTimeout(() => setStoreNotification(null), 2500);
                                          }}
                                          title="Excluir item"
                                          className="text-red-500 hover:text-red-650 p-1 rounded hover:bg-slate-150 transition-colors"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Payment Form Panel */}
                              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-2">
                                  <CreditCard size={13} className="text-slate-400" /> Forma de Pagamento
                                </h4>

                                {/* Card vs PIX Selector tabs */}
                                <div className="grid grid-cols-2 gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => setStorePaymentMethod('CARTAO')}
                                    className={`py-1.5 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all ${storePaymentMethod === 'CARTAO' ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                  >
                                    <CreditCard size={11} /> Cartão
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setStorePaymentMethod('PIX')}
                                    className={`py-1.5 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all ${storePaymentMethod === 'PIX' ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                  >
                                    ⚡ PIX
                                  </button>
                                </div>

                                {storePaymentMethod === 'CARTAO' ? (
                                  <div className="space-y-2.5 pt-1 animate-in fade-in duration-300">
                                    <div>
                                      <label className="block text-[7.5px] font-black text-slate-400 uppercase mb-0.5">CPF do Titular</label>
                                      <input 
                                        type="text" 
                                        defaultValue="000.000.000-00" 
                                        className="w-full bg-slate-50 border border-slate-200 text-[10px] px-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono tracking-wide text-slate-705" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[7.5px] font-black text-slate-400 uppercase mb-0.5">Número do Cartão</label>
                                      <input 
                                        type="text" 
                                        defaultValue="4556 1204 8839 1238" 
                                        className="w-full bg-slate-50 border border-slate-200 text-[10px] px-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono tracking-wide text-slate-705" 
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[7.5px] font-black text-slate-400 uppercase mb-0.5">Validade</label>
                                        <input 
                                          type="text" 
                                          defaultValue="11/29" 
                                          className="w-full bg-slate-50 border border-slate-200 text-[10px] px-2.5 py-1.5 rounded-xl focus:outline-none text-center font-mono text-slate-705" 
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[7.5px] font-black text-slate-400 uppercase mb-0.5">CVV</label>
                                        <input 
                                          type="text" 
                                          defaultValue="185" 
                                          className="w-full bg-slate-50 border border-slate-200 text-[10px] px-2.5 py-1.5 rounded-xl focus:outline-none text-center font-mono text-slate-705" 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 border border-dashed border-slate-200/90 rounded-2xl p-3 text-center space-y-1.5 animate-in fade-in duration-300">
                                    <span className="text-base">⚡</span>
                                    <p className="text-[9px] font-black text-[#0f172a] uppercase leading-none">Pagamento via PIX Integrado</p>
                                    <p className="text-[8px] text-slate-500 leading-normal max-w-[220px] mx-auto">
                                      Desconto de <strong>5% adicionais</strong> concedido! Um QR Code de pagamento imediato será gerado após clicar em confirmar.
                                    </p>
                                    <div className="bg-white p-1 rounded-lg inline-block border border-slate-200 shadow-inner">
                                      <svg viewBox="0 0 100 100" className="w-16 h-16 mx-auto opacity-75">
                                        <rect x="10" y="10" width="80" height="80" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="3,3" />
                                        <rect x="25" y="25" width="20" height="20" fill="#0f172a" />
                                        <rect x="55" y="25" width="20" height="20" fill="#0f172a" />
                                        <rect x="25" y="55" width="20" height="20" fill="#0f172a" />
                                        <circle cx="50" cy="50" r="4" fill="#0f172a" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Right Area - Delivery Details Sidebar ("Detalhes do Envio") */}
                            <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                              <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <span>Detalhes do Envio</span>
                                <span className="text-[7.5px] bg-teal-555 text-teal-600 border border-teal-200 font-extrabold px-1.5 py-0.5 rounded">Clínico</span>
                              </h4>

                              {/* Paciente */}
                              <div>
                                <label className="block text-[7.5px] font-black text-slate-405 uppercase mb-1">Paciente</label>
                                <input 
                                  type="text" 
                                  value={patientName} 
                                  onChange={(e) => setPatientName(e.target.value.toUpperCase())}
                                  placeholder="Nome completo do paciente"
                                  className="w-full bg-slate-50 border border-slate-200 text-[10px] px-3 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold text-slate-800" 
                                />
                              </div>

                              {/* Data Desejada */}
                              <div>
                                <label className="block text-[7.5px] font-black text-slate-405 uppercase mb-1">Data de Entrega Desejada</label>
                                <div className="relative">
                                  <input 
                                    type="text" 
                                    defaultValue="22/06/2026" 
                                    className="w-full bg-slate-50 border border-slate-200 text-[10px] px-3 py-1.5 rounded-xl focus:outline-none font-semibold text-slate-755" 
                                  />
                                  <Calendar className="absolute right-3 top-2 text-slate-400 pointer-events-none" size={12} />
                                </div>
                              </div>

                              {/* Drag-and-drop file upload simulator */}
                              <div>
                                <label className="block text-[7.5px] font-black text-slate-405 uppercase mb-1">Arquivos (STL / Imagens) *</label>
                                <div 
                                  onClick={() => {
                                    setDigitalFileAttached(!digitalFileAttached);
                                    setStoreNotification(digitalFileAttached ? "Arquivo STL desanexado." : "Arquivo 'escaneamento_molar_11.stl' foi anexado com sucesso.");
                                    setTimeout(() => setStoreNotification(null), 2500);
                                  }}
                                  className={`border-2 border-dashed rounded-xl p-2.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[85px] ${digitalFileAttached ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500'}`}
                                >
                                  {digitalFileAttached ? (
                                    <div className="space-y-0.5">
                                      <span className="text-emerald-500 text-base font-bold">✓ Prontidão STL</span>
                                      <p className="text-[9px] font-black text-slate-800 truncate max-w-[130px] leading-tight">escaneamento_molar_11.stl</p>
                                      <p className="text-[7px] text-slate-455 leading-none">42,4 MB (Anexado)</p>
                                    </div>
                                  ) : (
                                    <>
                                      <Upload className="text-teal-600 mb-0.5" size={14} />
                                      <p className="text-[9px] font-black text-slate-800">Clique para enviar</p>
                                      <p className="text-[7.5px] text-slate-400">Solte ou clique para anexar o STL</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Cupom de Desconto */}
                              <div className="border-t border-slate-100 pt-2 space-y-1">
                                <label className="block text-[7.5px] font-black text-slate-405 uppercase mb-0.5">Cupom de Desconto (Simulador)</label>
                                <div className="flex gap-1.5">
                                  <input 
                                    type="text" 
                                    value={couponCode} 
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="INSIRA: LABPROX10"
                                    className="flex-1 bg-slate-50 border border-slate-205 text-[9.5px] px-2.5 py-1.5 rounded-xl uppercase font-mono tracking-widest text-[#0F172A] font-bold placeholder-slate-455" 
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (couponCode === 'LABPROX10') {
                                        setCouponApplied(true);
                                        setStoreNotification("Cupom LABPROX10 ativado com sucesso! 10% OFF!");
                                      } else {
                                        setStoreNotification("Copie e tente o código: LABPROX10");
                                      }
                                      setTimeout(() => setStoreNotification(null), 3000);
                                    }}
                                    className="px-3 bg-slate-200 hover:bg-slate-250 text-slate-800 text-[8.5px] font-black uppercase rounded-xl transition-all"
                                  >
                                    Validar
                                  </button>
                                </div>
                                {couponApplied && (
                                  <p className="text-[8px] text-emerald-600 font-extrabold uppercase mt-0.5 leading-none">
                                    ✓ CUPOM ATIVO: 10% DE DESCONTO
                                  </p>
                                )}
                              </div>

                              {/* Calculation details */}
                              <div className="border-t border-slate-100 pt-2.5 text-[9.5px] font-bold text-slate-505 space-y-1">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span className="text-slate-850">
                                    R$ {storeCart.reduce((acc, c) => acc + c.price, 0).toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                                
                                {couponApplied && (
                                  <div className="flex justify-between text-emerald-600 font-black">
                                    <span>Desconto Cupom (10%):</span>
                                    <span>
                                      - R$ {(storeCart.reduce((acc, c) => acc + c.price, 0) * 0.1).toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                )}

                                {storePaymentMethod === 'PIX' && (
                                  <div className="flex justify-between text-indigo-650 font-black">
                                    <span>Desconto PIX Especial (5%):</span>
                                    <span>
                                      - R$ {(storeCart.reduce((acc, c) => acc + (couponApplied ? c.price * 0.9 : c.price), 0) * 0.05).toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center text-[11px] font-black border-t border-slate-100 pt-1.5 text-[#0f172a]">
                                  <span>Total Final:</span>
                                  <span className="text-teal-600 text-xs text-right">
                                    R$ {(() => {
                                      let val = storeCart.reduce((acc, c) => acc + c.price, 0);
                                      if (couponApplied) val = val * 0.9;
                                      if (storePaymentMethod === 'PIX') val = val * 0.95;
                                      return val.toFixed(2).replace('.', ',');
                                    })()}
                                  </span>
                                </div>
                              </div>

                              {/* Confirm and Pay Button */}
                              <button 
                                type="button"
                                onClick={() => {
                                  if (!patientName) {
                                    setStoreNotification("Atenção: Por favor, informe o paciente");
                                    setTimeout(() => setStoreNotification(null), 3500);
                                    return;
                                  }
                                  if (!digitalFileAttached) {
                                    setStoreNotification("Atenção: Por favor, faça a simulação de arquivo STL");
                                    setTimeout(() => setStoreNotification(null), 3500);
                                    return;
                                  }
                                  setSimulatedCheckoutSuccess(true);
                                }}
                                className="w-full py-2.5 bg-[#22c55e] hover:bg-green-600 active:scale-95 text-white font-black font-display uppercase text-[9px] tracking-wider rounded-xl transition-all shadow-md text-center inline-block cursor-pointer"
                              >
                                Confirmar e Pagar
                              </button>

                            </div>

                          </div>
                        )}

                        {/* Interactive tips footer */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 mt-2 text-slate-500 font-bold text-[8px]">
                          💡 Mude a forma de pagamento para <strong>PIX</strong> para acumular desconto, ou use o cupom <strong>LABPROX10</strong> para testar.
                        </div>

                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Core Advantages of the Online Store */}
          <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Check className="text-teal-400" />,
                title: "Sem Erros de Transcrição",
                desc: "O pedido entra diretamente estruturado no sistema do laboratório, eliminando anotações físicas de caixas ilegíveis ou dados imprecisos."
              },
              {
                icon: <Sparkles className="text-teal-400" />,
                title: "Upload de Arquivos Digitais",
                desc: "Receba arquivos 3D de alta precisão (STL, OBJ, PLY) direto na ficha do caso. Perfeito para laboratórios digitais e fluxos CAD/CAM."
              },
              {
                icon: <Clock className="text-teal-400" />,
                title: "Tabela Sempre Atualizada",
                desc: "Suas clínicas parceiras visualizam seus valores, opções e prazos atualizados em tempo real, evitando mal-entendidos mensais."
              },
              {
                icon: <DollarSign className="text-teal-400" />,
                title: "Faturamento Automático",
                desc: "Divida taxas e envie boletos direto pela integração Asaas. O cliente paga diretamente e o caixa concilia de forma 100% autônoma."
              }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl space-y-3.5 text-left shadow-inner"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  {item.icon}
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">{item.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>
      )}

      {/* 3. CORE FEATURES GRID SECTION */}
      {landingPageTab === 'LABORATORIO' && (
        <>
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
              Por que laboratórios líderes escolhem o LabProX?
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
        </>
      )}

      {/* 7. PREMIUM PLAN TABLE (PREÇOS INTEGRADO COM LINKS) */}
      {landingPageTab === 'PRECOS' && (
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
      )}

      {/* 8. MODERN TESTIMONIAL SLIDER */}
      {landingPageTab === 'LABORATORIO' && (
        <>
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
        </>
      )}

      {/* ==================== TAB: GESTÃO CLÍNICA ODONTOLÓGICA ==================== */}
      {landingPageTab === 'GESTAO_CLINICA' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="bg-slate-50"
        >
          <section className="py-20 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-4 text-center lg:text-left space-y-6 relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-black text-teal-700 uppercase tracking-wider">
                    <Sparkles size={11} className="text-teal-600 animate-pulse" /> LabProX Clin — Gestão Inteligente
                  </span>
                  
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-[#0F172A] leading-tight text-left">
                    A gestão da sua clínica <span className="bg-gradient-to-r from-teal-600 to-blue-500 bg-clip-text text-transparent">conectada direto</span> à bancada do laboratório
                  </h1>
                  
                  <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed text-left">
                    Vá além da agenda de papel e das planilhas de faturamento que não conversam com ninguém. Controle prontuários, faturamento automático com taxas Asaas transparentes, procedimentos personalizados e sua agenda clínica sincronizada em tempo real.
                  </p>

                  {/* Quick Tips Alert */}
                  <div className="bg-teal-50/50 border border-teal-150 p-3.5 rounded-2xl text-left hidden lg:block space-y-2">
                    <p className="text-[10px] font-black uppercase text-teal-850 tracking-wider flex items-center gap-1 leading-none">
                      💡 Tutorial do Simulador
                    </p>
                    <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                      Clique nos itens <strong>Agenda</strong>, <strong>Financeiro</strong>, <strong>Pacientes</strong> ou <strong>Meus Serviços</strong> no menu lateral ou no topo do mockup à direita para simular as principais abas do software!
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                    <Link
                      to="/register-lab?type=DENTIST"
                      className="w-full sm:w-auto px-6 py-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-input shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]"
                    >
                      Criar Conta Conta <ChevronRight size={14} />
                    </Link>
                    <button 
                      onClick={() => setLandingPageTab('PRECOS')}
                      className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-input shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      Ver Preços Especiais <DollarSign size={14} />
                    </button>
                  </div>
                </div>

                {/* Right Interactive Mockup Container */}
                <div className="lg:col-span-8">
                  {/* Outer premium glass showcase */}
                  <div className="bg-white/80 backdrop-blur-md p-3 sm:p-5 rounded-3xl border border-slate-200/80 shadow-premium relative">
                    
                    {/* Simulated browser dashboard */}
                    <div className="bg-slate-50 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 text-slate-800 flex flex-col h-[550px] relative">
                      
                      {/* Browser Top Mac-Buttons Status Bar */}
                      <div className="bg-slate-950 border-b border-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                          <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                          <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-[10px] text-teal-450 font-black tracking-wider uppercase">LabPROX</span>
                            <span className="w-1 h-3 bg-slate-800 rounded" />
                            <span className="text-[9px] text-slate-400 font-mono font-bold tracking-wider">TESTE2 - CIRURGIÃO-DENTISTA</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-teal-500/10 border border-teal-500/20 text-[9px] text-teal-400 font-black rounded-full uppercase tracking-wider hidden sm:inline-block">
                          MÓDULO CLÍNICA ATIVO
                        </span>
                      </div>

                      {/* Header bar within dentist system layout (replicating screenshots) */}
                      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-10">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-900 font-bold text-xs tracking-tight uppercase flex items-center gap-1">
                            🦷 LabProX <span className="text-[9px] font-medium text-slate-400">v1.5</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                          <span className="text-emerald-500">● Online</span>
                          <span className="text-slate-300">|</span>
                          <span className="bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-850 uppercase text-[9px] font-black">TESTE2</span>
                        </div>
                      </div>

                      {/* Responsive horizontal tabs selection bar (visible on mobile only) */}
                      <div className="sm:hidden flex bg-[#0f172a] border-b border-slate-900 p-1 divide-x divide-slate-800 shrink-0">
                        <button 
                          onClick={() => setClinicSubTab('PACIENTES')} 
                          className={`flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wider transition-all ${clinicSubTab === 'PACIENTES' ? 'text-teal-400 font-extrabold' : 'text-slate-400'}`}
                        >
                          👥 Pacientes
                        </button>
                        <button 
                          onClick={() => setClinicSubTab('PROCEDIMENTOS')} 
                          className={`flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wider transition-all ${clinicSubTab === 'PROCEDIMENTOS' ? 'text-teal-400 font-extrabold' : 'text-slate-400'}`}
                        >
                          🩺 Serviços
                        </button>
                        <button 
                          onClick={() => setClinicSubTab('FINANCEIRO')} 
                          className={`flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wider transition-all ${clinicSubTab === 'FINANCEIRO' ? 'text-teal-400 font-extrabold' : 'text-slate-400'}`}
                        >
                          🧾 Finanças
                        </button>
                        <button 
                          onClick={() => setClinicSubTab('AGENDA')} 
                          className={`flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wider transition-all ${clinicSubTab === 'AGENDA' ? 'text-teal-400 font-extrabold' : 'text-slate-400'}`}
                        >
                          📅 Agenda
                        </button>
                      </div>

                      {/* Workspace Inside Portal layout */}
                      <div className="flex flex-1 overflow-hidden">
                        
                        {/* Simulation Sidebar (Replicates Screenshot layout exactly) */}
                        <div className="w-40 bg-slate-950 border-r border-slate-900/60 flex flex-col justify-between hidden sm:flex shrink-0">
                          <div className="space-y-4">
                            {/* Top info tile */}
                            <div className="p-3 bg-[#1e293b]/20 border-b border-slate-900/80">
                              <p className="text-[10px] font-black tracking-wider text-slate-100 uppercase">TESTE2</p>
                              <p className="text-[7.5px] text-teal-400 font-extrabold uppercase mt-0.5">MINHA CLÍNICA</p>
                            </div>

                            <div className="px-2 space-y-3">
                              {/* Laboratório Section */}
                              <div className="space-y-0.5">
                                <span className="text-[7.5px] text-slate-550 font-black uppercase tracking-wider block px-2 mb-1">LABORATÓRIO ATIVO</span>
                                <div className="space-y-0.5">
                                  <button className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-500 hover:text-slate-300 text-[8.5px] font-bold text-left cursor-not-allowed">
                                    <ShoppingBag size={10} className="text-slate-600" />
                                    <span>Loja de Prótese</span>
                                  </button>
                                  <button className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-500 hover:text-slate-300 text-[8.5px] font-bold text-left cursor-not-allowed">
                                    <FileText size={10} className="text-slate-600" />
                                    <span>Meus Pedidos</span>
                                  </button>
                                  <button className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-500 hover:text-slate-300 text-[8.5px] font-bold text-left cursor-not-allowed">
                                    <ShoppingBag size={10} className="text-slate-600" />
                                    <span>Carrinho</span>
                                  </button>
                                </div>
                              </div>

                              {/* Minha Clínica Section (Interactive items with matching icons/text) */}
                              <div className="space-y-0.5">
                                <span className="text-[7.5px] text-slate-550 font-black uppercase tracking-wider block px-2 mb-1">MINHA CLÍNICA</span>
                                <div className="space-y-0.5 animate-in fade-in">
                                  
                                  {/* Agenda */}
                                  <button 
                                    onClick={() => {
                                      setClinicSubTab('AGENDA');
                                      setClinicNotification('Abriu Agenda da Clínica');
                                      setTimeout(() => setClinicNotification(null), 2500);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-left rounded transition-colors ${clinicSubTab === 'AGENDA' ? 'bg-[#4f46e5]/15 text-teal-400 font-extrabold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    <Calendar size={10} className={clinicSubTab === 'AGENDA' ? 'text-teal-400' : 'text-slate-500'} />
                                    <span>Agenda</span>
                                  </button>

                                  {/* Financeiro */}
                                  <button 
                                    onClick={() => {
                                      setClinicSubTab('FINANCEIRO');
                                      setClinicNotification('Abriu Financeiro');
                                      setTimeout(() => setClinicNotification(null), 2500);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-left rounded transition-colors ${clinicSubTab === 'FINANCEIRO' ? 'bg-[#4f46e5]/15 text-teal-400 font-extrabold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    <DollarSign size={10} className={clinicSubTab === 'FINANCEIRO' ? 'text-teal-400' : 'text-slate-500'} />
                                    <span>Financeiro</span>
                                  </button>

                                  <button className="w-full flex items-center gap-2 px-2 py-1 text-slate-600 hover:text-slate-500 text-[8.5px] font-bold text-left cursor-not-allowed">
                                    <Grid size={10} className="text-slate-700" />
                                    <span>Salas</span>
                                  </button>

                                  <button className="w-full flex items-center gap-2 px-2 py-1 text-slate-600 hover:text-slate-500 text-[8.5px] font-bold text-left cursor-not-allowed">
                                    <Users size={10} className="text-slate-700" />
                                    <span>Corpo Clínico</span>
                                  </button>

                                  {/* Pacientes */}
                                  <button 
                                    onClick={() => {
                                      setClinicSubTab('PACIENTES');
                                      setClinicNotification('Abriu Gestão de Pacientes');
                                      setTimeout(() => setClinicNotification(null), 2500);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-left rounded transition-colors ${clinicSubTab === 'PACIENTES' ? 'bg-[#4f46e5]/15 text-teal-400 font-extrabold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    <Users size={10} className={clinicSubTab === 'PACIENTES' ? 'text-teal-400' : 'text-slate-500'} />
                                    <span>Pacientes</span>
                                  </button>

                                  {/* Meus Serviços */}
                                  <button 
                                    onClick={() => {
                                      setClinicSubTab('PROCEDIMENTOS');
                                      setClinicNotification('Abriu Procedimentos/Serviços');
                                      setTimeout(() => setClinicNotification(null), 2500);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-left rounded transition-colors ${clinicSubTab === 'PROCEDIMENTOS' ? 'bg-[#4f46e5]/15 text-teal-400 font-extrabold' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    <Grid size={10} className={clinicSubTab === 'PROCEDIMENTOS' ? 'text-teal-400' : 'text-slate-500'} />
                                    <span>Meus Serviços</span>
                                  </button>

                                  <button className="w-full flex items-center gap-2 px-2 py-1 text-slate-600 hover:text-slate-500 text-[8.5px] font-bold text-left cursor-not-allowed">
                                    <Grid size={10} className="text-slate-700" />
                                    <span>Parcerias Lab</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 border-t border-slate-900 text-left text-[9px] font-medium space-y-1.5 shrink-0">
                            <span className="block text-slate-500 hover:text-white transition-colors cursor-pointer">👤 Perfil</span>
                            <span 
                              onClick={() => {
                                setClinicSubTab('PACIENTES');
                                setClinicNotification('Você encerrou a sessão de demonstração.');
                                setTimeout(() => setClinicNotification(null), 3000);
                              }}
                              className="block text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              ← Sair
                            </span>
                          </div>
                        </div>

                        {/* Simulation Dashboard Body Area */}
                        <div className="flex-1 bg-slate-100 p-4 font-sans text-left flex flex-col justify-between overflow-y-auto max-h-[500px] relative">
                          
                          {/* ===================== VIEW: PACIENTES ===================== */}
                          {clinicSubTab === 'PACIENTES' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              {/* Header block */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                                <div className="text-left">
                                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                                    <span className="text-teal-600 text-xs">👥</span> Gestão de Pacientes
                                  </h3>
                                  <p className="text-[10px] text-slate-500 font-semibold leading-none mt-1">Controle de cadastros e prontuários clínicos.</p>
                                </div>
                                <button
                                  onClick={() => setShowAddPatForm(true)}
                                  className="px-3 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[9px] font-black rounded-lg uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
                                >
                                  <Plus size={11} /> NOVO PACIENTE
                                </button>
                              </div>

                              {/* Search Area */}
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                                <input
                                  type="text"
                                  value={clinicPatientSearch}
                                  onChange={(e) => setClinicPatientSearch(e.target.value)}
                                  placeholder="Buscar por nome, telefone ou documento..."
                                  className="w-full bg-white border border-slate-200 text-[10px] pl-8 pr-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4f46e5] font-medium placeholder-slate-400 shadow-sm"
                                />
                              </div>

                              {/* Patient Addition Form */}
                              {showAddPatForm && (
                                <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3 shadow-md animate-in slide-in-from-top-2 duration-300">
                                  <div className="flex items-center justify-between border-b pb-1.5">
                                    <span className="text-[9.5px] font-black uppercase text-slate-700">Ficha de Novo Paciente</span>
                                    <button onClick={() => setShowAddPatForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-450 uppercase mb-0.5">Nome Completo</label>
                                      <input 
                                        type="text" 
                                        value={newPatName} 
                                        onChange={(e) => setNewPatName(e.target.value)} 
                                        placeholder="Ex: Maria Souza" 
                                        className="w-full bg-[#f8fafc] border text-[10px] px-2.5 py-1 rounded-lg"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-455 uppercase mb-0.5">Telefone</label>
                                      <input 
                                        type="text" 
                                        value={newPatPhone} 
                                        onChange={(e) => setNewPatPhone(e.target.value)} 
                                        placeholder="Ex: 27 99999-9999" 
                                        className="w-full bg-[#f8fafc] border text-[10px] px-2.5 py-1 rounded-lg"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-455 uppercase mb-0.5">E-mail</label>
                                      <input 
                                        type="email" 
                                        value={newPatEmail} 
                                        onChange={(e) => setNewPatEmail(e.target.value)} 
                                        placeholder="Ex: maria@gmail.com" 
                                        className="w-full bg-[#f8fafc] border text-[10px] px-2.5 py-1 rounded-lg"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 text-[9.5px]">
                                    <button onClick={() => setShowAddPatForm(false)} className="px-2.5 py-1 text-slate-500 font-semibold text-xs">Cancelar</button>
                                    <button 
                                      onClick={() => {
                                        if (!newPatName) return alert('Por favor, informe no mínimo o nome para simular.');
                                        const nextId = mockPatients.length + 1;
                                        setMockPatients([...mockPatients, {
                                          id: nextId,
                                          name: newPatName.toUpperCase(),
                                          date: new Date().toLocaleDateString('pt-BR'),
                                          phone: newPatPhone || '27 99999-9999',
                                          email: newPatEmail || 'novo@teste.com'
                                        }]);
                                        setNewPatName(''); setNewPatPhone(''); setNewPatEmail('');
                                        setShowAddPatForm(false);
                                        setClinicNotification('Paciente cadastrado com sucesso!');
                                        setTimeout(() => setClinicNotification(null), 3000);
                                      }}
                                      className="px-3.5 py-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg font-black uppercase tracking-wider"
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Patients Cards List Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {mockPatients.filter(p => p.name.toLowerCase().includes(clinicPatientSearch.toLowerCase())).map(pat => (
                                  <div key={pat.id} className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 relative group text-left">
                                    <button 
                                      onClick={() => {
                                        setMockPatients(mockPatients.filter(p => p.id !== pat.id));
                                        setClinicNotification(`Cadastro de ${pat.name} deletado.`);
                                        setTimeout(() => setClinicNotification(null), 2500);
                                      }}
                                      className="absolute top-3 right-3 text-red-500 hover:text-red-750 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-50 rounded"
                                    >
                                      <Trash2 size={12} />
                                    </button>

                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-200/40 text-[#4f46e5] font-black text-xs flex items-center justify-center">
                                        M
                                      </div>
                                      <div className="space-y-0.5 text-left">
                                        <h4 className="text-[11.5px] font-black text-slate-900 leading-none">{pat.name}</h4>
                                        <span className="inline-block text-[7px] text-slate-400 font-extrabold uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                                          CADASTRADO EM {pat.date}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-1 pt-1.5 border-t border-slate-100 text-left text-[9.5px] text-slate-500 font-bold leading-tight">
                                      <p className="flex items-center gap-1.5">
                                        <span className="text-teal-600">📞</span> {pat.phone}
                                      </p>
                                      <p className="flex items-center gap-1.5">
                                        <span className="text-teal-600">✉</span> {pat.email}
                                      </p>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                      <button 
                                        onClick={() => {
                                          setClinicNotification(`Ficha clínica e histórico de ${pat.name} carregados.`);
                                          setTimeout(() => setClinicNotification(null), 3000);
                                        }}
                                        className="text-[9px] font-bold text-[#4f46e5] uppercase hover:underline"
                                      >
                                        Ver Prontuário &gt;
                                      </button>
                                      <span className="text-[7.5px] font-bold text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Ativo</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ===================== VIEW: PROCEDIMENTOS ===================== */}
                          {clinicSubTab === 'PROCEDIMENTOS' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              {/* Header block */}
                              <div className="border-b border-slate-205 pb-3">
                                <h3 className="text-sm font-black text-[#0F172A] tracking-tight flex items-center gap-1.5 font-display">
                                  <span className="text-teal-600">🩺</span> PROCEDIMENTOS DA CLÍNICA
                                </h3>
                                <p className="text-[10px] text-slate-500 font-semibold leading-none mt-1">Tabela de serviços e preços cobrados dos seus pacientes.</p>
                              </div>

                              {/* Split layout (Left list, Right form) */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                                {/* Left List Column */}
                                <div className="lg:col-span-7 space-y-3">
                                  {/* Search bar */}
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                                    <input
                                      type="text"
                                      value={clinicProcSearch}
                                      onChange={(e) => setClinicProcSearch(e.target.value)}
                                      placeholder="Buscar por procedimento ou categoria..."
                                      className="w-full bg-white border border-slate-200 text-[10px] pl-8 pr-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium placeholder-slate-400 shadow-sm"
                                    />
                                  </div>

                                  {/* Procedures Cards */}
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {mockProcedures.filter(p => p.name.toLowerCase().includes(clinicProcSearch.toLowerCase())).map(proc => (
                                      <div key={proc.id} className="bg-white rounded-xl p-3 border border-slate-200 flex items-center justify-between hover:shadow-sm transition-all text-left">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#4f46e5] text-sm">
                                            🦷
                                          </div>
                                          <div>
                                            <p className="text-[10.5px] font-black text-slate-900 leading-none">{proc.name}</p>
                                            <div className="flex items-center gap-1.5 mt-1 leading-none">
                                              <span className="text-[7.5px] font-extrabold uppercase text-[#4f46e5] bg-blue-50 border border-blue-100 px-1 rounded">{proc.category.toUpperCase()}</span>
                                              <span className="text-[8.5px] text-slate-400 font-bold">⏱ {proc.duration} min</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                          <div className="text-right">
                                            <p className="text-[6.5px] font-black text-slate-400 uppercase leading-none">PREÇO VENDA</p>
                                            <p className="text-[10.5px] font-black text-[#10b981] mt-0.5">R$ {proc.price.toFixed(2).replace('.', ',')}</p>
                                          </div>
                                          <button 
                                            onClick={() => {
                                              setMockProcedures(mockProcedures.filter(p => p.id !== proc.id));
                                              setClinicNotification(`Procedimento "${proc.name}" removido.`);
                                              setTimeout(() => setClinicNotification(null), 2500);
                                            }}
                                            className="text-slate-350 hover:text-red-500 p-1 rounded transition-colors"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Right Custom Form Panel */}
                                <div className="lg:col-span-5 bg-[#0F172A] text-white rounded-xl overflow-hidden border border-slate-800 shadow-md">
                                  <div className="bg-[#1E293B] px-3 py-2 border-b border-slate-800/80">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-100 flex items-center gap-1">
                                      ✚ Novo Procedimento Clínico
                                    </span>
                                  </div>

                                  <div className="p-3 space-y-2.5 text-left">
                                    {/* Informational banner */}
                                    <div className="p-2 bg-[#1d2d44]/60 border border-teal-500/10 rounded-lg flex items-start gap-1 text-[#e2e8f0]">
                                      <span className="text-[10px] text-teal-400 font-bold shrink-0 mt-0.5">ⓘ</span>
                                      <p className="text-[7.5px] text-teal-300 font-medium leading-normal">
                                        ESTE SERVIÇO É INTERNO DA CLÍNICA. NÃO ALTERA VALORES DE COMPRA NOS LABS PARCEIROS.
                                      </p>
                                    </div>

                                    <div className="space-y-1.5 text-[9px]">
                                      <div>
                                        <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Nome do Procedimento</label>
                                        <input 
                                          type="text" 
                                          value={newProcName}
                                          onChange={(e) => setNewProcName(e.target.value)}
                                          placeholder="Ex: Restauração Resisa" 
                                          className="w-full bg-[#1E293B] border border-slate-800 text-[10px] text-white px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500 font-medium"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Categoria</label>
                                        <input 
                                          type="text"
                                          value={newProcCategory}
                                          onChange={(e) => setNewProcCategory(e.target.value)}
                                          placeholder="Ex: Dentística" 
                                          className="w-full bg-[#1E293B] border border-slate-800 text-[10px] text-white px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500 font-medium"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-1.5">
                                        <div>
                                          <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Valor Venda (R$)</label>
                                          <input 
                                            type="number"
                                            value={newProcPrice}
                                            onChange={(e) => setNewProcPrice(e.target.value)}
                                            placeholder="R$ 150" 
                                            className="w-full bg-[#1E293B] border border-slate-800 text-[10px] text-white px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-500 font-medium"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Tempo Estimado</label>
                                          <select 
                                            value={newProcDuration}
                                            onChange={(e) => setNewProcDuration(e.target.value)}
                                            className="w-full bg-[#1E293B] border border-slate-800 text-[10px] text-white px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                          >
                                            <option value="30">30 min</option>
                                            <option value="60">60 min</option>
                                            <option value="90">90 min</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        if (!newProcName || !newProcPrice) return alert('Por favor, defina o Nome e Preço do procedimento.');
                                        const nextId = mockProcedures.length + 1;
                                        setMockProcedures([...mockProcedures, {
                                          id: nextId,
                                          name: newProcName,
                                          category: newProcCategory || 'Dentística',
                                          duration: parseInt(newProcDuration),
                                          price: parseFloat(newProcPrice)
                                        }]);
                                        setNewProcName(''); setNewProcCategory(''); setNewProcPrice('');
                                        setClinicNotification(`Procedimento salvo com sucesso!`);
                                        setTimeout(() => setClinicNotification(null), 3000);
                                      }}
                                      className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[9px] rounded-lg flex items-center justify-center gap-1 transition-all uppercase tracking-wider"
                                    >
                                      💾 SALVAR PROCEDIMENTO
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ===================== VIEW: FINANCEIRO ===================== */}
                          {clinicSubTab === 'FINANCEIRO' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              {/* Header block */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                                <div className="text-left">
                                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5 font-display">
                                    <span className="text-teal-600 text-xs">🧾</span> FINANCEIRO DA CLÍNICA
                                  </h3>
                                  <p className="text-[10px] text-slate-500 font-semibold leading-none mt-1">Controle total de entradas, saídas e rentabilidade.</p>
                                </div>
                                <div className="flex gap-1.5 text-[8px] font-black uppercase">
                                  <button 
                                    onClick={() => {
                                      const amt = parseFloat(prompt("Informe o valor da despesa (R$):", "150.00") || "0");
                                      if (amt > 0) {
                                        setClinicNotification(`Despesa de R$ ${amt.toFixed(2)} cadastrada com sucesso!`);
                                        setTimeout(() => setClinicNotification(null), 3500);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                                  >
                                    <span>+ Gasto</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const amt = parseFloat(prompt("Informe o valor da receita (R$):", "500.00") || "0");
                                      if (amt > 0) {
                                        setClinicNotification(`Receita de R$ ${amt.toFixed(2)} conciliada com sucesso!`);
                                        setTimeout(() => setClinicNotification(null), 3500);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1 shadow-md"
                                  >
                                    <span>+ Entrada</span>
                                  </button>
                                </div>
                              </div>

                              {/* 3 Summary Cards Grid */}
                              <div className="grid grid-cols-3 gap-2">
                                {/* Card Recebido */}
                                <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm relative text-left">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-[8.5px]">↗</span>
                                    <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded uppercase">RECEITA BRUTA</span>
                                  </div>
                                  <p className="text-[7.5px] text-slate-400 font-bold uppercase leading-none">TOTAL RECEBIDO</p>
                                  <p className="text-[11.5px] font-black text-slate-900 mt-1">R$ 5.480,00</p>
                                </div>

                                {/* Card Saidas */}
                                <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm relative text-left">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-[8.5px]">↘</span>
                                    <span className="text-[7px] font-bold text-red-650 bg-red-50 px-1 rounded uppercase font-black">DESPESAS GERAIS</span>
                                  </div>
                                  <p className="text-[7.5px] text-slate-400 font-bold uppercase leading-none">TOTAL SAÍDAS</p>
                                  <p className="text-[11.5px] font-black text-slate-900 mt-1">R$ 940,00</p>
                                </div>

                                {/* Card Saldo */}
                                <div className="bg-[#0f172a] text-white rounded-xl p-2.5 border border-slate-800 shadow-sm relative text-left">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="w-4 h-4 rounded-full bg-teal-500/10 text-teal-400 font-bold text-[8.5px] flex items-center justify-center border border-teal-500/20">$</span>
                                    <span className="text-[6.5px] font-black text-teal-400 bg-teal-950 px-1.5 rounded uppercase">SALDO (LUCRO REAL)</span>
                                  </div>
                                  <p className="text-[7.5px] text-slate-400 font-bold uppercase leading-none">RESULTADO DO PERÍODO</p>
                                  <p className="text-[11.5px] font-black text-emerald-400 mt-1">+ R$ 4.540,00</p>
                                </div>
                              </div>

                              {/* Subtabs strip */}
                              <div className="flex border-b border-slate-200 gap-3 text-[9.5px] font-black uppercase text-left leading-none">
                                <span className="pb-1 text-slate-800 border-b-2 border-[#4f46e5]">VISÃO GERAL</span>
                                <span className="pb-1 text-slate-400 cursor-pointer">EXTRATO DETALHADO</span>
                              </div>

                              {/* Dual Panels Layout */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                {/* SVG Column Bar Mapping (Left panel) */}
                                <div className="md:col-span-7 bg-white p-2.5 rounded-xl border border-slate-205 shadow-sm space-y-2">
                                  <h4 className="text-[8px] font-black text-slate-450 uppercase tracking-wider block text-left">FLUXO SEMANAL</h4>
                                  
                                  {/* Inline SVG Chart */}
                                  <div className="relative">
                                    <svg viewBox="0 0 320 120" className="w-full h-[100px]">
                                      <line x1="30" y1="20" x2="315" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                                      <line x1="30" y1="50" x2="315" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                                      <line x1="30" y1="80" x2="315" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                                      <line x1="30" y1="100" x2="315" y2="100" stroke="#e2e8f0" strokeWidth="1.5" />

                                      {/* Axis label Y */}
                                      <text x="3" y="24" className="text-[7px] font-bold text-slate-400 fill-current">R$ 3K</text>
                                      <text x="3" y="54" className="text-[7px] font-bold text-slate-400 fill-current">R$ 2K</text>
                                      <text x="3" y="84" className="text-[7px] font-bold text-slate-400 fill-current">R$ 1K</text>
                                      <text x="10" y="104" className="text-[7px] font-bold text-slate-400 fill-current">0</text>

                                      {/* SEG bar group */}
                                      <rect x="52" y="66" width="9" height="34" fill="#10b981" rx="1.5" />
                                      <rect x="63" y="96" width="9" height="4" fill="#ef4444" rx="1.5" />
                                      <text x="54" y="112" className="text-[6px] font-bold text-slate-400 fill-current">SEG</text>

                                      {/* TER bar group */}
                                      <rect x="102" y="40" width="9" height="60" fill="#10b981" rx="1.5" />
                                      <rect x="113" y="88" width="9" height="12" fill="#ef4444" rx="1.5" />
                                      <text x="104" y="112" className="text-[6px] font-bold text-slate-400 fill-current">TER</text>

                                      {/* QUA bar group */}
                                      <rect x="152" y="78" width="9" height="22" fill="#10b981" rx="1.5" />
                                      <rect x="163" y="93" width="9" height="7" fill="#ef4444" rx="1.5" />
                                      <text x="154" y="112" className="text-[6px] font-bold text-slate-400 fill-current">QUA</text>

                                      {/* QUI bar group */}
                                      <rect x="202" y="86" width="9" height="14" fill="#10b981" rx="1.5" />
                                      <rect x="213" y="97" width="9" height="3" fill="#ef4444" rx="1.5" />
                                      <text x="204" y="112" className="text-[6px] font-bold text-slate-400 fill-current">QUI</text>

                                      {/* SEX bar group */}
                                      <rect x="252" y="100" width="9" height="0" fill="#10b981" rx="1.5" />
                                      <rect x="263" y="92" width="9" height="8" fill="#ef4444" rx="1.5" />
                                      <text x="254" y="112" className="text-[6px] font-bold text-slate-400 fill-current">SEX</text>
                                    </svg>
                                  </div>
                                  
                                  <div className="flex items-center justify-center gap-3 text-[7px] font-extrabold uppercase text-slate-450 border-t border-slate-100 pt-1 leading-none">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" /> Entrada</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-sm" /> Despesa</span>
                                  </div>
                                </div>

                                {/* IA Tips column right panel */}
                                <div className="md:col-span-5 space-y-2">
                                  <h4 className="text-[8px] font-black text-slate-450 uppercase tracking-wider block text-left">DICAS DE GESTÃO IA</h4>
                                  
                                  <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl flex items-start gap-1.5 text-left leading-tight">
                                    <div className="w-5.5 h-5.5 rounded bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center shrink-0">
                                      📈
                                    </div>
                                    <div className="space-y-0.5">
                                      <h5 className="text-[9px] font-black text-blue-900 uppercase">Otimização de Próteses</h5>
                                      <p className="text-[7.5px] text-blue-700 font-semibold leading-normal">
                                        Seus custos com laboratórios representam 17% dos procedimentos. Reduzimos perdas automatizando fluxos.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl flex items-start gap-1.5 text-left leading-tight">
                                    <div className="w-5.5 h-5.5 rounded bg-amber-100 text-amber-600 text-[10px] flex items-center justify-center shrink-0">
                                      ⏰
                                    </div>
                                    <div className="space-y-0.5">
                                      <h5 className="text-[9px] font-black text-amber-900 uppercase font-display">Agenda Ocupada</h5>
                                      <p className="text-[7.5px] text-amber-700 font-semibold leading-normal">
                                        Você tem {mockAppointments.length} consultas hoje. Potencial de faturamento futuro: <strong>R$ 780,00</strong>.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ===================== VIEW: AGENDA ===================== */}
                          {clinicSubTab === 'AGENDA' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                              {/* Header block */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                                <div className="text-left">
                                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5 font-display">
                                    <span className="text-teal-600 text-xs">📅</span> Agenda da Clínica
                                  </h3>
                                  <p className="text-[10px] text-slate-550 font-semibold leading-none mt-1">Gestão de atendimentos, salas e equipe clínica.</p>
                                </div>
                                <button
                                  onClick={() => setShowAddApptForm(true)}
                                  className="px-3 py-1.5 bg-[#4f46e5]/90 hover:bg-[#4f46e5] text-white text-[9px] font-black rounded-lg uppercase tracking-wider shadow-md transition-all flex items-center gap-1"
                                >
                                  <Plus size={11} /> NOVO AGENDAMENTO
                                </button>
                              </div>

                              {/* Dynamic Appointment Creator */}
                              {showAddApptForm && (
                                <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3 shadow-md text-left animate-in slide-in-from-top-2 duration-300">
                                  <div className="flex items-center justify-between border-b pb-1.5">
                                    <span className="text-[9.5px] font-black uppercase text-slate-700">Novo Agendamento</span>
                                    <button onClick={() => setShowAddApptForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Paciente</label>
                                      <select 
                                        value={newApptPatient} 
                                        onChange={(e) => setNewApptPatient(e.target.value)} 
                                        className="w-full bg-[#f8fafc] border text-[10px] px-2 py-1 rounded-lg font-bold"
                                      >
                                        {mockPatients.map(p => (
                                          <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Procedimento</label>
                                      <select 
                                        value={newApptProc} 
                                        onChange={(e) => setNewApptProc(e.target.value)} 
                                        className="w-full bg-[#f8fafc] border text-[10px] px-2 py-1 rounded-lg font-bold"
                                      >
                                        {mockProcedures.map(p => (
                                          <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Horário</label>
                                      <input 
                                        type="time" 
                                        value={newApptTime} 
                                        onChange={(e) => setNewApptTime(e.target.value)} 
                                        className="w-full bg-[#f8fafc] border text-[10px] px-2 py-1 rounded-lg font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Responsável</label>
                                      <select 
                                        value={newApptDoctor} 
                                        onChange={(e) => setNewApptDoctor(e.target.value)} 
                                        className="w-full bg-[#f8fafc] border text-[10px] px-2 py-1 rounded-lg font-bold"
                                      >
                                        <option value="DR. LUCIO">DR. LUCIO</option>
                                        <option value="DR. LEO">DR. LEO</option>
                                        <option value="DR. HENRIQUE">DR. HENRIQUE</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 text-[9.5px]">
                                    <button onClick={() => setShowAddApptForm(false)} className="px-2.5 py-1 text-slate-500 font-semibold">Cancelar</button>
                                    <button 
                                      onClick={() => {
                                        const nextId = mockAppointments.length + 1;
                                        setMockAppointments([...mockAppointments, {
                                          id: nextId,
                                          patient: newApptPatient,
                                          procedure: newApptProc,
                                          time: newApptTime,
                                          sala: 'SALA 1',
                                          doctor: newApptDoctor
                                        }]);
                                        setShowAddApptForm(false);
                                        setClinicNotification('Consulta agendada no LabProX Clin!');
                                        setTimeout(() => setClinicNotification(null), 3000);
                                      }}
                                      className="px-3.5 py-1 bg-[#4f46e5] text-white rounded-lg font-black uppercase tracking-wider"
                                    >
                                      SALVAR AGENDAMENTO
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Calendar and timelines dual-layout */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-left items-start">
                                {/* Left Picker Side (4/12) */}
                                <div className="md:col-span-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3 shrink-0">
                                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-800 border-b pb-2">
                                    <span>‹</span>
                                    <span className="tracking-wider text-slate-900">Junho de 2026</span>
                                    <span>›</span>
                                  </div>

                                  {/* Week Days Headers */}
                                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[8.5px] text-slate-400 border-b pb-1.5 leading-none">
                                    <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
                                  </div>

                                  {/* Grid June selected 16 */}
                                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-600">
                                    <span></span> 
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
                                    <span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span>
                                    <span>14</span><span>15</span>
                                    <span className="w-5.5 h-5.5 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-black mx-auto shadow-md">16</span>
                                    <span>17</span><span>18</span><span>19</span><span>20</span>
                                    <span>21</span><span>22</span><span>23</span><span>24</span><span>25</span><span>26</span><span>27</span>
                                    <span>28</span><span>29</span><span>30</span>
                                  </div>

                                  {/* Carga Horária status box */}
                                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-2.5 rounded-xl text-slate-700 text-left">
                                    <p className="text-[7.5px] font-bold text-emerald-700 uppercase tracking-wider leading-none">CARGA HORÁRIA</p>
                                    <div className="flex items-center justify-between text-[9px] font-black text-slate-800 mt-1">
                                      <span>📅 {mockAppointments.length} Atendimentos</span>
                                      <span className="text-emerald-700">Filtros Ativos</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right events slots (8/12) */}
                                <div className="md:col-span-8 bg-white p-3 rounded-xl border border-slate-205 shadow-sm space-y-2.5">
                                  <div className="flex items-center justify-between border-b pb-2 text-left">
                                    <div>
                                      <span className="inline-block text-[8px] font-black text-white bg-[#4f46e5] px-2 py-0.5 rounded-full uppercase leading-none">
                                        16 Terça-feira
                                      </span>
                                      <h4 className="text-[9.5px] font-black text-slate-800 mt-1 uppercase tracking-tight">FLUXO DE CAIXA E PACIENTES</h4>
                                    </div>
                                    <span className="text-[7px] text-slate-400 font-extrabold uppercase bg-slate-50 border px-1.5 py-0.5 rounded">Todos os Dentistas</span>
                                  </div>

                                  {/* Scrollable checklist of appointments */}
                                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                                    {mockAppointments.map(appt => (
                                      <div key={appt.id} className="flex gap-2.5 items-start bg-slate-50 border border-slate-150 p-2.5 rounded-xl hover:bg-slate-100/50 transition-all text-left">
                                        <div className="text-center shrink-0 leading-none">
                                          <p className="text-[10px] font-black text-slate-900 font-mono leading-none">{appt.time}</p>
                                          <p className="text-[6.5px] text-slate-400 font-extrabold uppercase mt-1">60 MIN</p>
                                        </div>

                                        <div className="w-[1.5px] bg-slate-200 self-stretch" />

                                        <div className="flex-1 space-y-1 text-left">
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-slate-900 leading-none">{appt.patient}</h4>
                                            <span className="text-[7px] font-bold text-[#4f46e5] border border-[#cfcffc] px-1.5 rounded uppercase bg-blue-50">Scheduled</span>
                                          </div>
                                          <span className="text-[8px] text-slate-500 font-bold block">{appt.procedure}</span>
                                          <div className="flex items-center gap-1.5 pt-0.5 text-[7px] font-bold text-slate-400 uppercase">
                                            <span>📍 {appt.sala}</span>
                                            <span>•</span>
                                            <span>👤 {appt.doctor}</span>
                                          </div>
                                        </div>

                                        <button 
                                          onClick={() => {
                                            setMockAppointments(mockAppointments.filter(a => a.id !== appt.id));
                                            setClinicNotification('Agendamento desmarcado na simulação.');
                                            setTimeout(() => setClinicNotification(null), 2500);
                                          }}
                                          className="text-slate-350 hover:text-red-500 p-0.5"
                                          title="Desmarcar"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}

                                    {mockAppointments.length === 0 && (
                                      <div className="py-8 text-center text-[10px] text-slate-400 font-bold uppercase">
                                        Nenhum atendimento fictício para hoje
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Simulated mini Toast notice inside mockup workspace */}
                          {clinicNotification && (
                            <div className="bg-teal-500 text-slate-950 font-black text-[9px] px-3.5 py-1.5 rounded-xl text-center font-mono absolute bottom-4 right-4 shadow-2xl uppercase tracking-wider animate-bounce z-25">
                              [SIMULADOR] {clinicNotification}
                            </div>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Features description list detailed in LabProX style */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
                <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0F172A] leading-tight text-center">
                  Sincronização Absoluta do Consultório à Prancheta do Técnico
                </h2>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-normal text-center">
                  Reduza pela metade o tempo no WhatsApp tirando dúvidas de cor de escala, arquivos STL perdidos e comprovantes de transferência. Oferecemos controle absoluto sob medida.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    icon: <CheckCircle2 className="text-teal-500" />,
                    title: "CRO e UF Validados na Entrada",
                    desc: "Para garantir segurança jurídica completa, todos os dentistas cadastrados no LabProX têm o registro de CRO e UF validados de forma proativa."
                  },
                  {
                    icon: <Users className="text-teal-500" />,
                    title: "Prontuários Digitais Elegantes",
                    desc: "Histórico completo com fotos, anotações de evolução clínica dente-a-dente e termos de consentimento emitidos com assinatura digital."
                  },
                  {
                    icon: <Calendar className="text-teal-500" />,
                    title: "Lembretes Automáticos",
                    desc: "Sua agenda integrada que envia notificações de confirmação para os pacientes no WhatsApp, reduzindo faltas em até 37% de forma automatizada."
                  },
                  {
                    icon: <Wallet className="text-teal-500" />,
                    title: "Boleto Integral (Taxas Transparentes)",
                    desc: "Gere links de faturamento de tratamentos direto da ficha do paciente. As taxas Asaas são descontadas de forma limpa, mostrando sempre o valor original."
                  },
                  {
                    icon: <ShoppingBag className="text-teal-500" />,
                    title: "Envio de Arquivos Digitais (STL)",
                    desc: "Envie escaneamento intraoral diretamente do portal clínico ao laboratório. O sistema notifica o protético imediatamente."
                  },
                  {
                    icon: <TrendingUp className="text-teal-500" />,
                    title: "Relatórios de Metas",
                    desc: "Acompanhe orçamentos fechados, taxas de conversão de exames e comissões automáticas devidas a dentistas associados no final do mês."
                  }
                ].map((f, i) => (
                  <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-200/50 hover:border-slate-200 transition-colors space-y-3 shadow-soft hover:shadow-md text-left">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      {f.icon}
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-955 font-display text-left">{f.title}</h3>
                    <p className="text-xs text-slate-650 font-semibold leading-relaxed text-left">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Clinica testimonial */}
          <section className="py-20 bg-slate-100 border-t border-slate-200/50 text-center">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <span className="inline-flex text-5xl text-teal-400 font-serif">“</span>
              <p className="text-base sm:text-lg md:text-xl text-slate-700 italic font-semibold leading-relaxed text-center">
                "Paramos de ligar para o laboratório para perguntar se o modelo de gesso foi vazado ou se a coroa monolítica já estava na rota do courier. Ver a barra de progresso em tempo real pelo LabProX Clin economiza horas da nossa recepção todos os dias."
              </p>
              <div>
                <h4 className="font-black text-slate-950 text-base text-center">Dra. Clarice Rocha Guimarães</h4>
                <p className="text-xs text-slate-500 font-extrabold tracking-wider uppercase text-center">Diretora Clínica - Odontologia Arte SP</p>
              </div>
            </div>
          </section>
        </motion.div>
      )}

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
            <span>© 2026 LabProX Operating System. Todos os direitos reservados.</span>
            <span>CNPJ: 00.000.000/0001-00 · Contato: comercial@labprox.com.br</span>
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
