
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, User, PermissionKey } from '../../types';
import { UserPlus, Edit, Lock, Trash2, X, ShieldCheck, Check, Loader2, AlertCircle, Save } from 'lucide-react';
import * as api from '../../services/firebaseService';

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

export const UsersTab = () => {
  const { allUsers, deleteUser, updateUser, sectors, currentOrg } = useApp();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  
  // Form States
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');
  const [tempPerms, setTempPerms] = useState<PermissionKey[]>([]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPass || !currentOrg) return;
    setIsSubmitting(true);
    try {
        await api.apiRegisterUserInOrg(userEmail, userPass, userName, userRole, currentOrg.id);
        setIsAddingUser(false);
        setUserName(''); setUserEmail(''); setUserPass('');
        alert("Colaborador cadastrado com sucesso!");
    } catch (err: any) {
        alert("Erro ao criar usuário.");
    } finally { setIsSubmitting(false); }
  };

  const handleSavePermissions = async () => {
      if (!selectedUserForPerms) return;
      setIsSubmitting(true);
      try {
        await updateUser(selectedUserForPerms.id, { permissions: tempPerms });
        setSelectedUserForPerms(null);
        alert("Permissões atualizadas!");
      } catch (err: any) {
        alert("Falha ao salvar permissões.");
      } finally { setIsSubmitting(false); }
  };

  const togglePermission = (key: PermissionKey) => {
      setTempPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
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
      } catch (err: any) { alert("Erro ao atualizar."); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-lg">Equipe do Laboratório</h3>
        <button onClick={() => setIsAddingUser(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg">
          <UserPlus size={20}/> Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
            <tr><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Setor</th><th className="p-4 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">{user.name.charAt(0)}</div>
                    <div><p className="font-bold text-slate-800">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></div>
                  </div>
                </td>
                <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">{user.role}</span></td>
                <td className="p-4 text-slate-600 text-sm font-medium">{user.sector || 'Geral'}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEditUser(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={18}/></button>
                    <button onClick={() => { setSelectedUserForPerms(user); setTempPerms(user.permissions || []); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Lock size={18}/></button>
                    <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: NOVO/EDITAR USUÁRIO */}
      {(isAddingUser || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {isAddingUser ? <><UserPlus className="text-blue-600" /> Cadastrar Colaborador</> : <><Edit className="text-blue-600" /> Editar Colaborador</>}
                      </h3>
                      <button onClick={() => { setIsAddingUser(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={isAddingUser ? handleAddUser : handleUpdateUserInfo} className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input required value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" required disabled={!!editingUser} value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl disabled:bg-slate-50 disabled:text-slate-400" /></div>
                      {isAddingUser && <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label><input type="password" required value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full px-4 py-2 border rounded-xl" minLength={6} /></div>}
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                              <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-4 py-2 border rounded-xl bg-white">
                                  <option value={UserRole.COLLABORATOR}>Técnico</option>
                                  <option value={UserRole.MANAGER}>Gestor</option>
                                  <option value={UserRole.ADMIN}>Administrador</option>
                              </select>
                          </div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setor</label>
                              <select value={userSector} onChange={e => setUserSector(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-white">
                                  <option value="">Geral</option>
                                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                          </div>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: GERENCIAR PERMISSÕES */}
      {selectedUserForPerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-600" /> Controle de Acesso</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase">Permissões para {selectedUserForPerms.name}</p>
                      </div>
                      <button onClick={() => setSelectedUserForPerms(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24}/></button>
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
                      <button onClick={handleSavePermissions} disabled={isSubmitting} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl shadow-xl flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18} /> SALVAR</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
