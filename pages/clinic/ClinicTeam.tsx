import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, User, PermissionKey } from '../../types';
import { 
  UserPlus, 
  Edit, 
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
  Users,
  Stethoscope,
  Building2,
  Shield,
  Briefcase,
  UserCheck,
  Phone,
  Mail,
  Hash,
  CheckCircle2,
  Key
} from 'lucide-react';
import * as api from '../../services/firebaseService';
import * as XLSX from 'xlsx';
import { FeatureLocked } from '../../components/FeatureLocked';

export const CLINIC_PERMISSIONS: { key: PermissionKey; label: string; category: string; description?: string }[] = [
  // Pacientes e Prontuários
  { key: 'patients:view', label: 'Ver Lista e Detalhes de Pacientes', category: 'Pacientes e Prontuários' },
  { key: 'patients:create', label: 'Cadastrar Novos Pacientes', category: 'Pacientes e Prontuários' },
  { key: 'patients:edit', label: 'Editar Dados Cadastrais', category: 'Pacientes e Prontuários' },
  { key: 'patients:delete', label: 'Excluir Pacientes', category: 'Pacientes e Prontuários' },
  { key: 'patients:history_edit', label: 'Gerenciar Prontuário, Anamnese e Odontograma', category: 'Pacientes e Prontuários' },

  // Agenda e Consultas
  { key: 'schedule:view', label: 'Visualizar Agenda e Calendário', category: 'Agenda e Atendimentos' },
  { key: 'schedule:create', label: 'Criar e Agendar Consultas', category: 'Agenda e Atendimentos' },
  { key: 'schedule:edit', label: 'Remarcar e Editar Consultas', category: 'Agenda e Atendimentos' },
  { key: 'schedule:delete', label: 'Cancelar e Excluir Agendamentos', category: 'Agenda e Atendimentos' },

  // Financeiro da Clínica
  { key: 'clinic_finance:view', label: 'Ver Dashboard e Fluxo de Caixa', category: 'Financeiro da Clínica' },
  { key: 'clinic_finance:create', label: 'Lançar Despesas e Receitas de Pacientes', category: 'Financeiro da Clínica' },
  { key: 'clinic_finance:edit', label: 'Editar Lançamentos e Baixar Pagamentos', category: 'Financeiro da Clínica' },
  { key: 'clinic_finance:delete', label: 'Excluir Lançamentos Financeiros', category: 'Financeiro da Clínica' },

  // Salas de Atendimento
  { key: 'clinic_rooms:view', label: 'Ver Salas de Atendimento', category: 'Salas e Estrutura' },
  { key: 'clinic_rooms:create', label: 'Cadastrar Novas Salas', category: 'Salas e Estrutura' },
  { key: 'clinic_rooms:edit', label: 'Editar Salas e Cores', category: 'Salas e Estrutura' },
  { key: 'clinic_rooms:delete', label: 'Excluir Salas', category: 'Salas e Estrutura' },

  // Corpo Clínico
  { key: 'clinic_dentists:view', label: 'Ver Lista do Corpo Clínico', category: 'Corpo Clínico' },
  { key: 'clinic_dentists:create', label: 'Cadastrar Dentistas Associados', category: 'Corpo Clínico' },
  { key: 'clinic_dentists:edit', label: 'Editar Dados de Dentistas', category: 'Corpo Clínico' },
  { key: 'clinic_dentists:delete', label: 'Excluir Dentistas do Corpo Clínico', category: 'Corpo Clínico' },

  // Procedimentos e Serviços
  { key: 'clinic_services:view', label: 'Ver Tabela de Serviços e Preços', category: 'Procedimentos e Serviços' },
  { key: 'clinic_services:create', label: 'Cadastrar Novos Procedimentos', category: 'Procedimentos e Serviços' },
  { key: 'clinic_services:edit', label: 'Editar Procedimentos e Preços', category: 'Procedimentos e Serviços' },
  { key: 'clinic_services:delete', label: 'Excluir Procedimentos', category: 'Procedimentos e Serviços' },

  // Estoque e Insumos
  { key: 'clinic_inventory:view', label: 'Ver Estoque e Insumos', category: 'Estoque da Clínica' },
  { key: 'clinic_inventory:create', label: 'Cadastrar Itens e Dar Entrada', category: 'Estoque da Clínica' },
  { key: 'clinic_inventory:edit', label: 'Ajustar Estoque e Editar Itens', category: 'Estoque da Clínica' },
  { key: 'clinic_inventory:delete', label: 'Excluir Itens do Estoque', category: 'Estoque da Clínica' },

  // Casos e Próteses com Labs
  { key: 'dentist_cases:view', label: 'Ver Casos Protéticos com Labs', category: 'Casos e Próteses' },
  { key: 'dentist_cases:create', label: 'Criar / Enviar Casos para Labs', category: 'Casos e Próteses' },
  { key: 'dentist_cases:edit', label: 'Editar Dados de Casos', category: 'Casos e Próteses' },
  { key: 'dentist_cases:delete', label: 'Cancelar / Excluir Casos', category: 'Casos e Próteses' },

  // Requisições Online
  { key: 'requisitions:view', label: 'Ver Requisições Online', category: 'Requisições Online' },
  { key: 'requisitions:create', label: 'Criar e Enviar Requisições aos Labs', category: 'Requisições Online' },
  { key: 'requisitions:edit', label: 'Editar Requisições', category: 'Requisições Online' },
  { key: 'requisitions:delete', label: 'Cancelar Requisições', category: 'Requisições Online' },

  // Parcerias com Laboratórios
  { key: 'partnerships:view', label: 'Ver Laboratórios Parceiros Conectados', category: 'Parcerias' },
  { key: 'partnerships:manage', label: 'Conectar e Gerenciar Parcerias', category: 'Parcerias' },

  // Gestão de Equipe e Permissões
  { key: 'clinic_users:view', label: 'Ver Colaboradores da Clínica', category: 'Gestão de Equipe' },
  { key: 'clinic_users:create', label: 'Cadastrar Novos Colaboradores', category: 'Gestão de Equipe' },
  { key: 'clinic_users:edit', label: 'Editar Membros da Equipe', category: 'Gestão de Equipe' },
  { key: 'clinic_users:delete', label: 'Excluir Colaboradores', category: 'Gestão de Equipe' },

  // Configurações da Clínica
  { key: 'clinic_settings:view', label: 'Ver Informações e Assinatura', category: 'Configurações' },
  { key: 'clinic_settings:edit', label: 'Alterar Dados Cadastrais e Configurações', category: 'Configurações' },

  // Loja Online
  { key: 'store:view', label: 'Acessar Loja de Suprimentos', category: 'Loja Online' },
  { key: 'store:buy', label: 'Realizar Compras e Pedidos', category: 'Loja Online' }
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  [UserRole.ADMIN]: CLINIC_PERMISSIONS.map(p => p.key),
  [UserRole.MANAGER]: CLINIC_PERMISSIONS.map(p => p.key),
  [UserRole.DENTIST]: CLINIC_PERMISSIONS.map(p => p.key),
  [UserRole.COLLABORATOR]: CLINIC_PERMISSIONS.map(p => p.key),
  [UserRole.CLIENT]: CLINIC_PERMISSIONS.map(p => p.key),
  [UserRole.SUPER_ADMIN]: CLINIC_PERMISSIONS.map(p => p.key),
  [UserRole.HELPDESK]: []
};

