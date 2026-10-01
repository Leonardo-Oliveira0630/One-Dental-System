import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { Plus, Edit, Trash2, MapPin, Layers, X, RefreshCw } from 'lucide-react';
import * as api from '../../services/firebaseService';
import { Sector, JobType } from '../../types';

export const SectorsTab = () => {
  const { t } = useTranslation();
  const { 
    sectors, addSector, updateSector, deleteSector, currentOrg,
    jobTypes, updateJobType, commissionGroups, updateCommissionGroup, allUsers, updateUser 
  } = useApp();
  const [newSectorName, setNewSectorName] = useState('');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [newStageInputs, setNewStageInputs] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // Sincronizar e remover automaticamente etapas órfãs que já foram excluídas dos setores no passado
  useEffect(() => {
    if (!sectors || sectors.length === 0) return;

    const cleanupOrphanStages = async () => {
      try {
        // 1. Limpar Tipos de Serviço (JobTypes)
        if (jobTypes && jobTypes.length > 0 && updateJobType) {
          for (const jt of jobTypes) {
            if (!jt.sectorStages && !jt.stageQuantities) continue;
            let changed = false;
            const cleanedSectorStages: Record<string, string[]> = {};
            const cleanedStageQuantities: Record<string, Record<string, number>> = {};

            if (jt.sectorStages) {
              Object.entries(jt.sectorStages).forEach(([secName, stList]) => {
                const sec = sectors.find(s => s.name === secName);
                const activeStages = sec?.stages || [];
                const valid = (stList || []).filter(st => activeStages.includes(st));
                if (valid.length > 0) {
                  cleanedSectorStages[secName] = valid;
                }
                if (valid.length !== (stList || []).length || !sec) {
                  changed = true;
                }
              });
            }

            if (jt.stageQuantities) {
              Object.entries(jt.stageQuantities).forEach(([secName, qMap]) => {
                const sec = sectors.find(s => s.name === secName);
                const activeStages = sec?.stages || [];
                const newQMap: Record<string, number> = {};
                Object.entries(qMap || {}).forEach(([stKey, qty]) => {
                  if (activeStages.includes(stKey)) {
                    newQMap[stKey] = qty;
                  } else {
                    changed = true;
                  }
                });
                if (Object.keys(newQMap).length > 0) {
                  cleanedStageQuantities[secName] = newQMap;
                }
              });
            }

            if (changed) {
              const payload: Partial<JobType> = {
                sectorStages: cleanedSectorStages
              };
              if (Object.keys(cleanedStageQuantities).length > 0) {
                payload.stageQuantities = cleanedStageQuantities;
              }
              await updateJobType(jt.id, payload);
            }
          }
        }

        // 2. Limpar Grupos de Comissão (Ganhos)
        if (commissionGroups && commissionGroups.length > 0 && updateCommissionGroup) {
          for (const grp of commissionGroups) {
            let groupChanged = false;
            const currentSettings = grp.settings || (grp as any).commissionSettings || [];
            const newSettings = currentSettings.map(setting => {
              if (setting.stageSettings) {
                const copySt: Record<string, any> = {};
                let stChanged = false;
                Object.entries(setting.stageSettings).forEach(([k, v]) => {
                  const parts = k.split(':');
                  const secName = parts.length > 1 ? parts[0] : '';
                  const stgName = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
                  const sec = secName ? sectors.find(s => s.name === secName) : sectors.find(s => (s.stages || []).includes(stgName));
                  if (sec && (sec.stages || []).includes(stgName)) {
                    copySt[k] = v;
                  } else {
                    stChanged = true;
                  }
                });
                if (stChanged) {
                  groupChanged = true;
                  return { ...setting, stageSettings: copySt };
                }
              }
              return setting;
            });

            if (groupChanged) {
              await updateCommissionGroup(grp.id, { settings: newSettings });
            }
          }
        }

        // 3. Limpar Usuários Individuais (Ganhos)
        if (allUsers && allUsers.length > 0 && updateUser) {
          for (const u of allUsers) {
            let userChanged = false;
            const currentSettings = u.commissionSettings || [];
            const newSettings = currentSettings.map(setting => {
              if (setting.stageSettings) {
                const copySt: Record<string, any> = {};
                let stChanged = false;
                Object.entries(setting.stageSettings).forEach(([k, v]) => {
                  const parts = k.split(':');
                  const secName = parts.length > 1 ? parts[0] : '';
                  const stgName = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
                  const sec = secName ? sectors.find(s => s.name === secName) : sectors.find(s => (s.stages || []).includes(stgName));
                  if (sec && (sec.stages || []).includes(stgName)) {
                    copySt[k] = v;
                  } else {
                    stChanged = true;
                  }
                });
                if (stChanged) {
                  userChanged = true;
                  return { ...setting, stageSettings: copySt };
                }
              }
              return setting;
            });

            if (userChanged) {
              await updateUser(u.id, { commissionSettings: newSettings });
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar etapas órfãs:', err);
      }
    };

    cleanupOrphanStages();
  }, [sectors.length]);

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectorName.trim()) {
      await addSector(newSectorName.trim());
      setNewSectorName('');
    }
  };

  const handleUpdateSector = async () => {
    if (!editingSector || !currentOrg) return;
    await api.apiUpdateSector(currentOrg.id, editingSector.id, { name: editingSector.name });
    setEditingSector(null);
  };

  const handleAddStage = async (sectorId: string, currentStages: string[] = []) => {
    const stageName = (newStageInputs[sectorId] || '').trim();
    if (!stageName) return;
    if (currentStages.includes(stageName)) {
      alert(t('admin.sectors.stageAlreadyExists', 'Esta etapa já está cadastrada para este setor.'));
      return;
    }
    const updatedStages = [...currentStages, stageName];
    if (updateSector) {
      await updateSector(sectorId, { stages: updatedStages });
    } else if (currentOrg) {
      await api.apiUpdateSector(currentOrg.id, sectorId, { stages: updatedStages });
    }
    setNewStageInputs(prev => ({ ...prev, [sectorId]: '' }));
  };

  const handleRemoveStage = async (sectorId: string, stageToRemove: string, currentStages: string[] = []) => {
    const targetSector = sectors.find(s => s.id === sectorId);
    const sectorName = targetSector?.name;

    // 1. Remover do setor
    const updatedStages = currentStages.filter(st => st !== stageToRemove);
    if (updateSector) {
      await updateSector(sectorId, { stages: updatedStages });
    } else if (currentOrg) {
      await api.apiUpdateSector(currentOrg.id, sectorId, { stages: updatedStages });
    }

    if (!sectorName) return;

    // 2. Remover dos tipos de serviço cadastrados (JobTypes)
    if (jobTypes && jobTypes.length > 0 && updateJobType) {
      for (const jt of jobTypes) {
        let changed = false;
        const newSectorStages: Record<string, string[]> = jt.sectorStages ? { ...jt.sectorStages } : {};
        const newStageQuantities: Record<string, Record<string, number>> = jt.stageQuantities ? { ...jt.stageQuantities } : {};

        if (newSectorStages[sectorName]) {
          const filtered = newSectorStages[sectorName].filter(st => st !== stageToRemove);
          if (filtered.length !== newSectorStages[sectorName].length) {
            if (filtered.length > 0) {
              newSectorStages[sectorName] = filtered;
            } else {
              delete newSectorStages[sectorName];
            }
            changed = true;
          }
        }

        if (newStageQuantities[sectorName] && newStageQuantities[sectorName][stageToRemove] !== undefined) {
          const qMap = { ...newStageQuantities[sectorName] };
          delete qMap[stageToRemove];
          if (Object.keys(qMap).length > 0) {
            newStageQuantities[sectorName] = qMap;
          } else {
            delete newStageQuantities[sectorName];
          }
          changed = true;
        }

        if (changed) {
          const payload: Partial<JobType> = {
            sectorStages: newSectorStages
          };
          if (Object.keys(newStageQuantities).length > 0) {
            payload.stageQuantities = newStageQuantities;
          }
          await updateJobType(jt.id, payload);
        }
      }
    }

    // 3. Remover dos grupos de comissões (Ganhos)
    if (commissionGroups && commissionGroups.length > 0 && updateCommissionGroup) {
      for (const grp of commissionGroups) {
        let groupChanged = false;
        const currentSettings = grp.settings || (grp as any).commissionSettings || [];
        const newSettings = currentSettings.map(setting => {
          if (setting.stageSettings) {
            const copySt = { ...setting.stageSettings };
            let stChanged = false;
            Object.keys(copySt).forEach(k => {
              if (k === `${sectorName}:${stageToRemove}` || k === stageToRemove || k.endsWith(`:${stageToRemove}`)) {
                delete copySt[k];
                stChanged = true;
              }
            });
            if (stChanged) {
              groupChanged = true;
              return { ...setting, stageSettings: copySt };
            }
          }
          return setting;
        });

        if (groupChanged) {
          await updateCommissionGroup(grp.id, { settings: newSettings });
        }
      }
    }

    // 4. Remover das configurações individuais de colaboradores (Ganhos)
    if (allUsers && allUsers.length > 0 && updateUser) {
      for (const u of allUsers) {
        let userChanged = false;
        const newSettings = (u.commissionSettings || []).map(setting => {
          if (setting.stageSettings) {
            const copySt = { ...setting.stageSettings };
            let stChanged = false;
            Object.keys(copySt).forEach(k => {
              if (k === `${sectorName}:${stageToRemove}` || k === stageToRemove || k.endsWith(`:${stageToRemove}`)) {
                delete copySt[k];
                stChanged = true;
              }
            });
            if (stChanged) {
              userChanged = true;
              return { ...setting, stageSettings: copySt };
            }
          }
          return setting;
        });

        if (userChanged) {
          await updateUser(u.id, { commissionSettings: newSettings });
        }
      }
    }
  };

  const handleDeleteSector = async (sector: Sector) => {
    if (!window.confirm(t('admin.sectors.confirmDeleteSector', `Tem certeza que deseja excluir o setor "${sector.name}"? As etapas associadas deixarão de aparecer nos tipos de serviço e na aba de ganhos.`))) return;
    
    const sectorName = sector.name;

    // Limpar das configurações de tipos de serviço
    if (sectorName && jobTypes && jobTypes.length > 0 && updateJobType) {
      for (const jt of jobTypes) {
        let changed = false;
        const newSectorStages: Record<string, string[]> = jt.sectorStages ? { ...jt.sectorStages } : {};
        const newStageQuantities: Record<string, Record<string, number>> = jt.stageQuantities ? { ...jt.stageQuantities } : {};

        if (newSectorStages[sectorName]) {
          delete newSectorStages[sectorName];
          changed = true;
        }
        if (newStageQuantities[sectorName]) {
          delete newStageQuantities[sectorName];
          changed = true;
        }

        if (changed) {
          const payload: Partial<JobType> = {
            sectorStages: newSectorStages
          };
          if (Object.keys(newStageQuantities).length > 0) {
            payload.stageQuantities = newStageQuantities;
          }
          await updateJobType(jt.id, payload);
        }
      }
    }

    // Limpar dos grupos de comissão
    if (sectorName && commissionGroups && commissionGroups.length > 0 && updateCommissionGroup) {
      for (const grp of commissionGroups) {
        let groupChanged = false;
        const currentSettings = grp.settings || (grp as any).commissionSettings || [];
        const newSettings = currentSettings.map(setting => {
          if (setting.stageSettings) {
            const copySt = { ...setting.stageSettings };
            let stChanged = false;
            Object.keys(copySt).forEach(key => {
              if (key.startsWith(`${sectorName}:`) || key === sectorName) {
                delete copySt[key];
                stChanged = true;
              }
            });
            if (stChanged) {
              groupChanged = true;
              return { ...setting, stageSettings: copySt };
            }
          }
          return setting;
        });
        if (groupChanged) {
          await updateCommissionGroup(grp.id, { settings: newSettings });
        }
      }
    }

    // Limpar de todos os usuários
    if (sectorName && allUsers && allUsers.length > 0 && updateUser) {
      for (const u of allUsers) {
        let userChanged = false;
        const newSettings = (u.commissionSettings || []).map(setting => {
          if (setting.stageSettings) {
            const copySt = { ...setting.stageSettings };
            let stChanged = false;
            Object.keys(copySt).forEach(key => {
              if (key.startsWith(`${sectorName}:`) || key === sectorName) {
                delete copySt[key];
                stChanged = true;
              }
            });
            if (stChanged) {
              userChanged = true;
              return { ...setting, stageSettings: copySt };
            }
          }
          return setting;
        });
        if (userChanged) {
          await updateUser(u.id, { commissionSettings: newSettings });
        }
      }
    }

    await deleteSector(sector.id);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4">
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">{t('admin.sectors.newSectorTitle', 'Novo Setor de Produção')}</h3>
        <form onSubmit={handleAddSector} className="flex gap-2">
          <input 
            value={newSectorName} 
            onChange={e => setNewSectorName(e.target.value)} 
            placeholder={t('admin.sectors.sectorNamePlaceholder', 'Ex: Cerâmica, Gesso, Aplicação...')} 
            className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 cursor-pointer">
            <Plus size={20}/>
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map(s => {
          const stages = s.stages || [];
          return (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><MapPin size={20}/></div>
                    {editingSector?.id === s.id ? (
                      <input 
                        value={editingSector.name} 
                        onChange={e => setEditingSector({...editingSector, name: e.target.value})} 
                        className="border-b-2 border-blue-500 outline-none px-1 font-bold text-slate-700 bg-transparent" 
                        autoFocus 
                        onBlur={handleUpdateSector} 
                        onKeyDown={e => e.key === 'Enter' && handleUpdateSector()} 
                      />
                    ) : (
                      <span className="font-black text-slate-800 text-base">{s.name}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingSector(s)} title={t('admin.sectors.editSectorTitle', 'Editar nome do setor')} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                      <Edit size={16}/>
                    </button>
                    <button onClick={() => handleDeleteSector(s)} title={t('admin.sectors.deleteSectorTitle', 'Excluir setor')} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>

                {/* Sub-categorias: Etapas do Setor */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Layers size={13} className="text-blue-500" />
                      {t('admin.sectors.stagesLabel', 'Etapas ({{count}})', { count: stages.length })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {stages.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">{t('admin.sectors.noStages', 'Nenhuma etapa cadastrada')}</span>
                    ) : (
                      stages.map((st, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                          {st}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveStage(s.id, st, stages)}
                            className="text-blue-400 hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Formulário para Adicionar Etapa */}
                  <div className="flex gap-1.5 mt-2">
                    <input 
                      type="text" 
                      placeholder={t('admin.sectors.newStagePlaceholder', '+ Nova etapa...')}
                      value={newStageInputs[s.id] || ''}
                      onChange={e => setNewStageInputs({ ...newStageInputs, [s.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStage(s.id, stages);
                        }
                      }}
                      className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleAddStage(s.id, stages)}
                      className="px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-xs transition-colors flex items-center cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
