import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Building2, Users, Stethoscope, DollarSign, Wallet, Crown, Copy, Check, ShieldCheck, Briefcase, Box 
} from 'lucide-react';

export const AdminLayout = () => {
  const { currentOrg, currentPlan } = useApp();
  const [copied, setCopied] = React.useState(false);

  const copyOrgId = () => {
    if (currentOrg?.id) {
      navigator.clipboard.writeText(currentOrg.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems = [
    { to: '/admin/organizacao', icon: <Building2 size={16} />, label: 'Marca' },
    { to: '/admin/setores', icon: <Briefcase size={16} />, label: 'Setores' },
    { to: '/admin/caixas', icon: <Box size={16} />, label: 'Caixas' },
    { to: '/admin/equipe', icon: <Users size={16} />, label: 'Equipe' },
    { to: '/admin/clientes', icon: <Stethoscope size={16} />, label: 'Clientes' },
    { to: '/admin/comissoes', icon: <DollarSign size={16} />, label: 'Ganhos' },
    { to: '/admin/pagamentos', icon: <Wallet size={16} />, label: 'Banco' },
    { to: '/admin/assinatura', icon: <Crown size={16} />, label: 'Plano' },
  ];

  return (
    <div className="space-y-4 md:space-y-6 pb-12 animate-in fade-in duration-500 max-w-full overflow-x-hidden">
      {/* HEADER ID */}
      <div className="bg-slate-900 text-white p-4 md:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl mx-2 md:mx-0">
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

      {/* TABS NAVIGATION: Grid on mobile, Flex on desktop to avoid horizontal scroll */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-row bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mx-2 md:mx-0">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-sm font-bold transition-all border-b-2 md:border-b-0 md:border-r border-slate-100 last:border-r-0 ${
                isActive 
                  ? 'text-blue-600 border-blue-600 bg-blue-50/50 md:bg-blue-50/30' 
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`
            }
          >
            {/* Fix: Use the render prop pattern to correctly access the isActive state for sub-elements and avoid type errors */}
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
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