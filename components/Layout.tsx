import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, List, Calendar, ShoppingBag, 
  LogOut, Menu, UserCircle, ShoppingCart, 
  Inbox, PlusCircle, Layers, Users, X, AlertOctagon, Shield,
  Contact, CalendarRange, Crown, Handshake, ChevronsUpDown, Tag, Lock, Ticket, Settings, DollarSign, Package, Inbox as InboxIcon
} from 'lucide-react';
import { UserRole } from '../types';
import { GlobalScanner } from './Scanner';
import { PrintOverlay } from './PrintOverlay';

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

  const isClient = currentUser?.role === UserRole.CLIENT;
  const isManager = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;
  
  // Contagem de pedidos aguardando aprovação
  const pendingOrdersCount = jobs.filter(j => j.status === 'WAITING_APPROVAL' as any).length;

  const bgClass = isClient ? 'bg-store-900' : 'bg-lab-900';
  const logoColor = isClient ? 'text-store-600' : 'text-lab-600';

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <GlobalScanner />
      <PrintOverlay />
      
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
              <span className="text-lg font-bold tracking-tight">ONE DENTAL</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/70 hover:text-white"><X size={24} /></button>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            {!isClient && currentUser?.role !== UserRole.SUPER_ADMIN && (
              <>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" icon={<LayoutDashboard size={20} />} label="Visão Geral" active={location.pathname === '/dashboard'} />
                
                {isManager && (
                  <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-orders" icon={<InboxIcon size={20} />} label="Pedidos Web" active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />
                )}

                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-job" icon={<PlusCircle size={20} />} label="Novo Caso" active={location.pathname === '/new-job'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Trabalhos" active={location.pathname === '/jobs'} />
                
                {isManager && (
                   <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/job-types" icon={<Package size={20} />} label="Catálogo" active={location.pathname === '/job-types'} />
                )}

                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/commissions" icon={<DollarSign size={20} />} label="Comissões" active={location.pathname === '/commissions'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/calendar" icon={<Calendar size={20} />} label="Produção" active={location.pathname === '/calendar'} />
              </>
            )}

            {isClient && (
              <>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store" icon={<ShoppingBag size={20} />} label="Loja Virtual" active={location.pathname === '/store'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label="Meus Pedidos" active={location.pathname === '/jobs'} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/cart" icon={<ShoppingCart size={20} />} label="Carrinho" active={location.pathname === '/cart'} badge={cart.length} />
              </>
            )}

            <div className="pt-8 mt-8 border-t border-white/10">
              <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/profile" icon={<UserCircle size={20} />} label="Perfil" active={location.pathname === '/profile'} />
              {isManager && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/admin" icon={<Settings size={20} />} label="Configurações" active={location.pathname === '/admin'} />}
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
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
             <span className="font-bold text-slate-800">ONE DENTAL</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 rounded-lg hover:bg-slate-100"><Menu size={24} /></button>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 flex-1">{children}</div>
      </main>
    </div>
  );
};