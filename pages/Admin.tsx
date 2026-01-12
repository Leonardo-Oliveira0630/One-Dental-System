
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, User, UserCommissionSetting, Coupon, SubscriptionPlan, ManualDentist, PermissionKey, Sector } from '../types';
import { 
  Building2, Users, Plus, Trash2, MapPin, Mail, UserPlus, Save, 
  Stethoscope, Edit, X, DollarSign, Copy, Check, Crown, ArrowUpCircle, 
  Ticket, Wallet, Loader2, Percent, CheckCircle, Briefcase, Search, Phone, ShieldCheck, Lock, Eye, Activity, Package, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/firebaseService';

const AVAILABLE_PERMISSIONS: { key: PermissionKey, label: string, category: string }[] = [
    { key: 'jobs:view', label: 'Ver Lista e Detalhes', category: 'Produção' },
    { key: 'jobs:create', label: 'Criar Novos Trabalhos', category: 'Produção' },
    { key: 'jobs:edit', label: 'Editar Dados de Trabalhos', category: 'Produção' },
    { key: 'jobs:delete', label: 'Excluir Trabalhos', category: 'Produção' },
    { key: 'finance:view', label: 'Ver Dashboard Financeiro', category: 'Financeiro' },
    { key: 'finance:manage', label: 'Gerenciar Despesas e Faturas', category: 'Financeiro' },
    { key: 'catalog:manage', label: 'Gerenciar Tipos de Serviço', category: 'Catálogo' },
    { key: 'clients:manage', label: 'Gerenciar Dentistas e Preços', category: 'Clientes' },
    { key: 'sectors:manage', label: 'Gerenciar Setores', category: 'Administração' },
    { key: 'users:manage', label: 'Gerenciar Outros Usuários', category: 'Administração' },
];

export const Admin = () => {
  const { 
    sectors, addSector, deleteSector, 
    allUsers, deleteUser, updateUser,
    jobTypes, currentOrg, currentPlan, updateOrganization, allPlans,
    validateCoupon, createLabWallet,
    manualDentists, addManualDentist, deleteManualDentist, updateManualDentist, currentUser
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'SECTORS' | 'USERS' | 'DENTISTS' | 'COMMISSIONS' | 'FINANCIAL' | 'SUBSCRIPTION'>('SECTORS');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FORM STATES ---
  
  // Setores
  const [newSectorName, setNewSectorName] = useState('');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  
  // Usuários (Equipe)
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');

  // Permissions Modal
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [tempPerms, setTempPerms] = useState<PermissionKey[]>([]);

  // Clientes (Dentistas Manuais)
  const [isAddingDentist, setIsAddingDentist] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [dentistName, setDentistName] = useState('');
  const [dentistClinic, setDentistClinic] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [dentistPhone, setDentistPhone] = useState('');
  const [dentistSearch, setDentistSearch] = useState('');

  // Comissões
  const [configUser, setConfigUser] = useState<User | null>(null);
  const [tempCommissions, setTempCommissions] = useState<UserCommissionSetting[]>([]);

  // Financeiro
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [instructions, setInstructions] = useState(currentOrg?.financialSettings?.instructions || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // Assinatura
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // --- HANDLERS ---

  const handleOpenPermissions = (user: User) => {
      setSelectedUserForPerms(user);
      setTempPerms(user.permissions || []);
  };

  const togglePermission = (key: PermissionKey) => {
      setTempPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSavePermissions = async () => {
      if (!selectedUserForPerms) return;
      await updateUser(selectedUserForPerms.id, { permissions: tempPerms });
      setSelectedUserForPerms(null);
      alert("Permissões de acesso atualizadas!");
  };

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectorName.trim()) {
      await addSector(newSectorName.trim());
      setNewSectorName('');
    }
  };

  const handleUpdateSector = async () => {
      if (!editingSector || !currentOrg) return;
      await api.apiUpdateSector(currentOrg.id, editingSector.id, editingSector.name);
      setEditingSector(null);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPass || !currentOrg) return;
    setIsSubmitting(true);
    try {
        await api.apiRegisterUserInOrg(userEmail, userPass, userName, userRole, currentOrg.id);
        setIsAddingUser(false);
        setUserName(''); setUserEmail(''); setUserPass('');
        alert("Usuário criado com sucesso!");
    } catch (err: any) {
        alert("Erro ao criar usuário: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const openEditUser = (user: User) => {
      setEditingUser(user);
      setUserName(user.name);
      setUserEmail(user.email);
      setUserRole(user.role);
      setUserSector(user.sector || '');
  };

  const handleUpdateUserInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setIsSubmitting(true);
      try {
          await updateUser(editingUser.id, { name: userName, role: userRole, sector: userSector });
          setEditingUser(null);
          alert("Dados atualizados!");
      } catch (err: any) {
          alert("Erro: " + err.message);
      } finally { setIsSubmitting(false); }
  };

  const resetDentistForm = () => {
      setEditingDentistId(null);
      setDentistName('');
      setDentistClinic('');
      setDentistEmail('');
      setDentistPhone('');
  };

  const handleOpenEditDentist = (d: ManualDentist) => {
      setEditingDentistId(d.id);
      setDentistName(d.name);
      setDentistClinic(d.clinicName || '');
      setDentistEmail(d.email || '');
      setDentistPhone(d.phone || '');
      setIsAddingDentist(true);
  };

  const handleSaveManualDentist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dentistName) return;
      const data = { name: dentistName, clinicName: dentistClinic, email: dentistEmail, phone: dentistPhone };
      try {
          if (editingDentistId) {
              await updateManualDentist(editingDentistId, data);
          } else {
              await addManualDentist({ ...data, createdAt: new Date() });
          }
          setIsAddingDentist(false);
          resetDentistForm();
      } catch (err) {
          alert("Erro ao salvar cliente.");
      }
  };

  const openCommissionModal = (user: User) => {
    setConfigUser(user);
    setTempCommissions(user.commissionSettings || []);
  };

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
          await updateUser(configUser.id, { commissionSettings: tempCommissions });
          setConfigUser(null);
          alert("Comissões salvas!");
      }
  };

  const handleApplyCoupon = async () => {
    const coupon = await validateCoupon(couponCode, 'ANY');
    if (coupon) { setAppliedCoupon(coupon); alert("Cupom validado!"); }
    else { alert("Cupom inválido."); setAppliedCoupon(null); }
  };

  const handleSaveFinancial = async () => {
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, {
          financialSettings: { ...currentOrg.financialSettings, pixKey, bankInfo, instructions, paymentLink }
      });
      alert("Configurações salvas!");
  };

  const copyOrgId = () => { if (currentOrg?.id) { navigator.clipboard.writeText(currentOrg.id); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  const filteredDentists = manualDentists.filter(d => d.name.toLowerCase().includes(dentistSearch.toLowerCase()) || (d.clinicName || '').toLowerCase().includes(dentistSearch.toLowerCase()));

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER ID */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold">{currentOrg?.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-slate-400 font-mono text-sm">
            <span>ID do Laboratório:</span>
            <span className="bg-white/10 px-2 py-0.5 rounded select-all">{currentOrg?.id}</span>
            <button onClick={copyOrgId} className="p-1 hover:text-white transition-colors">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          </div>
        </div>
        <div className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Crown size={14} /> Plano {currentPlan?.name || '---'}</div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('SECTORS')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'SECTORS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Building2 size={18} /> Setores</button>
        <button onClick={() => setActiveTab('USERS')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'USERS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Users size={18} /> Equipe</button>
        <button onClick={() => setActiveTab('DENTISTS')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'DENTISTS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Stethoscope size={18} /> Clientes</button>
        <button onClick={() => setActiveTab('COMMISSIONS')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'COMMISSIONS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><DollarSign size={18} /> Comissões</button>
        <button onClick={() => setActiveTab('FINANCIAL')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'FINANCIAL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Wallet size={18} /> Pagamentos</button>
        <button onClick={() => setActiveTab('SUBSCRIPTION')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'SUBSCRIPTION' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Crown size={18} /> Assinatura</button>
      </div>

      {/* --- MODALS --- */}

      {/* MODAL: NOVO/EDITAR CLIENTE (DENTISTA) */}
      {isAddingDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Stethoscope className="text-blue-600" /> {editingDentistId ? 'Editar Cliente' : 'Novo Cliente Interno'}</h3>
                      <button onClick={() => setIsAddingDentist(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSaveManualDentist} className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Dentista</label><input required value={dentistName} onChange={e => setDentistName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clínica</label><input value={dentistClinic} onChange={e => setDentistClinic(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      {/* Fix Error: setEmail setter was used instead of setDentistEmail for the dentist modal form */}
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" value={dentistEmail} onChange={e => setDentistEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label><input value={dentistPhone} onChange={e => setDentistPhone(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">Salvar Cliente</button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: DEFINIR COMISSÕES */}
      {configUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">Tabela de Ganhos: {configUser.name}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase">Defina quanto o técnico recebe por cada serviço</p>
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
                                      <input 
                                        type="number" 
                                        value={setting?.value || ''} 
                                        onChange={e => handleCommChange(type.id, e.target.value, setting?.type || 'PERCENTAGE')}
                                        placeholder="0"
                                        className="w-20 px-2 py-1.5 border rounded-lg font-bold text-center"
                                      />
                                      <select 
                                        value={setting?.type || 'PERCENTAGE'} 
                                        onChange={e => handleCommChange(type.id, (setting?.value || 0).toString(), e.target.value as any)}
                                        className="bg-white border rounded-lg px-2 py-1.5 text-xs font-bold"
                                      >
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
                      <button onClick={saveCommissions} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg">SALVAR TABELA</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: NOVO USUÁRIO */}
      {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><UserPlus className="text-blue-600" /> Cadastrar Colaborador</h3>
                      <button onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input required value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Login)</label><input type="email" required value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Provisória</label><input type="password" required value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full px-4 py-2 border rounded-xl" minLength={6} /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                              <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-4 py-2 border rounded-xl bg-white">
                                  <option value={UserRole.COLLABORATOR}>Técnico</option>
                                  <option value={UserRole.MANAGER}>Gestor</option>
                                  <option value={UserRole.ADMIN}>Administrador</option>
                              </select>
                          </div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setor Principal</label>
                              <select value={userSector} onChange={e => setUserSector(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-white">
                                  <option value="">Geral</option>
                                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                          </div>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 mt-4 flex items-center justify-center gap-2">
                          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Conta de Acesso'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: EDITAR USUÁRIO */}
      {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Edit className="text-blue-600" /> Editar Colaborador</h3>
                      <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleUpdateUserInfo} className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input required value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input disabled value={userEmail} className="w-full px-4 py-2 border rounded-xl bg-slate-50 text-slate-400" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                              <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-4 py-2 border rounded-xl bg-white">
                                  <option value={UserRole.COLLABORATOR}>Técnico</option>
                                  <option value={UserRole.MANAGER}>Gestor</option>
                                  <option value={UserRole.ADMIN}>Administrador</option>
                              </select>
                          </div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setor Principal</label>
                              <select value={userSector} onChange={e => setUserSector(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-white">
                                  <option value="">Geral</option>
                                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                          </div>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 mt-4">
                          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: GERENCIAR PERMISSÕES */}
      {selectedUserForPerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-600" /> Controle de Acesso</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase">Permissões para {selectedUserForPerms.name}</p>
                      </div>
                      <button onClick={() => setSelectedUserForPerms(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category))).map(cat => (
                              <div key={cat} className="space-y-3">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">{cat}</h4>
                                  <div className="space-y-2">
                                      {AVAILABLE_PERMISSIONS.filter(p => p.category === cat).map(perm => (
                                          <label key={perm.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-blue-50 transition-all cursor-pointer group">
                                              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${tempPerms.includes(perm.key) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                  {tempPerms.includes(perm.key) && <Check size={14} className="text-white" />}
                                              </div>
                                              <input type="checkbox" className="hidden" checked={tempPerms.includes(perm.key)} onChange={() => togglePermission(perm.key)} />
                                              <span className={`text-sm font-bold ${tempPerms.includes(perm.key) ? 'text-blue-800' : 'text-slate-600'}`}>{perm.label}</span>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
                      <button onClick={() => setSelectedUserForPerms(null)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                      <button onClick={handleSavePermissions} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl shadow-xl hover:bg-slate-800 flex items-center justify-center gap-2"><Save size={18} /> SALVAR PERMISSÕES</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- CONTENT BY TAB --- */}

      {/* SECTORS TAB */}
      {activeTab === 'SECTORS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Novo Setor de Produção</h3>
            <form onSubmit={handleAddSector} className="flex gap-2">
              <input value={newSectorName} onChange={e => setNewSectorName(e.target.value)} placeholder="Ex: Cerâmica, Gesso..." className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"><Plus size={20}/></button>
            </form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MapPin size={20}/></div>
                    {editingSector?.id === s.id ? (
                        <input value={editingSector.name} onChange={e => setEditingSector({...editingSector, name: e.target.value})} className="border-b-2 border-blue-500 outline-none px-1 font-bold text-slate-700 bg-transparent" autoFocus onBlur={handleUpdateSector} onKeyDown={e => e.key === 'Enter' && handleUpdateSector()} />
                    ) : (
                        <span className="font-bold text-slate-700">{s.name}</span>
                    )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setEditingSector(s)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit size={16}/></button>
                    <button onClick={() => deleteSector(s.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Colaboradores do Laboratório</h3>
            <button onClick={() => setIsAddingUser(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"><UserPlus size={20}/> Novo Usuário</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                <tr><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Setor Principal</th><th className="p-4 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">{user.name.charAt(0)}</div><div><p className="font-bold text-slate-800">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></div></div></td>
                    <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">{user.role}</span></td>
                    <td className="p-4 text-slate-600 text-sm font-medium">{user.sector || 'Geral'}</td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                             <button onClick={() => openEditUser(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar Perfil"><Edit size={18}/></button>
                             <button onClick={() => handleOpenPermissions(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Gerenciar Acessos"><Lock size={18}/></button>
                             <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"><Trash2 size={18}/></button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DENTISTS TAB */}
      {activeTab === 'DENTISTS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-bold text-slate-800 text-lg">Gestão de Clientes Internos (Offline)</h3>
                <button onClick={() => { resetDentistForm(); setIsAddingDentist(true); }} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"><Plus size={20}/> Novo Cliente</button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input placeholder="Filtrar por nome ou clínica..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" value={dentistSearch} onChange={e => setDentistSearch(e.target.value)}/></div></div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                    <tr><th className="p-4">Nome do Dentista</th><th className="p-4">Clínica</th><th className="p-4">Contato</th><th className="p-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDentists.map(dentist => (
                      <tr key={dentist.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{dentist.name}</td>
                        <td className="p-4 text-slate-600 text-sm">{dentist.clinicName || '---'}</td>
                        <td className="p-4"><div className="text-xs text-slate-500">{dentist.email || 'Sem email'}</div><div className="text-xs font-bold text-slate-400">{dentist.phone || 'Sem telefone'}</div></td>
                        <td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleOpenEditDentist(dentist)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => deleteManualDentist(dentist.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button></div></td>
                      </tr>
                    ))}
                    {filteredDentists.length === 0 && (<tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">Nenhum cliente cadastrado.</td></tr>)}
                  </tbody>
                </table>
            </div>
        </div>
      )}

      {/* COMMISSIONS TAB */}
      {activeTab === 'COMMISSIONS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Tabelas de Comissão por Técnico</h3>
              <p className="text-sm text-slate-500 mb-6">Configure o valor ou percentual que cada técnico recebe por serviço finalizado.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
                      <div key={user.id} className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 transition-all bg-slate-50 group">
                          <div className="flex items-center gap-3 mb-4">
                              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-blue-600 shadow-sm border border-slate-100 text-lg">{user.name.charAt(0)}</div>
                              <div className="overflow-hidden">
                                  <p className="font-bold text-slate-800 truncate">{user.name}</p>
                                  <p className="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase w-fit">{user.role}</p>
                              </div>
                          </div>
                          <button onClick={() => openCommissionModal(user)} className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"><Edit size={14}/> Definir Ganhos</button>
                      </div>
                  ))}
              </div>
          </div>
        </div>
      )}

      {/* FINANCIAL TAB */}
      {activeTab === 'FINANCIAL' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Wallet className="text-green-600" /> Configurações de Recebimento</h3>
                  <div className="space-y-6">
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Chave PIX do Laboratório</label><input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="E-mail, CPF, CNPJ ou Aleatória" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Link de Pagamento (Cartão/Outros)</label><input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Link do Mercado Pago, PicPay, etc" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Dados Bancários / Instruções</label><textarea value={bankInfo} onChange={e => setBankInfo(e.target.value)} className="w-full px-4 py-2 border rounded-xl" rows={3} placeholder="Banco, Agência, Conta..." /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Mensagem para o Dentista no Checkout</label><input value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Ex: Após o PIX, favor enviar comprovante no WhatsApp" /></div>
                      <div className="pt-4 border-t flex justify-end"><button onClick={handleSaveFinancial} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> Salvar Financeiro</button></div>
                  </div>
              </div>
          </div>
      )}

      {/* SUBSCRIPTION TAB */}
      {activeTab === 'SUBSCRIPTION' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10"><Crown size={120} /></div>
             <div className="relative z-10">
                <p className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-1">Plano Atual</p>
                <h2 className="text-4xl font-black mb-4">{currentPlan?.name || 'Carregando...'}</h2>
                <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-300">
                   <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-green-500" /> {currentPlan?.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${currentPlan?.features.maxUsers} Usuários`}</div>
                   <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-green-500" /> {currentPlan?.features.maxStorageGB} Armazenamento</div>
                </div>
                {currentOrg?.subscriptionStatus === 'TRIAL' && (
                  <div className="mt-6 p-4 bg-orange-500/20 border border-orange-500/50 rounded-2xl flex items-center justify-between">
                    <div><p className="font-bold text-orange-400">Modo de Avaliação</p><p className="text-xs">Sua conta expira em breve. Ative agora para manter o acesso.</p></div>
                    <button onClick={() => navigate('/subscribe')} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/40"><Zap size={16}/> ATIVAR AGORA</button>
                  </div>
                )}
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpCircle className="text-blue-600" /> Upgrade de Plano</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'LAB').map(plan => (
                  <div key={plan.id} className={`p-6 rounded-2xl border-2 transition-all flex flex-col ${plan.id === currentOrg?.planId ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 hover:border-blue-200'}`}>
                    <h4 className="font-bold text-slate-800 uppercase tracking-tight mb-1">{plan.name}</h4>
                    <p className="text-2xl font-black text-slate-900 mb-4">R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-400 font-normal">/mês</span></p>
                    <ul className="text-xs space-y-2 text-slate-500 flex-1 mb-6">
                       <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> {plan.features.maxUsers === -1 ? 'Ilimitados' : plan.features.maxUsers} Usuários</li>
                       <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> {plan.features.maxStorageGB} Armazenamento</li>
                       <li className={`flex items-center gap-2 ${plan.features.hasStoreModule ? 'text-slate-800' : 'text-slate-300 line-through'}`}><Check size={14} className={plan.features.hasStoreModule ? 'text-green-500' : 'text-slate-300'}/> Loja Virtual</li>
                    </ul>
                    <button 
                      onClick={() => navigate(`/subscribe?plan=${plan.id}`)}
                      disabled={plan.id === currentOrg?.planId}
                      className={`w-full py-2.5 rounded-xl font-bold transition-all ${plan.id === currentOrg?.planId ? 'bg-blue-100 text-blue-600' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                    >
                      {plan.id === currentOrg?.planId ? 'Plano Atual' : 'Contratar'}
                    </button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
