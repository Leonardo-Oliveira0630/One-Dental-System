
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, User, CustomPrice, UserCommissionSetting, SubscriptionPlan } from '../types';
import { 
  Building2, Users, Plus, Trash2, MapPin, Mail, UserPlus, Save, 
  Stethoscope, Edit, X, DollarSign, Share2, Copy, Check, CreditCard, Crown, ArrowUpCircle, Ticket, Zap, Wallet, Loader2, ExternalLink, HelpCircle, LogIn, Percent, Phone, Home, Hash, CheckCircle, Clock, FileText, ChevronRight, RefreshCw, Database, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/firebaseService';

export const Admin = () => {
  const { 
    sectors, addSector, deleteSector, 
    allUsers, addUser, deleteUser, updateUser,
    jobTypes, currentOrg, currentPlan, updateOrganization, allPlans,
    validateCoupon, createSubscription, getSaaSInvoices, createLabWallet
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'SECTORS' | 'USERS' | 'DENTISTS' | 'COMMISSIONS' | 'FINANCIAL' | 'SUBSCRIPTION'>('SECTORS');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Invoices State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Subscription/Coupon State
  const [upgradeCoupon, setUpgradeCoupon] = useState('');
  const [appliedUpgradeCoupon, setAppliedUpgradeCoupon] = useState<any>(null);

  // Financial Wallet Form
  const [walletName, setWalletName] = useState('');
  const [walletEmail, setWalletEmail] = useState('');
  const [walletCpfCnpj, setWalletCpfCnpj] = useState('');
  const [walletPhone, setWalletPhone] = useState('');
  const [walletPostalCode, setWalletPostalCode] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [walletProvince, setWalletProvince] = useState('');

  // Form States
  const [newSectorName, setNewSectorName] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Commission Config State
  const [configUser, setConfigUser] = useState<User | null>(null);
  const [tempCommissions, setTempCommissions] = useState<UserCommissionSetting[]>([]);

  // Simple Financial States
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [instructions, setInstructions] = useState(currentOrg?.financialSettings?.instructions || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // Fetch invoices when subscription tab is active
  useEffect(() => {
    if (activeTab === 'SUBSCRIPTION' && currentOrg) {
        loadInvoices();
    }
  }, [activeTab, currentOrg]);

  const loadInvoices = async () => {
      if (!currentOrg) return;
      setLoadingInvoices(true);
      try {
          const res = await getSaaSInvoices(currentOrg.id);
          if (res.invoices) setInvoices(res.invoices);
      } catch (err) {
          console.error("Erro ao carregar faturas", err);
      } finally {
          setLoadingInvoices(false);
      }
  };

  const handleValidateUpgradeCoupon = async () => {
    if (!upgradeCoupon) return;
    const coupon = await validateCoupon(upgradeCoupon, 'ANY');
    if (coupon) {
        setAppliedUpgradeCoupon(coupon);
        alert("Cupom validado! O desconto será aplicado no checkout.");
    } else {
        alert("Cupom inválido ou expirado.");
        setAppliedUpgradeCoupon(null);
    }
  };

  const copyLabCode = () => {
      if (currentOrg) {
          navigator.clipboard.writeText(currentOrg.id);
          setCopiedCode(true);
          setTimeout(() => setCopiedCode(false), 2000);
      }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setLoading(true);
    try {
        const payload = {
            orgId: currentOrg.id,
            name: walletName,
            email: walletEmail,
            cpfCnpj: walletCpfCnpj,
            phone: walletPhone,
            postalCode: walletPostalCode,
            address: walletAddress,
            addressNumber: walletNumber,
            province: walletProvince
        };
        const res = await createLabWallet(payload);
        if (res.success) {
            alert("Carteira digital ativada com sucesso!");
        }
    } catch (err: any) {
        alert("Erro ao criar carteira: " + err.message);
    } finally {
        setLoading(false);
    }
  };

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

  const openCommissionModal = (user: User) => {
      setConfigUser(user);
      setTempCommissions(user.commissionSettings || []);
  };

  const handleCommChange = (jobTypeId: string, value: string, type: 'FIXED' | 'PERCENTAGE') => {
      const val = parseFloat(value);
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

  const walletStatus = currentOrg?.financialSettings?.walletStatus;

  return (
    <div className="space-y-6 pb-12">
      {/* Lab Code Highlight Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                  <Share2 size={24} />
              </div>
              <div>
                  <h2 className="font-bold text-lg">Conectar Dentistas</h2>
                  <p className="text-blue-100 text-sm">Forneça o código abaixo para que seus clientes vinculem as contas.</p>
              </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
              <code className="font-mono font-black text-xl tracking-wider uppercase">{currentOrg?.id || '---'}</code>
              <button 
                  onClick={copyLabCode}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm"
              >
                  {copiedCode ? <Check size={18} className="text-green-300" /> : <Copy size={18} />}
                  {copiedCode ? 'Copiado!' : 'Copiar'}
              </button>
          </div>
      </div>

      {/* Commission Modal */}
      {configUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-800">Comissões: {configUser.name}</h3>
                      <p className="text-sm text-slate-500">Defina quanto o colaborador ganha por peça concluída.</p>
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
                                          ><DollarSign size={14}/></button>
                                          <button 
                                            onClick={() => handleCommChange(type.id, (comm?.value || 0).toString(), 'PERCENTAGE')}
                                            className={`p-1.5 rounded ${comm?.type === 'PERCENTAGE' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                          ><Percent size={14}/></button>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                      <button onClick={() => setConfigUser(null)} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl">Cancelar</button>
                      <button onClick={saveCommissions} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">Salvar Tabela</button>
                  </div>
              </div>
          </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('SECTORS')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'SECTORS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Building2 size={18} /> Setores</button>
        <button onClick={() => setActiveTab('USERS')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'USERS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Users size={18} /> Equipe</button>
        <button onClick={() => setActiveTab('COMMISSIONS')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'COMMISSIONS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><DollarSign size={18} /> Comissões</button>
        <button onClick={() => setActiveTab('FINANCIAL')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'FINANCIAL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Wallet size={18} /> Pagamentos</button>
        <button onClick={() => setActiveTab('SUBSCRIPTION')} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'SUBSCRIPTION' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Crown size={18} /> Assinatura</button>
      </div>

      {/* SECTORS CONTENT */}
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

      {/* USERS CONTENT */}
      {activeTab === 'USERS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Colaboradores do Laboratório</h3>
            <button onClick={() => setIsAddingUser(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2"><UserPlus size={20}/> Novo Usuário</button>
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

      {/* MODAL NOVO USUÁRIO */}
      {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold mb-6">Cadastrar Colaborador</h3>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <input required value={userName} onChange={e => setUserName(e.target.value)} placeholder="Nome Completo" className="w-full px-4 py-2 border rounded-xl" />
                      <input required type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2 border rounded-xl" />
                      <input required type="password" value={userPass} onChange={e => setUserPass(e.target.value)} placeholder="Senha Inicial" className="w-full px-4 py-2 border rounded-xl" minLength={6} />
                      <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-4 py-2 border rounded-xl bg-white">
                          <option value={UserRole.COLLABORATOR}>Colaborador / Técnico</option>
                          <option value={UserRole.MANAGER}>Gestor / Supervisor</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                      </select>
                      <select value={userSector} onChange={e => setUserSector(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-white">
                          <option value="">Setor: Nenhum (Geral)</option>
                          {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 py-2 font-bold text-slate-500">Cancelar</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Criar Conta</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* COMMISSIONS CONTENT */}
      {activeTab === 'COMMISSIONS' && (
          <div className="grid gap-4 animate-in fade-in slide-in-from-left-4">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl text-white"><DollarSign size={24}/></div>
                  <div>
                      <h3 className="font-bold text-blue-900">Regras de Ganhos</h3>
                      <p className="text-sm text-blue-700">Configure as comissões por colaborador.</p>
                  </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="divide-y divide-slate-100">
                      {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
                          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">{user.name.charAt(0)}</div>
                                  <div>
                                      <p className="font-bold text-slate-800">{user.name}</p>
                                      <p className="text-xs text-blue-600 font-bold">{user.sector || 'Geral'}</p>
                                  </div>
                              </div>
                              <button onClick={() => openCommissionModal(user)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold flex items-center gap-2 transition-colors"><Edit size={16} /> Configurar Tabela</button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* FINANCIAL CONTENT */}
      {activeTab === 'FINANCIAL' && (
          <div className="animate-in fade-in slide-in-from-left-4 space-y-8">
              {/* Seção de Onboarding Asaas */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CreditCard className="text-blue-600"/> Recebimento Online (Asaas)</h3>
                          <p className="text-sm text-slate-500">Configure sua carteira digital para aceitar Cartão e PIX dos seus clientes.</p>
                      </div>
                      {walletStatus === 'ACTIVE' && (
                          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                              <CheckCircle size={20}/> CONTA ATIVA
                          </div>
                      )}
                  </div>

                  {walletStatus !== 'ACTIVE' ? (
                      <form onSubmit={handleCreateWallet} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl text-blue-800 text-sm mb-2">
                              <strong>Atenção:</strong> Estes dados serão usados para criar sua subconta no processador de pagamentos Asaas. O laboratório deve ser o titular dos dados.
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Nome/Razão Social</label>
                              <div className="relative">
                                  <Building2 className="absolute left-3 top-3 text-slate-400" size={18}/>
                                  <input required value={walletName} onChange={e => setWalletName(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" placeholder="Nome Completo ou Empresa"/>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Email Financeiro</label>
                              <div className="relative">
                                  <Mail className="absolute left-3 top-3 text-slate-400" size={18}/>
                                  <input required type="email" value={walletEmail} onChange={e => setWalletEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" placeholder="financeiro@empresa.com"/>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                              <div className="relative">
                                  <Hash className="absolute left-3 top-3 text-slate-400" size={18}/>
                                  <input required value={walletCpfCnpj} onChange={e => setWalletCpfCnpj(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" placeholder="00.000.000/0000-00"/>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Telefone/WhatsApp</label>
                              <div className="relative">
                                  <Phone className="absolute left-3 top-3 text-slate-400" size={18}/>
                                  <input required value={walletPhone} onChange={e => setWalletPhone(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" placeholder="(00) 00000-0000"/>
                              </div>
                          </div>
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 mb-1">CEP</label>
                                  <input required value={walletPostalCode} onChange={e => setWalletPostalCode(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="00000-000"/>
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-sm font-bold text-slate-700 mb-1">Endereço (Logradouro)</label>
                                  <div className="relative">
                                      <Home className="absolute left-3 top-3 text-slate-400" size={18}/>
                                      <input required value={walletAddress} onChange={e => setWalletAddress(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" placeholder="Rua, Av..."/>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 mb-1">Número</label>
                                  <input required value={walletNumber} onChange={e => setWalletNumber(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="123"/>
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-sm font-bold text-slate-700 mb-1">Estado (UF)</label>
                                  <input required value={walletProvince} onChange={e => setWalletProvince(e.target.value.toUpperCase())} maxLength={2} className="w-full px-4 py-2 border rounded-xl" placeholder="Ex: SP"/>
                              </div>
                          </div>
                          <button type="submit" disabled={loading} className="md:col-span-2 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                              {loading ? <Loader2 className="animate-spin"/> : <><Zap size={20}/> Ativar Minha Carteira Digital</>}
                          </button>
                      </form>
                  ) : (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                           <div className="flex items-center gap-4 text-slate-600">
                               <CheckCircle className="text-green-500" size={32}/>
                               <div>
                                   <p className="font-bold">Conta Vinculada com Sucesso!</p>
                                   <p className="text-sm">Seus recebimentos da Loja Virtual cairão diretamente nesta conta Asaas.</p>
                               </div>
                           </div>
                      </div>
                  )}
              </div>

              {/* Seção de Dados Manuais */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><DollarSign className="text-green-600"/> Dados para Recebimento Manual</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Chave PIX</label>
                          <input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="CPF, Email, Celular..." />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Link Externo de Pagamento</label>
                          <input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Link do MercadoPago, PicPay..." />
                      </div>
                      <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-1">Dados Bancários / Instruções</label>
                          <textarea value={bankInfo} onChange={e => setBankInfo(e.target.value)} className="w-full px-4 py-2 border rounded-xl" rows={3} placeholder="Banco, Agência, Conta..." />
                      </div>
                  </div>
                  <button onClick={handleSaveFinancial} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"><Save size={20}/> Salvar Configurações</button>
              </div>
          </div>
      )}

      {/* SUBSCRIPTION CONTENT */}
      {activeTab === 'SUBSCRIPTION' && (
          <div className="animate-in fade-in slide-in-from-left-4 space-y-8">
              {/* Plano Atual Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Crown size={120} />
                  </div>
                  <div className="relative z-10">
                      <p className="text-indigo-300 text-sm font-bold uppercase tracking-widest mb-1">Seu Plano Atual</p>
                      <h2 className="text-4xl font-black">{currentPlan?.name || 'Carregando...'}</h2>
                      <div className="mt-4 flex flex-wrap gap-3">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30">
                              <Check size={12}/> ASSINATURA ATIVA
                          </div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold border border-white/10">
                              <Database size={12}/> {currentPlan?.features.maxStorageGB}GB STORAGE
                          </div>
                      </div>
                  </div>
              </div>

              {/* Upgrade de Plano */}
              <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ArrowUpCircle className="text-blue-600"/> Upgrade de Plano</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {allPlans.filter(p => p.targetAudience === 'LAB' && p.active).map(plan => {
                          const isCurrent = plan.id === currentOrg?.planId;
                          return (
                            <div key={plan.id} className={`bg-white p-6 rounded-2xl border-2 transition-all group flex flex-col ${isCurrent ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest">{plan.name}</h4>
                                    {isCurrent && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ATUAL</span>}
                                </div>
                                <p className="text-3xl font-black text-slate-900">R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-400 font-normal">/mês</span></p>
                                <ul className="mt-6 space-y-3 flex-1">
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <Check size={14} className="text-green-500"/> {plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-slate-600">
                                        <Check size={14} className="text-green-500"/> {plan.features.maxStorageGB}GB Armazenamento
                                    </li>
                                    <li className={`flex items-center gap-2 text-sm ${plan.features.hasStoreModule ? 'text-slate-600' : 'text-slate-300'}`}>
                                        <Check size={14} className={plan.features.hasStoreModule ? 'text-green-500' : 'text-slate-300'}/> Loja Virtual
                                    </li>
                                </ul>
                                {!isCurrent && (
                                    <button 
                                        onClick={() => navigate(`/subscribe?plan=${plan.id}${appliedUpgradeCoupon ? `&coupon=${appliedUpgradeCoupon.code}` : ''}`)} 
                                        className="w-full mt-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                                    >
                                        Mudar para este
                                    </button>
                                )}
                            </div>
                          );
                      })}
                  </div>

                  {/* CUPOM PARA LABS */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md">
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Ticket size={18} className="text-indigo-600"/> Possui um Cupom?</h4>
                      <div className="flex gap-2">
                          <input 
                              value={upgradeCoupon}
                              onChange={e => setUpgradeCoupon(e.target.value.toUpperCase())}
                              placeholder="CÓDIGO"
                              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                              disabled={!!appliedUpgradeCoupon}
                          />
                          <button 
                             onClick={handleValidateUpgradeCoupon}
                             disabled={!!appliedUpgradeCoupon}
                             className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                          >
                              {appliedUpgradeCoupon ? 'Aplicado' : 'Validar'}
                          </button>
                      </div>
                      {appliedUpgradeCoupon && <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1"><Check size={12}/> Cupom {appliedUpgradeCoupon.code} pronto para uso!</p>}
                  </div>
              </div>

              {/* Histórico de Faturas */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="text-blue-600"/> Histórico de Faturas</h3>
                          <p className="text-sm text-slate-500">Acesse seus boletos e notas fiscais das mensalidades.</p>
                      </div>
                      <button onClick={loadInvoices} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-blue-600 transition-colors">
                          <RefreshCw size={20} className={loadingInvoices ? "animate-spin" : ""} />
                      </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                      {loadingInvoices ? (
                          <div className="p-12 text-center text-slate-400">
                              <Loader2 className="animate-spin mx-auto mb-2"/> Carregando histórico...
                          </div>
                      ) : invoices.length === 0 ? (
                          <div className="p-12 text-center text-slate-400">Nenhuma fatura encontrada.</div>
                      ) : (
                          invoices.map(inv => (
                              <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-4">
                                      <div className={`p-3 rounded-xl ${inv.status === 'RECEIVED' ? 'bg-green-100 text-green-600' : inv.status === 'OVERDUE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                          <CreditCard size={20} />
                                      </div>
                                      <div>
                                          <p className="font-bold text-slate-800">{inv.description}</p>
                                          <p className="text-xs text-slate-400 flex items-center gap-2">
                                              <Calendar size={12}/> Vencimento: {new Date(inv.dueDate).toLocaleDateString()}
                                          </p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                      <div className="text-right">
                                          <p className="font-black text-slate-800 text-lg">R$ {inv.value.toFixed(2)}</p>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${inv.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                              {inv.status === 'RECEIVED' ? 'Paga' : inv.status === 'OVERDUE' ? 'Atrasada' : 'Pendente'}
                                          </span>
                                      </div>
                                      {inv.invoiceUrl && (
                                          <a 
                                              href={inv.invoiceUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="p-3 bg-white border border-slate-200 rounded-xl text-blue-600 hover:border-blue-300 hover:shadow-md transition-all"
                                          >
                                              <ExternalLink size={20} />
                                          </a>
                                      )}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
