import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Search, Plus, Phone, Mail, Building, FileText } from 'lucide-react';

export const Dentists: React.FC = () => {
  const { manualDentists, allUsers } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const allClients = [...manualDentists, ...allUsers.filter(u => u.role === 'CLIENT')];

  const filtered = allClients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.clinicName && c.clinicName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dentistas & Clientes</h1>
          <p className="text-xs text-slate-500 font-bold">Cadastro de cirurgiões-dentistas e clínicas parceiras</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar cliente por nome ou clínica..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center font-black text-sm">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-slate-900 truncate">{c.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold truncate">{c.clinicName || 'Consultório Particular'}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-500 font-semibold">
              {c.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {c.phone}</div>}
              {c.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {c.email}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
