
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, List, Calendar, ShoppingBag, 
  LogOut, Menu, UserCircle, ShoppingCart, 
  PlusCircle, Layers, X, Building, 
  Contact, CalendarRange, Crown, Handshake, ChevronsUpDown, Settings, DollarSign, Package, Inbox as InboxIcon, Activity, Stethoscope, Globe, Bell, Ticket, Truck
} from 'lucide-react';
import { UserRole, PermissionKey } from '../types';
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
    currentUser, logout, cart, jobs, currentOrg,
    userConnections, activeOrganization, switchActiveOrganization
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLabSelectorOpen, setIsLabSelectorOpen] = useState(false);

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isClient = currentUser?.role === UserRole.CLIENT;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const hasPerm = (key: PermissionKey) => {
      if (isAdmin || isSuperAdmin) return true;
      return currentUser?.permissions?.includes(key) || false;
  };

  const pendingOrdersCount = jobs.filter(j => j.status === 'WAITING_APPROVAL' as any).length;
  const bgClass = isSuperAdmin ? 'bg-slate-950' : (isClient ? 'bg-indigo-950' : 'bg-slate-900');
  
  const handleLogout = () => { logout(); navigate('/'); };

  const isViewingLabContext = isClient && (location.pathname.startsWith('/store') || location.pathname.startsWith('/jobs') || location.pathname.startsWith('/cart'));
  
  const displayBrand = isViewingLabContext && activeOrganization 
    ? { name: activeOrganization.name, logo: activeOrganization.logoUrl, sub: 'Laboratório Parceiro' } 
    : { name: currentOrg?.name || 'MY TOOTH', logo: currentOrg?.logoUrl, sub: isClient ? 'Minha Clínica' : 'MY TOOTH SYSTEM' };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans relative">
      {!isSuperAdmin && <GlobalScanner />}
      <PrintOverlay />
      <AlertPopup />
      
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 ${bgClass} text-white transform transition-transform duration-300 ease-in-out print:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 overflow-hidden">
              {displayBrand.logo ? (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
                  <img src={displayBrand.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg font-black text-xl">
                  {displayBrand.name.charAt(0)}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black tracking-tight leading-none truncate uppercase">{displayBrand.name}</span>
                <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-1 uppercase truncate">{displayBrand.sub}</span>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/70 hover:text-white"><X size={24} /></button>
          </div>

          {isClient && (
             <div className="mb-6 px-2 relative">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 px-2">Selecionar Laboratório</p>
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
                   <ChevronsUpDown size={14} className="text-slate-500 group-hover:text-white" />
                </button>

                {isLabSelectorOpen && (
                   <div className="absolute top-full left-2 right-2 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="max-h-48 overflow-y-auto">
                        {userConnections.map(conn => (
                           <button 
                              key={conn.organizationId}
                              onClick={() => { switchActiveOrganization(conn.organizationId); setIsLabSelectorOpen(false); }}
                              className={`w-full text-left p-3 text-sm hover:bg-white/5 flex items-center justify-between ${activeOrganization?.id === conn.organizationId ? 'text-indigo-400 bg-white/5' : 'text-slate-300'}`}
                           >
                              <span className="truncate">{conn.organizationName}</span>
                              {activeOrganization?.id === conn.organizationId && <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>}
                           </button>
                        ))}
                      </div>
                      <Link 
                        to="/dentist/partnerships" 
                        onClick={() => setIsLabSelectorOpen(false)}
                        className="block w-full p-3 text-center text-xs font-bold bg-white/5 hover:bg-white/10 border-t border-slate-700 text-indigo-400"
                      >
                         + Nova Parceria
                      </Link>
                   </div>
                )}
             </div>
          )}

          <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
            {isSuperAdmin && (
              <>
                <SidebarItem to="/superadmin" icon={<LayoutDashboard size={20} />} label="Home Master" active={location.pathname === '/superadmin'} />
                <SidebarItem to="/superadmin/plans" icon={<Crown size={20} />} label="Gerenciar Planos" active={location.pathname === '/superadmin/plans'} />
                <SidebarItem to="/superadmin/coupons" icon={<Ticket size={20} />} label="Cupons" active={location.pathname === '/superadmin/coupons'} />
              </>
            )}

            {!isClient && !isSuperAdmin && (
              <>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" icon={<LayoutDashboard size={20} />} label="Visão Geral" active={location.pathname === '/dashboard'} />
                {hasPerm('finance:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/finance" icon={<DollarSign size={20} />} label="Financeiro" active={location.pathname === '/lab/finance'} />}
                {hasPerm('catalog:manage') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-orders" icon={<InboxIcon size={20} />} label="Pedidos Web" active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />}
                {hasPerm('clients:manage') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/dentists" icon={<Stethoscope size={20} />} label="Clientes" active={location.pathname === '/lab/dentists'} />}
                {hasPerm('logistics:manage') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/logistics" icon={<Truck size={20} />} label="Entregas / Rotas" active={location.pathname === '/lab/logistics'} />}
                {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-job" icon={<PlusCircle size={20} />} label="Novo Caso" active={location.pathname === '/new-job'} />}
                {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Trabalhos" active={location.pathname === '/jobs'} />}
                {hasPerm('catalog:manage') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/job-types" icon={<Package size={20} />} label="Serviços" active={location.pathname === '/job-types'} />}
                {hasPerm('vip:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/promised" icon={<Activity size={20} />} label="Produção VIP" active={location.pathname === '/promised'} />}
                {hasPerm('calendar:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/calendar" icon={<Calendar size={20} />} label="Calendário" active={location.pathname === '/calendar'} />}
              </>
            )}

            {isClient && (
              <>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store" icon={<ShoppingBag size={20} />} label="Fazer Pedido" active={location.pathname === '/store'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Meus Pedidos" active={location.pathname === '/jobs'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/cart" icon={<ShoppingCart size={20} />} label="Carrinho" active={location.pathname === '/cart'} badge={cart.length} />
                <div className="pt-4 mt-4 border-t border-white/5 opacity-50"></div>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/patients" icon={<Contact size={20} />} label="Pacientes" active={location.pathname === '/patients'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/schedule" icon={<CalendarRange size={20} />} label="Minha Agenda" active={location.pathname === '/schedule'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dentist/partnerships" icon={<Handshake size={20} />} label="Parcerias" active={location.pathname === '/dentist/partnerships'} />
              </>
            )}

            <div className="pt-8 mt-8 border-t border-white/10">
              <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/profile" icon={<UserCircle size={20} />} label="Perfil" active={location.pathname === '/profile'} />
              {isAdmin && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/admin" icon={<Settings size={20} />} label="Configurações" active={location.pathname === '/admin'} />}
            </div>
          </nav>

          <div className="mt-auto pt-4">
             <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-white/5 rounded-xl transition-colors">
              <LogOut size={20} /><span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 transition-all duration-300 print:ml-0 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-600 p-2 rounded-lg hover:bg-slate-100"><Menu size={24} /></button>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-sm">M</div>
                <span className="font-black text-slate-900 tracking-tighter text-lg hidden sm:inline">MY TOOTH <span className="text-blue-600">SYSTEM</span></span>
             </div>
          </div>

          <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 leading-none">{currentUser?.name}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {isClient ? 'Cirurgião-Dentista' : (currentUser?.sector || 'Gestão')}
                  </span>
              </div>
              <Link to="/profile" className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors overflow-hidden">
                  {currentUser?.name.charAt(0)}
              </Link>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 flex-1">{children}</div>
      </main>
    </div>
  );
};