export const ClinicTeam = () => {
  const { allUsers, deleteUser, updateUser, currentOrg, currentPlan, currentUser } = useApp();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [permSearchTerm, setPermSearchTerm] = useState('');
  
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
  const [userCro, setUserCro] = useState('');
  const [userSpecialty, setUserSpecialty] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [tempPerms, setTempPerms] = useState<PermissionKey[]>([]);

  const isCurrentAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const hasPerm = (key: PermissionKey) => {
    if (isCurrentAdmin) return true;
    if (!currentUser?.permissions || currentUser.permissions.length === 0) return true;
    return currentUser.permissions.includes(key);
  };

  const canManageTeam = isCurrentAdmin || hasPerm('clinic_users:create') || hasPerm('clinic_users:edit');
  const canDeleteMember = isCurrentAdmin || hasPerm('clinic_users:delete');

  const maxUsersLimit = currentPlan?.features?.maxUsers ?? -1;
  const activeTeamUsers = (allUsers || []).filter(u => u.organizationId === currentOrg?.id || (!u.organizationId && u.role !== UserRole.SUPER_ADMIN));
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
        (u.cro || '').toLowerCase().includes(term) ||
        (u.croNumero || '').toLowerCase().includes(term) ||
        (u.specialty || '').toLowerCase().includes(term) ||
        (u.phone || '').toLowerCase().includes(term);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [sortedTeamUsers, searchTerm, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: activeTeamUsers.length,
      admins: activeTeamUsers.filter(u => u.role === UserRole.ADMIN).length,
      managers: activeTeamUsers.filter(u => u.role === UserRole.MANAGER).length,
      dentists: activeTeamUsers.filter(u => u.role === UserRole.DENTIST || u.role === UserRole.CLIENT).length,
      collaborators: activeTeamUsers.filter(u => u.role === UserRole.COLLABORATOR).length
    };
  }, [activeTeamUsers]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { label: 'Administrador', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: <Shield size={13} className="text-rose-600" /> };
      case UserRole.MANAGER:
        return { label: 'Gestor', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Briefcase size={13} className="text-purple-600" /> };
      case UserRole.DENTIST:
      case UserRole.CLIENT:
        return { label: 'Cirurgião-Dentista', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: <Stethoscope size={13} className="text-teal-600" /> };
      default:
        return { label: 'Colaborador (Geral)', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: <UserCheck size={13} className="text-blue-600" /> };
    }
  };

  const handleExportExcel = () => {
    const data = sortedTeamUsers.map((user, idx) => {
      const roleLabel = getRoleBadge(user.role).label;
      return {
        '#': idx + 1,
        'Nome': user.name || 'Sem nome',
        'E-mail': user.email || 'Sem e-mail',
        'Função': roleLabel,
        'CRO': user.cro || user.croNumero || '-',
        'Especialidade': user.specialty || '-',
        'Telefone': user.phone || user.whatsapp || '-',
        'Qtd Permissões': user.role === UserRole.ADMIN ? 'Acesso Total' : (user.permissions?.length || 0),
        'Data Cadastro': user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipe Clínica');
    XLSX.writeFile(wb, `equipe_clinica_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportMenuOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['#', 'Nome', 'E-mail', 'Função', 'CRO', 'Especialidade', 'Telefone', 'Permissões'];
    const rows = sortedTeamUsers.map((user, idx) => [
      idx + 1,
      `"${(user.name || '').replace(/"/g, '""')}"`,
      `"${(user.email || '').replace(/"/g, '""')}"`,
      `"${getRoleBadge(user.role).label}"`,
      `"${(user.cro || user.croNumero || '').replace(/"/g, '""')}"`,
      `"${(user.specialty || '').replace(/"/g, '""')}"`,
      `"${(user.phone || user.whatsapp || '').replace(/"/g, '""')}"`,
      user.role === UserRole.ADMIN ? 'Acesso Total' : (user.permissions?.length || 0)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `equipe_clinica_${currentOrg?.name || 'labprox'}_${new Date().toISOString().split('T')[0]}.csv`);
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
    setUserCro('');
    setUserSpecialty('');
    setUserPhone('');
    setEditingUser(null);
  };

  const handleRoleChangeInForm = (role: UserRole) => {
    setUserRole(role);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPass || !currentOrg) return;
    if (isAtMaxUsers) {
      alert(`Erro: Cota máxima de colaboradores atingida! Seu plano permite no máximo ${maxUsersLimit} colaboradores.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const allClinicPerms = CLINIC_PERMISSIONS.map(p => p.key);
      const res = await api.apiRegisterUserInOrg(
        userEmail, 
        userPass, 
        userName, 
        userRole, 
        currentOrg.id, 
        userSpecialty || 'Geral',
        undefined,
        {
          permissions: allClinicPerms,
          cro: userCro || undefined,
          specialty: userSpecialty || undefined,
          phone: userPhone || undefined
        }
      );
      
      // Update with all permissions and extra fields
      if (res?.uid) {
        await updateUser(res.uid, {
          cro: userCro || undefined,
          specialty: userSpecialty || undefined,
          phone: userPhone || undefined,
          permissions: allClinicPerms
        });
      }

      setIsAddingUser(false);
      resetForm();
      alert("Colaborador cadastrado com sucesso! Todas as permissões foram ativadas inicialmente e podem ser ajustadas a qualquer momento.");
    } catch (err: any) {
      alert(err.message || "Erro ao criar usuário. Verifique se o e-mail já está em uso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPermissions = (user: User) => {
    setSelectedUserForPerms(user);
    setTempPerms(user.permissions && user.permissions.length > 0 ? user.permissions : CLINIC_PERMISSIONS.map(p => p.key));
    setPermSearchTerm('');
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPerms) return;
    setIsSubmitting(true);
    try {
      await updateUser(selectedUserForPerms.id, { permissions: tempPerms });
      setSelectedUserForPerms(null);
      alert("Permissões atualizadas com sucesso!");
    } catch (err: any) {
      alert("Falha ao salvar permissões.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (key: PermissionKey) => {
    setTempPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleAllCategory = (category: string) => {
    const catKeys = CLINIC_PERMISSIONS.filter(p => p.category === category).map(p => p.key);
    const allSelected = catKeys.every(k => tempPerms.includes(k));
    if (allSelected) {
      setTempPerms(prev => prev.filter(k => !catKeys.includes(k)));
    } else {
      setTempPerms(prev => Array.from(new Set([...prev, ...catKeys])));
    }
  };

  const selectAllPermissions = () => {
    setTempPerms(CLINIC_PERMISSIONS.map(p => p.key));
  };

  const clearAllPermissions = () => {
    setTempPerms([]);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserCro(user.cro || user.croNumero || '');
    setUserSpecialty(user.specialty || '');
    setUserPhone(user.phone || user.whatsapp || '');
  };

  const handleUpdateUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateUser(editingUser.id, { 
        name: userName, 
        role: userRole, 
        cro: userCro || undefined,
        specialty: userSpecialty || undefined,
        phone: userPhone || undefined
      });
      setEditingUser(null);
      alert("Dados atualizados com sucesso!");
    } catch (err: any) { 
      alert("Erro ao atualizar dados."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      alert("Você não pode excluir o seu próprio usuário logado.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o colaborador "${name}"? Esta ação removerá o acesso do usuário à clínica.`)) return;
    setIsSubmitting(true);
    try {
      await deleteUser(id);
      alert("Colaborador excluído com sucesso!");
    } catch (err) {
      alert("Erro ao excluir colaborador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter permissions in modal
  const filteredCategories = useMemo(() => {
    const term = permSearchTerm.toLowerCase().trim();
    const categories = Array.from(new Set(CLINIC_PERMISSIONS.map(p => p.category)));
    if (!term) return categories;
    return categories.filter(cat => {
      const inCategory = cat.toLowerCase().includes(term);
      const hasMatchingPerm = CLINIC_PERMISSIONS.filter(p => p.category === cat).some(p => 
        p.label.toLowerCase().includes(term) || p.key.toLowerCase().includes(term)
      );
      return inCategory || hasMatchingPerm;
    });
  }, [permSearchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <Users className="text-teal-600" size={28} /> Equipe e Colaboradores
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            Gerencie o acesso, perfis e permissões dos profissionais e colaboradores da clínica.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* EXPORT MENU */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen(prev => !prev)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <Download size={15} /> Exportar <ChevronDown size={14} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={handleExportExcel}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-2.5 transition-colors"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" /> Planilha Excel (.xlsx)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2.5 transition-colors"
                >
                  <FileText size={16} className="text-blue-600" /> Arquivo CSV (.csv)
                </button>
              </div>
            )}
          </div>

          {canManageTeam && (
            <button
              onClick={() => {
                resetForm();
                setIsAddingUser(true);
              }}
              disabled={isAtMaxUsers}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={16} /> Novo Colaborador
            </button>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Equipe</p>
            <p className="text-xl font-black text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Administradores</p>
            <p className="text-xl font-black text-slate-800">{stats.admins}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Briefcase size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Gestores</p>
            <p className="text-xl font-black text-slate-800">{stats.managers}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Stethoscope size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dentistas</p>
            <p className="text-xl font-black text-slate-800">{stats.dentists}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Colaboradores</p>
            <p className="text-xl font-black text-slate-800">{stats.collaborators}</p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, CRO..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: UserRole.ADMIN, label: 'Admin' },
            { id: UserRole.MANAGER, label: 'Gestor' },
            { id: UserRole.DENTIST, label: 'Dentista' },
            { id: UserRole.COLLABORATOR, label: 'Colaborador' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 ${
                roleFilter === tab.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* COLLABORATORS LIST */}
      <div className="grid gap-3.5">
        {filteredTeamUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Users size={48} className="mx-auto mb-3 opacity-20 text-slate-500" />
            <p className="font-bold text-slate-600">Nenhum colaborador encontrado.</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar seus filtros ou cadastre um novo colaborador.</p>
          </div>
        ) : (
          filteredTeamUsers.map(user => {
            const badge = getRoleBadge(user.role);
            const isUserAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
            const permsCount = isUserAdmin ? 'Acesso Total' : `${user.permissions?.length || 0} permissões`;

            return (
              <div
                key={user.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* USER INFO */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-black text-lg shadow-sm shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-800 text-base leading-tight truncate">{user.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${badge.bg}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Mail size={13} className="text-slate-400" /> {user.email}
                      </span>
                      {(user.phone || user.whatsapp) && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone size={13} className="text-slate-400" /> {user.phone || user.whatsapp}
                        </span>
                      )}
                      {(user.cro || user.croNumero) && (
                        <span className="flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          <Hash size={12} /> CRO {user.cro || user.croNumero}
                        </span>
                      )}
                      {user.specialty && (
                        <span className="text-slate-500">
                          • {user.specialty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                  {/* PERMISSIONS BUTTON */}
                  <button
                    onClick={() => handleOpenPermissions(user)}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-xl font-bold text-xs flex items-center gap-2 border border-slate-200 hover:border-teal-200 transition-all"
                    title="Definir permissões de acesso"
                  >
                    <ShieldCheck size={16} className="text-teal-600" />
                    <span>Permissões</span>
                    <span className="bg-slate-200 group-hover:bg-teal-100 text-slate-700 group-hover:text-teal-800 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                      {isUserAdmin ? 'TOTAL' : (user.permissions?.length || 0)}
                    </span>
                  </button>

                  {/* EDIT BUTTON */}
                  {canManageTeam && (
                    <button
                      onClick={() => openEditUser(user)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
                      title="Editar dados cadastrais"
                    >
                      <Edit size={17} />
                    </button>
                  )}

                  {/* DELETE BUTTON */}
                  {canDeleteMember && user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                      title="Excluir colaborador"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: NOVO COLABORADOR */}
      {isAddingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-auto animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
            {/* MODAL HEADER */}
            <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl shrink-0">
                  <UserPlus size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate">Novo Colaborador</h3>
                  <p className="text-xs text-slate-500 font-medium truncate">Cadastre um profissional ou funcionário para a clínica.</p>
                </div>
              </div>
              <button onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0">
                <X size={20}/>
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleAddUser} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Juliana Ramos ou Marcos Lima"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@clinica.com"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Senha Provisória *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 dígitos"
                    value={userPass}
                    onChange={e => setUserPass(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* ROLE SELECTION */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Função / Perfil de Acesso *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: UserRole.ADMIN, label: 'Administrador', desc: 'Acesso total', icon: <Shield size={16} /> },
                    { role: UserRole.MANAGER, label: 'Gestor', desc: 'Gestão geral', icon: <Briefcase size={16} /> },
                    { role: UserRole.DENTIST, label: 'Dentista', desc: 'Atendimento e Casos', icon: <Stethoscope size={16} /> },
                    { role: UserRole.COLLABORATOR, label: 'Colaborador', desc: 'Geral / Recepção', icon: <UserCheck size={16} /> }
                  ].map(item => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleRoleChangeInForm(item.role)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        userRole === item.role
                          ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={userRole === item.role ? 'text-teal-600' : 'text-slate-400'}>{item.icon}</span>
                        {userRole === item.role && <Check size={14} className="text-teal-600 font-bold" />}
                      </div>
                      <p className="font-black text-xs leading-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* CONDITIONAL FIELDS FOR DENTIST */}
              {(userRole === UserRole.DENTIST || userRole === UserRole.CLIENT) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-teal-50/40 p-3.5 rounded-2xl border border-teal-100">
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1 ml-1">CRO (com UF)</label>
                    <input
                      type="text"
                      placeholder="Ex: 12345-SP"
                      value={userCro}
                      onChange={e => setUserCro(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-teal-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1 ml-1">Especialidade Principal</label>
                    <input
                      type="text"
                      placeholder="Ex: Implantodontia, Ortodontia"
                      value={userSpecialty}
                      onChange={e => setUserSpecialty(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-teal-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Telefone / WhatsApp (Opcional)</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="w-full sm:w-auto px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Cadastrar Colaborador</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR COLABORADOR */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-auto animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
            <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                  <Edit size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate">Editar Colaborador</h3>
                  <p className="text-xs text-slate-500 font-medium truncate">Atualize os dados e perfil de {editingUser.name}.</p>
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleUpdateUserInfo} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">E-mail (Apenas visualização)</label>
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Função / Perfil</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: UserRole.ADMIN, label: 'Administrador' },
                    { role: UserRole.MANAGER, label: 'Gestor' },
                    { role: UserRole.DENTIST, label: 'Dentista' },
                    { role: UserRole.COLLABORATOR, label: 'Colaborador' }
                  ].map(item => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setUserRole(item.role)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        userRole === item.role
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {(userRole === UserRole.DENTIST || userRole === UserRole.CLIENT) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-teal-50/40 p-3.5 rounded-2xl border border-teal-100">
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1 ml-1">CRO</label>
                    <input
                      type="text"
                      placeholder="Ex: 12345-SP"
                      value={userCro}
                      onChange={e => setUserCro(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-teal-200 rounded-xl font-bold text-sm text-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1 ml-1">Especialidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Ortodontia"
                      value={userSpecialty}
                      onChange={e => setUserSpecialty(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-teal-200 rounded-xl font-bold text-sm text-slate-700 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-full sm:w-auto px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Salvar Alterações</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONTROLE DE PERMISSÕES (ESTILO IDÊNTICO AO LABORATÓRIO) */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
            {/* HEADER FIXO */}
            <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex justify-between items-center gap-3 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate">
                    Permissões: {selectedUserForPerms.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      {getRoleBadge(selectedUserForPerms.role).label}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-teal-700 font-black">
                      {selectedUserForPerms.role === UserRole.ADMIN 
                        ? 'Administrador possui acesso irrestrito' 
                        : `${tempPerms.length} de ${CLINIC_PERMISSIONS.length} permissões ativas`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForPerms(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* BARRA DE AÇÕES RÁPIDAS E BUSCA */}
            <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Filtrar permissões..."
                  value={permSearchTerm}
                  onChange={e => setPermSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={selectAllPermissions}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Marcar Todas
                </button>
                <button
                  type="button"
                  onClick={clearAllPermissions}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors"
                >
                  Desmarcar Todas
                </button>
              </div>
            </div>

            {/* CORPO ROLÁVEL */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
              {selectedUserForPerms.role === UserRole.ADMIN && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3 text-teal-800 text-sm">
                  <CheckCircle2 size={20} className="text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Usuário com Perfil de Administrador</p>
                    <p className="text-xs text-teal-700 mt-0.5">
                      Administradores têm acesso total automático a todas as áreas e funcionalidades da clínica. Você também pode personalizar as permissões individuais abaixo.
                    </p>
                  </div>
                </div>
              )}

              {filteredCategories.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Search size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold">Nenhuma permissão corresponde à busca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCategories.map(cat => {
                    const catPerms = CLINIC_PERMISSIONS.filter(p => p.category === cat);
                    const allCatSelected = catPerms.every(p => tempPerms.includes(p.key));
                    const someCatSelected = catPerms.some(p => tempPerms.includes(p.key));

                    return (
                      <div key={cat} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                        {/* CATEGORY HEADER */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                            {cat}
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleAllCategory(cat)}
                            className="text-[11px] font-bold text-teal-600 hover:text-teal-800 transition-colors"
                          >
                            {allCatSelected ? 'Desmarcar setor' : 'Marcar setor'}
                          </button>
                        </div>

                        {/* PERMISSION ITEMS */}
                        <div className="space-y-2">
                          {catPerms.map(perm => {
                            const isChecked = tempPerms.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all border ${
                                  isChecked
                                    ? 'bg-teal-50/60 border-teal-200 text-teal-950 font-bold'
                                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-600 font-medium'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.key)}
                                  className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 transition-all cursor-pointer"
                                />
                                <span className="text-xs select-none leading-tight">{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER FIXO */}
            <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="w-full sm:w-auto px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all text-sm text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Salvar Permissões</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
