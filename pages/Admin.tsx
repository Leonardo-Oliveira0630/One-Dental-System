import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, User } from '../types';
import { 
  Building2, Users, Plus, Trash2, 
  MapPin, Mail, UserPlus, Save, Stethoscope, Building
} from 'lucide-react';

export const Admin = () => {
  const { 
    sectors, addSector, deleteSector, 
    allUsers, addUser, deleteUser 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'SECTORS' | 'USERS' | 'DENTISTS'>('SECTORS');

  // Sectors State
  const [newSectorName, setNewSectorName] = useState('');

  // Users State (Collaborators)
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COLLABORATOR);
  const [userSector, setUserSector] = useState('');

  // Dentists State
  const [dentistName, setDentistName] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [clinicName, setClinicName] = useState('');

  // Handlers
  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectorName.trim()) {
      addSector(newSectorName);
      setNewSectorName('');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;

    const newUser: User = {
      id: Math.random().toString(),
      name: userName,
      email: userEmail,
      role: userRole,
      sector: userRole === UserRole.COLLABORATOR ? userSector : undefined
    };

    addUser(newUser);
    // Reset form
    setUserName('');
    setUserEmail('');
    setUserRole(UserRole.COLLABORATOR);
    setUserSector('');
  };

  const handleAddDentist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dentistName || !dentistEmail) return;

    const newDentist: User = {
        id: Math.random().toString(),
        name: dentistName,
        email: dentistEmail,
        role: UserRole.CLIENT,
        clinicName: clinicName || 'Clínica Particular'
    };

    addUser(newDentist);
    setDentistName('');
    setDentistEmail('');
    setClinicName('');
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações Administrativas</h1>
          <p className="text-slate-500">Gerencie a estrutura física, equipe interna e cadastro de clientes.</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row">
        <button
          onClick={() => setActiveTab('SECTORS')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'SECTORS' 
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Building2 size={18} />
          Setores & Fluxo
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'USERS' 
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Users size={18} />
          Colaboradores
        </button>
        <button
          onClick={() => setActiveTab('DENTISTS')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'DENTISTS' 
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Stethoscope size={18} />
          Dentistas & Clínicas
        </button>
      </div>

      {/* SECTORS CONTENT */}
      {activeTab === 'SECTORS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-left-4 duration-300">
          {/* List */}
          <div className="lg:col-span-2 space-y-4">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPin size={20} className="text-blue-500" />
                    Setores Ativos
                </h3>
                <div className="space-y-3">
                    {sectors.map(sector => (
                        <div key={sector.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="font-medium text-slate-700">{sector.name}</span>
                            <button 
                                onClick={() => deleteSector(sector.id)}
                                className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {sectors.length === 0 && <p className="text-slate-400 italic">Nenhum setor cadastrado.</p>}
                </div>
             </div>
          </div>

          {/* Add Form */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Novo Setor</h3>
                <form onSubmit={handleAddSector} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Setor</label>
                        <input 
                            value={newSectorName}
                            onChange={e => setNewSectorName(e.target.value)}
                            placeholder="Ex: Cerâmica, CAD/CAM"
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <button 
                        type="submit"
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> Adicionar
                    </button>
                </form>
                <div className="mt-6 bg-blue-50 p-4 rounded-xl text-xs text-blue-800">
                    <p>Setores definem as etapas de produção. O Scanner usará esses nomes para rastrear onde cada trabalho está.</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS CONTENT (COLLABORATORS) */}
      {activeTab === 'USERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
           {/* Users List */}
           <div className="lg:col-span-2 space-y-4">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-blue-500" />
                        Equipe Interna
                    </h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {allUsers.filter(u => u.role !== UserRole.CLIENT).map(user => (
                        <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase shrink-0">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{user.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 break-all">
                                        <Mail size={12} /> {user.email}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:block sm:text-right">
                                <div>
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-1 ${
                                        user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                                        user.role === UserRole.MANAGER ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {user.role}
                                    </span>
                                    {user.sector && (
                                        <div className="text-xs text-slate-500">
                                            {user.sector}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => deleteUser(user.id)}
                                    className="ml-4 text-slate-300 hover:text-red-500 p-2"
                                    title="Remover Usuário"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
           </div>

           {/* Add User Form */}
           <div>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-blue-600" />
                    Novo Colaborador
                </h3>
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input 
                            value={userName}
                            onChange={e => setUserName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email de Acesso</label>
                        <input 
                            type="email"
                            value={userEmail}
                            onChange={e => setUserEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permissão / Cargo</label>
                        <select 
                            value={userRole}
                            onChange={e => setUserRole(e.target.value as UserRole)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value={UserRole.COLLABORATOR}>Colaborador (Operacional)</option>
                            <option value={UserRole.MANAGER}>Gerente (Gestão)</option>
                            <option value={UserRole.ADMIN}>Administrador (Total)</option>
                        </select>
                    </div>

                    {userRole === UserRole.COLLABORATOR && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Setor Principal</label>
                            <select 
                                value={userSector}
                                onChange={e => setUserSector(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                required
                            >
                                <option value="">Selecione um setor...</option>
                                {sectors.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2 mt-2"
                    >
                        <Save size={20} /> Cadastrar
                    </button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* DENTISTS CONTENT */}
      {activeTab === 'DENTISTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
           {/* Dentists List */}
           <div className="lg:col-span-2 space-y-4">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Stethoscope size={20} className="text-teal-500" />
                        Dentistas & Clínicas
                    </h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {allUsers.filter(u => u.role === UserRole.CLIENT).length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">Nenhum dentista cadastrado.</div>
                    ) : (
                        allUsers.filter(u => u.role === UserRole.CLIENT).map(user => (
                            <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold uppercase shrink-0">
                                        <Stethoscope size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{user.name}</h4>
                                        <div className="flex items-center gap-2 text-sm text-teal-700 mb-0.5">
                                            <Building size={12} /> {user.clinicName}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 break-all">
                                            <Mail size={12} /> {user.email}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end">
                                    <button 
                                        onClick={() => deleteUser(user.id)}
                                        className="text-slate-300 hover:text-red-500 p-2"
                                        title="Remover Cadastro"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
           </div>

           {/* Add Dentist Form */}
           <div>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sticky top-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-teal-600" />
                    Novo Cliente
                </h3>
                <form onSubmit={handleAddDentist} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Dentista</label>
                        <input 
                            value={dentistName}
                            onChange={e => setDentistName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="Dr. Exemplo"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Clínica</label>
                        <input 
                            value={clinicName}
                            onChange={e => setClinicName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="Clínica Sorriso"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email (Login)</label>
                        <input 
                            type="email"
                            value={dentistEmail}
                            onChange={e => setDentistEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200 flex items-center justify-center gap-2 mt-2"
                    >
                        <Save size={20} /> Cadastrar
                    </button>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};