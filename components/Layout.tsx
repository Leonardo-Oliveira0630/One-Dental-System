
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Logo, LogoIcon } from './Logo';
import { 
  LayoutDashboard, List, Calendar, ShoppingBag, 
  LogOut, Menu, UserCircle, ShoppingCart, 
  PlusCircle, Layers, X, Building, Table,
  Contact, CalendarRange, Crown, Handshake, ChevronsUpDown, Settings, DollarSign, Package, Inbox as InboxIcon, Activity, Stethoscope, Globe, Bell, Ticket, Truck, WifiOff, RefreshCw, Home, Search, Camera, Briefcase, LayoutGrid, Users, Wallet, FileText, AlertTriangle, BookOpen, HelpCircle, ShieldCheck, ClipboardList, Cpu
, ChevronLeft, MessageSquare, Columns, Sun, Moon} from 'lucide-react';
import { UserRole, PermissionKey } from '../types';
import { GlobalScanner, ManualScannerInput } from './Scanner';
import { PrintOverlay } from './PrintOverlay';
import { AlertPopup } from './AlertSystem';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { JobSearch } from './JobSearch';
import * as firestorePkg from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { getOrganizationBySlug, subscribeSupplierConversations } from '../services/firebaseService';
import { SupportChatWidget } from './SupportChatWidget';

