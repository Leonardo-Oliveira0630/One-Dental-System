import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { User, UserRole, UserCommissionSetting, JobType, CommissionGroup } from '../../types';
import { 
  Edit, DollarSign, X, Loader2, Save, Settings, Search, 
  Layers, Users, Check, ArrowDownAZ, Tag, ChevronRight, CheckCircle2,
  PercentCircle, Plus, Trash2, FolderPlus, Palette, AlertCircle, Info,
  Sparkles, UserCheck, Shield, HelpCircle, ExternalLink
} from 'lucide-react';

export const GROUP_COLOR_MAP: Record<string, { bg: string; text: string; border: string; badgeBg: string; ring: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-100', ring: 'ring-blue-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-100', ring: 'ring-indigo-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-100', ring: 'ring-emerald-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-100', ring: 'ring-purple-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-100', ring: 'ring-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-100', ring: 'ring-rose-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badgeBg: 'bg-teal-100', ring: 'ring-teal-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badgeBg: 'bg-cyan-100', ring: 'ring-cyan-500' },
};

const COLOR_OPTIONS = [
  { id: 'indigo', name: 'Índigo', hex: '#6366f1' },
  { id: 'blue', name: 'Azul', hex: '#3b82f6' },
  { id: 'emerald', name: 'Verde', hex: '#10b981' },
  { id: 'purple', name: 'Roxo', hex: '#a855f7' },
  { id: 'amber', name: 'Âmbar', hex: '#f59e0b' },
  { id: 'rose', name: 'Rosa', hex: '#f43f5e' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6' },
  { id: 'cyan', name: 'Ciano', hex: '#06b6d4' },
];

// Pure helper function to update or remove service commission settings
const updateServiceSetting = (
  prev: UserCommissionSetting[],
  jobTypeId: string,
  valueStr: string,
  type: 'FIXED' | 'PERCENTAGE'
): UserCommissionSetting[] => {
  const jobSetting = prev.find(p => p.jobTypeId === jobTypeId);
  if (valueStr === '') {
    if (jobSetting && (
      (jobSetting.variationSettings && Object.keys(jobSetting.variationSettings).length > 0) ||
      (jobSetting.stageSettings && Object.keys(jobSetting.stageSettings).length > 0)
    )) {
      const { value: _, ...rest } = jobSetting;
      return prev.map(p => p.jobTypeId === jobTypeId ? { ...rest, type } : p);
    } else {
      return prev.filter(p => p.jobTypeId !== jobTypeId);
    }
  }

  const val = parseFloat(valueStr) || 0;
  if (jobSetting) {
    return prev.map(p => p.jobTypeId === jobTypeId ? { ...p, value: val, type } : p);
  }
  return [...prev, { jobTypeId, value: val, type }];
};

// Pure helper to update variation commission settings
const updateVariationSetting = (
  prev: UserCommissionSetting[],
  jobTypeId: string,
  variationId: string,
  valueStr: string,
  type: 'FIXED' | 'PERCENTAGE'
): UserCommissionSetting[] => {
  let jobSetting = prev.find(p => p.jobTypeId === jobTypeId);
  if (!jobSetting) {
    jobSetting = { jobTypeId, type: 'FIXED', variationSettings: {} };
  } else {
    jobSetting = { ...jobSetting, variationSettings: { ...(jobSetting.variationSettings || {}) } };
  }

  if (valueStr === '') {
    if (jobSetting.variationSettings) {
      delete jobSetting.variationSettings[variationId];
    }
    if (jobSetting.value === undefined &&
        (!jobSetting.variationSettings || Object.keys(jobSetting.variationSettings).length === 0) &&
        (!jobSetting.stageSettings || Object.keys(jobSetting.stageSettings).length === 0)) {
      return prev.filter(p => p.jobTypeId !== jobTypeId);
    }
  } else {
    const val = parseFloat(valueStr) || 0;
    if (!jobSetting.variationSettings) jobSetting.variationSettings = {};
    jobSetting.variationSettings[variationId] = { value: val, type };
  }

  if (!prev.find(p => p.jobTypeId === jobTypeId)) {
    return [...prev, jobSetting];
  }
  return prev.map(p => p.jobTypeId === jobTypeId ? jobSetting : p);
};

// Pure helper to update stage commission settings
const updateStageSetting = (
  prev: UserCommissionSetting[],
  jobTypeId: string,
  stageKey: string,
  valueStr: string,
  type: 'FIXED' | 'PERCENTAGE'
): UserCommissionSetting[] => {
  let jobSetting = prev.find(p => p.jobTypeId === jobTypeId);
  if (!jobSetting) {
    jobSetting = { jobTypeId, type: 'FIXED', stageSettings: {} };
  } else {
    jobSetting = { ...jobSetting, stageSettings: { ...(jobSetting.stageSettings || {}) } };
  }

  if (valueStr === '') {
    if (jobSetting.stageSettings) {
      delete jobSetting.stageSettings[stageKey];
    }
    if (jobSetting.value === undefined &&
        (!jobSetting.variationSettings || Object.keys(jobSetting.variationSettings).length === 0) &&
        (!jobSetting.stageSettings || Object.keys(jobSetting.stageSettings).length === 0)) {
      return prev.filter(p => p.jobTypeId !== jobTypeId);
    }
  } else {
    const val = parseFloat(valueStr) || 0;
    if (!jobSetting.stageSettings) jobSetting.stageSettings = {};
    jobSetting.stageSettings[stageKey] = { value: val, type };
  }

  if (!prev.find(p => p.jobTypeId === jobTypeId)) {
    return [...prev, jobSetting];
  }
  return prev.map(p => p.jobTypeId === jobTypeId ? jobSetting : p);
};

export const CommissionsTab = () => {
  const { t } = useTranslation();
  const { 
    allUsers, jobTypes, updateUser, updateJobType,
    commissionGroups, addCommissionGroup, updateCommissionGroup, deleteCommissionGroup
  } = useApp();
  
  // Navigation / View state: 'TECHNICIANS' (Por Colaborador), 'GROUPS' (Grupos de Ganhos) or 'SERVICES' (Tabela Geral de Serviços)
  const [activeView, setActiveView] = useState<'TECHNICIANS' | 'GROUPS' | 'SERVICES'>('TECHNICIANS');

  // Modal configuration state for a specific collaborator
  const [configUser, setConfigUser] = useState<User | null>(null);
  const [selectedUserGroupId, setSelectedUserGroupId] = useState<string>('');
  const [tempCommissions, setTempCommissions] = useState<UserCommissionSetting[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalServiceSearch, setModalServiceSearch] = useState('');

  // Modal configuration state for a Commission Group earnings
  const [configGroup, setConfigGroup] = useState<CommissionGroup | null>(null);
  const [tempGroupCommissions, setTempGroupCommissions] = useState<UserCommissionSetting[]>([]);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [modalGroupServiceSearch, setModalGroupServiceSearch] = useState('');

  // Group Create / Edit Meta Modal (Name, Description, Color)
  const [isGroupMetaModalOpen, setIsGroupMetaModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [groupColorInput, setGroupColorInput] = useState('indigo');
  const [isSavingGroupMeta, setIsSavingGroupMeta] = useState(false);

  // Group Deletion Confirmation
  const [deletingGroup, setDeletingGroup] = useState<CommissionGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Search and filter states for the main tabs
  const [globalServiceSearch, setGlobalServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [userGroupFilter, setUserGroupFilter] = useState<string>('ALL');
  const [groupSearch, setGroupSearch] = useState('');

  // Quick edit base commission state in SERVICES view
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null);
  const [editingBaseVal, setEditingBaseVal] = useState<string>('');
  const [isSavingBase, setIsSavingBase] = useState(false);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Sorted job types in strict alphabetical order (A-Z)
  const sortedJobTypes = useMemo(() => {
    return [...jobTypes].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [jobTypes]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    jobTypes.forEach(j => {
      if (j.category && j.category.trim()) set.add(j.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [jobTypes]);

  // Filtered job types for the main "Por Tipo de Serviço" tab
  const filteredGlobalJobTypes = useMemo(() => {
    return sortedJobTypes.filter(type => {
      const term = globalServiceSearch.toLowerCase().trim();
      const matchesSearch = !term ||
        (type.name || '').toLowerCase().includes(term) ||
        (type.category || '').toLowerCase().includes(term) ||
        (type.variationGroups || []).some(g => 
          g.name.toLowerCase().includes(term) || 
          g.options.some(opt => opt.name.toLowerCase().includes(term))
        );
      
      const matchesCat = selectedCategory === 'ALL' || type.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [sortedJobTypes, globalServiceSearch, selectedCategory]);

  // Filtered job types inside the technician configuration modal
  const filteredModalJobTypes = useMemo(() => {
    if (!modalServiceSearch.trim()) return sortedJobTypes;
    const term = modalServiceSearch.toLowerCase().trim();
    return sortedJobTypes.filter(type =>
      (type.name || '').toLowerCase().includes(term) ||
      (type.category || '').toLowerCase().includes(term)
    );
  }, [sortedJobTypes, modalServiceSearch]);

  // Filtered job types inside the group configuration modal
  const filteredModalGroupJobTypes = useMemo(() => {
    if (!modalGroupServiceSearch.trim()) return sortedJobTypes;
    const term = modalGroupServiceSearch.toLowerCase().trim();
    return sortedJobTypes.filter(type =>
      (type.name || '').toLowerCase().includes(term) ||
      (type.category || '').toLowerCase().includes(term)
    );
  }, [sortedJobTypes, modalGroupServiceSearch]);

  // Collaborators list excluding CLIENT role
  const collaboratorsList = useMemo(() => {
    return allUsers.filter(u => u.role !== UserRole.CLIENT);
  }, [allUsers]);

  // Filtered technicians based on search input & group filter
  const filteredUsers = useMemo(() => {
    let list = collaboratorsList;

    // Filter by group dropdown
    if (userGroupFilter === 'WITH_GROUP') {
      list = list.filter(u => !!u.commissionGroupId);
    } else if (userGroupFilter === 'NO_GROUP') {
      list = list.filter(u => !u.commissionGroupId);
    } else if (userGroupFilter !== 'ALL') {
      list = list.filter(u => u.commissionGroupId === userGroupFilter);
    }

    if (!userSearch.trim()) return list;
    const term = userSearch.toLowerCase().trim();
    return list.filter(u => {
      const groupName = commissionGroups.find(g => g.id === u.commissionGroupId)?.name || '';
      return (
        (u.name || '').toLowerCase().includes(term) ||
        (u.role || '').toLowerCase().includes(term) ||
        (u.sector || '').toLowerCase().includes(term) ||
        groupName.toLowerCase().includes(term)
      );
    });
  }, [collaboratorsList, userSearch, userGroupFilter, commissionGroups]);

  // Filtered groups based on search input
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return commissionGroups;
    const term = groupSearch.toLowerCase().trim();
    return commissionGroups.filter(g =>
      (g.name || '').toLowerCase().includes(term) ||
      (g.description || '').toLowerCase().includes(term)
    );
  }, [commissionGroups, groupSearch]);

  // Helper to find technicians who have a custom manual rule for a job type
  const getCustomTechniciansForJobType = (jobTypeId: string) => {
    return collaboratorsList.filter(u => {
      // If user is in a group, their rules come from group
      if (u.commissionGroupId) return false;
      const setting = u.commissionSettings?.find(s => s.jobTypeId === jobTypeId);
      return !!setting && (
        setting.value !== undefined ||
        (setting.variationSettings && Object.keys(setting.variationSettings).length > 0) ||
        (setting.stageSettings && Object.keys(setting.stageSettings).length > 0)
      );
    });
  };

  // Helper to find groups that have custom rules for a job type
  const getGroupsForJobType = (jobTypeId: string) => {
    return commissionGroups.filter(g => {
      const setting = g.settings?.find(s => s.jobTypeId === jobTypeId);
      return !!setting && (
        setting.value !== undefined ||
        (setting.variationSettings && Object.keys(setting.variationSettings).length > 0) ||
        (setting.stageSettings && Object.keys(setting.stageSettings).length > 0)
      );
    });
  };

  // Open modal for a collaborator
  const handleOpenUserModal = (user: User) => {
    setConfigUser(user);
    const groupId = user.commissionGroupId || '';
    setSelectedUserGroupId(groupId);

    if (groupId) {
      const group = commissionGroups.find(g => g.id === groupId);
      setTempCommissions(group ? [...group.settings] : (user.commissionSettings || []));
    } else {
      setTempCommissions(user.commissionSettings || []);
    }
    setModalServiceSearch('');
  };

  // Handle changing group selection in collaborator modal
  const handleGroupSelectionChange = (newGroupId: string) => {
    setSelectedUserGroupId(newGroupId);
    if (newGroupId) {
      const group = commissionGroups.find(g => g.id === newGroupId);
      if (group) {
        setTempCommissions([...group.settings]);
      }
    } else {
      // Switched to manual: maintain current settings as starting point for manual customization
      if (configUser?.commissionGroupId) {
        // Keep the group settings as cloned values for manual tweaking
        setTempCommissions(prev => [...prev]);
      } else {
        setTempCommissions(configUser?.commissionSettings || []);
      }
    }
  };

  // Save commissions for a collaborator
  const saveUserCommissions = async () => {
    if (!configUser) return;
    setIsSubmitting(true);
    try {
      if (selectedUserGroupId) {
        const group = commissionGroups.find(g => g.id === selectedUserGroupId);
        await updateUser(configUser.id, { 
          commissionGroupId: selectedUserGroupId,
          commissionSettings: group ? group.settings : tempCommissions
        });
      } else {
        await updateUser(configUser.id, { 
          commissionGroupId: null,
          commissionSettings: tempCommissions 
        });
      }
      setConfigUser(null);
      alert(t('admin.commissions.saveSuccess', "Ganhos do colaborador atualizados com sucesso!"));
    } catch(e: any) { 
      alert(t('admin.commissions.saveError', "Erro ao salvar ganhos.")); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // Open group earnings configuration modal
  const handleOpenGroupEarningsModal = (group: CommissionGroup) => {
    setConfigGroup(group);
    setTempGroupCommissions(group.settings ? [...group.settings] : []);
    setModalGroupServiceSearch('');
  };

  // Save group earnings configuration
  const saveGroupEarnings = async () => {
    if (!configGroup) return;
    setIsSubmittingGroup(true);
    try {
      await updateCommissionGroup(configGroup.id, {
        settings: tempGroupCommissions
      });
      setConfigGroup(null);
      alert(`Ganhos do grupo "${configGroup.name}" atualizados com sucesso!`);
    } catch (e: any) {
      alert("Erro ao salvar ganhos do grupo.");
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Open Group Meta Modal (Create or Edit Name/Description/Color)
  const handleOpenCreateGroupModal = () => {
    setEditingGroupId(null);
    setGroupNameInput('');
    setGroupDescInput('');
    setGroupColorInput('indigo');
    setIsGroupMetaModalOpen(true);
  };

  const handleOpenEditGroupModal = (group: CommissionGroup) => {
    setEditingGroupId(group.id);
    setGroupNameInput(group.name || '');
    setGroupDescInput(group.description || '');
    setGroupColorInput(group.color || 'indigo');
    setIsGroupMetaModalOpen(true);
  };

  // Save Group Meta (Name, Description, Color)
  const handleSaveGroupMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) {
      alert("Por favor, informe o nome do grupo.");
      return;
    }

    setIsSavingGroupMeta(true);
    try {
      if (editingGroupId) {
        await updateCommissionGroup(editingGroupId, {
          name: groupNameInput.trim(),
          description: groupDescInput.trim(),
          color: groupColorInput
        });
      } else {
        const createdId = await addCommissionGroup({
          name: groupNameInput.trim(),
          description: groupDescInput.trim(),
          color: groupColorInput,
          settings: []
        });
        // Prompt to configure earnings right away
        if (createdId) {
          const newGrp: CommissionGroup = {
            id: createdId,
            name: groupNameInput.trim(),
            description: groupDescInput.trim(),
            color: groupColorInput,
            settings: []
          };
          setIsGroupMetaModalOpen(false);
          setConfigGroup(newGrp);
          setTempGroupCommissions([]);
          setModalGroupServiceSearch('');
          return;
        }
      }
      setIsGroupMetaModalOpen(false);
    } catch (err: any) {
      alert("Erro ao salvar informações do grupo.");
    } finally {
      setIsSavingGroupMeta(false);
    }
  };

  // Confirm and execute group deletion
  const handleConfirmDeleteGroup = async () => {
    if (!deletingGroup) return;
    setIsDeletingGroup(true);
    try {
      await deleteCommissionGroup(deletingGroup.id);
      setDeletingGroup(null);
    } catch (err: any) {
      alert("Erro ao excluir grupo.");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // Quick edit base commission for JobType
  const handleSaveBaseCommission = async (typeId: string) => {
    setIsSavingBase(true);
    try {
      const val = editingBaseVal === '' ? undefined : parseFloat(editingBaseVal);
      await updateJobType(typeId, { baseCommission: val });
      setSavedSuccessId(typeId);
      setTimeout(() => setSavedSuccessId(null), 2500);
      setEditingBaseId(null);
    } catch (e: any) {
      alert("Erro ao salvar comissão base.");
    } finally {
      setIsSavingBase(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* MAIN CONTAINER */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 sm:p-6">
        
        {/* HEADER & VIEW TABS */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shadow-xs">
                <DollarSign size={22} />
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {t('admin.commissions.pageTitle', 'Ganhos e Comissões do Laboratório')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Padronize ganhos por grupos de colaboradores, personalize individualmente ou gerencie comissões base por serviço.
                </p>
              </div>
            </div>
          </div>

          {/* VIEW SWITCHER TABS */}
          <div className="inline-flex p-1.5 bg-slate-100/80 rounded-2xl shrink-0 self-start lg:self-auto border border-slate-200/50">
            {/* TAB: POR COLABORADOR */}
            <button
              type="button"
              onClick={() => setActiveView('TECHNICIANS')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                activeView === 'TECHNICIANS'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={15} />
              <span>Por Colaborador</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeView === 'TECHNICIANS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {collaboratorsList.length}
              </span>
            </button>

            {/* TAB: GRUPOS DE GANHOS */}
            <button
              type="button"
              onClick={() => setActiveView('GROUPS')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                activeView === 'GROUPS'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderPlus size={15} />
              <span>Grupos de Ganhos</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeView === 'GROUPS' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {commissionGroups.length}
              </span>
            </button>

            {/* TAB: POR TIPO DE SERVIÇO */}
            <button
              type="button"
              onClick={() => setActiveView('SERVICES')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                activeView === 'SERVICES'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={15} />
              <span>{t('admin.commissions.tabServices', 'Por Tipo de Serviço')}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeView === 'SERVICES' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {sortedJobTypes.length}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: POR COLABORADOR (TECHNICIANS) */}
        {/* ========================================================================= */}
        {activeView === 'TECHNICIANS' && (
          <div className="pt-5 space-y-5 animate-in fade-in duration-200">
            {/* TOP BAR: SEARCH & GROUP FILTER */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                {/* SEARCH INPUT */}
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Buscar por colaborador, setor, cargo ou grupo..."
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                  {userSearch && (
                    <button 
                      onClick={() => setUserSearch('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* FILTER BY GROUP */}
                <div className="w-full sm:w-auto">
                  <select
                    value={userGroupFilter}
                    onChange={e => setUserGroupFilter(e.target.value)}
                    className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="ALL">Todos os Colaboradores</option>
                    <option value="WITH_GROUP">Apenas Com Grupo Vinculado</option>
                    <option value="NO_GROUP">Apenas Sem Grupo (Manual)</option>
                    {commissionGroups.length > 0 && <option disabled>──────────</option>}
                    {commissionGroups.map(g => (
                      <option key={g.id} value={g.id}>Grupo: {g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* QUICK HINT */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 shrink-0 self-end sm:self-center">
                <span>{filteredUsers.length} {filteredUsers.length === 1 ? 'colaborador' : 'colaboradores'}</span>
              </div>
            </div>

            {/* COLLABORATOR CARDS GRID */}
            {filteredUsers.length === 0 ? (
              <div className="text-center py-14 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 p-6">
                <Users size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-black text-slate-700">Nenhum colaborador encontrado</p>
                <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou o filtro de grupos selecionado.</p>
                {(userSearch || userGroupFilter !== 'ALL') && (
                  <button
                    onClick={() => { setUserSearch(''); setUserGroupFilter('ALL'); }}
                    className="mt-3 px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map(user => {
                  const linkedGroup = commissionGroups.find(g => g.id === user.commissionGroupId);
                  const colorConfig = linkedGroup?.color && GROUP_COLOR_MAP[linkedGroup.color] 
                    ? GROUP_COLOR_MAP[linkedGroup.color] 
                    : GROUP_COLOR_MAP.indigo;

                  // Number of customized rules
                  const rulesCount = linkedGroup 
                    ? (linkedGroup.settings || []).length
                    : (user.commissionSettings || []).filter(
                        s => s.value !== undefined || 
                        (s.variationSettings && Object.keys(s.variationSettings).length > 0) || 
                        (s.stageSettings && Object.keys(s.stageSettings).length > 0)
                      ).length;

                  return (
                    <div 
                      key={user.id} 
                      className="p-4 sm:p-5 border border-slate-200/80 rounded-2xl hover:border-blue-400 transition-all bg-slate-50/60 hover:bg-white group flex flex-col justify-between shadow-2xs hover:shadow-md"
                    >
                      <div>
                        {/* USER INFO ROW */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-xs border border-slate-200/80 shrink-0 text-base">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-800 truncate text-sm leading-tight group-hover:text-blue-600 transition-colors">
                              {user.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded-md font-bold uppercase text-slate-600">
                                {user.role}
                              </span>
                              {user.sector && (
                                <span className="text-[10px] bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded-md font-bold truncate">
                                  {user.sector}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* COMMISSION STATUS BADGE */}
                        <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold">Vínculo:</span>
                            {linkedGroup ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
                                <FolderPlus size={12} />
                                {linkedGroup.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white text-slate-600 border border-slate-200">
                                <Settings size={12} className="text-slate-400" />
                                Manual / Individual
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold">Regras ativas:</span>
                            <span className="font-black text-slate-700">
                              {rulesCount} {rulesCount === 1 ? 'serviço' : 'serviços'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ACTION BUTTON */}
                      <button 
                        type="button"
                        onClick={() => handleOpenUserModal(user)} 
                        className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                      >
                        <Edit size={14}/> 
                        {linkedGroup ? 'Editar Vínculo ou Ganhos' : t('admin.commissions.defineEarnings', 'Definir Ganhos')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: GRUPOS DE GANHOS (GROUPS) - NEW! */}
        {/* ========================================================================= */}
        {activeView === 'GROUPS' && (
          <div className="pt-5 space-y-6 animate-in fade-in duration-200">
            {/* EXPLANATORY HEADER BANNER */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-indigo-500/5 border border-indigo-200/80 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 max-w-2xl">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shrink-0">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Economize tempo padronizando os ganhos por grupos
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                    Crie grupos (ex: <strong>Protéticos Sênior, Ceramistas, Gesso & Acabamento</strong>) e defina a comissão dos serviços uma única vez. Ao vincular o colaborador ao grupo, ele herda automaticamente toda a tabela!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateGroupModal}
                className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <Plus size={18} />
                <span>Novo Grupo de Ganhos</span>
              </button>
            </div>

            {/* SEARCH BAR & COUNTERS */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={groupSearch}
                  onChange={e => setGroupSearch(e.target.value)}
                  placeholder="Buscar grupo por nome ou descrição..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                />
                {groupSearch && (
                  <button 
                    onClick={() => setGroupSearch('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="text-xs font-bold text-slate-500 self-end sm:self-center">
                <span>{filteredGroups.length} {filteredGroups.length === 1 ? 'grupo cadastrado' : 'grupos cadastrados'}</span>
              </div>
            </div>

            {/* GROUPS LIST / CARDS */}
            {filteredGroups.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                <FolderPlus size={44} className="text-slate-300 mb-3" />
                <h4 className="text-base font-black text-slate-800">
                  {groupSearch ? 'Nenhum grupo encontrado' : 'Nenhum grupo de ganhos criado ainda'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mt-1 mb-5">
                  {groupSearch 
                    ? `Não encontramos nenhum grupo correspondente ao termo "${groupSearch}".` 
                    : 'Crie seu primeiro grupo para definir regras padronizadas de comissão e vincular seus colaboradores com facilidade.'}
                </p>
                {groupSearch ? (
                  <button
                    onClick={() => setGroupSearch('')}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Limpar busca
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenCreateGroupModal}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    Criar Primeiro Grupo
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGroups.map(group => {
                  const colorConfig = group.color && GROUP_COLOR_MAP[group.color] 
                    ? GROUP_COLOR_MAP[group.color] 
                    : GROUP_COLOR_MAP.indigo;
                  
                  // Linked collaborators in this group
                  const members = collaboratorsList.filter(u => u.commissionGroupId === group.id);
                  const configuredServicesCount = (group.settings || []).length;

                  return (
                    <div 
                      key={group.id}
                      className="bg-white border border-slate-200/90 rounded-3xl p-5 hover:border-indigo-400 transition-all hover:shadow-md flex flex-col justify-between group"
                    >
                      <div>
                        {/* GROUP TOP HEADER */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
                              <FolderPlus size={22} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-black text-slate-800 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                                {group.name}
                              </h4>
                              {group.description && (
                                <p className="text-xs text-slate-500 font-medium truncate mt-0.5" title={group.description}>
                                  {group.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* ACTION BUTTONS (EDIT / DELETE META) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditGroupModal(group)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar nome/cor do grupo"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingGroup(group)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir grupo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* MEMBERS AND STATS */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                          {/* MEMBERS ROW */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-slate-400 font-bold flex items-center gap-1">
                                <Users size={12} />
                                Colaboradores vinculados:
                              </span>
                              <span className="font-black text-slate-800">
                                {members.length}
                              </span>
                            </div>
                            {members.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {members.slice(0, 4).map(m => (
                                  <span key={m.id} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                                    {m.name}
                                  </span>
                                ))}
                                {members.length > 4 && (
                                  <span className="text-[10px] font-black text-slate-400 px-1 py-0.5">
                                    +{members.length - 4}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">
                                Nenhum colaborador vinculado a este grupo ainda.
                              </p>
                            )}
                          </div>

                          {/* CONFIGURED SERVICES COUNT */}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-400 font-bold">Serviços configurados:</span>
                            <span className="font-black text-indigo-600">
                              {configuredServicesCount} {configuredServicesCount === 1 ? 'serviço' : 'serviços'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PRIMARY BUTTON: DEFINIR GANHOS DO GRUPO */}
                      <button
                        type="button"
                        onClick={() => handleOpenGroupEarningsModal(group)}
                        className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/15 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <DollarSign size={15} />
                        <span>Definir Ganhos do Grupo</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: POR TIPO DE SERVIÇO (SERVICES) */}
        {/* ========================================================================= */}
        {activeView === 'SERVICES' && (
          <div className="pt-5 space-y-4 animate-in fade-in duration-200">
            {/* SEARCH AND CATEGORY FILTER ROW */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* SEARCH INPUT */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={globalServiceSearch}
                  onChange={e => setGlobalServiceSearch(e.target.value)}
                  placeholder="Pesquisar por nome do serviço, categoria ou variação..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm font-bold text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
                {globalServiceSearch && (
                  <button
                    type="button"
                    onClick={() => setGlobalServiceSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* CATEGORY SELECTOR */}
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-400 hidden sm:block" />
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* ALPHABETICAL ORDER BADGE */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <ArrowDownAZ size={14} className="text-blue-600" />
                  {filteredGlobalJobTypes.length} {filteredGlobalJobTypes.length === 1 ? 'serviço' : 'serviços'} (A-Z)
                </span>
              </div>
            </div>

            {/* SERVICES LIST */}
            {filteredGlobalJobTypes.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Search size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">Nenhum serviço encontrado</p>
                <p className="text-xs text-slate-400 mt-1">
                  Não encontramos nenhum serviço com o filtro selecionado.
                </p>
                {(globalServiceSearch || selectedCategory !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => { setGlobalServiceSearch(''); setSelectedCategory('ALL'); }}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGlobalJobTypes.map(type => {
                  const customTechs = getCustomTechniciansForJobType(type.id);
                  const customGroups = getGroupsForJobType(type.id);
                  const isEditing = editingBaseId === type.id;
                  const isSavedJustNow = savedSuccessId === type.id;
                  
                  // Count total stages
                  let stageCount = 0;
                  if (type.sectorStages) {
                    Object.values(type.sectorStages).forEach(stages => {
                      stageCount += (stages || []).length;
                    });
                  }

                  return (
                    <div 
                      key={type.id} 
                      className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* SERVICE DETAILS */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-800 text-sm sm:text-base">
                            {type.name}
                          </span>
                          {type.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md shadow-2xs">
                              {type.category}
                            </span>
                          )}
                          {isSavedJustNow && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md animate-in fade-in">
                              <CheckCircle2 size={12} /> Salvo!
                            </span>
                          )}
                        </div>

                        {/* STATS ROW */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <div>
                            <span className="text-slate-400 font-medium">Preço Base: </span>
                            <span className="font-bold text-slate-700">R$ {type.basePrice.toFixed(2)}</span>
                          </div>

                          {stageCount > 0 && (
                            <div className="flex items-center gap-1 text-indigo-600 font-bold">
                              <Settings size={12} />
                              <span>{stageCount} {stageCount === 1 ? 'etapa configurada' : 'etapas configuradas'}</span>
                            </div>
                          )}

                          {type.variationGroups && type.variationGroups.length > 0 && (
                            <div className="text-purple-600 font-bold">
                              <span>{type.variationGroups.length} {type.variationGroups.length === 1 ? 'grupo de variação' : 'grupos de variações'}</span>
                            </div>
                          )}
                        </div>

                        {/* CUSTOM RULES BADGES (GROUPS & INDIVIDUAL TECHS) */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {customGroups.length > 0 && (
                            <>
                              <span className="text-[11px] font-bold text-indigo-500">Grupos com regra:</span>
                              {customGroups.map(g => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    handleOpenGroupEarningsModal(g);
                                    setModalGroupServiceSearch(type.name);
                                  }}
                                  className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`Clique para editar a comissão do grupo ${g.name}`}
                                >
                                  <FolderPlus size={10} />
                                  {g.name}
                                </button>
                              ))}
                            </>
                          )}

                          {customTechs.length > 0 && (
                            <>
                              <span className="text-[11px] font-medium text-slate-400 ml-1">Regras manuais:</span>
                              {customTechs.map(tech => (
                                <button
                                  key={tech.id}
                                  type="button"
                                  onClick={() => {
                                    handleOpenUserModal(tech);
                                    setModalServiceSearch(type.name);
                                  }}
                                  className="text-[10px] font-bold bg-white text-blue-700 border border-blue-200 hover:border-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`Clique para editar a comissão de ${tech.name}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                  {tech.name}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>

                      {/* BASE COMMISSION CONFIGURATION BOX */}
                      <div className="flex items-center gap-3 shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-xs self-stretch sm:self-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Comissão Base
                          </p>
                          {isEditing ? (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs font-bold text-slate-500">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editingBaseVal}
                                onChange={e => setEditingBaseVal(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                                className="w-20 px-2 py-1 bg-slate-50 border border-blue-500 rounded-lg text-xs font-black text-slate-800 focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={isSavingBase}
                                onClick={() => handleSaveBaseCommission(type.id)}
                                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                                title="Salvar comissão base"
                              >
                                {isSavingBase ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBaseId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Cancelar"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">
                              {type.baseCommission !== undefined 
                                ? `R$ ${type.baseCommission.toFixed(2)}` 
                                : <span className="text-slate-400 font-normal italic">Não definida</span>}
                            </p>
                          )}
                        </div>

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBaseId(type.id);
                              setEditingBaseVal(type.baseCommission !== undefined ? type.baseCommission.toString() : '');
                            }}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar comissão base deste serviço"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DEFINIR GANHOS DO COLABORADOR */}
      {/* ========================================================================= */}
      {configUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
            {/* MODAL HEADER */}
            <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                  <DollarSign size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate">
                    Ganhos do Colaborador: {configUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                    {selectedUserGroupId 
                      ? 'Tabela padronizada herdada do grupo' 
                      : 'Configuração manual exclusiva deste colaborador'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setConfigUser(null)} 
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <X size={20}/>
              </button>
            </div>

            {/* GROUP SELECTION CONTROL CARD */}
            <div className="p-4 sm:px-6 bg-blue-50/50 border-b border-blue-100/70 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <FolderPlus size={15} className="text-blue-600" />
                    Grupo de Ganhos
                  </label>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Vincule a um grupo para padronizar comissões ou defina manualmente.
                  </p>
                </div>

                <div className="w-full sm:w-auto">
                  <select
                    value={selectedUserGroupId}
                    onChange={e => handleGroupSelectionChange(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-blue-300 focus:border-blue-600 rounded-xl text-xs font-black text-slate-800 shadow-xs cursor-pointer focus:outline-none"
                  >
                    <option value="">Nenhum (Definir Ganhos Manualmente)</option>
                    {commissionGroups.length > 0 && <option disabled>──────────</option>}
                    {commissionGroups.map(g => (
                      <option key={g.id} value={g.id}>Grupo: {g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STATUS BANNER */}
              {selectedUserGroupId ? (
                <div className="mt-3 p-3 bg-white/90 rounded-2xl border border-blue-200/80 flex items-start gap-2.5 shadow-2xs">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 flex-1">
                    <span className="font-black text-slate-800">
                      Vinculado ao grupo "{commissionGroups.find(g => g.id === selectedUserGroupId)?.name}".
                    </span>{' '}
                    Este colaborador recebe automaticamente as comissões deste grupo. Os valores abaixo são exibidos para consulta. Para personalizar individualmente, selecione "Nenhum (Definir Ganhos Manualmente)".
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-white/90 rounded-2xl border border-amber-200/80 flex items-start gap-2.5 shadow-2xs">
                  <Settings size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 flex-1">
                    <span className="font-black text-amber-800">Modo Manual Ativo:</span>{' '}
                    Você pode personalizar os valores e porcentagens de comissão de cada serviço, variação ou etapa abaixo especificamente para este colaborador.
                  </div>
                </div>
              )}
            </div>

            {/* MODAL SEARCH BAR & A-Z COUNT */}
            <div className="p-4 sm:px-6 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={modalServiceSearch} 
                  onChange={e => setModalServiceSearch(e.target.value)} 
                  placeholder="Buscar tipo de serviço por nome ou categoria..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm font-bold text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                />
                {modalServiceSearch && (
                  <button 
                    type="button" 
                    onClick={() => setModalServiceSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-xs">
                  <ArrowDownAZ size={14} className="text-blue-600" />
                  {filteredModalJobTypes.length} {filteredModalJobTypes.length === 1 ? 'serviço' : 'serviços'} (A-Z)
                </span>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {filteredModalJobTypes.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Search size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">Nenhum tipo de serviço encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Não encontramos nenhum serviço com o termo "{modalServiceSearch}".</p>
                  <button
                    type="button"
                    onClick={() => setModalServiceSearch('')}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpar busca
                  </button>
                </div>
              ) : (
                filteredModalJobTypes.map(type => {
                  const setting = tempCommissions.find(s => s.jobTypeId === type.id);
                  const isReadOnly = !!selectedUserGroupId;

                  return (
                    <div key={type.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">{type.name}</p>
                            {type.category && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                                {type.category}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <p className="text-xs text-slate-400">{t('admin.commissions.base', 'Base:')} R$ {type.basePrice.toFixed(2)}</p>
                            {type.baseCommission !== undefined && (
                              <p className="text-xs text-indigo-500 font-bold text-right mt-1 w-full flex justify-end gap-1">
                                <span className="text-slate-400 font-normal mt-0.5">{t('admin.commissions.baseCommission', 'Comissão Base:')}</span> 
                                R$ {type.baseCommission.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.01" 
                            disabled={isReadOnly}
                            value={setting?.value === undefined ? '' : setting.value} 
                            onChange={e => {
                              setTempCommissions(prev => 
                                updateServiceSetting(prev, type.id, e.target.value, setting?.type || 'FIXED')
                              );
                            }} 
                            placeholder={type.baseCommission ? `${type.baseCommission.toFixed(2)}` : "0"} 
                            className={`w-24 px-2 py-1.5 border rounded-lg font-bold text-center ${
                              isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                          <select 
                            disabled={isReadOnly}
                            value={setting?.type || 'FIXED'} 
                            onChange={e => {
                              setTempCommissions(prev => 
                                updateServiceSetting(prev, type.id, setting?.value !== undefined ? setting.value.toString() : '', e.target.value as any)
                              );
                            }} 
                            className={`border rounded-lg px-2 py-1.5 text-xs font-bold ${
                              isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                            }`}
                          >
                            <option value="PERCENTAGE">%</option>
                            <option value="FIXED">R$</option>
                          </select>
                        </div>
                      </div>

                      {/* VARIATIONS */}
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
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        disabled={isReadOnly}
                                        value={vSetting?.value === undefined ? '' : vSetting.value} 
                                        onChange={e => {
                                          setTempCommissions(prev => 
                                            updateVariationSetting(prev, type.id, opt.id, e.target.value, vSetting?.type || 'FIXED')
                                          );
                                        }} 
                                        placeholder="0" 
                                        className={`w-20 px-2 py-1 border rounded font-bold text-center text-xs ${
                                          isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                                        }`}
                                      />
                                      <select 
                                        disabled={isReadOnly}
                                        value={vSetting?.type || 'FIXED'} 
                                        onChange={e => {
                                          setTempCommissions(prev => 
                                            updateVariationSetting(prev, type.id, opt.id, vSetting?.value !== undefined ? vSetting.value.toString() : '', e.target.value as any)
                                          );
                                        }} 
                                        className={`border rounded px-1 py-1 text-[10px] font-bold ${
                                          isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                                        }`}
                                      >
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
                })
              )}

              {/* STAGES SECTION */}
              {(() => {
                const stageTypes = filteredModalJobTypes.filter(type =>
                  type.sectorStages && Object.keys(type.sectorStages).some(sectorName => (type.sectorStages?.[sectorName] || []).length > 0)
                );
                if (stageTypes.length === 0) return null;
                const isReadOnly = !!selectedUserGroupId;

                return (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Settings size={18} className="text-slate-400" />
                        {t('admin.commissions.stageCommission', 'Comissão por Etapas de Serviço')}
                      </h4>
                      <span className="text-[11px] font-bold text-slate-400">
                        {stageTypes.length} {stageTypes.length === 1 ? 'serviço com etapas' : 'serviços com etapas'} (A-Z)
                      </span>
                    </div>
                    <div className="space-y-4">
                      {stageTypes.map(type => {
                        const setting = tempCommissions.find(s => s.jobTypeId === type.id);
                        return (
                          <div key={`stage-comm-${type.id}`} className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 space-y-3">
                            <p className="font-bold text-indigo-900">{type.name}</p>
                            
                            {Object.entries(type.sectorStages || {}).map(([sectorName, stagesList]) => {
                              if (!stagesList || stagesList.length === 0) return null;
                              return (
                                <div key={sectorName} className="space-y-2">
                                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-wider">{sectorName}</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {stagesList.map(stageName => {
                                      const stageKey = `${sectorName}:${stageName}`;
                                      const stSetting = setting?.stageSettings?.[stageKey];
                                      return (
                                        <div key={stageName} className="flex items-center justify-between py-2 bg-white px-3 rounded-xl border border-indigo-100/50 shadow-xs">
                                          <span className="text-xs font-bold text-slate-700">{stageName}</span>
                                          <div className="flex items-center gap-2">
                                            <input 
                                              type="number" 
                                              step="0.01" 
                                              disabled={isReadOnly}
                                              value={stSetting?.value === undefined ? '' : stSetting.value} 
                                              onChange={e => {
                                                setTempCommissions(prev => 
                                                  updateStageSetting(prev, type.id, stageKey, e.target.value, stSetting?.type || 'FIXED')
                                                );
                                              }} 
                                              placeholder="0" 
                                              className={`w-20 px-2 py-1 border rounded font-bold text-center text-xs ${
                                                isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                                              }`}
                                            />
                                            <select 
                                              disabled={isReadOnly}
                                              value={stSetting?.type || 'FIXED'} 
                                              onChange={e => {
                                                setTempCommissions(prev => 
                                                  updateStageSetting(prev, type.id, stageKey, stSetting?.value !== undefined ? stSetting.value.toString() : '', e.target.value as any)
                                                );
                                              }} 
                                              className={`border rounded px-1 py-1 text-[10px] font-bold ${
                                                isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
                                              }`}
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
                );
              })()}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setConfigUser(null)} 
                className="w-full sm:w-auto px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all text-sm text-center cursor-pointer"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button 
                type="button"
                onClick={saveUserCommissions} 
                disabled={isSubmitting} 
                className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16}/> {t('common.save', 'SALVAR')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DEFINIR GANHOS DO GRUPO (GROUP EARNINGS MODAL) */}
      {/* ========================================================================= */}
      {configGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
            {/* MODAL HEADER */}
            <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
                  <FolderPlus size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate">
                    Ganhos do Grupo: {configGroup.name}
                  </h3>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5 truncate">
                    As regras definidas aqui valem para todos os colaboradores vinculados a este grupo
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setConfigGroup(null)} 
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <X size={20}/>
              </button>
            </div>

            {/* MODAL SEARCH BAR & A-Z COUNT */}
            <div className="p-4 sm:px-6 bg-indigo-50/40 border-b border-indigo-100/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={modalGroupServiceSearch} 
                  onChange={e => setModalGroupServiceSearch(e.target.value)} 
                  placeholder="Buscar tipo de serviço por nome ou categoria..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs sm:text-sm font-bold text-slate-700 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                />
                {modalGroupServiceSearch && (
                  <button 
                    type="button" 
                    onClick={() => setModalGroupServiceSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-indigo-700 bg-white px-3 py-2 rounded-xl border border-indigo-100 flex items-center gap-1.5 shadow-xs">
                  <ArrowDownAZ size={14} className="text-indigo-600" />
                  {filteredModalGroupJobTypes.length} {filteredModalGroupJobTypes.length === 1 ? 'serviço' : 'serviços'} (A-Z)
                </span>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {filteredModalGroupJobTypes.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Search size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">Nenhum tipo de serviço encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Não encontramos nenhum serviço com o termo "{modalGroupServiceSearch}".</p>
                  <button
                    type="button"
                    onClick={() => setModalGroupServiceSearch('')}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpar busca
                  </button>
                </div>
              ) : (
                filteredModalGroupJobTypes.map(type => {
                  const setting = tempGroupCommissions.find(s => s.jobTypeId === type.id);
                  return (
                    <div key={type.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">{type.name}</p>
                            {type.category && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                                {type.category}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <p className="text-xs text-slate-400">Preço Base: R$ {type.basePrice.toFixed(2)}</p>
                            {type.baseCommission !== undefined && (
                              <p className="text-xs text-indigo-500 font-bold text-right mt-1 w-full flex justify-end gap-1">
                                <span className="text-slate-400 font-normal mt-0.5">Comissão Base Geral:</span> 
                                R$ {type.baseCommission.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.01" 
                            value={setting?.value === undefined ? '' : setting.value} 
                            onChange={e => {
                              setTempGroupCommissions(prev => 
                                updateServiceSetting(prev, type.id, e.target.value, setting?.type || 'FIXED')
                              );
                            }} 
                            placeholder={type.baseCommission ? `${type.baseCommission.toFixed(2)}` : "0"} 
                            className="w-24 px-2 py-1.5 border rounded-lg font-bold text-center bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                          />
                          <select 
                            value={setting?.type || 'FIXED'} 
                            onChange={e => {
                              setTempGroupCommissions(prev => 
                                updateServiceSetting(prev, type.id, setting?.value !== undefined ? setting.value.toString() : '', e.target.value as any)
                              );
                            }} 
                            className="bg-white border rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          >
                            <option value="PERCENTAGE">%</option>
                            <option value="FIXED">R$</option>
                          </select>
                        </div>
                      </div>

                      {/* VARIATIONS */}
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
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        value={vSetting?.value === undefined ? '' : vSetting.value} 
                                        onChange={e => {
                                          setTempGroupCommissions(prev => 
                                            updateVariationSetting(prev, type.id, opt.id, e.target.value, vSetting?.type || 'FIXED')
                                          );
                                        }} 
                                        placeholder="0" 
                                        className="w-20 px-2 py-1 border rounded font-bold text-center text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                                      />
                                      <select 
                                        value={vSetting?.type || 'FIXED'} 
                                        onChange={e => {
                                          setTempGroupCommissions(prev => 
                                            updateVariationSetting(prev, type.id, opt.id, vSetting?.value !== undefined ? vSetting.value.toString() : '', e.target.value as any)
                                          );
                                        }} 
                                        className="bg-white border rounded px-1 py-1 text-[10px] font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                      >
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
                })
              )}

              {/* STAGES SECTION */}
              {(() => {
                const stageTypes = filteredModalGroupJobTypes.filter(type =>
                  type.sectorStages && Object.keys(type.sectorStages).some(sectorName => (type.sectorStages?.[sectorName] || []).length > 0)
                );
                if (stageTypes.length === 0) return null;
                return (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Settings size={18} className="text-indigo-600" />
                        Comissão do Grupo por Etapas de Serviço
                      </h4>
                      <span className="text-[11px] font-bold text-slate-400">
                        {stageTypes.length} {stageTypes.length === 1 ? 'serviço com etapas' : 'serviços com etapas'} (A-Z)
                      </span>
                    </div>
                    <div className="space-y-4">
                      {stageTypes.map(type => {
                        const setting = tempGroupCommissions.find(s => s.jobTypeId === type.id);
                        return (
                          <div key={`stage-comm-${type.id}`} className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3">
                            <p className="font-bold text-indigo-900">{type.name}</p>
                            
                            {Object.entries(type.sectorStages || {}).map(([sectorName, stagesList]) => {
                              if (!stagesList || stagesList.length === 0) return null;
                              return (
                                <div key={sectorName} className="space-y-2">
                                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-wider">{sectorName}</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {stagesList.map(stageName => {
                                      const stageKey = `${sectorName}:${stageName}`;
                                      const stSetting = setting?.stageSettings?.[stageKey];
                                      return (
                                        <div key={stageName} className="flex items-center justify-between py-2 bg-white px-3 rounded-xl border border-indigo-100/50 shadow-xs">
                                          <span className="text-xs font-bold text-slate-700">{stageName}</span>
                                          <div className="flex items-center gap-2">
                                            <input 
                                              type="number" 
                                              step="0.01" 
                                              value={stSetting?.value === undefined ? '' : stSetting.value} 
                                              onChange={e => {
                                                setTempGroupCommissions(prev => 
                                                  updateStageSetting(prev, type.id, stageKey, e.target.value, stSetting?.type || 'FIXED')
                                                );
                                              }} 
                                              placeholder="0" 
                                              className="w-20 px-2 py-1 border rounded font-bold text-center text-xs focus:ring-indigo-500 focus:border-indigo-500 bg-white" 
                                            />
                                            <select 
                                              value={stSetting?.type || 'FIXED'} 
                                              onChange={e => {
                                                setTempGroupCommissions(prev => 
                                                  updateStageSetting(prev, type.id, stageKey, stSetting?.value !== undefined ? stSetting.value.toString() : '', e.target.value as any)
                                                );
                                              }} 
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
                );
              })()}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setConfigGroup(null)} 
                className="w-full sm:w-auto px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all text-sm text-center cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={saveGroupEarnings} 
                disabled={isSubmittingGroup} 
                className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
              >
                {isSubmittingGroup ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16}/> SALVAR GANHOS DO GRUPO</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CRIAR / EDITAR METADADOS DO GRUPO (NAME, DESC, COLOR) */}
      {/* ========================================================================= */}
      {isGroupMetaModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FolderPlus className="text-indigo-600" size={20} />
                {editingGroupId ? 'Editar Grupo de Ganhos' : 'Novo Grupo de Ganhos'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsGroupMetaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGroupMeta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nome do Grupo *
                </label>
                <input
                  required
                  type="text"
                  value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  placeholder="Ex: Protéticos Sênior, Ceramistas, Acabamento..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={groupDescInput}
                  onChange={e => setGroupDescInput(e.target.value)}
                  placeholder="Ex: Tabela padrão para técnicos com mais de 3 anos de casa"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                  <Palette size={14} className="text-slate-400" />
                  Cor de Identificação
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map(c => {
                    const isSelected = groupColorInput === c.id;
                    const mapItem = GROUP_COLOR_MAP[c.id] || GROUP_COLOR_MAP.indigo;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setGroupColorInput(c.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? `${mapItem.bg} ${mapItem.text} ${mapItem.border} ring-2 ring-indigo-500/40` 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: c.hex }} 
                        />
                        <span className="truncate">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGroupMetaModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingGroupMeta}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingGroupMeta ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>{editingGroupId ? 'Atualizar Grupo' : 'Criar e Definir Ganhos'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE GRUPO */}
      {/* ========================================================================= */}
      {deletingGroup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h4 className="text-base font-black text-slate-800">
              Excluir grupo "{deletingGroup.name}"?
            </h4>
            <p className="text-xs text-slate-500 mt-2 mb-5">
              Esta ação removerá o grupo permanentemente. Os colaboradores que faziam parte deste grupo passarão para o modo manual individual.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingGroup(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={handleConfirmDeleteGroup}
                className="flex-1 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingGroup ? <Loader2 className="animate-spin" size={14} /> : 'Excluir Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
