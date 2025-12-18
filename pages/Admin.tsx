import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, User, CustomPrice, UserCommissionSetting } from '../types';
import { 
  Building2, Users, Plus, Trash2, MapPin, Mail, UserPlus, Save, 
  Stethoscope, Edit, X, DollarSign, Share2, Copy, Check, CreditCard, Crown, ArrowUpCircle, Ticket, Zap, Wallet, Loader2, ExternalLink, HelpCircle, LogIn, Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/firebaseService';

export const Admin = () => {
  const { 
    sectors, addSector, deleteSector, 
    allUsers, addUser, deleteUser, updateUser,
    jobTypes, currentOrg, currentPlan, updateOrganization, allPlans,
    validateCoupon, createSubscription, getSaaSInvoices
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'SECTORS' | 'USERS' | 'DENTISTS' | 'COMMISSIONS' | 'FINANCIAL' | 'SUBSCRIPTION'>('SECTORS');
  const [copied, setCopied] = useState(false);

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

  // Financial States
  const [pixKey, setPixKey] = useState(currentOrg?.financialSettings?.pixKey || '');
  const [bankInfo, setBankInfo] = useState(currentOrg?.financialSettings?.bankInfo || '');
  const [instructions, setInstructions] = useState(currentOrg?.financialSettings?.instructions || '');
  const [paymentLink, setPaymentLink] = useState(currentOrg?.financialSettings?.paymentLink || '');

  // Handlers
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

  return (
    <div className="space-y-6 pb-12">
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

      {/* Tabs */}
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
          <div className="animate-in fade-in slide-in-from-left-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><DollarSign className="text-green-600"/> Dados para Recebimento</h3>
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
          <div className="animate-in fade-in slide-in-from-left-4 space-y-6">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl shadow-xl text-white">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="text-slate-400 text-sm font-bold uppercase mb-1">Seu Plano Atual</p>
                          <h2 className="text-3xl font-bold">{currentPlan?.name || 'Carregando...'}</h2>
                          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30">
                              <Check size={12}/> ASSINATURA ATIVA
                          </div>
                      </div>
                      <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                          <Crown size={32} className="text-yellow-400" />
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {allPlans.filter(p => p.targetAudience === 'LAB').map(plan => (
                      <div key={plan.id} className={`bg-white p-6 rounded-2xl border-2 transition-all ${plan.id === currentOrg?.planId ? 'border-blue-500 shadow-xl' : 'border-slate-100 opacity-60 hover:opacity-100'}`}>
                          <h4 className="font-bold text-slate-800 uppercase text-xs">{plan.name}</h4>
                          <p className="text-2xl font-bold text-blue-600 mt-2">R$ {plan.price.toFixed(2)}<span className="text-xs text-slate-400">/mês</span></p>
                          <ul className="mt-4 space-y-2 text-xs text-slate-500">
                              <li>• {plan.features.maxUsers === -1 ? 'Usuários Ilimitados' : `${plan.features.maxUsers} Usuários`}</li>
                              <li>• {plan.features.maxStorageGB}GB Armazenamento</li>
                          </ul>
                          {plan.id !== currentOrg?.planId && (
                              <button onClick={() => navigate('/subscribe')} className="w-full mt-6 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 font-bold rounded-lg transition-all">Alterar Plano</button>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};