const { onSnapshotsInSync } = firestorePkg as any;

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { t } = useTranslation();
  const { 
    currentUser, logout, cart, jobs, currentOrg, currentPlan,
    userConnections, activeOrganization, switchActiveOrganization,
    theme, toggleTheme
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isLabSelectorOpen, setIsLabSelectorOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOverduePopup, setShowOverduePopup] = useState(false);
  const [storeOrg, setStoreOrg] = useState<any>(null);
  const [unreadSupplierChatCount, setUnreadSupplierChatCount] = useState(0);

  useEffect(() => {
    if (!currentOrg?.id || currentOrg?.orgType !== 'SUPPLIER') {
      setUnreadSupplierChatCount(0);
      return;
    }
    const unsub = subscribeSupplierConversations(currentOrg.id, true, (convs) => {
      const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCountSupplier || 0), 0);
      setUnreadSupplierChatCount(totalUnread);
    });
    return () => unsub();
  }, [currentOrg?.id, currentOrg?.orgType]);

  const pathParts = location.pathname.split('/');
  const storeSlug = pathParts[1] === 'store' && pathParts[2] ? pathParts[2] : null;

  useEffect(() => {
    if (!storeSlug) {
      setStoreOrg(null);
      return;
    }
    getOrganizationBySlug(storeSlug)
      .then(org => {
        if (org) {
          setStoreOrg(org);
        }
      })
      .catch(err => {
        console.error("Erro ao obter org do catálogo na layout:", err);
      });
  }, [storeSlug]);

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
  const isClinic = currentOrg?.orgType === 'CLINIC';
  const isBuyer = (isClient || currentOrg?.orgType === 'LAB_OUTSOURCED') && !isSupplier;
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const isLab = !isClient && !isSupplier && !isClinic && (currentOrg?.orgType === 'LAB' || !currentOrg?.orgType);
  const isFreeLab = currentOrg?.orgType === 'LAB' && (currentOrg?.planId === 'free_lab' || currentPlan?.id === 'free_lab' || currentPlan?.features?.isLabFreeStoreOnly === true);
  
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
    jobs.filter(j => 
      j.status === 'WAITING_APPROVAL' as any && 
      !j.isComboPurchase && 
      !(j.items && j.items.some((item: any) => item.isVoucherCombo === true))
    ).length
  , [jobs]);

  const { onlineRequisitions } = useApp();
  const pendingRequisitionsCount = React.useMemo(() => 
    (onlineRequisitions || []).filter(r => r.status === 'PENDING').length
  , [onlineRequisitions]);

  const bgClass = 'bg-[#0F172A]';
  
  const handleLogout = () => { logout(); navigate('/login'); };
  const isStoreRoute = location.pathname.startsWith("/store") || location.pathname.startsWith("/cart");

  const isViewingLabContext = isBuyer && (location.pathname.startsWith('/store') || location.pathname.startsWith('/jobs') || location.pathname.startsWith('/cart'));
  
  const displayBrand = React.useMemo(() => {
    if (storeSlug && storeOrg) {
      return { 
        name: storeOrg.name, 
        logo: storeOrg.logoUrl, 
        sub: storeOrg.orgType === 'SUPPLIER' ? t('navigation.partnerSupplier', 'Fornecedor Parceiro') : t('navigation.partnerLab', 'Laboratório Parceiro') 
      };
    }
    return isViewingLabContext && activeOrganization 
      ? { name: activeOrganization.name, logo: activeOrganization.logoUrl, sub: t('navigation.partnerLab', 'Laboratório Parceiro') } 
      : { name: currentOrg?.name || 'Labprox', logo: currentOrg?.logoUrl, sub: isClient ? t('navigation.myClinic', 'Minha Clínica') : currentOrg?.orgType === 'LAB_OUTSOURCED' ? t('navigation.outsourcedLab', 'Laboratório Terceirizado') : 'Labprox SYSTEM' };
  }, [isViewingLabContext, activeOrganization, currentOrg, isClient, storeSlug, storeOrg, t]);

  if (location.pathname === '/helpdesk') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen print:min-h-0 flex print:block bg-slate-50 print:bg-white font-sans relative overflow-x-hidden print:overflow-visible w-full">
      <GlobalScanner />
      <PrintOverlay />
      <AlertPopup />
      <PWAInstallPrompt />
      
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none flex flex-col items-center gap-2 mt-4 px-4 print:hidden">
          {isOffline && (
            <div className="bg-orange-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 pointer-events-auto max-w-full">
                <WifiOff size={16} />
                <span className="text-[10px] font-black uppercase tracking-tight truncate">{t('common.offlineMode', 'Modo Offline Ativo')}</span>
            </div>
          )}
          {isSyncing && !isOffline && (
            <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 animate-pulse pointer-events-auto">
                <RefreshCw size={12} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-tight">{t('common.syncing', 'Sincronizando...')}</span>
            </div>
          )}
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`fixed inset-y-0 left-0 z-[70] ${bgClass} text-white transform transition-all duration-300 ease-in-out print:hidden ${
        isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-64'
      } ${isSidebarHovered ? 'md:w-64' : 'md:w-20'} overflow-x-hidden group/sidebar`}>
        <div className="p-4 h-full flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar w-64">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              {displayBrand.logo ? (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={displayBrand.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                displayBrand.name.toUpperCase() === 'Labprox' ? (
                  <LogoIcon size={40} className="shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-[#0F4C81] rounded-xl flex items-center justify-center shrink-0 shadow-lg font-black text-white text-xl">
                    {displayBrand.name.charAt(0)}
                  </div>
                )
              )}
              <div className="flex flex-col min-w-0 opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">
                {displayBrand.name.toUpperCase() === 'Labprox' ? (
                  <span className="text-sm font-black tracking-tight leading-none truncate uppercase text-white">
                    Lab<span className="text-[#00B8D9]">prox</span>
                  </span>
                ) : (
                  <span className="text-xs font-black tracking-tight leading-none truncate uppercase text-white">{displayBrand.name}</span>
                )}
                <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-1 uppercase truncate">{displayBrand.sub}</span>
              </div>
            </div>
            <div className="flex items-center">{isStoreRoute && (<button onClick={() => setIsMobileMenuOpen(false)} className="hidden md:flex text-white/70 hover:bg-white/10 rounded-lg p-1 items-center justify-center shrink-0 transition-colors"><ChevronLeft size={24} /></button>)}<button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/70 hover:bg-white/10 rounded-lg p-1 shrink-0 transition-colors"><X size={24} /></button></div>
          </div>

          {isBuyer && (
             <div className="mb-6 px-2 relative shrink-0 opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 px-2 truncate">{t('navigation.activeLab', 'Laboratório Ativo')}</p>
                <button 
                   onClick={() => setIsLabSelectorOpen(!isLabSelectorOpen)}
                   className="w-full flex items-center justify-between gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 group"
                >
                   <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                         {activeOrganization?.logoUrl ? (
                           <img src={activeOrganization.logoUrl} alt="Lab Logo" className="w-full h-full object-contain" />
                         ) : (
                           <Building size={16} className="text-indigo-500" />
                         )}
                      </div>
                      <span className="font-bold text-sm truncate">{activeOrganization?.name || t('navigation.selectLab', 'Selecione...')}</span>
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
                   </div>
                )}
             </div>
          )}

          <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar pr-2">
            {currentUser ? (
              <>
                {isSuperAdmin && (
                  <>
                    <SidebarItem to="/superadmin" icon={<LayoutDashboard size={20} />} label={t('navigation.homeMaster', 'Home Master')} active={location.pathname === '/superadmin'} />
                    <SidebarItem to="/superadmin/nfc" icon={<Cpu size={20} />} label={t('navigation.manageNfc', 'Gerenciar Kits NFC')} active={location.pathname === '/superadmin/nfc'} />
                    <SidebarItem to="/superadmin/plans" icon={<Crown size={20} />} label={t('navigation.plans', 'Planos')} active={location.pathname === '/superadmin/plans'} />
                    <SidebarItem to="/superadmin/coupons" icon={<Ticket size={20} />} label={t('navigation.coupons', 'Cupons')} active={location.pathname === '/superadmin/coupons'} />
                    <SidebarItem to="/superadmin/subscriptions" icon={<Users size={20} />} label={t('navigation.subscriptions', 'Assinaturas')} active={location.pathname === '/superadmin/subscriptions'} />
                    <SidebarItem to="/superadmin/categories" icon={<LayoutGrid size={20} />} label={t('navigation.categories', 'Categorias (Store)')} active={location.pathname === '/superadmin/categories'} />
                    <SidebarItem to="/superadmin/finance" icon={<DollarSign size={20} />} label={t('navigation.saasFinance', 'Financeiro SaaS')} active={location.pathname === '/superadmin/finance'} />
                    <SidebarItem to="/superadmin/whatsapp" icon={<MessageSquare size={20} />} label={t('navigation.whatsappTemplates', 'Modelos WhatsApp')} active={location.pathname === '/superadmin/whatsapp'} />
                    <SidebarItem to="/superadmin/tutorials" icon={<BookOpen size={20} />} label={t('navigation.manageTutorials', 'Gerenciar Tutoriais')} active={location.pathname === '/superadmin/tutorials'} />
                    <SidebarItem to="/superadmin/helpdesk" icon={<ShieldCheck size={20} />} label={t('navigation.supportAgents', 'Agentes de Atendimento')} active={location.pathname === '/superadmin/helpdesk'} />
                    <SidebarItem to="/superadmin/resets" icon={<AlertTriangle size={20} />} label={t('navigation.labResets', 'Reset de Laboratórios')} active={location.pathname === '/superadmin/resets'} />
                    <SidebarItem to="/superadmin/bio" icon={<Globe size={20} />} label={t('navigation.bioPage', 'Página da Bio')} active={location.pathname === '/superadmin/bio'} />
                  </>
                )}

                {!isSuperAdmin && isPastDue ? (
                  <>
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                      <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">{t('auth.accessBlocked', 'Acesso Bloqueado')}</p>
                      <p className="text-[10px] text-slate-400">{t('auth.accessBlockedDesc', 'Regularize sua assinatura ou período de testes no menu abaixo para liberar as funcionalidades.')}</p>
                    </div>
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/admin/assinatura" icon={<Settings size={20} />} label={t('navigation.subscriptions', 'Faturas / Assinatura')} active={location.pathname === '/admin/assinatura'} />
                    <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/profile" icon={<UserCircle size={20} />} label={t('navigation.profile', 'Meu Perfil')} active={location.pathname === '/profile'} />
                  </>
                ) : (
                  <>
                    {isSupplier && (
                      <>
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/dashboard" icon={<LayoutDashboard size={20} />} label={t('dashboard.title', 'Painel de Pedidos')} active={location.pathname === '/supplier/dashboard' && !location.search.includes('view=finance')} />
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/dashboard?view=finance" icon={<DollarSign size={20} />} label={t('navigation.supplierFinance', 'Financeiro & Faturamento')} active={location.pathname === '/supplier/dashboard' && location.search.includes('view=finance')} />
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/chat" icon={<MessageSquare size={20} />} label={t('navigation.chat', 'Mensagens de Clientes')} active={location.pathname === '/supplier/chat'} badge={unreadSupplierChatCount > 0 ? unreadSupplierChatCount : undefined} />
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/products" icon={<Package size={20} />} label={t('common.products', 'Meus Produtos')} active={location.pathname === '/supplier/products'} />
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/coupons" icon={<Ticket size={20} />} label={t('navigation.coupons', 'Cupons')} active={location.pathname === '/supplier/coupons'} />
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/supplier/settings" icon={<Settings size={20} />} label={t('navigation.settings', 'Configurações')} active={location.pathname === '/supplier/settings'} />
                      </>
                    )}

                    {!isSupplier && !isBuyer && !isSuperAdmin && (
                      <>
                        {!isFreeLab ? (
                          <>
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" icon={<LayoutDashboard size={20} />} label={t('navigation.dashboard', 'Dashboard')} active={location.pathname === '/dashboard'} />
                            {hasPerm('finance:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/finance" icon={<DollarSign size={20} />} label={t('navigation.clinicFinance', 'Financeiro')} active={location.pathname === '/lab/finance'} />}
                            {hasPerm('receipts:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/receipts" icon={<FileText size={20} />} label={t('navigation.receipts', 'Recibos')} active={location.pathname === '/lab/receipts'} />}
                            {hasPerm('commissions:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/commissions" icon={<Wallet size={20} />} label={t('navigation.commissions', 'Comissões')} active={location.pathname === '/commissions'} />}
                            {hasPerm('catalog:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-orders" icon={<InboxIcon size={20} />} label={t('navigation.incomingOrders', 'Pedidos Web')} active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />}
                            {hasPerm('clients:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-requisitions" icon={<ClipboardList size={20} />} label={t('navigation.incomingRequisitions', 'Requisições Online')} active={location.pathname === '/incoming-requisitions'} badge={pendingRequisitionsCount} />}
                            {hasPerm('clients:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/dentists" icon={<Stethoscope size={20} />} label={t('navigation.clients', 'Clientes')} active={location.pathname === '/lab/dentists'} />}
                            {hasPerm('catalog:prices_view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/price-tables" icon={<Table size={20} />} label={t('navigation.priceTables', 'Tabelas de Preços')} active={location.pathname === '/lab/price-tables'} />}
                            {hasPerm('inventory:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/inventory" icon={<Package size={20} />} label={t('navigation.inventory', 'Inventário')} active={location.pathname === '/lab/inventory'} />}
                            {hasPerm('store_suppliers:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store" icon={<ShoppingBag size={20} />} label={t('navigation.store', 'Loja Online')} active={location.pathname === '/store'} />}
                            {hasPerm('logistics:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/logistics" icon={<Truck size={20} />} label={t('navigation.logistics', 'Entregas')} active={location.pathname === '/lab/logistics'} />}
                            
                            <div className="pt-2 mt-2 border-t border-white/5 opacity-50"></div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-4 mb-1 truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{t('navigation.production', 'Produção')}</p>
                            {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-job" icon={<PlusCircle size={20} />} label={t('navigation.newJob', 'Novo Caso')} active={location.pathname === '/new-job'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label={t('navigation.jobs', 'Trabalhos')} active={location.pathname === '/jobs'} />}
                            {hasPerm('jobs:create') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/new-budget" icon={<PlusCircle size={20} />} label={t('navigation.newBudget', 'Novo Orçamento')} active={location.pathname === '/new-budget'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/budgets" icon={<FileText size={20} />} label={t('navigation.budgets', 'Orçamentos')} active={location.pathname === '/budgets'} />}
                            {hasPerm('vip:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/promised" icon={<Crown size={20} />} label={t('navigation.vipProduction', 'Produção VIP')} active={location.pathname === '/promised'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/kanban" icon={<Columns size={20} />} label={t('navigation.kanban', 'Kanban')} active={location.pathname === '/lab/kanban'} />}
                            {hasPerm('calendar:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/calendar" icon={<Calendar size={20} />} label={t('navigation.productionCalendar', 'Calendário')} active={location.pathname === '/calendar'} />}
                            {hasPerm('catalog:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/job-types" icon={<Package size={20} />} label={t('navigation.services', 'Serviços')} active={location.pathname === '/job-types'} />}
                            {hasPerm('jobs:view') && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/reports" icon={<FileText size={20} />} label={t('navigation.reports', 'Relatórios')} active={location.pathname === '/reports'} />}
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/tutorials" icon={<HelpCircle size={20} />} label={t('navigation.helpdesk', 'Central de Ajuda')} active={location.pathname === '/tutorials'} />
                          </>
                        ) : (
                          <>
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/finance" icon={<DollarSign size={20} />} label={t('navigation.clinicFinance', 'Financeiro')} active={location.pathname === '/lab/finance'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/incoming-orders" icon={<InboxIcon size={20} />} label={t('navigation.incomingOrders', 'Pedidos Web')} active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/jobs" icon={<List size={20} />} label={t('navigation.jobs', 'Trabalhos')} active={location.pathname === '/jobs'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/job-types" icon={<Package size={20} />} label={t('navigation.services', 'Serviços')} active={location.pathname === '/job-types'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/lab/logistics" icon={<Truck size={20} />} label={t('navigation.logistics', 'Entregas')} active={location.pathname === '/lab/logistics'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store" icon={<ShoppingBag size={20} />} label={t('navigation.store', 'Loja Online')} active={location.pathname === '/store'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/tutorials" icon={<HelpCircle size={20} />} label={t('navigation.helpdesk', 'Central de Ajuda')} active={location.pathname === '/tutorials'} />
                          </>
                        )}
                      </>
                    )}

                    {isBuyer && (
                      <>
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/store" icon={<ShoppingBag size={20} />} label={t('navigation.store', 'Loja Online')} active={location.pathname === '/store'} />
                        
                        {currentOrg?.orgType === 'CLINIC' && (
                          <>
                            <div className="pt-4 mt-4 border-t border-white/5 opacity-50"></div>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-4 mb-2 truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{t('navigation.myClinic', 'Minha Clínica')}</p>
                            
                            {(!currentPlan || currentPlan.features.hasClinicModule) && (
                              <>
                                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/schedule" icon={<CalendarRange size={20} />} label={t('navigation.schedule', 'Agenda')} active={location.pathname === '/schedule'} />
                                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/finance" icon={<Wallet size={20} />} label={t('navigation.clinicFinance', 'Financeiro')} active={location.pathname === '/clinic/finance'} />
                                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/rooms" icon={<LayoutGrid size={20} />} label={t('navigation.rooms', 'Salas')} active={location.pathname === '/clinic/rooms'} />
                                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/dentists" icon={<Users size={20} />} label={t('navigation.clinicalStaff', 'Corpo Clínico')} active={location.pathname === '/clinic/dentists'} />
                              </>
                            )}
                            
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/patients" icon={<Contact size={20} />} label={t('navigation.patients', 'Pacientes')} active={location.pathname === '/patients'} />
                            
                            {(!currentPlan || currentPlan.features.hasClinicModule) && (
                              <>
                                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/services" icon={<Briefcase size={20} />} label={t('navigation.myServices', 'Meus Serviços')} active={location.pathname === '/clinic/services'} />
                                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic/inventory" icon={<Package size={20} />} label={t('navigation.clinicInventory', 'Estoque (Insumos)')} active={location.pathname === '/clinic/inventory'} />
                              </>
                            )}
                          </>
                        )}
                        
                        <div className="pt-4 mt-4 border-t border-white/5 opacity-50"></div>
                        {isBuyer && (
                          <>
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/dentist/cases" icon={<Briefcase size={20} />} label={t('navigation.myCases', 'Meus Casos')} active={location.pathname === '/dentist/cases' || location.pathname === '/my-cases'} />
                            <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/requisitions" icon={<ClipboardList size={20} />} label={t('navigation.incomingRequisitions', 'Requisições Online')} active={location.pathname === '/requisitions'} />
                          </>
                        )}
                        <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/tutorials" icon={<HelpCircle size={20} />} label={t('navigation.helpdesk', 'Central de Ajuda')} active={location.pathname === '/tutorials'} />
                      </>
                    )}

                    <div className="pt-8 mt-8 border-t border-white/10 shrink-0">
                      <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/profile" icon={<UserCircle size={20} />} label={t('navigation.profile', 'Perfil')} active={location.pathname === '/profile'} />
                      {currentOrg?.orgType === 'CLINIC' && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/clinic-settings" icon={<Settings size={20} />} label={t('navigation.settings', 'Configurações')} active={location.pathname === '/clinic-settings'} />}
                      {((currentOrg?.orgType !== 'LAB_OUTSOURCED' && currentOrg?.orgType !== 'CLINIC' && !isSupplier && (isAdmin || hasPerm('users:view') || hasPerm('clients:view') || hasPerm('sectors:view') || hasPerm('boxes:view') || hasPerm('finance:view') || hasPerm('commissions:view'))) || isFreeLab) && <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to="/admin" icon={<Settings size={20} />} label={t('navigation.settings', 'Configurar Lab')} active={location.pathname.startsWith('/admin')} />}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-[9px] font-black text-[#00B8D9] uppercase tracking-widest px-4 mb-2 truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{t('navigation.visitorMenu', 'Menu do Visitante')}</p>
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to={location.pathname} icon={<ShoppingBag size={20} />} label={t('navigation.catalog', 'Catálogo')} active={true} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} icon={<UserCircle size={20} />} label={t('navigation.login', 'Fazer Login')} active={false} />
                <SidebarItem onClick={() => setIsMobileMenuOpen(false)} to={`/register-lab?redirect=${encodeURIComponent(location.pathname + location.search)}`} icon={<PlusCircle size={20} />} label={t('navigation.createAccount', 'Criar Conta')} active={false} />
              </>
            )}
          </nav>

          {currentUser && (
            <div className="mt-auto pt-4 shrink-0">
               <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-white/5 rounded-xl transition-colors">
                <LogOut size={20} className="shrink-0" /><span className="opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{t('navigation.logout', 'Sair')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Default Mobile Header */}
      {!isStoreRoute && (
          <header className={`fixed top-0 right-0 left-0 mobile-header-light bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 z-[50] md:hidden print:hidden transition-all duration-300`}>
             <div className="flex items-center gap-3 overflow-hidden">
                 {!isMobileMenuOpen && (
                   <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 rounded-lg active:bg-slate-100 transition-colors shrink-0"><Menu size={24} /></button>
                 )}
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
                     type="button"
                     onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
                     className="p-2 rounded-lg text-slate-600 hover:text-blue-600 active:bg-slate-100 transition-colors"
                     title={t('navigation.scanner', 'Escanear Código com Câmera')}
                   >
                     <Camera size={20} />
                   </button>
                 )}
                 {!isBuyer && (
                   <button 
                     onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                     className={`p-2 rounded-lg transition-colors ${isMobileSearchOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
                   >
                     {isMobileSearchOpen ? <X size={22} /> : <Search size={22} />}
                   </button>
                 )}
                 {currentUser ? (
                   <button 
                     onClick={toggleTheme}
                     className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                     title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                     aria-label="Alternar Tema"
                   >
                     {theme === 'dark' ? <Sun size={19} className="text-amber-500" /> : <Moon size={19} className="text-slate-600" />}
                   </button>
                 ) : null}
                 {currentUser ? (
                   <Link to="/profile" className="w-8 h-8 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 font-black text-xs shrink-0">
                     {currentUser.name?.charAt(0) || 'U'}
                   </Link>
                 ) : (
                   <Link to="/login" className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all text-xs shadow-sm">
                     {t('auth.login', 'Entrar')}
                   </Link>
                 )}
             </div>
          </header>
      )}

      {/* Store Header */}
      {isStoreRoute && (
         <header id="store-top-header" className={`fixed top-0 right-0 app-header-light force-light bg-white border-b border-slate-200 min-h-16 px-2 md:px-4 pb-0 mb-0 mr-0 flex flex-col md:flex-row md:items-center justify-between z-[50] ${isSidebarHovered ? 'left-0 md:left-64' : 'left-0 md:left-20'} print:hidden transition-all duration-300`}>
           <div className="flex items-center justify-between px-2 md:px-0 h-14 md:h-16 shrink-0 w-full md:w-auto border-b border-slate-100 md:border-none">
               <div className="flex items-center gap-2 shrink-0">
                   {!isMobileMenuOpen && (
                       <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 -ml-2 rounded-lg active:bg-slate-100 transition-colors shrink-0 md:hidden"><Menu size={24} /></button>
                   )}
                   <div className="flex items-center gap-2 overflow-visible">
                      <Logo size={120} variant="colored" />
                   </div>
               </div>
               
               <div className="flex items-center gap-2 shrink-0 md:hidden">
                   <button 
                     onClick={toggleTheme}
                     className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shadow-sm"
                     title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                     aria-label="Alternar Tema"
                   >
                     {theme === 'dark' ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-slate-600" />}
                   </button>
                   {currentUser ? (
                       <Link to="/profile" className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                         {currentUser.name?.charAt(0) || 'U'}
                       </Link>
                   ) : (
                       <Link to="/login" className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs shadow-sm">
                         {t('auth.login', 'Entrar')}
                       </Link>
                   )}
               </div>
           </div>
           
           <div id="store-header-portal" className="flex-1 flex justify-center items-center py-2 md:p-0 min-h-[48px] overflow-hidden w-full md:w-auto bg-transparent"></div>
           
           <div className="hidden md:flex items-center gap-3 shrink-0 px-2 lg:px-4">
               <button 
                 onClick={toggleTheme}
                 className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shadow-sm"
                 title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                 aria-label="Alternar Tema"
               >
                 {theme === 'dark' ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-slate-600" />}
               </button>
               {currentUser ? (
                   <Link to="/profile" className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-md hover:scale-105 transition-transform">
                     {currentUser.name?.charAt(0) || 'U'}
                   </Link>
               ) : (
                   <Link to="/login" className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs shadow-sm">
                     {t('auth.login', 'Entrar')}
                   </Link>
               )}
           </div>
         </header>
      )}

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#131B2A] border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-50 md:hidden pb-[env(safe-area-inset-bottom)] print:hidden">
          <MobileNavItem to={isFreeLab ? "/lab/finance" : "/dashboard"} icon={<Home size={22}/>} label={t('navigation.home', 'Home')} active={isFreeLab ? location.pathname === '/lab/finance' : location.pathname === '/dashboard'} />
          
          {!isBuyer ? (
            <>
              <MobileNavItem to="/jobs" icon={<List size={22}/>} label={t('navigation.jobs', 'OS')} active={location.pathname === '/jobs'} />
              <div className="relative -top-5">
                 <button 
                    id="btn-mobile-bottom-camera-scanner"
                    type="button"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('open-scanner')); 
                    }} 
                    className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-300 dark:shadow-blue-900/40 border-4 border-white dark:border-[#131B2A] active:scale-90 transition-transform cursor-pointer"
                    title={t('navigation.scanner', 'Ler Código de Barras (Ficha A4)')}
                    aria-label={t('navigation.scanner', 'Ler Código de Barras da Ficha A4')}
                 >
                    <Camera size={28}/>
                 </button>
              </div>
              <MobileNavItem to="/incoming-orders" icon={<InboxIcon size={22}/>} label={t('navigation.incomingOrders', 'Web')} active={location.pathname === '/incoming-orders'} badge={pendingOrdersCount} />
            </>
          ) : currentOrg?.orgType === 'LAB_OUTSOURCED' ? (
            <>
              <MobileNavItem to="/store" icon={<ShoppingBag size={22}/>} label={t('navigation.store', 'Loja')} active={location.pathname === '/store'} />
            </>
          ) : (
            <>
              {(!currentPlan || currentPlan.features.hasClinicModule) ? (
                <>
                  <MobileNavItem to="/schedule" icon={<CalendarRange size={22}/>} label={t('navigation.schedule', 'Agenda')} active={location.pathname === '/schedule'} />
                  <div className="relative -top-5">
                     <Link to="/clinic/finance" className="w-14 h-14 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-teal-300 dark:shadow-teal-900/40 border-4 border-white dark:border-[#131B2A] active:scale-90 transition-transform">
                        <Wallet size={28}/>
                     </Link>
                  </div>
                  <MobileNavItem to="/clinic/rooms" icon={<LayoutGrid size={22}/>} label={t('navigation.rooms', 'Salas')} active={location.pathname === '/clinic/rooms'} />
                </>
              ) : (
                <>
                  <MobileNavItem to="/store" icon={<ShoppingBag size={22}/>} label={t('navigation.store', 'Loja')} active={location.pathname === '/store'} />
                  <div className="relative -top-5">
                     <Link to="/patients" className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-300 dark:shadow-indigo-900/40 border-4 border-white dark:border-[#131B2A] active:scale-90 transition-transform">
                        <Contact size={28}/>
                     </Link>
                  </div>
                </>
              )}
            </>
          )}
          
          <MobileNavItem to="/profile" icon={<UserCircle size={22}/>} label={t('navigation.profile', 'Perfil')} active={location.pathname === '/profile'} />
      </nav>

      <main style={{ marginTop: '-38px' }} className={`flex-1 bg-white dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 transition-all duration-300 print:hidden flex flex-col min-h-screen overflow-x-hidden relative ${isSidebarHovered ? 'md:ml-64' : 'md:ml-20'}`}>
        <header 
          id="app-top-header"
          style={{ paddingTop: '0px', paddingBottom: '0px', marginBottom: '0px', marginTop: '37px' }}
          className={`${isStoreRoute ? "hidden" : "hidden md:flex"} app-header-light bg-white border-b border-slate-200 h-16 items-center justify-between px-4 lg:px-8 sticky top-0 z-30 print:hidden shrink-0 gap-2 sm:gap-4`}
        >
          <div className="flex items-center gap-2 overflow-hidden shrink-0">
             <Logo size={100} imgStyle={{ width: '100px', height: '100px' }} variant="colored" />
          </div>

          <div className="flex-1 max-w-xl mx-2 lg:mx-6">
            <JobSearch />
          </div>

          {isLab && (
            <div className="shrink-0 flex items-center">
              <ManualScannerInput />
            </div>
          )}

          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shadow-sm"
                title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                aria-label="Alternar Tema"
              >
                {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-600" />}
              </button>

              <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-black text-slate-800 leading-none uppercase truncate max-w-[120px] lg:max-w-[160px]">{currentUser?.name}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[120px] lg:max-w-[160px]">
                      {isClient ? t('auth.iAmDentist', 'Cirurgião-Dentista') : currentOrg?.orgType === 'LAB_OUTSOURCED' ? t('navigation.outsourcedLab', 'Lab Terceirizado') : (currentUser?.sector || t('navigation.adminAccess', 'Acesso Administrativo'))}
                  </span>
              </div>
              <Link to="/profile" className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md hover:scale-105 transition-transform shrink-0">{currentUser?.name?.charAt(0) || 'U'}</Link>
          </div>
        </header>

        <div className={`${isStoreRoute ? "mt-[104px] md:mt-[104px] px-0 pb-24 md:pb-0 max-w-full" : "mt-[104px] md:mt-[40px] px-4 pb-24 md:px-8 md:pb-8 max-w-[1400px]"} w-full mx-auto print:mt-0 print:p-0 flex-1 flex flex-col overflow-x-hidden overflow-y-auto relative`}>
          {isClinicPendingApproval() ? (
            <div className="flex-1 flex items-center justify-center py-12 px-4">
              <div className="bg-white rounded-3xl p-4 sm:p-8 max-w-xl w-full shadow-xl border border-teal-50 text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-teal-500/10">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">{t('auth.accountUnderReview', 'Conta em Análise')}</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                  {t('auth.accountUnderReviewDesc', 'Para sua segurança e conformidade regulatória, todos os cadastros de dentistas passam por verificação de registro profissional (CRO).')}
                </p>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 mb-6">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                    <Stethoscope size={14} className="text-teal-600" /> {t('auth.croReported', 'Registro Informado')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('auth.croUf', 'Estado')}</span>
                      <span className="text-sm font-black text-slate-700">{currentOrg?.croUf || 'N/A'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50 col-span-2">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('auth.croNumber', 'Inscrição CRO')}</span>
                      <span className="text-sm font-black text-slate-700">{currentOrg?.croNumero || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('auth.croCategory', 'Categoria')}</span>
                      <span className="text-sm font-black text-slate-700">{currentOrg?.croCategoria || 'CD'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/50 flex flex-col justify-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('auth.apiStatus', 'Status API')}</span>
                      <span className={`text-xs font-bold ${currentOrg?.croValid ? 'text-emerald-300' : 'text-amber-500'}`}>
                        {currentOrg?.croValid ? t('auth.validatedPublic', 'Validado Público') : t('auth.waitingReview', 'Aguardando Análise')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 text-amber-800 text-xs p-4 rounded-xl mb-8 leading-relaxed text-left border border-amber-100 font-medium">
                  <strong>{t('auth.pendingHomologation', 'Pendente de Homologação')}:</strong> {t('auth.pendingHomologationDesc', 'Detectamos que seu registro profissional necessita de uma aprovação ou verificação adicional. Nossa equipe de Administração de Super Admin foi notificada e está analisando sua conta.')}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="flex-grow py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} /> {t('auth.refreshStatus', 'Atualizar Status')}
                  </button>
                  <button 
                    onClick={handleLogout} 
                    className="flex-grow py-3 bg-slate-150 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> {t('auth.exitApp', 'Sair do App')}
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
                       <div className="bg-white rounded-3xl p-4 sm:p-8 max-w-md w-full shadow-2xl text-center border border-red-100 animate-in zoom-in">
                          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                             <AlertTriangle size={32} />
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 mb-2">{t('auth.subscriptionRequired', 'Assinatura Necessária')}</h2>
                          <p className="text-slate-500 mb-6 font-medium">{t('auth.subscriptionRequiredDesc', 'Sua conta de laboratório ou período de testes está com restrição. Para regularizar, acesse o menu de assinatura para visualizar e efetuar o pagamento da fatura gerada no Asaas.')}</p>
                          <div className="flex gap-3">
                            <button onClick={() => setShowOverduePopup(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                               {t('common.close', 'Fechar')}
                            </button>
                            <button onClick={() => { setShowOverduePopup(false); navigate('/admin/assinatura'); }} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30">
                               {t('auth.viewSubscription', 'Ver Assinatura')}
                            </button>
                          </div>
                       </div>
                    </div>
                  )}
                </>
              )}
              {children}
              <SupportChatWidget />
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
  <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group ${ active ? 'bg-gradient-to-r from-[#00B8D9]/15 to-[#00B8D9]/5 text-[#00B8D9] font-semibold border-l-4 border-[#00B8D9] pl-3' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200' }`} title={label}>
    <span className={`shrink-0 transition-colors ${active ? 'text-[#00B8D9]' : 'text-slate-400 group-hover:text-slate-200'}`}>{icon}</span>
    <span className="text-sm truncate opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute right-4 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg animate-pulse opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-300">{badge}</span>
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
