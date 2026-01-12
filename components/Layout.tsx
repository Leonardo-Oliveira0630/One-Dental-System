
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, List, Calendar, ShoppingBag, 
  LogOut, Menu, UserCircle, ShoppingCart, 
  Inbox, PlusCircle, Layers, Users, X, AlertOctagon, Shield,
  Contact, CalendarRange, Crown, Handshake, ChevronsUpDown, Tag, Lock, Ticket, Settings, DollarSign, Package, Inbox as InboxIcon, Activity, Building, Briefcase, Stethoscope, Globe
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
  
  // Helper para verificar permissão rápida
  const hasPerm = (key: PermissionKey) => {
      if (isAdmin || isSuperAdmin) return true;
      return currentUser?.permissions?.includes(key) || false;
  };

  const pendingOrdersCount = jobs.filter(j => j.status === 'WAITING_APPROVAL' as any).length;
  const bgClass = isSuperAdmin ? 'bg-slate-950' : (isClient ? 'bg-indigo-900' : 'bg-slate-900');
  const logoColor = isSuperAdmin ? 'text-amber-500' : (isClient ? 'text-indigo-500' : 'text-blue-500');

  const handleLogout = () => { logout(); navigate('/'); };

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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className={`font-bold text-xl ${logoColor}`}>O</span>
              </div>
              <span className="text-lg font-bold tracking-tight">One Dental</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/70 hover:text-white"><X size={24} /></button>
          </div>

          {/* SAAS ADMIN SELECTOR INFO */}
          {isSuperAdmin && (
             <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Painel de Controle</p>
                <p className="text-sm font-bold text-amber-200">SaaS Master Admin</p>
             </div>
          )}

          {/* DENTIST LAB SELECTOR */}
          {isClient && (
             <div className="mb-6 px-2 relative">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 px-2">Laboratório Ativo</p>
                <button 
                   onClick={() => setIsLabSelectorOpen(!isLabSelectorOpen)}
                   className="w-full flex items-center justify-between gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 group"
                >
                   <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                         <Building size={16} />
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
            {/* SUPER ADMIN MENU */}
            {isSuperAdmin && (
              <>
                <SidebarItem to="/superadmin" icon={<LayoutDashboard size={20} />} label="Home Master" active={location.pathname === '/superadmin'} />
                <SidebarItem to="/superadmin/plans" icon={<Crown size={20} />} label="Gerenciar Planos" active={location.pathname === '/superadmin/plans'} />
                <SidebarItem to="/superadmin/coupons" icon={<Ticket size={20} />} label="Cupons & Ofertas" active={location.pathname === '/superadmin/coupons'} />
                <div className="pt-4 mt-4 border-t border-white/5 opacity-50"></div>
                <SidebarItem to="/dashboard" icon={<Globe size={20} />} label="Ver como Lab" active={location.pathname === '/dashboard'} />
              </>
            )}

            {/* LAB MENU */}
            {!isClient && !isSuperAdmin && (
              <>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" icon={<LayoutDashboard size={20} />} label="Visão Geral" active={location.pathname === '/dashboard'} />
                
                {hasPerm('finance:view') && (
                  <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/finance" icon={<DollarSign size={20} />} label="Financeiro" active={location.pathname === '/lab/finance'} />
                )}

                {hasPerm('catalog:manage') && (
                   <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-orders" icon={<InboxIcon size={20} />} label="Pedidos Web" active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />
                )}
                
                {hasPerm('clients:manage') && (
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/dentists" icon={<Stethoscope size={20} />} label="Meus Clientes" active={location.pathname === '/lab/dentists'} />
                )}

                {hasPerm('jobs:create') && (
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-job" icon={<PlusCircle size={20} />} label="Novo Caso" active={location.pathname === '/new-job'} />
                )}

                {hasPerm('jobs:view') && (
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Trabalhos" active={location.pathname === '/jobs'} />
                )}
                
                {hasPerm('catalog:manage') && (
                   <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/job-types" icon={<Package size={20} />} label="Serviços" active={location.pathname === '/job-types'} />
                )}

                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/promised" icon={<Activity size={20} />} label="Produção VIP" active={location.pathname === '/promised'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/calendar" icon={<Calendar size={20} />} label="Calendário" active={location.pathname === '/calendar'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/commissions" icon={<DollarSign size={20} />} label="Comissões" active={location.pathname === '/commissions'} />
              </>
            )}

            {/* DENTIST MENU */}
            {isClient && (
              <>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store" icon={<ShoppingBag size={20} />} label="Fazer Pedido" active={location.pathname === '/store'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Meus Pedidos" active={location.pathname === '/jobs'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/cart" icon={<ShoppingCart size={20} />} label="Carrinho" active={location.pathname === '/cart'} badge={cart.length} />
                <div className="pt-4 mt-4 border-t border-white/5 opacity-50"></div>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/patients" icon={<Contact size={20} />} label="Pacientes" active={location.pathname === '/patients'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/schedule" icon={<CalendarRange size={20} />} label="Agenda" active={location.pathname === '/schedule'} />
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
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-2">
             <div className={`w-8 h-8 ${isSuperAdmin ? 'bg-slate-900' : (isClient ? 'bg-indigo-600' : 'bg-blue-600')} rounded-lg flex items-center justify-center text-white font-bold`}>O</div>
             <span className="font-bold text-slate-800">One Dental</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 rounded-lg hover:bg-slate-100"><Menu size={24} /></button>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 flex-1">{children}</div>
      </main>
    </div>
  );
};
