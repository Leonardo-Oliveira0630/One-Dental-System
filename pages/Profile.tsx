import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { 
  UserCircle, Mail, Shield, Building, Briefcase, Key, CheckCircle, Loader2, 
  Bell, BellOff, Info, Trash2, AlertTriangle, ShieldAlert, X, Send, Lock,
  Sun, Moon, Check, Palette, Globe, Languages
} from 'lucide-react';
import * as api from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../src/i18n';

export const Profile = () => {
  const { currentUser, theme, setTheme, language, setLanguage } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [changingLang, setChangingLang] = useState(false);

  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  // Phone editing
  const [phone, setPhone] = useState(currentUser?.phone || currentUser?.whatsapp || '');
  const [savingPhone, setSavingPhone] = useState(false);

  // Delete Account / Entire System Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'CONFIRM_INTENT' | 'CODE_INPUT' | 'PROCESSING'>('CONFIRM_INTENT');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string>('');
  const [inputCode, setInputCode] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || currentUser.whatsapp || '');
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;

  const handleSavePhone = async () => {
    if (!currentUser) return;
    setSavingPhone(true);
    try {
      await api.apiUpdateUser(currentUser.id, { phone: phone.replace(/\D/g, '') });
      alert("Telefone salvo com sucesso!");
    } catch (err) {
      alert("Erro ao salvar telefone.");
    } finally {
      setSavingPhone(false);
    }
  };

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

  // 1. Request verification code via email
  const handleRequestDeleteCode = async () => {
    if (!currentUser.email) return;
    setSendingCode(true);
    setCodeError('');
    try {
      const res = await api.apiSendDeleteVerificationCode(currentUser.email, currentUser.id);
      setCodeSent(true);
      setDeleteStep('CODE_INPUT');
      if (res.code) {
        setGeneratedCodeHint(res.code);
      }
    } catch (err) {
      console.error(err);
      setCodeError("Erro ao enviar código por e-mail. Tente novamente.");
    } finally {
      setSendingCode(false);
    }
  };

  // 2. Execute deletion upon code verification
  const handleExecuteDeletion = async () => {
    if (!inputCode || inputCode.trim().length < 6) {
      setCodeError("Por favor, digite o código de 6 dígitos completo.");
      return;
    }

    if (confirmWord.trim().toUpperCase() !== 'EXCLUIR') {
      setCodeError("Digite a palavra EXCLUIR para confirmar a intenção.");
      return;
    }

    setIsDeleting(true);
    setCodeError('');

    try {
      const isValid = await api.apiVerifyDeleteCode(currentUser.id, inputCode);
      if (!isValid && inputCode.trim() !== generatedCodeHint) {
        setCodeError("Código incorreto ou expirado. Verifique o código enviado ao seu e-mail.");
        setIsDeleting(false);
        return;
      }

      setDeleteStep('PROCESSING');

      if (isAdmin && currentUser.organizationId) {
        // ADMIN: Apaga todo o sistema da organização
        await api.apiDeleteEntireSystem(currentUser.organizationId, currentUser.id);
        alert("Sua conta e todo o sistema da organização foram totalmente deletados com sucesso.");
      } else {
        // NON-ADMIN: Apaga a conta do usuário
        await api.apiDeleteUserAccount(currentUser.id);
        alert("Sua conta foi excluída com sucesso.");
      }

      // Redireciona para login e encerra sessão
      window.location.href = '/login';
    } catch (err: any) {
      console.error("Erro ao deletar conta/sistema:", err);
      setCodeError(`Falha na exclusão: ${err?.message || 'Ocorreu um erro inesperado.'}`);
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case UserRole.MANAGER: return 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case UserRole.COLLABORATOR: return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case UserRole.CLIENT: return 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meu Perfil</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:p-6">
        <div className="lg:col-span-2 space-y-6">
          {/* CARTÃO DE DADOS PESSOAIS */}
          <div className="bg-white dark:bg-[#131B2A] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-50 dark:bg-[#0B0F17] p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 sm:p-6">
              <div className="w-24 h-24 bg-white dark:bg-[#131B2A] rounded-full flex items-center justify-center text-4xl font-bold text-slate-400 dark:text-slate-300 border-4 border-white dark:border-slate-800 shadow-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</h2>
                <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadge(currentUser.role)}`}>
                  <Shield size={12} />
                  {currentUser.role}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">Email</label>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium">
                    <Mail size={18} className="text-slate-400" />
                    {currentUser.email}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">WhatsApp / Telefone</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Ex: 11999999999"
                      className="flex-1 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={savingPhone}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm"
                    >
                      {savingPhone ? t('common.saving', 'Salvando...') : t('common.save', 'Salvar')}
                    </button>
                  </div>
                </div>
                {currentUser.role === UserRole.CLIENT ? (
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">{t('profile.clinic', 'Clínica')}</label>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 bg-teal-50 dark:bg-teal-950/30 p-3 rounded-xl border border-teal-100 dark:border-teal-900/40 font-bold">
                      <Building size={18} className="text-teal-600 dark:text-teal-400" />
                      {currentUser.clinicName || t('common.notInformed', 'Não informada')}
                    </div>
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">{t('profile.sector', 'Setor')}</label>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 font-bold">
                      <Briefcase size={18} className="text-blue-600 dark:text-blue-400" />
                      {currentUser.sector || t('profile.generalSector', 'Geral')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAINEL DE IDIOMA E LOCALIZAÇÃO */}
          <div className="bg-white dark:bg-[#131B2A] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Globe size={18} className="text-blue-500" />
                {t('settings.languageSection', 'Idioma e Localização')}
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Languages size={12} />
                {SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || 'Português'}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('settings.languageDescription', 'Escolha o idioma principal para a interface do aplicativo. A preferência é salva no seu perfil e sincronizada.')}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {SUPPORTED_LANGUAGES.map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <button
                    key={langItem.code}
                    type="button"
                    disabled={changingLang}
                    onClick={async () => {
                      if (changingLang || isSelected) return;
                      setChangingLang(true);
                      await setLanguage(langItem.code as SupportedLanguage);
                      setChangingLang(false);
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none">{langItem.flag}</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{langItem.name}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{langItem.code}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAINEL DE APARÊNCIA E TEMA (CLARO OU ESCURO) */}
          <div className="bg-white dark:bg-[#131B2A] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Palette size={18} className="text-cyan-500" />
                {t('profile.appearanceAndTheme', 'Aparência e Tema do Sistema')}
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                theme === 'dark' 
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {theme === 'dark' ? t('profile.darkModeActive', 'Modo Escuro Ativo') : t('profile.lightModeActive', 'Modo Claro Ativo')}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('profile.appearanceDesc', 'Defina a preferência visual da sua interface. O tema escolhido fica gravado no seu perfil e sincronizado em todas as telas e dispositivos.')}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* OPÇÃO TEMA CLARO */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between gap-3 group cursor-pointer ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      theme === 'light' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Sun size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('profile.lightTheme', 'Tema Claro')}</h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('profile.daytimeDefault', 'Padrão Diurno')}</span>
                    </div>
                  </div>
                  {theme === 'light' && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Mini Preview Visual Claro */}
                <div className="w-full h-14 bg-slate-100 rounded-xl p-2 flex flex-col justify-between border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-2.5 bg-blue-600 rounded-md" />
                    <div className="w-4 h-2.5 bg-slate-300 rounded-md" />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="h-4 bg-white rounded-md border border-slate-200" />
                    <div className="h-4 bg-white rounded-md border border-slate-200" />
                    <div className="h-4 bg-white rounded-md border border-slate-200" />
                  </div>
                </div>
              </button>

              {/* OPÇÃO TEMA ESCURO */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between gap-3 group cursor-pointer ${
                  theme === 'dark'
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-md ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      theme === 'dark' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Moon size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('profile.darkTheme', 'Tema Escuro')}</h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('profile.highContrastDark', 'Dark Mode de Alto Contraste')}</span>
                    </div>
                  </div>
                  {theme === 'dark' && (
                    <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Mini Preview Visual Escuro */}
                <div className="w-full h-14 bg-[#0B0F17] rounded-xl p-2 flex flex-col justify-between border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-2.5 bg-cyan-500 rounded-md" />
                    <div className="w-4 h-2.5 bg-slate-700 rounded-md" />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="h-4 bg-[#131B2A] rounded-md border border-slate-800" />
                    <div className="h-4 bg-[#131B2A] rounded-md border border-slate-800" />
                    <div className="h-4 bg-[#131B2A] rounded-md border border-slate-800" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* PAINEL DE NOTIFICAÇÕES */}
          <div className="bg-white dark:bg-[#131B2A] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Bell size={18} className="text-blue-500" /> {t('profile.pushNotifications', 'Notificações Push')}
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-4 sm:p-6">
              <div className={`p-4 rounded-full ${notificationStatus === 'granted' ? 'bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {notificationStatus === 'granted' ? <Bell size={32} /> : <BellOff size={32} />}
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {notificationStatus === 'granted' ? t('profile.notificationsActive', 'Notificações Ativadas!') : t('profile.enableNotificationsDevice', 'Ative as notificações deste dispositivo')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {currentUser.role === UserRole.CLIENT 
                    ? t('profile.clientNotificationsDesc', 'Receba alertas sobre o status dos seus pedidos e promoções exclusivas.') 
                    : t('profile.staffNotificationsDesc', 'Receba avisos imediatos sobre alarmes de urgência no seu setor.')}
                </p>
              </div>
              <button 
                onClick={handleEnableNotifications}
                disabled={loadingPush || notificationStatus === 'granted'}
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${notificationStatus === 'granted' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
              >
                {loadingPush ? <Loader2 className="animate-spin" size={18}/> : notificationStatus === 'granted' ? <><CheckCircle size={18}/> {t('common.enabled', 'Ativado')}</> : t('profile.enableNow', 'Ativar Agora')}
              </button>
            </div>
            {notificationStatus === 'denied' && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex gap-2 items-center border border-red-200 dark:border-red-900/40">
                <Info size={14}/> <strong>{t('common.attention', 'Atenção')}:</strong> {t('profile.blockedNotificationsWarning', 'Você bloqueou as notificações. Reative nas configurações do navegador para funcionar.')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#131B2A] p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Key size={18} className="text-blue-500" /> {t('profile.security', 'Segurança')}</h3>
            {resetRequested ? (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-center">
                <CheckCircle size={32} className="text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-green-800 dark:text-green-300 font-bold text-sm">{t('profile.linkSent', 'Link enviado!')}</p>
              </div>
            ) : (
              <button onClick={handleRequestPasswordReset} disabled={loadingReset} className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                {loadingReset ? <Loader2 className="animate-spin" size={18}/> : <><Mail size={18}/> {t('profile.resetPassword', 'Resetar Senha')}</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ZONA DE PERIGO - EXCLUSÃO DE CONTA E SISTEMA (LGPD) */}
      <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-3xl p-4 sm:p-6 md:p-4 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-rose-600 text-white rounded-2xl shadow-md shrink-0">
            <Trash2 size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-rose-950 dark:text-rose-200">
                {isAdmin ? 'Excluir Minha Conta e Apagar Todo o Sistema' : 'Excluir Minha Conta de Usuário'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
                LGPD / Direitos do Titular
              </span>
            </div>
            <p className="text-xs md:text-sm text-rose-800/90 dark:text-rose-300/90 font-medium leading-relaxed">
              {isAdmin ? (
                <>
                  Ao ser Administrador, a execução desta opção irá <strong>DELETAR PERMANENTEMENTE</strong> toda a sua conta e <strong>TODO O SEU SISTEMA DA ORGANIZAÇÃO</strong> (usuários vinculados, colaboradores, clientes, produtos/serviços, casos/OS, requisições, anexos, históricos e dados financeiros). Esta ação é irreversível e exige confirmação via código enviado por e-mail.
                </>
              ) : (
                <>
                  Sua conta de usuário será permanentemente removida do sistema. Esta ação exige confirmação por e-mail enviada ao seu endereço cadastrado.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              setIsDeleteModalOpen(true);
              setDeleteStep('CONFIRM_INTENT');
              setInputCode('');
              setConfirmWord('');
              setCodeError('');
            }}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-2xl shadow-md shadow-rose-600/20 transition-all text-xs md:text-sm flex items-center gap-2 cursor-pointer"
          >
            <ShieldAlert size={18} />
            {isAdmin ? 'Solicitar Exclusão do Sistema' : 'Solicitar Exclusão da Minha Conta'}
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO POR E-MAIL & EXCLUSÃO */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131B2A] rounded-3xl max-w-lg w-full p-4 sm:p-6 md:p-4 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6 relative animate-in zoom-in-95 duration-200">
            {/* CLOSE BUTTON */}
            {!isDeleting && (
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            )}

            {/* MODAL HEADER */}
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {isAdmin ? 'Apagar Sistema Completo' : 'Apagar Minha Conta'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Confirmação de segurança jurídica e LGPD por e-mail
                </p>
              </div>
            </div>

            {/* STEP 1: INTENT & REQUEST EMAIL CODE */}
            {deleteStep === 'CONFIRM_INTENT' && (
              <div className="space-y-5">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" />
                    Aviso Legal de Exclusão Definitiva
                  </p>
                  <p className="text-xs text-rose-800 dark:text-rose-300/80 leading-relaxed font-medium">
                    {isAdmin ? (
                      <>
                        Você está prestes a excluir <strong>TODOS OS DADOS DO SISTEMA</strong> da organização <strong>{currentUser.organizationId}</strong>. Todos os usuários, clientes, trabalhos, arquivos e históricos serão destruídos e não poderão ser recuperados.
                      </>
                    ) : (
                      <>
                        Sua conta de usuário ({currentUser.email}) será desativada e permanentemente excluída do banco de dados.
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                    Endereço de E-mail de Confirmação
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    <Mail size={18} className="text-slate-500" />
                    {currentUser.email}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Enviaremos um código de verificação de 6 dígitos para este endereço de e-mail.
                  </p>
                </div>

                {codeError && (
                  <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-semibold border border-rose-200 dark:border-rose-800">
                    {codeError}
                  </div>
                )}

                <button
                  onClick={handleRequestDeleteCode}
                  disabled={sendingCode}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50 cursor-pointer"
                >
                  {sendingCode ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Gerando e Enviando Código...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Enviar Código por E-mail
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: ENTER CODE & CONFIRM DELETION */}
            {deleteStep === 'CODE_INPUT' && (
              <div className="space-y-5">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-1">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Mail size={16} className="text-amber-600 dark:text-amber-400" />
                    Código Enviado por E-mail!
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300/80 font-medium">
                    Um código de 6 dígitos foi encaminhado para <strong>{currentUser.email}</strong>. Digite-o abaixo para autorizar.
                  </p>
                  {generatedCodeHint && (
                    <div className="mt-2 p-2 bg-amber-100/80 dark:bg-amber-900/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 font-mono font-bold">
                      Código de confirmação: <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-rose-700 dark:text-rose-400">{generatedCodeHint}</span>
                    </div>
                  )}
                </div>

                {/* 6-DIGIT CODE INPUT */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Código de Confirmação (6 dígitos)
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      maxLength={6}
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xl font-mono font-black text-center tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 transition-all"
                    />
                  </div>
                </div>

                {/* CONFIRMATION WORD INPUT */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Digite a palavra <span className="text-rose-600 dark:text-rose-400 font-black">EXCLUIR</span> para destravar
                  </label>
                  <input
                    type="text"
                    value={confirmWord}
                    onChange={(e) => setConfirmWord(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 transition-all uppercase"
                  />
                </div>

                {codeError && (
                  <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-semibold border border-rose-200 dark:border-rose-800">
                    {codeError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteStep('CONFIRM_INTENT')}
                    disabled={isDeleting}
                    className="w-1/3 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleExecuteDeletion}
                    disabled={isDeleting || inputCode.length < 6 || confirmWord.trim().toUpperCase() !== 'EXCLUIR'}
                    className="w-2/3 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all text-xs md:text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Apagando Dados...
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={18} />
                        {isAdmin ? 'Confirmar e Apagar Sistema' : 'Confirmar e Apagar Conta'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PROCESSING */}
            {deleteStep === 'PROCESSING' && (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <Loader2 size={48} className="animate-spin text-rose-600" />
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Processando Exclusão Definitiva...</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Limpando dados do banco de dados e removendo credenciais do sistema de acordo com as normas da LGPD.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
