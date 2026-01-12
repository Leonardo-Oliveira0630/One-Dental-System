
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole, UserCommissionSetting } from '../../types';
import { Edit, DollarSign, X, Loader2, Save } from 'lucide-react';

export const CommissionsTab = () => {
  const { allUsers, jobTypes, updateUser } = useApp();
  const [configUser, setConfigUser] = useState<User | null>(null);
  const [tempCommissions, setTempCommissions] = useState<UserCommissionSetting[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommChange = (jobTypeId: string, value: string, type: 'FIXED' | 'PERCENTAGE') => {
    const val = parseFloat(value) || 0;
    setTempCommissions(prev => {
        const exists = prev.find(p => p.jobTypeId === jobTypeId);
        if (exists) return prev.map(p => p.jobTypeId === jobTypeId ? { ...p, value: val, type } : p);
        return [...prev, { jobTypeId, value: val, type }];
    });
  };

  const saveCommissions = async () => {
      if (configUser) {
          setIsSubmitting(true);
          try {
            await updateUser(configUser.id, { commissionSettings: tempCommissions });
            setConfigUser(null);
            alert("Comissões salvas!");
          } catch(e: any) { alert("Erro ao salvar."); } finally { setIsSubmitting(false); }
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Ganhos por Técnico</h3>
          <p className="text-sm text-slate-500 mb-6">Configure quanto o técnico recebe por cada serviço finalizado.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
                  <div key={user.id} className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 transition-all bg-slate-50 group">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-blue-600 shadow-sm">{user.name.charAt(0)}</div>
                          <div className="overflow-hidden">
                              <p className="font-bold text-slate-800 truncate">{user.name}</p>
                              <p className="text-[10px] bg-white border px-1.5 py-0.5 rounded font-bold uppercase w-fit">{user.role}</p>
                          </div>
                      </div>
                      <button onClick={() => { setConfigUser(user); setTempCommissions(user.commissionSettings || []); }} className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2">
                        <Edit size={14}/> Definir Ganhos
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {configUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">Tabela: {configUser.name}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase">Configure os valores</p>
                      </div>
                      <button onClick={() => setConfigUser(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {jobTypes.map(type => {
                          const setting = tempCommissions.find(s => s.jobTypeId === type.id);
                          return (
                              <div key={type.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="flex-1">
                                      <p className="font-bold text-slate-800">{type.name}</p>
                                      <p className="text-xs text-slate-400">Base: R$ {type.basePrice.toFixed(2)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <input type="number" value={setting?.value || ''} onChange={e => handleCommChange(type.id, e.target.value, setting?.type || 'PERCENTAGE')} placeholder="0" className="w-20 px-2 py-1.5 border rounded-lg font-bold text-center" />
                                      <select value={setting?.type || 'PERCENTAGE'} onChange={e => handleCommChange(type.id, (setting?.value || 0).toString(), e.target.value as any)} className="bg-white border rounded-lg px-2 py-1.5 text-xs font-bold">
                                          <option value="PERCENTAGE">%</option>
                                          <option value="FIXED">R$</option>
                                      </select>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  <div className="p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
                      <button onClick={() => setConfigUser(null)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                      <button onClick={saveCommissions} disabled={isSubmitting} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg flex items-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> SALVAR</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
