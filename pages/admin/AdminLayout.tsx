
import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Building2, Users, Stethoscope, DollarSign, Wallet, Crown, Copy, Check, ShieldCheck 
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
    { to: '/admin/setores', icon: <Building2 size={18} />, label: 'Setores' },
    { to: '/admin/equipe', icon: <Users size={18} />, label: 'Equipe' },
    { to: '/admin/clientes', icon: <Stethoscope size={18} />, label: 'Clientes' },
    { to: '/admin/comissoes', icon: <DollarSign size={18} />, label: 'Comissões' },
    { to: '/admin/pagamentos', icon: <Wallet size={18} />, label: 'Pagamentos' },
    { to: '/admin/assinatura', icon: <Crown size={18} />, label: 'Assinatura' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* HEADER ID */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold">{currentOrg?.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-slate-400 font-mono text-sm">
            <span>ID do Laboratório:</span>
            <span className="bg-white/10 px-2 py-0.5 rounded select-all">{currentOrg?.id}</span>
            <button onClick={copyOrgId} className="p-1 hover:text-white transition-colors">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <div className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Crown size={14} /> Plano {currentPlan?.name || '---'}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-white rounded-t-xl px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap border-b-2 ${
                isActive 
                  ? 'text-blue-600 border-blue-600 bg-blue-50/30' 
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* SUB-PAGES CONTENT */}
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
};
