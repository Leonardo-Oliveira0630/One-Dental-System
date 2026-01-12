import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, User, UserCommissionSetting, Coupon, SubscriptionPlan, ManualDentist, PermissionKey, Sector } from '../types';
import { 
  Building2, Users, Plus, Trash2, MapPin, Mail, UserPlus, Save, 
  Stethoscope, Edit, X, DollarSign, Copy, Check, Crown, ArrowUpCircle, 
  Ticket, Wallet, Loader2, Percent, CheckCircle, Briefcase, Search, Phone, ShieldCheck, Lock, Eye, Activity, Package, Zap, AlertCircle, CreditCard, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/firebaseService';

const AVAILABLE_PERMISSIONS: { key: PermissionKey, label: string, category: string }[] = [
    { key: 'jobs:view', label: 'Ver Lista e Detalhes', category: 'Produção' },
    { key: 'jobs:create', label: 'Criar Novos Trabalhos', category: 'Produção' },
    { key: 'jobs:edit', label: 'Editar Dados de Trabalhos', category: 'Produção' },
    { key: 'jobs:delete', label: 'Excluir Trabalhos', category: 'Produção' },
    { key: 'vip:view', label: 'Acessar Produção VIP', category: 'Produção' },
    { key: 'calendar:view', label: 'Acessar Calendário', category: 'Produção' },
    { key: 'finance:view', label: 'Ver Dashboard Financeiro', category: 'Financeiro' },
    { key: 'finance:manage', label: 'Gerenciar Despesas e Faturas', category: 'Financeiro' },
    { key: 'commissions:view', label: 'Ver Extrato de Comissões', category: 'Financeiro' },
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
  const [newSectorName, setNewSectorName] = useState('');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');

  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [tempPerms, setTempPerms] = useState<PermissionKey[]>([]);

  const [isAddingDentist, setIsAddingDentist] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [dentistName, setDentistName] = useState('');
  const [dentistClinic, setDentistClinic] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [dentistPhone, setDentistPhone] = useState('');
  const [dentistSearch, setDentistSearch] = useState('');

  const [configUser, setConfigUser] = useState<User | null>(null);
  const [tempCommissions, setTempCommissions] = useState<UserCommissionSetting[]>([]);

  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [instructions, setInstructions] = useState(currentOrg?.financialSettings?.instructions || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // Asaas KYC State
  const [kycName, setKycName] = useState(currentOrg?.name || '');
  const [kycCpfCnpj, setKycCpfCnpj] = useState('');
  const [kycEmail, setKycEmail] = useState('');
  const [kycPhone, setKycPhone] = useState('');
  const [kycAddress, setKycAddress] = useState('');
  const [kycZip, setKycZip] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // --- HANDLERS ---

  const handleCreateWallet = async () => {
    if (!kycCpfCnpj || !kycEmail || !currentOrg) return;
    setIsSubmitting(true);
    try {
        const accountData = {
            name: kycName,
            email: kycEmail,
            cpfCnpj: kycCpfCnpj.replace(/\D/g, ''),
            phone: kycPhone,
            mobilePhone: kycPhone,
            address: kycAddress,
            postalCode: kycZip.replace(/\D/g, ''),
            companyType: kycCpfCnpj.length > 11 ? 'LIMITED' : 'INDIVIDUAL'
        };
        await createLabWallet({ orgId: currentOrg.id, accountData });
        alert("Solicitação de conta enviada ao Asaas!");
    } catch (err: any) {
        alert("Erro ao criar conta: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPass || !currentOrg) return;
    setIsSubmitting(true);
    try {
        // Chamando a Cloud Function para criar o usuário no Auth e no Firestore
        await api.apiRegisterUserInOrg(userEmail, userPass, userName, userRole, currentOrg.id);
        setIsAddingUser(false);
        setUserName(''); setUserEmail(''); setUserPass('');
        alert("Colaborador cadastrado com sucesso! Ele já pode acessar o sistema.");
    } catch (err: any) {
        console.error("Erro ao registrar:", err);
        alert("Erro ao criar usuário. Verifique se a Cloud Function está implantada ou se houve erro de permissão.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenPermissions = (user: User) => {
      setSelectedUserForPerms(user);
      setTempPerms(user.permissions || []);
  };

  const togglePermission = (key: PermissionKey) => {
      setTempPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSavePermissions = async () => {
      if (!selectedUserForPerms) return;
      setIsSubmitting(true);
      try {
        await updateUser(selectedUserForPerms.id, { permissions: tempPerms });
        setSelectedUserForPerms(null);
        alert("Permissões de acesso atualizadas!");
      } catch (err: any) {
        console.error(err);
        alert("Falha ao salvar permissões: " + (err.message || "Erro desconhecido"));
      } finally {
        setIsSubmitting(false);
      }
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
          setIsSubmitting(true);
          try {
            await updateUser(configUser.id, { commissionSettings: tempCommissions });
            setConfigUser(null);
            alert("Comissões salvas!");
          } catch(e: any) {
            alert("Erro ao salvar comissões.");
          } finally {
            setIsSubmitting(false);
          }
      }
  };

  const handleSaveFinancial = async () => {
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, {
          financialSettings: { ...currentOrg.financialSettings, pixKey, bankInfo, instructions, paymentLink }
      });
      alert("Configurações salvas!");
  };

  const copyOrgId = () => { if (currentOrg?.id) { navigator.clipboard.writeText(currentOrg.id); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  const safeUsers = allUsers || [];
  const filteredDentists = (manualDentists || []).filter(d => d.name.toLowerCase().includes(dentistSearch.toLowerCase()) || (d.clinicName || '').toLowerCase().includes(dentistSearch.toLowerCase()));

  const asaasWalletId = currentOrg?.financialSettings?.asaasWalletId;
  const asaasStatus = currentOrg?.financialSettings?.asaasWalletStatus || 'Não Criada';

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
            {(sectors || []).map(s => (
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

      {/* FINANCIAL TAB (Reformulada para Criação de Conta Asaas) */}
      {activeTab === 'FINANCIAL' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              
              {/* CONTA DIGITAL ASAAS */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="text-blue-600" /> Conta Digital ProTrack (Subconta Asaas)
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${asaasWalletId ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          {asaasStatus === 'PENDING' ? 'AGUARDANDO APROVAÇÃO' : asaasStatus}
                      </div>
                  </div>

                  {!asaasWalletId ? (
                      <div className="space-y-6">
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                              <Info className="text-blue-600 shrink-0" size={20} />
                              <p className="text-xs text-blue-800 leading-relaxed">
                                  Para receber pagamentos automaticamente dos seus dentistas via cartão de crédito e PIX, você precisa criar uma subconta digital. O valor cai diretamente nela, descontada a taxa da plataforma.
                              </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome/Razão Social</label><input value={kycName} onChange={e => setKycName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF ou CNPJ</label><input value={kycCpfCnpj} onChange={e => setKycCpfCnpj(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Apenas números" /></div>
                              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail de Notificações</label><input type="email" value={kycEmail} onChange={e => setKycEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone/Celular</label><input value={kycPhone} onChange={e => setKycPhone(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Completo</label><input value={kycAddress} onChange={e => setKycAddress(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Rua, Número, Bairro, Cidade, UF" /></div>
                              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label><input value={kycZip} onChange={e => setKycZip(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                          </div>

                          <button 
                            onClick={handleCreateWallet}
                            disabled={isSubmitting || !kycCpfCnpj}
                            className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                              {isSubmitting ? <Loader2 className="animate-spin" /> : <><CreditCard /> CRIAR MINHA CONTA DIGITAL</>}
                          </button>
                      </div>
                  ) : (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase">Sua API Key Asaas (Transações)</p>
                              <p className="font-mono text-sm font-bold text-slate-700 break-all">{asaasWalletId}</p>
                          </div>
                          <div className="text-right">
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Conta Gerada em:</p>
                               <p className="font-bold text-slate-700">{new Date(currentOrg.createdAt).toLocaleDateString()}</p>
                          </div>
                      </div>
                  )}
              </div>

              {/* CONFIGURAÇÕES MANUAIS (BACKUP) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Wallet className="text-green-600" /> Recebimentos Manuais (Offline)</h3>
                  <div className="space-y-6">
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Chave PIX do Laboratório</label><input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="E-mail, CPF, CNPJ ou Aleatória" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Link de Pagamento (Cartão/Outros)</label><input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Link do Mercado Pago, PicPay, etc" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Dados Bancários / Instruções</label><textarea value={bankInfo} onChange={e => setBankInfo(e.target.value)} className="w-full px-4 py-2 border rounded-xl" rows={3} placeholder="Banco, Agência, Conta..." /></div>
                      <div className="pt-4 border-t flex justify-end"><button onClick={handleSaveFinancial} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> Salvar Dados Offline</button></div>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Demais abas permanecem iguais) ... */}
      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Colaboradores do Laboratório</h3>
            <button onClick={() => setIsAddingUser(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"><UserPlus size={20}/> Novo Usuário</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {safeUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                    <AlertCircle size={40} className="text-slate-300" />
                    <div>
                        <p className="font-bold">Acesso aos dados de usuários negado.</p>
                        <p className="text-xs">Verifique as permissões no Firestore Rules.</p>
                    </div>
                </div>
            ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                    <tr><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Setor Principal</th><th className="p-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
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
            )}
          </div>
        </div>
      )}

    </div>
  );
};
