
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, User, UserCommissionSetting, Coupon, SubscriptionPlan, ManualDentist } from '../types';
import { 
  Building2, Users, Plus, Trash2, MapPin, Mail, UserPlus, Save, 
  Stethoscope, Edit, X, DollarSign, Copy, Check, Crown, ArrowUpCircle, 
  Ticket, Wallet, Loader2, Percent, CheckCircle, Briefcase, Search, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/firebaseService';

export const Admin = () => {
  const { 
    sectors, addSector, deleteSector, 
    allUsers, deleteUser, updateUser,
    jobTypes, currentOrg, currentPlan, updateOrganization, allPlans,
    validateCoupon, createLabWallet,
    manualDentists, addManualDentist, deleteManualDentist, updateManualDentist
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'SECTORS' | 'USERS' | 'DENTISTS' | 'COMMISSIONS' | 'FINANCIAL' | 'SUBSCRIPTION'>('SECTORS');
  const [copied, setCopied] = useState(false);

  // --- FORM STATES ---
  
  // Setores
  const [newSectorName, setNewSectorName] = useState('');
  
  // Usuários (Equipe)
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');

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
  const [isRegisteringWallet, setIsRegisteringWallet] = useState(false);
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [instructions, setInstructions] = useState(currentOrg?.financialSettings?.instructions || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');
  const [walletForm, setWalletForm] = useState({
    name: currentOrg?.name || '',
    email: '',
    cpfCnpj: '',
    phone: '',
    postalCode: '',
    address: '',
    addressNumber: '',
    province: ''
  });

  // Assinatura
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // --- HANDLERS ---

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectorName.trim()) {
      await addSector(newSectorName.trim());
      setNewSectorName('');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPass || !currentOrg) return;
    try {
        await api.apiRegisterUserInOrg(userEmail, userPass, userName, userRole, currentOrg.id);
        setIsAddingUser(false);
        setUserName(''); setUserEmail(''); setUserPass('');
    } catch (err: any) {
        alert("Erro ao criar usuário: " + err.message);
    }
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

      const data = {
          name: dentistName,
          clinicName: dentistClinic,
          email: dentistEmail,
          phone: dentistPhone
      };

      try {
          if (editingDentistId) {
              await updateManualDentist(editingDentistId, data);
              alert("Cliente atualizado!");
          } else {
              await addManualDentist({ ...data, createdAt: new Date() });
              alert("Cliente cadastrado!");
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
          alert("Tabela de comissão atualizada!");
      }
  };

  const handleRegisterWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsRegisteringWallet(true);
    try {
      await createLabWallet({ ...walletForm, orgId: currentOrg.id });
      alert("Sua conta digital One Dental foi criada com sucesso!");
    } catch (err: any) {
      alert("Erro ao criar conta: " + err.message);
    } finally {
      setIsRegisteringWallet(false);
    }
  };

  const handleApplyCoupon = async () => {
    const coupon = await validateCoupon(couponCode, 'ANY');
    if (coupon) {
      setAppliedCoupon(coupon);
      alert("Cupom validado!");
    } else {
      alert("Cupom inválido.");
      setAppliedCoupon(null);
    }
  };

  const handleSaveFinancial = async () => {
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, {
          financialSettings: {
              ...currentOrg.financialSettings,
              pixKey, bankInfo, instructions, paymentLink
          }
      });
      alert("Configurações financeiras salvas!");
  };

  const copyOrgId = () => {
    if (currentOrg?.id) {
      navigator.clipboard.writeText(currentOrg.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const labPlans = allPlans.filter(p => p.targetAudience === 'LAB');
  const filteredDentists = manualDentists.filter(d => 
    d.name.toLowerCase().includes(dentistSearch.toLowerCase()) || 
    (d.clinicName || '').toLowerCase().includes(dentistSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
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
        <div className="flex items-center gap-4">
           <div className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Crown size={14} /> Plano {currentPlan?.name || 'Carregando...'}
           </div>
        </div>
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

      {/* CONTENT: SECTORS */}
      {activeTab === 'SECTORS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Novo Setor de Produção</h3>
            <form onSubmit={handleAddSector} className="flex gap-2">
              <input value={newSectorName} onChange={e => setNewSectorName(e.target.value)} placeholder="Ex: Cerâmica, Gesso..." className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"><Plus size={20}/></button>
            </form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MapPin size={20}/></div>
                    <span className="font-bold text-slate-700">{s.name}</span>
                </div>
                <button onClick={() => deleteSector(s.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT: USERS (EQUIPE) */}
      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Colaboradores do Laboratório</h3>
            <button onClick={() => setIsAddingUser(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"><UserPlus size={20}/> Novo Usuário</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Cargo</th>
                  <th className="p-4">Setor Principal</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">{user.name.charAt(0)}</div>
                            <div>
                                <p className="font-bold text-slate-800">{user.name}</p>
                                <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                        </div>
                    </td>
                    <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">{user.role}</span></td>
                    <td className="p-4 text-slate-600 text-sm font-medium">{user.sector || 'Geral'}</td>
                    <td className="p-4 text-right">
                        <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT: DENTISTS (CLIENTES MANUAIS) */}
      {activeTab === 'DENTISTS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-bold text-slate-800 text-lg">Gestão de Clientes Internos</h3>
                <button 
                  onClick={() => { resetDentistForm(); setIsAddingDentist(true); }}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"
                >
                    <Plus size={20}/> Novo Cliente
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                      placeholder="Filtrar clientes..." 
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none"
                      value={dentistSearch}
                      onChange={e => setDentistSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                      <th className="p-4">Nome do Dentista</th>
                      <th className="p-4">Clínica</th>
                      <th className="p-4">Contato</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDentists.map(dentist => (
                      <tr key={dentist.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{dentist.name}</td>
                        <td className="p-4 text-slate-600 text-sm">{dentist.clinicName || '---'}</td>
                        <td className="p-4">
                            <div className="text-xs text-slate-500">{dentist.email || 'Sem email'}</div>
                            <div className="text-xs font-bold text-slate-400">{dentist.phone || 'Sem telefone'}</div>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => handleOpenEditDentist(dentist)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit size={18}/></button>
                            <button onClick={() => deleteManualDentist(dentist.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                    {filteredDentists.length === 0 && (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">Nenhum cliente interno cadastrado.</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
        </div>
      )}

      {/* CONTENT: COMMISSIONS */}
      {activeTab === 'COMMISSIONS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Tabelas de Comissão por Técnico</h3>
              <p className="text-sm text-slate-500 mb-6">Configure o valor ou percentual que cada técnico recebe por serviço finalizado.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
                      <div key={user.id} className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 transition-all bg-slate-50 group">
                          <div className="flex items-center gap-3 mb-4">
                              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-blue-600 shadow-sm border border-slate-100 text-lg">
                                  {user.name.charAt(0)}
                              </div>
                              <div className="overflow-hidden">
                                  <p className="font-bold text-slate-800 truncate">{user.name}</p>
                                  <p className="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase w-fit">{user.role}</p>
                              </div>
                          </div>
                          <button 
                            onClick={() => openCommissionModal(user)}
                            className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                          >
                              <Edit size={14}/> Definir Ganhos
                          </button>
                      </div>
                  ))}
              </div>
          </div>
        </div>
      )}

      {/* CONTENT: FINANCIAL */}
      {activeTab === 'FINANCIAL' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
          {currentOrg?.financialSettings?.walletStatus !== 'ACTIVE' ? (
            <div className="bg-indigo-600 text-white p-8 rounded-3xl shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><Wallet /> Ative sua Conta Digital</h3>
                  <p className="text-indigo-100 text-sm">Receba pagamentos via PIX e Cartão de seus clientes diretamente no One Dental. Taxas exclusivas de 2%.</p>
               </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="bg-green-600 p-3 rounded-full text-white"><CheckCircle /></div>
                  <div>
                    <p className="font-bold text-green-900 text-lg">Conta Digital One Dental Ativa</p>
                    <p className="text-green-700 text-sm font-mono">{currentOrg.financialSettings.asaasWalletId}</p>
                  </div>
               </div>
               <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full font-bold text-xs">CONECTADO</span>
            </div>
          )}

          {currentOrg?.financialSettings?.walletStatus !== 'ACTIVE' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Briefcase className="text-blue-500" /> Cadastro para Recebimentos</h3>
               <form onSubmit={handleRegisterWallet} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Razão Social</label>
                    <input required value={walletForm.name} onChange={e => setWalletForm({...walletForm, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Financeiro</label>
                    <input required type="email" value={walletForm.email} onChange={e => setWalletForm({...walletForm, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                    <input required value={walletForm.cpfCnpj} onChange={e => setWalletForm({...walletForm, cpfCnpj: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                    <input required value={walletForm.phone} onChange={e => setWalletForm({...walletForm, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
                  </div>
                  <button type="submit" disabled={isRegisteringWallet} className="md:col-span-2 py-4 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                    {isRegisteringWallet ? <Loader2 className="animate-spin"/> : 'Criar Conta One Dental System'}
                  </button>
               </form>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><DollarSign className="text-green-600"/> Dados para Pagamento Manual</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Chave PIX</label>
                      <input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl" placeholder="Chave PIX..." />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Link de Pagamento</label>
                      <input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl" placeholder="Link externo..." />
                  </div>
              </div>
              <button onClick={handleSaveFinancial} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"><Save size={20}/> Salvar Dados</button>
          </div>
        </div>
      )}

      {/* CONTENT: SUBSCRIPTION */}
      {activeTab === 'SUBSCRIPTION' && (
          <div className="animate-in fade-in slide-in-from-left-4 space-y-6">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl shadow-xl text-white flex justify-between items-center">
                  <div>
                      <p className="text-slate-400 text-sm font-bold uppercase mb-1">Plano Atual</p>
                      <h2 className="text-3xl font-bold">{currentPlan?.name || 'SaaS Básico'}</h2>
                  </div>
                  <Crown size={64} className="text-yellow-400 opacity-20" />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mt-8 mb-4">Opções de Upgrade</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {labPlans.map(plan => (
                      <div key={plan.id} className={`bg-white p-6 rounded-3xl border-2 transition-all flex flex-col shadow-sm ${plan.id === currentOrg?.planId ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                          <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">{plan.name}</h4>
                          <p className="text-3xl font-black text-slate-900 mt-2">R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-400">/mês</span></p>
                          <button onClick={() => navigate(`/subscribe?plan=${plan.id}`)} className="w-full mt-8 py-4 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl transition-all shadow-lg">ALTERAR PLANO</button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* MODAL: CADASTRAR/EDITAR DENTISTA (MANUAL) */}
      {isAddingDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Stethoscope className="text-blue-600" /> 
                    {editingDentistId ? 'Editar Cliente Interno' : 'Cadastrar Cliente Interno'}
                  </h3>
                  <form onSubmit={handleSaveManualDentist} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                        <input required value={dentistName} onChange={e => setDentistName(e.target.value)} placeholder="Dr. Nome do Cliente" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Clínica / Empresa</label>
                        {/* Fix: use setDentistClinic instead of setClinicName which doesn't exist */}
                        <input value={dentistClinic} onChange={e => setDentistClinic(e.target.value)} placeholder="Nome da Clínica" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                        <input type="email" value={dentistEmail} onChange={e => setEditEmail(e.target.value)} placeholder="cliente@email.com" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefone</label>
                        <input value={dentistPhone} onChange={e => setDentistPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => { setIsAddingDentist(false); resetDentistForm(); }} className="flex-1 py-2 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                            {editingDentistId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: NOVO USUÁRIO (EQUIPE) */}
      {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><UserPlus className="text-blue-600" /> Cadastrar Colaborador</h3>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <input required value={userName} onChange={e => setUserName(e.target.value)} placeholder="Nome Completo" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      <input required type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      <input required type="password" value={userPass} onChange={e => setUserPass(e.target.value)} placeholder="Senha Inicial" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" minLength={6} />
                      <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value={UserRole.COLLABORATOR}>Colaborador / Técnico</option>
                          <option value={UserRole.MANAGER}>Gestor / Supervisor</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                      </select>
                      <select value={userSector} onChange={e => setUserSector(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Setor: Nenhum (Geral)</option>
                          {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 py-2 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors">Criar Acesso</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: CONFIGURAR COMISSÕES */}
      {configUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Comissões: {configUser.name}</h3>
                        <p className="text-sm text-slate-500">Defina os ganhos para cada serviço concluído.</p>
                      </div>
                      <button onClick={() => setConfigUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                      {jobTypes.map(type => {
                          const comm = tempCommissions.find(c => c.jobTypeId === type.id);
                          return (
                              <div key={type.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                  <div className="flex-1">
                                      <p className="font-bold text-slate-700">{type.name}</p>
                                      <p className="text-xs text-slate-400">Preço Base: R$ {type.basePrice.toFixed(2)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <input 
                                        type="number" 
                                        value={comm?.value || ''} 
                                        placeholder="0.00"
                                        onChange={e => handleCommChange(type.id, e.target.value, comm?.type || 'FIXED')}
                                        className="w-24 px-3 py-2 border rounded-lg text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                      />
                                      <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                          <button 
                                            onClick={() => handleCommChange(type.id, (comm?.value || 0).toString(), 'FIXED')}
                                            className={`p-1.5 rounded ${comm?.type === 'FIXED' || !comm?.type ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                            title="Valor Fixo"
                                          ><DollarSign size={14}/></button>
                                          <button 
                                            onClick={() => handleCommChange(type.id, (comm?.value || 0).toString(), 'PERCENTAGE')}
                                            className={`p-1.5 rounded ${comm?.type === 'PERCENTAGE' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                            title="Percentual"
                                          ><Percent size={14}/></button>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                      {jobTypes.length === 0 && <p className="text-center py-4 text-slate-400 italic">Cadastre serviços antes de definir comissões.</p>}
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                      <button onClick={() => setConfigUser(null)} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl">Cancelar</button>
                      <button onClick={saveCommissions} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">Salvar Alterações</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
