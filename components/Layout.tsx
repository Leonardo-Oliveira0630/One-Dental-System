
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Logo, LogoIcon } from './Logo';
import { 
  LayoutDashboard, List, Calendar, ShoppingBag, 
  LogOut, Menu, UserCircle, ShoppingCart, 
  PlusCircle, Layers, X, Building, Table,
  Contact, CalendarRange, Crown, Handshake, ChevronsUpDown, Settings, DollarSign, Package, Inbox as InboxIcon, Activity, Stethoscope, Globe, Bell, Ticket, Truck, WifiOff, RefreshCw, Home, Search, Camera, Briefcase, LayoutGrid, Users, Wallet, FileText, AlertTriangle, BookOpen, HelpCircle, ShieldCheck, ClipboardList
} from 'lucide-react';
import { UserRole, PermissionKey } from '../types';
import { GlobalScanner } from './Scanner';
import { PrintOverlay } from './PrintOverlay';
import { AlertPopup } from './AlertSystem';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { JobSearch } from './JobSearch';
import * as firestorePkg from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const { onSnapshotsInSync } = firestorePkg as any;

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { 
    currentUser, logout, cart, jobs, currentOrg, currentPlan,
    userConnections, activeOrganization, switchActiveOrganization
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isLabSelectorOpen, setIsLabSelectorOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOverduePopup, setShowOverduePopup] = useState(false);

  const isSubscriptionPastDue = () => {
    if (!currentOrg) return false;
    if (currentUser?.role === UserRole.SUPER_ADMIN) return false;
    
    const status = currentOrg.subscriptionStatus;
    
    // Se a organização tem um período de teste ativo (trialEndsAt no futuro), NÃO bloqueia o acesso
    if (currentOrg.trialEndsAt) {
      let trialDate: Date;
      if (typeof currentOrg.trialEndsAt === 'object' && 'seconds' in (currentOrg.trialEndsAt as any)) {
        trialDate = new Date((currentOrg.trialEndsAt as any).seconds * 1000);
      } else if (currentOrg.trialEndsAt instanceof Date) {
        trialDate = currentOrg.trialEndsAt;
      } else {
        trialDate = new Date(currentOrg.trialEndsAt);
      }
      if (new Date() < trialDate) {
        return false;
      }
    }
    
    if (status === 'OVERDUE' || status === 'CANCELLED') {
      return true;
    }
    
    if (status === 'PENDING') {
      return true;
    }
    
    return false;
  };

  const isSupplier = currentOrg?.orgType === 'SUPPLIER';
  const isPastDue = isSubscriptionPastDue() && !isSupplier;

  useEffect(() => {
    if (isPastDue && !location.pathname.startsWith('/admin') && location.pathname !== '/subscribe' && location.pathname !== '/profile') {
      navigate('/admin/assinatura');
      setShowOverduePopup(true);
    }
  }, [isPastDue, location.pathname, navigate]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    let unsubSync: any;
    if (db) {
        unsubSync = onSnapshotsInSync(db, () => {
            setIsSyncing(false);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubSync) unsubSync();
    };
  }, []);

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isClient = currentUser?.role === UserRole.CLIENT;
  const isBuyer = (isClient || currentOrg?.orgType === 'LAB_OUTSOURCED') && !isSupplier;
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  
  const isClinicPendingApproval = () => {
    if (isSuperAdmin) return false;
    if (currentUser?.role === UserRole.CLIENT && currentOrg?.isApproved !== true) {
      return true;
    }
    return false;
  };
  
  const hasPerm = (key: PermissionKey) => {
      if (isAdmin) return true;
      return currentUser?.permissions?.includes(key) || false;
  };

  const pendingOrdersCount = React.useMemo(() => 
    jobs.filter(j => j.status === 'WAITING_APPROVAL' as any).length
  , [jobs]);

  const { onlineRequisitions } = useApp();
  const pendingRequisitionsCount = React.useMemo(() => 
    (onlineRequisitions || []).filter(r => r.status === 'PENDING').length
  , [onlineRequisitions]);

  const bgClass = 'bg-[#0F172A]';
  
  const handleLogout = () => { logout(); navigate('/login'); };

  const isViewingLabContext = isBuyer && (location.pathname.startsWith('/store') || location.pathname.startsWith('/jobs') || location.pathname.startsWith('/cart'));
  
  const displayBrand = React.useMemo(() => 
    isViewingLabContext && activeOrganization 
      ? { name: activeOrganization.name, logo: activeOrganization.logoUrl, sub: 'Laboratório Parceiro' } 
      : { name: currentOrg?.name || 'SMILEPROX', logo: currentOrg?.logoUrl, sub: isClient ? 'Minha Clínica' : currentOrg?.orgType === 'LAB_OUTSOURCED' ? 'Laboratório Terceirizado' : 'SMILEPROX SYSTEM' }
  , [isViewingLabContext, activeOrganization, currentOrg, isClient]);

  return (
    <div className="min-h-screen print:min-h-0 flex print:block bg-slate-50 print:bg-white font-sans relative overflow-x-hidden print:overflow-visible w-full">
      {!isSuperAdmin && <GlobalScanner />}
      <PrintOverlay />
      <AlertPopup />
      <PWAInstallPrompt />
      
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none flex flex-col items-center gap-2 mt-4 px-4 print:hidden">
          {isOffline && (
            <div className="bg-orange-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 pointer-events-auto max-w-full">
                <WifiOff size={16} />
                <span className="text-[10px] font-black uppercase tracking-tight truncate">Modo Offline Ativo</span>
            </div>
          )}
          {isSyncing && !isOffline && (
            <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 animate-pulse pointer-events-auto">
                <RefreshCw size={12} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-tight">Sincronizando...</span>
            </div>
          )}
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-[70] w-64 ${bgClass} text-white transform transition-transform duration-300 ease-in-out print:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 h-full flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              {displayBrand.logo ? (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
                  <img src={displayBrand.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                displayBrand.name.toUpperCase() === 'SMILEPROX' ? (
                  <LogoIcon size={40} className="shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-[#0F4C81] rounded-xl flex items-center justify-center shrink-0 shadow-lg font-black text-white text-xl">
                    {displayBrand.name.charAt(0)}
                  </div>
                )
              )}
              <div className="flex flex-col min-w-0">
                {displayBrand.name.toUpperCase() === 'SMILEPROX' ? (
                  <span className="text-sm font-black tracking-tight leading-none truncate uppercase text-white">
                    Smile<span className="text-[#00B8D9]">ProX</span>
                  </span>
                ) : (
                  <span className="text-xs font-black tracking-tight leading-none truncate uppercase text-white">{displayBrand.name}</span>
                )}
                <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-1 uppercase truncate">{displayBrand.sub}</span>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/70 hover:text-white p-1"><X size={24} /></button>
          </div>

          {isBuyer && (
             <div className="mb-6 px-2 relative shrink-0">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 px-2 truncate">Laboratório Ativo</p>
                <button 
                   onClick={() => setIsLabSelectorOpen(!isLabSelectorOpen)}
                   className="w-full flex items-center justify-between gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 group"
                >
                   <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                         {activeOrganization?.logoUrl ? (
                           <img src={activeOrganization.logoUrl} alt="Lab Logo" className="w-full h-full object-contain" />
                         ) : (
                           <Building size={16} className="text-indigo-500" />
                         )}
                      </div>
                      <span className="font-bold text-sm truncate">{activeOrganization?.name || 'Selecione...'}</span>
                   </div>
                   <ChevronsUpDown size={14} className="text-slate-500 group-hover:text-white shrink-0" />
                </button>

                {isLabSelectorOpen && (
                   <div className="absolute top-full left-2 right-2 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[80] overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="max-h-48 overflow-y-auto">
                        {userConnections.map(conn => (
                           <button 
                              key={conn.organizationId}
                              onClick={() => { switchActiveOrganization(conn.organizationId); setIsLabSelectorOpen(false); }}
                              className={`w-full text-left p-3 text-sm hover:bg-white/5 flex items-center justify-between ${activeOrganization?.id === conn.organizationId ? 'text-indigo-400 bg-white/5' : 'text-slate-300'}`}
                           >
                              <span className="truncate">{conn.organizationName}</span>
                              {activeOrganization?.id === conn.organizationId && <div className="w-2 h-2 bg-indigo-400 rounded-full shrink-0"></div>}
                           </button>
                        ))}
                      </div>
                      <Link to="/dentist/partnerships" onClick={() => setIsLabSelectorOpen(false)} className="block w-full p-3 text-center text-xs font-bold bg-white/5 hover:bg-white/10 border-t border-slate-700 text-indigo-400">+ Nova Parceria</Link>
                   </div>
                )}
             </div>
          )}

          <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar pr-2">
            {isSuperAdmin && (
              <>
                <SidebarItem to="/superadmin" icon={<LayoutDashboard size={20} />} label="Home Master" active={location.pathname === '/superadmin'} />
                <SidebarItem to="/superadmin/plans" icon={<Crown size={20} />} label="Planos" active={location.pathname === '/superadmin/plans'} />
                <SidebarItem to="/superadmin/coupons" icon={<Ticket size={20} />} label="Cupons" active={location.pathname === '/superadmin/coupons'} />
                <SidebarItem to="/superadmin/subscriptions" icon={<Users size={20} />} label="Assinaturas" active={location.pathname === '/superadmin/subscriptions'} />
                <SidebarItem to="/superadmin/finance" icon={<DollarSign size={20} />} label="Financeiro SaaS" active={location.pathname === '/superadmin/finance'} />
                <SidebarItem to="/superadmin/tutorials" icon={<BookOpen size={20} />} label="Gerenciar Tutoriais" active={location.pathname === '/superadmin/tutorials'} />
              </>
            )}

            {!isSuperAdmin && isPastDue ? (
              <>
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Acesso Bloqueado</p>
                  <p className="text-[10px] text-slate-400">Regularize sua assinatura ou período de testes no menu abaixo para liberar as funcionalidades.</p>
                </div>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/admin/assinatura" icon={<Settings size={20} />} label="Faturas / Assinatura" active={location.pathname === '/admin/assinatura'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/profile" icon={<UserCircle size={20} />} label="Meu Perfil" active={location.pathname === '/profile'} />
              </>
            ) : (
              <>
                {isSupplier && (
                  <>
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/dashboard" icon={<LayoutDashboard size={20} />} label="Painel de Pedidos" active={location.pathname === '/supplier/dashboard'} />
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/products" icon={<Package size={20} />} label="Meus Produtos" active={location.pathname === '/supplier/products'} />
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/settings" icon={<Settings size={20} />} label="Configurações" active={location.pathname === '/supplier/settings'} />
                  </>
                )}

                {!isSupplier && !isBuyer && !isSuperAdmin && (
                  <>
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/dashboard'} />
                    {hasPerm('finance:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/finance" icon={<DollarSign size={20} />} label="Financeiro" active={location.pathname === '/lab/finance'} />}
                    {hasPerm('receipts:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/receipts" icon={<FileText size={20} />} label="Recibos" active={location.pathname === '/lab/receipts'} />}
                    {hasPerm('commissions:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/commissions" icon={<Wallet size={20} />} label="Comissões" active={location.pathname === '/commissions'} />}
                    {hasPerm('catalog:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-orders" icon={<InboxIcon size={20} />} label="Pedidos Web" active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />}
                    {hasPerm('clients:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-requisitions" icon={<ClipboardList size={20} />} label="Requisições Online" active={location.pathname === '/incoming-requisitions'} badge={pendingRequisitionsCount} />}
                    {hasPerm('clients:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/dentists" icon={<Stethoscope size={20} />} label="Clientes" active={location.pathname === '/lab/dentists'} />}
                    {hasPerm('catalog:prices_view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/price-tables" icon={<Table size={20} />} label="Tabelas de Preços" active={location.pathname === '/lab/price-tables'} />}
                    {hasPerm('inventory:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/inventory" icon={<Package size={20} />} label="Inventário" active={location.pathname === '/lab/inventory'} />}
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store-suppliers" icon={<Globe size={20} />} label="Loja Fornecedores" active={location.pathname === '/store-suppliers'} />
                    {hasPerm('logistics:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/logistics" icon={<Truck size={20} />} label="Entregas" active={location.pathname === '/lab/logistics'} />}
                    
                    <div className="pt-2 mt-2 border-t border-white/5 opacity-50"></div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-4 mb-1 truncate">Produção</p>
                    {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-job" icon={<PlusCircle size={20} />} label="Novo Caso" active={location.pathname === '/new-job'} />}
                    {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Trabalhos" active={location.pathname === '/jobs'} />}
                    {hasPerm('vip:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/promised" icon={<Crown size={20} />} label="Produção VIP" active={location.pathname === '/promised'} />}
                    {hasPerm('calendar:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/calendar" icon={<Calendar size={20} />} label="Calendário" active={location.pathname === '/calendar'} />}
                    {hasPerm('catalog:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/job-types" icon={<Package size={20} />} label="Serviços" active={location.pathname === '/job-types'} />}
                    {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/reports" icon={<FileText size={20} />} label="Relatórios" active={location.pathname === '/reports'} />}
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/tutorials" icon={<HelpCircle size={20} />} label="Central de Ajuda" active={location.pathname === '/tutorials'} />
                  </>
                )}

                {isBuyer && (
                  <>
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store" icon={<ShoppingBag size={20} />} label="Loja de Prótese" active={location.pathname === '/store'} />
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store-suppliers" icon={<Globe size={20} />} label="Loja Fornecedores" active={location.pathname === '/store-suppliers'} />
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Meus Pedidos" active={location.pathname === '/jobs'} />
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/cart" icon={<ShoppingCart size={20} />} label="Carrinho" active={location.pathname === '/cart'} badge={cart.length} />
                    
                    {currentOrg?.orgType === 'CLINIC' && (
                      <>
                        <div className="pt-4 mt-4 border-t border-white/5 opacity-50"></div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-4 mb-2 truncate">Minha Clínica</p>
                        
                        {(!currentPlan || currentPlan.features.hasClinicModule) && (
                          <>
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/schedule" icon={<CalendarRange size={20} />} label="Agenda" active={location.pathname === '/schedule'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/finance" icon={<Wallet size={20} />} label="Financeiro" active={location.pathname === '/clinic/finance'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/rooms" icon={<LayoutGrid size={20} />} label="Salas" active={location.pathname === '/clinic/rooms'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/dentists" icon={<Users size={20} />} label="Corpo Clínico" active={location.pathname === '/clinic/dentists'} />
                          </>
                        )}
                        
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/patients" icon={<Contact size={20} />} label="Pacientes" active={location.pathname === '/patients'} />
                        
                        {(!currentPlan || currentPlan.features.hasClinicModule) && (
                          <>
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/services" icon={<Briefcase size={20} />} label="Meus Serviços" active={location.pathname === '/clinic/services'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/inventory" icon={<Package size={20} />} label="Estoque (Insumos)" active={location.pathname === '/clinic/inventory'} />
                          </>
                        )}
                      </>
                    )}
                    
                    <div className="pt-4 mt-4 border-t border-white/5 opacity-50"></div>
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dentist/partnerships" icon={<Handshake size={20} />} label="Parcerias Lab" active={location.pathname === '/dentist/partnerships'} />
                    {isBuyer && (
                      <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/requisitions" icon={<ClipboardList size={20} />} label="Requisições Online" active={location.pathname === '/requisitions'} />
                    )}
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/tutorials" icon={<HelpCircle size={20} />} label="Central de Ajuda" active={location.pathname === '/tutorials'} />
                  </>
                )}

                <div className="pt-8 mt-8 border-t border-white/10 shrink-0">
                  <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/profile" icon={<UserCircle size={20} />} label="Perfil" active={location.pathname === '/profile'} />
                  {currentOrg?.orgType === 'CLINIC' && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic-settings" icon={<Settings size={20} />} label="Configurações" active={location.pathname === '/clinic-settings'} />}
                  {currentOrg?.orgType !== 'LAB_OUTSOURCED' && currentOrg?.orgType !== 'CLINIC' && (isAdmin || hasPerm('users:view') || hasPerm('clients:view') || hasPerm('sectors:view') || hasPerm('boxes:view') || hasPerm('finance:view') || hasPerm('commissions:view')) && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/admin" icon={<Settings size={20} />} label="Configurar Lab" active={location.pathname.startsWith('/admin')} />}
                </div>
              </>
            )}
          </nav>

          <div className="mt-auto pt-4 shrink-0">
             <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-white/5 rounded-xl transition-colors">
              <LogOut size={20} /><span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 z-[50] md:hidden print:hidden">
         <div className="flex items-center gap-3 overflow-hidden">
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 rounded-lg active:bg-slate-100 transition-colors shrink-0"><Menu size={24} /></button>
             {!isMobileSearchOpen && (
               <div className="flex items-center gap-2 overflow-hidden">
                  <Logo size="sm" variant="colored" />
               </div>
             )}
         </div>

         {isMobileSearchOpen && (
            <div className="flex-1 mx-2 animate-in fade-in slide-in-from-right-4">
               <JobSearch />
            </div>
         )}

         <div className="flex items-center gap-1 shrink-0">
             {!isBuyer && (
               <button 
                 onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                 className={`p-2 rounded-lg transition-colors ${isMobileSearchOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
               >
                 {isMobileSearchOpen ? <X size={22} /> : <Search size={22} />}
               </button>
             )}
             {isBuyer && cart.length > 0 && (
                 <Link to="/cart" className="p-2 text-blue-600 relative"><ShoppingCart size={22} /><span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black border-2 border-white">{cart.length}</span></Link>
             )}
             <Link to="/profile" className="w-8 h-8 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 font-black text-xs shrink-0">{currentUser?.name.charAt(0)}</Link>
         </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-50 md:hidden pb-[env(safe-area-inset-bottom)] print:hidden">
          <MobileNavItem to="/dashboard" icon={<Home size={22}/>} label="Home" active={location.pathname === '/dashboard'} />
          
          {!isBuyer ? (
            <>
              <MobileNavItem to="/jobs" icon={<List size={22}/>} label="OS" active={location.pathname === '/jobs'} />
              <div className="relative -top-5">
                 <button onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-scanner')); }} className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-300 border-4 border-white active:scale-90 transition-transform">
                    <Camera size={28}/>
                 </button>
              </div>
              <MobileNavItem to="/incoming-orders" icon={<InboxIcon size={22}/>} label="Web" active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />
            </>
          ) : currentOrg?.orgType === 'LAB_OUTSOURCED' ? (
            <>
              <MobileNavItem to="/store" icon={<ShoppingBag size={22}/>} label="Loja" active={location.pathname === '/store'} />
              <div className="relative -top-5">
                 <Link to="/cart" className="w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-purple-300 border-4 border-white active:scale-90 transition-transform">
                    <ShoppingCart size={28}/>
                 </Link>
              </div>
              <MobileNavItem to="/jobs" icon={<List size={22}/>} label="Pedidos" active={location.pathname === '/jobs'} />
            </>
          ) : (
            <>
              {(!currentPlan || currentPlan.features.hasClinicModule) ? (
                <>
                  <MobileNavItem to="/schedule" icon={<CalendarRange size={22}/>} label="Agenda" active={location.pathname === '/schedule'} />
                  <div className="relative -top-5">
                     <Link to="/clinic/finance" className="w-14 h-14 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-teal-300 border-4 border-white active:scale-90 transition-transform">
                        <Wallet size={28}/>
                     </Link>
                  </div>
                  <MobileNavItem to="/clinic/rooms" icon={<LayoutGrid size={22}/>} label="Salas" active={location.pathname === '/clinic/rooms'} />
                </>
              ) : (
                <>
                  <MobileNavItem to="/store" icon={<ShoppingBag size={22}/>} label="Loja" active={location.pathname === '/store'} />
                  <div className="relative -top-5">
                     <Link to="/patients" className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-300 border-4 border-white active:scale-90 transition-transform">
                        <Contact size={28}/>
                     </Link>
                  </div>
                  <MobileNavItem to="/jobs" icon={<List size={22}/>} label="Pedidos" active={location.pathname === '/jobs'} />
                </>
              )}
            </>
          )}
          
          <MobileNavItem to="/profile" icon={<UserCircle size={22}/>} label="Perfil" active={location.pathname === '/profile'} />
      </nav>

      <main className="flex-1 w-full md:ml-64 transition-all duration-300 print:hidden flex flex-col min-h-screen overflow-x-hidden relative">
        <header className="hidden md:flex bg-white border-b border-slate-200 h-16 items-center justify-between px-8 sticky top-0 z-30 print:hidden shrink-0">
          <div className="flex items-center gap-2 overflow-hidden shrink-0">
             <Logo size="sm" variant="colored" />
          </div>

          <div className="flex-1 max-w-xl mx-8">
            <JobSearch />
          </div>

          <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-slate-800 leading-none uppercase truncate max-w-[150px]">{currentUser?.name}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[150px]">
                      {isClient ? 'Cirurgião-Dentista' : currentOrg?.orgType === 'LAB_OUTSOURCED' ? 'Lab Terceirizado' : (currentUser?.sector || 'Acesso Administrativo')}
                  </span>
              </div>
              <Link to="/profile" className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md hover:scale-105 transition-transform shrink-0">{currentUser?.name.charAt(0)}</Link>
          </div>
        </header>

        <div className="p-4 pt-20 md:pt-8 md:p-8 w-full max-w-[1400px] mx-auto print:p-0 flex-1 flex flex-col overflow-x-hidden overflow-y-auto relative">
          {isClinicPendingApproval() ? (
            <div className="flex-1 flex items-center justify-center py-12 px-4">
              <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-xl border border-teal-50 text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-teal-500/10">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Conta em Análise</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                  Para sua segurança e conformidade regulatória, todos os cadastros de dentistas passam por verificação de registro profissional (CRO).
                </p>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 mb-6">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                    <Stethoscope size={14} className="text-teal-600" /> Registro Informado
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Estado</span>
                      <span className="text-sm font-black text-slate-700">{currentOrg?.croUf || 'N/A'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50 col-span-2">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Inscrição CRO</span>
                      <span className="text-sm font-black text-slate-700">{currentOrg?.croNumero || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Categoria</span>
                      <span className="text-sm font-black text-slate-700">{currentOrg?.croCategoria || 'CD'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50 flex flex-col justify-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Status API</span>
                      <span className={`text-xs font-bold ${currentOrg?.croValid ? 'text-emerald-300' : 'text-amber-500'}`}>
                        {currentOrg?.croValid ? 'Validado Público' : 'Aguardando Análise'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 text-amber-800 text-xs p-4 rounded-xl mb-8 leading-relaxed text-left border border-amber-100 font-medium">
                  <strong>Pendente de Homologação:</strong> Detectamos que seu registro profissional necessita de uma aprovação ou verificação adicional. Nossa equipe de Administração de Super Admin foi notificada e está analisando sua conta.
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="flex-grow py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} /> Atualizar Status
                  </button>
                  <button 
                    onClick={handleLogout} 
                    className="flex-grow py-3 bg-slate-150 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Sair do App
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {isPastDue && !location.pathname.startsWith('/admin/assinatura') && location.pathname !== '/subscribe' && (
                <>
                  <div 
                    className="absolute inset-0 z-40 cursor-not-allowed bg-white/10 backdrop-blur-[1px]"
                    onClickCapture={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowOverduePopup(true);
                    }}
                  />
                  {showOverduePopup && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                       <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-red-100 animate-in zoom-in">
                          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                             <AlertTriangle size={32} />
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 mb-2">Assinatura Necessária</h2>
                          <p className="text-slate-500 mb-6 font-medium">Sua conta de laboratório ou período de testes está com restrição. Para regularizar, acesse o menu de assinatura para visualizar e efetuar o pagamento da fatura gerada no Asaas.</p>
                          <div className="flex gap-3">
                            <button onClick={() => setShowOverduePopup(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                               Fechar
                            </button>
                            <button onClick={() => { setShowOverduePopup(false); navigate('/admin/assinatura'); }} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30">
                               Ver Assinatura
                            </button>
                          </div>
                       </div>
                    </div>
                  )}
                </>
              )}
              {children}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
  badge?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active, onClick, badge }) => (
  <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group ${ active ? 'bg-gradient-to-r from-[#00B8D9]/15 to-[#00B8D9]/5 text-[#00B8D9] font-semibold border-l-4 border-[#00B8D9] pl-3' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200' }`} >
    <span className={`shrink-0 transition-colors ${active ? 'text-[#00B8D9]' : 'text-slate-400 group-hover:text-slate-200'}`}>{icon}</span>
    <span className="text-sm truncate">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute right-4 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg animate-pulse">{badge}</span>
    )}
  </Link>
);

const MobileNavItem = ({ to, icon, label, active, badge }: any) => (
    <Link to={to} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${active ? 'text-[#00B8D9]' : 'text-slate-400'}`}>
        <span className="shrink-0">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-tighter truncate max-w-full">{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className="absolute top-2 right-1/4 bg-red-500 text-white text-[8px] min-w-[14px] h-[14px] rounded-full flex items-center justify-center font-bold border border-white">
                {badge}
            </span>
        )}
    </Link>
);
