
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { UserCircle, Mail, Shield, Building, MapPin, Briefcase, Zap, Key, CheckCircle, Loader2 } from 'lucide-react';
import * as api from '../services/firebaseService';

export const Profile = () => {
  const { currentUser, updateUser } = useApp();
  const [loadingReset, setLoadingReset] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  if (!currentUser) return null;

  const handleBecomeAdmin = () => {
    if (confirm("ATENÇÃO: Isso dará acesso total ao sistema (Modo Desenvolvedor). Continuar?")) {
        updateUser(currentUser.id, { role: UserRole.ADMIN });
        alert("Permissões atualizadas! Recarregue a página se os menus não aparecerem imediatamente.");
    }
  };

  const handleRequestPasswordReset = async () => {
      setLoadingReset(true);
      try {
          await api.apiResetPassword(currentUser.email);
          setResetRequested(true);
          setTimeout(() => setResetRequested(false), 6000);
      } catch (err) {
          alert("Erro ao solicitar troca de senha. Tente novamente mais tarde.");
      } finally {
          setLoadingReset(false);
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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LADO ESQUERDO: INFOS PRINCIPAIS */}
        <div className="lg:col-span-2 space-y-6">
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
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Email de Acesso</label>
                            <div className="flex items-center gap-2 text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                                <Mail size={18} className="text-slate-400" />
                                {currentUser.email}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">ID do Usuário</label>
                            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs">
                                <UserCircle size={18} className="text-slate-400" />
                                {currentUser.id}
                            </div>
                        </div>

                        {currentUser.role === UserRole.CLIENT && (
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Clínica / Consultório</label>
                                <div className="flex items-center gap-2 text-slate-800 bg-teal-50 p-3 rounded-xl border border-teal-100 font-bold">
                                    <Building size={18} className="text-teal-600" />
                                    {currentUser.clinicName || 'Não informada'}
                                </div>
                            </div>
                        )}

                        {(currentUser.role === UserRole.COLLABORATOR || currentUser.role === UserRole.MANAGER) && (
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Setor Principal</label>
                                <div className="flex items-center gap-2 text-slate-800 bg-blue-50 p-3 rounded-xl border border-blue-100 font-bold">
                                    <Briefcase size={18} className="text-blue-600" />
                                    {currentUser.sector || 'Geral / Todos'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* LADO DIREITO: SEGURANÇA E ACÇÕES */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Key size={18} className="text-blue-500" /> Segurança da Conta
                </h3>
                
                {resetRequested ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center animate-in zoom-in">
                        <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-bold text-sm">Link enviado!</p>
                        <p className="text-green-600 text-xs mt-1">Acesse seu e-mail para cadastrar uma nova senha.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Deseja trocar sua senha ou recebeu uma senha temporária? Clique abaixo para receber um link de redefinição no seu e-mail.
                        </p>
                        <button 
                            onClick={handleRequestPasswordReset}
                            disabled={loadingReset}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                        >
                            {loadingReset ? <Loader2 className="animate-spin" size={18}/> : <><Mail size={18}/> Alterar Minha Senha</>}
                        </button>
                    </div>
                )}
            </div>

            {currentUser.role !== UserRole.ADMIN && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-sm text-yellow-800 space-y-4">
                    <div className="flex items-start gap-3">
                        <Shield size={24} className="shrink-0 text-yellow-600" />
                        <div>
                            <p className="font-bold uppercase text-[10px] tracking-widest text-yellow-700 mb-1">Acesso Limitado</p>
                            <p className="text-xs leading-relaxed">
                                Você possui permissões de nível <strong>{getRoleLabel(currentUser.role)}</strong>. Para elevar seu nível de acesso, contate o administrador do laboratório.
                            </p>
                        </div>
                    </div>
                    
                    {/* DEV BUTTON TO FORCE ADMIN */}
                    <button 
                        onClick={handleBecomeAdmin}
                        className="w-full py-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-colors border border-yellow-300 uppercase"
                    >
                        <Zap size={14} /> Ativar Modo Admin (Dev)
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
