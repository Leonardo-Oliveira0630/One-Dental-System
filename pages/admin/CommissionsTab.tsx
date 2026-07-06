
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
    setTempCommissions(prev => {
        let jobSetting = prev.find(p => p.jobTypeId === jobTypeId);
        
        if (value === '') {
            if (jobSetting && jobSetting.variationSettings && Object.keys(jobSetting.variationSettings).length > 0) {
                // Keep the setting but remove root value
                const { value: _, ...rest } = jobSetting;
                return prev.map(p => p.jobTypeId === jobTypeId ? { ...rest, type } : p);
            } else {
                return prev.filter(p => p.jobTypeId !== jobTypeId);
            }
        }

        const val = parseFloat(value) || 0;
        if (jobSetting) return prev.map(p => p.jobTypeId === jobTypeId ? { ...p, value: val, type } : p);
        return [...prev, { jobTypeId, value: val, type }];
    });
  };

  const handleVariationCommChange = (jobTypeId: string, variationId: string, value: string, type: 'FIXED' | 'PERCENTAGE') => {
      setTempCommissions(prev => {
          let jobSetting = prev.find(p => p.jobTypeId === jobTypeId);
          
          if (!jobSetting) {
              jobSetting = { jobTypeId, type: 'FIXED', variationSettings: {} };
          } else {
              jobSetting = { ...jobSetting, variationSettings: { ...(jobSetting.variationSettings || {}) } };
          }
          
          if (value === '') {
              if (jobSetting.variationSettings) {
                  delete jobSetting.variationSettings[variationId];
              }
              // If no root value and no variation settings, remove entirely
              if (jobSetting.value === undefined && (!jobSetting.variationSettings || Object.keys(jobSetting.variationSettings).length === 0)) {
                  return prev.filter(p => p.jobTypeId !== jobTypeId);
              }
          } else {
              const val = parseFloat(value) || 0;
              if (!jobSetting.variationSettings) jobSetting.variationSettings = {};
              jobSetting.variationSettings[variationId] = { value: val, type };
          }
          
          if (!prev.find(p => p.jobTypeId === jobTypeId)) {
              return [...prev, jobSetting];
          }
          return prev.map(p => p.jobTypeId === jobTypeId ? jobSetting : p);
      });
  };

  const saveCommissions = async () => {
      if (configUser) {
          setIsSubmitting(true);
          try {
            // This will use direct update if the current user is an admin of the same org,
            // ensuring that the 'type' field (FIXED/PERCENTAGE) is saved correctly without
            // being stripped by the cloud function.
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
                          <p className="text-xs text-slate-500 font-bold uppercase">Deixe em branco para usar a comissão base do serviço</p>
                      </div>
                      <button onClick={() => setConfigUser(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {jobTypes.map(type => {
                          const setting = tempCommissions.find(s => s.jobTypeId === type.id);
                          return (
                              <div key={type.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-3">
                                  <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                          <p className="font-bold text-slate-800">{type.name}</p>
                                          <div className="flex gap-2">
                                            <p className="text-xs text-slate-400">Base: R$ {type.basePrice.toFixed(2)}</p>
                                            {type.baseCommission !== undefined && (
                                                <p className="text-xs text-indigo-500 font-bold text-right mt-1 w-full flex justify-end gap-1"><span className="text-slate-400 font-normal mt-0.5">Comissão Base:</span> R$ {type.baseCommission.toFixed(2)}</p>
                                            )}
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <input type="number" step="0.01" value={setting?.value === undefined ? '' : setting.value} onChange={e => handleCommChange(type.id, e.target.value, setting?.type || 'FIXED')} placeholder={type.baseCommission ? `${type.baseCommission.toFixed(2)}` : "0"} className="w-24 px-2 py-1.5 border rounded-lg font-bold text-center" />
                                          <select value={setting?.type || 'FIXED'} onChange={e => handleCommChange(type.id, setting?.value?.toString() || '', e.target.value as any)} className="bg-white border rounded-lg px-2 py-1.5 text-xs font-bold">
                                              <option value="PERCENTAGE">%</option>
                                              <option value="FIXED">R$</option>
                                          </select>
                                      </div>
                                  </div>
                                  {type.variationGroups && type.variationGroups.length > 0 && (
                                      <div className="pl-4 border-l-2 border-slate-200 space-y-2 mt-2">
                                          <p className="text-xs font-bold text-slate-500 uppercase">Comissão Específica por Variação (Substitui raiz)</p>
                                          {type.variationGroups.map(group => (
                                              <div key={group.id} className="space-y-1">
                                                  <p className="text-xs font-bold text-slate-400">{group.name}</p>
                                                  {group.options.map(opt => {
                                                      const vSetting = setting?.variationSettings?.[opt.id];
                                                      return (
                                                          <div key={opt.id} className="flex items-center justify-between py-1">
                                                              <p className="text-sm text-slate-600">{opt.name}</p>
                                                              <div className="flex items-center gap-2">
                                                                  <input type="number" step="0.01" value={vSetting?.value === undefined ? '' : vSetting.value} onChange={e => handleVariationCommChange(type.id, opt.id, e.target.value, vSetting?.type || 'FIXED')} placeholder="0" className="w-20 px-2 py-1 border rounded font-bold text-center text-xs" />
                                                                  <select value={vSetting?.type || 'FIXED'} onChange={e => handleVariationCommChange(type.id, opt.id, vSetting?.value?.toString() || '', e.target.value as any)} className="bg-white border rounded px-1 py-1 text-[10px] font-bold">
                                                                      <option value="PERCENTAGE">%</option>
                                                                      <option value="FIXED">R$</option>
                                                                  </select>
                                                              </div>
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          ))}
                                      </div>
                                  )}
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
