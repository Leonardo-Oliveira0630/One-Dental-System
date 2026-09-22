import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AppNotification, NotificationType } from '../types';
import { 
  Bell, 
  MessageSquare, 
  AlertOctagon, 
  ShoppingBag, 
  ClipboardList, 
  CheckCircle2, 
  CheckCheck, 
  Trash2, 
  Settings as SettingsIcon, 
  Volume2, 
  Smartphone, 
  X, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { playNotificationChime } from '../services/notificationService';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { useNavigate } from 'react-router-dom';

interface NotificationCenterProps {
  className?: string;
  variant?: 'light' | 'dark' | 'header';
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  className = '', 
  variant = 'header' 
}) => {
  const { 
    currentUser, 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification,
    notificationPreferences,
    requestPushPermission,
    pushStatus
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | NotificationType>('ALL');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!currentUser) return null;

  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'ALL') return true;
    return notif.type === activeTab;
  });

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    setIsOpen(false);

    // Deep navigation routing
    if (notif.data?.url) {
      navigate(notif.data.url);
      return;
    }

    if (notif.type === 'DENTIST_MESSAGE' || notif.type === 'APPROVAL_REQUEST' || notif.type === 'APPROVAL_RESOLVED') {
      if (notif.data?.jobId) {
        navigate(`/jobs?jobId=${notif.data.jobId}&openChat=true`);
      } else {
        navigate('/jobs');
      }
    } else if (notif.type === 'WEB_ORDER') {
      if (currentUser.role === 'CLIENT') {
        navigate('/store');
      } else {
        navigate('/incoming-orders');
      }
    } else if (notif.type === 'ONLINE_REQUISITION') {
      if (currentUser.role === 'CLIENT') {
        navigate('/requisitions');
      } else {
        navigate('/incoming-requisitions');
      }
    } else if (notif.type === 'MANAGER_ALERT') {
      if (notif.data?.jobId) {
        navigate(`/jobs?jobId=${notif.data.jobId}`);
      }
    } else if (notif.type === 'JOB_STATUS_CHANGE') {
      if (currentUser.role === 'CLIENT') {
        navigate('/dentist/cases');
      } else {
        navigate('/jobs');
      }
    }
  };

  const handleEnablePush = async () => {
    setIsRequestingPush(true);
    try {
      await requestPushPermission();
      playNotificationChime('NORMAL');
    } finally {
      setIsRequestingPush(false);
    }
  };

  const getNotificationIcon = (type: NotificationType, urgency?: string) => {
    switch (type) {
      case 'DENTIST_MESSAGE':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare size={18} />
          </div>
        );
      case 'MANAGER_ALERT':
        return (
          <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
            <AlertOctagon size={18} />
          </div>
        );
      case 'WEB_ORDER':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingBag size={18} />
          </div>
        );
      case 'ONLINE_REQUISITION':
        return (
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <ClipboardList size={18} />
          </div>
        );
      case 'APPROVAL_REQUEST':
      case 'APPROVAL_RESOLVED':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
            <Bell size={18} />
          </div>
        );
    }
  };

  const formatTimeAgo = (date: Date) => {
    if (!date) return '';
    const now = new Date().getTime();
    const then = date instanceof Date ? date.getTime() : new Date(date).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) return 'Agora mesmo';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min atrás`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h atrás`;
    const days = Math.floor(diffSeconds / 86400);
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days}d atrás`;
    return new Date(then).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="btn-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 border border-slate-200 shadow-sm'
        }`}
        title="Central de Notificações (Mensagens, Alertas, Pedidos Web e Requisições)"
        aria-label="Abrir Notificações"
      >
        <Bell size={18} className={unreadNotificationCount > 0 ? 'animate-[swing_1s_ease-in-out_infinite]' : ''} />
        
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-16 sm:top-full right-0 sm:right-0 mt-2 sm:w-96 max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[120] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[85vh] sm:max-h-[600px]">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#00B8D9]">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-none text-white">Notificações</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  {unreadNotificationCount > 0 
                    ? `${unreadNotificationCount} não lida${unreadNotificationCount > 1 ? 's' : ''}` 
                    : 'Todas lidas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsAsRead()}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Lidas</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Configurações de Notificações"
              >
                <SettingsIcon size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors sm:hidden"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Push Activation Banner if not yet enabled on mobile / desktop */}
          {pushStatus?.permission !== 'granted' && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone size={18} className="text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">Receber no Celular (iOS & Android)</p>
                  <p className="text-[10px] text-slate-500 truncate">Ative alertas para pedidos e mensagens</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isRequestingPush}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0 shadow-sm transition-all"
              >
                {isRequestingPush ? 'Ativando...' : 'Ativar'}
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DENTIST_MESSAGE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'DENTIST_MESSAGE'
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Mensagens
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANAGER_ALERT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'MANAGER_ALERT'
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Alertas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('WEB_ORDER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'WEB_ORDER'
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pedidos Web
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ONLINE_REQUISITION')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'ONLINE_REQUISITION'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Requisições
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bell size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Nenhuma notificação</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
                  Você receberá alertas em tempo real para novos pedidos, mensagens e avisos.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                    !notif.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {!notif.read && (
                    <div className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}

                  {getNotificationIcon(notif.type, notif.urgency)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1 mb-1">
                      <h4 className={`text-xs font-bold truncate ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {notif.data?.osNumber && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded">
                          OS: {notif.data.osNumber}
                        </span>
                      )}
                      {notif.data?.patientName && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-medium rounded">
                          Pac: {notif.data.patientName}
                        </span>
                      )}
                      {notif.senderName && (
                        <span className="text-[10px] text-slate-400">
                          De: {notif.senderName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-md transition-opacity"
                    title="Excluir notificação"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px]">Labprox Notificações</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsSettingsOpen(true);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Preferências <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <NotificationSettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};
