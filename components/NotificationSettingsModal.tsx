import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Bell, 
  Volume2, 
  Smartphone, 
  MessageSquare, 
  AlertOctagon, 
  ShoppingBag, 
  ClipboardList, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { playNotificationChime } from '../services/notificationService';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ onClose }) => {
  const { 
    notificationPreferences, 
    updateNotificationPreferences, 
    requestPushPermission, 
    pushStatus,
    currentUser,
    sendNotification
  } = useApp();

  const [isTestingPush, setIsTestingPush] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleToggle = (key: keyof typeof notificationPreferences) => {
    updateNotificationPreferences({
      ...notificationPreferences,
      [key]: !notificationPreferences[key]
    });
  };

  const handleTestChime = () => {
    playNotificationChime('NORMAL');
  };

  const handleTestUrgentChime = () => {
    playNotificationChime('URGENT');
  };

  const handleSendTestPush = async () => {
    setIsTestingPush(true);
    try {
      if (pushStatus?.permission !== 'granted') {
        const res = await requestPushPermission();
        if (res !== 'granted') {
          alert('Por favor, autorize as notificações nas configurações do seu navegador ou celular.');
          return;
        }
      }

      playNotificationChime('NORMAL');
      
      // Dispatch test notification
      if (currentUser?.organizationId) {
        await sendNotification({
          organizationId: currentUser.organizationId,
          userId: currentUser.id,
          type: 'SYSTEM',
          title: '🔔 Teste de Notificação Labprox',
          body: 'As notificações para iOS, Android e Computador estão ativas e funcionando perfeitamente!',
          data: { test: true }
        });
      }
      
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#00B8D9]">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-none text-white">Central de Notificações</h3>
              <p className="text-xs text-slate-400 mt-1">Configurar alertas para iOS, Android e Web</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Push Notifications Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Notificações Push no Celular</h4>
                  <p className="text-[11px] text-slate-500">
                    Status: {pushStatus?.permission === 'granted' ? (
                      <span className="text-emerald-600 font-bold">Autorizado ✓</span>
                    ) : (
                      <span className="text-amber-600 font-bold">Não ativado</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isTestingPush}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
              >
                {testSent ? 'Enviado ✓' : isTestingPush ? 'Testando...' : 'Testar Push'}
              </button>
            </div>

            {/* iOS PWA Instructions Box */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                <Smartphone size={14} className="text-indigo-600" />
                <span>Como ativar no iPhone / iPad (iOS 16.4+)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                1. No Safari do iPhone, toque no botão <strong>Compartilhar <Share size={12} className="inline" /></strong>.<br />
                2. Selecione <strong>"Adicionar à Tela de Início" <PlusSquare size={12} className="inline" /></strong>.<br />
                3. Abra o app pela tela inicial e autorize as notificações push.
              </p>
            </div>
          </div>

          {/* Sound & Audio Settings */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Volume2 size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Avisos Sonoros (Chime)</h4>
                  <p className="text-[11px] text-slate-500">Tocar som agradável ao receber novidades</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.sound}
                  onChange={() => handleToggle('sound')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestChime}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Volume2 size={14} className="text-emerald-600" />
                Ouvir Som Padrão
              </button>
              <button
                type="button"
                onClick={handleTestUrgentChime}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Volume2 size={14} className="text-red-600" />
                Ouvir Som Urgente
              </button>
            </div>
          </div>

          {/* Granular Notification Channels */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
              Tipos de Notificações
            </h4>

            {/* Messages */}
            <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Mensagens de Dentistas / Chat</h5>
                  <p className="text-[11px] text-slate-500">Conversas nas OSs e dúvidas dos clientes</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.dentistMessages}
                  onChange={() => handleToggle('dentistMessages')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Manager Alerts */}
            <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertOctagon size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Alertas Criados pelo Gestor</h5>
                  <p className="text-[11px] text-slate-500">Alarmes de urgência e avisos direcionados</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.managerAlerts}
                  onChange={() => handleToggle('managerAlerts')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Web Orders */}
            <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShoppingBag size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Pedidos Web (Loja Online)</h5>
                  <p className="text-[11px] text-slate-500">Novas compras realizadas pelos clientes</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.webOrders}
                  onChange={() => handleToggle('webOrders')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Online Requisitions */}
            <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ClipboardList size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Requisições Online</h5>
                  <p className="text-[11px] text-slate-500">Novas ordens de serviço enviadas via catálogo</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.onlineRequisitions}
                  onChange={() => handleToggle('onlineRequisitions')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Job Status Changes */}
            <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Atualizações de Status dos Casos</h5>
                  <p className="text-[11px] text-slate-500">Pronto, enviado para entrega, aprovado pelo dentista</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.jobStatusChanges}
                  onChange={() => handleToggle('jobStatusChanges')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* RBAC Info Card */}
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              O Labprox <strong>respeita rigorosamente o controle de permissões</strong> da sua equipe. Colaboradores só recebem notificações dos módulos e setores aos quais têm acesso.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
