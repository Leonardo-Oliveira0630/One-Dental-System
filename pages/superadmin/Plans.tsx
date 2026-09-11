
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SubscriptionPlan } from '../../types';
import { 
  Plus, Trash2, Edit2, Check, X, Tag, Shield, Store, 
  Activity, Database, Users, Stethoscope, Infinity, 
  Layers, Package, Settings2, ShieldCheck, Gauge,
  Lock, Globe, Mail, Building2, UserCheck, ChevronDown, Sparkles, CheckCircle2
} from 'lucide-react';

export const Plans = () => {
  const { allPlans, allOrganizations, allUsers, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [whatsappModulePrice, setWhatsappModulePrice] = useState(90);
  const [isPublic, setIsPublic] = useState(true);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [targetAudience, setTargetAudience] = useState<'LAB' | 'CLINIC' | 'LAB_OUTSOURCED' | 'SUPPLIER'>('LAB');
  const [trialDays, setTrialDays] = useState(7);
  
  // Features State
  const [maxUsers, setMaxUsers] = useState(-1);
  const [maxStorage, setMaxStorage] = useState(5);
  const [maxDentists, setMaxDentists] = useState(-1);
  const [maxJobsPerMonth, setMaxJobsPerMonth] = useState(-1);
  const [hasStore, setHasStore] = useState(true);
  const [hasClinic, setHasClinic] = useState(true);
  const [splitPercent, setSplitPercent] = useState<number>(0);

  const resetForm = () => {
    setName('');
    setPrice(0);
    setWhatsappModulePrice(90);
    setIsPublic(true);
    setAllowedEmails([]);
    setEmailInput('');
    setEmailError('');
    setTargetAudience('LAB');
    setTrialDays(7);
    setMaxUsers(-1);
    setMaxStorage(5);
    setMaxDentists(-1);
    setMaxJobsPerMonth(-1);
    setHasStore(true);
    setHasClinic(true);
    setSplitPercent(0);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setIsEditing(true);
    setEditingId(plan.id);
    setName(plan.name);
    setPrice(plan.price);
    setWhatsappModulePrice(plan.whatsappModulePrice ?? 90);
    setIsPublic(plan.isPublic !== false && (!plan.allowedEmails || plan.allowedEmails.length === 0));
    setAllowedEmails(plan.allowedEmails || []);
    setEmailInput('');
    setEmailError('');
    setTargetAudience(plan.targetAudience || 'LAB');
    setTrialDays(plan.trialDays || 0);
    setMaxUsers(plan.features.maxUsers);
    setMaxStorage(plan.features.maxStorageGB);
    setMaxDentists(plan.features.maxDentists || -1);
    setMaxJobsPerMonth(plan.features.maxJobsPerMonth || -1);
    setHasStore(plan.features.hasStoreModule);
    setHasClinic(plan.features.hasClinicModule);
    setSplitPercent(plan.features.splitPercent || 0);
  };

  const handleAddEmail = () => {
    setEmailError('');
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Digite um e-mail válido (ex: contato@laboratorio.com)');
      return;
    }

    if (allowedEmails.includes(trimmed)) {
      setEmailError('Este e-mail já está adicionado na lista.');
      return;
    }

    setAllowedEmails([...allowedEmails, trimmed]);
    setEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAllowedEmails(allowedEmails.filter(e => e !== emailToRemove));
  };

  const handleSelectExistingOrg = (orgId: string) => {
    if (!orgId) return;
    const org = allOrganizations.find(o => o.id === orgId);
    if (!org) return;

    const emailsToAdd: string[] = [];
    if (org.email) emailsToAdd.push(org.email.toLowerCase().trim());
    
    // Also find users in this org
    const orgUsers = (allUsers || []).filter(u => u.organizationId === org.id);
    orgUsers.forEach(u => {
      if (u.email) emailsToAdd.push(u.email.toLowerCase().trim());
    });

    const newUnique = emailsToAdd.filter(e => e && !allowedEmails.includes(e));
    if (newUnique.length > 0) {
      setAllowedEmails([...allowedEmails, ...newUnique]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: If marked as private, ensure at least one email or give clear confirmation
    if (!isPublic && allowedEmails.length === 0) {
      if (!window.confirm('Você marcou este plano como Privado/Exclusivo, mas não vinculou nenhum e-mail de cliente. Ninguém conseguirá visualizá-lo até que você adicione ao menos um e-mail. Deseja salvar mesmo assim?')) {
        return;
      }
    }

    const planData: Omit<SubscriptionPlan, 'id'> = {
        name,
        price,
        whatsappModulePrice,
        isPublic: isPublic,
        isPrivate: !isPublic,
        allowedEmails: !isPublic ? allowedEmails.map(e => e.toLowerCase().trim()) : [],
        active: true,
        targetAudience,
        trialDays,
        features: {
            maxUsers,
            maxStorageGB: maxStorage,
            maxDentists,
            maxJobsPerMonth,
            hasStoreModule: hasStore,
            hasClinicModule: hasClinic,
            splitPercent
        }
    };

    try {
        if (isEditing && editingId) {
            await updateSubscriptionPlan(editingId, planData);
        } else {
            const id = `plan_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
            await addSubscriptionPlan({ ...planData, id });
        }
        resetForm();
        alert("Plano configurado com sucesso!");
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar plano");
    }
  };

  const LimitBadge = ({ value, label, icon: Icon }: any) => (
    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
        <Icon size={14} className="text-slate-400" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{label}:</span>
        <span className="text-xs font-black text-slate-800">
            {value === -1 ? <Infinity size={14} className="inline text-blue-600" /> : value}
        </span>
    </div>
  );

  // Helper to get organization name associated with an email
  const getOrgNameForEmail = (email: string) => {
    const org = allOrganizations.find(o => 
      o.email?.toLowerCase().trim() === email.toLowerCase().trim() ||
      (allUsers || []).some(u => u.organizationId === o.id && u.email?.toLowerCase().trim() === email.toLowerCase().trim())
    );
    return org?.name;
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Engenharia de Planos</h1>
                <p className="text-slate-500 font-medium">Defina planos públicos para cadastro ou crie planos privados e exclusivos para clientes específicos.</p>
            </div>
            {isEditing && (
                <button onClick={resetForm} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2">
                    <X size={18} /> Cancelar Edição
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:p-2">
            {/* LISTA DE PLANOS EXISTENTES */}
            <div className="xl:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Planos Cadastrados ({allPlans.length})</h3>
                </div>

                {allPlans.length === 0 ? (
                    <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                        <Package size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">Nenhum plano configurado no sistema.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allPlans.map(plan => {
                          const isPlanExclusive = plan.isPublic === false || (plan.allowedEmails && plan.allowedEmails.length > 0);
                          
                          return (
                            <div 
                              key={plan.id} 
                              className={`bg-white p-6 rounded-[32px] border-2 transition-all relative overflow-hidden group ${
                                isPlanExclusive 
                                  ? 'border-amber-200 bg-gradient-to-b from-amber-50/40 via-white to-white shadow-sm' 
                                  : 'border-slate-100 shadow-sm'
                              }`}
                            >
                                <div className="flex justify-between items-start mb-4 gap-2">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 border ${
                                        plan.targetAudience === 'CLINIC' 
                                            ? 'bg-teal-50 text-teal-700 border-teal-100' 
                                            : plan.targetAudience === 'LAB_OUTSOURCED' 
                                            ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                            : plan.targetAudience === 'SUPPLIER' 
                                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                                            : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                        {plan.targetAudience === 'CLINIC' ? <Stethoscope size={10}/> : plan.targetAudience === 'LAB_OUTSOURCED' ? <Package size={10}/> : plan.targetAudience === 'SUPPLIER' ? <Store size={10}/> : <Layers size={10}/>}
                                        {plan.targetAudience === 'CLINIC' ? 'CLÍNICA' : plan.targetAudience === 'LAB_OUTSOURCED' ? 'TERCEIRIZAÇÃO' : plan.targetAudience === 'SUPPLIER' ? 'FORNECEDOR' : 'LABORATÓRIO'}
                                    </span>

                                    {isPlanExclusive ? (
                                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                                        <Lock size={10} className="text-amber-700" /> Exclusivo
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                                        <Globe size={10} className="text-emerald-600" /> Público
                                      </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-black text-slate-800 leading-tight mb-1">{plan.name}</h3>
                                
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-slate-900">R$ {plan.price.toFixed(2)}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">/mês</span>
                                    </div>
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-tighter">
                                        Split: {plan.features.splitPercent !== undefined ? `${plan.features.splitPercent}%` : 'Padrão'}
                                    </span>
                                    {plan.whatsappModulePrice !== undefined && (
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-green-100 text-green-800 uppercase tracking-tighter" title="Preço do Módulo WhatsApp para este plano">
                                            WPP: R$ {plan.whatsappModulePrice.toFixed(2)}
                                        </span>
                                    )}
                                </div>

                                {isPlanExclusive && (
                                  <div className="mb-4 p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                                      <Users size={13} className="text-amber-700" />
                                      <span>Clientes Vinculados ({plan.allowedEmails?.length || 0}):</span>
                                    </div>
                                    {plan.allowedEmails && plan.allowedEmails.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                                        {plan.allowedEmails.map((em, idx) => {
                                          const orgName = getOrgNameForEmail(em);
                                          return (
                                            <span 
                                              key={idx} 
                                              className="bg-white text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                                              title={em}
                                            >
                                              <Mail size={10} className="text-amber-600" />
                                              <span className="truncate max-w-[140px]">{em}</span>
                                              {orgName && <span className="text-slate-400 text-[9px]">({orgName})</span>}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-amber-700 italic">Nenhum e-mail vinculado (visível apenas para super admin).</p>
                                    )}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 mb-6">
                                    <LimitBadge value={plan.features.maxUsers} label="Users" icon={Users} />
                                    <LimitBadge value={plan.features.maxStorageGB} label="Storage" icon={Database} />
                                    <LimitBadge value={plan.features.maxDentists} label="Dentistas" icon={Stethoscope} />
                                    <LimitBadge value={plan.features.maxJobsPerMonth} label="Casos/Mês" icon={Gauge} />
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-100">
                                    <button onClick={() => handleEdit(plan)} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2">
                                        <Edit2 size={14} /> Editar
                                    </button>
                                    <button onClick={() => { if(window.confirm('Excluir plano?')) deleteSubscriptionPlan(plan.id); }} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                          );
                        })}
                    </div>
                )}
            </div>

            {/* FORMULÁRIO DE CUSTOMIZAÇÃO */}
            <div className="xl:col-span-5">
                <div className="bg-white p-6 sm:p-8 rounded-[40px] shadow-2xl border border-slate-100 sticky top-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
                            <Settings2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Atualizar Definições' : 'Configurar Novo Plano'}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controle de cotas, visibilidade e permissões</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título do Plano</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-blue-500 outline-none font-black text-lg" required placeholder="Ex: Laboratório VIP - Específico" />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Preço (R$)</label>
                                    <input type="number" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[20px] font-black text-lg text-blue-600 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Módulo WhatsApp (R$)</label>
                                    <input type="number" step="0.01" value={whatsappModulePrice} onChange={e => setWhatsappModulePrice(parseFloat(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[20px] font-black text-lg text-green-600 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Trial (Dias)</label>
                                    <input type="number" value={trialDays} onChange={e => setTrialDays(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[20px] font-black text-lg outline-none" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Público do Serviço</label>
                                <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl flex-wrap">
                                    <button type="button" onClick={() => setTargetAudience('LAB')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all min-w-[70px] ${targetAudience === 'LAB' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Laboratório</button>
                                    <button type="button" onClick={() => setTargetAudience('CLINIC')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all min-w-[70px] ${targetAudience === 'CLINIC' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Clínica</button>
                                    <button type="button" onClick={() => setTargetAudience('LAB_OUTSOURCED')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all min-w-[70px] ${targetAudience === 'LAB_OUTSOURCED' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Terceirização</button>
                                    <button type="button" onClick={() => setTargetAudience('SUPPLIER')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all min-w-[70px] ${targetAudience === 'SUPPLIER' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Fornecedor</button>
                                </div>
                            </div>

                            {/* CONFIGURAÇÃO DE PRIVACIDADE E EXCLUSIVIDADE DO PLANO */}
                            <div className="border border-slate-200 rounded-3xl p-4 bg-slate-50/50 space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visibilidade e Acesso ao Plano</label>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsPublic(true);
                                      setAllowedEmails([]);
                                    }}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
                                      isPublic
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <Globe size={18} className={isPublic ? 'text-emerald-600' : 'text-slate-400'} />
                                      {isPublic && <CheckCircle2 size={16} className="text-emerald-600" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-black uppercase">Plano Público</p>
                                      <p className="text-[10px] opacity-80 leading-tight">Aberto na Landing Page e no cadastro inicial.</p>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setIsPublic(false)}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
                                      !isPublic
                                        ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <Lock size={18} className={!isPublic ? 'text-amber-600' : 'text-slate-400'} />
                                      {!isPublic && <CheckCircle2 size={16} className="text-amber-600" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-black uppercase">Plano Privado / Exclusivo</p>
                                      <p className="text-[10px] opacity-80 leading-tight">Oculto do público. Visível apenas para clientes com e-mail autorizado.</p>
                                    </div>
                                  </button>
                                </div>

                                {/* Seção de Vínculo de E-mails para Planos Privados */}
                                {!isPublic && (
                                  <div className="mt-3 p-4 bg-white rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2">
                                      <Mail size={16} className="text-amber-600" />
                                      <h5 className="text-xs font-black text-amber-950 uppercase tracking-tight">E-mails de Administradores Autorizados</h5>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                      Insira os e-mails dos administradores do laboratório ou clínica odontológica. Esse plano só aparecerá para eles na aba de <strong>Configurar Lab / Clínica</strong>.
                                    </p>

                                    {/* Seleção Rápida a partir de Clientes Cadastrados */}
                                    {allOrganizations && allOrganizations.length > 0 && (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Adicionar cliente cadastrado rapidamente:</label>
                                        <select
                                          onChange={(e) => {
                                            handleSelectExistingOrg(e.target.value);
                                            e.target.value = '';
                                          }}
                                          defaultValue=""
                                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                          <option value="" disabled>Selecione um laboratório ou clínica...</option>
                                          {allOrganizations
                                            .filter(o => (targetAudience === 'CLINIC' ? o.orgType === 'CLINIC' : o.orgType !== 'CLINIC'))
                                            .map(org => (
                                              <option key={org.id} value={org.id}>
                                                {org.name} ({org.email || 'Sem e-mail direto'})
                                              </option>
                                            ))
                                          }
                                        </select>
                                      </div>
                                    )}

                                    {/* Input manual de e-mail */}
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ou digite o e-mail do admin:</label>
                                      <div className="flex gap-2">
                                        <input
                                          type="email"
                                          value={emailInput}
                                          onChange={e => {
                                            setEmailInput(e.target.value);
                                            if (emailError) setEmailError('');
                                          }}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleAddEmail();
                                            }
                                          }}
                                          placeholder="admin@laboratorio.com.br"
                                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={handleAddEmail}
                                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                        >
                                          <Plus size={14} /> Adicionar
                                        </button>
                                      </div>
                                      {emailError && (
                                        <p className="text-[11px] text-red-500 font-bold">{emailError}</p>
                                      )}
                                    </div>

                                    {/* Lista de E-mails Autorizados */}
                                    <div className="pt-2 border-t border-slate-100">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                          Lista de Autorizados ({allowedEmails.length}):
                                        </span>
                                        {allowedEmails.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => setAllowedEmails([])}
                                            className="text-[10px] text-red-500 font-bold hover:underline"
                                          >
                                            Limpar lista
                                          </button>
                                        )}
                                      </div>

                                      {allowedEmails.length === 0 ? (
                                        <div className="p-3 bg-amber-50/50 rounded-xl border border-dashed border-amber-300 text-center">
                                          <p className="text-[11px] text-amber-800 font-bold">Nenhum e-mail adicionado ainda.</p>
                                          <p className="text-[10px] text-amber-600">Adicione ao menos um e-mail para que o cliente consiga ver este plano.</p>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                                          {allowedEmails.map((email, idx) => {
                                            const orgName = getOrgNameForEmail(email);
                                            return (
                                              <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 bg-white border border-amber-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs"
                                              >
                                                <Mail size={12} className="text-amber-600 shrink-0" />
                                                <span className="truncate max-w-[180px]">{email}</span>
                                                {orgName && (
                                                  <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black">
                                                    {orgName}
                                                  </span>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveEmail(email)}
                                                  className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors ml-1"
                                                >
                                                  <X size={12} />
                                                </button>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>

                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-[24px] space-y-2">
                                <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Split da Plataforma (%)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        step="0.01" 
                                        value={splitPercent} 
                                        onChange={e => setSplitPercent(parseFloat(e.target.value) || 0)} 
                                        className="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl font-black text-amber-800 outline-none focus:ring-2 focus:ring-amber-500" 
                                        placeholder="Ex: 5" 
                                    />
                                    <span className="text-sm font-black text-amber-700">%</span>
                                </div>
                                <p className="text-[10px] text-amber-600 font-medium leading-normal">
                                    Esse plano aplica uma taxa de split configurada para cada venda/pagamento realizado. Se colocar 0%, o split será zerado e apenas a mensalidade do plano será cobrada.
                                </p>
                            </div>
                        </div>

                        {/* SEÇÃO DE LIMITES */}
                        <div className="bg-slate-50 p-4 sm:p-6 rounded-[32px] border border-slate-100 space-y-5">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Gauge size={14} className="text-blue-600"/> Capacidade & Infraestrutura
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Máx Usuários</label>
                                    <div className="relative">
                                        <input type="number" value={maxUsers} onChange={e => setMaxUsers(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                        {maxUsers === -1 && <Infinity size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" />}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Storage (GB)</label>
                                    <input type="number" value={maxStorage} onChange={e => setMaxStorage(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Máx Dentistas</label>
                                    <div className="relative">
                                        <input type="number" value={maxDentists} onChange={e => setMaxDentists(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                        {maxDentists === -1 && <Infinity size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" />}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Casos / Mês</label>
                                    <div className="relative">
                                        <input type="number" value={maxJobsPerMonth} onChange={e => setMaxJobsPerMonth(parseInt(e.target.value))} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-black text-sm" />
                                        {maxJobsPerMonth === -1 && <Infinity size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" />}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-400 italic text-center font-bold uppercase tracking-tighter">Dica: Use "-1" para recursos ILIMITADOS.</p>
                        </div>

                        {/* MÓDULOS DE SISTEMA */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ativação de Módulos</h4>
                            <div className="grid grid-cols-1 gap-2">
                                <button type="button" onClick={() => setHasStore(!hasStore)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${hasStore ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 opacity-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${hasStore ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Store size={18}/></div>
                                        <span className={`text-xs font-black uppercase ${hasStore ? 'text-indigo-900' : 'text-slate-400'}`}>Loja Virtual (E-commerce)</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasStore ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>{hasStore && <Check size={14}/>}</div>
                                </button>
                                
                                <button type="button" onClick={() => setHasClinic(!hasClinic)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${hasClinic ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-100 opacity-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${hasClinic ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Activity size={18}/></div>
                                        <span className={`text-xs font-black uppercase ${hasClinic ? 'text-teal-900' : 'text-slate-400'}`}>Gestão Clínica & Agenda</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${hasClinic ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200'}`}>{hasClinic && <Check size={14}/>}</div>
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                            <ShieldCheck size={24} /> 
                            {isEditing ? 'ATUALIZAR ARQUITETURA' : 'FORJAR NOVO PLANO'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
  );
};

