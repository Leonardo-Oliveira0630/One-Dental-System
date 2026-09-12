import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Building2, Users, Stethoscope, DollarSign, Wallet, Crown, Copy, Check, ShieldCheck, Briefcase, Box, Ticket 
} from 'lucide-react';

export const AdminLayout = () => {
  const { currentOrg, currentPlan, currentUser } = useApp();
  const [copied, setCopied] = React.useState(false);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isFreeLab = currentOrg?.orgType === 'LAB' && (currentOrg?.planId === 'free_lab' || currentPlan?.id === 'free_lab' || currentPlan?.features?.isLabFreeStoreOnly === true);
  const hasPerm = (key: string) => isAdmin || currentUser?.permissions?.includes(key as any);

  const copyOrgId = () => {
    if (currentOrg?.id) {
      navigator.clipboard.writeText(currentOrg.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems = [
    { to: '/admin/organizacao', icon: <Building2 size={16} />, label: 'Marca', show: isAdmin },
    { to: '/admin/setores', icon: <Briefcase size={16} />, label: 'Setores', show: !isFreeLab && hasPerm('sectors:view') },
    { to: '/admin/caixas', icon: <Box size={16} />, label: 'Caixas', show: !isFreeLab && hasPerm('boxes:view') },
    { to: '/admin/equipe', icon: <Users size={16} />, label: 'Equipe', show: !isFreeLab && hasPerm('users:view') },
    { to: '/admin/clientes', icon: <Stethoscope size={16} />, label: 'Clientes', show: !isFreeLab && hasPerm('clients:view') },
    { to: '/admin/comissoes', icon: <DollarSign size={16} />, label: 'Ganhos', show: !isFreeLab && hasPerm('commissions:view') },
    { to: '/admin/pagamentos', icon: <Wallet size={16} />, label: 'Banco', show: hasPerm('finance:view') },
    { to: '/admin/assinatura', icon: <Crown size={16} />, label: 'Plano', show: isAdmin },
    { to: '/admin/cupons', icon: <Ticket size={16} />, label: 'Cupons', show: isAdmin },
  ].filter(item => item.show);

  return (
    <div className="space-y-4 md:space-y-6 pb-12 animate-in fade-in duration-500 max-w-full overflow-x-hidden">
      {/* HEADER ID */}
      <div className="bg-slate-900 text-white p-4 md:p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl mx-2 md:mx-0">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          {currentOrg?.logoUrl ? (
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden border-2 border-white/20 shrink-0">
               <img src={currentOrg.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-2xl shrink-0">
              {currentOrg?.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold truncate">{currentOrg?.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-slate-400 font-mono text-xs">
              <span className="hidden sm:inline">ID:</span>
              <span className="bg-white/10 px-2 py-0.5 rounded truncate">{currentOrg?.id}</span>
              <button onClick={copyOrgId} className="p-1 hover:text-white transition-colors">
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>
        <div className="w-full md:w-auto bg-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40">
          <Crown size={14} /> Plano {currentPlan?.name || '---'}
        </div>
      </div>

      {/* TABS NAVIGATION: Responsive, touch-scrollable pill bar for tablet, mobile & desktop */}
      <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-white dark:bg-[#131B2A] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth mx-2 md:mx-0">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-4 md:py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 bg-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* SUB-PAGES CONTENT */}
      <div className="px-2 md:px-0">
        <Outlet />
      </div>
    </div>
  );
};