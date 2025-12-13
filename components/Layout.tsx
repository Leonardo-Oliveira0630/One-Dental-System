import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, List, Calendar, ShoppingBag, 
  LogOut, Menu, UserCircle, ShoppingCart, 
  Inbox, PlusCircle, Layers, Users, X, AlertOctagon, Shield,
  Contact, CalendarRange, Crown, Handshake, ChevronsUpDown, Tag, Lock, Ticket, Settings
} from 'lucide-react';
import { UserRole } from '../types';
import { GlobalScanner } from './Scanner';
import { PrintOverlay } from './PrintOverlay';
import { AlertPopup } from './AlertSystem';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
  badge?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active, onClick, badge }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${
      active 
        ? 'bg-white/10 text-white font-medium shadow-sm' 
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute right-4 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
        {badge}
      </span>
    )}
  </Link>
);

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { 
    currentUser, logout, cart, jobs, currentPlan, currentOrg,
    userConnections, activeOrganization, switchActiveOrganization
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isClient = currentUser?.role === UserRole.CLIENT;
  const isManager = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const features = currentPlan?.features;
  
  // Default fallback if no plan loaded yet
  const hasStore = features?.hasStoreModule ?? false;
  const hasClinic = features?.hasClinicModule ?? false;

  const bgClass = isClient ? 'bg-store-900' : 'bg-lab-900';
  const logoColor = isClient ? 'text-store-600' : 'text-lab-600';
  const vipCount = jobs.filter(j => j.urgency === 'VIP' && j.status !== 'COMPLETED').length;

  const isTrialExpired = !isClient && !isSuperAdmin && currentOrg && currentOrg.subscriptionStatus === 'TRIAL' && currentOrg.trialEndsAt && new Date() > new Date(currentOrg.trialEndsAt);
  const isPastDue = !isClient && !isSuperAdmin && currentOrg && currentOrg.subscriptionStatus === 'PAST_DUE';
  const isLocked = isTrialExpired || isPastDue;

  useEffect(() => {
      if (isLocked && location.pathname !== '/subscribe' && location.pathname !== '/profile') {
          navigate('/subscribe');
      }
  }, [isLocked, location.pathname, navigate]);

  const handleLogout = () => { logout(); navigate('/'); };
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // --- AUTO-SELECT LOGIC FOR DENTISTS ---
  useEffect(() => {
    if (isClient && userConnections.length > 0 && !activeOrganization) {
      // If user has connections but none selected, select the first one
      switchActiveOrganization(userConnections[0].organizationId);
    }
  }, [isClient, userConnections, activeOrganization, switchActiveOrganization]);

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'SaaS Admin';
      case UserRole.ADMIN: return 'Administrador';
      case UserRole.MANAGER: return 'Gestor';
      case UserRole.COLLABORATOR: return 'Colaborador';
      case UserRole.CLIENT: return 'Dentista';
      default: return 'Usuário';
    }
  };

  if (isLocked && location.pathname !== '/subscribe' && location.pathname !== '/profile') {
      return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <GlobalScanner />
      <PrintOverlay />
      <AlertPopup />
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 ${bgClass} text-white transform transition-transform duration-300 ease-in-out print:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className={`font-bold text-xl ${logoColor}`}>O</span>
              </div>
              <span className="text-lg font-bold tracking-tight">ONE DENTAL</span>
            </div>
            <button onClick={closeMobileMenu} className="md:hidden text-white/70 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* LAB SWITCHER FOR DENTISTS */}
          {isClient && userConnections.length > 0 && (
            <div className="mb-6 bg-white/10 rounded-xl p-3 border border-white/10 relative">
              <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-1 block">Laboratório Ativo</label>
              <div className="relative">
                <select 
                  value={activeOrganization?.id || ''}
                  onChange={(e) => switchActiveOrganization(e.target.value)}
                  className="w-full bg-transparent text-white font-bold text-sm border-none outline-none appearance-none cursor-pointer"
                >
                  {userConnections.map(conn => (
                    <option key={conn.organizationId} value={conn.organizationId} className="bg-store-900 text-white">
                      {conn.organizationName}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown size={14} className="absolute right-0 top-1 text-white/50 pointer-events-none" />
              </div>
            </div>
          )}

          {/* TRIAL BANNER */}
          {!isClient && currentOrg?.subscriptionStatus === 'TRIAL' && (
              <div className="mb-6 bg-orange-500/20 border border-orange-500/50 p-3 rounded-xl text-orange-200 text-xs">
                  <p className="font-bold flex items-center gap-1 mb-1"><Lock size={12}/> Modo de Teste</p>
                  <p className="mb-2">Expira em: {currentOrg.trialEndsAt ? new Date(currentOrg.trialEndsAt).toLocaleDateString() : '?'}</p>
                  <button 
                     onClick={() => navigate('/subscribe')}
                     className="w-full text-center bg-orange-500 text-white py-1.5 rounded font-bold hover:bg-orange-600 transition-colors"
                  >
                      Assinar Agora
                  </button>
              </div>
          )}

          <nav className="space-y-1 flex-1 overflow-y-auto">
            {/* Super Admin View */}
            {isSuperAdmin && (
              <>
                <SidebarItem onClick={closeMobileMenu} to="/superadmin" icon={<Crown size={20} />} label="Painel SaaS" active={location.pathname === '/superadmin'} />
                <SidebarItem onClick={closeMobileMenu} to="/superadmin/plans" icon={<Tag size={20} />} label="Planos & Preços" active={location.pathname === '/superadmin/plans'} />
                <SidebarItem onClick={closeMobileMenu} to="/superadmin/coupons" icon={<Ticket size={20} />} label="Cupons" active={location.pathname === '/superadmin/coupons'} />
              </>
            )}

            {/* Lab View */}
            {!isClient && !isSuperAdmin && !isLocked && (
              <>
                <SidebarItem onClick={closeMobileMenu} to="/dashboard" icon={<LayoutDashboard size={20} />} label="Visão Geral" active={location.pathname === '/dashboard'} />
                {isManager && (
                   <SidebarItem onClick={closeMobileMenu} to="/promised" icon={<AlertOctagon size={20} className="text-orange-400"/>} label="Casos Prometidos" active={location.pathname === '/promised'} badge={vipCount} />
                )}
                <SidebarItem onClick={closeMobileMenu} to="/new-job" icon={<PlusCircle size={20} />} label="Novo Caso" active={location.pathname === '/new-job'} />
                <SidebarItem onClick={closeMobileMenu} to="/jobs" icon={<List size={20} />} label="Todos os Trabalhos" active={location.pathname === '/jobs'} />
                <SidebarItem onClick={closeMobileMenu} to="/calendar" icon={<Calendar size={20} />} label="Produção" active={location.pathname === '/calendar'} />
                <SidebarItem onClick={closeMobileMenu} to="/job-types" icon={<Layers size={20} />} label="Catálogo de Serviços" active={location.pathname === '/job-types'} />
                
                {/* HIDE INCOMING ORDERS IF NO STORE MODULE */}
                {isManager && hasStore && (
                   <SidebarItem onClick={closeMobileMenu} to="/incoming" icon={<Inbox size={20} />} label="Pedidos Web" active={location.pathname === '/incoming'} />
                )}
              </>
            )}

            {/* Client View */}
            {isClient && (
              <>
                {/* CHECK FEATURES: Only show Clinic module if Lab plan supports it */}
                {hasClinic && (
                  <>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 mt-2 px-4">Gestão Clínica</div>
                    <SidebarItem onClick={closeMobileMenu} to="/clinic/schedule" icon={<CalendarRange size={20} />} label="Agenda" active={location.pathname === '/clinic/schedule'} />
                    <SidebarItem onClick={closeMobileMenu} to="/clinic/patients" icon={<Contact size={20} />} label="Pacientes" active={location.pathname === '/clinic/patients'} />
                  </>
                )}
                
                {/* CHECK FEATURES: Only show Store module if Lab plan supports it */}
                {hasStore && (
                  <>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 mt-6 px-4">Loja & Laboratório</div>
                    <SidebarItem onClick={closeMobileMenu} to="/store" icon={<ShoppingBag size={20} />} label="Catálogo" active={location.pathname === '/store'} />
                    <SidebarItem onClick={closeMobileMenu} to="/my-orders" icon={<List size={20} />} label="Meus Pedidos" active={location.pathname === '/my-orders'} />
                    <SidebarItem onClick={closeMobileMenu} to="/cart" icon={
                      <div className="relative">
                        <ShoppingCart size={20} />
                        {cart.length > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                            {cart.reduce((a, b) => a + b.quantity, 0)}
                          </span>
                        )}
                      </div>
                    } label="Carrinho" active={location.pathname === '/cart'} />
                  </>
                )}

                <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 mt-6 px-4">Configurações</div>
                <SidebarItem onClick={closeMobileMenu} to="/dentist/partnerships" icon={<Handshake size={20} />} label="Laboratórios" active={location.pathname === '/dentist/partnerships'} />
                <SidebarItem onClick={closeMobileMenu} to="/clinic/settings" icon={<Settings size={20} />} label="Minha Assinatura" active={location.pathname === '/clinic/settings'} />
              </>
            )}

            <div className="pt-8 mt-8 border-t border-white/10">
              <SidebarItem onClick={closeMobileMenu} to="/profile" icon={<UserCircle size={20} />} label="Perfil" active={location.pathname === '/profile'} />
              {isManager && (
                <SidebarItem onClick={closeMobileMenu} to="/admin" icon={<Users size={20} />} label="Admin & Equipe" active={location.pathname === '/admin'} />
              )}
            </div>
          </nav>

          <div className="mt-auto pt-4">
            <div className="bg-white/10 rounded-xl p-3 mb-3 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {currentUser?.name.charAt(0)}
               </div>
               <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-300 uppercase tracking-wider">
                     <Shield size={10} /> {getRoleLabel(currentUser?.role)}
                  </div>
               </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-white/5 hover:text-red-200 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 transition-all duration-300 print:ml-0 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
             <span className="font-bold text-slate-800">ONE DENTAL</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2 rounded-lg hover:bg-slate-100">
            <Menu size={24} />
          </button>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};