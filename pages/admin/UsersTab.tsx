
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, User, PermissionKey } from '../../types';
import { 
  UserPlus, 
  Edit, 
  Lock, 
  Trash2, 
  X, 
  ShieldCheck, 
  Check, 
  Loader2, 
  AlertCircle, 
  Save, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  ChevronDown,
  Users
} from 'lucide-react';
import * as api from '../../services/firebaseService';
import * as XLSX from 'xlsx';

const AVAILABLE_PERMISSIONS: { key: PermissionKey, label: string, category: string }[] = [
    { key: 'jobs:view', label: 'Ver Lista e Detalhes', category: 'Produção' },
    { key: 'jobs:create', label: 'Criar Novos Trabalhos', category: 'Produção' },
    { key: 'jobs:edit', label: 'Editar Dados de Trabalhos', category: 'Produção' },
    { key: 'jobs:delete', label: 'Excluir Trabalhos', category: 'Produção' },
    { key: 'jobs:return', label: 'Devolver Trabalho', category: 'Produção' },
    { key: 'jobs:finish', label: 'Finalizar Trabalho', category: 'Produção' },
    { key: 'jobs:alert', label: 'Usar Alerta (Chat/Notificações)', category: 'Produção' },
    { key: 'jobs:print', label: 'Imprimir Fichas e Etiquetas', category: 'Produção' },
    { key: 'jobs:chat_toggle', label: 'Habilitar/Desabilitar Chat', category: 'Produção' },
    { key: 'jobs:approval', label: 'Gerenciar Aprovação', category: 'Produção' },
    { key: 'jobs:change_status', label: 'Mudar Status', category: 'Produção' },
    { key: 'vip:view', label: 'Acessar Produção VIP', category: 'Produção' },
    { key: 'calendar:view', label: 'Acessar Calendário', category: 'Produção' },
    { key: 'finance:view', label: 'Ver Dashboard Financeiro', category: 'Financeiro' },
    { key: 'finance:create', label: 'Criar Despesas e Faturas', category: 'Financeiro' },
    { key: 'finance:edit', label: 'Editar Despesas e Faturas', category: 'Financeiro' },
    { key: 'finance:delete', label: 'Excluir Despesas e Faturas', category: 'Financeiro' },
    { key: 'receipts:view', label: 'Visualizar Recibos', category: 'Financeiro' },
    { key: 'receipts:create', label: 'Criar Recibos', category: 'Financeiro' },
    { key: 'receipts:edit', label: 'Editar Recibos', category: 'Financeiro' },
    { key: 'receipts:delete', label: 'Excluir Recibos', category: 'Financeiro' },
    { key: 'commissions:view', label: 'Ver Extrato de Comissões', category: 'Financeiro' },
    { key: 'commissions:create', label: 'Criar Comissões/Regras', category: 'Produção' },
    { key: 'commissions:edit', label: 'Editar Comissões/Regras', category: 'Produção' },
    { key: 'commissions:delete', label: 'Excluir Comissões/Regras', category: 'Produção' },
    { key: 'catalog:view', label: 'Ver Tipos de Serviço', category: 'Catálogo' },
    { key: 'catalog:create', label: 'Criar Tipos de Serviço', category: 'Catálogo' },
    { key: 'catalog:edit', label: 'Editar Tipos de Serviço', category: 'Catálogo' },
    { key: 'catalog:delete', label: 'Excluir Tipos de Serviço', category: 'Catálogo' },
    { key: 'catalog:prices_view', label: 'Ver Tabelas de Preços', category: 'Catálogo' },
    { key: 'clients:view', label: 'Ver Dentistas e Clientes', category: 'Clientes' },
    { key: 'clients:create', label: 'Criar Dentistas', category: 'Clientes' },
    { key: 'clients:edit', label: 'Editar Dentistas e Preços', category: 'Clientes' },
    { key: 'clients:delete', label: 'Excluir Dentistas', category: 'Clientes' },
    { key: 'clients:block_manage', label: 'Bloquear/Desbloquear Clientes', category: 'Clientes' },
    { key: 'sectors:view', label: 'Ver Setores', category: 'Administração' },
    { key: 'sectors:create', label: 'Criar Setores', category: 'Administração' },
    { key: 'sectors:edit', label: 'Editar Setores', category: 'Administração' },
    { key: 'sectors:delete', label: 'Excluir Setores', category: 'Administração' },
    { key: 'users:view', label: 'Ver Usuários', category: 'Administração' },
    { key: 'users:create', label: 'Criar Usuários', category: 'Administração' },
    { key: 'users:edit', label: 'Editar Usuários', category: 'Administração' },
    { key: 'users:delete', label: 'Excluir Usuários', category: 'Administração' },
    { key: 'logistics:view', label: 'Ver Entregas e Rotas', category: 'Logística' },
    { key: 'logistics:create', label: 'Criar Rotas de Entrega', category: 'Logística' },
    { key: 'logistics:edit', label: 'Editar Rotas e Endereços', category: 'Logística' },
    { key: 'logistics:delete', label: 'Excluir Rotas e Endereços', category: 'Logística' },
    { key: 'boxes:view', label: 'Ver Caixas', category: 'Produção' },
    { key: 'boxes:create', label: 'Criar Caixas', category: 'Produção' },
    { key: 'boxes:edit', label: 'Editar Caixas', category: 'Produção' },
    { key: 'boxes:delete', label: 'Excluir Caixas', category: 'Produção' },
    { key: 'inventory:view', label: 'Ver Estoque', category: 'Estoque' },
    { key: 'inventory:create', label: 'Cadastrar Itens no Estoque', category: 'Estoque' },
    { key: 'inventory:edit', label: 'Editar Itens de Estoque', category: 'Estoque' },
    { key: 'inventory:delete', label: 'Excluir Itens de Estoque', category: 'Estoque' },
    { key: 'store_suppliers:view', label: 'Acessar Loja de Fornecedores', category: 'Lojas' }
];

