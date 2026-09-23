import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { User, UserRole, UserCommissionSetting } from '../../types';
import { Edit, DollarSign, X, Loader2, Save, Settings } from 'lucide-react';

export const CommissionsTab = () => {
  const { t } = useTranslation();
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
              if (jobSetting.value === undefined && (!jobSetting.variationSettings || Object.keys(jobSetting.variationSettings).length === 0) && (!jobSetting.stageSettings || Object.keys(jobSetting.stageSettings).length === 0)) {
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

  const handleStageCommChange = (jobTypeId: string, stageKey: string, value: string, type: 'FIXED' | 'PERCENTAGE') => {
      setTempCommissions(prev => {
          let jobSetting = prev.find(p => p.jobTypeId === jobTypeId);
          
          if (!jobSetting) {
              jobSetting = { jobTypeId, type: 'FIXED', stageSettings: {} };
          } else {
              jobSetting = { ...jobSetting, stageSettings: { ...(jobSetting.stageSettings || {}) } };
          }
          
          if (value === '') {
              if (jobSetting.stageSettings) {
                  delete jobSetting.stageSettings[stageKey];
              }
              if (jobSetting.value === undefined && (!jobSetting.variationSettings || Object.keys(jobSetting.variationSettings).length === 0) && (!jobSetting.stageSettings || Object.keys(jobSetting.stageSettings).length === 0)) {
                  return prev.filter(p => p.jobTypeId !== jobTypeId);
              }
          } else {
              const val = parseFloat(value) || 0;
              if (!jobSetting.stageSettings) jobSetting.stageSettings = {};
              jobSetting.stageSettings[stageKey] = { value: val, type };
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
            await updateUser(configUser.id, { commissionSettings: tempCommissions });
            setConfigUser(null);
            alert(t('admin.commissions.saveSuccess', "Comissões salvas!"));
          } catch(e: any) { alert(t('admin.commissions.saveError', "Erro ao salvar.")); } finally { setIsSubmitting(false); }
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">{t('admin.commissions.title', 'Ganhos por Técnico')}</h3>
          <p className="text-sm text-slate-500 mb-6">{t('admin.commissions.subtitle', 'Configure quanto o técnico recebe por cada serviço finalizado e por etapas concluídas.')}</p>
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
                        <Edit size={14}/> {t('admin.commissions.defineEarnings', 'Definir Ganhos')}
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {configUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
                  {/* HEADER */}
                  <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                              <DollarSign size={22} />
                          </div>
                          <div className="min-w-0">
                              <h3 className="text-lg sm:text-xl font-black text-slate-800 leading-tight truncate">{t('admin.commissions.table', 'Tabela:')} {configUser.name}</h3>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">{t('admin.commissions.leaveBlank', 'Deixe em branco para usar a comissão base do serviço')}</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setConfigUser(null)} 
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors shrink-0 ml-2"
                      >
                          <X size={20}/>
                      </button>
                  </div>

                  {/* BODY */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                      {jobTypes.map(type => {
                          const setting = tempCommissions.find(s => s.jobTypeId === type.id);
                          return (
                              <div key={type.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-3">
                                  <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                          <p className="font-bold text-slate-800">{type.name}</p>
                                          <div className="flex gap-2">
                                            <p className="text-xs text-slate-400">{t('admin.commissions.base', 'Base:')} R$ {type.basePrice.toFixed(2)}</p>
                                            {type.baseCommission !== undefined && (
                                                <p className="text-xs text-indigo-500 font-bold text-right mt-1 w-full flex justify-end gap-1"><span className="text-slate-400 font-normal mt-0.5">{t('admin.commissions.baseCommission', 'Comissão Base:')}</span> R$ {type.baseCommission.toFixed(2)}</p>
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
                                          <p className="text-xs font-bold text-slate-500 uppercase">{t('admin.commissions.specificVariation', 'Comissão Específica por Variação (Substitui raiz)')}</p>
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

                      {jobTypes.some(type => type.sectorStages && Object.keys(type.sectorStages).some(sectorName => (type.sectorStages?.[sectorName] || []).length > 0)) && (
                          <div className="mt-8 pt-6 border-t border-slate-200">
                              <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                  <Settings size={18} className="text-slate-400" />
                                  {t('admin.commissions.stageCommission', 'Comissão por Etapas de Serviço')}
                              </h4>
                              <div className="space-y-4">
                                  {jobTypes.map(type => {
                                      if (!type.sectorStages || !Object.keys(type.sectorStages).some(sectorName => (type.sectorStages?.[sectorName] || []).length > 0)) return null;
                                      const setting = tempCommissions.find(s => s.jobTypeId === type.id);
                                      return (
                                          <div key={`stage-comm-${type.id}`} className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 space-y-3">
                                              <p className="font-bold text-indigo-900">{type.name}</p>
                                              
                                              {Object.entries(type.sectorStages).map(([sectorName, stagesList]) => {
                                                  if (!stagesList || stagesList.length === 0) return null;
                                                  return (
                                                      <div key={sectorName} className="space-y-2">
                                                          <p className="text-[11px] font-black text-indigo-500 uppercase tracking-wider">{sectorName}</p>
                                                          <div className="grid grid-cols-1 gap-2">
                                                              {stagesList.map(stageName => {
                                                                  const stageKey = `${sectorName}:${stageName}`;
                                                                  const stSetting = setting?.stageSettings?.[stageKey];
                                                                  return (
                                                                      <div key={stageName} className="flex items-center justify-between py-2 bg-white px-3 rounded-xl border border-indigo-100/50 shadow-sm">
                                                                          <span className="text-xs font-bold text-slate-700">{stageName}</span>
                                                                          <div className="flex items-center gap-2">
                                                                              <input 
                                                                                  type="number" 
                                                                                  step="0.01" 
                                                                                  value={stSetting?.value === undefined ? '' : stSetting.value} 
                                                                                  onChange={e => handleStageCommChange(type.id, stageKey, e.target.value, stSetting?.type || 'FIXED')} 
                                                                                  placeholder="0" 
                                                                                  className="w-20 px-2 py-1 border rounded font-bold text-center text-xs focus:ring-indigo-500 focus:border-indigo-500" 
                                                                              />
                                                                              <select 
                                                                                  value={stSetting?.type || 'FIXED'} 
                                                                                  onChange={e => handleStageCommChange(type.id, stageKey, stSetting?.value?.toString() || '', e.target.value as any)} 
                                                                                  className="bg-slate-50 border rounded px-1 py-1 text-[10px] font-bold focus:ring-indigo-500 focus:border-indigo-500"
                                                                              >
                                                                                  <option value="PERCENTAGE">%</option>
                                                                                  <option value="FIXED">R$</option>
                                                                              </select>
                                                                          </div>
                                                                      </div>
                                                                  );
                                                              })}
                                                          </div>
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}
                  </div>
                  {/* FOOTER */}
                  <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end items-center gap-3 shrink-0">
                      <button 
                          type="button"
                          onClick={() => setConfigUser(null)} 
                          className="w-full sm:w-auto px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all text-sm text-center"
                      >
                          {t('common.cancel', 'Cancelar')}
                      </button>
                      <button 
                          type="button"
                          onClick={saveCommissions} 
                          disabled={isSubmitting} 
                          className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                      >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16}/> {t('common.save', 'SALVAR')}</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
