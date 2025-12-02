import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { UserCircle, Mail, Shield, Building, MapPin, Briefcase, Zap } from 'lucide-react';

export const Profile = () => {
  const { currentUser, updateUser } = useApp();

  if (!currentUser) return null;

  const handleBecomeAdmin = () => {
    if (confirm("ATENÇÃO: Isso dará acesso total ao sistema (Modo Desenvolvedor). Continuar?")) {
        updateUser(currentUser.id, { role: UserRole.ADMIN });
        alert("Permissões atualizadas! Recarregue a página se os menus não aparecerem imediatamente.");
    }
  };

  const getRoleBadge = (role: UserRole) => {
      switch (role) {
          case UserRole.ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
          case UserRole.MANAGER: return 'bg-orange-100 text-orange-700 border-orange-200';
          case UserRole.COLLABORATOR: return 'bg-blue-100 text-blue-700 border-blue-200';
          case UserRole.CLIENT: return 'bg-teal-100 text-teal-700 border-teal-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case UserRole.ADMIN: return 'Administrador';
        case UserRole.MANAGER: return 'Gestor';
        case UserRole.COLLABORATOR: return 'Colaborador';
        case UserRole.CLIENT: return 'Dentista';
        default: return role;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-slate-300 border-4 border-white shadow-sm">
                {currentUser.name.charAt(0)}
            </div>
            <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-900">{currentUser.name}</h2>
                <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadge(currentUser.role)}`}>
                    <Shield size={12} />
                    {getRoleLabel(currentUser.role)}
                </div>
            </div>
         </div>

         <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email de Acesso</label>
                    <div className="flex items-center gap-2 text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <Mail size={18} className="text-slate-400" />
                        {currentUser.email}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">ID do Usuário</label>
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-sm">
                        <UserCircle size={18} className="text-slate-400" />
                        {currentUser.id}
                    </div>
                </div>

                {currentUser.role === UserRole.CLIENT && (
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Clínica</label>
                        <div className="flex items-center gap-2 text-slate-800 bg-teal-50 p-3 rounded-lg border border-teal-100">
                            <Building size={18} className="text-teal-600" />
                            {currentUser.clinicName || 'Não informada'}
                        </div>
                    </div>
                )}

                {(currentUser.role === UserRole.COLLABORATOR || currentUser.role === UserRole.MANAGER) && (
                    <div className="md:col-span-2">
                         <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Setor de Atuação</label>
                         <div className="flex items-center gap-2 text-slate-800 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <Briefcase size={18} className="text-blue-600" />
                            {currentUser.sector || 'Geral / Todos'}
                        </div>
                    </div>
                )}
            </div>
         </div>
      </div>
      
      {currentUser.role !== UserRole.ADMIN && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 flex flex-col items-start gap-3">
             <div className="flex items-start gap-3">
                <Shield size={20} className="shrink-0 mt-0.5" />
                <p>
                    Sua conta possui permissões limitadas. Normalmente, apenas um Administrador existente poderia elevar seu acesso.
                </p>
             </div>
             
             {/* DEV BUTTON TO FORCE ADMIN */}
             <button 
                onClick={handleBecomeAdmin}
                className="mt-2 px-4 py-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
             >
                <Zap size={14} /> TORNAR-SE ADMIN (DEV MODE)
             </button>
        </div>
      )}
    </div>
  );
};