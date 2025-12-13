import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, User, CustomPrice } from '../types';
import { 
  Building2, Users, Plus, Trash2, MapPin, Mail, UserPlus, Save, 
  Stethoscope, Building, Edit, X, DollarSign, Share2, Copy, Check, CreditCard, Crown, ArrowUpCircle, Ticket, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Admin = () => {
  const { 
    sectors, addSector, deleteSector, 
    allUsers, addUser, deleteUser, updateUser,
    jobTypes, currentOrg, currentPlan, updateOrganization, allPlans,
    validateCoupon, createSubscription 
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'SECTORS' | 'USERS' | 'DENTISTS' | 'FINANCIAL' | 'SUBSCRIPTION'>('SECTORS');
  const [copied, setCopied] = useState(false);

  // Sector & User State
  const [newSectorName, setNewSectorName] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');
  
  // Dentist State
  const [dentistName, setDentistName] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [clinicName, setClinicName] = useState('');
  
  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [editSector, setEditSector] = useState('');
  
  // Price Table State
  const [priceUser, setPriceUser] = useState<User | null>(null);
  const [tempPrices, setTempPrices] = useState<CustomPrice[]>([]);

  // Financial Settings State
  const [pixKey, setPixKey] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [instructions, setInstructions] = useState('');

  // Subscription State
  const [upgradeCoupon, setUpgradeCoupon] = useState('');
  const [appliedUpgradeCoupon, setAppliedUpgradeCoupon] = useState<any>(null);

  useEffect(() => {
      if (currentOrg?.financialSettings) {
          setPixKey(currentOrg.financialSettings.pixKey || '');
          setBankInfo(currentOrg.financialSettings.bankInfo || '');
          setPaymentLink(currentOrg.financialSettings.paymentLink || '');
          setInstructions(currentOrg.financialSettings.instructions || '');
      }
  }, [currentOrg]);

  const handleSaveFinancial = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentOrg) return;
      await updateOrganization(currentOrg.id, {
          financialSettings: { pixKey, bankInfo, paymentLink, instructions }
      });
      alert("Configurações financeiras salvas!");
  };

  const handleValidateUpgradeCoupon = async () => {
    if (!upgradeCoupon) return;
    const coupon = await validateCoupon(upgradeCoupon, 'ANY'); // Validate generally first
    if (coupon) {
        setAppliedUpgradeCoupon(coupon);
        alert("Cupom válido!");
    } else {
        alert("Cupom inválido ou expirado.");
        setAppliedUpgradeCoupon(null);
    }
  };

  const handleUpgrade = async (planId: string) => {
      if (!currentOrg) return;
      navigate(`/subscribe?plan=${planId}${appliedUpgradeCoupon ? `&coupon=${appliedUpgradeCoupon.code}` : ''}`);
  };

  // Status Check Helper
  const isTrial = currentOrg?.subscriptionStatus === 'TRIAL' || (!currentOrg?.subscriptionStatus && !!currentOrg?.trialEndsAt);
  const isPaid = currentOrg?.subscriptionStatus === 'ACTIVE';
  const displayStatus = currentOrg?.subscriptionStatus || (isTrial ? 'TRIAL' : 'N/A');

  // Fallback if currentPlan is missing but we have currentOrg.planId
  const activePlan = currentPlan || allPlans.find(p => p.id === currentOrg?.planId);

  // Handlers
  const handleAddSector = async (e: React.FormEvent) => { e.preventDefault(); if (newSectorName.trim()) { try { await addSector(newSectorName); setNewSectorName(''); } catch (error) { console.error(error); alert("Erro ao adicionar setor. Verifique permissões."); } } };
  
  const handleAddUser = (e: React.FormEvent) => { e.preventDefault(); if (!userName || !userEmail) return; const newUser: User = { id: Math.random().toString(), name: userName, email: userEmail, role: userRole, sector: userRole === UserRole.COLLABORATOR ? userSector : undefined }; addUser(newUser); setUserName(''); setUserEmail(''); setUserRole(UserRole.COLLABORATOR); setUserSector(''); };
  
  const handleAddDentist = (e: React.FormEvent) => { e.preventDefault(); if (!dentistName || !dentistEmail) return; const newDentist: User = { id: Math.random().toString(), name: dentistName, email: dentistEmail, role: UserRole.CLIENT, clinicName: clinicName || 'Clínica Particular' }; addUser(newDentist); setDentistName(''); setDentistEmail(''); setClinicName(''); };
  
  const openEditModal = (user: User) => { setEditingUser(user); setEditName(user.name); setEditEmail(user.email); setEditRole(user.role); setEditSector(user.sector || ''); };
  const handleUpdateUser = (e: React.FormEvent) => { e.preventDefault(); if (!editingUser) return; updateUser(editingUser.id, { name: editName, email: editEmail, role: editRole, sector: editRole === UserRole.COLLABORATOR ? editSector : undefined }); setEditingUser(null); };
  
  const openPriceModal = (user: User) => { setPriceUser(user); setTempPrices(user.customPrices || []); };
  const handlePriceChange = (jobTypeId: string, newPrice: string) => { const price = parseFloat(newPrice); if (isNaN(price)) return; setTempPrices(prev => { const exists = prev.find(p => p.jobTypeId === jobTypeId); if (exists) { return prev.map(p => p.jobTypeId === jobTypeId ? { ...p, price } : p); } return [...prev, { jobTypeId, price }]; }); };
  const handleSavePrices = () => { if (priceUser) { updateUser(priceUser.id, { customPrices: tempPrices }); setPriceUser(null); } };
  
  const copyToClipboard = () => { if (currentOrg?.id) { navigator.clipboard.writeText(currentOrg.id); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  return (
    <div className="space-y-6 pb-12">
      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">Editar Usuário</h3>
                    <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Permissão</label>
                        <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                            <option value={UserRole.COLLABORATOR}>Colaborador</option>
                            <option value={UserRole.MANAGER}>Gestor</option>
                            <option value={UserRole.ADMIN}>Administrador</option>
                            <option value={UserRole.CLIENT}>Dentista (Cliente)</option>
                        </select>
                    </div>
                    {editRole === UserRole.COLLABORATOR && (
                        <div>
                            <label className="block text-sm font-bold text-blue-700 mb-1">Setor Atual</label>
                            <select value={editSector} onChange={e => setEditSector(e.target.value)} className="w-full px-4 py-2 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50">
                                <option value="">Selecione...</option>
                                {sectors.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}
                            </select>
                        </div>
                    )}
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Price Table Modal */}
      {priceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">Tabela de Preços Individual</h3>
                        <p className="text-slate-500 text-sm">Dentista: <span className="font-bold text-blue-600">{priceUser.name}</span></p>
                    </div>
                    <button onClick={() => setPriceUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 mb-4 flex gap-2">
                        <DollarSign size={20} className="shrink-0" />
                        <p>Defina preços especiais para este dentista. Deixe em branco ou igual ao padrão para usar o preço base.</p>
                    </div>
                    <div className="space-y-1">
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 uppercase">
                            <div className="col-span-6">Serviço</div>
                            <div className="col-span-3 text-right">Preço Padrão</div>
                            <div className="col-span-3 text-right">Preço Especial</div>
                        </div>
                        {jobTypes.map(type => {
                            const customPrice = tempPrices.find(p => p.jobTypeId === type.id)?.price;
                            const isCustom = customPrice !== undefined && customPrice !== type.basePrice;
                            return (
                                <div key={type.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-50 items-center hover:bg-slate-50 transition-colors">
                                    <div className="col-span-6 font-medium text-slate-700">{type.name}<span className="block text-xs text-slate-400 font-normal">{type.category}</span></div>
                                    <div className="col-span-3 text-right text-slate-400 text-sm">R$ {type.basePrice.toFixed(2)}</div>
                                    <div className="col-span-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
                                            <input type="number" step="0.01" value={customPrice !== undefined ? customPrice : ''} placeholder={type.basePrice.toFixed(2)} onChange={(e) => handlePriceChange(type.id, e.target.value)} className={`w-full pl-8 pr-3 py-2 text-right rounded-lg border text-sm outline-none focus:ring-2 ${isCustom ? 'border-blue-300 bg-blue-50 text-blue-700 font-bold focus:ring-blue-500' : 'border-slate-200 text-slate-600 focus:ring-slate-300'}`} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button onClick={() => setPriceUser(null)} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl">Cancelar</button>
                    <button onClick={handleSavePrices} className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg">Salvar Tabela</button>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Configurações Administrativas</h1><p className="text-slate-500">Gerencie a estrutura física, equipe interna e cadastro de clientes.</p></div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
        <button onClick={() => setActiveTab('SECTORS')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'SECTORS' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><Building2 size={18} /> Setores & Fluxo</button>
        <button onClick={() => setActiveTab('USERS')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'USERS' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={18} /> Colaboradores</button>
        <button onClick={() => setActiveTab('DENTISTS')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'DENTISTS' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><Stethoscope size={18} /> Dentistas & Clínicas</button>
        <button onClick={() => setActiveTab('FINANCIAL')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'FINANCIAL' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><CreditCard size={18} /> Financeiro</button>
        <button onClick={() => setActiveTab('SUBSCRIPTION')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'SUBSCRIPTION' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><Crown size={18} /> Assinatura</button>
      </div>

      {/* SECTORS CONTENT */}
      {activeTab === 'SECTORS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="lg:col-span-2 space-y-4">
             {currentOrg && (<div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200 p-6 text-white relative overflow-hidden"><div className="relative z-10 flex justify-between items-center"><div><h3 className="text-lg font-bold flex items-center gap-2 mb-1"><Share2 size={20} /> Código de Parceria</h3><p className="text-blue-100 text-sm max-w-md">Compartilhe este código com dentistas para que eles se conectem ao seu laboratório.</p></div><div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20"><code className="font-mono text-xl font-bold tracking-wider px-2">{currentOrg.id}</code><button onClick={copyToClipboard} className="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Copiar Código">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div></div><div className="absolute -bottom-10 -right-10 opacity-10"><Share2 size={150} /></div></div>)}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"><h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin size={20} className="text-blue-500" /> Setores Ativos</h3><div className="space-y-3">{sectors.map(sector => (<div key={sector.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200"><span className="font-medium text-slate-700">{sector.name}</span><button onClick={() => deleteSector(sector.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button></div>))}{sectors.length === 0 && <p className="text-slate-400 italic">Nenhum setor cadastrado.</p>}</div></div>
          </div>
          <div><div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-6"><h3 className="text-lg font-bold text-slate-800 mb-4">Novo Setor</h3><form onSubmit={handleAddSector} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Nome do Setor</label><input value={newSectorName} onChange={e => setNewSectorName(e.target.value)} placeholder="Ex: Cerâmica, CAD/CAM" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div><button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"><Plus size={20} /> Adicionar</button></form><div className="mt-6 bg-blue-50 p-4 rounded-xl text-xs text-blue-800"><p>Setores definem as etapas de produção. O Scanner usará esses nomes para rastrear onde cada trabalho está.</p></div></div></div>
        </div>
      )}

      {/* USERS CONTENT */}
      {activeTab === 'USERS' && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-300"><div className="lg:col-span-2 space-y-4"><div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-500" /> Equipe Interna</h3></div><div className="divide-y divide-slate-100">{allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (<div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-4"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase shrink-0">{user.name.charAt(0)}</div><div><h4 className="font-bold text-slate-800">{user.name}</h4><div className="flex items-center gap-2 text-xs text-slate-500 break-all"><Mail size={12} /> {user.email}</div></div></div><div className="flex items-center justify-between sm:block sm:text-right"><div><span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-1 ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : user.role === UserRole.MANAGER ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span>{user.sector && (<div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">{user.sector}</div>)}</div><div className="flex items-center justify-end gap-1 mt-2"><button onClick={() => openEditModal(user)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Usuário / Trocar Setor"><Edit size={18} /></button><button onClick={() => deleteUser(user.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Remover Usuário"><Trash2 size={18} /></button></div></div></div>))}</div></div></div><div><div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-6"><h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-blue-600" /> Novo Colaborador</h3><form onSubmit={handleAddUser} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label><input value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Email de Acesso</label><input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Permissão / Cargo</label><select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"><option value={UserRole.COLLABORATOR}>Colaborador (Operacional)</option><option value={UserRole.MANAGER}>Gerente (Gestão)</option><option value={UserRole.ADMIN}>Administrador (Total)</option></select></div>{userRole === UserRole.COLLABORATOR && (<div><label className="block text-sm font-medium text-slate-700 mb-1">Setor Principal</label><select value={userSector} onChange={e => setUserSector(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required><option value="">Selecione um setor...</option>{sectors.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}</select></div>)}<button type="submit" className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2 mt-2"><Save size={20} /> Cadastrar</button></form></div></div></div>)}

      {/* DENTISTS CONTENT */}
      {activeTab === 'DENTISTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Stethoscope size={20} className="text-teal-500" /> Dentistas Parceiros
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {allUsers.filter(u => u.role === UserRole.CLIENT).length === 0 ? (
                            <div className="p-8 text-center text-slate-400">Nenhum dentista cadastrado manualmente.</div>
                        ) : (
                            allUsers.filter(u => u.role === UserRole.CLIENT).map(user => (
                                <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold uppercase shrink-0">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{user.name}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Building size={12} /> {user.clinicName || 'Consultório'}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openPriceModal(user)} className="flex items-center gap-2 text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors mr-2">
                                            <DollarSign size={14}/> Tabela de Preços
                                        </button>
                                        <button onClick={() => openEditModal(user)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => deleteUser(user.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            
            <div>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UserPlus size={20} className="text-teal-600" /> Cadastrar Dentista
                    </h3>
                    <form onSubmit={handleAddDentist} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Dentista</label>
                            <input value={dentistName} onChange={e => setDentistName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required placeholder="Dr. Fulano" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Clínica</label>
                            <input value={clinicName} onChange={e => setClinicName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Clínica Sorriso" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email de Contato</label>
                            <input type="email" value={dentistEmail} onChange={e => setDentistEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required placeholder="contato@clinica.com" />
                        </div>
                        
                        <button type="submit" className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200 flex items-center justify-center gap-2 mt-2">
                            <Save size={20} /> Salvar Cadastro
                        </button>
                    </form>
                    <div className="mt-4 p-3 bg-slate-50 text-xs text-slate-500 rounded-lg">
                        <p>Ao cadastrar manualmente, o dentista é criado no sistema vinculado à sua organização.</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* FINANCIAL CONTENT */}
      {activeTab === 'FINANCIAL' && (
         <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                     <CreditCard size={20} className="text-indigo-500" /> Dados de Recebimento
                 </h3>
                 <form onSubmit={handleSaveFinancial} className="space-y-6">
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">Chave PIX (Principal)</label><input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, CNPJ, Email ou Celular" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">Link de Pagamento Externo (Opcional)</label><input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://link.mercadopago.com.br/..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-blue-600" /><p className="text-xs text-slate-400 mt-1">Link do Mercado Pago, Stripe ou outro gateway para cartão.</p></div>
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">Dados Bancários / Instruções</label><textarea value={bankInfo} onChange={e => setBankInfo(e.target.value)} rows={3} placeholder="Banco X, Ag: 0000, CC: 00000-0..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">Instruções Adicionais</label><textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} placeholder="Enviar comprovante para o WhatsApp..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                     <div className="pt-4 border-t border-slate-100 flex justify-end"><button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">Salvar Configurações</button></div>
                 </form>
             </div>
         </div>
      )}

      {/* SUBSCRIPTION CONTENT */}
      {activeTab === 'SUBSCRIPTION' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-5xl mx-auto space-y-6">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="text-slate-400 text-sm font-bold uppercase mb-1">Seu Plano Atual</p>
                          <h2 className="text-3xl font-bold">{activePlan?.name || 'Não Identificado'}</h2>
                          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-bold ${isPaid ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>
                             {isPaid ? <Check size={12}/> : <ArrowUpCircle size={12}/>}
                             STATUS: {displayStatus}
                          </div>
                      </div>
                      <div className="text-right">
                           <p className="text-3xl font-bold text-blue-400">
                               {activePlan ? `R$ ${activePlan.price.toFixed(2)}` : '--'}
                           </p>
                           <p className="text-sm text-slate-400">/mês</p>
                      </div>
                  </div>
                  {isTrial && (
                      <div className="mt-4 bg-orange-500/20 border border-orange-500/50 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-orange-200">Seu período de teste está ativo.</p>
                            <p className="text-xs text-orange-300/80">Aproveite para testar todas as funcionalidades. Você pode ativar o plano definitivo a qualquer momento.</p>
                          </div>
                          <button 
                              onClick={() => navigate(`/subscribe?plan=${activePlan?.id}`)} 
                              className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-lg flex items-center gap-2"
                          >
                              <Zap size={16} /> Ativar Assinatura Definitiva
                          </button>
                      </div>
                  )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpCircle className="text-blue-600"/> Upgrade de Plano (Laboratório)</h3>
                  
                  {allPlans.length === 0 ? (
                      <div className="text-center text-slate-400 py-10">Carregando opções de planos...</div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          {/* FILTER ONLY LAB PLANS */}
                          {allPlans.filter(p => p.isPublic && p.active && p.targetAudience === 'LAB').map(plan => {
                              const isCurrentPlan = plan.id === activePlan?.id;
                              
                              // Hide plan only if it is the current plan AND the subscription is fully active/paid
                              if (isCurrentPlan && isPaid) return null;

                              return (
                                <div key={plan.id} className={`border rounded-xl p-4 transition-all flex flex-col ${isCurrentPlan ? 'border-blue-500 bg-blue-50/50 relative' : 'border-slate-200 hover:border-blue-300'}`}>
                                    {isCurrentPlan && <span className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">PLANO ATUAL</span>}
                                    
                                    <h4 className="font-bold text-slate-800">{plan.name}</h4>
                                    <p className="text-2xl font-bold text-blue-600 my-2">R$ {plan.price.toFixed(2)}</p>
                                    <ul className="text-xs text-slate-500 space-y-1 mb-4 flex-1">
                                        <li>• {plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</li>
                                        <li>• {plan.features.maxStorageGB} GB Armazenamento</li>
                                        {plan.features.hasStoreModule && <li>• Loja Virtual</li>}
                                    </ul>
                                    <button 
                                        onClick={() => handleUpgrade(plan.id)} 
                                        className={`w-full py-2 font-bold rounded-lg transition-all text-sm ${isCurrentPlan ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'}`}
                                    >
                                        {isCurrentPlan ? 'Contratar Agora (Antecipar)' : 'Mudar para este'}
                                    </button>
                                </div>
                              );
                          })}
                      </div>
                  )}

                  <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Ticket size={18} className="text-green-600"/> Cupom de Desconto</h4>
                      <div className="flex gap-2 max-w-md">
                          <input 
                              value={upgradeCoupon}
                              onChange={e => setUpgradeCoupon(e.target.value.toUpperCase())}
                              placeholder="Código Promocional"
                              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                              disabled={!!appliedUpgradeCoupon}
                          />
                          <button 
                             onClick={handleValidateUpgradeCoupon}
                             disabled={!!appliedUpgradeCoupon}
                             className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                              {appliedUpgradeCoupon ? 'Aplicado' : 'Validar'}
                          </button>
                      </div>
                      {appliedUpgradeCoupon && <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1"><Check size={12}/> Cupom {appliedUpgradeCoupon.code} aplicado!</p>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};