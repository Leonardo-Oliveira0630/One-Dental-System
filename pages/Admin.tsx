
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
              alert("Dados do cliente atualizados!");
          } else {
              await addManualDentist({ ...data, createdAt: new Date() });
              alert("Cliente interno cadastrado com sucesso!");
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

      {/* CONTENT: DENTISTS (CLIENTES MANUAIS / OFFLINE) */}
      {activeTab === 'DENTISTS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-bold text-slate-800 text-lg">Gestão de Clientes Internos (Offline)</h3>
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
                      placeholder="Filtrar por nome ou clínica..." 
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
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => handleOpenEditDentist(dentist)} 
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit size={18}/>
                                </button>
                                <button 
                                    onClick={() => deleteManualDentist(dentist.id)} 
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                    {filteredDentists.length === 0 && (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">Nenhum cliente cadastrado.</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
        </div>
      )}

      {/* MODAL: CADASTRAR/EDITAR DENTISTA (MANUAL) */}
      {isAddingDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Stethoscope className="text-blue-600" /> 
                    {/* Fixed Error on line 318: Changed 'editingId' to 'editingDentistId' */}
                    {editingDentistId ? 'Editar Cliente Interno' : 'Cadastrar Cliente Interno'}
                  </h3>
                  <form onSubmit={handleSaveManualDentist} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                        <input required value={dentistName} onChange={e => setDentistName(e.target.value)} placeholder="Dr. Nome do Cliente" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Clínica / Empresa</label>
                        <input value={dentistClinic} onChange={e => setClinicName(e.target.value)} placeholder="Nome da Clínica" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                        <input type="email" value={dentistEmail} onChange={e => setDentistEmail(e.target.value)} placeholder="cliente@email.com" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefone</label>
                        <input value={dentistPhone} onChange={e => setDentistPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => { setIsAddingDentist(false); resetDentistForm(); }} className="flex-1 py-2 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors">Salvar Dados</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- OUTRAS TABS MANTIDAS PARA INTEGRIDADE --- */}
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
    </div>
  );
};
