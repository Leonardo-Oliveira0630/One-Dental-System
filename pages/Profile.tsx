import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { UserCircle, Mail, Shield, Building, Briefcase, Key, CheckCircle, Loader2, Bell, BellOff, Info } from 'lucide-react';
import * as api from '../services/firebaseService';

export const Profile = () => {
  const { currentUser } = useApp();
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  if (!currentUser) return null;

  const handleRequestPasswordReset = async () => {
      setLoadingReset(true);
      try {
          await api.apiResetPassword(currentUser.email);
          setResetRequested(true);
          setTimeout(() => setResetRequested(false), 6000);
      } catch (err) {
          alert("Erro ao solicitar troca de senha.");
      } finally {
          setLoadingReset(false);
      }
  };

  const handleEnableNotifications = async () => {
    setLoadingPush(true);
    const token = await api.apiRequestNotificationPermission(currentUser.id);
    setNotificationStatus('Notification' in window ? Notification.permission : 'unsupported');
    setLoadingPush(false);
    if (token) {
        alert("Notificações ativadas com sucesso!");
    } else if (Notification.permission === 'denied') {
        alert("Permissão negada. Ative manualmente nas configurações do seu navegador/celular.");
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                            {currentUser.role}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Email</label>
                            <div className="flex items-center gap-2 text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                                <Mail size={18} className="text-slate-400" />
                                {currentUser.email}
                            </div>
                        </div>
                        {currentUser.role === UserRole.CLIENT ? (
                             <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Clínica</label>
                                <div className="flex items-center gap-2 text-slate-800 bg-teal-50 p-3 rounded-xl border border-teal-100 font-bold">
                                    <Building size={18} className="text-teal-600" />
                                    {currentUser.clinicName || 'Não informada'}
                                </div>
                            </div>
                        ) : (
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Setor</label>
                                <div className="flex items-center gap-2 text-slate-800 bg-blue-50 p-3 rounded-xl border border-blue-100 font-bold">
                                    <Briefcase size={18} className="text-blue-600" />
                                    {currentUser.sector || 'Geral'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PAINEL DE NOTIFICAÇÕES */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Bell size={18} className="text-blue-500" /> Notificações Push
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className={`p-4 rounded-full ${notificationStatus === 'granted' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                        {notificationStatus === 'granted' ? <Bell size={32} /> : <BellOff size={32} />}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <p className="font-bold text-slate-800">
                            {notificationStatus === 'granted' ? 'Notificações Ativadas!' : 'Ative as notificações deste dispositivo'}
                        </p>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                            {currentUser.role === UserRole.CLIENT 
                              ? 'Receba alertas sobre o status dos seus pedidos e promoções exclusivas.' 
                              : 'Receba avisos imediatos sobre alarmes de urgência no seu setor.'}
                        </p>
                    </div>
                    <button 
                        onClick={handleEnableNotifications}
                        disabled={loadingPush || notificationStatus === 'granted'}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${notificationStatus === 'granted' ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                    >
                        {loadingPush ? <Loader2 className="animate-spin" size={18}/> : notificationStatus === 'granted' ? <><CheckCircle size={18}/> Ativado</> : 'Ativar Agora'}
                    </button>
                </div>
                {notificationStatus === 'denied' && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl flex gap-2 items-center">
                        <Info size={14}/> <strong>Atenção:</strong> Você bloqueou as notificações. Reative nas configurações do navegador para funcionar.
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Key size={18} className="text-blue-500" /> Segurança</h3>
                {resetRequested ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                        <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-bold text-sm">Link enviado!</p>
                    </div>
                ) : (
                    <button onClick={handleRequestPasswordReset} disabled={loadingReset} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                        {loadingReset ? <Loader2 className="animate-spin" size={18}/> : <><Mail size={18}/> Resetar Senha</>}
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};