export const UsersTab = () => {
  const { allUsers, deleteUser, updateUser, sectors, currentOrg, currentPlan } = useApp();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Form States
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');
  const [userSectors, setUserSectors] = useState<string[]>([]);
  const [tempPerms, setTempPerms] = useState<PermissionKey[]>([]);

  const maxUsersLimit = currentPlan?.features?.maxUsers ?? -1;
  const activeTeamUsers = (allUsers || []).filter(u => u.role !== UserRole.CLIENT);
  const isAtMaxUsers = maxUsersLimit !== -1 && activeTeamUsers.length >= maxUsersLimit;

  // Alphabetical sort of team users
  const sortedTeamUsers = useMemo(() => {
    return [...activeTeamUsers].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [activeTeamUsers]);

  // Filtered by search and role
  const filteredTeamUsers = useMemo(() => {
    return sortedTeamUsers.filter(u => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || 
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.sectors || []).some(s => s.toLowerCase().includes(term)) ||
        (u.sector || '').toLowerCase().includes(term);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [sortedTeamUsers, searchTerm, roleFilter]);

  const handleExportExcel = () => {
    const data = sortedTeamUsers.map((user, idx) => {
      const roleLabel = user.role === UserRole.ADMIN ? 'Administrador' : user.role === UserRole.MANAGER ? 'Gestor' : 'Técnico';
      const sectorsStr = user.sectors && user.sectors.length > 0 ? user.sectors.join(', ') : (user.sector || 'Geral');
      return {
        '#': idx + 1,
        'Nome Completo': user.name || '',
        'Email': user.email || '',
        'Cargo': roleLabel,
        'Setores Atuantes': sectorsStr,
        'Permissões Ativas': user.permissions?.length || 0,
        'Status': 'Ativo'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    const orgName = currentOrg?.name ? currentOrg.name.replace(/\s+/g, '_') : 'Labprox';
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Quadro_Colaboradores_${orgName}_${dateStr}.xlsx`);
    setIsExportMenuOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Nome Completo', 'Email', 'Cargo', 'Setores Atuantes', 'Permissoes Ativas', 'Status'];
    const rows = sortedTeamUsers.map((user, idx) => {
      const roleLabel = user.role === UserRole.ADMIN ? 'Administrador' : user.role === UserRole.MANAGER ? 'Gestor' : 'Técnico';
      const sectorsStr = user.sectors && user.sectors.length > 0 ? user.sectors.join(', ') : (user.sector || 'Geral');
      return [
        idx + 1,
        user.name || '',
        user.email || '',
        roleLabel,
        sectorsStr,
        user.permissions?.length || 0,
        'Ativo'
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const orgName = currentOrg?.name ? currentOrg.name.replace(/\s+/g, '_') : 'Labprox';
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Quadro_Colaboradores_${orgName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const resetForm = () => {
    setUserName('');
    setUserEmail('');
    setUserPass('');
    setUserRole(UserRole.COLLABORATOR);
    setUserSectors([]);
    setUserSector('');
    setEditingUser(null);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPass || !currentOrg) return;
    if (isAtMaxUsers) {
      alert(`Erro: Cota máxima de colaboradores atingida! Seu plano permite no máximo ${maxUsersLimit} colaboradores. Faça um upgrade de plano na aba "Plano" para liberar mais cadastros.`);
      return;
    }
    setIsSubmitting(true);
    try {
        const primarySector = userSectors.length > 0 ? userSectors[0] : '';
        const res = await api.apiRegisterUserInOrg(userEmail, userPass, userName, userRole, currentOrg.id, primarySector, userSectors);
        setIsAddingUser(false);
        resetForm();
        alert(res?.message || "Colaborador cadastrado com sucesso!");
    } catch (err: any) {
        alert(err.message || "Erro ao criar usuário. Verifique se o e-mail já está em uso ou se você tem permissões.");
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
      setUserSectors(user.sectors || (user.sector ? [user.sector] : []));
  };

  const handleUpdateUserInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setIsSubmitting(true);
      try {
          const primarySector = userSectors.length > 0 ? userSectors[0] : '';
          await updateUser(editingUser.id, { name: userName, role: userRole, sector: primarySector, sectors: userSectors });
          setEditingUser(null);
          alert("Dados atualizados!");
      } catch (err: any) { alert("Erro ao atualizar."); } finally { setIsSubmitting(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este colaborador? Esta ação é irreversível e removerá o acesso do usuário.")) return;
    setIsSubmitting(true);
    try {
      await deleteUser(id);
      alert("Colaborador excluído com sucesso!");
    } catch (err) {
      alert("Erro ao excluir colaborador. Verifique se você tem permissões de administrador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {isAtMaxUsers && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-orange-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-orange-800 text-sm">Cota Máxima de Usuários Atingida</p>
            <p className="text-xs text-orange-700 mt-1">
              Seu plano atual ({currentPlan?.name || 'Plano Atual'}) permite cadastrar no máximo <span className="font-bold">{maxUsersLimit}</span> colaboradores (incluindo o Administrador). 
              Para adicionar mais membros à equipe (técnicos, gestores ou administradores), por favor faça um upgrade de plano.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Users className="text-blue-600" size={22} />
            Equipe do Laboratório
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {activeTeamUsers.length} colaborador{activeTeamUsers.length !== 1 ? 'es' : ''} cadastrado{activeTeamUsers.length !== 1 ? 's' : ''} (ordem alfabética)
            {maxUsersLimit !== -1 && ` • Limite do plano: ${maxUsersLimit}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTÃO EXPORTAR QUADRO */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={sortedTeamUsers.length === 0}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar Quadro de Colaboradores"
            >
              <Download size={17} className="text-slate-500" />
              <span>Exportar Quadro</span>
              <ChevronDown size={15} className={`text-slate-400 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formato de Exportação</p>
                </div>
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center gap-2.5 text-xs font-bold transition-colors"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  <div>
                    <p>Excel (.xlsx)</p>
                    <p className="text-[10px] font-normal text-slate-400">Planilha formatada</p>
                  </div>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center gap-2.5 text-xs font-bold transition-colors"
                >
                  <FileText size={16} className="text-blue-600" />
                  <div>
                    <p>CSV (.csv)</p>
                    <p className="text-[10px] font-normal text-slate-400">Compatível com Excel/Sheets</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* BOTÃO NOVO USUÁRIO */}
          <button 
            onClick={() => { 
              if (isAtMaxUsers) {
                alert(`Limite de usuários atingido! Seu plano permite cadastrar no máximo ${maxUsersLimit} colaboradores. Faça um upgrade de plano na aba "Plano" para poder adicionar mais membros.`);
                return;
              }
              resetForm(); 
              setIsAddingUser(true); 
            }} 
            className={`px-4 py-2 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg transition-all ${
              isAtMaxUsers ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <UserPlus size={18}/> Novo Usuário
          </button>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou setor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              roleFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({activeTeamUsers.length})
          </button>
          <button
            onClick={() => setRoleFilter(UserRole.COLLABORATOR)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              roleFilter === UserRole.COLLABORATOR
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Técnicos
          </button>
          <button
            onClick={() => setRoleFilter(UserRole.MANAGER)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              roleFilter === UserRole.MANAGER
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Gestores
          </button>
          <button
            onClick={() => setRoleFilter(UserRole.ADMIN)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              roleFilter === UserRole.ADMIN
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Administradores
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Cargo</th>
              <th className="p-4">Setores Atuantes</th>
              <th className="p-4 text-center">Permissões</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTeamUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-snug">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider ${
                    user.role === UserRole.ADMIN 
                      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                      : user.role === UserRole.MANAGER 
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {user.role === UserRole.ADMIN ? 'Administrador' : user.role === UserRole.MANAGER ? 'Gestor' : 'Técnico'}
                  </span>
                </td>
                <td className="p-4 text-slate-600 text-xs font-medium">
                  {user.sectors && user.sectors.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.sectors.map((sec, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px] border border-slate-200">
                          {sec}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">{user.sector || 'Geral'}</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                    <ShieldCheck size={13} className="text-slate-400" />
                    {user.permissions ? user.permissions.length : 0} ativas
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button 
                      onClick={() => openEditUser(user)} 
                      title="Editar Colaborador" 
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit size={18}/>
                    </button>
                    <button 
                      onClick={() => { setSelectedUserForPerms(user); setTempPerms(user.permissions || []); }} 
                      title="Gerenciar Permissões" 
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Lock size={18}/>
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)} 
                      title="Excluir Colaborador" 
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTeamUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Users className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="font-semibold text-sm">Nenhum colaborador encontrado</p>
                  {searchTerm && <p className="text-xs mt-1">Tente remover os filtros de busca.</p>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: NOVO/EDITAR USUÁRIO */}
      {(isAddingUser || editingUser) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-6 animate-in zoom-in duration-200 max-h-[92vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {isAddingUser ? <><UserPlus className="text-blue-600" /> Cadastrar Colaborador</> : <><Edit className="text-blue-600" /> Editar Colaborador</>}
                      </h3>
                      <button onClick={() => { setIsAddingUser(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={22}/></button>
                  </div>
                  <form onSubmit={isAddingUser ? handleAddUser : handleUpdateUserInfo} className="space-y-4 overflow-y-auto pr-1">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input required value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" required disabled={!!editingUser} value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl disabled:bg-slate-50 disabled:text-slate-400" /></div>
                      {isAddingUser && <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label><input type="password" required value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full px-4 py-2 border rounded-xl" minLength={6} /></div>}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                          <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                              <option value={UserRole.COLLABORATOR}>Técnico</option>
                              <option value={UserRole.MANAGER}>Gestor</option>
                              <option value={UserRole.ADMIN}>Administrador</option>
                          </select>
                      </div>
                      <div>
                          <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase">
                                  Setores Atuantes {userSectors.length > 0 && <span className="text-blue-600 font-bold">({userSectors.length} selecionado{userSectors.length > 1 ? 's' : ''})</span>}
                              </label>
                              {sectors.length > 0 && (
                                  <div className="flex items-center gap-2">
                                      <button 
                                          type="button" 
                                          onClick={() => setUserSectors(sectors.map(s => s.name))}
                                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                          Todos
                                      </button>
                                      <span className="text-slate-300">•</span>
                                      <button 
                                          type="button" 
                                          onClick={() => setUserSectors([])}
                                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline"
                                      >
                                          Limpar
                                      </button>
                                  </div>
                              )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2.5 border border-slate-200 rounded-2xl bg-slate-50/70">
                              {sectors.map(s => {
                                  const isSelected = userSectors.includes(s.name);
                                  return (
                                      <label 
                                          key={s.id} 
                                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer select-none transition-all ${
                                              isSelected 
                                                  ? 'bg-blue-50/90 border-blue-300 text-blue-800 shadow-sm' 
                                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                          }`}
                                      >
                                          <input 
                                              type="checkbox" 
                                              checked={isSelected} 
                                              onChange={e => {
                                                  if (e.target.checked) setUserSectors([...userSectors, s.name]);
                                                  else setUserSectors(userSectors.filter(sec => sec !== s.name));
                                              }} 
                                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                                          />
                                          <span className="truncate leading-normal">{s.name}</span>
                                      </label>
                                  );
                              })}
                              {sectors.length === 0 && (
                                  <div className="col-span-2 py-4 text-center text-xs text-slate-400 italic">
                                      Nenhum setor cadastrado no laboratório
                                  </div>
                              )}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-600" /> Controle de Acesso</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase">Permissões para {selectedUserForPerms.name}</p>
                      </div>
                      <button onClick={() => setSelectedUserForPerms(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-8">
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
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
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
